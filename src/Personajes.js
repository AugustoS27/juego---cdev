// Los personajes de la historia (etapa 15D), hechos con formas básicas (estilo dibujito, con bordes):
//   Don Ernesto (el vecino), Doña Pocha (la vecina), Tomi (el protagonista) y Facu (su amigo).
// Cada función arma el personaje mirando hacia +Z, con los pies en y = 0, y devuelve sus partes
// "con bisagra" (piernas, brazos, cabeza...) para que el que lo usa las anime:
//   Dueno.js y Abuela.js (en el juego), Escape.js (Facu esperando) y las cinemáticas.
// Las telas (a cuadros, a rayas, con lunares, tejida) se dibujan en un canvas chiquito.
import * as THREE from 'three';
import { materialToon, materialConTextura } from './Materials.js';

// ------------------------------------------------------------
//  AYUDANTES
// ------------------------------------------------------------
// Agrega una malla al padre. material: un color ('#ff0000') o un material ya hecho.
// Rendimiento: cada malla que hace sombra se dibuja otra vez en el mapa de sombras (¡aunque el
// personaje no esté a la vista!), y cada borde es otro dibujo más. Así que las partes chiquitas
// (botones, pupilas, pecas, anteojos) no hacen sombra, y las mínimas tampoco llevan borde: no se nota.
function parte(padre, geometria, material, x, y, z) {
  const malla = new THREE.Mesh(geometria, typeof material === 'string' ? materialToon(material) : material);
  malla.position.set(x, y, z);
  geometria.computeBoundingSphere();
  const tamaño = geometria.boundingSphere.radius;
  malla.castShadow = tamaño > 0.07;
  if (tamaño < 0.03) malla.userData.outlineParameters = { visible: false };
  padre.add(malla);
  return malla;
}

const esfera = (radio) => new THREE.SphereGeometry(radio, 14, 10);
const mediaEsfera = (radio) => new THREE.SphereGeometry(radio, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); // la mitad de arriba
const capsula = (radio, largo) => new THREE.CapsuleGeometry(radio, largo, 4, 10);
const cilindro = (arriba, abajo, alto) => new THREE.CylinderGeometry(arriba, abajo, alto, 16);
const caja = (ancho, alto, prof) => new THREE.BoxGeometry(ancho, alto, prof);
const arco = (radio, grosor) => new THREE.TorusGeometry(radio, grosor, 6, 12, Math.PI); // medio aro (una "∩")

// Un grupo vacío en (x, y, z): sirve de bisagra (cadera, hombro, cuello)
function pivote(padre, x, y, z) {
  const grupo = new THREE.Group();
  grupo.position.set(x, y, z);
  padre.add(grupo);
  return grupo;
}

// Ojo de dibujito: el blanco, la pupila y un brillito. Devuelve las mallas (para parpadear las aplastamos).
function ojo(padre, x, y, z, radio = 0.04) {
  const blanco = parte(padre, esfera(radio), '#ffffff', x, y, z);
  const pupila = parte(padre, esfera(radio * 0.5), '#1a1a1a', x, y, z + radio * 0.75);
  const brillo = parte(padre, esfera(radio * 0.18), '#ffffff', x + radio * 0.2, y + radio * 0.2, z + radio * 1.1);
  return [blanco, pupila, brillo];
}

// Una tela dibujada en un canvas de 64 x 64 que se repite (repX, repY) sobre la malla
function tela(dibujar, repX = 1, repY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  dibujar(canvas.getContext('2d'));
  const textura = new THREE.CanvasTexture(canvas);
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(repX, repY);
  textura.colorSpace = THREE.SRGBColorSpace;
  return materialConTextura('#ffffff', textura);
}

const aCuadros = (fondo, raya, fina) => (ctx) => {
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = raya;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(0, 20, 64, 16); // franja horizontal
  ctx.fillRect(20, 0, 16, 64); // franja vertical
  ctx.globalAlpha = 1;
  ctx.fillStyle = fina;
  ctx.fillRect(0, 50, 64, 2);
  ctx.fillRect(50, 0, 2, 64);
};

const aRayas = (fondo, raya) => (ctx) => {
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = raya;
  for (let x = 0; x < 64; x += 16) ctx.fillRect(x, 0, 6, 64);
};

const conLunares = (fondo, punto) => (ctx) => {
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = punto;
  for (const [x, y] of [[16, 16], [48, 16], [32, 40], [0, 40], [64, 40], [16, 64], [48, 64], [16, 0], [48, 0]]) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
};

const tejida = (fondo, punto) => (ctx) => {
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = punto;
  ctx.lineWidth = 3;
  for (let y = 4; y < 64; y += 12) {
    for (let x = 0; x < 64; x += 12) {
      ctx.beginPath(); // una "v" de punto de tejido
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y + 6);
      ctx.lineTo(x + 12, y);
      ctx.stroke();
    }
  }
};

// ------------------------------------------------------------
//  DON ERNESTO: pelado con mechones blancos, cejas tupidas, bigotazo, anteojos, nariz de papa,
//  bata a cuadros con bolsillos, pijama a rayas y pantuflas con pompón. Lleva el palo de amasar.
//  Mide unos 1,85 m. Devuelve: { cuerpo, piernas, brazos, cabeza, ojos, cara }
//  (cara: el material de la piel de la cara, para que se ponga colorado cuando se enoja)
// ------------------------------------------------------------
export function crearDonErnesto() {
  const cuerpo = new THREE.Group();
  const piel = '#f2c29b';
  const cara = materialToon(piel).clone(); // propio: le cambiamos el color sin tocar al resto
  const pijama = tela(aRayas('#4c6ef5', '#dbe4ff'), 1, 2);
  const bata = tela(aCuadros('#9d0208', '#5c0011', '#ffba08'), 3, 2);
  const borde = '#5c0011';

  const piernas = [-0.12, 0.12].map((x) => {
    const cadera = pivote(cuerpo, x, 0.72, 0);
    parte(cadera, capsula(0.085, 0.45), pijama, 0, -0.33, 0);
    parte(cadera, esfera(0.1), '#8d6e63', 0, -0.66, 0.06).scale.set(0.9, 0.55, 1.5); // pantufla
    parte(cadera, esfera(0.04), '#ffffff', 0, -0.6, 0.2); // pompón
    return cadera;
  });

  // Bata (abierta adelante: se ve el pijama), panza, cinturón con moño, solapas y bolsillos
  parte(cuerpo, cilindro(0.27, 0.35, 0.82), bata, 0, 1.03, 0);
  parte(cuerpo, esfera(0.27), bata, 0, 0.98, 0.1).scale.set(1, 0.9, 0.85); // panza
  parte(cuerpo, esfera(0.3), bata, 0, 1.42, 0).scale.set(1.1, 0.35, 0.9); // hombros redondeados
  parte(cuerpo, caja(0.14, 0.42, 0.04), pijama, 0, 1.18, 0.275);
  for (const lado of [-1, 1]) {
    const solapa = parte(cuerpo, caja(0.045, 0.34, 0.025), borde, lado * 0.095, 1.2, 0.29);
    solapa.rotation.z = lado * -0.25;
    const bolsillo = parte(cuerpo, caja(0.13, 0.12, 0.03), borde, lado * 0.17, 0.8, 0.31);
    bolsillo.rotation.y = lado * 0.4;
  }
  const cinturon = parte(cuerpo, new THREE.TorusGeometry(0.33, 0.025, 6, 20), borde, 0, 0.9, 0.02);
  cinturon.rotation.x = Math.PI / 2;
  cinturon.scale.set(1, 0.95, 1);
  for (const lado of [-1, 1]) parte(cuerpo, esfera(0.04), borde, lado * 0.04, 0.9, 0.34).scale.set(1.3, 0.8, 0.6); // moño

  // Brazos (bisagra en el hombro) con puño de la bata, mano y el palo de amasar en la derecha
  const brazos = [-0.33, 0.33].map((x) => {
    const hombro = pivote(cuerpo, x, 1.38, 0);
    parte(hombro, capsula(0.075, 0.38), bata, 0, -0.25, 0);
    const puno = parte(hombro, new THREE.TorusGeometry(0.075, 0.02, 6, 14), borde, 0, -0.48, 0);
    puno.rotation.x = Math.PI / 2;
    parte(hombro, esfera(0.08), piel, 0, -0.58, 0);
    return hombro;
  });
  const palo = parte(brazos[1], cilindro(0.04, 0.04, 0.5), '#e0b07a', 0, -0.6, 0.12);
  palo.rotation.x = Math.PI / 2;
  for (const punta of [-0.31, 0.31]) {
    const manija = parte(brazos[1], cilindro(0.02, 0.02, 0.12), '#8d5524', 0, -0.6, 0.12 + punta);
    manija.rotation.x = Math.PI / 2;
  }

  // Cuello y cabeza (bisagra en el cuello: la gira para mirar alrededor)
  parte(cuerpo, cilindro(0.09, 0.1, 0.12), piel, 0, 1.46, 0);
  const cabeza = pivote(cuerpo, 0, 1.5, 0);
  parte(cabeza, esfera(0.21), cara, 0, 0.17, 0).scale.set(1, 1.02, 0.95);
  for (const lado of [-1, 1]) parte(cabeza, esfera(0.05), cara, lado * 0.2, 0.16, 0).scale.set(0.5, 1, 0.8); // orejas
  parte(cabeza, esfera(0.075), '#f4a582', 0, 0.13, 0.2).scale.set(1, 0.9, 1); // nariz de papa
  const ojos = [];
  for (const lado of [-1, 1]) {
    ojos.push(...ojo(cabeza, lado * 0.075, 0.21, 0.17));
    parte(cabeza, new THREE.TorusGeometry(0.055, 0.008, 6, 16), '#343a40', lado * 0.075, 0.21, 0.205); // anteojos
    parte(cabeza, caja(0.008, 0.008, 0.18), '#343a40', lado * 0.13, 0.21, 0.11); // patillas
    const ceja = parte(cabeza, caja(0.1, 0.035, 0.035), '#dee2e6', lado * 0.075, 0.28, 0.19);
    ceja.rotation.z = lado * 0.3; // enojadas (más bajas del lado de la nariz)
    const bigote = parte(cabeza, esfera(0.06), '#ced4da', lado * 0.055, 0.085, 0.2);
    bigote.scale.set(1.3, 0.5, 0.6);
    bigote.rotation.z = lado * -0.3;
    // Mechones blancos a los costados y atrás (arriba, pelado)
    parte(cabeza, esfera(0.07), '#f1f3f5', lado * 0.19, 0.24, -0.05);
    parte(cabeza, esfera(0.065), '#f1f3f5', lado * 0.16, 0.17, -0.13);
  }
  parte(cabeza, caja(0.04, 0.008, 0.008), '#343a40', 0, 0.215, 0.21); // puente de los anteojos
  parte(cabeza, esfera(0.075), '#f1f3f5', 0, 0.2, -0.18);
  parte(cabeza, arco(0.035, 0.01), '#6d2e2e', 0, 0.035, 0.19); // boca (enojado: la "∩")
  const pelito = parte(cabeza, new THREE.TorusGeometry(0.03, 0.006, 6, 12), '#f1f3f5', 0, 0.4, 0); // un solo pelo en la pelada
  pelito.rotation.y = Math.PI / 2;

  return { cuerpo, piernas, brazos, cabeza, ojos, cara };
}

// ------------------------------------------------------------
//  DOÑA POCHA: pañuelo con lunares y ruleros, anteojos enormes, cachetes colorados, saquito tejido
//  con botones, pollera con lunares y pantuflas de conejito. Mide unos 1,6 m.
//  Los brazos están en un solo grupo (sube cuando apunta) con el lanzarredes y el tejido.
//  Devuelve: { cuerpo, piernas, brazos, cabeza, ojos, lanzador, punta, redCargada, tejido }
// ------------------------------------------------------------
export function crearDonaPocha() {
  const cuerpo = new THREE.Group();
  const piel = '#f5c9a6';
  const saquito = tela(tejida('#ffafcc', '#f78fb3'), 3, 2);

  const piernas = [-0.09, 0.09].map((x) => {
    const cadera = pivote(cuerpo, x, 0.55, 0);
    parte(cadera, capsula(0.055, 0.38), '#e9c9a0', 0, -0.26, 0); // medias
    parte(cadera, esfera(0.08), '#ffc8dd', 0, -0.52, 0.05).scale.set(0.9, 0.6, 1.5); // pantufla de conejito
    for (const lado of [-1, 1]) {
      const oreja = parte(cadera, capsula(0.018, 0.07), '#ffc8dd', lado * 0.03, -0.44, 0.1);
      oreja.rotation.x = -0.5;
      parte(cadera, esfera(0.011), '#1a1a1a', lado * 0.025, -0.5, 0.165);
    }
    return cadera;
  });

  // Pollera con lunares, saquito tejido con botones y cuello de puntilla
  parte(cuerpo, cilindro(0.2, 0.32, 0.5), tela(conLunares('#6a4c93', '#e0c3fc'), 3, 1), 0, 0.62, 0);
  parte(cuerpo, cilindro(0.18, 0.22, 0.42), saquito, 0, 1.06, 0);
  for (let i = 0; i < 3; i++) parte(cuerpo, esfera(0.017), '#ffffff', 0, 0.94 + i * 0.1, 0.2);
  const cuello = parte(cuerpo, new THREE.TorusGeometry(0.12, 0.025, 6, 16), '#ffffff', 0, 1.26, 0);
  cuello.rotation.x = Math.PI / 2;

  // Cabeza: cachetes, nariz, anteojos de aumento (ojos grandotes), sonrisa, pelo gris asomando,
  // pañuelo con lunares atado arriba y los ruleros asomando adelante
  const cabeza = pivote(cuerpo, 0, 1.24, 0);
  parte(cabeza, esfera(0.16), piel, 0, 0.16, 0);
  parte(cabeza, esfera(0.035), '#f4a582', 0, 0.14, 0.16); // nariz
  const ojos = [];
  for (const lado of [-1, 1]) {
    parte(cabeza, esfera(0.035), '#ff8fab', lado * 0.1, 0.11, 0.12); // cachetes
    ojos.push(...ojo(cabeza, lado * 0.06, 0.19, 0.13, 0.045));
    parte(cabeza, new THREE.TorusGeometry(0.06, 0.012, 6, 16), '#9d4edd', lado * 0.06, 0.19, 0.17); // anteojos
    parte(cabeza, esfera(0.05), '#d9d9d9', lado * 0.14, 0.12, -0.04); // pelo gris
    parte(cabeza, esfera(0.045), '#48cae4', lado * 0.05, 0.35, 0.02).scale.set(1.3, 0.8, 0.6); // nudo del pañuelo
  }
  parte(cabeza, caja(0.03, 0.01, 0.01), '#9d4edd', 0, 0.195, 0.175); // puente de los anteojos
  const sonrisa = parte(cabeza, arco(0.035, 0.01), '#c9184a', 0, 0.09, 0.15);
  sonrisa.rotation.z = Math.PI; // la "U"
  parte(cabeza, mediaEsfera(0.172), tela(conLunares('#48cae4', '#ffffff'), 2, 1), 0, 0.19, -0.01).scale.set(1, 1.05, 1.05);
  for (let i = 0; i < 4; i++) {
    const rulero = parte(cabeza, cilindro(0.028, 0.028, 0.065), '#ff70a6', -0.09 + i * 0.06, 0.27, 0.11);
    rulero.rotation.z = Math.PI / 2;
  }

  // Brazos y lanzarredes: todo en un grupo que sube a la altura de los ojos cuando apunta
  const brazos = pivote(cuerpo, 0, 1.18, 0);
  for (const lado of [-1, 1]) {
    const brazo = parte(brazos, capsula(0.05, 0.3), saquito, lado * 0.16, -0.05, 0.14);
    brazo.rotation.x = Math.PI / 2 - 0.3;
    parte(brazos, esfera(0.055), piel, lado * 0.12, -0.08, 0.32);
  }
  // El lanzarredes: un tubo verde con boca ancha, empuñadura y la red asomando por la boca
  const lanzador = pivote(brazos, 0.05, -0.06, 0.25);
  parte(lanzador, cilindro(0.06, 0.05, 0.5), '#2a9d8f', 0, 0.03, 0.15).rotation.x = Math.PI / 2;
  parte(lanzador, new THREE.TorusGeometry(0.065, 0.015, 6, 14), '#1b4332', 0, 0.03, 0.4); // boca
  parte(lanzador, caja(0.04, 0.12, 0.05), '#6d4c41', 0, -0.06, 0); // empuñadura
  parte(lanzador, caja(0.015, 0.04, 0.02), '#e63946', 0, -0.03, 0.05); // gatillo
  const redCargada = parte(lanzador, esfera(0.055), '#f1e3c6', 0, 0.03, 0.41); // la red, hecha un bollo
  const punta = pivote(lanzador, 0, 0.03, 0.46); // la boca del tubo (de acá salen el rayo, el aire y la red)

  // El tejido (cuando está sentada): dos agujas, la bufanda que está tejiendo y el ovillo
  const tejido = pivote(brazos, 0, -0.08, 0.32);
  for (const lado of [-1, 1]) {
    const aguja = parte(tejido, cilindro(0.006, 0.006, 0.26), '#adb5bd', lado * 0.04, 0.04, 0);
    aguja.rotation.z = lado * 0.6;
  }
  parte(tejido, caja(0.12, 0.1, 0.015), '#ffd166', 0, -0.05, 0.01); // la bufanda a medio hacer
  parte(tejido, esfera(0.05), '#ffd166', 0.08, -0.16, 0.02); // ovillo

  return { cuerpo, piernas, brazos, cabeza, ojos, lanzador, punta, redCargada, tejido };
}

// ------------------------------------------------------------
//  LOS NENES (Tomi y Facu): cabezón, ojos grandes, pecas, gorrita, remera, bermudas y zapatillas.
//  Miden unos 1,4 m. Devuelve: { cuerpo, piernas, brazos, cabeza, ojos }
// ------------------------------------------------------------
function crearNene({ remera, bermuda, gorra, gorraParaAtras = false, piel = '#f1c27d', pelo = '#5c3d2e' }) {
  const cuerpo = new THREE.Group();

  const piernas = [-0.08, 0.08].map((x) => {
    const cadera = pivote(cuerpo, x, 0.56, 0);
    parte(cadera, capsula(0.065, 0.14), bermuda, 0, -0.1, 0);
    parte(cadera, capsula(0.048, 0.22), piel, 0, -0.32, 0);
    parte(cadera, esfera(0.075), '#ffffff', 0, -0.5, 0.04).scale.set(0.9, 0.6, 1.5); // zapatilla
    parte(cadera, caja(0.11, 0.025, 0.2), '#e63946', 0, -0.535, 0.04); // suela
    return cadera;
  });

  parte(cuerpo, cilindro(0.16, 0.15, 0.42), remera, 0, 0.78, 0);
  parte(cuerpo, cilindro(0.155, 0.16, 0.08), bermuda, 0, 0.58, 0); // cintura de la bermuda

  const brazos = [-0.2, 0.2].map((x) => {
    const hombro = pivote(cuerpo, x, 0.95, 0);
    parte(hombro, capsula(0.055, 0.08), remera, 0, -0.06, 0); // manga
    parte(hombro, capsula(0.04, 0.22), piel, 0, -0.22, 0);
    parte(hombro, esfera(0.045), piel, 0, -0.37, 0);
    return hombro;
  });

  const cabeza = pivote(cuerpo, 0, 1.0, 0);
  parte(cabeza, cilindro(0.06, 0.06, 0.08), piel, 0, 0.02, 0); // cuello
  parte(cabeza, esfera(0.19), piel, 0, 0.2, 0);
  for (const lado of [-1, 1]) parte(cabeza, esfera(0.045), piel, lado * 0.185, 0.19, 0).scale.set(0.5, 1, 0.8); // orejas
  const ojos = [];
  for (const lado of [-1, 1]) {
    ojos.push(...ojo(cabeza, lado * 0.07, 0.21, 0.155, 0.045));
    for (const [px, py, pz] of [[0.115, 0.175, 0.145], [0.14, 0.165, 0.125], [0.125, 0.155, 0.14]]) parte(cabeza, esfera(0.008), '#d08c5b', lado * px, py, pz); // pecas
  }
  parte(cabeza, esfera(0.025), '#e8a87c', 0, 0.16, 0.19); // nariz
  const sonrisa = parte(cabeza, arco(0.04, 0.009), '#d64550', 0, 0.115, 0.165);
  sonrisa.rotation.z = Math.PI;
  for (const x of [-0.07, 0, 0.07]) parte(cabeza, esfera(0.05), pelo, x, 0.3, 0.13).scale.set(1, 0.6, 0.6); // flequillo
  parte(cabeza, esfera(0.12), pelo, 0, 0.2, -0.12).scale.set(1.4, 1.3, 1); // pelo de atrás
  parte(cabeza, mediaEsfera(0.195), gorra, 0, 0.25, 0);
  parte(cabeza, caja(0.22, 0.02, 0.14), gorra, 0, 0.26, gorraParaAtras ? -0.22 : 0.22); // visera

  return { cuerpo, piernas, brazos, cabeza, ojos };
}

// Tomi: gorrita roja, remera amarilla con una estrella y su mochila azul (para guardar los juguetes)
export function crearTomi() {
  const tomi = crearNene({ remera: '#ffd23f', bermuda: '#3d5a80', gorra: '#e63946' });
  const { cuerpo } = tomi;
  parte(cuerpo, new THREE.OctahedronGeometry(0.05, 0), '#e63946', 0, 0.85, 0.16).scale.set(1, 1, 0.3); // estrella
  parte(cuerpo, caja(0.26, 0.3, 0.12), '#3a86ff', 0, 0.82, -0.2); // mochila
  parte(cuerpo, caja(0.18, 0.1, 0.03), '#1d4ed8', 0, 0.74, -0.27); // bolsillo de la mochila
  for (const lado of [-1, 1]) parte(cuerpo, caja(0.03, 0.36, 0.02), '#1d4ed8', lado * 0.09, 0.82, 0.155); // tiras
  return tomi;
}

// Facu: gorrita naranja para atrás, remera verde, binoculares colgando y el walkie en la mano derecha.
// Devuelve además "brazoWalkie" (el brazo derecho: lo levanta para hablar o para saludar).
export function crearFacu() {
  const facu = crearNene({ remera: '#2a9d8f', bermuda: '#6c757d', gorra: '#e76f51', gorraParaAtras: true, piel: '#e0ac69', pelo: '#2b1d14' });
  const { cuerpo, brazos } = facu;
  for (const lado of [-1, 1]) parte(cuerpo, cilindro(0.03, 0.03, 0.08), '#222222', lado * 0.04, 0.86, 0.18).rotation.x = Math.PI / 2; // binoculares
  parte(cuerpo, caja(0.3, 0.01, 0.01), '#222222', 0, 0.97, 0.12).rotation.x = 0.3; // la tira
  const brazoWalkie = brazos[1];
  parte(brazoWalkie, caja(0.06, 0.13, 0.04), '#ffd23f', 0, -0.4, 0.04); // walkie
  parte(brazoWalkie, cilindro(0.006, 0.006, 0.12), '#222222', 0.015, -0.28, 0.04); // antena
  return { ...facu, brazoWalkie };
}
