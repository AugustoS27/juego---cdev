// Don Ernesto, el vecino (en el código le seguimos diciendo "el dueño" de la casa): el enemigo principal.
// Usa el esqueleto de Enemigo.js (patrulla, investigar, perseguir) con estos extras:
//   - Si el jugador está escondido y el dueño pasa cerca, puede sospechar y revisar el escondite.
//     Debajo de una mesa, si te mira de cerca, te ve: va derecho a sacarte (sin "moneda").
//   - Al cruzar una puerta, a veces la cierra y la traba unos segundos para cortarle el paso al jugador.
//   - Nunca sale de la casa (¡está en pijama!): si el ruido o el jugador están afuera,
//     va hasta el punto de adentro más cercano. La excepción es el garaje, cuando le cortan la luz
//     (etapa 16C): va al tablero a subir la llave y, desde la segunda vez, se queda revisando el garaje.
//     Mientras dura eso, el garaje también es su zona.
//   - Si llega a la escalera plegable del ático y está plegada, la despliega.
//   - Animaciones: parpadea, pega un salto de sorpresa cuando te ve (y se queda duro medio segundo:
//     es tu ventaja para arrancar), se rasca la cabeza y gira la cabeza mientras busca, y se pone
//     colorado de bronca cuando te persigue.
import * as THREE from 'three';
import { Enemigo, ESTADO } from './Enemigo.js';
import { cargarPiezas } from './Models.js';
import { crearDonErnesto } from './Personajes.js';
import { materialToon } from './Materials.js';
import { WAYPOINTS, CONEXIONES, LIMITES_CASA, ALTURA_PISO, pisoDeAltura } from './HouseData.js';
import { ESCONDITES, DISTANCIA_VER_DEBAJO_MESA } from './Escondites.js';

const DISTANCIA_SOSPECHA = 2.5; // si pasa así de cerca de tu escondite, puede sospechar
const PROBABILIDAD_SOSPECHA = 0.4; // 40% de revisar cada vez que pasa cerca
const PROBABILIDAD_TRABAR = 0.35; // 35% de trabar cada puerta que cruza
const TIEMPO_TRABA = 20; // segundos que queda trabada la puerta
const DURACION_SORPRESA = 0.5; // segundos del salto de sorpresa (no se mueve mientras tanto)
const DURACION_PARPADEO = 0.12;
const COLOR_ENOJADO = new THREE.Color('#ff6b6b');
// El garaje (etapa 16C): su rectángulo (con margen) y los puntos que revisa cuando sospecha
const ZONA_GARAJE = [-15.05, -1.55, -9.45, 5.55];
const PUNTOS_REVISAR_GARAJE = ['garaje-sur', 'garaje-oeste'];
const TIEMPO_EN_EL_GARAJE = 30; // segundos que el garaje sigue siendo "su zona" después de arreglar el tablero

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
        'living', 'cocina', 'comedor', 'baño', 'entrada-este', 'relojes', // planta baja
        'dormitorio', 'hijo', 'baño-arriba', 'abuela', 'vestidor', // primer piso
        'biblioteca', 'trofeos', 'juegos', 'reves', // segundo piso
        'atico-oeste', // ático
      ],
    });
    // Funciones extra que conecta Game
    this.alTrabarPuerta = null; // alTrabarPuerta(puerta)
    this.alArreglarTablero = null; // llegó al tablero: sube la llave y vuelve la luz (etapa 16C)
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
    // Cortes de luz (etapa 16C)
    this.tablero = null; // { punto, sospecha }: tiene que ir a subir la llave (null: no hay corte)
    this.yendoAlTablero = false;
    this.porRevisar = []; // puntos del garaje que le falta revisar
    this.tiempoGaraje = 0; // mientras sea > 0, el garaje es parte de su zona
  }

  // ------------------------------------------------------------
  //  CORTES DE LUZ (etapa 16C)
  // ------------------------------------------------------------
  // Se cortó la luz: tiene que ir al tablero. Si está persiguiendo o investigando algo, termina eso
  // primero (ver actualizarEstado). sospecha: después de arreglarla se queda revisando el garaje.
  irAlTablero(punto, sospecha) {
    this.tablero = { punto: punto.clone(), sospecha };
    this.tiempoGaraje = TIEMPO_EN_EL_GARAJE;
  }

  // El jugador subió la llave antes de que él llegara: ya no hace falta ir
  olvidarTablero() {
    this.tablero = null;
    this.yendoAlTablero = false;
  }

  // Va al próximo lugar (el tablero o un punto del garaje), como si investigara (con el "?")
  irComoInvestigando(punto) {
    this.cambiarEstado(ESTADO.INVESTIGAR);
    this.tiempoYendo = 0;
    this.irA(punto);
    this.empezarEspera(this.v.tiempoBuscando);
  }

  actualizarEstado(dt) {
    this.tiempoGaraje -= dt;
    // Cuando vuelve a patrullar, primero el tablero y después revisar el garaje
    if (this.estado === ESTADO.PATRULLA && this.tablero && !this.yendoAlTablero) {
      this.irComoInvestigando(this.tablero.punto);
      this.yendoAlTablero = true;
    } else if (this.estado === ESTADO.PATRULLA && this.porRevisar.length > 0) {
      this.irComoInvestigando(this.waypoints[this.porRevisar.shift()]);
      this.tiempoGaraje = Math.max(this.tiempoGaraje, this.v.tiempoBuscando + 5);
    }
    // Yendo al tablero no se rinde aunque tarde (está a oscuras: va despacio pero va)
    if (this.yendoAlTablero) this.tiempoYendo = 0;
    super.actualizarEstado(dt);
  }

  cambiarEstado(nuevo) {
    if (nuevo !== ESTADO.INVESTIGAR) this.yendoAlTablero = false; // (si te ve en el camino, el tablero espera)
    super.cambiarEstado(nuevo);
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
    this.yendoAlTablero = false; // (un ruido en el camino: va a ver y después sigue para el tablero)
    super.investigar(punto);
    this.esconditeARevisar = null;
  }

  // Llegó a donde investigaba. Si venía a revisar un escondite, "lo abre": ¿está el jugador adentro?
  // Tiene que haber llegado de verdad al escondite: si es uno de afuera (un arbusto, un tacho), él
  // solo llega hasta la pared de adentro, y desde ahí no puede abrir nada.
  alLlegarAInvestigar(llego) {
    // Llegó al tablero: sube la llave (y, si sospecha, después revisa el garaje)
    if (this.yendoAlTablero) {
      this.yendoAlTablero = false;
      const { sospecha } = this.tablero;
      this.tablero = null;
      this.alArreglarTablero?.();
      if (sospecha) this.porRevisar = [...PUNTOS_REVISAR_GARAJE];
      return;
    }
    const entrada = this.player.posicionAntesDeEsconderse;
    const alLado = Math.hypot(entrada.x - this.position.x, entrada.z - this.position.z) < 1.5 && Math.abs(entrada.y - this.position.y) < 1;
    if (llego && alLado && this.esconditeARevisar && this.player.escondite === this.esconditeARevisar) {
      this.encontroAlJugador = true;
    }
    this.esconditeARevisar = null;
  }

  // Su zona es la casa. Si el punto está afuera, lo "acercamos" al borde de adentro
  // (a 45 cm de la pared), en el mismo piso del punto.
  // (Mientras arregla el tablero o revisa el garaje, el garaje de la planta baja también es su zona)
  limitarAZona(punto) {
    const { x1, z1, x2, z2 } = LIMITES_CASA;
    const m = 0.45;
    const rectangulos = [[x1 + m, z1 + m, x2 - m, z2 - m]];
    const piso = pisoDeAltura(punto.y);
    if (piso === 0 && (this.tablero || this.tiempoGaraje > 0)) rectangulos.push(ZONA_GARAJE);
    return this.puntoEnRectangulos(punto, rectangulos, piso * ALTURA_PISO);
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
  // Don Ernesto (ver Personajes.js): guardamos sus partes con bisagra para animarlas
  crearCuerpo() {
    const { cuerpo, piernas, brazos, cabeza, ojos, cara } = crearDonErnesto();
    this.piernas = piernas;
    this.brazos = brazos;
    this.cabeza = cabeza;
    this.ojos = ojos; // (para parpadear: se aplastan en Y)
    this.cara = cara;
    this.colorCara = cara.color.clone();
    // De noche lleva una linterna en la mano izquierda (la luz la maneja Game, ver Turno.js)
    this.linternaEnMano = new THREE.Group();
    this.linternaEnMano.position.set(0, -0.62, 0);
    brazos[0].add(this.linternaEnMano);
    const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.22, 10), materialToon('#3d405b'));
    tubo.position.y = -0.08;
    const vidrio = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10), new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
    vidrio.position.y = -0.2;
    vidrio.userData.outlineParameters = { visible: false };
    this.linternaEnMano.add(tubo, vidrio);
    this.puntaLinterna = new THREE.Object3D(); // de acá sale la luz
    this.puntaLinterna.position.y = -0.22;
    this.linternaEnMano.add(this.puntaLinterna);
    this.conLinterna = false;
    this.linternaEnMano.visible = false;
    return cuerpo;
  }

  // De noche (Game lo prende y lo apaga con el turno)
  ponerLinterna(conLinterna) {
    this.conLinterna = conLinterna;
    if (this.linternaEnMano) this.linternaEnMano.visible = conLinterna;
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
        this.cabeza = null;
      })
      .catch(() => console.warn(`No se pudo cargar ${URL_MODELO}: queda el dueño hecho con formas básicas`));
  }

  // Balanceo de piernas y brazos al caminar. Persiguiendo: levanta el palo de amasar y lo agita (¡cómico!)
  animarCuerpo(dt, caminando) {
    this.parpadear(dt);

    // Colorado de bronca mientras te persigue (el color de la cara va y viene de a poco)
    const objetivo = this.estado === ESTADO.PERSEGUIR ? COLOR_ENOJADO : this.colorCara;
    this.cara?.color.lerp(objetivo, Math.min(1, dt * 3));
    // Buscando (quieto): gira la cabeza de un lado al otro; si no, mira para adelante
    if (this.cabeza) {
      const buscando = this.estado === ESTADO.INVESTIGAR && !caminando;
      const giro = buscando ? Math.sin(this.tiempoTotal * 1.8) * 0.7 : 0;
      this.cabeza.rotation.y += (giro - this.cabeza.rotation.y) * Math.min(1, dt * 5);
    }

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
    if (this.estado === ESTADO.INVESTIGAR && !caminando && this.brazos[0] && !this.conLinterna) {
      this.brazos[0].rotation.x = -3; // brazo para arriba, al costado de la cabeza
      this.brazos[0].rotation.z = 0.35 + Math.sin(this.tiempoTotal * 14) * 0.1; // la mano va y viene
    }
    // De noche, la linterna para adelante (buscando, la mueve de un lado al otro)
    if (this.conLinterna && this.brazos[0]) {
      const buscando = this.estado === ESTADO.INVESTIGAR && !caminando;
      this.brazos[0].rotation.x = -1.45 + Math.sin(this.tiempoAnimacion) * 0.05;
      this.brazos[0].rotation.z = buscando ? Math.sin(this.tiempoTotal * 1.8) * 0.35 : 0;
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
