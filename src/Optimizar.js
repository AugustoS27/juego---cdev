// Rendimiento: juntar lo que no se mueve.
//
// Dibujar cada malla tiene un costo fijo (una "llamada de dibujo" a la placa de video), y la casa
// tiene cientos de cajitas: tramos de pared (¡con un color por cara, o sea hasta 6 dibujos cada uno!),
// escalones, barrotes, marcos de ventanas, nubes... Con la casa gigante eran más de 2000 dibujos
// por frame y en una placa de video integrada eso se nota mucho.
//
// Idea: todas las mallas marcadas como estáticas (userData.estatico = true) se copian, ya ubicadas
// en su lugar del mundo, en UNA sola malla por material. Pasamos de cientos de dibujos a unas decenas.
// Las mallas originales quedan en la escena pero invisibles: los rayos (el suelo, la visión del
// dueño, la mira del jugador) las siguen usando igual que antes, así que nada más cambia.
// (Las mallas juntadas, en cambio, los rayos las ignoran.)
//
// "Capas": las mallas con userData.capa (ej: 'piso2') se juntan aparte de las demás, así después
// se pueden mostrar u ocultar juntas (los muebles de cada piso, ver House.mostrarPisosCercanos).
// Se puede llamar varias veces: las que ya se juntaron quedaron invisibles y no se repiten.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const ATRIBUTOS = ['position', 'normal', 'uv'];

export function juntarMallasEstaticas(scene) {
  scene.updateMatrixWorld(true);
  const porMaterial = new Map(); // clave -> { material, sombra, geometrias: [] }
  const juntadas = [];

  scene.traverse((malla) => {
    if (!malla.isMesh || !malla.userData.estatico || !malla.visible || malla.userData.outlineParameters) return;
    const geometria = geometriaEnElMundo(malla);
    // Con una lista de materiales, cada "grupo" de la geometría usa uno (una caja con un color por
    // cara tiene 6 grupos). Con un solo material, va toda la geometría junta.
    const variosMateriales = Array.isArray(malla.material);
    const grupos = variosMateriales && geometria.groups.length > 0
      ? geometria.groups
      : [{ start: 0, count: geometria.attributes.position.count, materialIndex: 0 }];
    for (const { start, count, materialIndex } of grupos) {
      const material = variosMateriales ? malla.material[materialIndex] : malla.material;
      if (!material) continue;
      const capa = malla.userData.capa || '';
      const clave = `${capa}|${material.uuid}${malla.castShadow ? '+sombra' : ''}`;
      if (!porMaterial.has(clave)) porMaterial.set(clave, { material, capa, sombra: malla.castShadow, geometrias: [] });
      porMaterial.get(clave).geometrias.push(pedazo(geometria, start, count));
    }
    juntadas.push(malla);
  });

  const porCapa = new Map(); // capa -> [mallas juntadas]
  for (const { material, capa, sombra, geometrias } of porMaterial.values()) {
    const junta = new THREE.Mesh(mergeGeometries(geometrias, false), material);
    junta.castShadow = sombra;
    junta.receiveShadow = true;
    junta.matrixAutoUpdate = false; // no se mueve nunca
    junta.raycast = () => {}; // los rayos usan las originales (invisibles), no esta
    scene.add(junta);
    if (!porCapa.has(capa)) porCapa.set(capa, []);
    porCapa.get(capa).push(junta);
  }
  for (const malla of juntadas) malla.visible = false;

  return { antes: juntadas.length, despues: porMaterial.size, porCapa };
}

// Lo mismo, pero adentro de un grupo que se tiene que poder mover u ocultar entero (Facu y las bicis,
// que salen en las cinemáticas): sus mallas se juntan en una por material, pero quedan en el grupo.
// excepto: las partes que se animan solas (un brazo, las piernas): esas no se tocan.
// Hay que llamarla con el grupo todavía en el origen, sin moverlo ni girarlo.
export function juntarGrupo(grupo, excepto = []) {
  grupo.updateMatrixWorld(true);
  const quedan = new Set();
  for (const pieza of excepto) pieza.traverse((m) => quedan.add(m));
  const porMaterial = new Map(); // clave -> { material, sombra, sinBorde, geometrias: [] }
  const juntadas = [];
  grupo.traverse((malla) => {
    if (!malla.isMesh || quedan.has(malla) || Array.isArray(malla.material)) return;
    const sinBorde = !!malla.userData.outlineParameters;
    const clave = `${malla.material.uuid}${malla.castShadow ? '+sombra' : ''}${sinBorde ? '-borde' : ''}`;
    if (!porMaterial.has(clave)) porMaterial.set(clave, { material: malla.material, sombra: malla.castShadow, sinBorde, geometrias: [] });
    porMaterial.get(clave).geometrias.push(geometriaEnElMundo(malla));
    juntadas.push(malla);
  });
  for (const malla of juntadas) malla.removeFromParent();
  for (const { material, sombra, sinBorde, geometrias } of porMaterial.values()) {
    const junta = new THREE.Mesh(mergeGeometries(geometrias, false), material);
    junta.castShadow = sombra;
    junta.receiveShadow = true;
    if (sinBorde) junta.userData.outlineParameters = { visible: false };
    grupo.add(junta);
  }
}

// Copia de la geometría de la malla, sin índices (cada triángulo con sus 3 vértices propios),
// ya movida/rotada/escalada a su lugar del mundo y solo con posición, normal y uv.
function geometriaEnElMundo(malla) {
  const geometria = malla.geometry.index ? malla.geometry.toNonIndexed() : malla.geometry.clone();
  for (const nombre of Object.keys(geometria.attributes)) {
    if (!ATRIBUTOS.includes(nombre)) geometria.deleteAttribute(nombre);
  }
  if (!geometria.attributes.uv) {
    geometria.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometria.attributes.position.count * 2), 2));
  }
  if (!geometria.attributes.normal) geometria.computeVertexNormals();
  geometria.applyMatrix4(malla.matrixWorld);
  return geometria;
}

// Los vértices [start, start + count) de una geometría sin índices, como geometría nueva
function pedazo(geometria, start, count) {
  const nueva = new THREE.BufferGeometry();
  for (const nombre of ATRIBUTOS) {
    const atributo = geometria.attributes[nombre];
    const n = atributo.itemSize;
    nueva.setAttribute(nombre, new THREE.BufferAttribute(atributo.array.slice(start * n, (start + count) * n), n));
  }
  return nueva;
}
