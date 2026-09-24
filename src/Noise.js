// Sistema de ruido: cada ruido tiene una posición y un RADIO de alcance.
// Lo escuchan TODOS los enemigos que estén dentro del radio (cada uno con su oído: los perros
// escuchan al doble de distancia y la abuela a la mitad) y van a investigar.
// Los enemigos también hacen ruido: un ladrido o un disparo alertan a los demás.
// También dibuja una onda en el piso que crece hasta el radio (así se "ve" el alcance).
import * as THREE from 'three';

// Radios de cada tipo de ruido (en metros)
export const RADIO_RUIDO = {
  pasosAgachado: 1, // casi no se escucha
  pasos: 3, // caminando normal: el dueño te escucha si pasás cerca
  pasosCorriendo: 7,
  salto: 2,
  aterrizaje: 5, // caer desde alto hace ¡pum!
  puerta: 6,
  choque: 5, conducto: 4, rejilla: 3, trampilla: 6,
  ladrido: 14, // un perro que ladra alerta al dueño (y al otro perro)
  disparo: 30, // ¡BANG! lo escucha todo el barrio
};

export const RADIO_MAXIMO_PASOS = RADIO_RUIDO.pasosCorriendo; // para el "ruidómetro" de la pantalla

const DURACION_ONDA = 0.6; // segundos que tarda la onda en llegar al radio

export class SistemaDeRuido {
  constructor(scene, enemigos) {
    this.scene = scene;
    this.enemigos = enemigos;
    this.ondas = []; // ondas visuales activas: { malla, radio, tiempo }
    this.geometriaOnda = new THREE.RingGeometry(0.9, 1, 48);
    this.geometriaOnda.rotateX(-Math.PI / 2); // acostada en el piso
  }

  // Hace un ruido en "posicion" (pies) con alcance "radio".
  // fuente: el enemigo que lo hizo (no se escucha a sí mismo), o null si fue el jugador.
  // Devuelve la lista de enemigos que lo escucharon.
  hacerRuido(posicion, radio, fuente = null) {
    this.crearOnda(posicion, Math.min(radio, 15)); // (la onda de un disparo sería gigante)
    return this.enemigos.filter((enemigo) => enemigo !== fuente && enemigo.oirRuido(posicion, radio));
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
