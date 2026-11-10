// El motor de sonido "de verdad" (etapa 16D). Lo usa Audio.js: los efectos siguen armándose con sus
// ladrillos (tono y ruido), pero ahora pueden sonar EN UN LUGAR del mundo.
//
//   - Sonido que viene de un lado: cada sonido con posición pasa por un "panner" (Web Audio) que lo
//     ubica a la izquierda, a la derecha, adelante, atrás, cerca o lejos de tus oídos (la cámara).
//     Así sabés por dónde viene Don Ernesto sin verlo.
//   - Paredes que tapan: si entre el sonido y vos hay una pared, suena más apagado; si está en otro
//     piso, todavía más (un filtro que le saca los agudos).
//   - Eco según el lugar: el baño y la cocina (cerámica) con eco corto y brillante, el sótano y el
//     ático con eco largo, los cuartos con un eco chiquito y afuera casi nada.
//
// También sabe sobre qué superficie está parado alguien (madera, cerámica, pasto...), para los pasos.
//
// Hay tres "salidas" donde se conectan los sonidos:
//   - salida: directo a los parlantes, sin eco (la música, los avisos, el walkie).
//   - mundo:  con el eco del lugar, sin ubicación (tus propios pasos, tu respiración).
//   - en(posicion): ubicado en el mundo, tapado por las paredes y con eco (todo lo demás).
import { UBICACION_MUEBLES, MUEBLES, ALTURA_PISO, LIMITES_CASA, TECHO_GARAJE, pisoDeAltura } from './HouseData.js';

// Hasta dónde se escucha un sonido ubicado: al lado suena entero y se apaga del todo a DISTANCIA_MAXIMA
// (igual que antes, cuando el volumen se calculaba a mano: 1 - distancia / 15)
const DISTANCIA_REFERENCIA = 1;
const DISTANCIA_MAXIMA = 17;

// Los ecos: duración (segundos), qué tan rápido se apaga y qué tan "brillante" es (frecuencia del filtro)
const ECOS = {
  cuarto: { duracion: 0.7, caida: 5, brillo: 2500 },
  corto: { duracion: 0.9, caida: 4, brillo: 7000 }, // baño, cocina, conductos: cerámica y chapa
  largo: { duracion: 2.6, caida: 2.2, brillo: 2200 }, // sótano y ático
};

// Cuánto de cada eco hay en cada lugar
const ZONAS = {
  afuera: { cuarto: 0.04, corto: 0, largo: 0 },
  cuarto: { cuarto: 0.22, corto: 0, largo: 0 },
  ceramica: { cuarto: 0.08, corto: 0.3, largo: 0 },
  conducto: { cuarto: 0, corto: 0.45, largo: 0 },
  sotano: { cuarto: 0.05, corto: 0, largo: 0.4 },
  atico: { cuarto: 0.1, corto: 0, largo: 0.3 },
};

// Caminos de afuera: [x1, z1, x2, z2, superficie] (ver Exterior.crearSuelo)
const CAMINOS = [
  [-1.8, 7.9, -0.2, 22, 'baldosas'], // de la puerta a la calle
  [-3.2, 6.1, 2.2, 7.9, 'baldosas'], // porche
  [-14.6, 6.1, -9.9, 22, 'piedra'], // entrada de autos
  [9.1, -2, 14.5, 4.5, 'baldosas'], // patio trasero
  [-100, 22, 100, 25, 'piedra'], // vereda
];

export class Espacio {
  constructor(ctx, salida) {
    this.ctx = ctx;
    this.salida = salida;
    this.mundo = ctx.createGain();
    this.mundo.connect(salida); // (la parte "seca", sin eco)
    this.envios = {};
    for (const [nombre, eco] of Object.entries(ECOS)) {
      const envio = ctx.createGain();
      envio.gain.value = 0;
      const convolver = ctx.createConvolver();
      convolver.buffer = respuestaDeEco(ctx, eco);
      this.mundo.connect(envio).connect(convolver).connect(salida);
      this.envios[nombre] = envio;
    }
    this.zona = null;
    this.ponerZona('afuera');
    this.oidos = { x: 0, y: 0, z: 0 }; // dónde está el oyente (la cámara)
    // Game le dice cuánto tapan las paredes entre un punto y el jugador (0 = nada, 1 = otro piso)
    this.tapado = () => 0;
  }

  // Un nodo donde conectar un sonido que sale de "posicion" (un Vector3).
  // alcance: hasta cuántos metros se escucha (los pasos de Don Ernesto llegan más lejos: ver Audio.js)
  en(posicion, alcance = DISTANCIA_MAXIMA) {
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';
    panner.refDistance = DISTANCIA_REFERENCIA;
    panner.maxDistance = alcance;
    panner.rolloffFactor = 1;
    ponerPosicion(panner, posicion);
    // Tapado por las paredes: le sacamos los agudos y un poco de volumen
    const tapado = this.tapado(posicion);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = tapado <= 0 ? 20000 : 2400 - tapado * 1800;
    const volumen = this.ctx.createGain();
    volumen.gain.value = 1 - tapado * 0.5;
    panner.connect(filtro).connect(volumen).connect(this.mundo);
    return panner;
  }

  // ¿Llega hasta los oídos? (más lejos que DISTANCIA_MAXIMA no se escucha: ni lo armamos)
  seEscucha({ x, y, z }, alcance = DISTANCIA_MAXIMA) {
    const o = this.oidos;
    return (x - o.x) ** 2 + (y - o.y) ** 2 + (z - o.z) ** 2 < alcance ** 2;
  }

  // Los oídos van con la cámara (posición y hacia dónde mira)
  actualizarOyente(camara, adelante) {
    const oyente = this.ctx.listener;
    const { x, y, z } = camara.position;
    this.oidos = { x, y, z };
    if (oyente.positionX) {
      oyente.positionX.value = x;
      oyente.positionY.value = y;
      oyente.positionZ.value = z;
      oyente.forwardX.value = adelante.x;
      oyente.forwardY.value = adelante.y;
      oyente.forwardZ.value = adelante.z;
      oyente.upX.value = 0;
      oyente.upY.value = 1;
      oyente.upZ.value = 0;
    } else {
      oyente.setPosition(x, y, z);
      oyente.setOrientation(adelante.x, adelante.y, adelante.z, 0, 1, 0);
    }
  }

  // El eco del lugar donde está el jugador (cambia de a poco)
  ponerZona(zona) {
    if (zona === this.zona) return;
    this.zona = zona;
    const ahora = this.ctx.currentTime;
    for (const [nombre, envio] of Object.entries(this.envios)) envio.gain.setTargetAtTime(ZONAS[zona][nombre], ahora, 0.3);
  }
}

// Mueve un panner (también sirve para hacer que un sonido "viaje", con rampas)
export function ponerPosicion(panner, { x, y, z }) {
  if (panner.positionX) {
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  } else {
    panner.setPosition(x, y, z);
  }
}

// El eco "grabado" de un lugar: ruido que se va apagando (distinto en cada oído), filtrado.
// Es lo que hace el ConvolverNode: cada sonido se "repite" con esta forma.
function respuestaDeEco(ctx, { duracion, caida, brillo }) {
  const muestras = Math.floor(ctx.sampleRate * duracion);
  const buffer = ctx.createBuffer(2, muestras, ctx.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const datos = buffer.getChannelData(canal);
    let anterior = 0;
    const suavizado = Math.min(0.95, Math.exp((-2 * Math.PI * brillo) / ctx.sampleRate)); // filtro simple
    for (let i = 0; i < muestras; i++) {
      const t = i / muestras;
      const ruido = (Math.random() * 2 - 1) * Math.pow(1 - t, caida);
      anterior = anterior * suavizado + ruido * (1 - suavizado);
      datos[i] = anterior;
    }
  }
  return buffer;
}

// ------------------------------------------------------------
//  SUPERFICIES: ¿sobre qué está parado alguien? (para el sonido de los pasos)
//  'madera', 'ceramica', 'baldosas', 'alfombra', 'escalon', 'chapa', 'pasto', 'piedra'
// ------------------------------------------------------------
export class Superficies {
  constructor(house) {
    this.house = house;
    this.alfombras = null; // se calculan la primera vez (los modelos cargan de a poco)
  }

  en(posicion) {
    const { x, y, z } = posicion;
    const house = this.house;
    if (house.enConducto(posicion)) return 'chapa';
    if (house.enTunel(posicion)) return 'piedra';
    const piso = pisoDeAltura(y);
    // Altura sobre el piso de abajo (en la mitad de una escalera, pisoDeAltura ya dice el de arriba)
    const resto = ((y % ALTURA_PISO) + ALTURA_PISO) % ALTURA_PISO;
    const altura = resto > ALTURA_PISO - 0.15 ? 0 : resto;
    const hab = house.habitacionEn(x, z, piso);
    const enLaCasa = hab || (x > LIMITES_CASA.x1 && x < LIMITES_CASA.x2 && z > LIMITES_CASA.z1 && z < LIMITES_CASA.z2);
    if (enLaCasa) {
      if (altura > 0.15) return 'escalon'; // escaleras (o arriba de un mueble: suena a madera hueca)
      if (piso === 3) return 'madera'; // el ático: tablones
      if (this.sobreAlfombra(x, z, piso)) return 'alfombra';
      if (hab?.textura === 'ceramica' || hab?.textura === 'baldosas') return hab.textura;
      return 'madera';
    }
    // Afuera: arriba del techo del garaje, chapa; arriba de algo (el balcón, una mesa), madera
    const g = TECHO_GARAJE;
    if (x > g.x1 && x < g.x2 && z > g.z1 && z < g.z2 && y > g.y - 0.3) return 'chapa';
    if (y > 0.4) return 'madera';
    for (const [x1, z1, x2, z2, superficie] of CAMINOS) if (x > x1 && x < x2 && z > z1 && z < z2) return superficie;
    return 'pasto';
  }

  // Las alfombras: su rectángulo según su catálogo (ancho y profundidad, rotación y escala)
  sobreAlfombra(x, z, piso) {
    if (!this.alfombras) {
      this.alfombras = UBICACION_MUEBLES.filter((m) => m.tipo.startsWith('alfombra')).map((m) => {
        const [, , , ancho, , prof] = MUEBLES[m.tipo].partes[0];
        const [ex, , ez] = m.escala ?? [1, 1, 1];
        const girada = Math.abs(m.rot ?? 0) === 90;
        const a = (girada ? prof * ez : ancho * ex) / 2;
        const p = (girada ? ancho * ex : prof * ez) / 2;
        return { piso: m.piso, x1: m.x - a, x2: m.x + a, z1: m.z - p, z2: m.z + p };
      });
    }
    return this.alfombras.some((r) => r.piso === piso && x > r.x1 && x < r.x2 && z > r.z1 && z < r.z2);
  }
}

// El lugar (para el eco) según dónde está el jugador
export function zonaDeEco(house, posicion) {
  if (house.enConducto(posicion)) return 'conducto';
  const piso = pisoDeAltura(posicion.y);
  const { x, z } = posicion;
  const arribaDelGaraje = x < -9 && posicion.y > TECHO_GARAJE.y - 0.3;
  const enLaCasa = x > -15.5 && x < 9 && z > -6 && z < 6 && !arribaDelGaraje;
  if (!enLaCasa && !house.enTunel(posicion)) return 'afuera';
  if (piso === -1 || house.enTunel(posicion)) return 'sotano';
  if (piso === 3) return 'atico';
  return house.habitacionEn(x, z, piso)?.textura === 'ceramica' ? 'ceramica' : 'cuarto';
}
