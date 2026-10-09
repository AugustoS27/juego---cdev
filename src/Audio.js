// Sonidos del juego generados con la Web Audio API (no hace falta ningún archivo de audio).
//
// Todo se arma con dos "ladrillos":
//   - tono():  un oscilador (una onda) que puede cambiar de frecuencia -> pitidos, melodías
//   - ruido(): ruido blanco pasado por un filtro -> pasos, golpes, chirridos
// y cada efecto (paso, puerta, alerta...) es una combinación de esos ladrillos.
//
// Los navegadores no dejan sonar nada hasta que el usuario hace click,
// por eso el audio arranca recién con iniciar() (al tocar "¡A jugar!").
//
// Etapa 16D: los sonidos pueden sonar EN UN LUGAR del mundo (ver Sonido.js): de qué lado viene,
// tapados por las paredes y con el eco del lugar. Para eso:
//   - desde(posicion, 'puerta')   hace sonar el efecto "puerta" en ese punto
//   - enElMundo('vidrio')         lo hace sonar con eco pero sin ubicación (cosas que hace Tomi)
//   - el resto (música, avisos, walkie) suena directo, sin eco
// Y los pasos suenan distinto según el piso: madera, cerámica, pasto... (ver pisada()).
//
// Dos estilos (el usuario quiso comparar): 'grabado' usa sonidos grabados de Kenney (CC0, ver
// SonidosGrabados.js) para los pasos, las puertas, los crujidos y los golpes; 'codigo' los hace todos con
// código. Los demás efectos (los de dibujito: avisos, juguetes, habilidades) son siempre con código.
import { Espacio } from './Sonido.js';
import { SonidosGrabados } from './SonidosGrabados.js';

// Qué sonido grabado usa cada superficie, qué tan agudo (la cerámica: el mismo cemento pero más agudo) y a
// qué volumen. Los volúmenes de los grabados están medidos para que suenen parejo con los de código
// (apenas más presentes): ver "Pruebas" de la 16D en PLAN_TERROR.md.
const PASOS_GRABADOS = {
  madera: ['madera', 1, 0.1],
  escalon: ['tablon', 0.9, 0.2],
  alfombra: ['alfombra', 1, 0.03],
  ceramica: ['cemento', 1.25, 0.08],
  baldosas: ['cemento', 1.05, 0.06],
  piedra: ['cemento', 0.85, 0.06],
  pasto: ['pasto', 1, 0.09],
  chapa: ['chapa', 1.1, 0.2],
};

// Melodías de fondo: listas de frecuencias (Hz). 0 = silencio.
const MUSICA_SIGILO = [110, 0, 131, 0, 147, 131, 110, 0, 98, 0, 110, 0, 131, 147, 165, 0];
const MUSICA_PERSECUCION = [196, 277, 196, 277, 185, 262, 185, 262];

export class Audio {
  constructor() {
    this.ctx = null; // AudioContext (se crea en iniciar)
    this.silenciado = false;
    this.notaMusica = 0;
    this.tiempoProximaNota = 0;
    this.destino = null; // a dónde van los ladrillos si no se dice otra cosa (lo usa desde())
    this.estilo = 'grabado'; // 'grabado' o 'codigo' (ver arriba)
  }

  iniciar() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();

    // Volumen general: todo pasa por acá (así M silencia todo de una)
    this.salida = this.ctx.createGain();
    this.salida.gain.value = 0.6;
    this.salida.connect(this.ctx.destination);

    // Un segundo de ruido blanco (valores al azar), que reutilizamos para todos los ruidos
    const muestras = this.ctx.sampleRate;
    this.bufferRuido = this.ctx.createBuffer(1, muestras, muestras);
    const datos = this.bufferRuido.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = Math.random() * 2 - 1;

    // El espacio: sonidos ubicados, paredes que tapan y eco (ver Sonido.js)
    this.espacio = new Espacio(this.ctx, this.salida);
    this.mundo = this.espacio.mundo;
    this.grabados = new SonidosGrabados(this.ctx); // (cargan de a poco: mientras tanto, los de código)
    this.alIniciar?.(); // (Game conecta acá lo que necesita el espacio)
  }

  // Toca un sonido grabado si el estilo es 'grabado' y ya cargó. Devuelve false si no (y el efecto usa el
  // de código). opciones: { volumen, velocidad, retraso }
  grabado(nombre, opciones) {
    if (this.estilo !== 'grabado' || !this.grabados?.tiene(nombre)) return false;
    return this.grabados.tocar(nombre, this.destino ?? this.salida, opciones);
  }

  // Hace sonar un efecto en un punto del mundo: desde(posicion, 'puerta') o desde(posicion, 'ladrido', 0.8)
  desde(posicion, efecto, ...args) {
    if (!this.ctx || !this.espacio.seEscucha(posicion)) return; // (muy lejos: no se escucha)
    this.destino = this.espacio.en(posicion);
    try {
      this[efecto](...args);
    } finally {
      this.destino = null;
    }
  }

  // Un efecto con el eco del lugar, pero sin ubicación (lo que hace Tomi: suena "acá")
  enElMundo(efecto, ...args) {
    if (!this.ctx) return;
    this.destino = this.mundo;
    try {
      this[efecto]?.(...args);
    } finally {
      this.destino = null;
    }
  }

  alternarSilencio() {
    this.silenciado = !this.silenciado;
    if (this.salida) this.salida.gain.value = this.silenciado ? 0 : 0.6;
    return this.silenciado;
  }

  // ------------------------------------------------------------
  //  LADRILLOS
  // ------------------------------------------------------------
  // Un tono con "envolvente": sube rápido y se apaga de a poco (suena como un golpe de nota)
  // (destino: a dónde se conecta; si no se dice, al de desde()/enElMundo() o directo a los parlantes)
  tono({ frecuencia, frecuenciaFinal = frecuencia, duracion, tipo = 'sine', volumen = 0.3, retraso = 0, destino = null }) {
    if (!this.ctx || volumen <= 0) return;
    const inicio = this.ctx.currentTime + retraso;
    const osc = this.ctx.createOscillator();
    const vol = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecuencia, inicio);
    osc.frequency.exponentialRampToValueAtTime(frecuenciaFinal, inicio + duracion);
    vol.gain.setValueAtTime(0.0001, inicio);
    vol.gain.exponentialRampToValueAtTime(volumen, inicio + 0.01);
    vol.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    osc.connect(vol).connect(destino ?? this.destino ?? this.salida);
    osc.start(inicio);
    osc.stop(inicio + duracion + 0.05);
  }

  // Ruido blanco filtrado: con filtro bajo suena "sordo" (pasos), alto suena "áspero" (golpes).
  // tipoFiltro 'bandpass' deja pasar solo una franja alrededor de "filtro" (más angosta cuanto más alto q)
  ruido({ duracion, volumen = 0.3, filtro = 1000, retraso = 0, tipoFiltro = 'lowpass', q = 1, destino = null }) {
    if (!this.ctx || volumen <= 0) return;
    const inicio = this.ctx.currentTime + retraso;
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = this.bufferRuido;
    const pasaBajos = this.ctx.createBiquadFilter();
    pasaBajos.type = tipoFiltro;
    pasaBajos.frequency.value = filtro;
    if (tipoFiltro !== 'lowpass') pasaBajos.Q.value = q;
    const vol = this.ctx.createGain();
    vol.gain.setValueAtTime(volumen, inicio);
    vol.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    fuente.connect(pasaBajos).connect(vol).connect(destino ?? this.destino ?? this.salida);
    fuente.start(inicio, Math.random() * 0.5); // arranca en un punto al azar del buffer
    fuente.stop(inicio + duracion + 0.05);
  }

  // ------------------------------------------------------------
  //  EFECTOS
  // ------------------------------------------------------------
  // ------------------------------------------------------------
  //  PASOS SEGÚN EL PISO (etapa 16D)
  // ------------------------------------------------------------
  // Un paso sobre una superficie (ver Superficies en Sonido.js). Dos capas: el golpe y el roce, cada paso
  // un poquito distinto del anterior. fuerza: 0.35 agachado, 1 caminando, 2.2 corriendo.
  // peso: 1 = Tomi; más alto = más grave (Don Ernesto)
  pisada(superficie, fuerza = 1, peso = 1) {
    // Grabado: el paso de esa superficie (más grave cuanto más pesado)
    const [grabado, agudo, volumen] = PASOS_GRABADOS[superficie] ?? PASOS_GRABADOS.madera;
    if (this.grabado(grabado, { volumen: fuerza * volumen, velocidad: agudo / Math.sqrt(peso) })) {
      if (superficie === 'madera' && Math.random() < 0.07) this.crujido(0.5 * Math.min(fuerza, 1.5));
      return;
    }
    const v = (base) => base * fuerza * (0.85 + Math.random() * 0.3);
    const f = (base) => (base / peso) * (0.9 + Math.random() * 0.2);
    const bp = { tipoFiltro: 'bandpass' };
    switch (superficie) {
      case 'chapa': // conductos y el techo del garaje: "¡bonc!" metálico
        this.tono({ frecuencia: f(420), frecuenciaFinal: f(300), duracion: 0.12, tipo: 'square', volumen: v(0.05) });
        this.ruido({ duracion: 0.06, volumen: v(0.08), filtro: 3000 });
        break;
      case 'ceramica': // golpe seco y agudo, con un "tic"
        this.ruido({ duracion: 0.035, volumen: v(0.16), filtro: f(2600), q: 1.5, ...bp });
        this.tono({ frecuencia: f(1900), duracion: 0.02, tipo: 'triangle', volumen: v(0.015) });
        this.ruido({ duracion: 0.03, volumen: v(0.03), filtro: 5000, q: 1, retraso: 0.025, ...bp });
        break;
      case 'baldosas':
        this.ruido({ duracion: 0.05, volumen: v(0.13), filtro: f(1500), q: 1.2, ...bp });
        this.ruido({ duracion: 0.04, volumen: v(0.04), filtro: 3500, q: 1, retraso: 0.03, ...bp });
        break;
      case 'alfombra': // casi nada: un "fff" sordo
        this.ruido({ duracion: 0.08, volumen: v(0.05), filtro: f(300) });
        break;
      case 'pasto': // roce de hojitas
        this.ruido({ duracion: 0.12, volumen: v(0.07), filtro: f(3000), q: 0.7, ...bp });
        this.ruido({ duracion: 0.08, volumen: v(0.045), filtro: f(1500), q: 0.8, retraso: 0.04, ...bp });
        break;
      case 'piedra': // "cronch" de piedritas
        this.ruido({ duracion: 0.05, volumen: v(0.1), filtro: f(2200), q: 1.2, ...bp });
        this.ruido({ duracion: 0.04, volumen: v(0.07), filtro: f(3300), q: 1.5, retraso: 0.03, ...bp });
        break;
      case 'escalon': // madera hueca: más grave y con más cuerpo
        this.ruido({ duracion: 0.08, volumen: v(0.14), filtro: f(350) });
        this.tono({ frecuencia: f(110), frecuenciaFinal: f(70), duracion: 0.1, volumen: v(0.1) });
        break;
      default: // madera: golpe sordo, un "toc" y, a veces, una tabla que cruje
        this.ruido({ duracion: 0.06, volumen: v(0.12), filtro: f(450) });
        this.tono({ frecuencia: f(140), frecuenciaFinal: f(90), duracion: 0.07, volumen: v(0.06) });
        this.ruido({ duracion: 0.05, volumen: v(0.025), filtro: 1800, q: 1, retraso: 0.03, ...bp });
        if (Math.random() < 0.07) this.crujido(0.5 * Math.min(fuerza, 1.5));
    }
  }

  // tipo: 'pasosAgachado', 'pasos', 'pasosCorriendo', 'conducto' o 'lana' (con las botas puestas).
  // superficie: ver pisada()
  paso(tipo, superficie = 'madera') {
    if (tipo === 'lana') {
      // Con las botas de lana: apenas un roce de tela
      this.ruido({ duracion: 0.08, volumen: 0.02, filtro: 250 });
      return;
    }
    if (tipo === 'conducto') superficie = 'chapa';
    const fuerza = { pasosAgachado: 0.35, pasos: 1, pasosCorriendo: 2.2 }[tipo] ?? 1;
    this.pisada(superficie, fuerza);
  }

  // Pasos de Don Ernesto: pesados y graves (usar con desde())
  pasoDueno(superficie = 'madera') {
    this.pisada(superficie, 2.6, 1.8);
  }

  // Doña Pocha arrastra las pantuflas: "shhh-shhh"
  pasoPocha(superficie = 'madera') {
    const v = superficie === 'alfombra' ? 0.04 : 0.09;
    this.ruido({ duracion: 0.2, volumen: v * (0.8 + Math.random() * 0.4), filtro: 900 + Math.random() * 300, q: 0.8, tipoFiltro: 'bandpass' });
  }

  // Los perros: las uñas en el piso duro ("tic-tic"); en el pasto, un trotecito suave
  pasoPerro(superficie = 'pasto') {
    if (superficie === 'pasto' || superficie === 'alfombra') {
      this.ruido({ duracion: 0.05, volumen: 0.04, filtro: 1800, q: 0.8, tipoFiltro: 'bandpass' });
      return;
    }
    for (const retraso of [0, 0.05]) this.ruido({ duracion: 0.015, volumen: 0.06, filtro: 4500, q: 2, retraso, tipoFiltro: 'bandpass' });
  }

  // Una tabla que cruje: "criiic" (un tono áspero que sube y tiembla)
  crujido(volumen = 1) {
    if (this.grabado('crujido', { volumen: 0.04 * volumen, velocidad: 0.85 + Math.random() * 0.3 })) return;
    const desde = 180 + Math.random() * 120;
    const duracion = 0.25 + Math.random() * 0.35;
    this.tono({ frecuencia: desde, frecuenciaFinal: desde * (1.2 + Math.random() * 0.4), duracion, tipo: 'sawtooth', volumen: 0.018 * volumen });
    this.tono({ frecuencia: desde * 1.5, frecuenciaFinal: desde * 1.9, duracion: duracion * 0.8, tipo: 'sawtooth', volumen: 0.01 * volumen, retraso: 0.02 });
  }

  // Saltar: un "¡hup!" cortito que sube
  salto() {
    this.tono({ frecuencia: 300, frecuenciaFinal: 520, duracion: 0.12, tipo: 'triangle', volumen: 0.12 });
  }

  // Aterrizar desde alto: golpe grave
  aterrizaje() {
    this.ruido({ duracion: 0.15, volumen: 0.4, filtro: 300 });
    this.tono({ frecuencia: 90, frecuenciaFinal: 50, duracion: 0.15, volumen: 0.3 });
  }

  // Chirrido de bisagra + golpecito
  puerta(volumen = 1) {
    if (this.grabado('puertaAbrir', { volumen: 0.065 * volumen })) return;
    this.tono({ frecuencia: 320, frecuenciaFinal: 560, duracion: 0.3, tipo: 'sawtooth', volumen: 0.05 * volumen });
    this.ruido({ duracion: 0.1, volumen: 0.3 * volumen, filtro: 400, retraso: 0.25 });
  }

  choque() {
    if (this.grabado('golpeMadera', { volumen: 0.53 })) return;
    this.tono({ frecuencia: 140, frecuenciaFinal: 40, duracion: 0.25, tipo: 'square', volumen: 0.2 });
    this.ruido({ duracion: 0.2, volumen: 0.45, filtro: 1500 });
  }

  // "¡!" cuando el dueño te ve
  alerta() {
    this.tono({ frecuencia: 880, duracion: 0.1, tipo: 'square', volumen: 0.15 });
    this.tono({ frecuencia: 1320, duracion: 0.2, tipo: 'square', volumen: 0.15, retraso: 0.1 });
  }

  // "¿?" cuando el dueño escucha algo
  duda() {
    this.tono({ frecuencia: 350, frecuenciaFinal: 650, duracion: 0.35, tipo: 'triangle', volumen: 0.25 });
  }

  // ¡Guau guau! Dos ladridos cortitos (un tono que baja + un soplido)
  ladrido(volumen = 1) {
    for (const retraso of [0, 0.2]) {
      this.tono({ frecuencia: 560, frecuenciaFinal: 260, duracion: 0.11, tipo: 'sawtooth', volumen: 0.18 * volumen, retraso });
      this.ruido({ duracion: 0.08, volumen: 0.2 * volumen, filtro: 1200, retraso });
    }
  }

  // "Clic-clac": la abuela amartilla la escopeta
  clic(volumen = 1) {
    this.tono({ frecuencia: 2200, duracion: 0.03, tipo: 'square', volumen: 0.12 * volumen });
    this.ruido({ duracion: 0.03, volumen: 0.25 * volumen, filtro: 5000 });
    this.tono({ frecuencia: 1500, duracion: 0.04, tipo: 'square', volumen: 0.12 * volumen, retraso: 0.12 });
    this.ruido({ duracion: 0.04, volumen: 0.25 * volumen, filtro: 4000, retraso: 0.12 });
  }

  // Lanzarredes: "¡FUAP!" de aire comprimido (ruido que se apaga rápido) y el "fffff" de la red volando
  fuap(volumen = 1) {
    this.ruido({ duracion: 0.12, volumen: 0.5 * volumen, filtro: 2500 });
    this.tono({ frecuencia: 160, frecuenciaFinal: 70, duracion: 0.15, volumen: 0.3 * volumen });
    this.ruido({ duracion: 0.5, volumen: 0.08 * volumen, filtro: 1200, retraso: 0.1 });
  }

  // Te enredó la red: "¡ay!" de Tomi y el roce de las sogas
  enredado() {
    this.tono({ frecuencia: 950, frecuenciaFinal: 620, duracion: 0.25, tipo: 'triangle', volumen: 0.18 });
    this.ruido({ duracion: 0.4, volumen: 0.15, filtro: 1800, retraso: 0.05 });
  }

  // "¡ERNESTOOO!" de Doña Pocha: una nota aguda temblorosa que baja (de lejos se oye más suave)
  gritoPocha(volumen = 1) {
    this.tono({ frecuencia: 700, frecuenciaFinal: 520, duracion: 0.7, tipo: 'sawtooth', volumen: 0.06 * volumen, retraso: 0.3 });
    this.tono({ frecuencia: 720, frecuenciaFinal: 540, duracion: 0.7, tipo: 'triangle', volumen: 0.08 * volumen, retraso: 0.3 });
  }


  // Recargar el lanzarredes: abrir la tapa, meter otra red y cerrarla (tres "clacs" en 2.5 s)
  recarga(volumen = 1) {
    for (const retraso of [0.3, 1.3, 2.1]) {
      this.ruido({ duracion: 0.05, volumen: 0.3 * volumen, filtro: 3000, retraso });
      this.tono({ frecuencia: 900, duracion: 0.04, tipo: 'square', volumen: 0.08 * volumen, retraso });
    }
  }

  // Click-clack de cerradura
  traba(volumen = 1) {
    if (this.grabado('traba', { volumen: 0.43 * volumen })) return;
    this.ruido({ duracion: 0.04, volumen: 0.5 * volumen, filtro: 4000 });
    this.ruido({ duracion: 0.05, volumen: 0.5 * volumen, filtro: 3000, retraso: 0.12 });
  }

  // --- Entradas ---
  // Vidrio roto: un golpe áspero + tintineos agudos al azar
  vidrio() {
    if (this.grabado('vidrio', { volumen: 1 })) return;
    this.ruido({ duracion: 0.4, volumen: 0.6, filtro: 6000 });
    for (let i = 0; i < 6; i++) {
      this.tono({ frecuencia: 2500 + Math.random() * 2500, duracion: 0.15, tipo: 'triangle', volumen: 0.08, retraso: 0.05 + i * 0.06 });
    }
  }

  // Trepar / subir: roce de ropa
  trepar() {
    if (this.grabado('ropa', { volumen: 0.09 }) && this.grabado('ropa', { volumen: 0.09, retraso: 0.4 })) return;
    this.ruido({ duracion: 0.3, volumen: 0.15, filtro: 700 });
    this.ruido({ duracion: 0.3, volumen: 0.15, filtro: 700, retraso: 0.4 });
  }

  // Escalera de metal golpeando la pared: "¡clanc!"
  escalera() {
    this.tono({ frecuencia: 620, frecuenciaFinal: 580, duracion: 0.35, tipo: 'square', volumen: 0.08 });
    this.tono({ frecuencia: 470, duracion: 0.4, tipo: 'square', volumen: 0.06, retraso: 0.05 });
  }

  // Un tirón al portón: golpe metálico grave
  forcejeo() {
    this.tono({ frecuencia: 160, frecuenciaFinal: 110, duracion: 0.25, tipo: 'sawtooth', volumen: 0.12 });
    this.ruido({ duracion: 0.15, volumen: 0.3, filtro: 2000 });
  }

  // El portón se abre: chirrido largo
  porton() {
    this.tono({ frecuencia: 180, frecuenciaFinal: 320, duracion: 1, tipo: 'sawtooth', volumen: 0.07 });
  }

  // Llave encontrada: tintineo alegre
  llave() {
    [1568, 2093, 2637].forEach((f, i) => this.tono({ frecuencia: f, duracion: 0.2, tipo: 'triangle', volumen: 0.15, retraso: i * 0.08 }));
  }

  // Mover una maceta: raspón de cerámica
  maceta() {
    this.ruido({ duracion: 0.25, volumen: 0.2, filtro: 1200 });
  }

  // Una gota que cae en un charco: "plic" agudo que baja
  gota(volumen = 1) {
    this.tono({ frecuencia: 1800, frecuenciaFinal: 700, duracion: 0.08, tipo: 'sine', volumen: 0.12 * volumen });
  }

  // --- Zonas especiales ---
  // Rejilla de un conducto (o la tabla del túnel): chirrido cortito de metal
  rejilla() {
    this.tono({ frecuencia: 900, frecuenciaFinal: 1300, duracion: 0.12, tipo: 'sawtooth', volumen: 0.04 });
    this.ruido({ duracion: 0.08, volumen: 0.15, filtro: 2500, retraso: 0.1 });
  }

  // El estante secreto gira: rechinar grave y largo, de película de misterio
  estante() {
    this.tono({ frecuencia: 90, frecuenciaFinal: 140, duracion: 1, tipo: 'sawtooth', volumen: 0.1 });
    this.ruido({ duracion: 0.9, volumen: 0.12, filtro: 500 });
  }

  // La escalera del ático se despliega: crujido de madera y un golpe al final
  trampilla() {
    this.tono({ frecuencia: 250, frecuenciaFinal: 180, duracion: 0.6, tipo: 'sawtooth', volumen: 0.07 });
    this.ruido({ duracion: 0.2, volumen: 0.35, filtro: 500, retraso: 0.55 });
  }

  // --- Entradas nuevas (etapa 14B) ---
  // Caer por la chimenea: rumor que baja, ¡PUF! y una tosecita
  chimenea() {
    this.ruido({ duracion: 0.6, volumen: 0.2, filtro: 400 });
    this.ruido({ duracion: 0.35, volumen: 0.5, filtro: 300, retraso: 0.1 });
    this.tono({ frecuencia: 90, frecuenciaFinal: 45, duracion: 0.3, volumen: 0.35, retraso: 0.1 });
    for (const retraso of [0.6, 0.85]) this.ruido({ duracion: 0.12, volumen: 0.18, filtro: 1500, retraso }); // la tos
  }

  // Ventanita del sótano: chirrido cortito y bajito
  ventanita() {
    this.tono({ frecuencia: 600, frecuenciaFinal: 820, duracion: 0.2, tipo: 'sawtooth', volumen: 0.03 });
  }

  // Gatera: "clac, clac" de la tapita cuando pasás por el medio
  gatera() {
    this.ruido({ duracion: 0.05, volumen: 0.15, filtro: 2500, retraso: 1.5 });
    this.ruido({ duracion: 0.05, volumen: 0.1, filtro: 2500, retraso: 1.75 });
  }

  // Enredadera: crujido de hojas
  hojas() {
    for (let i = 0; i < 4; i++) this.ruido({ duracion: 0.15, volumen: 0.12, filtro: 4000, retraso: i * 0.18 });
  }

  // --- Escondites nuevos (etapa 14C) ---
  // Debajo de la mesa: te arrastrás por el piso
  arrastrarse() {
    this.ruido({ duracion: 0.35, volumen: 0.1, filtro: 700 });
  }

  // Cortina de la bañera: los ganchitos corriendo por el barral
  cortina() {
    for (let i = 0; i < 5; i++) this.tono({ frecuencia: 2400 + i * 150, duracion: 0.03, tipo: 'triangle', volumen: 0.04, retraso: i * 0.04 });
  }

  // Caja de cartón: "crunch" y las solapas
  carton() {
    this.ruido({ duracion: 0.2, volumen: 0.15, filtro: 1200 });
    this.ruido({ duracion: 0.08, volumen: 0.12, filtro: 900, retraso: 0.25 });
  }

  // Tacho de basura: la tapa de plástico golpea y suena la bolsa
  tacho() {
    this.tono({ frecuencia: 180, frecuenciaFinal: 120, duracion: 0.12, tipo: 'square', volumen: 0.08 });
    this.ruido({ duracion: 0.3, volumen: 0.1, filtro: 3000, retraso: 0.1 });
  }

  // Tragaluz: rechina al abrirse
  tragaluz() {
    this.tono({ frecuencia: 380, frecuenciaFinal: 520, duracion: 0.35, tipo: 'sawtooth', volumen: 0.05 });
  }

  // --- Juguetes ---
  // Guardar un juguete en la mochila: "¡bling!" de dos notas + roce de la mochila
  guardar() {
    this.ruido({ duracion: 0.15, volumen: 0.12, filtro: 900 });
    this.tono({ frecuencia: 988, duracion: 0.1, tipo: 'square', volumen: 0.08, retraso: 0.05 });
    this.tono({ frecuencia: 1319, duracion: 0.25, tipo: 'square', volumen: 0.08, retraso: 0.13 });
  }

  // --- Habilidades ---
  // Al agarrar una: su sonido propio y después un "power-up" de tres notas que suben
  habilidad(tipo) {
    if (tipo === 'zanahoria') {
      // ¡Crunch, crunch, crunch!
      for (let i = 0; i < 3; i++) this.ruido({ duracion: 0.07, volumen: 0.25, filtro: 3500, retraso: i * 0.13 });
    } else if (tipo === 'botas') {
      // Fffff: lana suavecita
      this.ruido({ duracion: 0.35, volumen: 0.15, filtro: 350 });
    } else if (tipo === 'bebida') {
      // Pssst (la lata) y glup, glup, glup
      this.ruido({ duracion: 0.2, volumen: 0.2, filtro: 6000 });
      for (let i = 0; i < 3; i++) {
        this.tono({ frecuencia: 260, frecuenciaFinal: 140, duracion: 0.09, tipo: 'sine', volumen: 0.25, retraso: 0.25 + i * 0.14 });
      }
    }
    [523, 784, 1047].forEach((f, i) => {
      this.tono({ frecuencia: f, duracion: 0.12, tipo: 'triangle', volumen: 0.15, retraso: 0.5 + i * 0.08 });
    });
  }

  // Se terminó una habilidad: dos notas que bajan ("uh-oh")
  finHabilidad() {
    this.tono({ frecuencia: 784, duracion: 0.12, tipo: 'triangle', volumen: 0.15 });
    this.tono({ frecuencia: 523, duracion: 0.25, tipo: 'triangle', volumen: 0.15, retraso: 0.13 });
  }

  // ¡Tenés los tres! Fanfarria cortita que sube
  todoListo() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
      this.tono({ frecuencia: f, duracion: i === 5 ? 0.5 : 0.12, tipo: 'triangle', volumen: 0.22, retraso: i * 0.1 });
    });
  }

  // --- Walkie-talkie (etapa 15B) ---
  // "Kshhh" de radio + el pitido del botón
  walkie(volumen = 1) {
    this.ruido({ duracion: 0.18, volumen: 0.12 * volumen, filtro: 5000 });
    this.tono({ frecuencia: 1400, duracion: 0.06, tipo: 'square', volumen: 0.04 * volumen, retraso: 0.12 });
  }

  // La "vocecita" de Facu mientras aparece el texto: pitiditos cortos con altura al azar
  vozFacu() {
    this.tono({ frecuencia: 520 + Math.random() * 260, duracion: 0.04, tipo: 'square', volumen: 0.025 });
  }

  // ------------------------------------------------------------
  //  CINEMÁTICAS (ver Escenas.js)
  // ------------------------------------------------------------
  // La "vocecita" de cada personaje mientras aparece su subtítulo (como la de Facu en el walkie):
  // Tomi agudito, Don Ernesto grave y gruñón, Doña Pocha temblorosa
  voz(quien) {
    if (quien === 'Facu') return this.vozFacu();
    const voces = {
      Tomi: { desde: 700, rango: 300, tipo: 'square', volumen: 0.022 },
      'Don Ernesto': { desde: 95, rango: 60, tipo: 'sawtooth', volumen: 0.05 },
      'Doña Pocha': { desde: 400, rango: 140, tipo: 'triangle', volumen: 0.07 },
    };
    const voz = voces[quien];
    if (!voz) return;
    const frecuencia = voz.desde + Math.random() * voz.rango;
    this.tono({ frecuencia, frecuenciaFinal: frecuencia * 0.92, duracion: 0.06, tipo: voz.tipo, volumen: voz.volumen });
  }

  // Don Ernesto rezongando ("¡¿Otra vez la luz?!"): unas sílabas graves, cada vez más agudas (etapa 16C)
  rezongo(volumen = 1) {
    for (let i = 0; i < 6; i++) {
      const frecuencia = 90 + i * 12 + Math.random() * 40;
      this.tono({ frecuencia, frecuenciaFinal: frecuencia * 0.9, duracion: 0.09, tipo: 'sawtooth', volumen: 0.06 * volumen, retraso: i * 0.11 });
    }
  }

  // Patada a la pelota: un "pum" corto y seco
  patada() {
    this.ruido({ duracion: 0.08, volumen: 0.35, filtro: 900 });
    this.tono({ frecuencia: 140, frecuenciaFinal: 60, duracion: 0.12, volumen: 0.3 });
  }

  // La pelota pica en el pasto
  pique(volumen = 1) {
    this.tono({ frecuencia: 190, frecuenciaFinal: 90, duracion: 0.1, volumen: 0.25 * volumen });
  }

  // Gruñido de perro con la boca llena ("grrrr"): una nota grave que tiembla
  grunido() {
    for (let i = 0; i < 4; i++) {
      this.tono({ frecuencia: 85 + Math.random() * 15, duracion: 0.09, tipo: 'sawtooth', volumen: 0.06, retraso: i * 0.08 });
    }
  }

  // ¡RIIIP! La tela que se rompe: ruido áspero que sube
  riiip() {
    this.ruido({ duracion: 0.12, volumen: 0.25, filtro: 3000 });
    this.ruido({ duracion: 0.3, volumen: 0.2, filtro: 6000, retraso: 0.1 });
    this.tono({ frecuencia: 300, frecuenciaFinal: 900, duracion: 0.35, tipo: 'sawtooth', volumen: 0.03, retraso: 0.05 });
  }

  // ------------------------------------------------------------
  //  DÍA Y NOCHE (etapa 16A)
  // ------------------------------------------------------------
  // "Clic" de la linterna
  linterna() {
    this.tono({ frecuencia: 2400, frecuenciaFinal: 1800, duracion: 0.03, tipo: 'square', volumen: 0.05 });
    this.ruido({ duracion: 0.03, volumen: 0.1, filtro: 4000 });
  }

  // Trueno: un "crack" seco y después un retumbar largo y grave que se va apagando.
  // (Usa su propia fuente de ruido en bucle: el buffer de ruido dura 1 s y el trueno dura más)
  // volumen: 1 = cerca (fuerte); un trueno lejano suena más bajito y más sordo
  trueno(retraso = 0, volumen = 1) {
    if (!this.ctx) return;
    const inicio = this.ctx.currentTime + retraso;
    this.ruido({ duracion: 0.25, volumen: 0.35 * volumen * volumen, filtro: 2500 * volumen, retraso });
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = this.bufferRuido;
    fuente.loop = true;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(400, inicio);
    filtro.frequency.exponentialRampToValueAtTime(90, inicio + 3);
    const vol = this.ctx.createGain();
    vol.gain.setValueAtTime(0.0001, inicio);
    vol.gain.exponentialRampToValueAtTime(0.7 * volumen, inicio + 0.15);
    vol.gain.exponentialRampToValueAtTime(0.25 * volumen, inicio + 1.2);
    vol.gain.exponentialRampToValueAtTime(0.0001, inicio + 3.5);
    fuente.connect(filtro).connect(vol).connect(this.salida);
    fuente.start(inicio, Math.random() * 0.5);
    fuente.stop(inicio + 3.6);
  }

  // Tablero de luz (etapa 16C): "¡CLAC!" de la llave y el zumbido de la corriente que se va (al cortar)
  // o que vuelve (al subirla). volumen: de 0 a 1 (Don Ernesto la sube lejos: se escucha bajito)
  tablero(cortando, volumen = 1) {
    if (!this.grabado('click', { volumen: 0.48 * volumen, velocidad: 0.8 })) {
      this.ruido({ duracion: 0.08, volumen: 0.45 * volumen, filtro: 2200 });
      this.tono({ frecuencia: 900, frecuenciaFinal: 300, duracion: 0.05, tipo: 'square', volumen: 0.08 * volumen });
    }
    if (cortando) this.tono({ frecuencia: 120, frecuenciaFinal: 45, duracion: 0.9, tipo: 'sawtooth', volumen: 0.07 * volumen, retraso: 0.05 });
    else this.tono({ frecuencia: 50, frecuenciaFinal: 120, duracion: 0.7, tipo: 'sawtooth', volumen: 0.06 * volumen, retraso: 0.1 });
  }

  // Lluvia (etapa 16B): un "shhhh" que no para (ruido en bucle, filtrado). volumen: de 0 a 1.
  // adentro: la lluvia se escucha más sorda (a través de las paredes y el techo).
  // Se llama cada frame: los cambios se hacen de a poco.
  lluvia(volumen, adentro = false) {
    if (!this.ctx) return;
    if (!this.fuenteLluvia) {
      if (volumen <= 0) return;
      this.fuenteLluvia = this.ctx.createBufferSource();
      this.fuenteLluvia.buffer = this.bufferRuido;
      this.fuenteLluvia.loop = true;
      this.filtroLluvia = this.ctx.createBiquadFilter();
      this.filtroLluvia.type = 'lowpass';
      this.filtroLluvia.Q.value = 0.3;
      this.volumenLluvia = this.ctx.createGain();
      this.volumenLluvia.gain.value = 0;
      this.fuenteLluvia.connect(this.filtroLluvia).connect(this.volumenLluvia).connect(this.salida);
      this.fuenteLluvia.start();
    }
    const ahora = this.ctx.currentTime;
    this.volumenLluvia.gain.setTargetAtTime(volumen * (adentro ? 0.12 : 0.2), ahora, 0.4);
    this.filtroLluvia.frequency.setTargetAtTime(adentro ? 700 : 3200, ahora, 0.4);
  }

  // ------------------------------------------------------------
  //  AMBIENTE (etapa 16D, ver Ambiente.js). Casi todos se usan con desde(posicion, ...)
  // ------------------------------------------------------------
  // Cañerías del sótano: "glu-glu-glu" (burbujitas que suben)
  cañeria() {
    const n = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const f = 250 + Math.random() * 250;
      this.tono({ frecuencia: f, frecuenciaFinal: f * 1.6, duracion: 0.06, tipo: 'sine', volumen: 0.07, retraso: i * (0.07 + Math.random() * 0.08) });
    }
    this.ruido({ duracion: 0.6, volumen: 0.03, filtro: 400 });
  }

  // Una puerta que se golpea sola: "¡PAM!" grave
  portazo() {
    if (this.grabado('puertaCerrar', { volumen: 0.68, velocidad: 0.85 })) return;
    this.ruido({ duracion: 0.25, volumen: 0.55, filtro: 350 });
    this.tono({ frecuencia: 75, frecuenciaFinal: 45, duracion: 0.3, volumen: 0.4 });
    this.ruido({ duracion: 0.08, volumen: 0.15, filtro: 1500, retraso: 0.02 });
  }

  // Pájaros (de día): dos o tres "pío" agudos
  pajaro() {
    const f = 2600 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this.tono({ frecuencia: f, frecuenciaFinal: f * (1.15 + Math.random() * 0.3), duracion: 0.07, tipo: 'sine', volumen: 0.05, retraso: i * 0.11 });
    }
  }

  // Grillos (de noche): "cri-cri-cri" (pulsos agudos muy seguidos)
  grillo() {
    const f = 4200 + Math.random() * 600;
    for (let i = 0; i < 3; i++) this.tono({ frecuencia: f, duracion: 0.025, tipo: 'sine', volumen: 0.03, retraso: i * 0.045 });
  }

  // Tic-tac de reloj de pared
  tictac(tac) {
    this.ruido({ duracion: 0.02, volumen: 0.07, filtro: tac ? 2600 : 3400, q: 3, tipoFiltro: 'bandpass' });
  }

  // La tele de Doña Pocha: una "sílaba" de una voz que habla atrás de la pared
  palabraTele() {
    const f = 700 + Math.random() * 700;
    this.ruido({ duracion: 0.07 + Math.random() * 0.08, volumen: 0.05, filtro: f, q: 2.5, tipoFiltro: 'bandpass' });
    if (Math.random() < 0.4) this.tono({ frecuencia: 160 + Math.random() * 80, duracion: 0.08, tipo: 'triangle', volumen: 0.02 });
  }

  // Un sonido "lejos" (más allá del barrio): sin ubicación exacta, de un costado (pan: -1 izquierda,
  // 1 derecha), apagado y bajito. adentro: todavía más apagado (lo escuchás a través de las paredes)
  lejos(efecto, pan = 0, adentro = false) {
    if (!this.ctx) return;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = adentro ? 500 : 1100;
    const vol = this.ctx.createGain();
    vol.gain.value = adentro ? 0.15 : 0.3;
    panner.connect(filtro).connect(vol).connect(this.mundo);
    this.destino = panner;
    try {
      this[efecto]();
    } finally {
      this.destino = null;
    }
  }

  // Un auto que pasa por la calle (de noche): un rumor que crece, pasa de un lado al otro y se va
  autoQuePasa(adentro = false) {
    if (!this.ctx) return;
    const inicio = this.ctx.currentTime;
    const duracion = 4.5;
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = this.bufferRuido;
    fuente.loop = true;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(adentro ? 200 : 300, inicio);
    filtro.frequency.linearRampToValueAtTime(adentro ? 350 : 700, inicio + duracion / 2);
    filtro.frequency.linearRampToValueAtTime(adentro ? 200 : 300, inicio + duracion);
    const vol = this.ctx.createGain();
    vol.gain.setValueAtTime(0.0001, inicio);
    vol.gain.exponentialRampToValueAtTime(adentro ? 0.05 : 0.12, inicio + duracion / 2);
    vol.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    const panner = this.ctx.createStereoPanner();
    const lado = Math.random() < 0.5 ? -1 : 1;
    panner.pan.setValueAtTime(-lado, inicio);
    panner.pan.linearRampToValueAtTime(lado, inicio + duracion);
    fuente.connect(filtro).connect(vol).connect(panner).connect(this.mundo);
    fuente.start(inicio, Math.random() * 0.5);
    fuente.stop(inicio + duracion + 0.1);
  }

  // ------------------------------------------------------------
  //  TOMI (etapa 16D): el corazón y la respiración (suenan "adentro tuyo")
  // ------------------------------------------------------------
  // Un latido: "pum-pum" grave. fuerza: de 0 a 1 (más fuerte si el enemigo está más cerca)
  latido(fuerza = 0.5) {
    this.tono({ frecuencia: 58, frecuenciaFinal: 40, duracion: 0.13, volumen: 0.12 + 0.28 * fuerza });
    this.tono({ frecuencia: 52, frecuenciaFinal: 38, duracion: 0.12, volumen: 0.08 + 0.2 * fuerza, retraso: 0.17 });
  }

  // Una respiración agitada (inspirar y soltar el aire). cansancio: de 0.3 a 1
  respiracion(cansancio = 0.6) {
    this.ruido({ duracion: 0.3, volumen: 0.025 + 0.03 * cansancio, filtro: 1400, q: 0.9, tipoFiltro: 'bandpass' });
    this.ruido({ duracion: 0.4, volumen: 0.03 + 0.035 * cansancio, filtro: 850, q: 0.9, retraso: 0.38, tipoFiltro: 'bandpass' });
  }

  // "Fiuuu": el suspiro de alivio cuando el enemigo se aleja de tu escondite
  suspiro() {
    this.ruido({ duracion: 0.9, volumen: 0.06, filtro: 750, q: 0.8, tipoFiltro: 'bandpass' });
  }

  // Timbre de bici: "¡ring ring!" (dos campanadas agudas con su eco)
  timbre() {
    for (const retraso of [0, 0.22]) {
      this.tono({ frecuencia: 2093, duracion: 0.35, tipo: 'sine', volumen: 0.18, retraso });
      this.tono({ frecuencia: 2637, duracion: 0.3, tipo: 'sine', volumen: 0.08, retraso });
    }
  }

  // Gruñido de Don Ernesto cuando se enoja más
  enojo() {
    this.tono({ frecuencia: 110, frecuenciaFinal: 70, duracion: 0.6, tipo: 'sawtooth', volumen: 0.12 });
  }

  // Arpegio alegre (Do - Mi - Sol - Do)
  victoria() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tono({ frecuencia: f, duracion: i === 3 ? 0.8 : 0.2, tipo: 'triangle', volumen: 0.25, retraso: i * 0.13 });
    });
  }

  // "Wah wah wah waaaah" de trompeta triste
  derrota() {
    [392, 370, 349, 330].forEach((f, i) => {
      this.tono({ frecuencia: f, frecuenciaFinal: f * 0.97, duracion: i === 3 ? 1.2 : 0.4, tipo: 'sawtooth', volumen: 0.1, retraso: i * 0.45 });
    });
  }

  // ------------------------------------------------------------
  //  MÚSICA DE FONDO
  // ------------------------------------------------------------
  // Se llama en cada frame: cuando pasa el tiempo de una nota, toca la siguiente.
  // Tranquila y "de puntillas" normalmente; rápida y tensa si el dueño te persigue.
  actualizarMusica(dt, persiguiendo) {
    if (!this.ctx) return;
    this.tiempoProximaNota -= dt;
    if (this.tiempoProximaNota > 0) return;

    const melodia = persiguiendo ? MUSICA_PERSECUCION : MUSICA_SIGILO;
    const frecuencia = melodia[this.notaMusica % melodia.length];
    this.notaMusica++;
    this.tiempoProximaNota = persiguiendo ? 0.13 : 0.28;

    if (frecuencia === 0) return; // silencio
    this.tono({
      frecuencia,
      duracion: persiguiendo ? 0.12 : 0.22,
      tipo: persiguiendo ? 'square' : 'triangle',
      volumen: persiguiendo ? 0.05 : 0.1,
    });
  }
}
