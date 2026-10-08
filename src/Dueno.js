// Don Ernesto, el vecino (en el código le seguimos diciendo "el dueño" de la casa): el enemigo principal.
// Usa el esqueleto de Enemigo.js (patrulla, investigar, perseguir) con estos extras:
//   - Si el jugador está escondido y el dueño pasa cerca, puede sospechar y revisar el escondite.
//     Debajo de una mesa, si te mira de cerca, te ve: va derecho a sacarte (sin "moneda").
//   - Al cruzar una puerta, a veces la cierra y la traba unos segundos para cortarle el paso al jugador.
//   - Nunca sale de la casa (¡está en pijama!): si el ruido o el jugador están afuera,
//     va hasta el punto de adentro más cercano.
//   - Si llega a la escalera plegable del ático y está plegada, la despliega.
//   - Cada 30 segundos se enoja más y camina más rápido (lo maneja Game con multiplicadorVelocidad).
//   - Animaciones: parpadea, pega un salto de sorpresa cuando te ve (y se queda duro medio segundo:
//     es tu ventaja para arrancar) y se rasca la cabeza mientras busca.
import * as THREE from 'three';
import { Enemigo, ESTADO } from './Enemigo.js';
import { cargarPiezas } from './Models.js';
import { WAYPOINTS, CONEXIONES, LIMITES_CASA, ALTURA_PISO, pisoDeAltura } from './HouseData.js';
import { ESCONDITES, DISTANCIA_VER_DEBAJO_MESA } from './Escondites.js';

const DISTANCIA_SOSPECHA = 2.5; // si pasa así de cerca de tu escondite, puede sospechar
const PROBABILIDAD_SOSPECHA = 0.4; // 40% de revisar cada vez que pasa cerca
const PROBABILIDAD_TRABAR = 0.35; // 35% de trabar cada puerta que cruza
const TIEMPO_TRABA = 20; // segundos que queda trabada la puerta
const DURACION_SORPRESA = 0.5; // segundos del salto de sorpresa (no se mueve mientras tanto)
const DURACION_PARPADEO = 0.12;

// Si ponés acá la ruta a un modelo GLTF (ej: '/models/dueno.glb') se usa ese modelo.
// Si es null o no carga, queda el muñeco hecho con formas básicas.
const URL_MODELO = null;

export class Dueno extends Enemigo {
  constructor(scene, house, player) {
    super(scene, house, player, {
      nombre: 'dueño',
      velocidades: { patrulla: 1.6, investigar: 2.6, perseguir: 3.9 }, // (el jugador camina a 3.5 y corre a 6.5)
      distanciaVision: 12,
      anguloVision: 55, // cono de 110°
      oido: 1,
      abrePuertas: true,
      waypoints: WAYPOINTS,
      conexiones: CONEXIONES,
      inicio: 'dormitorio', // arranca arriba, así el jugador tiene unos segundos
      // Habitaciones que recorre al patrullar (elige una al azar cada vez), de todos los pisos
      puntosPatrulla: [
        'caldera', 'deposito', 'bodega', 'munecas', // sótano
        'living', 'cocina', 'comedor', 'baño', 'entrada-este', // planta baja
        'dormitorio', 'hijo', 'baño-arriba', 'abuela', // primer piso
        'biblioteca', 'trofeos', 'juegos', 'reves', // segundo piso
        'atico-oeste', // ático
      ],
    });
    // Funciones extra que conecta Game
    this.alTrabarPuerta = null; // alTrabarPuerta(puerta)
    if (URL_MODELO) this.cargarModeloGLTF();
  }

  reiniciar() {
    super.reiniciar();
    this.esconditeARevisar = null; // escondite que va a revisar (o null)
    this.encontroAlJugador = false; // true si lo encontró escondido
    this.yaSospecho = false; // para tirar "la moneda" una sola vez por pasada
    this.puertaCruzada = null; // puerta por la que está pasando (para trabarla después)
    this.sorpresa = 0; // > 0 mientras dura el salto de sorpresa
    this.tiempoParaParpadear = 2 + Math.random() * 3;
  }

  // ------------------------------------------------------------
  //  SORPRESA: "¡¿Eh?!" Salta, levanta los brazos y recién después te persigue
  // ------------------------------------------------------------
  alVerAlJugador() {
    if (this.estado !== ESTADO.PERSEGUIR) {
      this.sorpresa = DURACION_SORPRESA;
      this.camino = []; // se frena en seco
    }
    super.alVerAlJugador();
  }

  actualizarPersecucion(dt) {
    if (this.sorpresa > 0) {
      this.sorpresa -= dt;
      this.mirarHacia(this.player.position, dt); // te mira con los ojos bien abiertos
      return;
    }
    super.actualizarPersecucion(dt);
  }

  update(dt) {
    super.update(dt);
    this.sospecharDelEscondite();
    this.trabarPuertaQueCruzo();
    if (this.house.trampilla?.abrirSiEstaCerca(this.position)) this.alAbrirPuerta?.(this.house.trampilla);
  }

  investigar(punto) {
    super.investigar(punto);
    this.esconditeARevisar = null;
  }

  // Llegó a donde investigaba. Si venía a revisar un escondite, "lo abre": ¿está el jugador adentro?
  // Tiene que haber llegado de verdad al escondite: si es uno de afuera (un arbusto, un tacho), él
  // solo llega hasta la pared de adentro, y desde ahí no puede abrir nada.
  alLlegarAInvestigar(llego) {
    const entrada = this.player.posicionAntesDeEsconderse;
    const alLado = Math.hypot(entrada.x - this.position.x, entrada.z - this.position.z) < 1.5 && Math.abs(entrada.y - this.position.y) < 1;
    if (llego && alLado && this.esconditeARevisar && this.player.escondite === this.esconditeARevisar) {
      this.encontroAlJugador = true;
    }
    this.esconditeARevisar = null;
  }

  // Su zona es la casa. Si el punto está afuera, lo "acercamos" al borde de adentro
  // (a 45 cm de la pared), en el mismo piso del punto.
  limitarAZona(punto) {
    const { x1, z1, x2, z2 } = LIMITES_CASA;
    const m = 0.45;
    return this.puntoEnRectangulos(punto, [[x1 + m, z1 + m, x2 - m, z2 - m]], pisoDeAltura(punto.y) * ALTURA_PISO);
  }

  atrapoAlJugador() {
    if (this.encontroAlJugador) return true; // lo encontró escondido
    return super.atrapoAlJugador();
  }

  // ------------------------------------------------------------
  //  ESCONDITES
  // ------------------------------------------------------------
  // El jugador se acaba de esconder. Si lo estaba persiguiendo, lo vio meterse: va a revisar ahí.
  alEsconderseElJugador(escondite) {
    if (this.estado === ESTADO.PERSEGUIR) this.revisarEscondite(escondite);
  }

  // Va hasta donde estaba parado el jugador al esconderse y revisa el escondite
  revisarEscondite(escondite) {
    this.investigar(this.player.posicionAntesDeEsconderse);
    this.esconditeARevisar = escondite;
  }

  // Si pasa cerca del escondite (y lo ve), tira una "moneda cargada": 40% de revisarlo.
  // Tira una sola vez por pasada: tiene que alejarse para volver a tirar.
  sospecharDelEscondite() {
    const escondite = this.player.escondido ? this.player.escondite : null;
    if (!escondite || this.esconditeARevisar || this.estado === ESTADO.PERSEGUIR) return;

    // Debajo de una mesa no hace falta la moneda: si te ve, te ve
    if (ESCONDITES[escondite.escondite].seVeDeCerca && this.veDebajoDeLaMesa(escondite.collider)) {
      this.revisarEscondite(escondite);
      return;
    }

    const puntoDeEntrada = this.player.posicionAntesDeEsconderse;
    const distancia = Math.hypot(puntoDeEntrada.x - this.position.x, puntoDeEntrada.z - this.position.z);
    const mismoPiso = Math.abs(puntoDeEntrada.y - this.position.y) < 1;
    const ojos = this.position.clone();
    ojos.y += this.v.alturaOjos;
    const loVe = () => this.house.hayVisionEntre(ojos, puntoDeEntrada.clone().setY(puntoDeEntrada.y + 1));
    const cerca = distancia < DISTANCIA_SOSPECHA && mismoPiso && loVe();

    if (cerca && !this.yaSospecho) {
      this.yaSospecho = true;
      if (Math.random() < PROBABILIDAD_SOSPECHA) this.revisarEscondite(escondite);
    } else if (!cerca && distancia > DISTANCIA_SOSPECHA + 1) {
      this.yaSospecho = false;
    }
  }

  // ¿Te ve debajo de la mesa? Tiene que estar cerca, en el mismo piso, mirando hacia la mesa y sin
  // nada en el medio (miramos hacia un punto arriba de la mesa: la mesa misma no tapa).
  veDebajoDeLaMesa(caja) {
    const centro = caja.getCenter(new THREE.Vector3());
    const ojos = this.position.clone();
    ojos.y += this.v.alturaOjos;
    const distancia = Math.hypot(centro.x - ojos.x, centro.z - ojos.z);
    if (distancia > DISTANCIA_VER_DEBAJO_MESA || Math.abs(caja.min.y - this.position.y) > 1) return false;
    const haciaLaMesa = new THREE.Vector3(centro.x - ojos.x, 0, centro.z - ojos.z).normalize();
    const mirada = new THREE.Vector3(Math.sin(this.rotacion), 0, Math.cos(this.rotacion));
    if (haciaLaMesa.dot(mirada) < Math.cos(THREE.MathUtils.degToRad(this.v.anguloVision))) return false;
    return this.house.hayVisionEntre(ojos, centro.setY(caja.max.y + 0.3));
  }

  // ------------------------------------------------------------
  //  PUERTAS TRABADAS
  // ------------------------------------------------------------
  // Cuando pasa por una puerta, la recuerda. Cuando ya se alejó un poco, a veces
  // la cierra y la traba para cortarle el paso al jugador. (Persiguiendo no, está apurado.)
  trabarPuertaQueCruzo() {
    if (this.estado === ESTADO.PERSEGUIR) {
      this.puertaCruzada = null;
      return;
    }

    if (!this.puertaCruzada) {
      // ¿Está parado en el hueco de alguna puerta abierta?
      this.puertaCruzada =
        this.house.puertas.find(
          (p) =>
            p.abierta &&
            !p.conLlave &&
            p.estilo === 'normal' && // (no traba rejillas, tablas ni el estante secreto)
            Math.abs(p.centro.y - 1.1 - this.position.y) < 1 &&
            Math.hypot(p.centro.x - this.position.x, p.centro.z - this.position.z) < 0.6,
        ) || null;
      return;
    }

    const puerta = this.puertaCruzada;
    const distancia = Math.hypot(puerta.centro.x - this.position.x, puerta.centro.z - this.position.z);
    if (distancia < 1.4) return; // todavía está cerca

    this.puertaCruzada = null;
    const jugadorEnElHueco = this.player.obtenerCaja().intersectsBox(puerta.collider);
    if (puerta.abierta && !jugadorEnElHueco && Math.random() < PROBABILIDAD_TRABAR) {
      puerta.trabar(TIEMPO_TRABA);
      this.alTrabarPuerta?.(puerta); // aviso para la UI (lo conecta Game)
    }
  }

  // ------------------------------------------------------------
  //  MODELO Y ANIMACIÓN
  // ------------------------------------------------------------
  // Un señor en bata, pantuflas y gorro de dormir, con un palo de amasar. Mira hacia +Z.
  crearCuerpo() {
    const cuerpo = new THREE.Group();
    const parte = (geometria, color, x, y, z, padre = cuerpo) => this.parte(padre, geometria, color, x, y, z);
    const piel = '#ffcc99';

    // Piernas: cada una cuelga de un "pivote" en la cadera, así se pueden balancear
    this.piernas = [-0.12, 0.12].map((x) => {
      const cadera = new THREE.Group();
      cadera.position.set(x, 0.7, 0);
      cuerpo.add(cadera);
      parte(new THREE.CylinderGeometry(0.09, 0.09, 0.62, 10), '#4c6ef5', 0, -0.33, 0, cadera); // pijama
      parte(new THREE.BoxGeometry(0.16, 0.1, 0.3), '#ff8fab', 0, -0.65, 0.05, cadera); // pantufla
      return cadera;
    });

    // Bata y cinturón
    parte(new THREE.CylinderGeometry(0.26, 0.34, 0.75, 14), '#9b5de5', 0, 1.075, 0);
    parte(new THREE.CylinderGeometry(0.315, 0.315, 0.06, 14), '#f15bb5', 0, 1.0, 0);

    // Brazos (también con pivote en el hombro)
    this.brazos = [-0.32, 0.32].map((x) => {
      const hombro = new THREE.Group();
      hombro.position.set(x, 1.38, 0);
      cuerpo.add(hombro);
      parte(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 8), '#9b5de5', 0, -0.27, 0, hombro);
      parte(new THREE.SphereGeometry(0.08, 10, 8), piel, 0, -0.57, 0, hombro);
      return hombro;
    });
    // Palo de amasar en la mano derecha
    const palo = parte(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 10), '#c68642', 0, -0.6, 0.15, this.brazos[1]);
    palo.rotation.x = Math.PI / 2;

    // Cabeza con nariz grande, ojos, cejas enojadas y bigote
    parte(new THREE.SphereGeometry(0.2, 16, 12), piel, 0, 1.62, 0);
    parte(new THREE.SphereGeometry(0.07, 10, 8), '#ff9e80', 0, 1.6, 0.2);
    this.ojos = []; // (para parpadear: se aplastan en Y)
    for (const lado of [-1, 1]) {
      this.ojos.push(parte(new THREE.SphereGeometry(0.045, 10, 8), '#ffffff', lado * 0.08, 1.68, 0.16));
      this.ojos.push(parte(new THREE.SphereGeometry(0.022, 8, 6), '#000000', lado * 0.08, 1.68, 0.2));
      const ceja = parte(new THREE.BoxGeometry(0.1, 0.025, 0.02), '#5d4037', lado * 0.08, 1.75, 0.18);
      ceja.rotation.z = lado * 0.35;
    }
    parte(new THREE.BoxGeometry(0.24, 0.05, 0.05), '#5d4037', 0, 1.53, 0.18);

    // Gorro de dormir con pompón
    const gorro = parte(new THREE.ConeGeometry(0.19, 0.34, 12), '#e4572e', 0, 1.92, 0);
    gorro.rotation.z = -0.35;
    parte(new THREE.SphereGeometry(0.06, 10, 8), '#ffffff', 0.06, 2.08, 0);

    return cuerpo;
  }

  // Reemplaza el muñeco por un modelo GLTF (si falla, queda el muñeco)
  cargarModeloGLTF() {
    cargarPiezas([{ archivo: URL_MODELO, caja: [0, 0, 0, 0.8, 2, 0.6] }], false)
      .then((modelo) => {
        this.cuerpo.clear();
        this.cuerpo.add(modelo);
        this.piernas = [];
        this.brazos = [];
        this.ojos = [];
      })
      .catch(() => console.warn(`No se pudo cargar ${URL_MODELO}: queda el dueño hecho con formas básicas`));
  }

  // Balanceo de piernas y brazos al caminar. Persiguiendo: levanta el palo de amasar y lo agita (¡cómico!)
  animarCuerpo(dt, caminando) {
    this.parpadear(dt);

    // Salto de sorpresa: el cuerpo sube y baja (medio seno) con los dos brazos para arriba
    if (this.sorpresa > 0) {
      const t = 1 - this.sorpresa / DURACION_SORPRESA; // de 0 a 1
      this.cuerpo.position.y = Math.sin(t * Math.PI) * 0.35;
      this.piernas.forEach((pierna) => (pierna.rotation.x = 0));
      this.brazos.forEach((brazo) => {
        brazo.rotation.x = -2.8;
        brazo.rotation.z = 0;
      });
      return;
    }
    this.cuerpo.position.y = 0;

    const balanceo = caminando ? Math.sin(this.tiempoAnimacion) * 0.6 : 0;
    this.piernas.forEach((pierna, i) => (pierna.rotation.x = i === 0 ? balanceo : -balanceo));
    this.brazos.forEach((brazo, i) => {
      brazo.rotation.x = i === 0 ? -balanceo : balanceo;
      brazo.rotation.z = 0;
    });
    if (this.estado === ESTADO.PERSEGUIR && this.brazos[1]) {
      this.brazos[1].rotation.x = -2.6 + Math.sin(this.tiempoAnimacion * 2) * 0.4;
    }
    // Buscando (quieto, mirando alrededor): se rasca la cabeza con la mano izquierda
    if (this.estado === ESTADO.INVESTIGAR && !caminando && this.brazos[0]) {
      this.brazos[0].rotation.x = -3; // brazo para arriba, al costado de la cabeza
      this.brazos[0].rotation.z = 0.35 + Math.sin(this.tiempoTotal * 14) * 0.1; // la mano va y viene
    }
  }

  // Cada 2 a 5 segundos cierra los ojos un ratito (los aplasta en Y)
  parpadear(dt) {
    this.tiempoParaParpadear -= dt;
    if (this.tiempoParaParpadear < -DURACION_PARPADEO) this.tiempoParaParpadear = 2 + Math.random() * 3;
    const cerrados = this.tiempoParaParpadear < 0 && this.sorpresa <= 0; // (sorprendido no parpadea)
    for (const ojo of this.ojos) ojo.scale.y = cerrados ? 0.15 : 1;
  }
}
