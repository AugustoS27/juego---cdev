// Los ruidos de ambiente y "la piel de Tomi" (etapa 16D). Todo hecho con los ladrillos de Audio.js.
//
// La casa:   crujidos de madera al azar cerca tuyo, el tic-tac de los relojes de pared, el zumbido de la
//            heladera, la tele de Doña Pocha (murmullo de fondo), las cañerías del sótano y, cada tanto,
//            una puerta que se golpea sola en otro piso. (La heladera y la tele se callan sin luz.)
// Afuera:    el viento (más fuerte de noche y con tormenta), pájaros de día, grillos de noche, perros
//            lejos y algún auto que pasa por la calle.
// Tomi:      el corazón late más fuerte y más rápido cuanto más cerca está un enemigo (y se dispara si
//            te persiguen); la respiración se agita después de correr y se contiene cuando estás
//            escondido con alguien cerca (y cuando se va, un suspiro de alivio).
//
// Casi todo suena EN UN LUGAR (ver Sonido.js): de qué lado viene, tapado por las paredes y con eco.
import * as THREE from 'three';
import { CUADROS, UBICACION_MUEBLES, ALTURA_PISO } from './HouseData.js';
import { ponerPosicion } from './Sonido.js';

const alAzar = (desde, hasta) => desde + Math.random() * (hasta - desde);
const punto = (m, y) => new THREE.Vector3(m.x, m.piso * ALTURA_PISO + y, m.z);

// Lugares de la casa que hacen ruido (sacados de los datos de cada piso)
const RELOJES = CUADROS.filter((c) => c.dibujo === 'reloj').map((c) => punto(c, c.y ?? 1.6));
const HELADERAS = UBICACION_MUEBLES.filter((m) => m.tipo === 'heladera').map((m) => punto(m, 1));
const TELE_POCHA = UBICACION_MUEBLES.filter((m) => m.tipo === 'televisionVieja').map((m) => punto(m, 0.8))[0];
const CANERIAS = [new THREE.Vector3(-7.6, -1.2, -3.4), new THREE.Vector3(0.5, -0.6, -5.6), new THREE.Vector3(7, -0.6, -5.6)];

export class Ambiente {
  constructor(audio, house) {
    this.audio = audio;
    this.house = house;
    this.esperas = { crujido: 6, cañeria: 15, portazo: 80, pajaro: 3, grillo: 1, perroLejos: 30, auto: 40 };
    this.tic = 0; // reloj del tic-tac
    this.palabraTele = 0;
    this.latido = 0;
    this.cansancio = 0; // 0 a 1: sube corriendo, baja de a poco (la respiración agitada)
    this.respiro = 0;
    this.conteniendo = false;
    this.continuos = null; // los sonidos que no paran (viento, heladera): se arman la primera vez
  }

  // Cada frame. estado: { jugando, posicion, piso, adentro, turno, tormenta, corriente, cercania,
  //                       perseguido, corriendo, escondido }
  update(dt, estado) {
    const audio = this.audio;
    if (!audio.ctx) return;
    if (!this.continuos) this.crearContinuos();
    this.actualizarContinuos(dt, estado);
    if (!estado.jugando) return;

    // ¿Toca algo? (cada cosa tiene su espera al azar)
    const e = this.esperas;
    for (const clave in e) e[clave] -= dt;
    const { posicion, piso, adentro, turno } = estado;
    const noche = turno === 'noche';

    if (e.crujido <= 0) {
      e.crujido = alAzar(5, 14);
      if (adentro) audio.desde(this.cercaDe(posicion, 3, 8), 'crujido', alAzar(0.7, 1.4));
    }
    if (e.cañeria <= 0) {
      e.cañeria = alAzar(12, 30);
      if (piso <= 0) audio.desde(CANERIAS[Math.floor(Math.random() * CANERIAS.length)], 'cañeria');
    }
    if (e.portazo <= 0) {
      e.portazo = alAzar(70, 140);
      // Una puerta que se golpea sola... en otro piso (no se mueve: es solo el ruido, para asustar)
      const lejos = this.house.puertas.filter((p) => p.estilo === 'normal' && Math.abs(p.piso - piso) === 1);
      if (lejos.length > 0) audio.desde(lejos[Math.floor(Math.random() * lejos.length)].centro, 'portazo');
    }
    if (!noche && e.pajaro <= 0) {
      e.pajaro = alAzar(2, 6);
      audio.desde(this.afuera(posicion), 'pajaro');
    }
    if (noche && e.grillo <= 0) {
      e.grillo = alAzar(0.4, 1.4);
      if (!estado.tormenta) audio.desde(this.afuera(posicion), 'grillo');
    }
    if (noche && e.perroLejos <= 0) {
      e.perroLejos = alAzar(30, 70);
      audio.lejos('ladrido', alAzar(-1, 1), adentro);
    }
    if (noche && e.auto <= 0) {
      e.auto = alAzar(45, 90);
      audio.autoQuePasa(adentro);
    }

    // Tic-tac de los relojes (si hay alguno cerca, en tu piso)
    this.tic -= dt;
    if (this.tic <= 0) {
      this.tic = 1;
      this.tac = !this.tac;
      for (const reloj of RELOJES) {
        if (reloj.distanceTo(posicion) < 12 && Math.round((reloj.y - 1) / ALTURA_PISO) === piso) audio.desde(reloj, 'tictac', this.tac);
      }
    }

    // La tele de Doña Pocha: murmullo de voces (sin luz, se apaga)
    this.palabraTele -= dt;
    if (this.palabraTele <= 0 && TELE_POCHA) {
      this.palabraTele = alAzar(0.12, 0.3) + (Math.random() < 0.1 ? 0.6 : 0); // (cada tanto, una pausa)
      if (estado.corriente > 0.5 && TELE_POCHA.distanceTo(posicion) < 14) audio.desde(TELE_POCHA, 'palabraTele');
    }

    this.actualizarCorazon(dt, estado);
    this.actualizarRespiracion(dt, estado);
  }

  // ------------------------------------------------------------
  //  SONIDOS QUE NO PARAN: el viento y la heladera
  // ------------------------------------------------------------
  crearContinuos() {
    const ctx = this.audio.ctx;
    // Viento: ruido en bucle por un filtro que se mueve (ráfagas)
    const viento = ctx.createBufferSource();
    viento.buffer = this.audio.bufferRuido;
    viento.loop = true;
    const filtroViento = ctx.createBiquadFilter();
    filtroViento.type = 'bandpass';
    filtroViento.Q.value = 0.8;
    filtroViento.frequency.value = 500;
    const volumenViento = ctx.createGain();
    volumenViento.gain.value = 0;
    viento.connect(filtroViento).connect(volumenViento).connect(this.audio.salida);
    viento.start();
    // Heladera: un zumbido grave, en la cocina
    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.value = 55;
    const filtroMotor = ctx.createBiquadFilter();
    filtroMotor.type = 'lowpass';
    filtroMotor.frequency.value = 180;
    const volumenMotor = ctx.createGain();
    volumenMotor.gain.value = 0;
    motor.connect(filtroMotor).connect(volumenMotor);
    // (fijo en la heladera: el panner hace que se escuche solo cerca y de qué lado)
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';
    panner.refDistance = 1;
    panner.maxDistance = 9;
    if (HELADERAS[0]) ponerPosicion(panner, HELADERAS[0]);
    volumenMotor.connect(panner).connect(this.audio.mundo);
    motor.start();
    this.continuos = { filtroViento, volumenViento, volumenMotor, rafaga: 0 };
  }

  actualizarContinuos(dt, { adentro, turno, tormenta, corriente, piso }) {
    const c = this.continuos;
    const ahora = this.audio.ctx.currentTime;
    // Viento: de día suavecito, de noche más, con tormenta fuerte. Adentro, apagado (contra las ventanas)
    c.rafaga -= dt;
    if (c.rafaga <= 0) {
      c.rafaga = alAzar(2, 5);
      const base = tormenta ? 0.09 : turno === 'noche' ? 0.05 : 0.025;
      const fuerza = base * alAzar(0.5, 1.4) * (adentro ? (piso === -1 ? 0.2 : 0.45) : 1);
      c.volumenViento.gain.setTargetAtTime(fuerza, ahora, 1.2);
      c.filtroViento.frequency.setTargetAtTime(alAzar(300, 900) * (adentro ? 0.6 : 1), ahora, 1.5);
    }
    // La heladera anda si hay luz
    c.volumenMotor.gain.setTargetAtTime(corriente > 0.5 ? 0.05 : 0, ahora, 0.1);
  }

  // ------------------------------------------------------------
  //  EL CORAZÓN Y LA RESPIRACIÓN DE TOMI
  // ------------------------------------------------------------
  // Más fuerte y más rápido cuanto más cerca está un enemigo (de 70 a 150 latidos por minuto)
  actualizarCorazon(dt, { cercania, perseguido }) {
    const fuerza = Math.max(cercania, perseguido ? 1 : 0);
    this.latido -= dt;
    if (fuerza < 0.15 || this.latido > 0) return;
    this.latido = 60 / (70 + 80 * fuerza);
    this.audio.latido(fuerza);
  }

  // Corriendo te cansás: después respirás agitado. Escondido con alguien cerca, contenés la respiración.
  actualizarRespiracion(dt, { corriendo, escondido, cercania }) {
    this.cansancio = THREE.MathUtils.clamp(this.cansancio + (corriendo ? dt / 4 : -dt / 7), 0, 1);
    if (escondido && cercania > 0.45) {
      this.conteniendo = true;
      return;
    }
    if (this.conteniendo && cercania < 0.25) {
      this.conteniendo = false;
      this.audio.enElMundo('suspiro'); // ¡se fue!
      this.respiro = 1.5;
    }
    if (this.conteniendo) return;
    this.respiro -= dt;
    if (this.cansancio < 0.3 || this.respiro > 0) return;
    this.respiro = 1.1 - this.cansancio * 0.5;
    this.audio.enElMundo('respiracion', this.cansancio);
  }

  // ------------------------------------------------------------
  //  LUGARES AL AZAR
  // ------------------------------------------------------------
  // Un punto a entre "desde" y "hasta" metros de la posición, a la misma altura (para los crujidos)
  cercaDe(posicion, desde, hasta) {
    const angulo = Math.random() * Math.PI * 2;
    const distancia = alAzar(desde, hasta);
    return new THREE.Vector3(posicion.x + Math.cos(angulo) * distancia, posicion.y + alAzar(0, 2.5), posicion.z + Math.sin(angulo) * distancia);
  }

  // Un punto de afuera (en los árboles o el pasto) a 6-14 m del jugador (los pájaros y los grillos)
  afuera(posicion) {
    for (let i = 0; i < 8; i++) {
      const p = this.cercaDe(posicion, 6, 14);
      p.y = alAzar(0.2, 4);
      const enLaCasa = p.x > -16 && p.x < 9.5 && p.z > -6.5 && p.z < 6.5;
      if (!enLaCasa) return p;
    }
    return new THREE.Vector3(posicion.x, 1, posicion.z + 12);
  }
}
