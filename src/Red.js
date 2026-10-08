// Las redes del lanzarredes de Doña Pocha (etapa 15C).
//
// Una red sale de la punta del lanzador y vuela en línea recta (con un poquito de caída), girando y
// abriéndose. En cada frame vemos si:
//   - tocó al jugador: lo enreda (Abuela avisa a Game con alAtrapar). Si justo estaba escondido, o
//     recién se soltó de otra red (inmune), la red sigue de largo.
//   - pegó contra algo (pared, mueble, piso): queda ahí tirada, apoyada sobre esa superficie.
//   - voló demasiado: desaparece.
// Como va rápido pero no es instantánea, corriendo de costado se puede esquivar.
import * as THREE from 'three';
import { materialToon } from './Materials.js';

const VELOCIDAD = 14; // metros por segundo
const CAIDA = 3; // "gravedad" de la red (m/s²): cae un poquito, para que se note que vuela
const ALCANCE = 25; // metros: más lejos que esto, desaparece
const RADIO_ATRAPA = 0.6; // la red abierta mide más o menos esto de radio
const ESCALA_ABIERTA = 0.65; // tamaño de la red ya abierta (la malla mide 1 m de radio)
const TIEMPO_PARA_ABRIRSE = 0.3; // segundos que tarda en abrirse del todo
const MAXIMO_TIRADAS = 8; // redes que quedan en el piso o en las paredes

// La malla de una red: un aro, las sogas cruzadas y unos plomitos en el borde.
// Mide 1 m de radio y está acostada en el plano XY (mira hacia +Z).
function crearMallaRed() {
  const grupo = new THREE.Group();
  const soga = materialToon('#f1e3c6');
  const aro = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 24), soga);
  grupo.add(aro);
  // Sogas horizontales y verticales (cada una del largo justo para llegar al aro)
  for (let i = -2; i <= 2; i++) {
    const d = i * 0.33;
    const largo = 2 * Math.sqrt(1 - d * d);
    const horizontal = new THREE.Mesh(new THREE.BoxGeometry(largo, 0.025, 0.025), soga);
    horizontal.position.y = d;
    const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.025, largo, 0.025), soga);
    vertical.position.x = d;
    grupo.add(horizontal, vertical);
  }
  for (let i = 0; i < 6; i++) {
    const angulo = (i / 6) * Math.PI * 2;
    const plomito = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), materialToon('#495057'));
    plomito.position.set(Math.cos(angulo), Math.sin(angulo), 0);
    grupo.add(plomito);
  }
  grupo.traverse((m) => (m.castShadow = true));
  return grupo;
}

export class Redes {
  constructor(scene, house, player) {
    this.scene = scene;
    this.house = house;
    this.player = player;
    this.voladoras = []; // { malla, velocidad, recorrido, tiempo }
    this.tiradas = []; // mallas que quedaron apoyadas en algo
    this.raycaster = new THREE.Raycaster();
    this.alAtrapar = null; // alAtrapar(): la red enredó al jugador (lo conecta Abuela)
    this.alErrar = null; // alErrar(): la red pegó en otra cosa o se perdió de vista
  }

  // Lanza una red desde "desde" apuntando a "hacia"
  lanzar(desde, hacia) {
    const malla = crearMallaRed();
    malla.position.copy(desde);
    malla.scale.setScalar(0.15); // sale cerrada y se va abriendo
    this.scene.add(malla);
    const velocidad = hacia.clone().sub(desde).normalize().multiplyScalar(VELOCIDAD);
    this.voladoras.push({ malla, velocidad, recorrido: 0, tiempo: 0 });
  }

  update(dt) {
    for (const red of [...this.voladoras]) this.moverRed(red, dt);
  }

  moverRed(red, dt) {
    const { malla, velocidad } = red;
    red.tiempo += dt;
    velocidad.y -= CAIDA * dt;
    const desde = malla.position.clone();
    const paso = velocidad.clone().multiplyScalar(dt);
    const hasta = desde.clone().add(paso);

    // Se abre, mira hacia donde va y gira sobre sí misma
    malla.scale.setScalar(THREE.MathUtils.lerp(0.15, ESCALA_ABIERTA, Math.min(1, red.tiempo / TIEMPO_PARA_ABRIRSE)));
    malla.lookAt(hasta.clone().add(velocidad));
    malla.rotateZ(red.tiempo * 8);

    // 1. ¿Tocó al jugador? (miramos el punto más cercano del tramo recorrido en este frame)
    if (this.player.puedeSerEnredado && this.distanciaAlJugador(desde, hasta) < RADIO_ATRAPA) {
      this.sacar(red);
      this.alAtrapar?.();
      return;
    }

    // 2. ¿Pegó contra algo? Un rayo a lo largo del tramo
    this.raycaster.set(desde, paso.clone().normalize());
    this.raycaster.far = paso.length();
    const choque = this.raycaster.intersectObjects(this.house.obstaculos, true).find((c) => c.face);
    if (choque) {
      const normal = choque.face.normal.clone().transformDirection(choque.object.matrixWorld);
      this.sacar(red);
      this.dejarTirada(choque.point, normal);
      this.alErrar?.();
      return;
    }

    malla.position.copy(hasta);
    red.recorrido += paso.length();
    if (red.recorrido > ALCANCE) {
      this.sacar(red);
      this.alErrar?.();
    }
  }

  // Distancia entre el tramo desde→hasta y el "cuerpo" del jugador (un palito vertical de sus pies a su cabeza)
  distanciaAlJugador(desde, hasta) {
    const p = this.player.position;
    const alto = this.player.agachado ? 1.05 : 1.7;
    let minima = Infinity;
    for (let i = 0; i <= 4; i++) {
      const punto = desde.clone().lerp(hasta, i / 4);
      const y = THREE.MathUtils.clamp(punto.y, p.y, p.y + alto);
      minima = Math.min(minima, Math.hypot(punto.x - p.x, punto.y - y, punto.z - p.z));
    }
    return minima;
  }

  // La red queda apoyada sobre la superficie donde pegó (mirando hacia afuera de ella)
  dejarTirada(punto, normal) {
    const malla = crearMallaRed();
    malla.scale.setScalar(ESCALA_ABIERTA * 0.8);
    malla.position.copy(punto).addScaledVector(normal, 0.03);
    malla.lookAt(punto.clone().add(normal));
    malla.rotateZ(Math.random() * Math.PI);
    this.scene.add(malla);
    this.tiradas.push(malla);
    if (this.tiradas.length > MAXIMO_TIRADAS) this.scene.remove(this.tiradas.shift());
  }

  // Cuando el jugador se suelta, la red le queda tirada a los pies
  dejarEnElPiso(posicion) {
    this.dejarTirada(posicion.clone().setY(posicion.y + 0.01), new THREE.Vector3(0, 1, 0));
  }

  sacar(red) {
    this.scene.remove(red.malla);
    this.voladoras = this.voladoras.filter((r) => r !== red);
  }

  limpiar() {
    for (const red of this.voladoras) this.scene.remove(red.malla);
    for (const malla of this.tiradas) this.scene.remove(malla);
    this.voladoras = [];
    this.tiradas = [];
  }
}
