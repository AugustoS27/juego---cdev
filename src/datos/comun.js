// Cosas que comparten los datos de todos los pisos.

export const ALTURA_PISO = 3;

// Ruta de un modelo de muebles de Kenney (en public/models/muebles)
export const M = (nombre) => `/models/muebles/${nombre}.glb`;

// Las paredes "de siempre": casi todos los pisos usan este mismo plano (visto desde arriba).
//
//  x=-9      x=-3        x=3          x=9
//  z=-6 +--------+-----------+------------+
//       |        |           |            |
//       |        |           +------------+ z=-2
//       |        |           |            |
//       |        +-----------+------------+ z=2
//       |        |   pasillo + escalera   |
//  z=6  +--------+------------------------+
export const PAREDES_TIPICAS = [
  // Exteriores
  [-9, -6, 9, -6],
  [-9, 6, 9, 6],
  [-9, -6, -9, -2], // la pared oeste va en dos partes (en planta baja, una da afuera y la otra al garaje)
  [-9, -2, -9, 6],
  [9, -6, 9, 6],
  // Interiores
  [-3, -6, -3, 6],
  [-3, 2, 9, 2],
  [3, -6, 3, 2],
  [3, -2, 9, -2],
];

// La escalera principal ocupa x 1..7, z 4..6 en todos los pisos (los tramos van uno encima del otro).
// Los pisos que tienen el hueco arman su pasillo con estos 3 rectángulos (el hueco queda afuera).
export const PASILLO_CON_HUECO = [
  [-3, 2, 9, 4], // franja principal
  [-3, 4, 1, 6], // rincón al oeste de la escalera (donde arranca el tramo que sube)
  [7, 4, 9, 6], // descanso donde llega el tramo que viene de abajo
];

// Barandas alrededor del hueco de la escalera [x1, z1, x2, z2]
export const BARANDA_HUECO = [1, 3.9, 7, 4]; // lado norte
export const BARANDA_HUECO_OESTE = [0.9, 3.9, 1, 6]; // lado oeste (solo si de ese piso no sube otro tramo)
