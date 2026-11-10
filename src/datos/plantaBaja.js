// PLANTA BAJA (piso 0): living, cocina, comedor, baño, entrada y garaje.
//
//  x=-15.5   x=-9      x=-3        x=3          x=9
//  z=-6       +--------+-----------+------------+
//             |        |           |  baño      |
//  z=-2 +-----+        |  cocina   |------------+
//       |     | living |           |  comedor   |  <- puerta trasera (x=9)
//       |gara-|        +-----------+------------+ z=2
//       | je  |        |  entrada  [escalera]   |  (la escalera sube y, debajo, baja al sótano)
//  z=6  +-----+--------+------------------------+
//       portón             puerta de calle     (la ventana que se rompe: la de la cocina, atrás)
//
// Todas las coordenadas son (x, z); la altura la pone el número de piso.
import { PAREDES_TIPICAS, PASILLO_CON_HUECO, BARANDA_HUECO } from './comun.js';

export const PLANTA_BAJA = {
  piso: 0,
  nombre: 'Planta baja',
  colorParedes: '#ffe8a3',

  // Habitaciones: nombre y rectángulos [x1, z1, x2, z2] que forman su piso.
  // textura: dibujo del piso ('madera', 'ceramica', 'baldosas'), teñido con colorPiso (ver Texturas.js)
  // pared: empapelado ('rayas', 'flores', 'azulejos', 'ladrillos', 'tablas', 'rombos', 'lunares', 'estrellas')
  // lampara: 'colgante' (si no se pone nada), 'plafon', 'tubo' o false; lamparaEn: [x, z] (si no, al centro)
  habitaciones: [
    { nombre: 'living', rects: [[-9, -6, -3, 6]], colorPiso: '#f4a261', textura: 'madera', pared: 'rayas' },
    { nombre: 'cocina', rects: [[-3, -6, 3, 2]], colorPiso: '#b5e48c', textura: 'ceramica', pared: 'azulejos', lampara: 'plafon' },
    { nombre: 'comedor', rects: [[3, -2, 9, 2]], colorPiso: '#ffd6a5', textura: 'madera', pared: 'rombos', lamparaEn: [7, 0] },
    { nombre: 'baño', rects: [[3, -6, 9, -2]], colorPiso: '#a0e7e5', textura: 'ceramica', pared: 'azulejos', lampara: 'plafon' },
    // La entrada deja el hueco de la escalera que baja al sótano
    { nombre: 'entrada', rects: PASILLO_CON_HUECO, colorPiso: '#cdb4db', textura: 'madera', pared: 'rayas', lampara: 'plafon' },
    { nombre: 'garaje', rects: [[-15.5, -2, -9, 6]], colorPiso: '#b8c0c8', textura: 'baldosas', colorParedes: '#dfe4e8', lampara: 'tubo', lamparaEn: [-12.3, 1.5] },
  ],

  // Paredes: líneas rectas [x1, z1, x2, z2]. Los huecos (puertas, ventana, portón) se recortan solos.
  paredes: [
    ...PAREDES_TIPICAS,
    // El garaje (su pared este es la pared oeste de la casa)
    [-15.5, -2, -9, -2],
    [-15.5, -2, -15.5, 6],
    [-15.5, 6, -9, 6],
  ],

  // Puertas: centro (x, z) y "eje" = hacia dónde corre la pared donde está
  //   eje 'x': pared que va de oeste a este (z fija) · eje 'z': pared que va de norte a sur (x fija)
  //   conLlave: no se puede abrir (hasta encontrar la llave) · abierta: arranca abierta
  puertas: [
    { x: -3, z: 4, eje: 'z' }, // living ↔ entrada
    { x: -3, z: -2, eje: 'z' }, // living ↔ cocina
    { x: 0, z: 2, eje: 'x' }, // cocina ↔ entrada
    { x: 3, z: 0, eje: 'z' }, // cocina ↔ comedor
    { x: 6, z: 2, eje: 'x' }, // comedor ↔ entrada
    { x: 6, z: -2, eje: 'x' }, // comedor ↔ baño
    { x: -1, z: 6, eje: 'x', conLlave: true, deCalle: true, gatera: true }, // puerta de calle (hay una llave escondida... y una gatera)
    { x: 9, z: 1.1, eje: 'z', abierta: true }, // puerta trasera del comedor (¡se la olvidaron abierta!)
    { x: -9, z: 3.2, eje: 'z' }, // garaje ↔ living
  ],

  barandas: [BARANDA_HUECO],

  // Muebles: tipo (ver muebles.js), posición (x, z) y rotación en grados.
  // Rotación: 0 = el frente mira al sur (+Z), 90 = al este, -90 = al oeste, 180 = al norte.
  // Solo usamos múltiplos de 90° para que las cajas de colisión (AABB) sean exactas.
  muebles: [
    // Living
    { tipo: 'sillon', x: -8.4, z: 0, rot: 90 },
    { tipo: 'mesaRatona', x: -7, z: 0, rot: 90 },
    { tipo: 'alfombra', x: -6.8, z: 0, rot: 90 },
    { tipo: 'tv', x: -3.45, z: 0.8, rot: -90 },
    { tipo: 'biblioteca', x: -6, z: -5.7 },
    { tipo: 'planta', x: -8.4, z: 5.4 },
    { tipo: 'lamparaPie', x: -8.5, z: -5.4 },
    { tipo: 'ventana', x: -8.87, z: -4.5, rot: 90 }, // (corrida: en z=-2.75 está el hogar de la chimenea)
    { tipo: 'ventana', x: -4.2, z: 5.87, rot: 180 }, // la del frente (hasta la 17B era la que se rompía)
    // Cocina
    { tipo: 'mesada', x: -0.5, z: -5.55 },
    { tipo: 'heladera', x: 2.4, z: -5.45 },
    { tipo: 'mesa', x: -1, z: -3.8 },
    { tipo: 'silla', x: -1.4, z: -3, rot: 180 },
    { tipo: 'silla', x: -0.6, z: -3, rot: 180 },
    { tipo: 'tacho', x: 2.6, z: -4.6 },
    // (la ventana de la cocina, sobre la mesada, es la que se puede romper: ver VENTANA_ROMPIBLE)
    // Comedor
    { tipo: 'mesaComedor', x: 7, z: 0 },
    { tipo: 'silla', x: 6.4, z: 0.8, rot: 180 },
    { tipo: 'silla', x: 7.6, z: 0.8, rot: 180 },
    { tipo: 'silla', x: 6.4, z: -0.8 },
    { tipo: 'silla', x: 7.6, z: -0.8 },
    { tipo: 'aparador', x: 8.6, z: -1, rot: -90 },
    { tipo: 'ventana', x: 8.87, z: -1, rot: -90 },
    // Baño
    { tipo: 'banera', x: 4.2, z: -3.3, rot: 90 }, // (con cortina: es un escondite)
    { tipo: 'inodoro', x: 8.5, z: -5.5 },
    { tipo: 'lavamanos', x: 6, z: -5.65 },
    { tipo: 'lavarropas', x: 8.55, z: -3.6, rot: -90 },
    { tipo: 'ventana', x: 4.5, z: -5.87 },
    // Entrada (el rincón de x 7..9, z 4..6 queda libre: ahí arranca la escalera al sótano)
    { tipo: 'muebleEntrada', x: -2.4, z: 5.65, rot: 180 },
    { tipo: 'perchero', x: -2.6, z: 2.5 },
    { tipo: 'placard', x: 8.5, z: 3.2, rot: -90 },
    // Garaje
    { tipo: 'auto', x: -12.4, z: 1.6 },
    { tipo: 'estanteria', x: -15.1, z: 1, rot: 90 },
    { tipo: 'mesaTrabajo', x: -12.3, z: -1.5 },
    { tipo: 'cajas', x: -14.6, z: 4.9 },
    { tipo: 'cajaGrande', x: -9.75, z: -0.3 }, // escondite (etapa 14C)
    // Detalles (etapa 11C)
    { tipo: 'almohadon', x: -8.5, z: -0.7, rot: 90, y: 0.45, colores: { tela: '#ffd23f' } },
    { tipo: 'mesaConVelador', x: -8.55, z: -1.65 },
    { tipo: 'estanteCocina', x: -2, z: -5.9 },
    { tipo: 'alfombraLarga', x: 7, z: 0, escala: [2.6, 1, 1.8], colores: { borde: '#9d0208', tela: '#e9c46a' } },
    { tipo: 'toallero', x: 3.1, z: -5, rot: 90, colores: { toalla: '#4cc9f0' } },
    { tipo: 'alfombraBano', x: 4.2, z: -2.5, colores: { tela: '#4cc9f0' } },
    { tipo: 'alfombraLarga', x: 1.8, z: 3.1, escala: [5.5, 1, 0.8], colores: { borde: '#6d597a', tela: '#b5838d' } },
    { tipo: 'neumaticos', x: -10, z: -1.4 },
  ],

  // Cuadros (ver Cuadros.js): x, z sobre la pared; rot: hacia dónde mira; y: altura del centro
  cuadros: [
    { dibujo: 'retratoDueno', x: -8.89, z: 0, rot: 90, y: 1.75, ancho: 0.7, alto: 0.9 }, // sobre el sillón
    { dibujo: 'paisaje', x: -8, z: -5.89, rot: 0, y: 1.7, ancho: 1, alto: 0.7 },
    { dibujo: 'barco', x: -6.8, z: 5.89, rot: 180 },
    { dibujo: 'reloj', x: -3.11, z: 0.8, rot: -90, y: 2.05, ancho: 0.5, alto: 0.5, marco: false }, // sobre la tele
    { dibujo: 'flores', x: 2.89, z: -3.2, rot: -90 },
    { dibujo: 'reloj', x: -1.8, z: 1.89, rot: 180, y: 2, ancho: 0.45, alto: 0.45, marco: false },
    { dibujo: 'abstracto', x: 4.3, z: -1.89, rot: 0, ancho: 0.9, alto: 0.7 },
    { dibujo: 'abuelo', x: 7.7, z: -1.89, rot: 0, ancho: 0.6, alto: 0.8 },
    { dibujo: 'perro', x: -1.8, z: 2.11, rot: 0 },
    { dibujo: 'retratoAbuela', x: 3.2, z: 2.11, rot: 0, ancho: 0.6, alto: 0.8 },
    { dibujo: 'espejo', x: -2.4, z: 5.89, rot: 180, y: 1.6, ancho: 0.6, alto: 0.8 }, // sobre el mueble de la entrada
    { dibujo: 'paisaje', x: 2.4, z: 5.89, rot: 180, y: 2, ancho: 0.7, alto: 0.5 }, // a lo largo de la escalera
    { dibujo: 'barco', x: 4.6, z: 5.89, rot: 180, y: 2.45, ancho: 0.6, alto: 0.45 },
  ],

  luces: [],

  // Waypoints: puntos por donde camina el dueño (x, z). Hay puntos en las habitaciones y uno en cada
  // puerta (los "p-..."), ubicados para que entre dos puntos conectados se pueda ir en línea recta.
  waypoints: [
    { id: 'living', pos: [-5.5, 3] },
    { id: 'living-norte', pos: [-5.5, -2] },
    { id: 'p-living-entrada', pos: [-3, 4] },
    { id: 'p-living-cocina', pos: [-3, -2] },
    { id: 'cocina', pos: [1, -0.8] },
    { id: 'p-cocina-entrada', pos: [0, 2] },
    { id: 'p-cocina-comedor', pos: [3, 0] },
    { id: 'comedor', pos: [4.5, 0] },
    { id: 'p-comedor-entrada', pos: [6, 2] },
    { id: 'p-comedor-baño', pos: [6, -2] },
    { id: 'baño', pos: [6, -4] },
    { id: 'entrada-oeste', pos: [-1.5, 3.2] },
    { id: 'entrada-centro', pos: [0, 3.2] },
    { id: 'entrada-este', pos: [6, 3.2] },
    { id: 'entrada-fondo', pos: [7.5, 3.3] },
    { id: 'escalera-abajo', pos: [0, 5.15] }, // donde arranca la escalera que sube
    { id: 'rellano-pb', pos: [7.8, 5.2] }, // donde arranca la escalera que baja al sótano
    // El garaje (etapa 16C): Don Ernesto solo entra para arreglar el tablero de luz (y, a veces, revisar)
    { id: 'p-living-garaje', pos: [-9, 3.2] },
    { id: 'garaje', pos: [-10.3, 3.2] },
    { id: 'tablero', pos: [-9.7, 4.9] }, // parado frente al tablero de luz
    { id: 'garaje-sur', pos: [-12.4, 4.7] }, // entre el auto y el portón
    { id: 'garaje-oeste', pos: [-14.3, 3.9] },
  ],

  // Pares de waypoints conectados (se puede caminar en línea recta entre ellos)
  conexiones: [
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
    ['entrada-este', 'entrada-fondo'],
    ['entrada-fondo', 'rellano-pb'],
    ['living', 'p-living-garaje'],
    ['p-living-garaje', 'garaje'],
    ['garaje', 'tablero'],
    ['garaje', 'garaje-sur'],
    ['garaje-sur', 'garaje-oeste'],
  ],
};
