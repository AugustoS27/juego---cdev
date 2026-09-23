// El objeto que el ladrón tiene que encontrar.
// Cada partida se elige UN objeto al azar y UNA de sus ubicaciones posibles.
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { ALTURA_PISO } from './HouseData.js';

const DISTANCIA_PARA_AGARRAR = 2.5; // metros

// ------------------------------------------------------------
//  Funciones que arman cada objeto con formas básicas.
//  Todos están un poco agrandados (estilo dibujito) para que se vean.
// ------------------------------------------------------------
function caja(ancho, alto, prof, color, x = 0, y = 0, z = 0) {
  const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, prof), materialToon(color));
  malla.position.set(x, y + alto / 2, z); // y = base de la caja
  return malla;
}

function cilindro(radio, alto, color, x = 0, y = 0, z = 0) {
  const malla = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, alto, 20), materialToon(color));
  malla.position.set(x, y + alto / 2, z);
  return malla;
}

function esfera(radio, color, x = 0, y = 0, z = 0) {
  const malla = new THREE.Mesh(new THREE.SphereGeometry(radio, 16, 12), materialToon(color));
  malla.position.set(x, y, z);
  return malla;
}

function crearLlaves() {
  const grupo = new THREE.Group();
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), materialToon('#c0c0c0'));
  aro.rotation.x = Math.PI / 2; // acostado
  aro.position.y = 0.012;
  grupo.add(aro);
  grupo.add(caja(0.16, 0.012, 0.03, '#ffd23f', 0.12, 0, 0)); // llave dorada
  grupo.add(cilindro(0.035, 0.012, '#ffd23f', 0.05, 0, 0));
  grupo.add(caja(0.14, 0.012, 0.03, '#c0c0c0', -0.02, 0, 0.1)); // llave plateada
  return grupo;
}

function crearControlRemoto() {
  const grupo = new THREE.Group();
  grupo.add(caja(0.24, 0.035, 0.07, '#222222'));
  grupo.add(esfera(0.012, '#ff3b30', -0.08, 0.037, 0)); // botón de encendido
  for (let i = 0; i < 3; i++) grupo.add(caja(0.025, 0.01, 0.04, '#9e9e9e', 0.0 + i * 0.04, 0.035, 0));
  return grupo;
}

function crearCargador() {
  const grupo = new THREE.Group();
  grupo.add(caja(0.08, 0.06, 0.08, '#ffffff', -0.08, 0, 0)); // la "cajita"
  grupo.add(caja(0.012, 0.03, 0.005, '#c0c0c0', -0.095, 0.06, 0)); // patitas del enchufe
  grupo.add(caja(0.012, 0.03, 0.005, '#c0c0c0', -0.065, 0.06, 0));
  grupo.add(caja(0.18, 0.012, 0.012, '#ffffff', 0.05, 0, 0)); // cable
  grupo.add(caja(0.04, 0.02, 0.025, '#9e9e9e', 0.16, 0, 0)); // puntita USB
  return grupo;
}

function crearSarten() {
  const grupo = new THREE.Group();
  grupo.add(cilindro(0.17, 0.05, '#333333'));
  grupo.add(cilindro(0.15, 0.052, '#555555', 0, 0.001, 0)); // fondo un poco más claro
  grupo.add(caja(0.25, 0.03, 0.04, '#8d5524', 0.28, 0.01, 0)); // mango
  return grupo;
}

function crearAbrelatas() {
  const grupo = new THREE.Group();
  grupo.add(caja(0.18, 0.02, 0.03, '#e4572e', -0.06, 0, -0.02)); // mangos rojos
  grupo.add(caja(0.18, 0.02, 0.03, '#e4572e', -0.06, 0, 0.02));
  grupo.add(cilindro(0.035, 0.03, '#c0c0c0', 0.06, 0, 0)); // cabeza metálica
  grupo.add(caja(0.04, 0.04, 0.012, '#9e9e9e', 0.1, 0.005, 0)); // la "llavecita" para girar
  return grupo;
}

function crearPatito() {
  const grupo = new THREE.Group();
  const cuerpo = esfera(0.08, '#ffd23f', 0, 0.06, 0);
  cuerpo.scale.set(1.2, 0.8, 1);
  grupo.add(cuerpo);
  grupo.add(esfera(0.05, '#ffd23f', 0.06, 0.14, 0)); // cabeza
  grupo.add(caja(0.04, 0.015, 0.03, '#ff8c00', 0.115, 0.13, 0)); // pico
  grupo.add(esfera(0.008, '#000000', 0.09, 0.16, 0.025)); // ojitos
  grupo.add(esfera(0.008, '#000000', 0.09, 0.16, -0.025));
  return grupo;
}

// ------------------------------------------------------------
//  LISTA DE OBJETOS
//  pista: el acertijo que ve el jugador.
//  ubicaciones: lugares lógicos donde puede aparecer.
//    piso = 0 (planta baja) o 1 (planta alta); y = altura sobre ese piso
//    (la superficie del mueble donde está apoyado).
// ------------------------------------------------------------
export const OBJETOS = [
  {
    nombre: 'las llaves',
    pista: 'Tintineamos, abrimos la puerta y siempre desaparecemos cuando estás apurado.',
    crear: crearLlaves,
    ubicaciones: [
      { lugar: 'mueble de la entrada', piso: 0, x: -2.4, y: 0.9, z: 5.6 },
      { lugar: 'aparador del comedor', piso: 0, x: 8.6, y: 0.9, z: -0.6 },
      { lugar: 'cómoda del dormitorio', piso: 1, x: -8.2, y: 0.9, z: 5.6 },
      { lugar: 'mesa de luz', piso: 1, x: -8.6, y: 0.5, z: 1.3 },
    ],
  },
  {
    nombre: 'el control remoto',
    pista: 'Sin mí nadie cambia de canal. Me suelen esconder entre los almohadones.',
    crear: crearControlRemoto,
    ubicaciones: [
      { lugar: 'sillón del living', piso: 0, x: -8.3, y: 0.45, z: 0.6 },
      { lugar: 'mesa ratona', piso: 0, x: -7, y: 0.4, z: 0.3 },
      { lugar: 'mueble de la tele', piso: 0, x: -3.6, y: 0.5, z: 0.25 },
      { lugar: 'cama del dormitorio', piso: 1, x: -7.4, y: 0.66, z: 0.4 },
    ],
  },
  {
    nombre: 'el cargador',
    pista: 'Le doy de comer a tu celular, pero solo si estoy enchufado.',
    crear: crearCargador,
    ubicaciones: [
      { lugar: 'escritorio del estudio', piso: 1, x: 8.4, y: 0.78, z: 0.3 },
      { lugar: 'escritorio del hijo', piso: 1, x: 0.4, y: 0.78, z: -5.6 },
      { lugar: 'mesa de luz', piso: 1, x: -8.6, y: 0.5, z: -1.3 },
      { lugar: 'mesada de la cocina', piso: 0, x: 1, y: 0.96, z: -5.5 },
    ],
  },
  {
    nombre: 'la sartén',
    pista: 'Soy redonda, tengo mango y los huevos fritos me aman.',
    crear: crearSarten,
    ubicaciones: [
      { lugar: 'mesada de la cocina', piso: 0, x: -1.5, y: 0.96, z: -5.5 },
      { lugar: 'mesa de la cocina', piso: 0, x: -1, y: 0.78, z: -3.8 },
      { lugar: 'mesada, al lado de la heladera', piso: 0, x: 0.9, y: 0.96, z: -5.5 },
      { lugar: 'mesa del comedor', piso: 0, x: 7, y: 0.78, z: 0.2 },
    ],
  },
  {
    nombre: 'el abrelatas',
    pista: 'Algo para abrir latas.',
    crear: crearAbrelatas,
    ubicaciones: [
      { lugar: 'mesada de la cocina', piso: 0, x: 0.3, y: 0.96, z: -5.45 },
      { lugar: 'mesa de la cocina', piso: 0, x: -0.6, y: 0.78, z: -3.6 },
      { lugar: 'aparador del comedor', piso: 0, x: 8.6, y: 0.9, z: -1.4 },
    ],
  },
  {
    nombre: 'el patito de goma',
    pista: 'Soy amarillo, floto y me encanta la hora del baño.',
    crear: crearPatito,
    ubicaciones: [
      { lugar: 'bañera de abajo', piso: 0, x: 4.2, y: 0.4, z: -3.3 },
      { lugar: 'bañera de arriba', piso: 1, x: 8.5, y: 0.4, z: -4.5 },
      { lugar: 'lavamanos de abajo', piso: 0, x: 6, y: 0.85, z: -5.65 },
      { lugar: 'lavamanos de arriba', piso: 1, x: 5.5, y: 0.85, z: -5.65 },
    ],
  },
];

// Elige un elemento al azar de un arreglo
function alAzar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

export class Items {
  constructor(scene) {
    this.scene = scene;
    this.objeto = null; // datos del objeto elegido (de OBJETOS)
    this.ubicacion = null; // ubicación elegida
    this.malla = null; // el objeto en la escena
    this.tiempo = 0; // para la animación

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = DISTANCIA_PARA_AGARRAR;
    this.centroPantalla = new THREE.Vector2(0, 0);
  }

  // Sortea objeto + ubicación y lo pone en la casa (borrando el de la partida anterior).
  // Los parámetros son opcionales: sirven para probar un objeto/lugar en particular.
  elegirObjetoAlAzar(objeto = alAzar(OBJETOS), ubicacion = alAzar(objeto.ubicaciones)) {
    if (this.malla) this.scene.remove(this.malla);

    this.objeto = objeto;
    this.ubicacion = ubicacion;

    this.malla = this.objeto.crear();
    const { piso, x, y, z } = this.ubicacion;
    this.alturaBase = piso * ALTURA_PISO + y;
    this.malla.position.set(x, this.alturaBase, z);
    this.malla.traverse((hijo) => (hijo.castShadow = true));

    // "Zona para apuntar": una esfera invisible más grande que el objeto.
    // Así no hace falta apuntar al milímetro para agarrar algo chiquito.
    const zona = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial());
    zona.visible = false; // no se ve, pero el raycaster la detecta igual
    zona.position.y = 0.1;
    this.malla.add(zona);

    this.scene.add(this.malla);

    if (import.meta.env.DEV) {
      console.log(`[debug] Objeto: ${this.objeto.nombre} en ${this.ubicacion.lugar}`, this.ubicacion);
    }
  }

  // Animación: "flota" un poquito para que se distinga (es un dibujito).
  // No lo hacemos girar porque podría atravesar paredes o muebles cercanos.
  update(dt) {
    if (!this.malla) return;
    this.tiempo += dt;
    this.malla.position.y = this.alturaBase + 0.03 + Math.sin(this.tiempo * 3) * 0.02;
    // Recalculamos su posición en el mundo ya mismo: el raycaster la necesita actualizada
    this.malla.updateMatrixWorld(true);
  }

  // ¿La mira del jugador apunta al objeto, está cerca y no hay nada en el medio?
  // Tiramos un rayo desde el centro de la cámara y vemos qué es lo PRIMERO que toca.
  estaMirandoElObjeto(camera) {
    if (!this.malla) return false;
    this.raycaster.setFromCamera(this.centroPantalla, camera);
    const choques = this.raycaster.intersectObjects(this.scene.children, true);
    if (choques.length === 0) return false;

    // Subimos por los "padres" de lo que tocó para ver si es parte del objeto
    let obj = choques[0].object;
    while (obj) {
      if (obj === this.malla) return true;
      obj = obj.parent;
    }
    return false;
  }
}
