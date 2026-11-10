// ÁTICO (piso 3): el espacio adentro del techo a dos aguas. No tiene paredes: el techo baja
// hacia los costados, así que en los bordes hay que agacharse (ver TECHO en HouseData.js).
// Se llega por la escalera plegable de la sala de trofeos (plegada, tapa el hueco como una trampilla).
// Sobre el cuarto de juegos no hay piso (desde abajo se ve un techo altísimo) y lo cruza un PUENTE
// de tablones, sin baranda: si te caés, aterrizás en el cuarto de juegos... con mucho ruido.
//
//  z=-6.6 +---------------------------------------+  <- acá el techo casi toca el piso
//         |  baúl        +-----+ cajas [chimenea] |
//         |              |hueco|  +----++-------+ | z=-2
//         |              |     |  |vacío||vacío | |
//         |  caballito   +-----+  |     ||puente|
//         |                       +----++-------+ | z=2
//         |                           sillón baúl |
//  z=6.6  +---------------------------------------+
//       x=-9.1                  x=3             x=9.1

// El hueco de la escalera del ático (lo que ocupa la escalera plegada): x -0.8..0.8, z -4..1
export const HUECO_ATICO = { x1: -0.8, z1: -4, x2: 0.8, z2: 1 };

export const ATICO = {
  piso: 3,
  nombre: 'Ático',
  colorParedes: '#d4a373',

  // El piso llega hasta el alero (así no queda una rendija entre el piso y el techo).
  // Deja dos huecos: el de la escalera y el vacío sobre el cuarto de juegos (x 3..9.1, z -2..2).
  habitaciones: [
    {
      nombre: 'ático',
      rects: [
        [-9.1, -6.6, -0.8, 6.6], // al oeste de la escalera
        [-0.8, -6.6, 0.8, -4], // al norte de la escalera
        [-0.8, 1, 0.8, 6.6], // al sur de la escalera
        [0.8, -6.6, 3, 6.6], // entre la escalera y el vacío
        [3, -6.6, 9.1, -2], // al norte del vacío
        [3, 2, 9.1, 6.6], // al sur del vacío
      ],
      colorPiso: '#a98467',
      textura: 'madera',
    },
  ],

  paredes: [],
  puertas: [],

  // Barandas alrededor del hueco de la escalera (el lado de z=1 queda abierto: por ahí se sube)
  // y alrededor del vacío (menos donde arranca el puente)
  barandas: [
    [-0.9, -4, -0.8, 1],
    [0.8, -4, 0.9, 1],
    [-0.9, -4.1, 0.9, -4],
    [3, -2.1, 5.4, -2],
    [6.2, -2.1, 9.1, -2],
    [3, 2, 5.4, 2.1],
    [6.2, 2, 9.1, 2.1],
    [2.9, -2.1, 3, 2.1],
  ],

  // Puente de tablones sobre el vacío [x1, z1, x2, z2]
  puentes: [[5.4, -2, 6.2, 2]],

  muebles: [
    { tipo: 'baul', x: -6, z: -3.8 },
    { tipo: 'baul', x: 6.5, z: 3.8, rot: 180 },
    { tipo: 'caballitoMecedor', x: -3.5, z: 2.5, animado: true }, // (a veces se hamaca solo)
    { tipo: 'munecaGigante', x: -7.8, z: 2, rot: 90 },
    { tipo: 'maniqui', x: 7.8, z: -3.3 },
    { tipo: 'espejoViejo', x: -8.6, z: -1, rot: 90 },
    { tipo: 'cajas', x: 7.7, z: 4.3 },
    { tipo: 'cajas', x: -2.5, z: -3.8, rot: 90 },
    { tipo: 'sillon', x: 4, z: 3.8, rot: 180 },
    { tipo: 'televisionVieja', x: 8.2, z: 2.5, rot: -90 },
    // El ropero viejo del ático: por dentro es un placard más (escondite, etapa 14C)
    { tipo: 'placard', x: -1.4, z: 2.95, rot: 180 },
    // Detalles (etapa 11C): muebles tapados con sábanas (¡parecen fantasmas!) y cajas abiertas
    { tipo: 'sabanaFantasma', x: -4, z: -1.5 },
    { tipo: 'sabanaFantasma', x: 4.2, z: -4.3 },
    { tipo: 'cajaAbierta', x: -7.6, z: -4.2 },
    // Etapa 16F: detrás de las sábanas colgadas hay otro maniquí...
    { tipo: 'maniqui', x: -8, z: 0.4, rot: 90, animado: true }, // (gira hacia vos cuando no lo mirás: ver Sustos.js)
  ],

  // El rincón de las sábanas: sábanas colgadas de sogas, que forman un laberinto (ver Decoracion.crearTelas)
  telas: [
    { x: -7.9, z: -0.6, y: 2.1, ancho: 1.4, alto: 1.9, color: '#f1f3f5' },
    { x: -6.2, z: -0.6, y: 2.1, ancho: 1.4, alto: 1.9, color: '#e9ecef' },
    { x: -7.1, z: 1.3, y: 2.1, ancho: 1.4, alto: 1.9, color: '#f8f9fa' },
    { x: -5.5, z: 1.3, y: 2.1, ancho: 1.3, alto: 1.9, color: '#dee2e6' },
    { x: -5.2, z: 0.3, y: 2.1, ancho: 1.5, alto: 1.9, color: '#f1f3f5', rot: 90 },
    { x: -6.6, z: 0.4, y: 2.1, ancho: 1.2, alto: 1.9, color: '#e9ecef', rot: 90 },
    { x: -8, z: 2.4, y: 2.1, ancho: 1.3, alto: 1.9, color: '#f8f9fa' },
  ],

  // Una lamparita colgando
  luces: [{ x: -2, y: 3.2, z: 0.5, color: '#ffe8a3', intensidad: 5, distancia: 10, parpadea: true }],

  waypoints: [
    { id: 'atico-llegada', pos: [0, 1.8] }, // donde llega la escalera
    { id: 'atico-oeste', pos: [-5, 1.8] },
    { id: 'atico-sur', pos: [2.2, 2.9] },
    { id: 'atico-este', pos: [5.2, 2.9] },
    { id: 'atico-centro', pos: [1.9, 1.8] },
    { id: 'atico-norte', pos: [1.9, -3.6] },
    { id: 'atico-noroeste', pos: [-5, -3.2] },
    { id: 'atico-noreste', pos: [6.5, -3.4] },
  ],

  // (El dueño no usa el puente: da la vuelta por el lado de la escalera)
  conexiones: [
    ['atico-llegada', 'atico-oeste'],
    ['atico-llegada', 'atico-sur'],
    ['atico-sur', 'atico-este'],
    ['atico-llegada', 'atico-centro'],
    ['atico-centro', 'atico-norte'],
    ['atico-norte', 'atico-noreste'],
    ['atico-oeste', 'atico-noroeste'],
  ],
};
