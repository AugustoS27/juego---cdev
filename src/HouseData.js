// ============================================================
//  DATOS DE LA CASA
//  Todo lo que forma la casa está descripto como datos simples. Hay un archivo por piso
//  en src/datos/ (sotano.js, plantaBaja.js, primerPiso.js, segundoPiso.js, atico.js)
//  y el catálogo de muebles en src/datos/muebles.js.
//
//  Este archivo junta todo y lo exporta en listas "planas" (cada cosa con su número de piso),
//  que es lo que lee House.js para construir la escena.
//
//  Sistema de coordenadas (visto desde arriba):
//    - X va de oeste (-9) a este (+9)
//    - Z va de norte (-6) a sur (+6). El frente de la casa mira al SUR (+Z).
//    - Y es la altura. Cada piso mide 3 metros:
//        piso -1 = sótano (y = -3) · 0 = planta baja · 1 = primer piso · 2 = segundo piso · 3 = ático
// ============================================================
import { ALTURA_PISO } from './datos/comun.js';
import { SOTANO } from './datos/sotano.js';
import { PLANTA_BAJA } from './datos/plantaBaja.js';
import { PRIMER_PISO } from './datos/primerPiso.js';
import { SEGUNDO_PISO } from './datos/segundoPiso.js';
import { ATICO } from './datos/atico.js';

export { ALTURA_PISO };
export { MUEBLES } from './datos/muebles.js';
export { ZONA_PATIO, CERCOS_PATIO, CUCHA, WAYPOINTS_PATIO, CONEXIONES_PATIO } from './datos/patio.js';

// Los pisos, de abajo hacia arriba
export const PISOS = [SOTANO, PLANTA_BAJA, PRIMER_PISO, SEGUNDO_PISO, ATICO];
export const PISO_MINIMO = -1;
export const PISO_MAXIMO = 3;

// Nombre de cada piso (para el HUD y los avisos): NOMBRES_PISOS[-1] = 'Sótano'
export const NOMBRES_PISOS = Object.fromEntries(PISOS.map((p) => [p.piso, p.nombre]));

// En qué piso está algo, según su altura (y). En la mitad de una escalera cambia al de arriba.
export function pisoDeAltura(y) {
  return Math.min(PISO_MAXIMO, Math.max(PISO_MINIMO, Math.floor((y + ALTURA_PISO / 2) / ALTURA_PISO)));
}

// Dónde aparece el jugador: afuera, en el camino del jardín delantero, mirando la casa
export const INICIO_JUGADOR = { x: -1, y: 0, z: 19 };

// Rectángulo de la casa principal (sin el garaje). El dueño nunca sale de acá.
export const LIMITES_CASA = { x1: -9, z1: -6, x2: 9, z2: 6 };

// Color de las paredes por fuera (las caras que no dan a ninguna habitación)
export const COLOR_EXTERIOR = '#8fd3d9';

// El techo a dos aguas: empieza arriba del segundo piso (y = 9) y adentro está el ático.
// mitad = distancia del centro al alero (en Z). x1/x2 = puntas (hastiales) del techo.
export const TECHO = { y: 3 * ALTURA_PISO, alto: 4.5, mitad: 6.7, x1: -9.1, x2: 9.1 };

// ============================================================
//  ESCALERAS
//  Cada una es una rampa invisible + escalones de decoración (ver House.crearEscalera).
//  inicio: [x, z] del pie de la escalera (el punto más bajo, sobre su eje)
//  dir: hacia dónde sube ('x' = hacia +X, 'z' = hacia +Z)
//  Los tres primeros tramos van uno encima del otro (siempre queda 3 m de altura libre).
// ============================================================
export const ESCALERAS = [
  { nombre: 'sótano', pisoAbajo: -1, inicio: [1, 5.15], dir: 'x', largo: 6, ancho: 1.7 },
  { nombre: 'principal', pisoAbajo: 0, inicio: [1, 5.15], dir: 'x', largo: 6, ancho: 1.7 },
  { nombre: 'segundo piso', pisoAbajo: 1, inicio: [1, 5.15], dir: 'x', largo: 6, ancho: 1.7 },
  // La del ático es más corta, empinada y PLEGABLE (ver Especiales.js): plegada tapa el hueco
  { nombre: 'ático', pisoAbajo: 2, inicio: [0, -3], dir: 'z', largo: 4, ancho: 1.4, plegable: true },
];

// El túnel secreto: sale de la pared este de la bodega (sótano) y llega hasta el fondo del pozo
// del jardín. Solo se pasa agachado.
export const TUNEL = { piso: -1, desde: [9, -4.5], hasta: [13.4, -4.5] };
export const POZO = { x: 12.9, z: -4.5 };

// Waypoints de abajo y de arriba de cada escalera (así el dueño puede cambiar de piso)
const CONEXIONES_ESCALERAS = [
  ['sot-escalera', 'rellano-pb'],
  ['escalera-abajo', 'escalera-arriba'],
  ['escalera2-abajo', 'rellano-2p'],
  ['escalera-atico', 'atico-llegada'],
];

// ============================================================
//  FORMAS DE ENTRAR (ver Entradas.js)
// ============================================================
// Ventana que se puede romper (hueco en la pared con alféizar abajo). Desde la etapa 17B es la de la
// cocina, en la pared de ATRÁS (antes era la del living, en el frente: había demasiadas entradas adelante).
// afuera: hacia qué lado de la pared queda el jardín (-1 = hacia -Z, el fondo).
export const VENTANA_ROMPIBLE = { piso: 0, x: -0.5, z: -6, eje: 'x', ancho: 1.4, abajo: 1, arriba: 2.2, afuera: -1 };

// Portón basculante del garaje (se fuerza manteniendo E)
export const PORTON_GARAJE = { piso: 0, x: -12.25, z: 6, eje: 'x', ancho: 4.4, alto: 2.5 };

// Balcón del dormitorio (primer piso, sobre el frente) y la escalera tirada en el pasto
export const BALCON = { x1: -8.2, z1: 6.1, x2: -3.8, z2: 8.1 };
export const ESCALERA_BALCON = { x: -6.9, zBase: 9.3, zApoyo: 8.15, alturaApoyo: 4 };

// Macetas junto a la puerta de calle: en una (al azar) está la llave de repuesto
export const MACETAS = [
  { x: -2.4, z: 6.7 },
  { x: 0.4, z: 6.7 },
  { x: 1.3, z: 6.7 },
];

// --- Entradas nuevas (etapa 14B, ver EntradasNuevas.js) ---
// Techo plano del garaje: se puede pisar. Se sube saltando por los TRASTOS de su pared oeste
// (cada uno un poco más alto que el anterior: tacho → cajones → aire acondicionado → techo).
export const TECHO_GARAJE = { x1: -15.65, z1: -2.25, x2: -9.1, z2: 6.25, y: 3.2 };
export const TRASTOS = [
  { tipo: 'tacho', x: -16.05, z: 5.55, ancho: 0.7, prof: 0.7, alto: 0.9 },
  { tipo: 'cajones', x: -16.05, z: 4.7, ancho: 0.8, prof: 0.8, alto: 1.7 },
  { tipo: 'aire', x: -16.05, z: 3.8, ancho: 0.8, prof: 0.8, alto: 2.5 },
];

// Chimenea: una columna de ladrillos afuera, contra la pared oeste del living y pegada al garaje.
// Su boca queda un poco más alta que el techo del garaje: desde ahí te tirás adentro y caés en el
// hogar del living (x, z = centro de la columna; boca = altura de arriba).
export const CHIMENEA = { x: -9.65, z: -2.75, ancho: 1.1, prof: 1.2, boca: 3.9 }; // (la boca, justo debajo de la ventana del primer piso)

// Ventanita del sótano: al ras del pasto, en la pared OESTE (el costado izquierdo mirando la casa de
// frente), detrás del garaje. Da a la sala de la caldera (x = la pared). Hasta la 17B estaba en el frente.
export const VENTANA_SOTANO = { x: -9, z: -4.8 };

// Enredadera: sube por la pared este (adentro del patio de los perros) hasta una ventana del segundo piso
export const ENREDADERA = { x: 9, z: -4, piso: 2 };

// Tablero de luz (etapa 16C): en el garaje, en la pared que da al living, al lado de la puerta.
// Con E se baja la llave y se corta la luz de toda la casa (solo de noche). x = la cara de la pared.
export const TABLERO_LUZ = { x: -9.1, z: 4.9, y: 1.45 };

// Escalerita de la antena: en la pared oeste, arriba del techo del garaje; llega al tragaluz del
// ático, que está en el faldón sur del techo (x, z = centro del tragaluz)
export const TRAGALUZ = { x: -7.9, z: 2 };

// ============================================================
//  LISTAS PLANAS (lo que usa House.js): a cada cosa le agregamos su piso
// ============================================================
const conPiso = (lista) => PISOS.flatMap((p) => (p[lista] || []).map((cosa) => ({ ...cosa, piso: p.piso })));

export const HABITACIONES = conPiso('habitaciones');
export const PUERTAS = conPiso('puertas');
export const UBICACION_MUEBLES = conPiso('muebles');
export const LUCES = conPiso('luces');
export const PAREDES = PISOS.flatMap((p) => p.paredes.map(([x1, z1, x2, z2]) => ({ piso: p.piso, x1, z1, x2, z2 })));
export const BARANDAS = PISOS.flatMap((p) => p.barandas.map(([x1, z1, x2, z2]) => ({ piso: p.piso, x1, z1, x2, z2 })));
export const PUENTES = PISOS.flatMap((p) => (p.puentes || []).map(([x1, z1, x2, z2]) => ({ piso: p.piso, x1, z1, x2, z2 })));
export const CONDUCTOS = conPiso('conductos');
export const CUADROS = conPiso('cuadros');
export const GOTAS = conPiso('gotas');

// Color de las paredes por dentro de cada piso (si la habitación no tiene su propio colorParedes)
export const COLORES_PAREDES = Object.fromEntries(PISOS.map((p) => [p.piso, p.colorParedes]));

// La abuela: su mecedora y la parte del primer piso por donde camina (ver primerPiso.js)
export const ABUELA = { ...PRIMER_PISO.abuela, piso: PRIMER_PISO.piso };

// Waypoints con su altura: pos [x, z] -> [x, y, z]
export const WAYPOINTS = PISOS.flatMap((p) =>
  p.waypoints.map(({ id, pos: [x, z] }) => ({ id, pos: [x, p.piso * ALTURA_PISO, z] })),
);
export const CONEXIONES = [...PISOS.flatMap((p) => p.conexiones), ...CONEXIONES_ESCALERAS];
