// Sonidos del juego generados con la Web Audio API (no hace falta ningún archivo de audio).
//
// Todo se arma con dos "ladrillos":
//   - tono():  un oscilador (una onda) que puede cambiar de frecuencia -> pitidos, melodías
//   - ruido(): ruido blanco pasado por un filtro -> pasos, golpes, chirridos
// y cada efecto (paso, puerta, alerta...) es una combinación de esos ladrillos.
//
// Los navegadores no dejan sonar nada hasta que el usuario hace click,
// por eso el audio arranca recién con iniciar() (al tocar "¡A jugar!").

// Melodías de fondo: listas de frecuencias (Hz). 0 = silencio.
const MUSICA_SIGILO = [110, 0, 131, 0, 147, 131, 110, 0, 98, 0, 110, 0, 131, 147, 165, 0];
const MUSICA_PERSECUCION = [196, 277, 196, 277, 185, 262, 185, 262];

export class Audio {
  constructor() {
    this.ctx = null; // AudioContext (se crea en iniciar)
    this.silenciado = false;
    this.notaMusica = 0;
    this.tiempoProximaNota = 0;
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
  tono({ frecuencia, frecuenciaFinal = frecuencia, duracion, tipo = 'sine', volumen = 0.3, retraso = 0 }) {
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
    osc.connect(vol).connect(this.salida);
    osc.start(inicio);
    osc.stop(inicio + duracion + 0.05);
  }

  // Ruido blanco filtrado: con filtro bajo suena "sordo" (pasos), alto suena "áspero" (golpes)
  ruido({ duracion, volumen = 0.3, filtro = 1000, retraso = 0 }) {
    if (!this.ctx || volumen <= 0) return;
    const inicio = this.ctx.currentTime + retraso;
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = this.bufferRuido;
    const pasaBajos = this.ctx.createBiquadFilter();
    pasaBajos.type = 'lowpass';
    pasaBajos.frequency.value = filtro;
    const vol = this.ctx.createGain();
    vol.gain.setValueAtTime(volumen, inicio);
    vol.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    fuente.connect(pasaBajos).connect(vol).connect(this.salida);
    fuente.start(inicio, Math.random() * 0.5); // arranca en un punto al azar del buffer
    fuente.stop(inicio + duracion + 0.05);
  }

  // ------------------------------------------------------------
  //  EFECTOS
  // ------------------------------------------------------------
  // tipo: 'pasosAgachado' (muy suave), 'pasos', 'pasosCorriendo' (fuerte) o 'conducto' (chapa)
  paso(tipo) {
    if (tipo === 'conducto') {
      // Adentro de un conducto: "¡bonc!" metálico
      this.tono({ frecuencia: 420 + Math.random() * 80, frecuenciaFinal: 300, duracion: 0.12, tipo: 'square', volumen: 0.06 });
      this.ruido({ duracion: 0.06, volumen: 0.1, filtro: 3000 });
      return;
    }
    if (tipo === 'lana') {
      // Con las botas de lana: apenas un roce de tela
      this.ruido({ duracion: 0.08, volumen: 0.02, filtro: 250 });
      return;
    }
    const volumen = { pasosAgachado: 0.04, pasos: 0.12, pasosCorriendo: 0.35 }[tipo] ?? 0.12;
    this.ruido({ duracion: 0.07, volumen, filtro: tipo === 'pasosCorriendo' ? 900 : 500 });
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

  // Pasos del dueño: más graves. "volumen" va de 0 (lejos) a 1 (al lado)
  pasoDueno(volumen) {
    this.ruido({ duracion: 0.12, volumen: 0.6 * volumen, filtro: 250 });
    this.tono({ frecuencia: 80, frecuenciaFinal: 50, duracion: 0.1, volumen: 0.35 * volumen });
  }

  // Chirrido de bisagra + golpecito
  puerta(volumen = 1) {
    this.tono({ frecuencia: 320, frecuenciaFinal: 560, duracion: 0.3, tipo: 'sawtooth', volumen: 0.05 * volumen });
    this.ruido({ duracion: 0.1, volumen: 0.3 * volumen, filtro: 400, retraso: 0.25 });
  }

  choque() {
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
    this.ruido({ duracion: 0.04, volumen: 0.5 * volumen, filtro: 4000 });
    this.ruido({ duracion: 0.05, volumen: 0.5 * volumen, filtro: 3000, retraso: 0.12 });
  }

  // --- Entradas ---
  // Vidrio roto: un golpe áspero + tintineos agudos al azar
  vidrio() {
    this.ruido({ duracion: 0.4, volumen: 0.6, filtro: 6000 });
    for (let i = 0; i < 6; i++) {
      this.tono({ frecuencia: 2500 + Math.random() * 2500, duracion: 0.15, tipo: 'triangle', volumen: 0.08, retraso: 0.05 + i * 0.06 });
    }
  }

  // Trepar / subir: roce de ropa
  trepar() {
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
