// ============================================================
//  DATOS DE LA CASA
//  Todo lo que forma la casa está descripto acá como datos simples.
//  House.js lee estos arreglos y construye la escena.
//
//  Sistema de coordenadas (visto desde arriba):
//    - X va de oeste (-9) a este (+9)
//    - Z va de norte (-6) a sur (+6)
//    - Y es la altura. Cada piso mide 3 metros: piso 0 = planta baja, piso 1 = planta alta.
//
//  Plano (igual en los dos pisos, el garaje solo en planta baja):
//
//  x=-15.5   x=-9      x=-3        x=3          x=9
//  z=-6       +--------+-----------+------------+
//             |        |           |  baño      |
//  z=-2 +-----+        |  cocina / |------------+
//       |     | living |  cuarto   |  comedor / |  <- puerta trasera (x=9)
//       |gara-|   /    |  del hijo |  estudio   |
//       | je  | dormi- +-----------+------------+ z=2
//       |     | torio  |  entrada / pasillo     |
//       |     |        |  (acá está la escalera)|
//  z=6  +-----+--------+------------------------+
//       portón  ventana    puerta de calle
//              (y balcón arriba)
//
//  El frente de la casa mira al SUR (+Z): ahí está el jardín delantero y la calle.
// ============================================================

export const ALTURA_PISO = 3;

// Dónde aparece el jugador: afuera, en el camino del jardín delantero, mirando la casa
export const INICIO_JUGADOR = { x: -1, y: 0, z: 19 };

// Rectángulo de la casa principal (sin el garaje). El dueño nunca sale de acá.
export const LIMITES_CASA = { x1: -9, z1: -6, x2: 9, z2: 6 };

// Color de las paredes por fuera (las caras que no dan a ninguna habitación)
export const COLOR_EXTERIOR = '#8fd3d9';

// --- Habitaciones: nombre, piso y rectángulos [x1, z1, x2, z2] que forman su piso ---
// textura: dibujo del piso ('madera', 'ceramica', 'baldosas'), teñido con colorPiso (ver Texturas.js)
// (El pasillo de arriba usa 3 rectángulos para dejar el hueco de la escalera.)
export const HABITACIONES = [
  // Planta baja
  { nombre: 'living', piso: 0, rects: [[-9, -6, -3, 6]], colorPiso: '#f4a261', textura: 'madera' },
  { nombre: 'cocina', piso: 0, rects: [[-3, -6, 3, 2]], colorPiso: '#b5e48c', textura: 'ceramica' },
  { nombre: 'comedor', piso: 0, rects: [[3, -2, 9, 2]], colorPiso: '#ffd6a5', textura: 'madera' },
  { nombre: 'baño', piso: 0, rects: [[3, -6, 9, -2]], colorPiso: '#a0e7e5', textura: 'ceramica' },
  { nombre: 'entrada', piso: 0, rects: [[-3, 2, 9, 6]], colorPiso: '#cdb4db', textura: 'madera' },
  { nombre: 'garaje', piso: 0, rects: [[-15.5, -2, -9, 6]], colorPiso: '#b8c0c8', textura: 'baldosas', colorParedes: '#dfe4e8' },
  // Planta alta
  { nombre: 'dormitorio', piso: 1, rects: [[-9, -6, -3, 6]], colorPiso: '#bde0fe', textura: 'madera' },
  { nombre: 'cuarto del hijo', piso: 1, rects: [[-3, -6, 3, 2]], colorPiso: '#caffbf', textura: 'madera' },
  { nombre: 'estudio', piso: 1, rects: [[3, -2, 9, 2]], colorPiso: '#fdffb6', textura: 'madera' },
  { nombre: 'baño de arriba', piso: 1, rects: [[3, -6, 9, -2]], colorPiso: '#a0e7e5', textura: 'ceramica' },
  {
    nombre: 'pasillo',
    piso: 1,
    rects: [
      [-3, 2, 9, 4], // franja principal
      [-3, 4, 1, 6], // rincón al oeste de la escalera
      [7, 4, 9, 6], // descanso donde llega la escalera
    ],
    colorPiso: '#cdb4db',
    textura: 'madera',
  },
];

// Color de las paredes por dentro. Cada cara de una pared toma el color de la habitación
// a la que da (colorParedes, o el de su piso); si no da a ninguna, es de afuera: COLOR_EXTERIOR.
export const COLORES_PAREDES = ['#ffe8a3', '#ffd6e0']; // [planta baja, planta alta]

// --- Paredes: líneas rectas [x1, z1, x2, z2]. Los dos pisos usan el mismo plano. ---
// Los huecos (puertas, ventana rompible, portón) se recortan solos (ver House.crearPared).
const LINEAS_DE_PAREDES = [
  // Exteriores
  [-9, -6, 9, -6],
  [-9, 6, 9, 6],
  [-9, -6, -9, -2], // la pared oeste va en dos partes: una da afuera y la otra al garaje
  [-9, -2, -9, 6],
  [9, -6, 9, 6],
  // Interiores
  [-3, -6, -3, 6],
  [-3, 2, 9, 2],
  [3, -6, 3, 2],
  [3, -2, 9, -2],
];

// El garaje (solo planta baja). Su pared este es la pared oeste de la casa.
const LINEAS_DEL_GARAJE = [
  [-15.5, -2, -9, -2],
  [-15.5, -2, -15.5, 6],
  [-15.5, 6, -9, 6],
];

export const PAREDES = [
  ...[0, 1].flatMap((piso) => LINEAS_DE_PAREDES.map(([x1, z1, x2, z2]) => ({ piso, x1, z1, x2, z2 }))),
  ...LINEAS_DEL_GARAJE.map(([x1, z1, x2, z2]) => ({ piso: 0, x1, z1, x2, z2 })),
];

// --- Puertas: piso, centro (x, z) y "eje" = hacia dónde corre la pared donde está ---
//   eje 'x': pared que va de oeste a este (z fija)
//   eje 'z': pared que va de norte a sur (x fija)
//   conLlave: no se puede abrir (hasta encontrar la llave)
//   abierta: arranca abierta
export const PUERTAS = [
  // Planta baja
  { piso: 0, x: -3, z: 4, eje: 'z' }, // living ↔ entrada
  { piso: 0, x: -3, z: -2, eje: 'z' }, // living ↔ cocina
  { piso: 0, x: 0, z: 2, eje: 'x' }, // cocina ↔ entrada
  { piso: 0, x: 3, z: 0, eje: 'z' }, // cocina ↔ comedor
  { piso: 0, x: 6, z: 2, eje: 'x' }, // comedor ↔ entrada
  { piso: 0, x: 6, z: -2, eje: 'x' }, // comedor ↔ baño
  { piso: 0, x: -1, z: 6, eje: 'x', conLlave: true, deCalle: true }, // puerta de calle (hay una llave escondida)
  { piso: 0, x: 9, z: 1.1, eje: 'z', abierta: true }, // puerta trasera del comedor (¡se la olvidaron abierta!)
  { piso: 0, x: -9, z: 3.2, eje: 'z' }, // garaje ↔ living
  // Planta alta
  { piso: 1, x: -3, z: 3, eje: 'z' }, // pasillo ↔ dormitorio
  { piso: 1, x: 0, z: 2, eje: 'x' }, // pasillo ↔ cuarto del hijo
  { piso: 1, x: 5, z: 2, eje: 'x' }, // pasillo ↔ estudio
  { piso: 1, x: 3, z: -4, eje: 'z' }, // cuarto del hijo ↔ baño de arriba
  { piso: 1, x: -6, z: 6, eje: 'x' }, // dormitorio ↔ balcón
];

// ============================================================
//  FORMAS DE ENTRAR (ver Entradas.js)
// ============================================================
// Ventana del living que se puede romper (hueco en la pared con alféizar abajo)
export const VENTANA_ROMPIBLE = { piso: 0, x: -4.2, z: 6, eje: 'x', ancho: 1.4, abajo: 1, arriba: 2.2 };

// Portón basculante del garaje (se fuerza manteniendo E)
export const PORTON_GARAJE = { piso: 0, x: -12.25, z: 6, eje: 'x', ancho: 4.4, alto: 2.5 };

// Balcón del dormitorio (planta alta, sobre el frente) y la escalera tirada en el pasto
export const BALCON = { x1: -8.2, z1: 6.1, x2: -3.8, z2: 8.1 };
export const ESCALERA_BALCON = { x: -6.9, zBase: 9.3, zApoyo: 8.15, alturaApoyo: 4 };

// Macetas junto a la puerta de calle: en una (al azar) está la llave de repuesto
export const MACETAS = [
  { x: -2.4, z: 6.7 },
  { x: 0.4, z: 6.7 },
  { x: 1.3, z: 6.7 },
];

// --- Escalera: una rampa que sube en +X, pegada a la pared sur de la entrada ---
export const ESCALERA = { inicioX: 1, z: 5.15, largo: 6, ancho: 1.7, altura: ALTURA_PISO };

// --- Barandas en la planta alta, alrededor del hueco de la escalera (para no caerse) ---
export const BARANDAS = [
  { piso: 1, x1: 1, z1: 3.9, x2: 7, z2: 4 },
  { piso: 1, x1: 0.9, z1: 3.9, x2: 1, z2: 6 },
];

// ============================================================
//  CATÁLOGO DE MUEBLES
//  Cada tipo es una lista de "partes" (cajas). Cada parte es:
//    [x, y, z, ancho, alto, profundidad, color]
//  x/z son relativos al centro del mueble, y es la altura donde empieza la parte.
//  El frente del mueble mira hacia +Z (el respaldo o la cabecera quedan en -Z).
//
//  Opciones:
//    solido: false -> se puede atravesar (alfombras, ventanas)
//    sombra: false -> no proyecta sombra
//    modelo: '/models/archivo.glb' -> carga un modelo GLTF y lo encaja en la caja que ocupan
//            las partes. Si falla, queda la versión hecha con cajas.
//    modelos: [{ archivo, caja: [x, y, z, ancho, alto, prof], rot }] -> varios modelos,
//            cada uno encajado en su propia caja (ej: la mesada son 4 módulos de cocina).
//    Las "partes" se usan siempre para la colisión, aunque se vea el modelo.
//    escondite: 'placard' o 'cama' -> el jugador se puede esconder ahí (con E)
// ============================================================
// Ruta de un modelo de muebles de Kenney (en public/models/muebles)
const M = (nombre) => `/models/muebles/${nombre}.glb`;

export const MUEBLES = {
  sillon: {
    modelo: M('loungeSofa'),
    partes: [
      [0, 0, 0, 2.2, 0.45, 0.9, '#e4572e'],
      [0, 0.45, -0.35, 2.2, 0.5, 0.2, '#c8401f'],
      [-1, 0.45, 0, 0.2, 0.25, 0.9, '#c8401f'],
      [1, 0.45, 0, 0.2, 0.25, 0.9, '#c8401f'],
    ],
  },
  mesaRatona: { modelo: M('tableCoffee'), partes: [[0, 0, 0, 1.2, 0.4, 0.7, '#a0522d']] },
  tv: {
    modelos: [
      { archivo: M('cabinetTelevision'), caja: [0, 0, 0, 1.6, 0.5, 0.5] },
      { archivo: M('televisionModern'), caja: [0, 0.5, 0, 1.4, 0.8, 0.12] },
    ],
    partes: [
      [0, 0, 0, 1.6, 0.5, 0.5, '#6d4c41'],
      [0, 0.5, 0, 1.4, 0.8, 0.08, '#222222'],
    ],
  },
  biblioteca: {
    modelo: M('bookcaseClosedWide'),
    partes: [
      [0, 0, 0, 1.8, 2, 0.4, '#8d6e63'],
      [-0.5, 0.3, 0.15, 0.5, 0.35, 0.15, '#4c6ef5'],
      [0.3, 1, 0.15, 0.7, 0.35, 0.15, '#ffd23f'],
      [-0.2, 1.5, 0.15, 0.6, 0.35, 0.15, '#e4572e'],
    ],
  },
  planta: {
    modelo: M('pottedPlant'),
    partes: [
      [0, 0, 0, 0.5, 0.5, 0.5, '#d2691e'],
      [0, 0.5, 0, 0.7, 0.8, 0.7, '#2e9e44'],
    ],
  },
  // La mesada se arma con 4 módulos de cocina de 1 metro, uno al lado del otro
  mesada: {
    modelos: [
      { archivo: M('kitchenCabinet'), caja: [-1.5, 0, 0, 1, 0.96, 0.72] },
      { archivo: M('kitchenSink'), caja: [-0.5, 0, 0, 1, 0.96, 0.72] },
      { archivo: M('kitchenStove'), caja: [0.5, 0, 0, 1, 0.96, 0.72] },
      { archivo: M('kitchenCabinetDrawer'), caja: [1.5, 0, 0, 1, 0.96, 0.72] },
      { archivo: M('toaster'), caja: [-1.8, 0.96, -0.15, 0.3, 0.2, 0.2] },
    ],
    partes: [
      [0, 0, 0, 4, 0.9, 0.7, '#f0f0f0'],
      [0, 0.9, 0, 4, 0.06, 0.72, '#555555'],
    ],
  },
  heladera: {
    modelo: M('kitchenFridge'),
    partes: [
      [0, 0, 0, 0.8, 1.9, 0.8, '#dfe7ee'],
      [0.3, 0.9, 0.4, 0.05, 0.5, 0.05, '#888888'],
    ],
  },
  mesa: {
    modelo: M('table'),
    partes: [
      [0, 0.7, 0, 1.4, 0.08, 0.8, '#c68642'],
      [-0.6, 0, -0.3, 0.08, 0.7, 0.08, '#8d5524'],
      [0.6, 0, -0.3, 0.08, 0.7, 0.08, '#8d5524'],
      [-0.6, 0, 0.3, 0.08, 0.7, 0.08, '#8d5524'],
      [0.6, 0, 0.3, 0.08, 0.7, 0.08, '#8d5524'],
    ],
  },
  mesaComedor: {
    modelo: M('tableCloth'),
    partes: [
      [0, 0.7, 0, 1.6, 0.08, 1, '#c68642'],
      [-0.7, 0, -0.4, 0.08, 0.7, 0.08, '#8d5524'],
      [0.7, 0, -0.4, 0.08, 0.7, 0.08, '#8d5524'],
      [-0.7, 0, 0.4, 0.08, 0.7, 0.08, '#8d5524'],
      [0.7, 0, 0.4, 0.08, 0.7, 0.08, '#8d5524'],
    ],
  },
  silla: {
    solido: false,
    modelo: M('chair'),
    partes: [
      [0, 0.42, 0, 0.45, 0.06, 0.45, '#c68642'],
      [0, 0, 0, 0.06, 0.42, 0.06, '#8d5524'],
      [0, 0.48, -0.2, 0.45, 0.45, 0.05, '#c68642'],
    ],
  },
  aparador: { modelo: M('sideTableDrawers'), partes: [[0, 0, 0, 1.6, 0.9, 0.5, '#8d6e63']] },
  inodoro: {
    modelo: M('toilet'),
    partes: [
      [0, 0, 0.05, 0.45, 0.45, 0.5, '#ffffff'],
      [0, 0.45, -0.2, 0.45, 0.4, 0.18, '#ffffff'],
    ],
  },
  lavamanos: {
    modelos: [
      { archivo: M('bathroomSink'), caja: [0, 0, 0, 0.6, 0.85, 0.45] },
      { archivo: M('bathroomMirror'), caja: [0, 1.15, -0.18, 0.55, 0.65, 0.05] },
    ],
    partes: [[0, 0, 0, 0.6, 0.85, 0.45, '#ffffff']],
  },
  banera: {
    // La bañera de Kenney es larga en X y la nuestra en Z: la giramos 90°
    modelos: [{ archivo: M('bathtub'), caja: [0, 0, 0, 0.75, 0.56, 1.7], rot: 90 }],
    partes: [
      [0, 0, 0, 0.75, 0.55, 1.7, '#ffffff'],
      [0, 0.5, 0, 0.6, 0.06, 1.5, '#6ec6ff'],
    ],
  },
  camaDoble: {
    escondite: 'cama',
    modelos: [{ archivo: M('bedDouble'), caja: [0, 0, -0.01, 1.8, 0.75, 2.12] }],
    partes: [
      [0, 0, 0, 1.8, 0.45, 2.1, '#6d4c41'],
      [0, 0.45, 0.05, 1.7, 0.2, 2, '#ffffff'],
      [0, 0.6, 0.3, 1.72, 0.06, 1.4, '#9b5de5'],
      [-0.45, 0.65, -0.75, 0.6, 0.12, 0.3, '#ffffff'],
      [0.45, 0.65, -0.75, 0.6, 0.12, 0.3, '#ffffff'],
      [0, 0, -1.02, 1.8, 1.1, 0.1, '#6d4c41'],
    ],
  },
  camaSimple: {
    escondite: 'cama',
    modelos: [{ archivo: M('bedSingle'), caja: [0, 0, -0.01, 1, 0.7, 2.04] }],
    partes: [
      [0, 0, 0, 1, 0.45, 2, '#6d4c41'],
      [0, 0.45, 0.05, 0.92, 0.2, 1.9, '#ffffff'],
      [0, 0.6, 0.3, 0.94, 0.06, 1.3, '#00bbf9'],
      [0, 0.65, -0.7, 0.6, 0.12, 0.3, '#ffffff'],
      [0, 0, -0.97, 1, 1.1, 0.1, '#6d4c41'],
    ],
  },
  mesaLuz: { modelo: M('cabinetBedDrawerTable'), partes: [[0, 0, 0, 0.5, 0.5, 0.4, '#8d6e63']] },
  // El placard: dos armarios de Kenney, uno al lado del otro
  placard: {
    escondite: 'placard',
    modelos: [
      { archivo: M('bookcaseClosedDoors'), caja: [-0.5, 0, 0, 1, 2.3, 0.72] },
      { archivo: M('bookcaseClosedDoors'), caja: [0.5, 0, 0, 1, 2.3, 0.72] },
    ],
    partes: [
      [0, 0, 0, 2, 2.3, 0.7, '#b5835a'],
      [-0.5, 0.1, 0.35, 0.94, 2.1, 0.02, '#c99a6b'],
      [0.5, 0.1, 0.35, 0.94, 2.1, 0.02, '#c99a6b'],
      [-0.1, 1, 0.37, 0.05, 0.3, 0.04, '#ffd23f'],
      [0.1, 1, 0.37, 0.05, 0.3, 0.04, '#ffd23f'],
    ],
  },
  comoda: { modelo: M('sideTableDrawers'), partes: [[0, 0, 0, 1.4, 0.9, 0.5, '#b5835a']] },
  escritorio: {
    modelo: M('desk'),
    partes: [
      [0, 0.72, 0, 1.2, 0.06, 0.6, '#c68642'],
      [-0.55, 0, 0, 0.08, 0.72, 0.55, '#8d5524'],
      [0.55, 0, 0, 0.08, 0.72, 0.55, '#8d5524'],
    ],
  },
  sillaEscritorio: {
    solido: false,
    modelo: M('chairDesk'),
    partes: [
      [0, 0.45, 0, 0.5, 0.08, 0.5, '#e4572e'],
      [0, 0, 0, 0.08, 0.45, 0.08, '#555555'],
      [0, 0.53, -0.22, 0.5, 0.5, 0.06, '#e4572e'],
    ],
  },
  muebleEntrada: { modelo: M('sideTable'), partes: [[0, 0, 0, 0.9, 0.9, 0.4, '#8d6e63']] },
  // --- Detalles (se pueden atravesar) ---
  lamparaPie: {
    solido: false,
    modelo: M('lampRoundFloor'),
    partes: [
      [0, 0, 0, 0.08, 1.5, 0.08, '#555555'],
      [0, 1.3, 0, 0.4, 0.3, 0.4, '#fff3b0'],
    ],
  },
  perchero: {
    solido: false,
    modelo: M('coatRackStanding'),
    partes: [[0, 0, 0, 0.08, 1.7, 0.08, '#8d5524']],
  },
  osito: {
    solido: false,
    modelo: M('bear'),
    partes: [[0, 0.62, 0, 0.3, 0.35, 0.25, '#a0522d']],
  },
  tacho: { solido: false, modelo: M('trashcan'), partes: [[0, 0, 0, 0.35, 0.5, 0.35, '#adb5bd']] },
  lavarropas: { modelo: M('washer'), partes: [[0, 0, 0, 0.7, 0.85, 0.65, '#ffffff']] },
  // --- Garaje ---
  auto: {
    partes: [
      [0, 0.25, 0, 1.8, 0.6, 3.8, '#e63946'], // carrocería
      [0, 0.85, -0.2, 1.6, 0.55, 2, '#e63946'], // cabina
      [0, 0.9, -0.2, 1.62, 0.42, 1.7, '#a8dadc'], // vidrios
      [-0.85, 0, 1.2, 0.25, 0.55, 0.55, '#222222'], // ruedas
      [0.85, 0, 1.2, 0.25, 0.55, 0.55, '#222222'],
      [-0.85, 0, -1.2, 0.25, 0.55, 0.55, '#222222'],
      [0.85, 0, -1.2, 0.25, 0.55, 0.55, '#222222'],
      [-0.6, 0.5, 1.91, 0.3, 0.15, 0.02, '#fff3b0'], // faros
      [0.6, 0.5, 1.91, 0.3, 0.15, 0.02, '#fff3b0'],
    ],
  },
  estanteria: {
    modelos: [
      { archivo: M('bookcaseOpen'), caja: [-0.6, 0, 0, 1.2, 2, 0.5] },
      { archivo: M('bookcaseOpen'), caja: [0.6, 0, 0, 1.2, 2, 0.5] },
      { archivo: M('cardboardBoxOpen'), caja: [-0.6, 0.05, 0.02, 0.6, 0.35, 0.4] },
    ],
    partes: [
      [0, 0, 0, 2.4, 2, 0.5, '#8d6e63'],
      [-0.7, 0.3, 0.1, 0.5, 0.4, 0.4, '#f4a261'], // latas de pintura y cajas
      [0.2, 0.3, 0.1, 0.6, 0.35, 0.4, '#457b9d'],
      [-0.3, 1.1, 0.1, 0.8, 0.4, 0.4, '#e9c46a'],
      [0.7, 1.1, 0.1, 0.4, 0.3, 0.4, '#2a9d8f'],
    ],
  },
  mesaTrabajo: {
    partes: [
      [0, 0, 0, 2, 0.9, 0.7, '#a0522d'],
      [0, 0.9, -0.3, 2, 1.1, 0.06, '#c9a227'], // tablero de herramientas
      [-0.5, 1.2, -0.25, 0.08, 0.4, 0.05, '#555555'],
      [0, 1.3, -0.25, 0.3, 0.08, 0.05, '#e63946'],
      [0.5, 1.15, -0.25, 0.1, 0.5, 0.05, '#555555'],
    ],
  },
  cajas: {
    modelos: [
      { archivo: M('cardboardBoxClosed'), caja: [0, 0, 0, 0.8, 0.6, 0.8] },
      { archivo: M('cardboardBoxClosed'), caja: [0.1, 0.6, 0.05, 0.6, 0.5, 0.6], rot: 30 },
    ],
    partes: [
      [0, 0, 0, 0.8, 0.6, 0.8, '#d4a373'],
      [0.1, 0.6, 0.05, 0.6, 0.5, 0.6, '#c68b59'],
    ],
  },
  alfombra: { solido: false, sombra: false, modelo: M('rugRectangle'), partes: [[0, 0, 0, 2.5, 0.02, 1.8, '#ffafcc']] },
  alfombraRedonda: { solido: false, sombra: false, modelo: M('rugRound'), partes: [[0, 0, 0, 2.2, 0.02, 2.2, '#ffafcc']] },
  ventana: {
    solido: false,
    sombra: false,
    partes: [
      [0, 1, 0, 1.4, 1.2, 0.06, '#ffffff'],
      [0, 1.1, 0.01, 1.2, 1, 0.06, '#9be7ff'],
    ],
  },
};

// --- Muebles ubicados en la casa: tipo, piso, posición (x, z) y rotación en grados ---
// Rotación: 0 = el frente mira al sur (+Z), 90 = al este, -90 = al oeste, 180 = al norte.
// Solo usamos múltiplos de 90° para que las cajas de colisión (AABB) sean exactas.
export const UBICACION_MUEBLES = [
  // ---------- Planta baja ----------
  // Living
  { tipo: 'sillon', piso: 0, x: -8.4, z: 0, rot: 90 },
  { tipo: 'mesaRatona', piso: 0, x: -7, z: 0, rot: 90 },
  { tipo: 'alfombra', piso: 0, x: -6.8, z: 0, rot: 90 },
  { tipo: 'tv', piso: 0, x: -3.45, z: 0.8, rot: -90 },
  { tipo: 'biblioteca', piso: 0, x: -6, z: -5.7 },
  { tipo: 'planta', piso: 0, x: -8.4, z: 5.4 },
  { tipo: 'lamparaPie', piso: 0, x: -8.5, z: -5.4 },
  { tipo: 'ventana', piso: 0, x: -8.87, z: -3, rot: 90 },
  // Cocina
  { tipo: 'mesada', piso: 0, x: -0.5, z: -5.55 },
  { tipo: 'heladera', piso: 0, x: 2.4, z: -5.45 },
  { tipo: 'mesa', piso: 0, x: -1, z: -3.8 },
  { tipo: 'silla', piso: 0, x: -1.4, z: -3, rot: 180 },
  { tipo: 'silla', piso: 0, x: -0.6, z: -3, rot: 180 },
  { tipo: 'tacho', piso: 0, x: 2.6, z: -4.6 },
  { tipo: 'ventana', piso: 0, x: -0.5, z: -5.87 },
  // Comedor
  { tipo: 'mesaComedor', piso: 0, x: 7, z: 0 },
  { tipo: 'silla', piso: 0, x: 6.4, z: 0.8, rot: 180 },
  { tipo: 'silla', piso: 0, x: 7.6, z: 0.8, rot: 180 },
  { tipo: 'silla', piso: 0, x: 6.4, z: -0.8 },
  { tipo: 'silla', piso: 0, x: 7.6, z: -0.8 },
  { tipo: 'aparador', piso: 0, x: 8.6, z: -1, rot: -90 },
  { tipo: 'ventana', piso: 0, x: 8.87, z: -1, rot: -90 },
  // Baño
  { tipo: 'banera', piso: 0, x: 4.2, z: -3.3, rot: 90 },
  { tipo: 'inodoro', piso: 0, x: 8.5, z: -5.5 },
  { tipo: 'lavamanos', piso: 0, x: 6, z: -5.65 },
  { tipo: 'lavarropas', piso: 0, x: 8.55, z: -3.6, rot: -90 },
  { tipo: 'ventana', piso: 0, x: 4.5, z: -5.87 },
  // Entrada
  { tipo: 'muebleEntrada', piso: 0, x: -2.4, z: 5.65, rot: 180 },
  { tipo: 'perchero', piso: 0, x: -2.6, z: 2.5 },
  { tipo: 'placard', piso: 0, x: 8.5, z: 3.2, rot: -90 },
  { tipo: 'planta', piso: 0, x: 8.4, z: 5.4 },

  // ---------- Planta alta ----------
  // Dormitorio
  { tipo: 'camaDoble', piso: 1, x: -7.85, z: 0, rot: 90 },
  { tipo: 'mesaLuz', piso: 1, x: -8.6, z: 1.3 },
  { tipo: 'mesaLuz', piso: 1, x: -8.6, z: -1.3 },
  { tipo: 'placard', piso: 1, x: -6, z: -5.5 },
  { tipo: 'comoda', piso: 1, x: -8, z: 5.6, rot: 180 },
  { tipo: 'alfombraRedonda', piso: 1, x: -5.4, z: 0 },
  { tipo: 'lamparaPie', piso: 1, x: -4.2, z: -5.5 },
  { tipo: 'ventana', piso: 1, x: -8.87, z: 3.5, rot: 90 },
  { tipo: 'ventana', piso: 1, x: -8.87, z: -3.5, rot: 90 },
  // Cuarto del hijo
  { tipo: 'camaSimple', piso: 1, x: -2.2, z: -4.85 },
  { tipo: 'osito', piso: 1, x: -2.2, z: -5.45 },
  { tipo: 'placard', piso: 1, x: 2.5, z: -0.9, rot: -90 },
  { tipo: 'escritorio', piso: 1, x: 0.5, z: -5.6 },
  { tipo: 'sillaEscritorio', piso: 1, x: 0.5, z: -4.85, rot: 180 },
  { tipo: 'ventana', piso: 1, x: 1.8, z: -5.87 },
  // Estudio
  { tipo: 'escritorio', piso: 1, x: 8.5, z: 0, rot: -90 },
  { tipo: 'sillaEscritorio', piso: 1, x: 7.75, z: 0, rot: 90 },
  { tipo: 'biblioteca', piso: 1, x: 6, z: -1.7 },
  { tipo: 'planta', piso: 1, x: 3.5, z: -1.5 },
  { tipo: 'ventana', piso: 1, x: 8.87, z: 0, rot: -90 },
  // Baño de arriba
  { tipo: 'banera', piso: 1, x: 8.5, z: -4.5 },
  { tipo: 'inodoro', piso: 1, x: 8.5, z: -2.5, rot: 180 },
  { tipo: 'lavamanos', piso: 1, x: 5.5, z: -5.65 },
  // Pasillo
  { tipo: 'planta', piso: 1, x: -2.5, z: 5.4 },
  { tipo: 'ventana', piso: 1, x: -1, z: 5.87, rot: 180 },

  // ---------- Garaje ----------
  { tipo: 'auto', piso: 0, x: -12.4, z: 1.6 },
  { tipo: 'estanteria', piso: 0, x: -15.1, z: 1, rot: 90 },
  { tipo: 'mesaTrabajo', piso: 0, x: -12.3, z: -1.5 },
  { tipo: 'cajas', piso: 0, x: -14.6, z: 4.9 },
];

// ============================================================
//  WAYPOINTS: puntos por donde va a caminar el dueño (se usan en la etapa 4).
//  Hay puntos en las habitaciones y uno en cada puerta (los "p-..."), ubicados
//  para que entre dos puntos conectados se pueda ir en línea recta sin chocar,
//  y cruzando las puertas más o menos de frente.
// ============================================================
export const WAYPOINTS = [
  // Planta baja (y = 0)
  { id: 'living', pos: [-5.5, 0, 3] },
  { id: 'living-norte', pos: [-5.5, 0, -2] },
  { id: 'p-living-entrada', pos: [-3, 0, 4] },
  { id: 'p-living-cocina', pos: [-3, 0, -2] },
  { id: 'cocina', pos: [1, 0, -0.8] },
  { id: 'p-cocina-entrada', pos: [0, 0, 2] },
  { id: 'p-cocina-comedor', pos: [3, 0, 0] },
  { id: 'comedor', pos: [4.5, 0, 0] },
  { id: 'p-comedor-entrada', pos: [6, 0, 2] },
  { id: 'p-comedor-baño', pos: [6, 0, -2] },
  { id: 'baño', pos: [6, 0, -4] },
  { id: 'entrada-oeste', pos: [-1.5, 0, 3.2] },
  { id: 'entrada-centro', pos: [0, 0, 3.2] },
  { id: 'entrada-este', pos: [6, 0, 3.2] },
  { id: 'escalera-abajo', pos: [0, 0, 5.15] },
  // Planta alta (y = 3)
  { id: 'escalera-arriba', pos: [8, 3, 5.15] },
  { id: 'pasillo-este', pos: [7.5, 3, 3] },
  { id: 'pasillo-centro', pos: [5, 3, 3] },
  { id: 'pasillo-oeste', pos: [0, 3, 3] },
  { id: 'p-estudio', pos: [5, 3, 2] },
  { id: 'estudio', pos: [5.5, 3, 0.3] },
  { id: 'p-hijo', pos: [0, 3, 2] },
  { id: 'hijo', pos: [0.5, 3, -2.5] },
  { id: 'p-baño-arriba', pos: [3, 3, -4] },
  { id: 'baño-arriba', pos: [6, 3, -4] },
  { id: 'p-dormitorio', pos: [-3, 3, 3] },
  { id: 'dormitorio', pos: [-5, 3, 2.5] },
];

// Pares de waypoints conectados (se puede caminar en línea recta entre ellos)
export const CONEXIONES = [
  // Planta baja
  ['living', 'living-norte'],
  ['living', 'p-living-entrada'],
  ['living-norte', 'p-living-cocina'],
  ['p-living-entrada', 'entrada-oeste'],
  ['p-living-cocina', 'cocina'],
  ['cocina', 'p-cocina-entrada'],
  ['cocina', 'p-cocina-comedor'],
  ['p-cocina-entrada', 'entrada-centro'],
  ['p-cocina-comedor', 'comedor'],
  ['comedor', 'p-comedor-entrada'],
  ['comedor', 'p-comedor-baño'],
  ['p-comedor-baño', 'baño'],
  ['p-comedor-entrada', 'entrada-este'],
  ['entrada-oeste', 'entrada-centro'],
  ['entrada-centro', 'entrada-este'],
  ['entrada-centro', 'escalera-abajo'],
  // Escalera
  ['escalera-abajo', 'escalera-arriba'],
  // Planta alta
  ['escalera-arriba', 'pasillo-este'],
  ['pasillo-este', 'pasillo-centro'],
  ['pasillo-centro', 'pasillo-oeste'],
  ['pasillo-centro', 'p-estudio'],
  ['p-estudio', 'estudio'],
  ['pasillo-oeste', 'p-hijo'],
  ['p-hijo', 'hijo'],
  ['hijo', 'p-baño-arriba'],
  ['p-baño-arriba', 'baño-arriba'],
  ['pasillo-oeste', 'p-dormitorio'],
  ['p-dormitorio', 'dormitorio'],
];
