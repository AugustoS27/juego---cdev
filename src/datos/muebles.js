// ============================================================
//  CATÁLOGO DE MUEBLES
//  Cada tipo es una lista de "partes". Cada parte es:
//    [x, y, z, ancho, alto, profundidad, color, forma]
//  x/z son relativos al centro del mueble, y es la altura donde empieza la parte.
//  forma (opcional): 'cilindro' o 'esfera' (si no se pone, es una caja).
//  El frente del mueble mira hacia +Z (el respaldo o la cabecera quedan en -Z).
//
//  Opciones:
//    solido: false -> se puede atravesar (alfombras, ventanas)
//    sombra: false -> no proyecta sombra
//    modelo: '/models/archivo.glb' -> carga un modelo GLTF y lo encaja en la caja que ocupan
//            las partes. Si falla, queda la versión hecha con formas básicas.
//    modelos: [{ archivo, caja: [x, y, z, ancho, alto, prof], rot }] -> varios modelos,
//            cada uno encajado en su propia caja (ej: la mesada son 4 módulos de cocina).
//    Las "partes" se usan siempre para la colisión, aunque se vea el modelo.
//    fijas: partes como las de "partes", pero que se ven siempre, aunque cargue el modelo
//            (ej: la cortina de la bañera, que no viene en el modelo de Kenney)
//    escondite: 'placard', 'cama', 'mesa', 'banera' o 'caja' -> el jugador se puede esconder ahí
//            (con E). Cada tipo está explicado en Escondites.js
//    colores: { nombre: color } -> colores por defecto de las partes pintadas con '$nombre'
//            (cada mueble ubicado puede cambiarlos: ej. el color de la tela de un almohadón)
// ============================================================
import { M } from './comun.js';

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
    escondite: 'mesa',
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
    escondite: 'mesa',
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
    escondite: 'banera',
    modelos: [{ archivo: M('bathtub'), caja: [0, 0, 0, 0.75, 0.56, 1.7], rot: 90 }],
    partes: [
      [0, 0, 0, 0.75, 0.55, 1.7, '#ffffff'],
      [0, 0.5, 0, 0.6, 0.06, 1.5, '#6ec6ff'],
    ],
    // Cortina (del lado -X, el que da al baño) colgada de un barral: cuatro paños a rayas,
    // un poco corridos entre sí para que parezcan pliegues
    fijas: [
      [-0.37, 1.95, 0, 0.03, 0.03, 1.72, '#adb5bd'],
      [-0.35, 0.62, -0.64, 0.02, 1.33, 0.44, '#90e0ef'],
      [-0.38, 0.62, -0.21, 0.02, 1.33, 0.44, '#f8f9fa'],
      [-0.35, 0.62, 0.21, 0.02, 1.33, 0.44, '#90e0ef'],
      [-0.38, 0.62, 0.64, 0.02, 1.33, 0.44, '#f8f9fa'],
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
  // Caja de cartón enorme (abierta): entrás agachado y cerrás las solapas
  cajaGrande: {
    escondite: 'caja',
    modelo: M('cardboardBoxOpen'),
    partes: [
      [0, 0, 0, 1, 1.05, 1, '#d4a373'],
      [-0.5, 1.05, 0, 0.04, 0.3, 1, '#c68b59'],
      [0.5, 1.05, 0, 0.04, 0.3, 1, '#c68b59'],
    ],
  },
  alfombra: { solido: false, sombra: false, modelo: M('rugRectangle'), partes: [[0, 0, 0, 2.5, 0.02, 1.8, '#ffafcc']] },
  alfombraRedonda: { solido: false, sombra: false, modelo: M('rugRound'), partes: [[0, 0, 0, 2.2, 0.02, 2.2, '#ffafcc']] },
  // Ventana con cortinas (etapa 11C) a los costados y su barral
  ventana: {
    solido: false,
    sombra: false,
    colores: { tela: '#e76f51' },
    partes: [
      [0, 1, 0, 1.4, 1.2, 0.06, '#ffffff'],
      [0, 1.1, 0.01, 1.2, 1, 0.06, '#9be7ff'],
      [0, 2.3, 0.08, 2, 0.04, 0.04, '#6d4c41'], // barral
      [-0.88, 0.75, 0.08, 0.34, 1.55, 0.05, '$tela'], // cortinas
      [0.88, 0.75, 0.08, 0.34, 1.55, 0.05, '$tela'],
    ],
  },

  // ---------- Muebles nuevos (etapa 11: sótano, cuarto de la abuela, segundo piso y ático) ----------
  // --- Sótano ---
  caldera: {
    partes: [
      [0, 0, 0, 1.4, 2.1, 1.2, '#8d99ae'], // cuerpo
      [0, 0.25, 0.61, 0.6, 0.4, 0.02, '#ff7b00'], // ventanita del fuego
      [-0.35, 1.4, 0.61, 0.25, 0.25, 0.02, '#fffaf0'], // relojes de presión
      [0.35, 1.4, 0.61, 0.25, 0.25, 0.02, '#fffaf0'],
      [0, 2.1, 0, 0.35, 0.65, 0.35, '#6c757d', 'cilindro'], // caño hacia el techo
      [0.55, 0.3, -0.62, 0.15, 1.6, 0.15, '#6c757d', 'cilindro'], // caños de atrás
      [-0.55, 0.3, -0.62, 0.15, 1.6, 0.15, '#b5523b', 'cilindro'],
    ],
  },
  barril: {
    partes: [
      [0, 0, 0, 0.7, 0.9, 0.7, '#8d5524', 'cilindro'],
      [0, 0.15, 0, 0.72, 0.06, 0.72, '#495057', 'cilindro'], // aros de metal
      [0, 0.7, 0, 0.72, 0.06, 0.72, '#495057', 'cilindro'],
    ],
  },
  estanteVinos: {
    partes: [
      [0, 0, 0, 1.6, 1.9, 0.4, '#5b3a29'],
      // Botellas asomando del estante: 3 filas de 6 (se arman con un bucle)
      ...[0.3, 0.9, 1.5].flatMap((y) =>
        [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].map((x, i) => [x, y, 0.1, 0.12, 0.3, 0.12, i % 2 ? '#2d6a4f' : '#6a040f', 'cilindro']),
      ),
    ],
  },
  maniqui: {
    partes: [
      [0, 0, 0, 0.4, 0.05, 0.4, '#343a40', 'cilindro'], // base
      [0, 0.05, 0, 0.05, 0.8, 0.05, '#343a40', 'cilindro'], // palo
      [0, 0.85, 0, 0.42, 0.7, 0.28, '#f1e3d3', 'cilindro'], // torso
      [0, 1.55, 0, 0.26, 0.3, 0.26, '#f1e3d3', 'esfera'], // cabeza sin cara (qué miedo)
    ],
  },
  munecaGigante: {
    partes: [
      [0, 0, 0, 0.6, 0.7, 0.6, '#ff99c8', 'cilindro'], // vestido
      [0, 0.7, 0, 0.3, 0.3, 0.25, '#ffe5d9'], // torso
      [0, 1.0, 0, 0.36, 0.36, 0.36, '#ffe5d9', 'esfera'], // cabeza
      [-0.07, 1.17, 0.15, 0.07, 0.07, 0.05, '#000000', 'esfera'], // ojos negros y fijos
      [0.07, 1.17, 0.15, 0.07, 0.07, 0.05, '#000000', 'esfera'],
      [0, 1.2, -0.04, 0.4, 0.2, 0.36, '#6b2d0c', 'esfera'], // pelo
      [0, 1.36, 0, 0.22, 0.08, 0.06, '#e63946'], // moño
    ],
  },
  estanteMunecas: {
    partes: [
      [0, 0, 0, 2, 1.5, 0.4, '#6d4c41'],
      [0, 0.7, 0.26, 2, 0.05, 0.14, '#8d6e63'], // estante que sobresale
      // Muñequitas arriba del mueble y en el estante del medio (cuerpo + cabeza)
      ...[-0.7, -0.35, 0, 0.35, 0.7].flatMap((x, i) => [
        [x, 1.5, 0, 0.14, 0.2, 0.14, ['#ff99c8', '#bde0fe', '#ffd23f', '#caffbf', '#cdb4db'][i], 'cilindro'],
        [x, 1.7, 0, 0.14, 0.14, 0.14, '#ffe5d9', 'esfera'],
        [x + 0.1, 0.75, 0.26, 0.12, 0.18, 0.12, ['#cdb4db', '#ff99c8', '#bde0fe', '#ffd23f', '#caffbf'][i], 'cilindro'],
        [x + 0.1, 0.93, 0.26, 0.12, 0.12, 0.12, '#ffe5d9', 'esfera'],
      ]),
    ],
  },
  secarropas: { modelo: M('dryer'), partes: [[0, 0, 0, 0.7, 0.85, 0.65, '#ffffff']] },

  // --- Cuarto de la abuela ---
  mecedora: { modelo: M('loungeChairRelax'), partes: [[0, 0, 0, 0.8, 0.95, 1.1, '#bc6c25']] },
  televisionVieja: {
    modelos: [
      { archivo: M('sideTable'), caja: [0, 0, 0, 0.6, 0.55, 0.45] },
      { archivo: M('televisionVintage'), caja: [0, 0.55, 0, 0.55, 0.45, 0.4] },
    ],
    partes: [
      [0, 0, 0, 0.6, 0.55, 0.45, '#8d6e63'],
      [0, 0.55, 0, 0.55, 0.45, 0.4, '#6d4c41'],
    ],
  },

  // --- Segundo piso ---
  sillonLectura: { modelo: M('loungeChair'), partes: [[0, 0, 0, 0.9, 0.85, 0.9, '#588157']] },
  // Cabeza de ciervo colgada en la pared (el origen es la pared: todo sale hacia +Z)
  cabezaCiervo: {
    solido: false,
    partes: [
      [0, 1.45, 0.03, 0.5, 0.6, 0.06, '#6d4c41'], // placa de madera
      [0, 1.55, 0.2, 0.25, 0.3, 0.3, '#a0522d'], // cuello
      [0, 1.72, 0.38, 0.26, 0.28, 0.4, '#a0522d'], // cabeza
      [0, 1.7, 0.62, 0.14, 0.14, 0.12, '#3e2723'], // hocico
      [-0.08, 1.9, 0.5, 0.05, 0.05, 0.04, '#000000', 'esfera'], // ojos
      [0.08, 1.9, 0.5, 0.05, 0.05, 0.04, '#000000', 'esfera'],
      [-0.15, 1.98, 0.3, 0.05, 0.4, 0.05, '#f4e1c1'], // cuernos
      [0.15, 1.98, 0.3, 0.05, 0.4, 0.05, '#f4e1c1'],
      [-0.26, 2.2, 0.3, 0.2, 0.05, 0.05, '#f4e1c1'],
      [0.26, 2.2, 0.3, 0.2, 0.05, 0.05, '#f4e1c1'],
    ],
  },
  osoDisecado: {
    partes: [
      [0, 0, 0, 1, 0.1, 0.8, '#6d4c41'], // base
      [0, 0.1, 0, 0.9, 1.2, 0.7, '#7f5539', 'esfera'], // cuerpo
      [-0.5, 0.8, 0.1, 0.25, 0.7, 0.25, '#7f5539', 'esfera'], // brazos levantados
      [0.5, 0.8, 0.1, 0.25, 0.7, 0.25, '#7f5539', 'esfera'],
      [0, 1.15, 0.05, 0.6, 0.6, 0.55, '#7f5539', 'esfera'], // cabeza
      [-0.22, 1.62, 0, 0.18, 0.18, 0.12, '#7f5539', 'esfera'], // orejas
      [0.22, 1.62, 0, 0.18, 0.18, 0.12, '#7f5539', 'esfera'],
      [0, 1.32, 0.28, 0.22, 0.16, 0.18, '#ddb892', 'esfera'], // hocico
      [0, 1.42, 0.38, 0.08, 0.06, 0.05, '#000000', 'esfera'], // nariz
      [-0.12, 1.5, 0.28, 0.06, 0.06, 0.04, '#000000', 'esfera'], // ojos
      [0.12, 1.5, 0.28, 0.06, 0.06, 0.04, '#000000', 'esfera'],
    ],
  },
  pedestalTrofeo: {
    partes: [
      [0, 0, 0, 0.6, 1, 0.6, '#e9ecef'],
      [0, 1, 0, 0.36, 0.08, 0.36, '#6d4c41'],
      [0, 1.08, 0, 0.08, 0.2, 0.08, '#ffd23f', 'cilindro'],
      [0, 1.28, 0, 0.4, 0.35, 0.4, '#ffd23f', 'cilindro'],
    ],
  },
  vitrina: { modelo: M('bookcaseOpen'), partes: [[0, 0, 0, 1.2, 2, 0.5, '#8d6e63']] },
  mesaPool: {
    partes: [
      [0, 0, 0, 2.2, 0.78, 1.2, '#6b3e26'],
      [0, 0.78, 0, 2.2, 0.06, 1.2, '#2d6a4f'], // paño verde
      [0.5, 0.84, 0.1, 0.08, 0.08, 0.08, '#ffffff', 'esfera'], // bolas
      [-0.3, 0.84, -0.2, 0.08, 0.08, 0.08, '#e63946', 'esfera'],
      [-0.4, 0.84, 0.15, 0.08, 0.08, 0.08, '#ffd23f', 'esfera'],
      [-0.5, 0.84, -0.05, 0.08, 0.08, 0.08, '#1d3557', 'esfera'],
      [0, 0.86, 0.45, 1.4, 0.03, 0.03, '#c68642'], // taco
    ],
  },
  arcade: {
    partes: [
      [0, 0, 0, 0.7, 1.75, 0.7, '#3a0ca3'],
      [0, 1.0, 0.36, 0.5, 0.45, 0.02, '#4cc9f0'], // pantalla
      [0, 0.85, 0.38, 0.6, 0.08, 0.2, '#f72585'], // tablero de botones
      [0, 1.55, 0.36, 0.62, 0.18, 0.02, '#ffd23f'], // cartel de arriba
      [-0.12, 0.93, 0.4, 0.05, 0.08, 0.05, '#ffffff', 'esfera'], // palanca
      [0.1, 0.93, 0.4, 0.06, 0.03, 0.06, '#e63946', 'cilindro'], // botón
    ],
  },
  cajaJuguetes: {
    partes: [
      [0, 0, 0, 0.8, 0.5, 0.5, '#ffbe0b'],
      [0.2, 0.5, 0, 0.25, 0.25, 0.25, '#3a86ff', 'esfera'], // pelota
      [-0.2, 0.5, 0.05, 0.2, 0.2, 0.2, '#ff006e'], // cubito
      [0, 0.5, -0.1, 0.1, 0.35, 0.1, '#8338ec'], // bate
    ],
  },
  parlante: { modelo: M('speaker'), partes: [[0, 0, 0, 0.4, 1, 0.35, '#222222']] },
  lamparaTecho: { solido: false, modelo: M('lampSquareCeiling'), partes: [[0, 0, 0, 0.5, 0.6, 0.5, '#fff3b0']] },

  // ---------- Detalles de decoración (etapa 11C): casi todos se atraviesan y no hacen sombra ----------
  almohadon: { solido: false, sombra: false, colores: { tela: '#e76f51' }, partes: [[0, 0, 0, 0.4, 0.15, 0.35, '$tela']] },
  mesaConVelador: {
    modelos: [
      { archivo: M('sideTable'), caja: [0, 0, 0, 0.5, 0.55, 0.5] },
      { archivo: M('lampSquareTable'), caja: [0, 0.55, 0, 0.3, 0.45, 0.3] },
    ],
    partes: [
      [0, 0, 0, 0.5, 0.55, 0.5, '#8d6e63'],
      [0, 0.55, 0, 0.3, 0.45, 0.3, '#fff3b0'],
    ],
  },
  // Estante colgado en la pared con frascos (el origen es la pared: sale hacia +Z)
  estanteCocina: {
    solido: false,
    sombra: false,
    partes: [
      [0, 1.55, 0.12, 1.2, 0.04, 0.24, '#8d6e63'],
      [-0.4, 1.59, 0.12, 0.12, 0.2, 0.12, '#e63946', 'cilindro'],
      [-0.15, 1.59, 0.12, 0.12, 0.16, 0.12, '#f4a261', 'cilindro'],
      [0.1, 1.59, 0.12, 0.12, 0.22, 0.12, '#2a9d8f', 'cilindro'],
      [0.38, 1.59, 0.12, 0.1, 0.26, 0.1, '#e9c46a', 'cilindro'],
    ],
  },
  // Alfombra de 1 x 1 m con borde (se estira con "escala" en cada lugar)
  alfombraLarga: {
    solido: false,
    sombra: false,
    colores: { borde: '#6d597a', tela: '#e9c46a' },
    partes: [
      [0, 0, 0, 1, 0.012, 1, '$borde'],
      [0, 0.001, 0, 0.88, 0.013, 0.84, '$tela'],
    ],
  },
  alfombraBano: { solido: false, sombra: false, colores: { tela: '#4cc9f0' }, partes: [[0, 0, 0, 0.8, 0.015, 0.5, '$tela']] },
  // Toallero de pared con dos toallas (el origen es la pared)
  toallero: {
    solido: false,
    sombra: false,
    colores: { toalla: '#4cc9f0' },
    partes: [
      [0, 1.35, 0.05, 0.8, 0.03, 0.03, '#adb5bd'],
      [-0.2, 0.85, 0.06, 0.3, 0.52, 0.03, '$toalla'],
      [0.2, 0.8, 0.06, 0.3, 0.57, 0.03, '#ffffff'],
    ],
  },
  neumaticos: {
    solido: false,
    partes: [
      [0, 0, 0, 0.65, 0.22, 0.65, '#222222', 'cilindro'],
      [0, 0.22, 0, 0.65, 0.22, 0.65, '#2b2b2b', 'cilindro'],
      [0, 0.44, 0, 0.65, 0.22, 0.65, '#222222', 'cilindro'],
    ],
  },
  tocador: {
    partes: [
      [0, 0, 0, 1, 0.75, 0.45, '#b5835a'],
      [0, 0.75, -0.18, 0.75, 0.9, 0.05, '#8d6e63'], // marco del espejo
      [0, 0.85, -0.15, 0.6, 0.7, 0.01, '#caf0f8'], // espejo
      [-0.3, 0.75, 0.05, 0.08, 0.14, 0.08, '#ff99c8', 'cilindro'], // perfumes
      [-0.18, 0.75, 0.08, 0.07, 0.1, 0.07, '#c77dff', 'cilindro'],
    ],
  },
  juguetes: {
    solido: false,
    sombra: false,
    partes: [
      [0, 0, 0, 0.26, 0.26, 0.26, '#e63946', 'esfera'], // pelota
      [0.35, 0, 0.1, 0.14, 0.14, 0.14, '#ffd23f'], // cubitos
      [0.38, 0.14, 0.12, 0.12, 0.12, 0.12, '#3a86ff'],
      [0.22, 0, -0.25, 0.14, 0.14, 0.14, '#52b788'],
      [-0.35, 0, 0.2, 0.3, 0.1, 0.14, '#ff006e'], // autito
      [-0.35, 0.1, 0.2, 0.16, 0.08, 0.12, '#ff006e'],
    ],
  },
  puff: { solido: false, sombra: false, colores: { tela: '#f15bb5' }, partes: [[0, 0, 0, 0.7, 0.45, 0.7, '$tela', 'esfera']] },
  canastaOvillos: {
    solido: false,
    sombra: false,
    partes: [
      [0, 0, 0, 0.45, 0.22, 0.45, '#c68642', 'cilindro'], // canasta
      [-0.08, 0.2, 0, 0.16, 0.16, 0.16, '#e63946', 'esfera'], // ovillos
      [0.09, 0.2, 0.05, 0.15, 0.15, 0.15, '#a2d2ff', 'esfera'],
      [0.02, 0.22, -0.1, 0.14, 0.14, 0.14, '#ffd23f', 'esfera'],
      [0.05, 0.25, 0.02, 0.01, 0.35, 0.01, '#adb5bd'], // agujas de tejer
    ],
  },
  globoTerraqueo: {
    solido: false,
    partes: [
      [0, 0, 0, 0.35, 0.05, 0.35, '#6d4c41', 'cilindro'],
      [0, 0.05, 0, 0.04, 0.75, 0.04, '#6d4c41', 'cilindro'],
      [0, 0.8, 0, 0.45, 0.45, 0.45, '#4cc9f0', 'esfera'],
      [0.05, 0.95, 0.12, 0.2, 0.15, 0.2, '#52b788', 'esfera'], // continentes
      [-0.1, 0.85, -0.1, 0.18, 0.2, 0.18, '#52b788', 'esfera'],
    ],
  },
  pilaLibros: {
    solido: false,
    sombra: false,
    partes: [
      [0, 0, 0, 0.35, 0.08, 0.25, '#e63946'],
      [0.02, 0.08, 0, 0.32, 0.07, 0.24, '#457b9d'],
      [-0.01, 0.15, 0.01, 0.3, 0.09, 0.22, '#2a9d8f'],
      [0.03, 0.24, 0, 0.28, 0.06, 0.2, '#e9c46a'],
    ],
  },
  trofeoChico: {
    solido: false,
    sombra: false,
    partes: [
      [0, 0, 0, 0.12, 0.05, 0.12, '#6d4c41'],
      [0, 0.05, 0, 0.1, 0.16, 0.1, '#ffd23f', 'cilindro'],
    ],
  },
  lingotes: {
    solido: false,
    partes: [
      [-0.12, 0, 0, 0.22, 0.1, 0.12, '#ffd23f'],
      [0.12, 0, 0, 0.22, 0.1, 0.12, '#ffd23f'],
      [0, 0.1, 0, 0.22, 0.1, 0.12, '#f4c430'],
    ],
  },
  // Cadenas colgando del techo (eslabones alternados)
  cadenas: {
    solido: false,
    sombra: false,
    partes: Array.from({ length: 9 }, (_, i) => [0, 1.9 + i * 0.1, 0, i % 2 ? 0.02 : 0.06, 0.09, i % 2 ? 0.06 : 0.02, '#495057']),
  },
  // Un mueble tapado con una sábana... que parece un fantasma
  sabanaFantasma: {
    partes: [
      [0, 0, 0, 1, 0.5, 0.9, '#f8f9fa', 'cilindro'],
      [0, 0.2, 0, 0.9, 1.0, 0.8, '#f8f9fa', 'esfera'],
      [-0.13, 0.85, 0.35, 0.1, 0.14, 0.05, '#222222', 'esfera'],
      [0.13, 0.85, 0.35, 0.1, 0.14, 0.05, '#222222', 'esfera'],
    ],
  },
  cajaAbierta: { modelo: M('cardboardBoxOpen'), partes: [[0, 0, 0, 0.7, 0.5, 0.7, '#d4a373']] },

  // --- Cuarto secreto ---
  cajaFuerte: {
    partes: [
      [0, 0, 0, 0.7, 0.9, 0.6, '#495057'],
      [0, 0.12, 0.3, 0.56, 0.66, 0.02, '#6c757d'], // puerta
      [0.1, 0.37, 0.31, 0.18, 0.18, 0.05, '#ced4da', 'esfera'], // perilla de la combinación
      [-0.17, 0.3, 0.32, 0.04, 0.24, 0.04, '#ffd23f'], // manija
    ],
  },
  cofreTesoro: {
    partes: [
      [0, 0, 0, 1.2, 0.5, 0.6, '#8b5a2b'],
      [0, 0.5, 0, 1.2, 0.14, 0.6, '#6f4518'], // tapa
      [-0.4, 0, 0, 0.08, 0.66, 0.62, '#ffd23f'], // bandas doradas
      [0.4, 0, 0, 0.08, 0.66, 0.62, '#ffd23f'],
      [0, 0.35, 0.31, 0.14, 0.16, 0.03, '#ffd23f'], // cerradura
      [0.25, 0.64, 0.12, 0.14, 0.03, 0.14, '#ffd23f', 'cilindro'], // monedas sueltas
      [0.05, 0.64, -0.1, 0.14, 0.03, 0.14, '#ffd23f', 'cilindro'],
    ],
  },

  // --- Ático ---
  baul: {
    partes: [
      [0, 0, 0, 1.2, 0.5, 0.6, '#8b5a2b'],
      [0, 0.5, 0, 1.2, 0.14, 0.6, '#6f4518'], // tapa
      [-0.4, 0, 0, 0.08, 0.66, 0.62, '#495057'], // bandas de metal
      [0.4, 0, 0, 0.08, 0.66, 0.62, '#495057'],
      [0, 0.35, 0.31, 0.14, 0.16, 0.03, '#ffd23f'], // cerradura
    ],
  },
  // Mira hacia +X (la cabeza del caballito)
  caballitoMecedor: {
    partes: [
      [0, 0, 0, 1.1, 0.08, 0.3, '#8d5524'], // base
      [-0.3, 0.08, 0, 0.08, 0.35, 0.08, '#8d5524'], // patas
      [0.3, 0.08, 0, 0.08, 0.35, 0.08, '#8d5524'],
      [0, 0.43, 0, 0.8, 0.3, 0.28, '#ffffff'], // cuerpo
      [0.4, 0.6, 0, 0.25, 0.4, 0.2, '#ffffff'], // cuello
      [0.55, 0.85, 0, 0.3, 0.18, 0.18, '#ffffff'], // cabeza
      [0.35, 0.7, 0, 0.08, 0.3, 0.22, '#e63946'], // crin
      [-0.45, 0.5, 0, 0.08, 0.3, 0.1, '#e63946'], // cola
    ],
  },
  espejoViejo: {
    partes: [
      [0, 0, 0, 0.9, 0.1, 0.4, '#6d4c41'], // base
      [0, 0.1, 0, 1, 1.8, 0.08, '#b08968'], // marco
      [0, 0.2, 0.045, 0.8, 1.6, 0.01, '#caf0f8'], // espejo
    ],
  },
};
