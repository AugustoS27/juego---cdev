// El jugador: cámara en primera persona, movimiento con WASD, salto, agacharse y colisiones simples.
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// Valores del jugador (fáciles de ajustar)
const VELOCIDAD_CAMINAR = 3.5; // metros por segundo
const VELOCIDAD_CORRER = 6.5;
const VELOCIDAD_AGACHADO = 1.8;
const ALTURA_OJOS = 1.6; // la cámara está a esta altura sobre los pies
const ALTURA_OJOS_AGACHADO = 0.9;
const ALTURA_CUERPO = 1.7;
const ALTURA_CUERPO_AGACHADO = 1.05; // agachado entra por lugares bajos (y se esconde detrás de los muebles)
const RADIO = 0.3; // "ancho" del jugador (mitad del lado de su caja)
const ESCALON = 0.35; // lo máximo que puede "subir" de golpe sin chocar (sirve para rampas)
const GRAVEDAD = 20;
const VELOCIDAD_SALTO = 6; // salta unos 90 cm (altura = v² / 2g)
const CAIDA_RUIDOSA = -5; // si cae más rápido que esto, el aterrizaje hace ruido
const ESPERA_ENTRE_CHOQUES = 1; // para no generar un ruido por frame contra una pared
const ALTURA_OJOS_ESCONDIDO = { placard: 1.5, cama: 0.2 }; // debajo de la cama se ve desde el piso

// Cada tipo de paso: cada cuánto se da un paso (s). El ruido de cada uno está en Noise.js.
const INTERVALO_PASO = { pasos: 0.5, pasosCorriendo: 0.3, pasosAgachado: 0.7 };

// Balanceo de la cámara al caminar: cuántos metros baja en cada paso (corriendo más, agachado casi nada)
const BALANCEO = { pasos: 0.035, pasosCorriendo: 0.07, pasosAgachado: 0.012 };
// "Sacudón" al aterrizar: la cámara se hunde y vuelve como un resorte
const RIGIDEZ_RESORTE = 120; // más grande = vuelve más rápido
const FRENO_RESORTE = 14; // más grande = rebota menos
const CAIDA_CON_SACUDON = -2; // aterrizajes más lentos que esto no sacuden

export class Player {
  constructor(camera, domElement, house) {
    this.camera = camera;
    this.house = house;

    // Posición de los PIES del jugador (la cámara se ubica arriba)
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocidadY = 0; // velocidad vertical (saltar y caer)
    this.enSuelo = true;

    // Estado que otras partes del juego van a leer (ej: el sistema de ruido)
    this.estaMoviendose = false;
    this.estaCorriendo = false;
    this.agachado = false;
    this.alturaOjos = ALTURA_OJOS; // se acerca de a poco a la altura de parado o agachado
    this.faseBalanceo = 0; // avanza medio ciclo por paso
    this.amplitudBalanceo = 0; // se acerca de a poco a la del tipo de paso (así no "salta" al frenar)
    this.sacudon = 0; // cuánto está hundida la cámara por el aterrizaje (negativo = abajo)
    this.velocidadSacudon = 0;

    // Habilidades (ver Habilidades.js): Game las cambia mientras duran
    this.multiplicadorVelocidad = 1; // con la bebida energética: 1.5
    this.pasosSilenciosos = false; // con las botas de lana: los pasos no hacen ruido

    this.animacion = null; // movimiento automático (trepar, subir la escalera) o null

    // Escondite
    this.escondido = false;
    this.escondite = null; // el mueble donde está escondido
    this.posicionAntesDeEsconderse = new THREE.Vector3();
    this.rotacionAntesDeEsconderse = new THREE.Quaternion();

    // Game conecta estas funciones con el sonido y el sistema de ruido:
    //   alDarPaso(tipo):    tipo = 'pasos', 'pasosCorriendo' o 'pasosAgachado'
    //   alHacerRuido(tipo): tipo = 'choque', 'salto' o 'aterrizaje'
    this.alDarPaso = null;
    this.alHacerRuido = null;
    this.tiempoParaPaso = 0;
    this.tiempoDesdeChoque = ESPERA_ENTRE_CHOQUES;

    // PointerLockControls: esconde el mouse y rota la cámara al moverlo
    this.controls = new PointerLockControls(camera, domElement);

    // Teclas apretadas en este momento
    this.teclas = {};
    window.addEventListener('keydown', (e) => {
      this.teclas[e.code] = true;
      if (e.code === 'Space' && this.controls.isLocked) e.preventDefault(); // que la página no scrollee
    });
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
    this.enSuelo = true;
    this.agachado = false;
    this.alturaOjos = ALTURA_OJOS;
    this.animacion = null;
    this.amplitudBalanceo = this.sacudon = this.velocidadSacudon = 0;
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

    this.tiempoDesdeChoque += dt;
    this.actualizarAgachado();
    this.saltarSiCorresponde();
    this.mover(dt);
    this.aplicarGravedad(dt);
    this.actualizarCamara(dt);
    this.balancearCamara(dt);
    this.darPasos(dt);
  }

  // ------------------------------------------------------------
  //  SALTAR Y AGACHARSE
  // ------------------------------------------------------------
  // C (mantener) = agacharse. Para pararse tiene que haber lugar arriba
  // (si estás debajo de algo bajo, te quedás agachado).
  actualizarAgachado() {
    const quiereAgacharse = !!this.teclas['KeyC'];
    if (quiereAgacharse) {
      this.agachado = true;
    } else if (this.agachado && this.hayLugarParaPararse()) {
      this.agachado = false;
    }
  }

  hayLugarParaPararse() {
    const p = this.position;
    const cajaParado = new THREE.Box3(
      new THREE.Vector3(p.x - RADIO, p.y + ESCALON, p.z - RADIO),
      new THREE.Vector3(p.x + RADIO, p.y + ALTURA_CUERPO, p.z + RADIO),
    );
    return !this.house.chocaCon(cajaParado);
  }

  // Espacio = saltar (solo parado y apoyado en algo)
  saltarSiCorresponde() {
    if (this.teclas['Space'] && this.enSuelo && !this.agachado) {
      this.velocidadY = VELOCIDAD_SALTO;
      this.enSuelo = false;
      this.alHacerRuido?.('salto');
    }
  }

  // ------------------------------------------------------------
  //  PASOS (sonido y ruido)
  // ------------------------------------------------------------
  // Qué tipo de paso estamos dando ahora (null si estamos quietos o en el aire)
  get tipoDePaso() {
    if (!this.estaMoviendose || !this.enSuelo) return null;
    if (this.agachado) return 'pasosAgachado';
    return this.estaCorriendo ? 'pasosCorriendo' : 'pasos';
  }

  // Cada tanto se da un paso: Game le pone sonido y genera el ruido que corresponde
  darPasos(dt) {
    const tipo = this.tipoDePaso;
    if (!tipo) {
      this.tiempoParaPaso = 0;
      return;
    }
    this.tiempoParaPaso -= dt;
    if (this.tiempoParaPaso <= 0) {
      // (más rápido = pasos más seguidos)
      this.tiempoParaPaso = INTERVALO_PASO[tipo] / this.multiplicadorVelocidad;
      this.alDarPaso?.(tipo);
    }
  }

  // Chocar algo corriendo hace ruido (¡pum!)
  alChocar() {
    if (this.estaCorriendo && this.tiempoDesdeChoque >= ESPERA_ENTRE_CHOQUES) {
      this.tiempoDesdeChoque = 0;
      this.alHacerRuido?.('choque');
    }
  }

  // ------------------------------------------------------------
  //  ESCONDITES
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  //  MOVIMIENTO Y COLISIONES
  // ------------------------------------------------------------
  // Movimiento horizontal con WASD
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
    // Agachado no se puede correr
    this.estaCorriendo =
      this.estaMoviendose && !this.agachado && (this.teclas['ShiftLeft'] || this.teclas['ShiftRight']);

    if (!this.estaMoviendose) return;

    let velocidad = VELOCIDAD_CAMINAR;
    if (this.agachado) velocidad = VELOCIDAD_AGACHADO;
    else if (this.estaCorriendo) velocidad = VELOCIDAD_CORRER;
    velocidad *= this.multiplicadorVelocidad; // (la bebida energética también vale agachado)
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
  // Empieza un poco arriba de los pies (ESCALON) para poder subir rampas, y es más baja agachado.
  obtenerCaja() {
    const p = this.position;
    const alto = this.agachado ? ALTURA_CUERPO_AGACHADO : ALTURA_CUERPO;
    this.caja.min.set(p.x - RADIO, p.y + ESCALON, p.z - RADIO);
    this.caja.max.set(p.x + RADIO, p.y + alto, p.z + RADIO);
    return this.caja;
  }

  // Colisión AABB: ¿la caja del jugador se superpone con algo sólido de la casa?
  chocaConAlgo() {
    return this.house.chocaCon(this.obtenerCaja());
  }

  // Gravedad: la velocidad vertical baja todo el tiempo (por eso después de saltar caemos).
  // Si tenemos una "base" cerca debajo de los pies (el piso o un mueble), nos apoyamos en ella.
  aplicarGravedad(dt) {
    const velocidadAntes = this.velocidadY;
    this.velocidadY -= GRAVEDAD * dt;
    this.position.y += this.velocidadY * dt;

    // Si subiendo nos pegamos la cabeza contra algo, frenamos
    if (this.velocidadY > 0 && this.chocaConAlgo()) {
      this.position.y -= this.velocidadY * dt;
      this.velocidadY = 0;
    }

    // Apoyarnos en la base (solo si estamos bajando o quietos). Así también se bajan
    // las rampas sin saltitos: la base está apenas más abajo y nos "pegamos" a ella.
    const base = this.buscarBase();
    if (base !== null && this.velocidadY <= 0 && this.position.y - base < ESCALON) {
      if (!this.enSuelo && velocidadAntes < CAIDA_RUIDOSA) this.alHacerRuido?.('aterrizaje');
      // ¡Sacudón! Cuanto más rápido caía, más se hunde la cámara
      // (con un tope, para que caer desde el techo no te hunda la cámara hasta el piso)
      if (!this.enSuelo && velocidadAntes < CAIDA_CON_SACUDON) this.velocidadSacudon = Math.max(velocidadAntes * 0.6, -4);
      this.position.y = base;
      this.velocidadY = 0;
      this.enSuelo = true;
    } else {
      this.enSuelo = false;
    }
  }

  // Lo más alto que tenemos debajo de los pies: el piso (o una rampa) o la parte de arriba
  // de un mueble (así se puede saltar arriba de una mesa y quedarse parado ahí).
  buscarBase() {
    const suelo = this.house.alturaDelSuelo(this.position, ESCALON); // rayo hacia abajo
    const apoyo = this.buscarApoyo();
    if (suelo === null) return apoyo;
    if (apoyo === null) return suelo;
    return Math.max(suelo, apoyo);
  }

  // ¿Hay un mueble (caja sólida) justo debajo de los pies? Devuelve la altura de su tapa.
  buscarApoyo() {
    const p = this.position;
    const r = RADIO * 0.8;
    let mejor = null;
    for (const collider of this.house.colliders) {
      const tapa = collider.max.y;
      // La tapa tiene que estar cerca de los pies (un poco abajo o, como mucho, un escalón arriba)
      if (tapa < p.y - 0.5 || tapa > p.y + ESCALON) continue;
      // Y tiene que estar debajo de nosotros (que se superpongan en x/z)
      if (p.x + r < collider.min.x || p.x - r > collider.max.x) continue;
      if (p.z + r < collider.min.z || p.z - r > collider.max.z) continue;
      if (mejor === null || tapa > mejor) mejor = tapa;
    }
    return mejor;
  }

  // Balanceo al caminar y sacudón al aterrizar: se le suman a la cámara (ya ubicada en los ojos).
  //  - Arriba/abajo: baja y sube una vez por paso (|seno|).
  //  - De lado a lado: un paso hacia cada lado (seno), con la mitad de la amplitud.
  //  - Sacudón: un resorte. La "fuerza" lo empuja de vuelta a 0 y el "freno" evita que rebote mucho.
  balancearCamara(dt) {
    const tipo = this.tipoDePaso; // (null = quieto o en el aire)
    const objetivo = tipo ? BALANCEO[tipo] : 0;
    this.amplitudBalanceo += (objetivo - this.amplitudBalanceo) * Math.min(1, dt * 8);
    if (tipo) this.faseBalanceo += (dt * Math.PI * this.multiplicadorVelocidad) / INTERVALO_PASO[tipo];

    const fuerza = -this.sacudon * RIGIDEZ_RESORTE - this.velocidadSacudon * FRENO_RESORTE;
    this.velocidadSacudon += fuerza * dt;
    this.sacudon += this.velocidadSacudon * dt;

    this.camera.position.y += this.sacudon - Math.abs(Math.sin(this.faseBalanceo)) * this.amplitudBalanceo;
    this.camera.position.addScaledVector(this.derecha, Math.sin(this.faseBalanceo) * this.amplitudBalanceo * 0.5);
  }

  // La cámara va a la altura de los ojos, que baja o sube suavemente al agacharse o pararse
  actualizarCamara(dt = 1) {
    const objetivo = this.agachado ? ALTURA_OJOS_AGACHADO : ALTURA_OJOS;
    this.alturaOjos += (objetivo - this.alturaOjos) * Math.min(1, dt * 12);
    this.camera.position.set(this.position.x, this.position.y + this.alturaOjos, this.position.z);
  }
}
