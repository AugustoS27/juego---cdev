// PRIMER PISO (piso 1): dormitorio, cuarto del hijo, baño y el cuarto de la abuela.
// Del rincón oeste del pasillo sale el tramo de escalera que sube al segundo piso.
// Un conducto de ventilación une el baño de arriba con el cuarto de la abuela.
import { PAREDES_TIPICAS, PASILLO_CON_HUECO, BARANDA_HUECO } from './comun.js';

export const PRIMER_PISO = {
  piso: 1,
  nombre: 'Primer piso',
  colorParedes: '#ffd6e0',

  habitaciones: [
    { nombre: 'dormitorio', rects: [[-9, -6, -3, 6]], colorPiso: '#bde0fe', textura: 'madera' },
    { nombre: 'cuarto del hijo', rects: [[-3, -6, 3, 2]], colorPiso: '#caffbf', textura: 'madera' },
    { nombre: 'cuarto de la abuela', rects: [[3, -2, 9, 2]], colorPiso: '#e9d8fd', textura: 'madera', colorParedes: '#fcefb4' },
    { nombre: 'baño de arriba', rects: [[3, -6, 9, -2]], colorPiso: '#a0e7e5', textura: 'ceramica' },
    { nombre: 'pasillo', rects: PASILLO_CON_HUECO, colorPiso: '#cdb4db', textura: 'madera' },
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
    // Cuarto de la abuela (antes era el estudio): cama, mecedora y su tele vieja
    { tipo: 'camaSimple', x: 7.85, z: 1.2, rot: -90 },
    { tipo: 'mesaLuz', x: 8.6, z: 0.25 },
    { tipo: 'mecedora', x: 4.4, z: -0.6, rot: 90 },
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
  ],

  luces: [],

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
