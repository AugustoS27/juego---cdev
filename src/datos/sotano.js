// SÓTANO (piso -1): el lugar más tenebroso de la casa. Oscuro, con lamparitas que parpadean.
// Queda debajo del pasto: su techo es el piso de la planta baja.
// Un conducto une el depósito con la bodega, y en la pared este de la bodega hay una tabla floja:
// detrás está el túnel que sale al pozo del jardín (ver TUNEL en HouseData.js).
//
//  x=-9      x=-3        x=3          x=9
//  z=-6 +--------+-----------+------------+
//       |        |           |   bodega   |
//       | sala   | depósito  +------------+ z=-2
//       | de la  |           | cuarto de  |
//       | caldera|           | las muñecas|
//       |        +-----------+------------+ z=2
//       |        | pasillo   [escalera]   |
//  z=6  +--------+------------------------+
import { PAREDES_TIPICAS } from './comun.js';

export const SOTANO = {
  piso: -1,
  nombre: 'Sótano',
  colorParedes: '#524a63', // paredes oscuras

  habitaciones: [
    { nombre: 'sala de la caldera', rects: [[-9, -6, -3, 6]], colorPiso: '#6c6f7d', textura: 'baldosas', colorParedes: '#4a4e69', pared: 'ladrillos' },
    { nombre: 'depósito', rects: [[-3, -6, 3, 2]], colorPiso: '#77736b', textura: 'baldosas', colorParedes: '#5c5346', pared: 'ladrillos' },
    { nombre: 'bodega', rects: [[3, -6, 9, -2]], colorPiso: '#6b4f3a', textura: 'baldosas', colorParedes: '#5e3b2e', pared: 'ladrillos' },
    { nombre: 'cuarto de las muñecas', rects: [[3, -2, 9, 2]], colorPiso: '#9d6b8f', textura: 'madera', colorParedes: '#6d3b5e', pared: 'flores' },
    // El pasillo no tiene hueco: el tramo de escalera arranca acá y sube a la planta baja
    { nombre: 'pasillo del sótano', rects: [[-3, 2, 9, 6]], colorPiso: '#5f5b6b', textura: 'baldosas', pared: 'ladrillos' },
  ],

  paredes: PAREDES_TIPICAS,

  puertas: [
    { x: -3, z: 4, eje: 'z' }, // pasillo ↔ sala de la caldera
    { x: -3, z: -2, eje: 'z' }, // sala de la caldera ↔ depósito
    { x: 0, z: 2, eje: 'x' }, // depósito ↔ pasillo
    { x: 3, z: 0, eje: 'z' }, // depósito ↔ cuarto de las muñecas
    { x: 6, z: 2, eje: 'x' }, // cuarto de las muñecas ↔ pasillo
    { x: 6, z: -2, eje: 'x' }, // cuarto de las muñecas ↔ bodega
  ],

  conductos: [{ desde: [1, -4.6], hasta: [4.8, -4.6] }], // depósito ↔ bodega

  barandas: [],

  muebles: [
    // Sala de la caldera
    { tipo: 'caldera', x: -7.6, z: -4.6 },
    { tipo: 'estanteria', x: -8.65, z: 0, rot: 90 },
    { tipo: 'lavarropas', x: -8.55, z: 4.6, rot: 90 },
    { tipo: 'secarropas', x: -8.55, z: 3.8, rot: 90 },
    { tipo: 'placard', x: -5, z: 5.55, rot: 180 }, // un ropero viejo... para esconderse
    { tipo: 'cajas', x: -4, z: -5.3 },
    { tipo: 'barril', x: -5.4, z: -5.4 },
    // Depósito
    { tipo: 'estanteria', x: -1.5, z: -5.7 },
    { tipo: 'estanteria', x: 1.5, z: -5.7 },
    { tipo: 'cajas', x: -2.4, z: -3.5 },
    { tipo: 'cajas', x: 2.3, z: -3 },
    { tipo: 'cajas', x: 2.4, z: 1.3, rot: 90 },
    { tipo: 'maniqui', x: -2.3, z: 1.2 },
    { tipo: 'cajaGrande', x: 0, z: -4.9 }, // escondite (etapa 14C)
    // Bodega
    { tipo: 'estanteVinos', x: 4.6, z: -5.7 },
    { tipo: 'estanteVinos', x: 7.4, z: -5.7 },
    { tipo: 'barril', x: 8.4, z: -3.2 },
    { tipo: 'barril', x: 7.6, z: -2.6 },
    { tipo: 'barril', x: 3.6, z: -2.7 },
    { tipo: 'mesa', x: 7.2, z: -3.6 },
    // Cuarto de las muñecas
    { tipo: 'estanteMunecas', x: 8.7, z: 0, rot: -90 },
    { tipo: 'munecaGigante', x: 3.7, z: 1.5, rot: 90 },
    { tipo: 'mecedora', x: 7.5, z: -1.3 },
    { tipo: 'camaSimple', x: 4.2, z: -1.35, rot: 90 },
    // Pasillo
    { tipo: 'cajas', x: 8.4, z: 5.3 },
    { tipo: 'barril', x: 8.5, z: 2.6 },
    // Detalles (etapa 11C)
    { tipo: 'cadenas', x: -6.3, z: -1 },
    { tipo: 'cadenas', x: 1.8, z: -4.2 },
  ],

  // El cuadro que te sigue con la mirada, y manchas de humedad (cuadros sin marco)
  cuadros: [
    { dibujo: 'ojos', x: 3, z: 2.11, rot: 0, y: 1.6, ancho: 0.6, alto: 0.8 },
    { dibujo: 'humedad', x: -8.89, z: -2.5, rot: 90, y: 1.3, ancho: 1.4, alto: 1, marco: false },
    { dibujo: 'humedad', x: -3.11, z: 0.8, rot: -90, y: 1.9, ancho: 1.2, alto: 0.9, marco: false },
    { dibujo: 'humedad', x: 6.5, z: -5.89, rot: 0, y: 2.1, ancho: 1.2, alto: 0.8, marco: false },
    { dibujo: 'humedad', x: 8.89, z: 4.3, rot: -90, y: 1.2, ancho: 1, alto: 1, marco: false },
  ],

  // Goteras: de acá cae una gota cada tanto, sobre un charco
  gotas: [
    { x: -4.6, z: 2.4 },
    { x: 1.4, z: -1 },
    { x: 4.8, z: 3.4 },
  ],

  // Luces propias: lamparitas (algunas parpadean) y el resplandor naranja de la caldera.
  // y = altura sobre el piso. intensidad y distancia: ver THREE.PointLight
  luces: [
    { x: -1, y: 2.4, z: 3.3, color: '#ffd6a5', intensidad: 7, distancia: 9, parpadea: true },
    { x: -7.6, y: 0.8, z: -3.4, color: '#ff7b00', intensidad: 6, distancia: 6 },
    { x: 6, y: 2.4, z: 0, color: '#e0aaff', intensidad: 5, distancia: 7, parpadea: true },
  ],

  waypoints: [
    { id: 'sot-escalera', pos: [0, 5.15] }, // donde arranca la escalera que sube a la planta baja
    { id: 'sot-pasillo-oeste', pos: [-1.5, 3.2] },
    { id: 'sot-pasillo-centro', pos: [0, 3.2] },
    { id: 'sot-pasillo-este', pos: [6, 3.2] },
    { id: 'p-sot-caldera', pos: [-3, 4] },
    { id: 'caldera', pos: [-5.5, 2.5] },
    { id: 'caldera-norte', pos: [-5.5, -2] },
    { id: 'p-sot-caldera-deposito', pos: [-3, -2] },
    { id: 'p-sot-deposito', pos: [0, 2] },
    { id: 'deposito', pos: [0.5, -1.5] },
    { id: 'p-sot-deposito-munecas', pos: [3, 0] },
    { id: 'munecas', pos: [5.5, 0.3] },
    { id: 'p-sot-munecas', pos: [6, 2] },
    { id: 'p-sot-bodega', pos: [6, -2] },
    { id: 'bodega', pos: [6, -4] },
  ],

  conexiones: [
    ['sot-escalera', 'sot-pasillo-centro'],
    ['sot-pasillo-oeste', 'sot-pasillo-centro'],
    ['sot-pasillo-centro', 'sot-pasillo-este'],
    ['sot-pasillo-oeste', 'p-sot-caldera'],
    ['p-sot-caldera', 'caldera'],
    ['caldera', 'caldera-norte'],
    ['caldera-norte', 'p-sot-caldera-deposito'],
    ['p-sot-caldera-deposito', 'deposito'],
    ['sot-pasillo-centro', 'p-sot-deposito'],
    ['p-sot-deposito', 'deposito'],
    ['deposito', 'p-sot-deposito-munecas'],
    ['p-sot-deposito-munecas', 'munecas'],
    ['munecas', 'p-sot-munecas'],
    ['p-sot-munecas', 'sot-pasillo-este'],
    ['munecas', 'p-sot-bodega'],
    ['p-sot-bodega', 'bodega'],
  ],
};
