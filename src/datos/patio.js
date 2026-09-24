// PATIO TRASERO: el territorio de los perros. Está cercado y tiene dos tranqueras (siempre abiertas:
// los perros no las cruzan porque "están entrenados"). Adentro están la puerta trasera, el pozo,
// la mesa con sombrilla, la cucha y el tendedero.
//
// Visto desde arriba (la casa en el medio):
//
//  z=-16 +--------------------------------------------------+
//        |          ·  PATIO (atrás de la casa)  ·   leña   |
//        |  árbol       tendedero        árbol        árbol |
//  tranq.|                                        cucha     |
//  x=-9  +---------+================================+       |
//        |         |                                | pozo  |
//        | garaje  |             CASA               | mesa  |   <- puerta trasera (x=9)
//        |         |                                |       |
//  z=6   +---------+================================+==tranquera==  (cerco en z=6.2)
//        |                  FRENTE (sin perros)                    |
//     x=-24                                       x=9          x=24

// Rectángulos donde se pueden mover los perros [x1, z1, x2, z2] (ya con el margen de su cuerpo)
export const ZONA_PATIO = [
  [9.45, -15.3, 23.3, 5.85], // al este de la casa
  [-8.9, -15.3, 9.45, -6.45], // atrás de la casa
];

// Cercos del patio: [ax, az, bx, bz, huecos]. Los huecos son las tranqueras (desde, hasta),
// medidos sobre el eje en que va el cerco.
export const CERCOS_PATIO = [
  { desde: [9.1, 6.2], hasta: [24, 6.2], tranquera: [12, 13.4] }, // del lado este, en el frente
  { desde: [-9.2, -6.1], hasta: [-9.2, -16], tranquera: [-10.8, -9.4] }, // del lado oeste, atrás
];

// La cucha (los perros vuelven acá cuando se aburren)
export const CUCHA = { x: 15, z: -9 };

// Recorrido de los perros (el patio no tiene los waypoints del dueño)
export const WAYPOINTS_PATIO = [
  { id: 'cucha', pos: [15, -7.2] }, // enfrente de la puertita de la cucha
  { id: 'patio-puerta', pos: [11, 1.5] }, // afuera de la puerta trasera
  { id: 'patio-mesa', pos: [12.5, 2.5] },
  { id: 'patio-tranquera', pos: [12.7, 4.8] },
  { id: 'patio-este', pos: [17, 1] },
  { id: 'patio-rincon', pos: [21.5, -3] },
  { id: 'patio-fondo-este', pos: [21.5, -14.5] },
  { id: 'patio-fondo', pos: [12, -14] },
  { id: 'patio-pozo', pos: [10.6, -3.5] },
  { id: 'patio-esquina', pos: [11, -8] },
  { id: 'patio-tendedero', pos: [4.5, -13.5] },
  { id: 'patio-atras', pos: [4.5, -8.5] },
  { id: 'patio-atras-oeste', pos: [-4, -8.5] },
  { id: 'patio-fondo-oeste', pos: [-3, -14.5] },
].map((wp) => ({ ...wp, pos: [wp.pos[0], 0, wp.pos[1]] }));

export const CONEXIONES_PATIO = [
  ['patio-tranquera', 'patio-mesa'],
  ['patio-mesa', 'patio-puerta'],
  ['patio-mesa', 'patio-este'],
  ['patio-puerta', 'patio-pozo'],
  ['patio-este', 'patio-rincon'],
  ['patio-pozo', 'patio-esquina'],
  ['patio-esquina', 'cucha'],
  ['cucha', 'patio-rincon'],
  ['patio-rincon', 'patio-fondo-este'],
  ['patio-fondo-este', 'patio-fondo'],
  ['patio-fondo', 'patio-esquina'],
  ['patio-fondo', 'patio-tendedero'],
  ['patio-tendedero', 'patio-atras'],
  ['patio-atras', 'patio-esquina'],
  ['patio-atras', 'patio-atras-oeste'],
  ['patio-atras-oeste', 'patio-fondo-oeste'],
  ['patio-fondo-oeste', 'patio-tendedero'],
];
