// La música del juego (etapa 17C): en vez de una melodía que suena siempre, CAPAS que entran y salen según
// lo que está pasando. La idea es que la música cuente la situación sin que haga falta leer nada:
//
//   calma            casi silencio: un zumbido grave y, cada tanto, una nota suelta
//   hay alguien cerca  entra un pulso de dos notas, más rápido cuanto más cerca está
//   te buscan        cuerdas tensas que tiemblan (alguien escuchó algo y viene a ver)
//   te persiguen     bajo rápido con bombo y platillo; cuando te pierden, se apaga y quedan las cuerdas
//   en el menú       una cajita de música, lenta y un poco desafinada
//
// Además están los "golpes": acordes cortos que marcan un momento (te vieron, escucharon algo, un susto).
//
// Todo se arma con los ladrillos de Audio.js (tono y ruido) y pasa por un volumen propio (this.salida).
// Las notas se programan con el reloj del audio y un poquito de anticipación: así el ritmo no depende de
// cuántos cuadros por segundo dibuje el juego.

// Frecuencia de una nota: semitonos desde el La de 440 Hz (0 = La4, -12 = La3, 3 = Do5...)
const nota = (semitonos) => 440 * 2 ** (semitonos / 12);

const ANTICIPACION = 0.15; // segundos: cuánto antes se programa cada nota
const VOLUMEN = 0.9;

// Los patrones que se tocan nota por nota. Cada uno dice cada cuánto va un paso y qué suena en ese paso.
// (El pulso y la persecución usan La menor con el Mi bemol "feo" (el tritono): suena a peligro.)
const BAJO_PERSECUCION = [-24, -24, -21, -24, -18, -24, -19, -21, -24, -24, -21, -24, -17, -18, -19, -21];
const CAJITA = [12, 15, 19, 15, 12, 15, 20, 15, 12, 14, 17, 14, 11, 14, 19, null, 12, 15, 19, 24, 22, 19, 15, 19, 17, 14, 11, 14, 12, null, null, null];

export class Musica {
  constructor(audio) {
    this.audio = audio;
    this.patron = null; // 'calma', 'pulso', 'persecucion', 'cajita' o null
    this.paso = 0;
    this.proximo = 0; // en qué momento (reloj del audio) va la próxima nota
    this.capas = null; // las capas que no paran (zumbido y cuerdas): se arman la primera vez
  }

  // Cada frame. modo: 'juego', 'menu' o 'silencio' (pausa, cinemáticas, final)
  // peligro: de 0 a 1 (qué tan cerca está un enemigo) · buscando / persiguiendo: true o false
  update({ modo, peligro = 0, buscando = false, persiguiendo = false }) {
    const ctx = this.audio.ctx;
    if (!ctx) return;
    if (!this.capas) this.crearCapas();
    const ahora = ctx.currentTime;
    const jugando = modo === 'juego';

    // Las capas que no paran: se les mueve el volumen de a poco
    const c = this.capas;
    c.zumbido.gain.setTargetAtTime(jugando ? 0.05 + 0.04 * peligro : 0, ahora, 0.8);
    const tension = !jugando ? 0 : persiguiendo ? 0.6 : buscando ? 1 : peligro * 0.45;
    c.cuerdas.gain.setTargetAtTime(0.05 * tension, ahora, buscando ? 0.25 : 0.9);
    c.filtroCuerdas.frequency.setTargetAtTime(700 + 1100 * tension, ahora, 1.5);

    // Qué patrón toca ahora
    let patron = null;
    if (modo === 'menu') patron = 'cajita';
    else if (jugando) patron = persiguiendo ? 'persecucion' : peligro > 0.12 ? 'pulso' : 'calma';
    if (patron !== this.patron) {
      this.patron = patron;
      this.paso = 0;
      this.proximo = ahora + (patron === 'calma' ? 3 : 0.05);
    }
    if (!patron) return;
    if (this.proximo < ahora - 0.5) this.proximo = ahora; // (la pestaña estuvo dormida: no tocar todo junto)
    while (this.proximo < ahora + ANTICIPACION) {
      const retraso = Math.max(0, this.proximo - ahora);
      this.proximo += this.tocarPaso(patron, this.paso++, retraso, peligro);
    }
  }

  // Toca un paso del patrón y devuelve cuántos segundos faltan para el siguiente
  tocarPaso(patron, i, retraso, peligro) {
    const destino = this.salida;
    const t = (opciones) => this.audio.tono({ ...opciones, retraso, destino });
    const r = (opciones) => this.audio.ruido({ ...opciones, retraso, destino });

    if (patron === 'calma') {
      // Una nota grave suelta, como un piano lejos, cada 6 a 11 segundos
      const n = [-24, -21, -19, -17][Math.floor(Math.random() * 4)];
      t({ frecuencia: nota(n), duracion: 2.5, tipo: 'triangle', volumen: 0.05 });
      t({ frecuencia: nota(n + 12) * 1.004, duracion: 1.8, tipo: 'sine', volumen: 0.02 });
      return 6 + Math.random() * 5;
    }

    if (patron === 'pulso') {
      // Dos notas que van y vienen (La - Do), cada vez más rápido y más fuerte
      const n = i % 4 === 2 ? -21 : -24;
      t({ frecuencia: nota(n), frecuenciaFinal: nota(n) * 0.97, duracion: 0.22, tipo: 'triangle', volumen: 0.08 + 0.1 * peligro });
      if (i % 4 === 0 && peligro > 0.5) r({ duracion: 0.03, volumen: 0.03, filtro: 6000, q: 2, tipoFiltro: 'bandpass' });
      return 0.52 - 0.28 * peligro;
    }

    if (patron === 'persecucion') {
      const n = BAJO_PERSECUCION[i % BAJO_PERSECUCION.length];
      t({ frecuencia: nota(n), duracion: 0.1, tipo: 'sawtooth', volumen: 0.07 });
      t({ frecuencia: nota(n + 12), duracion: 0.08, tipo: 'square', volumen: 0.025 });
      if (i % 4 === 0) t({ frecuencia: 130, frecuenciaFinal: 42, duracion: 0.14, volumen: 0.3 }); // bombo
      if (i % 4 === 2) r({ duracion: 0.07, volumen: 0.1, filtro: 2200, q: 0.8, tipoFiltro: 'bandpass' }); // redoblante
      r({ duracion: 0.025, volumen: i % 2 ? 0.02 : 0.04, filtro: 8000, q: 1.5, tipoFiltro: 'bandpass' }); // platillo
      if (i % 16 === 0) t({ frecuencia: nota(-9), frecuenciaFinal: nota(-6), duracion: 0.9, tipo: 'sawtooth', volumen: 0.03 }); // sirena de cuerdas
      return 0.115;
    }

    // Cajita de música (menú): notas agudas con cola larga, algunas apenas desafinadas
    const n = CAJITA[i % CAJITA.length];
    if (n !== null) {
      const desafinada = 1 + (Math.random() - 0.5) * 0.008;
      t({ frecuencia: nota(n) * desafinada, duracion: 1.4, tipo: 'sine', volumen: 0.06 });
      t({ frecuencia: nota(n + 12) * desafinada, duracion: 0.5, tipo: 'triangle', volumen: 0.012 });
    }
    return 0.46;
  }

  // Un golpe de música: 'visto' (¡te vieron!), 'oyo' (alguien escuchó algo), 'susto' (algo de golpe)
  golpe(tipo) {
    if (!this.audio.ctx) return;
    if (!this.capas) this.crearCapas();
    const destino = this.salida;
    const t = (opciones) => this.audio.tono({ ...opciones, destino });
    if (tipo === 'visto') {
      // Un acorde feo de golpe (con el tritono), un platillazo y un golpe grave que baja
      for (const n of [-24, -18, -11, 1, 6]) t({ frecuencia: nota(n), frecuenciaFinal: nota(n) * 1.03, duracion: 1.3, tipo: 'sawtooth', volumen: 0.06 });
      this.audio.ruido({ duracion: 0.6, volumen: 0.22, filtro: 3500, destino });
      t({ frecuencia: 70, frecuenciaFinal: 32, duracion: 0.9, volumen: 0.35 });
    } else if (tipo === 'oyo') {
      // Dos notas graves "de puntillas" que bajan: "¿eh?"
      t({ frecuencia: nota(-19), duracion: 0.3, tipo: 'triangle', volumen: 0.14 });
      t({ frecuencia: nota(-20), duracion: 0.5, tipo: 'triangle', volumen: 0.14, retraso: 0.24 });
    } else {
      // Susto: dos notas agudas pegadas (suenan a "chirrido")
      t({ frecuencia: nota(12), duracion: 0.6, tipo: 'triangle', volumen: 0.06 });
      t({ frecuencia: nota(13), duracion: 0.6, tipo: 'triangle', volumen: 0.06 });
      this.audio.ruido({ duracion: 0.08, volumen: 0.1, filtro: 5000, q: 1, tipoFiltro: 'bandpass', destino });
    }
  }

  // La música baja un instante (para que se escuche un paso cercano) y vuelve sola
  agachar() {
    if (!this.capas) return;
    const ahora = this.audio.ctx.currentTime;
    this.salida.gain.cancelScheduledValues(ahora);
    this.salida.gain.setTargetAtTime(VOLUMEN * 0.45, ahora, 0.02);
    this.salida.gain.setTargetAtTime(VOLUMEN, ahora + 0.25, 0.25);
  }

  // Las capas que suenan todo el tiempo (con volumen 0 cuando no tocan): el zumbido y las cuerdas
  crearCapas() {
    const ctx = this.audio.ctx;
    this.salida = ctx.createGain();
    this.salida.gain.value = VOLUMEN;
    this.salida.connect(this.audio.salida);

    // Zumbido: dos notas graves casi iguales (al no coincidir del todo, "laten" despacito)
    const zumbido = ctx.createGain();
    zumbido.gain.value = 0;
    zumbido.connect(this.salida);
    for (const frecuencia of [55, 55.4, 82.6]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frecuencia;
      osc.connect(zumbido);
      osc.start();
    }

    // Cuerdas tensas: tres notas pegadas (La, Si bemol, Mi), filtradas, que tiemblan (trémolo)
    const cuerdas = ctx.createGain();
    cuerdas.gain.value = 0;
    const filtroCuerdas = ctx.createBiquadFilter();
    filtroCuerdas.type = 'lowpass';
    filtroCuerdas.frequency.value = 700;
    const tremolo = ctx.createGain();
    tremolo.gain.value = 0.7;
    const temblor = ctx.createOscillator(); // (un oscilador lento que mueve el volumen)
    temblor.frequency.value = 7;
    const cuantoTiembla = ctx.createGain();
    cuantoTiembla.gain.value = 0.3;
    temblor.connect(cuantoTiembla).connect(tremolo.gain);
    temblor.start();
    for (const n of [-12, -11, -5]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = nota(n);
      osc.connect(filtroCuerdas);
      osc.start();
    }
    filtroCuerdas.connect(tremolo).connect(cuerdas).connect(this.salida);
    this.capas = { zumbido, cuerdas, filtroCuerdas };
  }
}
