// La van negra del cómplice, estacionada en la entrada de autos del frente, y la zona de escape.
//
// La zona es un círculo en el piso, atrás de la van (con las puertas traseras abiertas).
//  - Mientras faltan objetos: el círculo es gris y apagado.
//  - Con los 5 objetos: se pone verde, late, y aparece una flecha flotando encima.
// Game pregunta en cada frame si el jugador está adentro del círculo (contiene).
import * as THREE from 'three';
import { materialToon } from './Materials.js';

// Dónde está estacionada la van (centro) y hacia dónde mira: la trompa hacia la calle (+Z)
const VAN = { x: -12.25, z: 16.6, ancho: 2.1, largo: 5, alto: 2.3 };
// La zona de escape queda atrás de la van
export const ZONA_ESCAPE = { x: VAN.x, z: VAN.z - VAN.largo / 2 - 1.5, radio: 1.3 };

const COLOR_VAN = '#23232b';
const COLOR_VIDRIO = '#4a5d6b';

export class ZonaDeEscape {
  constructor(scene, house) {
    this.scene = scene;
    this.house = house;
    this.activa = false;
    this.tiempo = 0;

    this.crearVan();
    this.crearZona();
  }

  // ------------------------------------------------------------
  //  LA VAN (formas básicas + un cartel dibujado en un canvas)
  // ------------------------------------------------------------
  crearVan() {
    const { x, z, ancho, largo, alto } = VAN;
    const grupo = new THREE.Group();
    grupo.position.set(x, 0, z);
    this.scene.add(grupo);

    // Una caja del grupo. (px, py, pz) = centro de la base, relativo a la van
    const parte = (w, h, d, color, px, py, pz, sombra = true) => {
      const malla = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materialToon(color));
      malla.position.set(px, py + h / 2, pz);
      malla.castShadow = sombra;
      malla.receiveShadow = true;
      grupo.add(malla);
      return malla;
    };

    const atras = -largo / 2; // la cola de la van (mira a la casa)
    const adelante = largo / 2; // la trompa (mira a la calle)

    // Carrocería: la caja de carga + la cabina un poco más baja con el capó
    parte(ancho, alto - 0.4, largo - 1, COLOR_VAN, 0, 0.4, -0.5);
    parte(ancho, 0.7, 1, COLOR_VAN, 0, 0.4, adelante - 0.5); // capó
    parte(ancho - 0.1, 0.8, 0.05, COLOR_VIDRIO, 0, 1.15, adelante - 1.02, false); // parabrisas
    for (const lado of [-1, 1]) {
      parte(0.05, 0.6, 0.8, COLOR_VIDRIO, lado * (ancho / 2 + 0.01), 1.25, adelante - 1.5, false); // ventanillas
      parte(0.3, 0.12, 0.05, '#fff3b0', lado * 0.7, 0.75, adelante + 0.01, false); // faros
      parte(0.12, 0.3, 0.05, '#e63946', lado * (ancho / 2 - 0.08), 1, atras - 0.01, false); // luces traseras (en las esquinas)
    }
    parte(ancho + 0.1, 0.2, 0.15, '#6c757d', 0, 0.35, adelante); // paragolpes
    parte(ancho + 0.1, 0.2, 0.15, '#6c757d', 0, 0.35, atras);
    // Ruedas (cilindros acostados)
    for (const [px, pz] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) {
      const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16), materialToon('#111111'));
      rueda.rotation.z = Math.PI / 2;
      rueda.position.set(px, 0.38, pz);
      rueda.castShadow = true;
      grupo.add(rueda);
      const taza = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 12), materialToon('#adb5bd'));
      taza.rotation.z = Math.PI / 2;
      taza.position.copy(rueda.position);
      grupo.add(taza);
    }

    // "Interior" de la caja de carga, que se ve por las puertas abiertas: un panel más claro
    // pegado a la cola (la carrocería es una caja maciza, así que simulamos el hueco)
    parte(ancho - 0.4, alto - 0.6, 0.02, '#4a4a55', 0, 0.5, atras - 0.005, false);

    // Puertas traseras abiertas de par en par (giran sobre su bisagra, en los costados)
    for (const lado of [-1, 1]) {
      const bisagra = new THREE.Group();
      bisagra.position.set(lado * (ancho / 2), 0.45, atras);
      bisagra.rotation.y = lado * -1.9; // abiertas un poco más de 90°
      grupo.add(bisagra);
      const puerta = new THREE.Mesh(new THREE.BoxGeometry(ancho / 2, alto - 0.55, 0.06), materialToon(COLOR_VAN));
      puerta.position.set(-lado * (ancho / 4), (alto - 0.55) / 2, 0);
      puerta.castShadow = true;
      bisagra.add(puerta);
      // Colisión de la puerta abierta: una caja finita desde la bisagra hacia atrás
      const bordeX = x + lado * (ancho / 2);
      this.house.colliders.push(
        new THREE.Box3(
          new THREE.Vector3(Math.min(bordeX, bordeX + lado * 0.4), 0, z + atras - 1),
          new THREE.Vector3(Math.max(bordeX, bordeX + lado * 0.4), alto, z + atras),
        ),
      );
    }

    // Cartel en los costados (dibujado en un canvas)
    const cartel = crearTexturaCartel();
    for (const lado of [-1, 1]) {
      const placa = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 0.96), new THREE.MeshToonMaterial({ map: cartel, transparent: true }));
      placa.position.set(lado * (ancho / 2 + 0.02), 1.3, -0.95);
      placa.rotation.y = lado * (Math.PI / 2);
      placa.userData.outlineParameters = { visible: false }; // sin borde negro alrededor del cartel
      grupo.add(placa);
    }

    // Colisión: la van entera es una caja (el jugador no la atraviesa)
    this.house.colliders.push(
      new THREE.Box3(new THREE.Vector3(x - ancho / 2, 0, z + atras), new THREE.Vector3(x + ancho / 2, alto, z + adelante)),
    );
    grupo.updateMatrixWorld(true);
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

  // Prende (tenés todo) o apaga (faltan objetos) la zona
  activar(activa) {
    this.activa = activa;
    const color = activa ? '#52ff8a' : '#8d99ae';
    this.materialAro.color.set(color);
    this.materialDisco.color.set(color);
    this.materialAro.opacity = 0.6;
    this.materialDisco.opacity = 0.15;
    this.flecha.visible = activa;
  }

  // Animación: si está activa, el círculo "late" y la flecha sube y baja
  update(dt) {
    this.tiempo += dt;
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

// El cartel de la van: letras blancas sobre fondo transparente
function crearTexturaCartel() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 166;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('NO SOMOS', 256, 52);
  ctx.fillText('LADRONES S.A.', 256, 102);
  ctx.font = 'italic 26px sans-serif';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('Mudanzas rápidas · Sin preguntas', 256, 146);
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}
