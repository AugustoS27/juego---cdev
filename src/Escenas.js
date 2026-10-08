// Los guiones de las cinemáticas (etapa 15E): la intro, la victoria y las dos derrotas.
// Cada función devuelve una lista de tomas que reproduce Cinematica.js (ahí está explicado el formato).
//
// Los "actores" son los personajes de Personajes.js: Tomi, Don Ernesto, Doña Pocha y los dos perros
// se crean una sola vez y quedan ocultos hasta que una toma los necesita. Facu, las bicis y la
// tranquera de los autos son los de verdad (los de Escape.js), y la puerta de calle es la de la casa.
// Los enemigos del juego se ocultan mientras dura la cinemática (eso lo hace Game).
//
// Cada toma, al empezar, esconde a todos y ubica a los que salen en ella: así cada toma funciona sola,
// aunque se saltee la anterior. Al terminar, limpiar() deja todo como estaba.
//
// Coordenadas útiles (ver HouseData.js): la casa mira al sur (+Z); la puerta de calle está en
// (-1, 6); el camino va hasta la tranquera (-1, 22); la vereda está entre z = 22 y z = 25 y la calle
// más allá. La entrada de autos (con Facu y las bicis) está en x = -12; el patio de los perros, al este.
import * as THREE from 'three';
import { crearTomi, crearDonErnesto, crearDonaPocha, crearPerro } from './Personajes.js';
import { PERROS } from './Perro.js';
import { JUGUETES } from './Items.js';

// Hacia dónde mira un personaje (su ángulo en Y): los modelos miran hacia +Z
const A_LA_CALLE = 0;
const A_LA_CASA = Math.PI;
const AL_ESTE = Math.PI / 2;
const AL_OESTE = -Math.PI / 2;

const COLOR_ENOJADO = new THREE.Color('#ff6b6b'); // la cara de Don Ernesto cuando se enoja
const entre = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));

// ------------------------------------------------------------
//  AYUDANTES PARA MOVER A LOS ACTORES
// ------------------------------------------------------------
// Pone a un personaje en (x, y, z) mirando hacia "angulo", derecho y quieto, y lo muestra
function ubicar(p, x, z, angulo = A_LA_CALLE, y = 0) {
  p.cuerpo.position.set(x, y, z);
  p.cuerpo.rotation.set(0, angulo, 0);
  p.cuerpo.visible = true;
  quieto(p);
}

// Piernas y brazos derechos (y la cabeza mirando al frente)
function quieto(p) {
  const partes = [...(p.piernas || []), ...(p.patas || []), ...(Array.isArray(p.brazos) ? p.brazos : [])];
  for (const parte of partes) parte.rotation.set(0, 0, 0);
  p.cabeza?.rotation.set(0, 0, 0);
}

// Balanceo de caminar o correr: las piernas y los brazos van y vienen
function caminar(p, fase, amplitud = 0.6) {
  const balanceo = Math.sin(fase) * amplitud;
  p.piernas.forEach((pierna, i) => (pierna.rotation.x = i === 0 ? balanceo : -balanceo));
  if (Array.isArray(p.brazos)) p.brazos.forEach((brazo, i) => (brazo.rotation.x = i === 0 ? -balanceo : balanceo));
}

// Un punto de un camino [[x, z], [x, z], ...] a "distancia" metros del principio, con el ángulo
// del tramo (hacia dónde hay que mirar para ir por ahí). Pasado el final, se queda en el último punto.
function puntoDelCamino(puntos, distancia) {
  for (let i = 0; i < puntos.length - 1; i++) {
    const [ax, az] = puntos[i];
    const [bx, bz] = puntos[i + 1];
    const largo = Math.hypot(bx - ax, bz - az);
    const ultimo = i === puntos.length - 2;
    if (distancia <= largo || ultimo) {
      const t = Math.min(1, Math.max(0, distancia / largo));
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, angulo: Math.atan2(bx - ax, bz - az), llego: ultimo && distancia >= largo };
    }
    distancia -= largo;
  }
}

// Lleva a un personaje por un camino (caminando) y lo gira hacia donde va. Devuelve true si llegó.
function irPorCamino(p, puntos, distancia, ritmo = 9) {
  const { x, z, angulo, llego } = puntoDelCamino(puntos, distancia);
  p.cuerpo.position.x = x;
  p.cuerpo.position.z = z;
  p.cuerpo.rotation.y = angulo;
  if (llego) quieto(p);
  else caminar(p, distancia * ritmo);
  return llego;
}

// Un nene andando en bici: la bici va por el camino y el nene, sentado en el asiento, pedalea
function andarEnBici(nene, bici, puntos, distancia) {
  const { x, z, angulo } = puntoDelCamino(puntos, distancia);
  bici.position.set(x, 0, z);
  bici.rotation.set(0, angulo, 0);
  // El asiento está 18 cm detrás del centro de la bici: ahí van las caderas del nene
  nene.cuerpo.position.set(x - Math.sin(angulo) * 0.2, 0.27, z - Math.cos(angulo) * 0.2);
  nene.cuerpo.rotation.set(0.25, angulo, 0); // inclinado hacia el manubrio
  const pedaleo = distancia * 5;
  nene.piernas.forEach((pierna, i) => (pierna.rotation.x = -0.75 + Math.sin(pedaleo + i * Math.PI) * 0.45));
  nene.brazos.forEach((brazo) => brazo.rotation.set(-1.25, 0, 0));
}

export class Escenas {
  constructor(scene, house, zonaEscape, audio) {
    this.scene = scene;
    this.house = house;
    this.escape = zonaEscape;
    this.audio = audio;

    this.tomi = this.agregar(crearTomi());
    this.ernesto = this.agregar(crearDonErnesto());
    this.colorCara = this.ernesto.cara.color.clone();
    this.pocha = this.agregar(crearDonaPocha());
    this.perros = PERROS.map(({ colores }) => this.agregar(crearPerro(colores)));
    this.facu = zonaEscape.facu; // (el de verdad: el que espera en la entrada de autos)
    this.pelota = JUGUETES.find((juguete) => juguete.icono === '⚽').crear();
    // La bermuda de Tomi en la boca del perro (para la derrota en el patio)
    this.bermudaRota = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.05), this.tomi.bermudas[0].material);
    this.bermudaRota.position.set(0, -0.1, 0.16);
    this.bermudaRota.rotation.x = 0.4;
    this.limpiar();
  }

  agregar(personaje) {
    this.scene.add(personaje.cuerpo);
    return personaje;
  }

  // Esconde a todos los actores (al empezar cada toma y al terminar)
  esconderTodos() {
    for (const p of [this.tomi, this.ernesto, this.pocha, ...this.perros]) {
      p.cuerpo.visible = false;
      p.cuerpo.rotation.set(0, 0, 0);
      quieto(p);
    }
    this.pelota.visible = false;
    this.scene.add(this.pelota); // (por si quedó en la mano de Don Ernesto)
    this.bermudaRota.removeFromParent();
    for (const malla of this.tomi.bermudas) malla.visible = true;
    for (const malla of this.tomi.calzoncillos) malla.visible = false;
    this.ernesto.cara.color.copy(this.colorCara);
    const { pocha } = this;
    pocha.tejido.visible = false;
    pocha.brazos.position.y = 1.18;
    pocha.lanzador.rotation.x = 0.5;
  }

  // Deja todo como antes de la cinemática: actores ocultos, Facu y las bicis en su lugar, la puerta
  limpiar() {
    this.esconderTodos();
    this.escape.reiniciar();
    this.house.puertaDeCalle.reiniciar();
  }

  // Facu en el lugar dado (es el de verdad: hay que avisarle a Escape que no le mueva el brazo)
  ubicarFacu(x, z, angulo) {
    this.escape.prepararCinematica();
    ubicar(this.facu, x, z, angulo);
  }

  abrirPuerta(abierta = true) {
    const puerta = this.house.puertaDeCalle;
    puerta.abierta = abierta;
    puerta.animarHacia(abierta ? Math.PI / 2 : 0);
  }

  // ------------------------------------------------------------
  //  INTRO: la pelota cae en el jardín, Don Ernesto se la queda, se muestra la casa (los perros y
  //  Doña Pocha con el lanzarredes) y Tomi y Facu arman el plan. ~42 s.
  //  objetivos: los 3 juguetes de esta partida (Tomi dice cuáles son)
  // ------------------------------------------------------------
  intro(objetivos) {
    const { tomi, ernesto, pocha, perros, pelota, facu } = this;
    const nombres = objetivos.map((o) => o.objeto.nombre);
    const lista = `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
    const ernestoSale = [[-1, 5.3], [-1, 8.6], [2.0, 12.9]];

    return [
      {
        // 1. El barrio desde arriba; Tomi y Facu se pasan la pelota en la vereda
        duracion: 5,
        fov: 62,
        camara: [[8, 6.5, 36], [4, 4.5, 30.5]],
        mira: [[-1, 3.2, 6], [-0.5, 1.9, 10]],
        lineas: [{ en: 0.6, quien: null, texto: 'Una tarde cualquiera, en el barrio...' }],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(tomi, -1.6, 23.4, AL_ESTE);
          this.ubicarFacu(2.2, 23.6, AL_OESTE);
          pelota.visible = true;
        },
        animar: (s) => {
          // La pelota va y viene entre los dos (con un saltito); cada uno patea cuando le llega
          const ida = (s / 1.6) % 2; // de 0 a 2
          const t = ida < 1 ? ida : 2 - ida;
          pelota.position.set(entre(-1.35, 1.95, t), Math.sin(t * Math.PI) * 0.25, entre(23.45, 23.6, t));
          const patada = (pierna, cerca) => (pierna.rotation.x = cerca ? -0.6 : 0);
          patada(tomi.piernas[1], ida > 1.85 || ida < 0.15);
          patada(facu.piernas[0], ida > 0.85 && ida < 1.15);
        },
      },
      {
        // 2. Tomi patea fuerte... ¡y la pelota pasa por arriba de la cerca!
        duracion: 3.4,
        camara: [[-3.4, 1.0, 26.6], [-3.2, 1.3, 26.4]],
        mira: [[-1, 1.2, 20], [0.8, 1.6, 16]],
        lineas: [
          { en: 0.1, quien: 'Tomi', texto: '¡Allá va... la de oro!' },
          { en: 1.7, quien: 'Facu', texto: '¡Nooo! ¡Al jardín de Don Ernesto no!' },
        ],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(tomi, -1.6, 23.5, A_LA_CASA);
          this.ubicarFacu(0.4, 23.9, A_LA_CASA);
          pelota.visible = true;
          this.pateo = false;
        },
        animar: (s) => {
          tomi.piernas[1].rotation.x = s > 0.3 && s < 0.6 ? 0.9 - ((s - 0.3) / 0.3) * 1.8 : 0; // la patada
          if (s > 0.5 && !this.pateo) {
            this.pateo = true;
            this.audio.patada();
          }
          // Vuelo en parábola hasta el pasto (de 0.5 a 1.9 s) y después dos piques chiquitos
          const t = (s - 0.5) / 1.4;
          if (t < 0) pelota.position.set(-1.6, 0, 23.1);
          else if (t <= 1) pelota.position.set(entre(-1.6, 2.4, t), Math.sin(t * Math.PI) * 4, entre(23.1, 13.6, t));
          else {
            const despues = s - 1.9;
            if (Math.floor(despues / 0.35) !== this.pique && despues < 0.7) {
              this.pique = Math.floor(despues / 0.35);
              this.audio.pique(0.5);
            }
            pelota.position.set(2.4, Math.abs(Math.sin((despues / 0.35) * Math.PI)) * Math.max(0, 0.5 - despues * 0.7), 13.6 - Math.min(despues, 0.8) * 0.4);
          }
          // Facu se agarra la cabeza
          if (s > 1.5) facu.brazos.forEach((brazo, i) => brazo.rotation.set(-2.7, 0, i === 0 ? -0.4 : 0.4));
        },
      },
      {
        // 3. Se abre la puerta y sale Don Ernesto, derechito a la pelota
        duracion: 5,
        camara: [[5.2, 1.4, 16.5], [4.6, 1.3, 16.8]],
        mira: [[-1, 1.3, 7], [1.6, 1.0, 12.4]],
        lineas: [{ en: 1.2, quien: 'Don Ernesto', texto: '¿Otra vez la pelotita? ¿OTRA VEZ?' }],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(ernesto, ...ernestoSale[0], A_LA_CALLE);
          pelota.visible = true;
          pelota.position.set(2.4, 0, 13.3);
          this.abrirPuerta();
          this.audio.puerta(0.7);
          this.pasos = 0;
        },
        animar: (s) => {
          const distancia = Math.max(0, s - 0.4) * 2.4;
          const llego = irPorCamino(ernesto, ernestoSale, distancia);
          // Pasos pesados (uno por cada medio balanceo)
          if (!llego && Math.floor(distancia * 9 / Math.PI) !== this.pasos) {
            this.pasos = Math.floor(distancia * 9 / Math.PI);
            this.audio.pasoDueno(0.5);
          }
          // Llegó: se agacha un poco y la agarra
          if (llego) {
            ernesto.cuerpo.rotation.x = 0.35;
            ernesto.brazos[0].rotation.x = -0.5;
          }
        },
      },
      {
        // 4. "¡Lo que cae en mi jardín es MÍO!" (con la pelota en alto y colorado de bronca)
        duracion: 4.2,
        camara: [[2.25, 1.55, 15.4], [2.2, 1.62, 15.0]],
        mira: [[2.0, 1.7, 13.0]],
        lineas: [{ en: 0.3, quien: 'Don Ernesto', texto: '¡Lo que cae en mi jardín es MÍO!' }],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(ernesto, 2.0, 12.9, A_LA_CALLE);
          ernesto.brazos[0].add(pelota); // la pelota, en la mano
          pelota.position.set(0, -0.78, 0);
          pelota.visible = true;
        },
        animar: (s, t) => {
          ernesto.brazos[0].rotation.x = -2.9 + Math.sin(s * 10) * 0.08; // la sacude en alto
          ernesto.brazos[1].rotation.x = -0.5 + Math.sin(s * 10) * 0.2; // y el palo de amasar
          ernesto.cara.color.copy(this.colorCara).lerp(COLOR_ENOJADO, Math.min(1, t * 2));
          ernesto.cabeza.rotation.y = Math.sin(s * 3) * 0.15;
        },
      },
      {
        // 5. Tomi y Facu, del otro lado de la cerca: los juguetes que Tomi va a recuperar
        duracion: 6,
        camara: [[4.15, 1.6, 19.6], [4.2, 1.55, 20.1]],
        mira: [[4.2, 1.05, 22.5]],
        lineas: [
          { en: 0.3, quien: 'Facu', texto: '¡Es la tercera esta semana! Ya tienen media juguetería ahí adentro...' },
          { en: 3.0, quien: 'Tomi', texto: `Y mis favoritos: ${lista}.` },
        ],
        alEmpezar: () => {
          this.esconderTodos();
          this.abrirPuerta(false); // (Don Ernesto ya se metió adentro con la pelota)
          ubicar(tomi, 3.5, 22.4, A_LA_CASA);
          this.ubicarFacu(4.85, 22.45, A_LA_CASA + 0.3);
        },
        animar: () => {
          tomi.cabeza.rotation.x = 0.25; // cabizbajo
          tomi.brazos.forEach((brazo, i) => brazo.rotation.set(0, 0, i === 0 ? 0.15 : -0.15));
        },
      },
      {
        // 6. El patio de atrás: Firulais y Manchita ladran
        duracion: 5,
        camara: [[11.2, 2.4, 11.8], [12.4, 1.4, 9.5]],
        mira: [[13.3, 0.6, 3.8], [13.3, 0.45, 3.6]],
        lineas: [{ en: 0.4, quien: 'Facu', texto: 'Y en el patio están Firulais y Manchita. Ven poco, pero oyen TODO.' }],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(perros[0], 12.75, 4.3, -0.05);
          ubicar(perros[1], 13.95, 3.4, -0.3);
          this.ladridos = 0;
        },
        animar: (s) => {
          perros.forEach((perro, i) => {
            const ladrando = (s * 1.4 + i * 0.5) % 1 < 0.25;
            perro.mandibula.rotation.x = ladrando ? 0.6 : 0;
            perro.cabeza.rotation.x = ladrando ? -0.25 : 0;
            perro.cola.rotation.z = Math.sin(s * 18 + i) * 0.6;
            perro.cuerpo.position.y = ladrando ? 0.04 : 0;
          });
          if (Math.floor(s * 1.4) !== this.ladridos) {
            this.ladridos = Math.floor(s * 1.4);
            this.audio.ladrido(0.5);
          }
        },
      },
      {
        // 7. Doña Pocha se asoma al balcón con su lanzarredes nuevo
        duracion: 6,
        camara: [[-4.7, 4.35, 11.4], [-5.3, 4.25, 10.3]],
        mira: [[-5.6, 4.0, 7.6]],
        lineas: [
          { en: 0.3, quien: 'Facu', texto: 'Y Doña Pocha se compró un lanzarredes. Si te agarra, quedás enredado...' },
          { en: 3.4, quien: 'Doña Pocha', texto: 'Je, je, je... ¡que vengan nomás!' },
        ],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(pocha, -5.6, 7.65, A_LA_CALLE + 0.25, 3.0);
          this.apunto = false;
        },
        animar: (s) => {
          const apuntando = s > 3.2;
          pocha.brazos.position.y = apuntando ? 1.3 : 1.18;
          pocha.lanzador.rotation.x = apuntando ? -0.15 : 0.5;
          pocha.cabeza.rotation.y = apuntando ? 0 : Math.sin(s * 1.5) * 0.4; // vigila de un lado al otro
          if (apuntando && !this.apunto) {
            this.apunto = true;
            this.audio.clic(0.7);
          }
        },
      },
      {
        // 8. El plan: Tomi se mete; Facu espera con las bicis
        duracion: 5.5,
        camara: [[0.2, 1.2, 26.2], [0.25, 1.15, 25.8]],
        mira: [[0.2, 1.0, 23.2]],
        lineas: [
          { en: 0.3, quien: 'Tomi', texto: 'Se acabó. Hoy me meto en esa casa y recupero mis juguetes.' },
          { en: 3.0, quien: 'Facu', texto: 'Yo te espero con las bicis en la entrada de autos.' },
        ],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(tomi, -0.6, 23.3, 0.45);
          this.ubicarFacu(1.0, 23.4, -0.45);
        },
        animar: (s) => {
          // Tomi, decidido: puño en alto. Facu asiente.
          tomi.brazos[1].rotation.set(s > 0.5 ? -2.6 : 0, 0, 0);
          facu.cuerpo.rotation.x = s > 3.0 ? Math.max(0, Math.sin((s - 3) * 8)) * 0.08 : 0;
        },
      },
      {
        // 9. Facu levanta el walkie: él lo va a guiar
        duracion: 5,
        camara: [[2.0, 1.3, 25.7], [1.85, 1.25, 25.35]],
        mira: [[0.9, 1.15, 23.4]],
        lineas: [{ en: 0.4, quien: 'Facu', texto: 'Te guío por el walkie: vi desde mi ventana dónde los escondieron. ¡Suerte!' }],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(tomi, -0.6, 23.3, 0.45);
          this.ubicarFacu(1.0, 23.4, -0.2);
          this.audio.walkie(0.6);
        },
        animar: (s) => {
          facu.brazoWalkie.rotation.set(-2.3, 0, 0);
          facu.brazos[0].rotation.set(s > 3.6 ? -2.9 : 0, 0, s > 3.6 ? Math.sin(s * 10) * 0.3 : 0); // ¡chau!
        },
      },
    ];
  }

  // ------------------------------------------------------------
  //  VICTORIA: Tomi llega con los juguetes, Don Ernesto sale a los gritos, se van en bici. ~16 s.
  // ------------------------------------------------------------
  victoria() {
    const { tomi, ernesto, facu } = this;
    const [biciTomi, biciFacu] = this.escape.bicis;
    // Los caminos de las bicis: derecho por la entrada de autos, salen a la calle y doblan al este
    const caminoTomi = [[-12.6, 16.9], [-12.6, 25.2], [-11.8, 26.8], [-10, 27.3], [14, 27.3]];
    const caminoFacu = [[-13.6, 16.9], [-13.6, 25.4], [-12.6, 27.7], [-10.5, 28.3], [14, 28.3]];
    const distanciaBicis = (s) => Math.max(0, s - 1.1) * 3.4; // (toma 3: arrancan cuando ya se abrió)

    return [
      {
        // 1. Tomi llega corriendo con la mochila llena; Facu salta de contento
        duracion: 3.6,
        camara: [[-8.9, 1.55, 11.6], [-9.2, 1.5, 12.3]],
        mira: [[-12.3, 0.9, 14.0], [-12.0, 0.95, 15.3]],
        lineas: [
          { en: 0.3, quien: 'Facu', texto: '¡Tomi! ¡Los tenés todos!' },
          { en: 1.9, quien: 'Tomi', texto: '¡Rajemos antes de que salga Don Ernesto!' },
        ],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(tomi, -13.9, 9.2, A_LA_CALLE);
          this.ubicarFacu(-11.1, 16.2, A_LA_CASA);
        },
        animar: (s) => {
          irPorCamino(tomi, [[-13.9, 9.2], [-12.0, 15.1]], s * 3.2, 7);
          facu.cuerpo.position.y = Math.abs(Math.sin(s * 7)) * 0.22;
          facu.brazos.forEach((brazo) => brazo.rotation.set(-2.9, 0, 0));
        },
      },
      {
        // 2. Se abre la puerta: Don Ernesto, colorado, revoleando el palo de amasar
        duracion: 3.6,
        camara: [[1.4, 1.6, 12.0], [0.9, 1.55, 11.2]],
        mira: [[-1, 1.5, 7]],
        lineas: [{ en: 0.5, quien: 'Don Ernesto', texto: '¡EH! ¡Esos juguetes son MÍOS! ¡Vuelvan acá, mocosos!' }],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(ernesto, -1, 5.4, A_LA_CALLE);
          ernesto.cara.color.copy(COLOR_ENOJADO);
          this.abrirPuerta();
          this.audio.puerta(1);
        },
        animar: (s) => {
          irPorCamino(ernesto, [[-1, 5.4], [-1, 7.5]], s * 2.4);
          ernesto.brazos[1].rotation.x = -2.6 + Math.sin(s * 12) * 0.4;
        },
      },
      {
        // 3. Se abre la tranquera y salen los dos en bici (¡ring ring!)
        duracion: 5,
        camara: [[-7.4, 1.4, 27.6], [-6.4, 1.5, 28.6]],
        mira: [[-12.8, 0.8, 21], [-10.5, 0.8, 25.5]],
        lineas: [{ en: 0.2, quien: 'Facu', texto: '¡Subite! ¡Pedaleá, pedaleá!' }],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(tomi, 0, 0);
          this.ubicarFacu(0, 0);
          this.timbre = false;
        },
        animar: (s) => {
          this.escape.tranquera.rotation.y = Math.min(1, s / 1.0) * (Math.PI / 2); // se abre para adentro
          andarEnBici(tomi, biciTomi, caminoTomi, distanciaBicis(s));
          andarEnBici(facu, biciFacu, caminoFacu, distanciaBicis(s) * 0.97);
          if (s > 1.3 && !this.timbre) {
            this.timbre = true;
            this.audio.timbre();
          }
        },
      },
      {
        // 4. Don Ernesto en la tranquera del camino, sacudiendo el puño; ellos se alejan por la calle
        duracion: 4.4,
        camara: [[-4.5, 1.6, 31.5], [-4.0, 1.7, 31.8]],
        mira: [[-1.5, 1.1, 23], [-0.5, 1.1, 23.5]],
        lineas: [
          { en: 0.3, quien: 'Don Ernesto', texto: '¡Y NO VUELVAN MÁS!' },
          { en: 1.4, quien: 'Tomi', texto: '¡Chau, Don Ernesto! ¡Gracias por cuidarlos!' },
        ],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(tomi, 0, 0);
          this.ubicarFacu(0, 0);
          ubicar(ernesto, -1, 21.4, A_LA_CALLE);
          ernesto.cara.color.copy(COLOR_ENOJADO);
          this.escape.tranquera.rotation.y = Math.PI / 2;
        },
        animar: (s) => {
          const distancia = distanciaBicis(5) + s * 4;
          andarEnBici(tomi, biciTomi, caminoTomi, distancia);
          andarEnBici(facu, biciFacu, caminoFacu, distancia * 0.97);
          ernesto.brazos[0].rotation.set(-2.7 + Math.sin(s * 14) * 0.3, 0, 0); // el puño
          ernesto.brazos[1].rotation.set(-0.3, 0, 0);
          ernesto.cuerpo.position.y = Math.abs(Math.sin(s * 7)) * 0.08; // salta de bronca
        },
      },
    ];
  }

  // ------------------------------------------------------------
  //  DERROTA (Don Ernesto): te saca de la oreja y te tira por arriba de la cerca. ~9 s.
  //  frase: lo que dice Don Ernesto mientras te lleva (según cómo te agarró)
  // ------------------------------------------------------------
  derrotaDueno(frase) {
    const { tomi, ernesto, facu } = this;
    const recorrido = [[-1.25, 5.4], [-1.25, 13.6]];
    return [
      {
        // 1. Por el camino del jardín, Tomi colgado de la oreja
        duracion: 4.8,
        camara: [[2.6, 1.4, 15.2], [2.2, 1.4, 15.8]],
        mira: [[-1.3, 1.2, 8.5], [-1.6, 1.1, 12.8]],
        lineas: [
          { en: 0.4, quien: 'Tomi', texto: '¡Ay, ay, ay! ¡La oreja no, Don Ernesto!' },
          { en: 2.3, quien: 'Don Ernesto', texto: frase },
        ],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(ernesto, -1.25, 5.4, A_LA_CALLE);
          ubicar(tomi, -2.1, 5.4, A_LA_CALLE);
          ernesto.cara.color.copy(COLOR_ENOJADO);
          this.abrirPuerta();
          this.audio.puerta(0.8);
        },
        animar: (s) => {
          irPorCamino(ernesto, recorrido, s * 1.9);
          // Ernesto agarra la oreja con la mano derecha (el brazo para el costado, a la altura de la cabeza de Tomi)
          ernesto.brazos[0].rotation.set(0, 0, -1.15);
          const { x, z } = ernesto.cuerpo.position;
          // Tomi va al lado, en puntas de pie, torcido hacia la oreja y moviendo los brazos
          tomi.cuerpo.position.set(x - 0.95, 0.06, z + 0.05);
          tomi.cuerpo.rotation.set(0, A_LA_CALLE, -0.22);
          caminar(tomi, s * 16, 0.35);
          tomi.brazos.forEach((brazo, i) => brazo.rotation.set(-1.2 + Math.sin(s * 14 + i * 2) * 0.6, 0, 0));
        },
      },
      {
        // 2. En la cerca: ¡a la vereda! Facu mira y se tapa la cara
        duracion: 4.4,
        camara: [[-1.4, 1.35, 27.6], [-1.6, 1.35, 27.0]],
        mira: [[-2.3, 0.95, 22.4]],
        lineas: [
          { en: 1.2, quien: 'Don Ernesto', texto: '¡Y que no te vuelva a ver por acá!' },
          { en: 2.9, quien: 'Facu', texto: 'Ehh... ¿probamos de nuevo?' },
        ],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(ernesto, -2.7, 21.1, A_LA_CALLE);
          ernesto.cara.color.copy(COLOR_ENOJADO);
          ubicar(tomi, -2.7, 21.6, A_LA_CALLE);
          this.ubicarFacu(-0.7, 24.1, -0.7);
          this.cayo = false;
        },
        animar: (s) => {
          // Tomi vuela por arriba de la cerca (de 0.3 a 1.1 s) y cae sentado en la vereda
          const t = Math.min(1, Math.max(0, (s - 0.3) / 0.8));
          tomi.cuerpo.position.set(entre(-2.7, -3.0, t), Math.sin(t * Math.PI) * 1.4 + (t >= 1 ? -0.33 : 0.2 * (1 - t)), entre(21.6, 23.7, t));
          tomi.cuerpo.rotation.set(t < 1 ? -t * Math.PI * 2 : 0, A_LA_CALLE, 0); // da una vuelta en el aire
          if (t >= 1) tomi.piernas.forEach((pierna) => (pierna.rotation.x = -1.5));
          if (t >= 1 && !this.cayo) {
            this.cayo = true;
            this.audio.aterrizaje();
          }
          // Don Ernesto: primero lo revolea, después se sacude las manos y señala
          ernesto.brazos.forEach((brazo, i) => brazo.rotation.set(s < 1.1 ? -2.2 : i === 0 ? -1.6 : Math.sin(s * 20) * 0.3, 0, 0));
          // Facu se rasca la cabeza (con la mano que no tiene el walkie)
          facu.brazos[0].rotation.set(s > 2.6 ? -3.0 : 0, 0, s > 2.6 ? 0.4 + Math.sin(s * 14) * 0.1 : 0);
        },
      },
    ];
  }

  // ------------------------------------------------------------
  //  DERROTA (un perro): te muerde la bermuda... y te vas en calzoncillos. ~8 s.
  //  nombre: el perro que te agarró ('Firulais' o 'Manchita')
  // ------------------------------------------------------------
  derrotaPerro(nombre) {
    const { tomi } = this;
    const perro = this.perros[PERROS.findIndex((p) => p.nombre === nombre)] || this.perros[0];
    const salida = [[12.7, 5.0], [12.7, 6.6], [11.2, 10.5]];
    return [
      {
        // 1. El perro tironea de la bermuda; Tomi corre sin moverse del lugar
        duracion: 3.8,
        camara: [[9.8, 1.3, 3.3], [10.1, 1.25, 3.6]],
        mira: [[12.7, 0.65, 4.6]],
        lineas: [{ en: 0.3, quien: 'Tomi', texto: `¡Soltá, ${nombre}! ¡SOLTÁ!` }],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(tomi, 12.7, 4.9, A_LA_CALLE);
          ubicar(perro, 12.7, 4.15, A_LA_CALLE);
          this.gruñidos = 0;
        },
        animar: (s) => {
          const tiron = Math.sin(s * 9) * 0.08;
          tomi.cuerpo.position.z = 4.9 + tiron;
          tomi.cuerpo.rotation.x = 0.3; // inclinado para adelante, haciendo fuerza
          caminar(tomi, s * 20, 0.8);
          tomi.brazos.forEach((brazo, i) => brazo.rotation.set(-1.5 + Math.sin(s * 20 + i * Math.PI) * 0.6, 0, 0));
          perro.cuerpo.position.z = 4.15 + tiron;
          perro.mandibula.rotation.x = 0.35;
          perro.cabeza.rotation.set(-0.3, Math.sin(s * 14) * 0.35, 0); // sacude la cabeza
          perro.cola.rotation.z = Math.sin(s * 18) * 0.6;
          perro.patas.forEach((pata, i) => (pata.rotation.x = i < 2 ? -0.4 : 0.3)); // clavado, tirando para atrás
          if (Math.floor(s * 1.6) !== this.gruñidos) {
            this.gruñidos = Math.floor(s * 1.6);
            this.audio.grunido();
          }
        },
      },
      {
        // 2. ¡RIIIP! La bermuda se queda en la boca del perro y Tomi sale corriendo en calzoncillos
        duracion: 4.4,
        camara: [[9.7, 1.3, 3.1], [9.8, 1.35, 3.5]],
        mira: [[12.6, 0.7, 4.7], [12.3, 0.8, 6.8]],
        lineas: [
          { en: 0.1, quien: 'Tomi', texto: '¡¿EH?!' },
          { en: 1.4, quien: 'Facu', texto: 'Tomi... ¿esos calzoncillos son de corazones?' },
        ],
        alEmpezar: () => {
          this.esconderTodos();
          ubicar(tomi, 12.7, 4.9, A_LA_CALLE);
          ubicar(perro, 12.7, 4.15, A_LA_CALLE);
          for (const malla of tomi.bermudas) malla.visible = false;
          for (const malla of tomi.calzoncillos) malla.visible = true;
          perro.mandibula.add(this.bermudaRota);
          this.audio.riiip();
        },
        animar: (s) => {
          if (s < 0.9) {
            // Se queda duro mirándose (mirando para abajo, con los brazos abiertos)
            ubicar(tomi, 12.7, 5.0, AL_OESTE + 0.3);
            tomi.cabeza.rotation.x = 0.45;
            tomi.brazos.forEach((brazo, i) => brazo.rotation.set(0, 0, i === 0 ? 0.6 : -0.6));
          } else {
            irPorCamino(tomi, salida, (s - 0.9) * 4.2, 6);
            tomi.cabeza.rotation.x = 0;
            tomi.brazos.forEach((brazo) => brazo.rotation.set(-2.8, 0, 0)); // ¡brazos arriba!
          }
          perro.mandibula.rotation.x = 0.3;
          perro.cabeza.rotation.set(0, Math.sin(s * 6) * 0.25, 0);
          perro.cola.rotation.z = Math.sin(s * 22) * 0.7; // contentísimo con su trofeo
          perro.cuerpo.position.y = Math.abs(Math.sin(s * 8)) * 0.05;
        },
      },
    ];
  }
}
