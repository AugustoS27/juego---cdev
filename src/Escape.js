// Facu (el amigo de Tomi) esperando con las dos bicis en la entrada de autos, y la zona de escape.
// Facu, las bicis y la tranquera de los autos salen en las cinemáticas (ver Escenas.js): por eso no
// se juntan con el resto del escenario (cada uno se junta aparte, ver juntarGrupo) y reiniciar() los
// vuelve a dejar en su lugar.
//
// La zona es un círculo en el piso, al lado de Facu.
//  - Mientras faltan juguetes: el círculo es gris y apagado.
//  - Con los 3 juguetes: se pone verde, late, y aparece una flecha flotando encima.
// Game pregunta en cada frame si el jugador está adentro del círculo (contiene).
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { crearFacu } from './Personajes.js';
import { juntarGrupo } from './Optimizar.js';

// Dónde espera Facu (mirando hacia la casa) y dónde están las bicis (con la rueda de adelante hacia la calle)
const FACU = { x: -11.1, z: 16.2 };
const BICIS = [
  { x: -12.6, z: 16.9, color: '#e63946' }, // la de Tomi
  { x: -13.6, z: 16.9, color: '#3a86ff' }, // la de Facu
];
// La zona de escape queda adelante de Facu y las bicis
export const ZONA_ESCAPE = { x: -12.25, z: 14.4, radio: 1.3 };
// La tranquera de la entrada de autos (en la cerca del frente): se abre en la cinemática de victoria
const TRANQUERA = { x: -14.8, z: 22, ancho: 5.1 }; // x: la bisagra (punta oeste)

export class ZonaDeEscape {
  constructor(scene, house) {
    this.scene = scene;
    this.house = house;
    this.activa = false;
    this.tiempo = 0;

    this.bicis = BICIS.map((bici) => this.crearBici(bici));
    this.crearFacu();
    this.crearTranquera();
    this.crearZona();
    this.reiniciar();
  }

  // Facu, las bicis y la tranquera vuelven a su lugar (después de una cinemática)
  reiniciar() {
    const { cuerpo, piernas, brazos, cabeza } = this.facu;
    cuerpo.position.set(FACU.x, 0, FACU.z);
    cuerpo.rotation.set(0, Math.PI, 0); // mira hacia la casa (-Z)
    cuerpo.visible = true;
    for (const parte of [...piernas, ...brazos, cabeza]) parte.rotation.set(0, 0, 0);
    this.brazoFacu.rotation.x = -2.3; // walkie a la altura de la boca
    BICIS.forEach(({ x, z }, i) => {
      this.bicis[i].position.set(x, 0, z);
      this.bicis[i].rotation.set(0, 0, 0.12); // inclinada sobre la patita
    });
    this.tranquera.rotation.y = 0;
    this.enCinematica = false; // (mientras sea true, update no toca el brazo de Facu)
    if (this.aro) {
      this.aro.visible = this.disco.visible = true;
      this.flecha.visible = this.activa;
    }
  }

  // Empieza una cinemática: Facu queda a cargo de Escenas.js y el círculo de la zona no se ve
  prepararCinematica() {
    this.enCinematica = true;
    this.aro.visible = this.disco.visible = this.flecha.visible = false;
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
    padre.add(malla);
    return malla;
  }

  // Bici (mirando hacia +Z). Las ruedas son aros (toros) parados. Devuelve el grupo, que se arma en
  // el origen y se junta en pocas mallas (una por color); reiniciar() la pone en su lugar.
  crearBici({ x, z, color }) {
    const grupo = new THREE.Group();
    const V = (px, py, pz) => new THREE.Vector3(px, py, pz);
    const R = 0.32; // radio de las ruedas
    for (const rz of [-0.5, 0.5]) {
      const rueda = new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 8, 24), materialToon('#222222'));
      rueda.position.set(0, R, rz);
      rueda.rotation.y = Math.PI / 2; // parada, a lo largo de la bici
      rueda.castShadow = true;
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
    grupo.add(sillin);
    this.tubo(grupo, V(0, 0.15, 0.05), V(0.18, 0, 0.05), 0.012, '#6c757d'); // patita
    juntarGrupo(grupo);
    this.scene.add(grupo);
    // Colisión: una caja finita a lo largo de la bici
    this.house.colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.25, 0, z - 0.85), new THREE.Vector3(x + 0.25, 1, z + 0.85)));
    return grupo;
  }

  // ------------------------------------------------------------
  //  FACU (ver Personajes.js): espera mirando hacia la casa, con el walkie a la altura de la boca
  // ------------------------------------------------------------
  crearFacu() {
    this.facu = crearFacu();
    this.brazoFacu = this.facu.brazoWalkie;
    // Rendimiento: el cuerpo y la cabeza se juntan en una malla por material (las piernas y los
    // brazos no: en las cinemáticas camina y pedalea)
    juntarGrupo(this.facu.cuerpo, [...this.facu.piernas, ...this.facu.brazos]);
    this.scene.add(this.facu.cuerpo);
    this.house.colliders.push(
      new THREE.Box3(new THREE.Vector3(FACU.x - 0.3, 0, FACU.z - 0.3), new THREE.Vector3(FACU.x + 0.3, 1.4, FACU.z + 0.3)),
    );
  }

  // La tranquera de la entrada de autos: una hoja gris que gira sobre su punta oeste
  crearTranquera() {
    const { x, z, ancho } = TRANQUERA;
    this.tranquera = new THREE.Group();
    this.tranquera.position.set(x, 0, z);
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(ancho, 1, 0.08), materialToon('#6c757d'));
    hoja.position.set(ancho / 2, 0.6, 0);
    hoja.castShadow = true;
    hoja.receiveShadow = true;
    this.tranquera.add(hoja);
    this.scene.add(this.tranquera);
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
    if (!this.enCinematica) this.brazoFacu.rotation.set(this.activa ? -2.9 : -2.3, 0, this.activa ? Math.sin(this.tiempo * 8) * 0.4 : 0);
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
