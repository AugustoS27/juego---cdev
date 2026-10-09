// Sonidos grabados (etapa 16D): la otra alternativa a los sonidos hechos con código.
// Son de dos packs de Kenney.nl con licencia CC0 (libres): "Impact Sounds" y "RPG Audio" (ver las licencias
// en /public/sonidos). Solo están los que usamos: pasos en cada piso, puertas, crujidos, golpes, vidrio, ropa.
//
// Cada sonido tiene varias versiones (ej: 5 pasos de madera distintos): se elige una al azar y se la toca
// un poquito más aguda o más grave, así ningún paso suena igual al anterior.
// Todos se "emparejan" al cargarlos (mismo volumen promedio), así los volúmenes de Audio.js sirven para todos.
//
// Si algo no carga (o todavía está cargando), Audio.js usa el sonido hecho con código.

const RUTA = '/sonidos/';
const lista = (base, cantidad, desde = 0) => Array.from({ length: cantidad }, (_, i) => `${base}${String(desde + i).padStart(3, '0')}.ogg`);

// nombre -> archivos (las versiones)
const ARCHIVOS = {
  madera: lista('footstep_wood_', 5),
  alfombra: lista('footstep_carpet_', 5),
  cemento: lista('footstep_concrete_', 5), // (cerámica, baldosas y piedra: el mismo, más agudo o más grave)
  pasto: lista('footstep_grass_', 5),
  chapa: lista('impactMetal_light_', 3),
  tablon: lista('impactPlank_medium_', 3), // escalones
  golpeMadera: lista('impactWood_heavy_', 3), // portazos, choques
  vidrio: ['impactGlass_heavy_000.ogg'],
  crujido: ['creak1.ogg', 'creak2.ogg', 'creak3.ogg'],
  puertaAbrir: ['doorOpen_1.ogg', 'doorOpen_2.ogg'],
  puertaCerrar: ['doorClose_1.ogg', 'doorClose_2.ogg', 'doorClose_3.ogg', 'doorClose_4.ogg'],
  ropa: ['cloth1.ogg', 'cloth2.ogg', 'cloth3.ogg'],
  traba: ['metalLatch.ogg'],
  click: ['metalClick.ogg'],
};

const VOLUMEN_PROMEDIO = 0.12; // a qué volumen promedio (RMS) se emparejan todos

export class SonidosGrabados {
  constructor(ctx) {
    this.ctx = ctx;
    this.buffers = {}; // nombre -> [{ buffer, ajuste }]
    this.listo = false;
    this.cargar();
  }

  async cargar() {
    const cargas = Object.entries(ARCHIVOS).map(async ([nombre, archivos]) => {
      const versiones = await Promise.all(archivos.map((archivo) => this.cargarArchivo(archivo)));
      this.buffers[nombre] = versiones.filter(Boolean);
    });
    await Promise.all(cargas);
    this.listo = true;
  }

  async cargarArchivo(archivo) {
    try {
      const respuesta = await fetch(RUTA + archivo);
      const buffer = await this.ctx.decodeAudioData(await respuesta.arrayBuffer());
      return { buffer, ajuste: VOLUMEN_PROMEDIO / Math.max(0.001, rms(buffer)) };
    } catch {
      console.warn(`No se pudo cargar el sonido ${archivo}: se usa el hecho con código`);
      return null;
    }
  }

  tiene(nombre) {
    return this.buffers[nombre]?.length > 0;
  }

  // Toca una versión al azar. velocidad: 1 = normal, más alto = más agudo (y más corto)
  tocar(nombre, destino, { volumen = 1, velocidad = 1, retraso = 0 } = {}) {
    const versiones = this.buffers[nombre];
    if (!versiones?.length) return false;
    const { buffer, ajuste } = versiones[Math.floor(Math.random() * versiones.length)];
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.playbackRate.value = velocidad * (0.94 + Math.random() * 0.12);
    const vol = this.ctx.createGain();
    vol.gain.value = volumen * ajuste * (0.9 + Math.random() * 0.2);
    fuente.connect(vol).connect(destino);
    fuente.start(this.ctx.currentTime + retraso);
    return true;
  }
}

// El volumen promedio de un sonido (raíz del promedio de los cuadrados), mirando solo la parte que suena
function rms(buffer) {
  const datos = buffer.getChannelData(0);
  let suma = 0;
  let cuenta = 0;
  for (let i = 0; i < datos.length; i++) {
    if (Math.abs(datos[i]) < 0.005) continue; // (los silencios del principio y del final no cuentan)
    suma += datos[i] * datos[i];
    cuenta++;
  }
  return cuenta ? Math.sqrt(suma / cuenta) : 0;
}
