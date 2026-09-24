// PRIMER PISO (piso 1): dormitorio, cuarto del hijo, baño y el cuarto de la abuela.
// Del rincón oeste del pasillo sale el tramo de escalera que sube al segundo piso.
// Un conducto de ventilación une el baño de arriba con el cuarto de la abuela.
import { PAREDES_TIPICAS, PASILLO_CON_HUECO, BARANDA_HUECO } from './comun.js';

export const PRIMER_PISO = {
  piso: 1,
  nombre: 'Primer piso',
  colorParedes: '#ffd6e0',

  habitaciones: [
    { nombre: 'dormitorio', rects: [[-9, -6, -3, 6]], colorPiso: '#bde0fe', textura: 'madera', pared: 'flores', colorLampara: '#cdb4db' },
    { nombre: 'cuarto del hijo', rects: [[-3, -6, 3, 2]], colorPiso: '#caffbf', textura: 'madera', pared: 'estrellas', lampara: 'plafon' },
    { nombre: 'cuarto de la abuela', rects: [[3, -2, 9, 2]], colorPiso: '#e9d8fd', textura: 'madera', colorParedes: '#fcefb4', pared: 'flores', colorLampara: '#ffafcc' },
    { nombre: 'baño de arriba', rects: [[3, -6, 9, -2]], colorPiso: '#a0e7e5', textura: 'ceramica', pared: 'azulejos', lampara: 'plafon' },
    { nombre: 'pasillo', rects: PASILLO_CON_HUECO, colorPiso: '#cdb4db', textura: 'madera', pared: 'rayas', lampara: 'plafon' },
  ],

  paredes: PAREDES_TIPICAS,

  puertas: [
    { x: -3, z: 3, eje: 'z' }, // pasillo ↔ dormitorio
    { x: 0, z: 2, eje: 'x' }, // pasillo ↔ cuarto del hijo
    { x: 5, z: 2, eje: 'x' }, // pasillo ↔ cuarto de la abuela
    { x: 3, z: -4, eje: 'z' }, // cuarto del hijo ↔ baño de arriba
    { x: -6, z: 6, eje: 'x' }, // dormitorio ↔ balcón
  ],

  conductos: [{ desde: [7.5, -4.4], hasta: [7.5, -1] }], // baño de arriba ↔ cuarto de la abuela

  // Solo el lado norte del hueco: por el lado oeste arranca el tramo que sube
  barandas: [BARANDA_HUECO],

  muebles: [
    // Dormitorio
    { tipo: 'camaDoble', x: -7.85, z: 0, rot: 90 },
    { tipo: 'mesaLuz', x: -8.6, z: 1.3 },
    { tipo: 'mesaLuz', x: -8.6, z: -1.3 },
    { tipo: 'placard', x: -6, z: -5.5 },
    { tipo: 'comoda', x: -8, z: 5.6, rot: 180 },
    { tipo: 'alfombraRedonda', x: -5.4, z: 0 },
    { tipo: 'lamparaPie', x: -4.2, z: -5.5 },
    { tipo: 'ventana', x: -8.87, z: 3.5, rot: 90 },
    { tipo: 'ventana', x: -8.87, z: -3.5, rot: 90 },
    // Cuarto del hijo
    { tipo: 'camaSimple', x: -2.2, z: -4.85 },
    { tipo: 'osito', x: -2.2, z: -5.45 },
    { tipo: 'placard', x: 2.5, z: -0.9, rot: -90 },
    { tipo: 'escritorio', x: 0.5, z: -5.6 },
    { tipo: 'sillaEscritorio', x: 0.5, z: -4.85, rot: 180 },
    { tipo: 'ventana', x: 1.8, z: -5.87 },
    // Cuarto de la abuela (antes era el estudio): cama y su tele vieja.
    // (La mecedora no está acá: la arma Abuela.js, porque se hamaca con ella.)
    { tipo: 'camaSimple', x: 7.85, z: 1.2, rot: -90 },
    { tipo: 'mesaLuz', x: 8.6, z: 0.25 },
    { tipo: 'televisionVieja', x: 8.5, z: -1.5, rot: -90 },
    { tipo: 'biblioteca', x: 6, z: -1.7 },
    { tipo: 'alfombraRedonda', x: 5.8, z: 0.2 },
    { tipo: 'planta', x: 3.5, z: -1.5 },
    { tipo: 'ventana', x: 8.87, z: 0, rot: -90 },
    // Baño de arriba
    { tipo: 'banera', x: 8.5, z: -4.5 },
    { tipo: 'inodoro', x: 4, z: -2.5, rot: 180 }, // (en la otra punta: al lado de la bañera pasa el conducto)
    { tipo: 'lavamanos', x: 5.5, z: -5.65 },
    // Pasillo
    { tipo: 'planta', x: -2.5, z: 5.4 },
    { tipo: 'ventana', x: -1, z: 5.87, rot: 180 },
    // Detalles (etapa 11C)
    { tipo: 'tocador', x: -4.3, z: 5.62, rot: 180 },
    { tipo: 'juguetes', x: -0.6, z: -1.4 },
    { tipo: 'puff', x: 1.6, z: -3.3, colores: { tela: '#f15bb5' } },
    { tipo: 'canastaOvillos', x: 3.55, z: 0.3 },
    { tipo: 'toallero', x: 3.1, z: -5.2, rot: 90, colores: { toalla: '#f4a261' } },
    { tipo: 'alfombraBano', x: 6.2, z: -4.2, colores: { tela: '#f4a261' } },
    { tipo: 'alfombraLarga', x: 3, z: 3, escala: [5, 1, 0.7], colores: { borde: '#2a9d8f', tela: '#e9f5db' } },
  ],

  cuadros: [
    { dibujo: 'paisaje', x: -8.89, z: 0, rot: 90, y: 1.75, ancho: 1.2, alto: 0.7 }, // sobre la cama
    { dibujo: 'espejo', x: -8.2, z: -5.89, rot: 0, y: 1.5, ancho: 0.6, alto: 1 },
    { dibujo: 'dibujoNino', x: -1.8, z: 1.89, rot: 180, y: 1.4, ancho: 0.5, alto: 0.5, marco: false },
    { dibujo: 'dinosaurio', x: 1.3, z: 1.89, rot: 180, y: 1.4, ancho: 0.5, alto: 0.5, marco: false },
    { dibujo: 'dibujoNino', x: -2.89, z: -2.5, rot: 90, y: 1.5, ancho: 0.45, alto: 0.45, marco: false },
    { dibujo: 'abuelo', x: 8.89, z: 1.2, rot: -90, y: 1.75, ancho: 0.6, alto: 0.8 }, // el abuelo, sobre la cama de la abuela
    { dibujo: 'flores', x: 4.2, z: -1.89, rot: 0, y: 1.8 },
    { dibujo: 'reloj', x: 7.2, z: 1.89, rot: 180, y: 2, ancho: 0.45, alto: 0.45, marco: false },
    { dibujo: 'barco', x: 2.5, z: 2.11, rot: 0 },
    { dibujo: 'mapa', x: 7.3, z: 2.11, rot: 0 },
    { dibujo: 'retratoDueno', x: 2.4, z: 5.89, rot: 180, y: 2, ancho: 0.5, alto: 0.6 },
    { dibujo: 'abstracto', x: 4.6, z: 5.89, rot: 180, y: 2.45, ancho: 0.6, alto: 0.45 },
  ],

  luces: [],

  // La abuela (etapa 12): se hamaca en su mecedora mirando la tele y, cada tanto, sale a dar una
  // vuelta por el pasillo. Nunca sale de su cuarto y del pasillo (zona), ni baja o sube de piso.
  abuela: {
    silla: { x: 4.45, z: -0.6, rot: 90 }, // rot 90: mira hacia +X (hacia la tele)
    zona: [[3, -2, 9, 2], ...PASILLO_CON_HUECO],
    // Los waypoints de este piso que puede usar (los de los otros cuartos no)
    waypoints: ['abuela', 'p-abuela', 'pasillo-centro', 'pasillo-este', 'pasillo-oeste', 'escalera-arriba', 'escalera2-abajo', 'p-hijo', 'p-dormitorio'],
    puntosPatrulla: ['pasillo-este', 'pasillo-oeste', 'pasillo-centro', 'escalera-arriba'],
  },

  waypoints: [
    { id: 'escalera-arriba', pos: [8, 5.15] }, // donde llega la escalera de la planta baja
    { id: 'pasillo-este', pos: [7.5, 3] },
    { id: 'pasillo-centro', pos: [5, 3] },
    { id: 'pasillo-oeste', pos: [0, 3] },
    { id: 'escalera2-abajo', pos: [0, 5.15] }, // donde arranca la escalera al segundo piso
    { id: 'p-abuela', pos: [5, 2] },
    { id: 'abuela', pos: [5.5, 0.3] },
    { id: 'p-hijo', pos: [0, 2] },
    { id: 'hijo', pos: [0.5, -2.5] },
    { id: 'p-baño-arriba', pos: [3, -4] },
    { id: 'baño-arriba', pos: [6, -4] },
    { id: 'p-dormitorio', pos: [-3, 3] },
    { id: 'dormitorio', pos: [-5, 2.5] },
  ],

  conexiones: [
    ['escalera-arriba', 'pasillo-este'],
    ['pasillo-este', 'pasillo-centro'],
    ['pasillo-centro', 'pasillo-oeste'],
    ['pasillo-oeste', 'escalera2-abajo'],
    ['pasillo-centro', 'p-abuela'],
    ['p-abuela', 'abuela'],
    ['pasillo-oeste', 'p-hijo'],
    ['p-hijo', 'hijo'],
    ['hijo', 'p-baño-arriba'],
    ['p-baño-arriba', 'baño-arriba'],
    ['pasillo-oeste', 'p-dormitorio'],
    ['p-dormitorio', 'dormitorio'],
  ],
};
