// Materiales "de dibujito" compartidos por todo el juego.
import * as THREE from 'three';

// El MeshToonMaterial usa una textura chiquita para decidir en cuántas
// "bandas" se divide la luz. Con 3 tonos (sombra, medio, luz) se ve como un cartoon.
function crearGradiente() {
  const tonos = new Uint8Array([80, 170, 255]);
  const textura = new THREE.DataTexture(tonos, tonos.length, 1, THREE.RedFormat);
  textura.minFilter = THREE.NearestFilter; // Nearest = cortes duros entre tonos
  textura.magFilter = THREE.NearestFilter;
  textura.needsUpdate = true;
  return textura;
}

const gradiente = crearGradiente();

// Guardamos los materiales ya creados para no repetir uno por cada caja del mismo color.
const cache = new Map();

export function materialToon(color) {
  if (!cache.has(color)) {
    cache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradiente }));
  }
  return cache.get(color);
}

// Material toon con una textura (ej: la madera del piso). El color "tiñe" la textura.
export function materialConTextura(color, textura) {
  return new THREE.MeshToonMaterial({ color, map: textura, gradientMap: gradiente });
}

// Algunos colores de los modelos de Kenney los cambiamos por los de nuestra paleta
// (según el nombre del material que trae el modelo)
const COLORES_REEMPLAZO = {
  leafsGreen: '#52b788', // hojas: verde en vez de turquesa
  leafsDark: '#2d6a4f',
  woodBark: '#9c6644', // troncos: marrón en vez de naranja
  grass: '#6ab04c',
};

// Reemplaza los materiales de un modelo GLTF por materiales toon.
// Los colores de Kenney son pasteles: les subimos un poco la saturación para que
// combinen con los colores vivos del resto del juego.
export function convertirAToon(objeto) {
  const convertir = (viejo) => {
    const color = COLORES_REEMPLAZO[viejo.name]
      ? new THREE.Color(COLORES_REEMPLAZO[viejo.name])
      : viejo.color ? viejo.color.clone() : new THREE.Color('#ffffff');
    const hsl = {};
    color.getHSL(hsl);
    color.setHSL(hsl.h, Math.min(1, hsl.s * 1.35), hsl.l * 0.9);
    return new THREE.MeshToonMaterial({ color, map: viejo.map || null, gradientMap: gradiente });
  };
  objeto.traverse((hijo) => {
    if (!hijo.isMesh) return;
    // Una malla puede tener un material o una lista de materiales
    hijo.material = Array.isArray(hijo.material) ? hijo.material.map(convertir) : convertir(hijo.material);
  });
}
