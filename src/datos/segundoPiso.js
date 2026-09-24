// SEGUNDO PISO (piso 2): biblioteca, sala de trofeos, cuarto de juegos y "el cuarto al revés".
// En la sala de trofeos está la escalera plegable que sube al ático.
// En la biblioteca, un estante es en realidad una puerta secreta: detrás hay un cuarto escondido.
// Un conducto de ventilación une el cuarto de juegos con la sala de trofeos.
//
//  x=-9      x=-3        x=3          x=9
//  z=-6 +--+-----+-----------+------------+
//       |S |     |  sala de  | cuarto al  |
//       +[]+     |  trofeos  |   revés    |
//       | biblio-|  [escal.  +------------+ z=-2
//       |  teca  |  ático] ==conducto==   |
//       |        |           | cuarto de  |
//       |        +-----------+------------+ z=2   (S = cuarto secreto, [] = estante secreto)
//       |        |  pasillo  [escalera]    |
//  z=6  +--------+------------------------+
import { PAREDES_TIPICAS, PASILLO_CON_HUECO, BARANDA_HUECO, BARANDA_HUECO_OESTE } from './comun.js';

export const SEGUNDO_PISO = {
  piso: 2,
  nombre: 'Segundo piso',
  colorParedes: '#d8f3dc',

  habitaciones: [
    { nombre: 'biblioteca', rects: [[-9, -3.5, -3, 6], [-6.5, -6, -3, -3.5]], colorPiso: '#c9a27e', textura: 'madera', colorParedes: '#f1dca7', pared: 'tablas', colorLampara: '#588157' },
    { nombre: 'cuarto secreto', rects: [[-9, -6, -6.5, -3.5]], colorPiso: '#5c3d2e', textura: 'madera', colorParedes: '#7b2d26', pared: 'ladrillos', lampara: false },
    { nombre: 'sala de trofeos', rects: [[-3, -6, 3, 2]], colorPiso: '#b08968', textura: 'madera', colorParedes: '#e9c46a', pared: 'tablas', lamparaEn: [-1.8, -4.3], colorLampara: '#6d4c41' },
    // En el cuarto al revés los muebles están pegados al techo (y una lámpara sale del piso)
    { nombre: 'cuarto al revés', rects: [[3, -6, 9, -2]], colorPiso: '#ffffff', textura: 'baldosas', colorParedes: '#c77dff', pared: 'rombos', lampara: false },
    { nombre: 'cuarto de juegos', rects: [[3, -2, 9, 2]], colorPiso: '#90e0ef', textura: 'madera', colorParedes: '#ffc8dd', pared: 'lunares', lampara: false },
    { nombre: 'pasillo del segundo piso', rects: PASILLO_CON_HUECO, colorPiso: '#cdb4db', textura: 'madera', pared: 'rayas', lampara: 'plafon' },
  ],

  paredes: [
    ...PAREDES_TIPICAS,
    // El cuarto secreto, en la esquina de la biblioteca
    [-9, -3.5, -6.5, -3.5],
    [-6.5, -6, -6.5, -3.5],
  ],

  puertas: [
    { x: -3, z: 3, eje: 'z' }, // pasillo ↔ biblioteca
    { x: -1.8, z: 2, eje: 'x' }, // pasillo ↔ sala de trofeos
    { x: 5, z: 2, eje: 'x' }, // pasillo ↔ cuarto de juegos
    { x: 6, z: -2, eje: 'x' }, // cuarto de juegos ↔ cuarto al revés
    { x: 3, z: -4, eje: 'z' }, // sala de trofeos ↔ cuarto al revés
    { x: -3, z: -3, eje: 'z' }, // biblioteca ↔ sala de trofeos
    { x: -7.75, z: -3.5, eje: 'x', estilo: 'biblioteca' }, // ¡el estante secreto! biblioteca ↔ cuarto secreto
  ],

  // Conductos de ventilación (solo se pasan agachado): de dónde a dónde van, en línea recta
  conductos: [{ desde: [1.2, 0.2], hasta: [4.2, 0.2] }], // sala de trofeos ↔ cuarto de juegos

  // Acá no sube ningún tramo desde el rincón: el hueco lleva baranda de los dos lados
  barandas: [BARANDA_HUECO, BARANDA_HUECO_OESTE],

  muebles: [
    // Biblioteca: estantes contra las paredes, escritorio y un sillón para leer
    { tipo: 'biblioteca', x: -5.2, z: -5.7 },
    { tipo: 'biblioteca', x: -8.7, z: -2.3, rot: 90 },
    { tipo: 'biblioteca', x: -8.7, z: 2.6, rot: 90 },
    { tipo: 'biblioteca', x: -7.65, z: 5.7, rot: 180 },
    { tipo: 'biblioteca', x: -4.35, z: 5.7, rot: 180 },
    { tipo: 'escritorio', x: -8.4, z: 0, rot: 90 },
    { tipo: 'sillaEscritorio', x: -7.65, z: 0, rot: -90 },
    { tipo: 'sillonLectura', x: -4.2, z: 1, rot: -90 },
    { tipo: 'lamparaPie', x: -3.6, z: 0 },
    { tipo: 'alfombra', x: -6, z: 0, rot: 90 },
    { tipo: 'ventana', x: -8.87, z: 0, rot: 90 },
    { tipo: 'ventana', x: -6, z: 5.87, rot: 180 },
    // Cuarto secreto: la caja fuerte y un cofre del tesoro
    { tipo: 'cajaFuerte', x: -8.5, z: -5.55 },
    { tipo: 'cofreTesoro', x: -7.2, z: -5.55 },
    // Sala de trofeos
    { tipo: 'osoDisecado', x: -2.3, z: -5.2 },
    { tipo: 'cabezaCiervo', x: -1.5, z: -5.9 },
    { tipo: 'cabezaCiervo', x: 2.3, z: -5.9 },
    { tipo: 'vitrina', x: 2.6, z: -1, rot: -90 },
    { tipo: 'pedestalTrofeo', x: 2.2, z: 1.2 },
    { tipo: 'ventana', x: 0.4, z: -5.87 },
    // Cuarto de juegos
    { tipo: 'mesaPool', x: 6.6, z: 0.3 },
    { tipo: 'arcade', x: 8.5, z: -1.3, rot: -90 },
    { tipo: 'parlante', x: 8.6, z: 1.6 },
    { tipo: 'cajaJuguetes', x: 3.6, z: 1.5 },
    { tipo: 'ventana', x: 8.87, z: 0.5, rot: -90 },
    // Cuarto al revés (alReves: el mueble cuelga del techo, patasArriba: está dado vuelta en el piso)
    { tipo: 'alfombra', x: 6, z: -4, alReves: true },
    { tipo: 'mesa', x: 6, z: -4, alReves: true },
    { tipo: 'silla', x: 5.4, z: -4.6, alReves: true },
    { tipo: 'silla', x: 6.6, z: -3.4, rot: 180, alReves: true },
    { tipo: 'lamparaPie', x: 8.4, z: -5.4, alReves: true },
    { tipo: 'planta', x: 3.6, z: -5.4, alReves: true },
    { tipo: 'lamparaTecho', x: 6, z: -4, patasArriba: true },
    { tipo: 'ventana', x: 6, z: -5.87 },
    // Pasillo
    { tipo: 'planta', x: -2.5, z: 5.4 },
    { tipo: 'ventana', x: -1, z: 5.87, rot: 180 },
    // Detalles (etapa 11C)
    { tipo: 'globoTerraqueo', x: -6.4, z: -1.9 },
    { tipo: 'pilaLibros', x: -3.5, z: 1.9 },
    { tipo: 'lingotes', x: -6.9, z: -4.3 },
    { tipo: 'trofeoChico', x: 2.6, z: -1.3, y: 2 },
    { tipo: 'trofeoChico', x: 2.6, z: -0.7, y: 2 },
    { tipo: 'puff', x: 8.2, z: 0.7, colores: { tela: '#ffd23f' } },
    { tipo: 'puff', x: 4, z: -1.5, colores: { tela: '#4cc9f0' } },
    { tipo: 'alfombraLarga', x: 3, z: 3, escala: [5, 1, 0.7], colores: { borde: '#bc4749', tela: '#f2e8cf' } },
  ],

  cuadros: [
    { dibujo: 'mapa', x: -3.11, z: 0.2, rot: -90, y: 1.9, ancho: 1, alto: 0.7 },
    { dibujo: 'mapaTesoro', x: -8.89, z: -4.7, rot: 90, ancho: 0.7, alto: 0.7 }, // en el cuarto secreto
    { dibujo: 'abuelo', x: -2.89, z: -0.5, rot: 90, y: 1.7, ancho: 0.7, alto: 0.9 }, // el abuelo cazador
    { dibujo: 'dinosaurio', x: 8.89, z: -1.3, rot: -90, y: 2.2, ancho: 0.6, alto: 0.45, marco: false }, // póster
    { dibujo: 'abstracto', x: 4, z: -1.89, rot: 0 },
    { dibujo: 'paisaje', x: 4.2, z: -5.89, rot: 0, alReves: true }, // cuarto al revés
    { dibujo: 'reloj', x: 8, z: -5.89, rot: 0, y: 1.8, ancho: 0.45, alto: 0.45, marco: false, alReves: true },
    { dibujo: 'barco', x: 2, z: 2.11, rot: 0 },
    { dibujo: 'flores', x: 2.4, z: 5.89, rot: 180, y: 2, ancho: 0.5, alto: 0.6 },
    { dibujo: 'perro', x: 4.6, z: 5.89, rot: 180, y: 2.45, ancho: 0.6, alto: 0.45 },
  ],

  // Una luz dorada en el cuarto secreto
  luces: [{ x: -7.75, y: 2.4, z: -4.8, color: '#ffd166', intensidad: 4, distancia: 5 }],

  waypoints: [
    { id: 'rellano-2p', pos: [8, 5.15] }, // donde llega la escalera del primer piso
    { id: 'p2-pasillo-este', pos: [7.5, 3] },
    { id: 'p2-pasillo-centro', pos: [5, 3] },
    { id: 'p2-pasillo-oeste', pos: [-1.8, 3] },
    { id: 'p-juegos', pos: [5, 2] },
    { id: 'juegos', pos: [4.8, -0.9] },
    { id: 'p-juegos-reves', pos: [6, -2] },
    { id: 'reves', pos: [6, -4] },
    { id: 'p-trofeos-reves', pos: [3, -4] },
    { id: 'p-trofeos', pos: [-1.8, 2] },
    { id: 'trofeos', pos: [-1.8, -1] },
    { id: 'trofeos-norte', pos: [-1.8, -4] },
    { id: 'escalera-atico', pos: [0, -3.8] }, // donde arranca la escalera al ático
    { id: 'p-biblioteca', pos: [-3, 3] },
    { id: 'biblioteca', pos: [-5.5, 2.5] },
    { id: 'biblioteca-norte', pos: [-5.5, -3] },
    { id: 'p-biblioteca-trofeos', pos: [-3, -3] },
    { id: 'biblioteca-noroeste', pos: [-7.75, -2.6] },
    { id: 'p-secreto', pos: [-7.75, -3.5] },
    { id: 'secreto', pos: [-7.75, -4.7] },
  ],

  conexiones: [
    ['rellano-2p', 'p2-pasillo-este'],
    ['p2-pasillo-este', 'p2-pasillo-centro'],
    ['p2-pasillo-centro', 'p2-pasillo-oeste'],
    ['p2-pasillo-centro', 'p-juegos'],
    ['p-juegos', 'juegos'],
    ['juegos', 'p-juegos-reves'],
    ['p-juegos-reves', 'reves'],
    ['reves', 'p-trofeos-reves'],
    ['p-trofeos-reves', 'trofeos-norte'],
    ['p2-pasillo-oeste', 'p-trofeos'],
    ['p-trofeos', 'trofeos'],
    ['trofeos', 'trofeos-norte'],
    ['trofeos-norte', 'escalera-atico'],
    ['trofeos-norte', 'p-biblioteca-trofeos'],
    ['p-biblioteca-trofeos', 'biblioteca-norte'],
    ['biblioteca-norte', 'biblioteca'],
    ['biblioteca', 'p-biblioteca'],
    ['p-biblioteca', 'p2-pasillo-oeste'],
    ['biblioteca-norte', 'biblioteca-noroeste'],
    ['biblioteca-noroeste', 'p-secreto'],
    ['p-secreto', 'secreto'],
  ],
};
