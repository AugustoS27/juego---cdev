// El jugador: cámara en primera persona, movimiento con WASD y colisiones simples.
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// Valores del jugador (fáciles de ajustar)
const VELOCIDAD_CAMINAR = 3.5; // metros por segundo
const VELOCIDAD_CORRER = 6.5;
const ALTURA_OJOS = 1.6; // la cámara está a esta altura sobre los pies
const RADIO = 0.3; // "ancho" del jugador (mitad del lado de su caja)
const ALTURA_CUERPO = 1.7;
const ESCALON = 0.35; // lo máximo que puede "subir" de golpe sin chocar (sirve para rampas)
const GRAVEDAD = 20;
const INTERVALO_PASOS_CORRIENDO = 0.45; // cada cuántos segundos hace ruido al correr
const ESPERA_ENTRE_CHOQUES = 1; // para no generar un ruido por frame contra una pared
const ALTURA_OJOS_ESCONDIDO = { placard: 1.5, cama: 0.2 }; // debajo de la cama se ve desde el piso

export class Player {
  constructor(camera, domElement, house) {
    this.camera = camera;
    this.house = house;

    // Posición de los PIES del jugador (la cámara se ubica arriba)
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocidadY = 0; // solo se usa para caer

    // Estado que otras partes del juego van a leer (ej: el sistema de ruido)
    this.estaMoviendose = false;
    this.estaCorriendo = false;

    this.animacion = null; // movimiento automático (trepar, subir la escalera) o null

    // Escondite
    this.escondido = false;
    this.escondite = null; // el mueble donde está escondido
    this.posicionAntesDeEsconderse = new THREE.Vector3();
    this.rotacionAntesDeEsconderse = new THREE.Quaternion();

    // Ruido: Game conecta esta función con el sistema de ruido.
    // Se llama como alHacerRuido(tipo), con tipo = 'pasosCorriendo' o 'choque'.
    this.alHacerRuido = null;
    this.tiempoPasos = 0;
    this.tiempoDesdeChoque = ESPERA_ENTRE_CHOQUES;

    // Sonido de pasos: Game conecta esta función con el audio. Se llama como alDarPaso(corriendo).
    this.alDarPaso = null;
    this.tiempoSonidoPaso = 0;

    // PointerLockControls: esconde el mouse y rota la cámara al moverlo
    this.controls = new PointerLockControls(camera, domElement);

    // Teclas apretadas en este momento
    this.teclas = {};
    window.addEventListener('keydown', (e) => (this.teclas[e.code] = true));
    window.addEventListener('keyup', (e) => (this.teclas[e.code] = false));

    // Objetos reutilizables (así no creamos objetos nuevos en cada frame)
    this.caja = new THREE.Box3();
    this.adelante = new THREE.Vector3();
    this.derecha = new THREE.Vector3();
    this.movimiento = new THREE.Vector3();
  }

  // Ubica al jugador en un punto (x, y, z = pies)
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.velocidadY = 0;
    this.animacion = null;
    this.actualizarCamara();
  }

  // Mueve al jugador solo, de a poco, hasta "destino" (para trepar una ventana o subir la escalera).
  // arco: cuánto sube en el medio del recorrido (como pasar por encima del alféizar).
  moverAnimado({ destino, duracion, arco = 0 }) {
    this.animacion = { desde: this.position.clone(), hasta: destino.clone(), t: 0, duracion, arco };
    this.estaMoviendose = false;
    this.estaCorriendo = false;
  }

  avanzarAnimacion(dt) {
    const a = this.animacion;
    a.t = Math.min(a.t + dt / a.duracion, 1);
    this.position.lerpVectors(a.desde, a.hasta, a.t);
    this.position.y += Math.sin(a.t * Math.PI) * a.arco;
    this.actualizarCamara();
    if (a.t >= 1) {
      this.animacion = null;
      this.velocidadY = 0;
    }
  }

  update(dt) {
    if (!this.controls.isLocked) return; // si el juego está en pausa, no se mueve
    if (this.escondido) return; // escondido solo se puede mirar (el mouse lo maneja PointerLockControls)
    if (this.animacion) {
      this.avanzarAnimacion(dt); // trepando: no se controla hasta que termine
      return;
    }

    this.mover(dt);
    this.aplicarGravedad(dt);
    this.actualizarCamara();
    this.hacerRuidoAlCorrer(dt);
    this.sonarPasos(dt);
  }

  // Sonido de pasos: uno cada medio segundo caminando, más seguido corriendo
  sonarPasos(dt) {
    if (!this.estaMoviendose) {
      this.tiempoSonidoPaso = 0;
      return;
    }
    this.tiempoSonidoPaso -= dt;
    if (this.tiempoSonidoPaso <= 0) {
      this.tiempoSonidoPaso = this.estaCorriendo ? 0.3 : 0.5;
      this.alDarPaso?.(this.estaCorriendo);
    }
  }

  // Correr hace ruido: un "paso fuerte" cada INTERVALO_PASOS_CORRIENDO segundos
  hacerRuidoAlCorrer(dt) {
    this.tiempoDesdeChoque += dt;
    if (!this.estaCorriendo) {
      this.tiempoPasos = 0;
      return;
    }
    this.tiempoPasos += dt;
    if (this.tiempoPasos >= INTERVALO_PASOS_CORRIENDO) {
      this.tiempoPasos = 0;
      this.alHacerRuido?.('pasosCorriendo');
    }
  }

  // Chocar algo corriendo hace ruido (¡pum!)
  alChocar() {
    if (this.estaCorriendo && this.tiempoDesdeChoque >= ESPERA_ENTRE_CHOQUES) {
      this.tiempoDesdeChoque = 0;
      this.alHacerRuido?.('choque');
    }
  }

  // --- Escondites ---
  // Nos metemos en el mueble y la cámara mira hacia donde estábamos parados:
  //  - placard: los ojos quedan en la puerta del placard (espiando por las rendijas)
  //  - cama: los ojos quedan abajo, cerca del borde (espiando desde el piso)
  esconderse(escondite) {
    this.escondido = true;
    this.escondite = escondite;
    this.estaMoviendose = false;
    this.estaCorriendo = false;
    this.posicionAntesDeEsconderse.copy(this.position);
    this.rotacionAntesDeEsconderse.copy(this.camera.quaternion);

    const caja = escondite.collider;
    const centro = caja.getCenter(new THREE.Vector3());
    const piso = caja.min.y;
    const alturaOjos = ALTURA_OJOS_ESCONDIDO[escondite.escondite];

    // Punto del borde del mueble más cercano a donde estábamos parados
    const borde = caja.clampPoint(this.posicionAntesDeEsconderse, new THREE.Vector3());
    const haciaAfuera = borde.clone().sub(centro).setY(0).normalize();
    const ajuste = escondite.escondite === 'placard' ? 0.05 : -0.3;
    const ojos = borde.addScaledVector(haciaAfuera, ajuste).setY(piso + alturaOjos);

    // Para el dueño, el jugador está en el centro del mueble
    this.position.set(centro.x, piso, centro.z);
    this.camera.position.copy(ojos);
    this.camera.lookAt(this.posicionAntesDeEsconderse.x, ojos.y, this.posicionAntesDeEsconderse.z);
  }

  // Salimos al mismo lugar desde donde entramos
  salirDelEscondite() {
    this.escondido = false;
    this.escondite = null;
    this.position.copy(this.posicionAntesDeEsconderse);
    this.camera.quaternion.copy(this.rotacionAntesDeEsconderse);
    this.actualizarCamara();
  }

  // --- Movimiento horizontal con WASD ---
  mover(dt) {
    // Hacia dónde mira la cámara, pero "aplastado" al piso (sin mirar arriba/abajo)
    this.camera.getWorldDirection(this.adelante);
    this.adelante.y = 0;
    this.adelante.normalize();
    // La derecha es perpendicular a "adelante"
    this.derecha.crossVectors(this.adelante, this.camera.up);

    // Sumamos las direcciones de las teclas apretadas
    this.movimiento.set(0, 0, 0);
    if (this.teclas['KeyW']) this.movimiento.add(this.adelante);
    if (this.teclas['KeyS']) this.movimiento.sub(this.adelante);
    if (this.teclas['KeyD']) this.movimiento.add(this.derecha);
    if (this.teclas['KeyA']) this.movimiento.sub(this.derecha);

    this.estaMoviendose = this.movimiento.lengthSq() > 0;
    this.estaCorriendo =
      this.estaMoviendose && (this.teclas['ShiftLeft'] || this.teclas['ShiftRight']);

    if (!this.estaMoviendose) return;

    const velocidad = this.estaCorriendo ? VELOCIDAD_CORRER : VELOCIDAD_CAMINAR;
    // normalize(): que ir en diagonal no sea más rápido
    this.movimiento.normalize().multiplyScalar(velocidad * dt);

    // Movemos un eje por vez: si choca en X, igual puede deslizarse en Z (y al revés).
    this.position.x += this.movimiento.x;
    if (this.chocaConAlgo()) {
      this.position.x -= this.movimiento.x;
      this.alChocar();
    }

    this.position.z += this.movimiento.z;
    if (this.chocaConAlgo()) {
      this.position.z -= this.movimiento.z;
      this.alChocar();
    }
  }

  // Caja de colisión del jugador en su posición actual.
  // Empieza un poco arriba de los pies (ESCALON) para poder subir rampas.
  obtenerCaja() {
    const p = this.position;
    this.caja.min.set(p.x - RADIO, p.y + ESCALON, p.z - RADIO);
    this.caja.max.set(p.x + RADIO, p.y + ALTURA_CUERPO, p.z + RADIO);
    return this.caja;
  }

  // --- Colisión AABB: ¿la caja del jugador se superpone con algo sólido de la casa? ---
  chocaConAlgo() {
    return this.house.chocaCon(this.obtenerCaja());
  }

  // --- Gravedad: buscamos el suelo con un rayo hacia abajo ---
  aplicarGravedad(dt) {
    const alturaSuelo = this.buscarSuelo();

    // Si hay suelo cerca debajo de los pies, nos "pegamos" a él (así se baja una rampa sin saltitos)
    if (alturaSuelo !== null && this.position.y - alturaSuelo < ESCALON) {
      this.position.y = alturaSuelo;
      this.velocidadY = 0;
      return;
    }

    // Si no, caemos
    this.velocidadY -= GRAVEDAD * dt;
    this.position.y += this.velocidadY * dt;

    // No atravesar el suelo al caer
    if (alturaSuelo !== null && this.position.y < alturaSuelo) {
      this.position.y = alturaSuelo;
      this.velocidadY = 0;
    }
  }

  // Devuelve la altura del suelo debajo del jugador, o null si no hay nada.
  buscarSuelo() {
    // El rayo sale desde un poco arriba de los pies, así detecta la rampa cuando sube
    return this.house.alturaDelSuelo(this.position, ESCALON);
  }

  actualizarCamara() {
    this.camera.position.set(this.position.x, this.position.y + ALTURA_OJOS, this.position.z);
  }
}
