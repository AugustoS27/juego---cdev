// Una puerta que gira sobre su bisagra. Cerrada bloquea el paso; abierta no.
//
// Además de las puertas comunes, la misma clase sirve para otras "puertas" (con otro estilo):
//   'rejilla':    la tapa de un conducto de ventilación (chiquita, de metal)
//   'tabla':      la tabla floja que tapa el túnel en la pared del sótano
//   'biblioteca': el estante secreto de la biblioteca (parece un mueble lleno de libros)
// soloJugador: el dueño no la usa (no entra en conductos ni en túneles).
import * as THREE from 'three';
import { materialToon } from './Materials.js';

const VELOCIDAD_GIRO = 5; // radianes por segundo (animación de abrir/cerrar)
const ANGULO_ABIERTA = Math.PI / 2; // 90 grados
const GROSOR_HUECO = 0.2; // igual que las paredes

// Dibujos (en un canvas) para las caras de la hoja: 'rejilla' (varillas) y 'biblioteca' (estantes con libros)
const DIBUJOS = {
  rejilla(ctx, w, h) {
    ctx.fillStyle = '#9aa5b1';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#343a40';
    for (let i = 1; i < 7; i++) ctx.fillRect(w * 0.08, (i * h) / 7 - 5, w * 0.84, 10);
  },
  biblioteca(ctx, w, h) {
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(0, 0, w, h);
    const colores = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#6d597a', '#f4a261'];
    for (let fila = 0; fila < 4; fila++) {
      const piso = h - (0.11 + fila * 0.23) * h; // altura (en el canvas) de cada estante
      for (let i = 0, x = w * 0.06; x < w * 0.9; i++) {
        const ancho = w * (0.04 + ((i * 7 + fila * 3) % 5) * 0.01);
        const alto = h * (0.13 + ((i * 5 + fila) % 4) * 0.018);
        ctx.fillStyle = colores[(i + fila * 2) % colores.length];
        ctx.fillRect(x, piso - alto, ancho, alto);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; // una rayita en el lomo
        ctx.fillRect(x, piso - alto * 0.75, ancho, alto * 0.06);
        x += ancho + w * 0.008;
      }
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(0, piso, w, h * 0.02); // la tabla del estante
    }
  },
};

// Materiales de la hoja: el color de siempre, y el dibujo en la cara de adelante (+Z) y, salvo
// que sea soloAdelante, también en la de atrás. (Orden de las caras de una caja: +x, -x, +y, -y, +z, -z)
function caraConDibujo(material, dibujar, soloAdelante) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  dibujar(canvas.getContext('2d'), 256, 256);
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  const conDibujo = new THREE.MeshToonMaterial({ map: textura, gradientMap: material.gradientMap });
  return [material, material, material, material, conDibujo, soloAdelante ? material : conDibujo];
}

// Color y grosor de la hoja según el estilo de puerta
const ESTILOS = {
  normal: { color: '#ff9f1c', grosor: 0.08 },
  rejilla: { color: '#9aa5b1', grosor: 0.04 },
  tabla: { color: '#8d5524', grosor: 0.06 },
  biblioteca: { color: '#6d4c41', grosor: 0.3 },
};

export class Door {
  // x, z: centro del hueco. y: altura del piso. eje: hacia dónde corre la pared ('x' o 'z').
  constructor(scene, { x, y, z, eje, ancho, alto, conLlave = false, abierta = false, deCalle = false, estilo = 'normal', soloJugador = false }) {
    this.conLlave = conLlave; // no se puede abrir (la puerta de calle, hasta encontrar la llave)
    this.abierta = false;
    this.deCalle = deCalle;
    this.estilo = estilo;
    this.soloJugador = soloJugador;
    this.secreta = estilo === 'biblioteca';
    // Cómo arranca en cada partida (ver reiniciar)
    this.conLlaveInicial = conLlave;
    this.abiertaInicial = abierta;
    this.angulo = 0; // ángulo actual (se anima hacia anguloObjetivo)
    this.anguloObjetivo = 0;
    this.tiempoTrabada = 0; // > 0 mientras el dueño la tenga trabada (segundos que faltan)
    this.piso = Math.round(y / 3);

    // Centro de la puerta: sirve para saber si el jugador está cerca
    this.centro = new THREE.Vector3(x, y + alto / 2, z);

    // La BISAGRA es un grupo vacío ubicado en un costado del hueco.
    // La hoja de la puerta es hija de la bisagra: al girar la bisagra, la hoja gira con ella.
    this.bisagra = new THREE.Group();
    if (eje === 'x') {
      this.bisagra.position.set(x - ancho / 2, y, z);
      this.rotacionBase = 0;
    } else {
      this.bisagra.position.set(x, y, z - ancho / 2);
      this.rotacionBase = -Math.PI / 2; // la giramos para que quede a lo largo de Z
    }
    this.bisagra.rotation.y = this.rotacionBase;
    scene.add(this.bisagra);

    // Hoja (un poco más chica que el hueco para que no roce). Color y grosor según el estilo.
    const { color, grosor } = ESTILOS[estilo];
    this.materialNormal = materialToon(deCalle ? '#8b4513' : color);
    this.materialTrabada = materialToon('#e63946'); // roja mientras está trabada
    // La rejilla y el estante llevan un dibujo en las caras de adelante/atrás (en vez de muchas
    // piecitas: cada malla es un "dibujo" más por frame, y así es una sola)
    const dibujo = DIBUJOS[estilo];
    this.materialHoja = dibujo ? caraConDibujo(this.materialNormal, dibujo, estilo === 'biblioteca') : this.materialNormal;
    this.hoja = new THREE.Mesh(new THREE.BoxGeometry(ancho - 0.04, alto - 0.02, grosor), this.materialHoja);
    this.hoja.position.set(ancho / 2, alto / 2, 0);
    this.hoja.castShadow = true;
    this.hoja.receiveShadow = true;
    this.bisagra.add(this.hoja);
    this.agregarDetalles(ancho, alto);

    // Caja de colisión: todo el hueco de la puerta. Solo se usa mientras está cerrada.
    const mitad = ancho / 2;
    const g = GROSOR_HUECO / 2;
    this.collider =
      eje === 'x'
        ? new THREE.Box3(new THREE.Vector3(x - mitad, y, z - g), new THREE.Vector3(x + mitad, y + alto, z + g))
        : new THREE.Box3(new THREE.Vector3(x - g, y, z - mitad), new THREE.Vector3(x + g, y + alto, z + mitad));
  }

  // Cositas encima de la hoja según el estilo (todas son hijas de la bisagra: giran con la puerta)
  agregarDetalles(ancho, alto) {
    const pieza = (w, h, d, color, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materialToon(color));
      m.position.set(px, py, pz);
      this.bisagra.add(m);
      return m;
    };
    if (this.estilo === 'normal') {
      // Picaportes (uno de cada lado)
      for (const lado of [-1, 1]) {
        const picaporte = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), materialToon('#ffd23f'));
        picaporte.position.set(ancho - 0.15, 1, lado * 0.07);
        this.bisagra.add(picaporte);
      }
    } else if (this.estilo === 'tabla') {
      // Dos tablas cruzadas clavadas
      for (const lado of [-1, 1]) {
        const cruzada = pieza(0.12, alto * 1.1, 0.03, '#6f4518', ancho / 2, alto / 2, lado * 0.05);
        cruzada.rotation.z = lado * 0.6;
      }
    } else if (this.estilo === 'biblioteca') {
      // Los libros están dibujados en la hoja (ver DIBUJOS). Solo el libro rojo que sobresale
      // (la "palanca" del pasadizo) es una pieza aparte, para que se note.
      pieza(0.08, 0.34, 0.14, '#9d0208', ancho - 0.3, 1.43, 0.2);
    }
  }

  // ¿Bloquea el paso? Sí, mientras esté cerrada (o cerrándose).
  get bloquea() {
    return !this.abierta;
  }

  get trabada() {
    return this.tiempoTrabada > 0;
  }

  // Abre si está cerrada, cierra si está abierta. Devuelve false si no se pudo.
  alternar() {
    if (this.conLlave || this.trabada) return false;
    this.abierta = !this.abierta;
    this.anguloObjetivo = this.abierta ? ANGULO_ABIERTA : 0;
    return true;
  }

  // El dueño la cierra y la traba por unos segundos. Después se destraba y se abre sola.
  trabar(segundos) {
    this.abierta = false;
    this.anguloObjetivo = 0;
    this.tiempoTrabada = segundos;
    this.hoja.material = this.materialTrabada;
  }

  destrabar() {
    this.tiempoTrabada = 0;
    this.hoja.material = this.materialHoja;
  }

  // Vuelve a como estaba al empezar la partida, sin animación
  reiniciar() {
    this.destrabar();
    this.conLlave = this.conLlaveInicial;
    this.abierta = this.abiertaInicial;
    this.angulo = this.abierta ? ANGULO_ABIERTA : 0;
    this.anguloObjetivo = this.angulo;
    this.bisagra.rotation.y = this.rotacionBase + this.angulo;
    this.bisagra.updateMatrixWorld(true);
  }

  // Animación: acercamos el ángulo actual al objetivo un poquito por frame
  update(dt) {
    // Cuenta regresiva de la traba: al llegar a 0 se destraba y se abre sola
    if (this.trabada) {
      this.tiempoTrabada -= dt;
      if (this.tiempoTrabada <= 0) {
        this.destrabar();
        this.alternar();
      }
    }

    const diferencia = this.anguloObjetivo - this.angulo;
    const paso = VELOCIDAD_GIRO * dt;
    if (Math.abs(diferencia) <= paso) {
      this.angulo = this.anguloObjetivo;
    } else {
      this.angulo += Math.sign(diferencia) * paso;
    }
    this.bisagra.rotation.y = this.rotacionBase + this.angulo;
    // Actualizamos su posición en el mundo ya mismo: los rayos de visión del dueño la usan
    this.bisagra.updateMatrixWorld(true);
  }
}
