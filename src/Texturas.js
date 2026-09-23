// Texturas hechas por nosotros: se dibujan con código en un <canvas> (no son imágenes).
// Son casi blancas con detalles grises: así el color del material las "tiñe"
// (el mismo dibujo de madera sirve para un piso naranja o uno celeste).
import * as THREE from 'three';

const TAMAÑO = 256; // píxeles del canvas

// Crea un canvas, deja que "dibujar" pinte en él y lo convierte en textura que se repite
function crearTextura(dibujar) {
  const canvas = document.createElement('canvas');
  canvas.width = TAMAÑO;
  canvas.height = TAMAÑO;
  const ctx = canvas.getContext('2d');
  dibujar(ctx, TAMAÑO);
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.RepeatWrapping; // que se repita como un azulejo
  textura.wrapT = THREE.RepeatWrapping;
  textura.anisotropy = 4; // se ve mejor de costado
  return textura;
}

// Gris aleatorio entre dos valores (para que no todo sea igual)
function grisAlAzar(min, max) {
  const v = Math.floor(min + Math.random() * (max - min));
  return `rgb(${v},${v},${v})`;
}

// Tablas de madera: 4 tablas, cada una con un tono apenas distinto, vetas y juntas
function dibujarMadera(ctx, t) {
  const tablas = 4;
  const alto = t / tablas;
  for (let i = 0; i < tablas; i++) {
    ctx.fillStyle = grisAlAzar(225, 250);
    ctx.fillRect(0, i * alto, t, alto);
    // Vetas: líneas finitas onduladas
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    for (let v = 0; v < 5; v++) {
      const y = i * alto + 4 + Math.random() * (alto - 8);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= t; x += 32) ctx.lineTo(x, y + Math.sin(x / 20 + v) * 2);
      ctx.stroke();
    }
    // Junta entre tablas y un corte en el medio (las tablas no son infinitas)
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, i * alto, t, 2);
    const corte = (i * 97) % t;
    ctx.fillRect(corte, i * alto, 2, alto);
  }
}

// Cerámica: damero de 2x2 con juntas
function dibujarCeramica(ctx, t) {
  const m = t / 2;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#d6d6d6';
      ctx.fillRect(i * m, j * m, m, m);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  for (let k = 0; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(k * m, 0);
    ctx.lineTo(k * m, t);
    ctx.moveTo(0, k * m);
    ctx.lineTo(t, k * m);
    ctx.stroke();
  }
}

// Baldosas de patio / cemento: 4x4 cuadrados con tonos variados y juntas
function dibujarBaldosas(ctx, t) {
  const n = 4;
  const m = t / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = grisAlAzar(215, 245);
      ctx.fillRect(i * m, j * m, m, m);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let k = 0; k < n; k++) {
    ctx.fillRect(k * m, 0, 3, t);
    ctx.fillRect(0, k * m, t, 3);
  }
}

// Pasto: fondo claro con muchas manchitas más claras y más oscuras
function dibujarPasto(ctx, t) {
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, t, t);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.1)';
    const x = Math.random() * t;
    const y = Math.random() * t;
    ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 5);
  }
}

// Tejas del techo: filas de medios círculos, cada fila corrida media teja
function dibujarTejas(ctx, t) {
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, t, t);
  const filas = 4;
  const alto = t / filas;
  const ancho = t / 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 3;
  for (let f = 0; f < filas; f++) {
    const desplazamiento = f % 2 === 0 ? 0 : ancho / 2;
    for (let x = -ancho; x < t + ancho; x += ancho) {
      ctx.beginPath();
      ctx.arc(x + desplazamiento + ancho / 2, f * alto, ancho / 2, 0, Math.PI);
      ctx.stroke();
    }
  }
}

// Las texturas se dibujan una sola vez y después se reutilizan
const DIBUJOS = {
  madera: dibujarMadera,
  ceramica: dibujarCeramica,
  baldosas: dibujarBaldosas,
  pasto: dibujarPasto,
  tejas: dibujarTejas,
};
const originales = {};

// Devuelve la textura "nombre" repetida (repeticionesX, repeticionesY) veces.
// Cada llamada da una copia con su propia repetición, pero todas comparten la misma imagen.
export function textura(nombre, repeticionesX = 1, repeticionesY = 1) {
  if (!originales[nombre]) originales[nombre] = crearTextura(DIBUJOS[nombre]);
  const copia = originales[nombre].clone();
  copia.repeat.set(repeticionesX, repeticionesY);
  copia.needsUpdate = true;
  return copia;
}
