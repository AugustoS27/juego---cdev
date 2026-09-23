// Carga de modelos GLTF (.glb). Los modelos de /public/models son de Kenney (licencia CC0).
//
// Idea principal: cada cosa del juego primero se arma con formas básicas (cajas, esferas).
// Después se intenta cargar un modelo y se lo "encaja" en la caja que ocupaba esa forma básica.
// Si el modelo no carga, queda la forma básica: el juego funciona igual.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { convertirAToon } from './Materials.js';

const loader = new GLTFLoader();

// Caché: cada archivo se descarga UNA sola vez; después se devuelven copias (clones).
// (Las copias comparten geometría y materiales, así que son muy livianas.)
const cache = new Map();

export function cargarModelo(url) {
  if (!cache.has(url)) {
    const promesa = loader.loadAsync(url).then((gltf) => {
      const modelo = gltf.scene;
      convertirAToon(modelo); // para que combine con el resto del juego
      modelo.traverse((hijo) => {
        if (hijo.isMesh) {
          hijo.castShadow = true;
          hijo.receiveShadow = true;
        }
      });
      return modelo;
    });
    cache.set(url, promesa);
  }
  return cache.get(url).then((original) => original.clone(true));
}

// Escala y mueve el modelo para que ocupe la caja [x, y, z, ancho, alto, prof]
// (x, z = centro; y = base; igual que las "partes" de los muebles).
//   estirar = true:  ocupa la caja exacta (puede deformarse un poco). Así las colisiones y
//                    las cosas apoyadas encima siguen coincidiendo con la forma básica.
//   estirar = false: mantiene sus proporciones y entra en la caja (para árboles y plantas).
export function encajarEnCaja(modelo, [x, y, z, ancho, alto, prof], estirar = true) {
  modelo.updateMatrixWorld(true);
  const tamaño = new THREE.Box3().setFromObject(modelo).getSize(new THREE.Vector3());
  const escala = new THREE.Vector3(ancho / tamaño.x, alto / tamaño.y, prof / tamaño.z);
  if (!estirar) escala.setScalar(Math.min(escala.x, escala.y, escala.z));
  modelo.scale.multiply(escala);

  // Centramos en x/z y apoyamos la base en y
  modelo.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(modelo);
  const centro = caja.getCenter(new THREE.Vector3());
  modelo.position.x += x - centro.x;
  modelo.position.z += z - centro.z;
  modelo.position.y += y - caja.min.y;
  return modelo;
}

// Carga uno o varios modelos y los encaja cada uno en su caja.
// piezas: [{ archivo, caja: [x, y, z, ancho, alto, prof], rot }]  (rot en grados, opcional)
// Devuelve un grupo con todas las piezas (o falla si alguna no carga).
export async function cargarPiezas(piezas, estirar = true) {
  const grupo = new THREE.Group();
  const modelos = await Promise.all(piezas.map((p) => cargarModelo(p.archivo)));
  modelos.forEach((modelo, i) => {
    // La rotación se aplica en un grupo intermedio, así la caja se mide ya rotada
    const contenedor = new THREE.Group();
    contenedor.add(modelo);
    modelo.rotation.y = THREE.MathUtils.degToRad(piezas[i].rot || 0);
    encajarEnCaja(contenedor, piezas[i].caja, estirar);
    grupo.add(contenedor);
  });
  return grupo;
}
