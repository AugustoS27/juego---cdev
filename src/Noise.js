// Sistema de ruido: cada ruido tiene una posición y un RADIO de alcance.
// Si el dueño está dentro del radio, lo escucha y va a investigar.
// También dibuja una onda en el piso que crece hasta el radio (así se "ve" el alcance).
import * as THREE from 'three';

// Radios de cada tipo de ruido (en metros)
export const RADIO_RUIDO = {
  pasosCorriendo: 7,
  puerta: 6,
  choque: 5,
};

const DURACION_ONDA = 0.6; // segundos que tarda la onda en llegar al radio

export class SistemaDeRuido {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.ondas = []; // ondas visuales activas: { malla, radio, tiempo }
    this.geometriaOnda = new THREE.RingGeometry(0.9, 1, 48);
    this.geometriaOnda.rotateX(-Math.PI / 2); // acostada en el piso
  }

  // Hace un ruido en "posicion" (pies) con alcance "radio".
  // Devuelve true si el dueño lo escuchó.
  hacerRuido(posicion, radio) {
    this.crearOnda(posicion, radio);
    return this.owner.oirRuido(posicion, radio);
  }

  crearOnda(posicion, radio) {
    const material = new THREE.MeshBasicMaterial({
      color: '#ffd23f',
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    material.userData.outlineParameters = { visible: false }; // sin borde negro (ver Game.js)
    const malla = new THREE.Mesh(this.geometriaOnda, material);
    malla.position.set(posicion.x, posicion.y + 0.05, posicion.z);
    malla.scale.setScalar(0.01);
    this.scene.add(malla);
    this.ondas.push({ malla, radio, tiempo: 0 });
  }

  // La onda crece hasta el radio y se va desvaneciendo
  update(dt) {
    for (const onda of this.ondas) {
      onda.tiempo += dt;
      const avance = Math.min(onda.tiempo / DURACION_ONDA, 1);
      onda.malla.scale.setScalar(Math.max(avance * onda.radio, 0.01));
      onda.malla.material.opacity = 0.8 * (1 - avance);
    }
    // Borramos las que terminaron
    for (const onda of this.ondas.filter((o) => o.tiempo >= DURACION_ONDA)) {
      this.scene.remove(onda.malla);
      onda.malla.material.dispose();
    }
    this.ondas = this.ondas.filter((o) => o.tiempo < DURACION_ONDA);
  }

  // Borra todas las ondas (al reiniciar)
  limpiar() {
    for (const onda of this.ondas) {
      this.scene.remove(onda.malla);
      onda.malla.material.dispose();
    }
    this.ondas = [];
  }
}
