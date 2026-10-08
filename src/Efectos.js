// Efectos al agarrar algo (un objeto del botín o una habilidad):
//   - la cosa VUELA hacia la cámara haciendo un arquito y se achica (como si la metieras en la bolsa)
//   - en el lugar donde estaba aparece un DESTELLO: una esfera de color que crece y se desvanece
// Son solo "dibujos": no chocan con nada y los rayos de la mira no los tocan.
import * as THREE from 'three';

const DURACION_VUELO = 0.35; // segundos
const DURACION_DESTELLO = 0.3;

// Hace que un objeto (y sus hijos) no lo detecten los rayos
function sinRayos(objeto) {
  objeto.traverse((hijo) => (hijo.raycast = () => {}));
}

export class Efectos {
  constructor(scene) {
    this.scene = scene;
    this.vuelos = []; // { malla, desde, escala, t }   (t va de 0 a 1)
    this.destellos = []; // { malla, t }
    this.geometriaDestello = new THREE.SphereGeometry(1, 16, 12);
    // Reutilizables (para no crear vectores en cada frame)
    this.llegada = new THREE.Vector3();
    this.adelante = new THREE.Vector3();
  }

  // La malla sale volando hacia la cámara. color: el del destello
  agarrar(malla, color = '#ffffff') {
    sinRayos(malla);
    this.scene.add(malla); // (por si ya la habían sacado de la escena)
    this.vuelos.push({ malla, desde: malla.position.clone(), escala: malla.scale.clone(), t: 0 });
    this.destello(malla.position, color);
  }

  destello(posicion, color) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    material.userData.outlineParameters = { visible: false }; // sin borde negro (ver Game.js)
    const malla = new THREE.Mesh(this.geometriaDestello, material);
    malla.position.copy(posicion);
    malla.position.y += 0.1;
    malla.scale.setScalar(0.05);
    malla.raycast = () => {};
    this.scene.add(malla);
    this.destellos.push({ malla, t: 0 });
  }

  update(dt, camera) {
    // A dónde vuelan: un poco adelante y abajo de la cámara (donde estaría la bolsa del ladrón)
    camera.getWorldDirection(this.adelante);
    this.llegada.copy(camera.position).addScaledVector(this.adelante, 0.4);
    this.llegada.y -= 0.35;

    for (const v of this.vuelos) {
      v.t = Math.min(v.t + dt / DURACION_VUELO, 1);
      // t² = arranca despacio y acelera (como si la bolsa la "chupara")
      v.malla.position.lerpVectors(v.desde, this.llegada, v.t * v.t);
      v.malla.position.y += Math.sin(v.t * Math.PI) * 0.25; // el arquito
      v.malla.scale.copy(v.escala).multiplyScalar(1 - v.t * 0.9);
      if (v.t >= 1) this.scene.remove(v.malla);
    }
    this.vuelos = this.vuelos.filter((v) => v.t < 1);

    for (const d of this.destellos) {
      d.t = Math.min(d.t + dt / DURACION_DESTELLO, 1);
      d.malla.scale.setScalar(0.05 + d.t * 0.45);
      d.malla.material.opacity = 0.9 * (1 - d.t);
      if (d.t >= 1) this.borrarDestello(d);
    }
    this.destellos = this.destellos.filter((d) => d.t < 1);
  }

  borrarDestello(d) {
    this.scene.remove(d.malla);
    d.malla.material.dispose();
  }

  // Partida nueva: se borra lo que estuviera volando
  limpiar() {
    for (const v of this.vuelos) this.scene.remove(v.malla);
    for (const d of this.destellos) this.borrarDestello(d);
    this.vuelos = [];
    this.destellos = [];
  }
}
