// Cuadros de la casa (etapa 11C): retratos, paisajes, dibujos del hijo, un reloj, un espejo...
//
// Todos los dibujos están en UNA sola imagen grande (un "atlas" de 4 x 4 cuadros, dibujado con
// código en un canvas). Cada cuadro usa solo su pedacito de la imagen (sus coordenadas de textura).
// Así todos los cuadros comparten el mismo material y se pueden juntar en una sola malla (Optimizar.js).
//
// El cuadro 'ojos' (en el sótano) tiene las pupilas aparte: Decoracion.js las mueve para que
// siempre miren al jugador.
import * as THREE from 'three';
import { materialToon } from './Materials.js';

const CELDA = 256; // píxeles de cada dibujo
const COLUMNAS = 4;

// Los dibujos, en el orden en que van en el atlas (de izquierda a derecha y de arriba hacia abajo)
const NOMBRES = [
  'retratoDueno', 'retratoAbuela', 'paisaje', 'perro',
  'barco', 'flores', 'abstracto', 'mapa',
  'dibujoNino', 'dinosaurio', 'reloj', 'espejo',
  'humedad', 'ojos', 'abuelo', 'mapaTesoro',
];

// Dónde están los ojos del cuadro 'ojos' (en píxeles de su dibujo) y su tamaño
const OJOS = [[97, 108], [159, 108]];
const RADIO_OJO = 17;

// ------------------------------------------------------------
//  DIBUJOS (cada uno pinta en un cuadrado de CELDA x CELDA)
// ------------------------------------------------------------
const circulo = (ctx, x, y, r, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
};
const ovalo = (ctx, x, y, rx, ry, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
};
const fondo = (ctx, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, CELDA, CELDA);
};

const DIBUJOS = {
  // El dueño, con su gorro de dormir y el bigote
  retratoDueno(ctx) {
    fondo(ctx, '#6d597a');
    ovalo(ctx, 128, 250, 90, 60, '#9b5de5'); // bata
    ovalo(ctx, 128, 130, 55, 65, '#ffcc99'); // cara
    ctx.fillStyle = '#e4572e'; // gorro
    ctx.beginPath();
    ctx.moveTo(70, 90);
    ctx.lineTo(186, 90);
    ctx.lineTo(200, 20);
    ctx.fill();
    circulo(ctx, 202, 22, 12, '#ffffff');
    circulo(ctx, 108, 125, 6, '#000000');
    circulo(ctx, 148, 125, 6, '#000000');
    ctx.fillStyle = '#5d4037'; // cejas enojadas y bigote
    ctx.fillRect(92, 105, 30, 6);
    ctx.fillRect(134, 105, 30, 6);
    ovalo(ctx, 128, 165, 38, 10, '#5d4037');
    circulo(ctx, 128, 145, 10, '#ff9e80'); // nariz
  },
  // La abuela, con rodete y anteojos
  retratoAbuela(ctx) {
    fondo(ctx, '#b5838d');
    ovalo(ctx, 128, 250, 90, 60, '#ff99c8');
    circulo(ctx, 128, 55, 30, '#dee2e6'); // rodete
    ovalo(ctx, 128, 135, 55, 62, '#ffddc1');
    ovalo(ctx, 128, 90, 60, 25, '#dee2e6'); // pelo
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 4;
    for (const x of [106, 150]) {
      ctx.beginPath();
      ctx.arc(x, 130, 15, 0, Math.PI * 2);
      ctx.stroke();
    }
    circulo(ctx, 106, 130, 4, '#000000');
    circulo(ctx, 150, 130, 4, '#000000');
    ctx.beginPath(); // sonrisa
    ctx.arc(128, 160, 18, 0.2, Math.PI - 0.2);
    ctx.stroke();
  },
  paisaje(ctx) {
    const cielo = ctx.createLinearGradient(0, 0, 0, CELDA);
    cielo.addColorStop(0, '#4ea8de');
    cielo.addColorStop(1, '#caf0f8');
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, CELDA, CELDA);
    circulo(ctx, 190, 60, 26, '#ffd23f');
    ovalo(ctx, 70, 230, 150, 80, '#52b788');
    ovalo(ctx, 210, 240, 140, 70, '#40916c');
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(60, 130, 10, 40);
    circulo(ctx, 65, 120, 26, '#2d6a4f');
  },
  perro(ctx) {
    fondo(ctx, '#ffe8d6');
    ovalo(ctx, 70, 110, 28, 55, '#7f5539'); // orejas
    ovalo(ctx, 186, 110, 28, 55, '#7f5539');
    circulo(ctx, 128, 130, 75, '#b08968');
    circulo(ctx, 100, 115, 9, '#000000');
    circulo(ctx, 156, 115, 9, '#000000');
    ovalo(ctx, 128, 160, 30, 24, '#ddb892');
    circulo(ctx, 128, 150, 12, '#000000');
    ovalo(ctx, 128, 190, 12, 18, '#ff6b6b'); // lengua
  },
  barco(ctx) {
    fondo(ctx, '#90e0ef');
    ctx.fillStyle = '#0077b6';
    ctx.fillRect(0, 170, CELDA, 86);
    ctx.fillStyle = '#e63946'; // casco
    ctx.beginPath();
    ctx.moveTo(60, 160);
    ctx.lineTo(200, 160);
    ctx.lineTo(180, 190);
    ctx.lineTo(80, 190);
    ctx.fill();
    ctx.fillStyle = '#ffffff'; // velas
    ctx.beginPath();
    ctx.moveTo(130, 40);
    ctx.lineTo(130, 150);
    ctx.lineTo(70, 150);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(135, 60);
    ctx.lineTo(135, 150);
    ctx.lineTo(185, 150);
    ctx.fill();
  },
  // Naturaleza muerta: un florero con flores
  flores(ctx) {
    fondo(ctx, '#fefae0');
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 5;
    for (const [x, y] of [[90, 70], [128, 50], [166, 75], [110, 95], [150, 100]]) {
      ctx.beginPath();
      ctx.moveTo(128, 170);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    [[90, 70, '#e63946'], [128, 50, '#ffd23f'], [166, 75, '#c77dff'], [110, 95, '#ff99c8'], [150, 100, '#f4a261']].forEach(([x, y, c]) => circulo(ctx, x, y, 16, c));
    ctx.fillStyle = '#457b9d';
    ctx.fillRect(98, 160, 60, 70);
  },
  // Arte moderno (el dueño dice que lo entiende)
  abstracto(ctx) {
    fondo(ctx, '#f1faee');
    circulo(ctx, 80, 90, 50, '#e63946');
    ctx.fillStyle = '#1d3557';
    ctx.fillRect(130, 40, 90, 90);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(40, 220);
    ctx.lineTo(140, 150);
    ctx.lineTo(160, 230);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(20, 140);
    ctx.lineTo(240, 200);
    ctx.stroke();
  },
  mapa(ctx) {
    fondo(ctx, '#f4e1c1');
    ctx.fillStyle = '#b7e4c7';
    ctx.beginPath();
    ctx.moveTo(40, 60);
    ctx.bezierCurveTo(120, 20, 200, 90, 150, 140);
    ctx.bezierCurveTo(120, 180, 60, 150, 40, 60);
    ctx.fill();
    ovalo(ctx, 190, 200, 40, 25, '#b7e4c7');
    ctx.strokeStyle = '#6b2d0c';
    ctx.lineWidth = 3;
    ctx.beginPath(); // rosa de los vientos
    ctx.moveTo(60, 190);
    ctx.lineTo(60, 240);
    ctx.moveTo(35, 215);
    ctx.lineTo(85, 215);
    ctx.stroke();
  },
  // Dibujo del hijo: casita, sol y la familia (con crayones)
  dibujoNino(ctx) {
    fondo(ctx, '#ffffff');
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#e63946';
    ctx.strokeRect(60, 120, 100, 80);
    ctx.beginPath();
    ctx.moveTo(50, 125);
    ctx.lineTo(110, 70);
    ctx.lineTo(170, 125);
    ctx.stroke();
    ctx.strokeStyle = '#ffb703';
    circulo(ctx, 210, 50, 22, '#ffd23f');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(210 + Math.cos(a) * 28, 50 + Math.sin(a) * 28);
      ctx.lineTo(210 + Math.cos(a) * 40, 50 + Math.sin(a) * 40);
      ctx.stroke();
    }
    ctx.strokeStyle = '#1d3557'; // un muñequito de palitos
    ctx.beginPath();
    ctx.arc(210, 150, 12, 0, Math.PI * 2);
    ctx.moveTo(210, 162);
    ctx.lineTo(210, 200);
    ctx.lineTo(195, 225);
    ctx.moveTo(210, 200);
    ctx.lineTo(225, 225);
    ctx.moveTo(190, 175);
    ctx.lineTo(230, 175);
    ctx.stroke();
    ctx.fillStyle = '#52b788';
    ctx.fillRect(0, 225, CELDA, 31);
  },
  dinosaurio(ctx) {
    fondo(ctx, '#ffffff');
    ovalo(ctx, 120, 150, 70, 45, '#52b788');
    ovalo(ctx, 190, 95, 28, 22, '#52b788');
    ctx.fillStyle = '#52b788';
    ctx.fillRect(170, 100, 22, 50);
    ctx.beginPath(); // cola
    ctx.moveTo(55, 140);
    ctx.lineTo(10, 180);
    ctx.lineTo(60, 165);
    ctx.fill();
    ctx.fillRect(80, 185, 18, 35);
    ctx.fillRect(140, 185, 18, 35);
    circulo(ctx, 198, 90, 5, '#000000');
    ctx.fillStyle = '#ffb703'; // pinches
    for (let x = 70; x < 170; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, 110);
      ctx.lineTo(x + 10, 88);
      ctx.lineTo(x + 20, 110);
      ctx.fill();
    }
  },
  // Reloj redondo (lo de afuera del círculo queda transparente)
  reloj(ctx) {
    circulo(ctx, 128, 128, 120, '#6d4c41');
    circulo(ctx, 128, 128, 104, '#fffaf0');
    ctx.fillStyle = '#222222';
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      ctx.fillRect(128 + Math.cos(a) * 88 - 4, 128 + Math.sin(a) * 88 - 4, 8, 8);
    }
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128, 60);
    ctx.moveTo(128, 128);
    ctx.lineTo(175, 140);
    ctx.stroke();
    circulo(ctx, 128, 128, 8, '#e63946');
  },
  espejo(ctx) {
    const brillo = ctx.createLinearGradient(0, 0, CELDA, CELDA);
    brillo.addColorStop(0, '#e0fbfc');
    brillo.addColorStop(1, '#9ad1d4');
    ctx.fillStyle = brillo;
    ctx.fillRect(0, 0, CELDA, CELDA);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 10;
    for (const d of [60, 100]) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(0, d);
      ctx.stroke();
    }
  },
  // Manchas de humedad (fondo transparente): muchas manchas redondas medio transparentes
  humedad(ctx) {
    for (let i = 0; i < 40; i++) {
      const x = 128 + (Math.random() - 0.5) * 150;
      const y = 128 + (Math.random() - 0.5) * 150;
      circulo(ctx, x, y, 15 + Math.random() * 30, `rgba(60, 70, 40, ${0.15 + Math.random() * 0.2})`);
    }
  },
  // El cuadro que te sigue con la mirada: los ojos son blancos; las pupilas son mallas aparte
  ojos(ctx) {
    fondo(ctx, '#2b2d42');
    ovalo(ctx, 128, 250, 95, 60, '#3d405b');
    ovalo(ctx, 128, 125, 62, 78, '#adb5bd');
    ovalo(ctx, 128, 60, 66, 30, '#1b1b1b'); // pelo
    for (const [x, y] of OJOS) circulo(ctx, x, y, RADIO_OJO, '#ffffff');
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 4;
    ctx.beginPath(); // sonrisa inquietante
    ctx.arc(128, 150, 30, 0.15, Math.PI - 0.15);
    ctx.stroke();
  },
  // El abuelo (el cazador de la sala de trofeos), pelado y con bigotazo blanco
  abuelo(ctx) {
    fondo(ctx, '#588157');
    ovalo(ctx, 128, 250, 90, 60, '#3a5a40');
    ovalo(ctx, 128, 130, 58, 68, '#ffddc1');
    circulo(ctx, 108, 118, 6, '#000000');
    circulo(ctx, 148, 118, 6, '#000000');
    ovalo(ctx, 128, 160, 50, 14, '#f8f9fa'); // bigotazo
    ctx.fillStyle = '#e63946'; // moño
    ctx.beginPath();
    ctx.moveTo(100, 210);
    ctx.lineTo(128, 222);
    ctx.lineTo(100, 234);
    ctx.moveTo(156, 210);
    ctx.lineTo(128, 222);
    ctx.lineTo(156, 234);
    ctx.fill();
  },
  mapaTesoro(ctx) {
    fondo(ctx, '#e9c46a');
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = '#6b2d0c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(30, 220);
    ctx.bezierCurveTo(100, 180, 60, 90, 150, 110);
    ctx.lineTo(190, 70);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 9;
    ctx.beginPath(); // la X
    ctx.moveTo(175, 55);
    ctx.lineTo(210, 90);
    ctx.moveTo(210, 55);
    ctx.lineTo(175, 90);
    ctx.stroke();
    ctx.fillStyle = '#2d6a4f'; // palmera
    ctx.fillRect(56, 150, 8, 60);
    ovalo(ctx, 60, 145, 30, 12, '#40916c');
  },
};

// ------------------------------------------------------------
//  ATLAS Y MATERIAL (se crean una sola vez)
// ------------------------------------------------------------
let material = null;

function materialDelAtlas() {
  if (material) return material;
  const canvas = document.createElement('canvas');
  canvas.width = CELDA * COLUMNAS;
  canvas.height = CELDA * COLUMNAS;
  const ctx = canvas.getContext('2d');
  NOMBRES.forEach((nombre, i) => {
    ctx.save();
    ctx.translate((i % COLUMNAS) * CELDA, Math.floor(i / COLUMNAS) * CELDA);
    ctx.beginPath();
    ctx.rect(0, 0, CELDA, CELDA);
    ctx.clip(); // que ningún dibujo se salga de su cuadrado
    DIBUJOS[nombre](ctx);
    ctx.restore();
  });
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  // alphaTest: lo transparente (alrededor del reloj, entre las manchas) no se dibuja
  material = new THREE.MeshToonMaterial({ map: textura, gradientMap: materialToon('#ffffff').gradientMap, alphaTest: 0.1, transparent: true });
  return material;
}

// Un rectángulo que muestra solo el pedacito del atlas de ese dibujo
function planoDelDibujo(nombre, ancho, alto) {
  const i = NOMBRES.indexOf(nombre);
  const u0 = (i % COLUMNAS) / COLUMNAS;
  const v0 = 1 - (Math.floor(i / COLUMNAS) + 1) / COLUMNAS; // (en las texturas, v=1 es arriba)
  const lado = 1 / COLUMNAS;
  const geometria = new THREE.PlaneGeometry(ancho, alto);
  const uv = geometria.attributes.uv;
  for (let k = 0; k < uv.count; k++) {
    uv.setXY(k, u0 + 0.002 + uv.getX(k) * (lado - 0.004), v0 + 0.002 + uv.getY(k) * (lado - 0.004));
  }
  return new THREE.Mesh(geometria, materialDelAtlas());
}

// Crea un cuadro que mira hacia +Z: un marco (si marco es true) y el dibujo adelante.
// Devuelve { grupo, pupilas } (las pupilas solo en el cuadro 'ojos').
export function crearCuadro(nombre, ancho, alto, { marco = true, colorMarco = '#6f4518' } = {}) {
  const grupo = new THREE.Group();
  if (marco) {
    const borde = new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.1, alto + 0.1, 0.04), materialToon(colorMarco));
    borde.position.z = 0.02;
    grupo.add(borde);
  }
  const dibujo = planoDelDibujo(nombre, ancho, alto);
  dibujo.position.z = marco ? 0.042 : 0.01;
  grupo.add(dibujo);

  // Pupilas del cuadro que te sigue con la mirada
  const pupilas = [];
  if (nombre === 'ojos') {
    for (const [px, py] of OJOS) {
      const pupila = new THREE.Mesh(new THREE.CircleGeometry(0.018 * (ancho / 0.6), 12), new THREE.MeshBasicMaterial({ color: '#000000' }));
      pupila.userData.centro = new THREE.Vector3((px / CELDA - 0.5) * ancho, (0.5 - py / CELDA) * alto, dibujo.position.z + 0.003);
      pupila.userData.alcance = (RADIO_OJO / CELDA) * ancho * 0.5;
      pupila.position.copy(pupila.userData.centro);
      pupila.userData.outlineParameters = { visible: false };
      grupo.add(pupila);
      pupilas.push(pupila);
    }
  }
  return { grupo, pupilas };
}
