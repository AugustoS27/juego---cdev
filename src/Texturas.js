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

// ------------------------------------------------------------
//  EMPAPELADOS (etapa 11C). Cada dibujo es 1 metro de pared (ver House.uvEnMetros).
// ------------------------------------------------------------
// Rayas verticales anchas y finitas
function dibujarRayas(ctx, t) {
  ctx.fillStyle = '#f7f7f7';
  ctx.fillRect(0, 0, t, t);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#dcdcdc';
    ctx.fillRect(i * (t / 4), 0, t / 8, t);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(i * (t / 4) + t / 8 + 6, 0, 3, t);
  }
}

// Florcitas de 5 pétalos, en filas corridas
function dibujarFlores(ctx, t) {
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, t, t);
  const paso = t / 4;
  for (let fila = 0; fila < 4; fila++) {
    for (let col = 0; col < 4; col++) {
      const cx = col * paso + (fila % 2 ? paso / 2 : paso / 4) + paso / 4;
      const cy = fila * paso + paso / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc((cx + Math.cos(a) * 9) % t, cy + Math.sin(a) * 9, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(cx % t, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Azulejos de 25 cm (baños y cocina)
function dibujarAzulejos(ctx, t) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, t, t);
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, 0, t / 2, t / 2);
  ctx.fillRect(t / 2, t / 2, t / 2, t / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let k = 0; k < 4; k++) {
    ctx.fillRect(k * (t / 4), 0, 3, t);
    ctx.fillRect(0, k * (t / 4), t, 3);
  }
}

// Ladrillos (sótano): 8 hileras, cada una corrida medio ladrillo
function dibujarLadrillos(ctx, t) {
  const hileras = 8;
  const alto = t / hileras;
  const ancho = t / 4;
  ctx.fillStyle = '#b8b8b8'; // la mezcla entre ladrillos
  ctx.fillRect(0, 0, t, t);
  for (let f = 0; f < hileras; f++) {
    const corrido = f % 2 ? ancho / 2 : 0;
    for (let x = -ancho; x < t; x += ancho) {
      ctx.fillStyle = grisAlAzar(205, 245);
      ctx.fillRect(x + corrido + 3, f * alto + 3, ancho - 6, alto - 6);
    }
  }
}

// Tablas verticales (madera de biblioteca, sala de trofeos)
function dibujarTablas(ctx, t) {
  const tablas = 5;
  const ancho = t / tablas;
  for (let i = 0; i < tablas; i++) {
    ctx.fillStyle = grisAlAzar(225, 248);
    ctx.fillRect(i * ancho, 0, ancho, t);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(i * ancho, 0, 3, t);
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    for (let v = 0; v < 3; v++) {
      const x = i * ancho + 8 + Math.random() * (ancho - 16);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= t; y += 32) ctx.lineTo(x + Math.sin(y / 25 + v) * 2, y);
      ctx.stroke();
    }
  }
}

// Rombos (líneas cruzadas en diagonal)
function dibujarRombos(ctx, t) {
  ctx.fillStyle = '#f6f6f6';
  ctx.fillRect(0, 0, t, t);
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.lineWidth = 4;
  for (let k = -t; k <= t; k += t / 4) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + t, t);
    ctx.moveTo(k + t, 0);
    ctx.lineTo(k, t);
    ctx.stroke();
  }
}

// Lunares
function dibujarLunares(ctx, t) {
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, t, t);
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  const paso = t / 4;
  for (let f = 0; f < 4; f++) {
    for (let c = 0; c < 4; c++) {
      ctx.beginPath();
      ctx.arc(c * paso + (f % 2 ? paso : paso / 2), f * paso + paso / 2, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Estrellitas (cuarto del hijo)
function dibujarEstrellas(ctx, t) {
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, t, t);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  const paso = t / 4;
  for (let f = 0; f < 4; f++) {
    for (let c = 0; c < 4; c++) {
      const cx = c * paso + (f % 2 ? paso : paso / 2);
      const cy = f * paso + paso / 2;
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const r = p % 2 ? 5 : 13;
        const a = (p / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.fill();
    }
  }
}

// Telaraña: rayos que salen del centro y vueltas en espiral (fondo transparente)
function dibujarTelarana(ctx, t) {
  const c = t / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 10; r++) {
    const a = (r / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c);
    ctx.stroke();
  }
  for (let vuelta = 1; vuelta <= 6; vuelta++) {
    ctx.beginPath();
    for (let r = 0; r <= 10; r++) {
      const a = (r / 10) * Math.PI * 2;
      const radio = vuelta * (c / 6.5) + Math.sin(r * 3) * 3;
      ctx.lineTo(c + Math.cos(a) * radio, c + Math.sin(a) * radio);
    }
    ctx.stroke();
  }
}

// Las texturas se dibujan una sola vez y después se reutilizan
const DIBUJOS = {
  madera: dibujarMadera,
  ceramica: dibujarCeramica,
  baldosas: dibujarBaldosas,
  pasto: dibujarPasto,
  tejas: dibujarTejas,
  rayas: dibujarRayas,
  flores: dibujarFlores,
  azulejos: dibujarAzulejos,
  ladrillos: dibujarLadrillos,
  tablas: dibujarTablas,
  rombos: dibujarRombos,
  lunares: dibujarLunares,
  estrellas: dibujarEstrellas,
  telarana: dibujarTelarana,
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
