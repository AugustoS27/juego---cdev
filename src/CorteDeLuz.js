// Cortes de luz (etapa 16C). La luz NUNCA se corta sola: solo cuando el jugador baja la llave del
// tablero del garaje (y solo de noche: de día no cambia nada).
//
//   - Al bajar la llave: "clac", las lámparas parpadean y se apagan. Quedan la luna por las ventanas y
//     tu linterna. Los vecinos ven mucho menos... pero la linterna se nota muchísimo (ver Game).
//   - Don Ernesto va al tablero (con su linterna) y vuelve a subir la llave: las lámparas vuelven
//     parpadeando. Desde la segunda vez, sospecha y se queda revisando el garaje (ver Dueno.js).
//   - Doña Pocha prende una vela (en la mesa de luz de su cuarto).
//
// Esta clase solo maneja el tablero, la vela y el parpadeo: dice cuánta "corriente" hay (de 0 a 1) y
// Game se la pasa a cada parte que tiene luces (Lamparas, Decoracion, House y Exterior).
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { TABLERO_LUZ, ALTURA_PISO } from './HouseData.js';

const DISTANCIA_USO = 2.5;
// Parpadeo al cortarse y al volver: [segundos, corriente] (al final queda en 0 o en 1)
const PARPADEO_CORTE = [[0.08, 0.3], [0.1, 1], [0.06, 0], [0.12, 0.8], [0.18, 0.15], [0.08, 0.6], [0.3, 0]];
const PARPADEO_VUELTA = [[0.15, 0.6], [0.1, 0], [0.12, 1], [0.25, 0.2], [0.08, 0.9], [0.1, 0.4], [0.2, 1]];
const VELA = { x: 8.6, y: ALTURA_PISO + 0.5, z: 0.25 }; // sobre la mesa de luz de Doña Pocha

export class CorteDeLuz {
  constructor(scene, house) {
    this.house = house;
    this.crearTablero(scene);
    this.crearVela(scene);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = DISTANCIA_USO;
    this.centroPantalla = new THREE.Vector2(0, 0);
    this.reiniciar();
  }

  // Una caja gris en la pared, con una lucecita (verde: hay luz; roja: cortada) y la llave (una palanca)
  crearTablero(scene) {
    const { x, y, z } = TABLERO_LUZ;
    this.raiz = new THREE.Group();
    this.raiz.position.set(x, y, z);
    this.raiz.rotation.y = -Math.PI / 2; // de frente al garaje (hacia -X)
    const parte = (geometria, color, px, py, pz) => {
      const malla = new THREE.Mesh(geometria, typeof color === 'string' ? materialToon(color) : color);
      malla.position.set(px, py, pz);
      this.raiz.add(malla);
      return malla;
    };
    parte(new THREE.BoxGeometry(0.46, 0.58, 0.1), '#8d99ae', 0, 0, 0.05); // la caja
    parte(new THREE.BoxGeometry(0.4, 0.06, 0.02), '#2b2d42', 0, 0.2, 0.11); // la fila de llavecitas
    for (let i = 0; i < 5; i++) parte(new THREE.BoxGeometry(0.035, 0.05, 0.03), '#edf2f4', -0.14 + i * 0.07, 0.2, 0.12);
    // La llave general: gira hacia arriba (luz) o hacia abajo (cortada)
    this.palanca = new THREE.Group();
    this.palanca.position.set(0, -0.08, 0.11);
    this.raiz.add(this.palanca);
    const mango = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.05), materialToon('#e63946'));
    mango.position.y = 0.08;
    this.palanca.add(mango);
    this.lucecita = parte(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: '#52b788' }), 0.16, -0.2, 0.11);
    this.lucecita.userData.outlineParameters = { visible: false };
    // Un cartelito "LUZ" arriba
    parte(new THREE.BoxGeometry(0.2, 0.06, 0.01), '#ffd23f', 0, 0.33, 0.1);
    scene.add(this.raiz);
  }

  // La vela de Doña Pocha: arranca apagada. Su luz existe siempre (apagada): ver Turno.js
  crearVela(scene) {
    this.vela = new THREE.Group();
    this.vela.position.set(VELA.x, VELA.y, VELA.z);
    const cera = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 10), materialToon('#fffaf0'));
    cera.position.y = 0.08;
    const plato = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.015, 14), materialToon('#c9a227'));
    this.llama = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 8), new THREE.MeshBasicMaterial({ color: '#ffb347' }));
    this.llama.position.y = 0.2;
    this.llama.userData.outlineParameters = { visible: false };
    this.vela.add(cera, plato, this.llama);
    scene.add(this.vela);
    this.luzVela = new THREE.PointLight('#ffa64d', 0, 4.5, 2);
    this.luzVela.position.set(VELA.x, VELA.y + 0.3, VELA.z);
    scene.add(this.luzVela);
  }

  reiniciar() {
    this.cortada = false; // la llave está abajo
    this.veces = 0; // cuántas veces se cortó en esta partida
    this.tiempoCortada = 0;
    this.parpadeo = null; // { pasos, i, t }
    this.corriente = 1;
    this.palanca.rotation.x = 0;
    this.lucecita.material.color.set('#52b788');
    this.llama.visible = false;
    this.luzVela.intensity = 0;
  }

  // ¿El jugador está mirando el tablero? (el primer objeto que toca el rayo tiene que ser el tablero)
  mirado(camera) {
    if (camera.position.distanceToSquared(this.raiz.position) > 16) return false; // (lejos: ni tiramos el rayo)
    this.raycaster.setFromCamera(this.centroPantalla, camera);
    const choques = this.raycaster.intersectObjects([...this.house.obstaculos, this.raiz], true);
    if (choques.length === 0) return false;
    for (let obj = choques[0].object; obj; obj = obj.parent) if (obj === this.raiz) return true;
    return false;
  }

  // Baja (cortar) o sube la llave. Arranca el parpadeo.
  bajar() {
    this.cortada = true;
    this.veces++;
    this.tiempoCortada = 0;
    this.palanca.rotation.x = Math.PI;
    this.lucecita.material.color.set('#e63946');
    this.parpadeo = { pasos: PARPADEO_CORTE, i: 0, t: 0 };
  }

  subir() {
    this.cortada = false;
    this.palanca.rotation.x = 0;
    this.lucecita.material.color.set('#52b788');
    this.parpadeo = { pasos: PARPADEO_VUELTA, i: 0, t: 0 };
  }

  // Cada frame: avanza el parpadeo (si hay) y hace titilar la vela. Devuelve la corriente (0 a 1).
  // pisoJugador: la luz de la vela solo alumbra si estás en su piso (si no, se metería por el techo)
  update(dt, pisoJugador) {
    if (this.cortada) this.tiempoCortada += dt;
    const p = this.parpadeo;
    if (p) {
      p.t += dt;
      while (p.i < p.pasos.length && p.t >= p.pasos[p.i][0]) {
        p.t -= p.pasos[p.i][0];
        p.i++;
      }
      if (p.i >= p.pasos.length) {
        this.parpadeo = null;
        this.corriente = this.cortada ? 0 : 1;
      } else {
        this.corriente = p.pasos[p.i][1];
      }
    }
    // Doña Pocha prende la vela cuando ya se apagó todo
    const vela = this.cortada && !this.parpadeo;
    this.llama.visible = vela;
    if (vela) this.llama.scale.y = 0.85 + Math.sin(performance.now() * 0.02) * 0.1 + Math.random() * 0.1;
    this.luzVela.intensity = vela && pisoJugador === 1 ? 1.6 + Math.random() * 0.4 : 0;
    return this.corriente;
  }
}
