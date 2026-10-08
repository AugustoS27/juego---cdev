// Facu (el amigo de Tomi) esperando con las dos bicis en la entrada de autos, y la zona de escape.
//
// La zona es un círculo en el piso, al lado de Facu.
//  - Mientras faltan juguetes: el círculo es gris y apagado.
//  - Con los 3 juguetes: se pone verde, late, y aparece una flecha flotando encima.
// Game pregunta en cada frame si el jugador está adentro del círculo (contiene).
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { crearFacu } from './Personajes.js';

// Dónde espera Facu (mirando hacia la casa) y dónde están las bicis (con la rueda de adelante hacia la calle)
const FACU = { x: -11.1, z: 16.2 };
const BICIS = [
  { x: -12.6, z: 16.9, color: '#e63946' }, // la de Tomi
  { x: -13.6, z: 16.9, color: '#3a86ff' }, // la de Facu
];
// La zona de escape queda adelante de Facu y las bicis
export const ZONA_ESCAPE = { x: -12.25, z: 14.4, radio: 1.3 };

export class ZonaDeEscape {
  constructor(scene, house) {
    this.scene = scene;
    this.house = house;
    this.activa = false;
    this.tiempo = 0;

    for (const bici of BICIS) this.crearBici(bici);
    this.crearFacu();
    this.crearZona();
  }

  // ------------------------------------------------------------
  //  LAS BICIS (formas básicas)
  // ------------------------------------------------------------
  // Un caño que va del punto a al punto b (un cilindro estirado y girado)
  tubo(padre, a, b, radio, color) {
    const direccion = new THREE.Vector3().subVectors(b, a);
    const malla = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, direccion.length(), 8), materialToon(color));
    malla.position.copy(a).add(b).multiplyScalar(0.5);
    malla.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direccion.normalize());
    malla.castShadow = true;
    malla.userData.estatico = true;
    padre.add(malla);
    return malla;
  }

  // Bici apoyada en su patita (un poco inclinada). Las ruedas son aros (toros) parados.
  crearBici({ x, z, color }) {
    const grupo = new THREE.Group();
    grupo.position.set(x, 0, z);
    grupo.rotation.z = 0.12; // inclinada sobre la patita
    this.scene.add(grupo);
    const V = (px, py, pz) => new THREE.Vector3(px, py, pz);
    const R = 0.32; // radio de las ruedas
    for (const rz of [-0.5, 0.5]) {
      const rueda = new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 8, 24), materialToon('#222222'));
      rueda.position.set(0, R, rz);
      rueda.rotation.y = Math.PI / 2; // parada, a lo largo de la bici
      rueda.castShadow = true;
      rueda.userData.estatico = true;
      grupo.add(rueda);
      this.tubo(grupo, V(-0.04, R, rz), V(0.04, R, rz), 0.04, '#adb5bd'); // eje
    }
    // Cuadro: el triángulo de caños entre el pedalier, el asiento y el manubrio
    const pedalier = V(0, 0.32, -0.02);
    const asiento = V(0, 0.78, -0.18);
    const manubrio = V(0, 0.85, 0.4);
    this.tubo(grupo, pedalier, asiento, 0.025, color);
    this.tubo(grupo, pedalier, V(0, 0.7, 0.36), 0.025, color);
    this.tubo(grupo, V(0, 0.7, -0.15), V(0, 0.72, 0.36), 0.025, color);
    this.tubo(grupo, pedalier, V(0, R, -0.5), 0.02, color); // hacia la rueda de atrás
    this.tubo(grupo, asiento, V(0, R, -0.5), 0.02, color);
    this.tubo(grupo, manubrio, V(0, R, 0.5), 0.022, '#adb5bd'); // horquilla
    this.tubo(grupo, V(-0.25, 0.88, 0.42), V(0.25, 0.88, 0.42), 0.02, '#adb5bd'); // manubrio
    for (const lado of [-1, 1]) this.tubo(grupo, V(lado * 0.22, 0.88, 0.42), V(lado * 0.3, 0.88, 0.42), 0.03, '#222222'); // puños
    const sillin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.24), materialToon('#222222'));
    sillin.position.copy(asiento).setY(asiento.y + 0.03);
    sillin.userData.estatico = true;
    grupo.add(sillin);
    this.tubo(grupo, V(0, 0.15, 0.05), V(0.18, 0, 0.05), 0.012, '#6c757d'); // patita
    // Colisión: una caja finita a lo largo de la bici
    this.house.colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.25, 0, z - 0.85), new THREE.Vector3(x + 0.25, 1, z + 0.85)));
  }

  // ------------------------------------------------------------
  //  FACU (ver Personajes.js): espera mirando hacia la casa, con el walkie a la altura de la boca
  // ------------------------------------------------------------
  crearFacu() {
    const facu = crearFacu();
    facu.cuerpo.position.set(FACU.x, 0, FACU.z);
    facu.cuerpo.rotation.y = Math.PI; // mira hacia la casa (-Z)
    this.scene.add(facu.cuerpo);
    this.brazoFacu = facu.brazoWalkie;
    this.brazoFacu.rotation.x = -2.3; // walkie a la altura de la boca
    // Facu no se mueve (salvo el brazo del walkie): todo lo demás se junta con el resto (ver Optimizar.js)
    const delBrazo = new Set();
    this.brazoFacu.traverse((m) => delBrazo.add(m));
    facu.cuerpo.traverse((m) => {
      if (m.isMesh && !delBrazo.has(m)) m.userData.estatico = true;
    });
    this.house.colliders.push(
      new THREE.Box3(new THREE.Vector3(FACU.x - 0.3, 0, FACU.z - 0.3), new THREE.Vector3(FACU.x + 0.3, 1.4, FACU.z + 0.3)),
    );
  }

  // ------------------------------------------------------------
  //  LA ZONA DE ESCAPE
  // ------------------------------------------------------------
  crearZona() {
    const { x, z, radio } = ZONA_ESCAPE;
    // Materiales "básicos" (sin luces): así el círculo parece que brilla
    this.materialAro = new THREE.MeshBasicMaterial({ color: '#8d99ae', transparent: true, opacity: 0.6 });
    this.materialDisco = new THREE.MeshBasicMaterial({ color: '#8d99ae', transparent: true, opacity: 0.15 });

    this.aro = new THREE.Mesh(new THREE.RingGeometry(radio - 0.15, radio, 40), this.materialAro);
    this.aro.rotation.x = -Math.PI / 2; // acostado en el piso
    this.aro.position.set(x, 0.03, z);
    this.disco = new THREE.Mesh(new THREE.CircleGeometry(radio - 0.15, 40), this.materialDisco);
    this.disco.rotation.x = -Math.PI / 2;
    this.disco.position.set(x, 0.025, z);

    // Flecha que flota encima (solo cuando la zona está activa)
    this.flecha = new THREE.Group();
    const materialFlecha = new THREE.MeshBasicMaterial({ color: '#52ff8a' });
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 4), materialFlecha);
    punta.rotation.x = Math.PI; // apuntando hacia abajo
    const palo = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), materialFlecha);
    palo.position.y = 0.5;
    this.flecha.add(punta, palo);
    this.flecha.position.set(x, 2.2, z);
    this.flecha.visible = false;

    // A ninguna de estas partes le dibujamos borde negro
    for (const malla of [this.aro, this.disco, punta, palo]) malla.userData.outlineParameters = { visible: false };

    this.scene.add(this.aro, this.disco, this.flecha);
  }

  // Prende (tenés todo) o apaga (faltan juguetes) la zona
  activar(activa) {
    this.activa = activa;
    const color = activa ? '#52ff8a' : '#8d99ae';
    this.materialAro.color.set(color);
    this.materialDisco.color.set(color);
    this.materialAro.opacity = 0.6;
    this.materialDisco.opacity = 0.15;
    this.flecha.visible = activa;
  }

  // Animación: si está activa, el círculo "late", la flecha sube y baja y Facu te saluda con el walkie
  update(dt) {
    this.tiempo += dt;
    this.brazoFacu.rotation.set(this.activa ? -2.9 : -2.3, 0, this.activa ? Math.sin(this.tiempo * 8) * 0.4 : 0);
    if (!this.activa) return;
    const latido = (Math.sin(this.tiempo * 5) + 1) / 2; // de 0 a 1
    this.materialAro.opacity = 0.6 + latido * 0.4;
    this.materialDisco.opacity = 0.15 + latido * 0.25;
    this.flecha.position.y = 2.2 + latido * 0.3;
    this.flecha.rotation.y += dt * 2;
  }

  // ¿El jugador está parado adentro del círculo? (y en el piso, no arriba de algo)
  contiene(posicion) {
    const distancia = Math.hypot(posicion.x - ZONA_ESCAPE.x, posicion.z - ZONA_ESCAPE.z);
    return distancia < ZONA_ESCAPE.radio && posicion.y < 1;
  }
}
