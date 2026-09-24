// Los objetos que el ladrón tiene que robar.
// Cada partida se sortean 5 objetos distintos (de una lista de 18) y, para cada uno,
// una de sus ubicaciones posibles, sin que dos objetos caigan en el mismo lugar.
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { ALTURA_PISO } from './HouseData.js';

export const CANTIDAD_A_ROBAR = 5;
const DISTANCIA_PARA_AGARRAR = 2.5; // metros
const DISTANCIA_MINIMA_ENTRE_OBJETOS = 0.8; // más cerca que esto = "el mismo lugar"

// ------------------------------------------------------------
//  Funciones que arman cada objeto con formas básicas.
//  Todos están un poco agrandados (estilo dibujito) para que se vean.
//  La base del objeto queda en y = 0 (así se apoya sobre el mueble).
// ------------------------------------------------------------
function caja(ancho, alto, prof, color, x = 0, y = 0, z = 0) {
  const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, prof), materialToon(color));
  malla.position.set(x, y + alto / 2, z); // y = base de la caja
  return malla;
}

function cilindro(radio, alto, color, x = 0, y = 0, z = 0, radioAbajo = radio) {
  const malla = new THREE.Mesh(new THREE.CylinderGeometry(radio, radioAbajo, alto, 20), materialToon(color));
  malla.position.set(x, y + alto / 2, z);
  return malla;
}

function esfera(radio, color, x = 0, y = 0, z = 0) {
  const malla = new THREE.Mesh(new THREE.SphereGeometry(radio, 16, 12), materialToon(color));
  malla.position.set(x, y, z); // (acá y es el centro)
  return malla;
}

function aro(radio, grosor, color, x = 0, y = 0, z = 0) {
  return new THREE.Mesh(new THREE.TorusGeometry(radio, grosor, 8, 20), materialToon(color)).translateX(x).translateY(y).translateZ(z);
}

// Arma un grupo con las partes que se le pasen
function grupoCon(...partes) {
  const grupo = new THREE.Group();
  grupo.add(...partes);
  return grupo;
}

function crearLlaves() {
  const argolla = aro(0.05, 0.012, '#c0c0c0', 0, 0.012, 0);
  argolla.rotation.x = Math.PI / 2; // acostada
  return grupoCon(
    argolla,
    caja(0.16, 0.012, 0.03, '#ffd23f', 0.12, 0, 0), // llave dorada
    cilindro(0.035, 0.012, '#ffd23f', 0.05, 0, 0),
    caja(0.14, 0.012, 0.03, '#c0c0c0', -0.02, 0, 0.1), // llave plateada
  );
}

function crearControlRemoto() {
  const grupo = grupoCon(caja(0.24, 0.035, 0.07, '#222222'), esfera(0.012, '#ff3b30', -0.08, 0.037, 0));
  for (let i = 0; i < 3; i++) grupo.add(caja(0.025, 0.01, 0.04, '#9e9e9e', i * 0.04, 0.035, 0));
  return grupo;
}

function crearCargador() {
  return grupoCon(
    caja(0.08, 0.06, 0.08, '#ffffff', -0.08, 0, 0), // la "cajita"
    caja(0.012, 0.03, 0.005, '#c0c0c0', -0.095, 0.06, 0), // patitas del enchufe
    caja(0.012, 0.03, 0.005, '#c0c0c0', -0.065, 0.06, 0),
    caja(0.18, 0.012, 0.012, '#ffffff', 0.05, 0, 0), // cable
    caja(0.04, 0.02, 0.025, '#9e9e9e', 0.16, 0, 0), // puntita USB
  );
}

function crearSarten() {
  return grupoCon(
    cilindro(0.17, 0.05, '#333333'),
    cilindro(0.15, 0.052, '#555555', 0, 0.001, 0), // fondo un poco más claro
    caja(0.25, 0.03, 0.04, '#8d5524', 0.28, 0.01, 0), // mango
  );
}

function crearAbrelatas() {
  return grupoCon(
    caja(0.18, 0.02, 0.03, '#e4572e', -0.06, 0, -0.02), // mangos rojos
    caja(0.18, 0.02, 0.03, '#e4572e', -0.06, 0, 0.02),
    cilindro(0.035, 0.03, '#c0c0c0', 0.06, 0, 0), // cabeza metálica
    caja(0.04, 0.04, 0.012, '#9e9e9e', 0.1, 0.005, 0), // la "llavecita" para girar
  );
}

function crearPatito() {
  const cuerpo = esfera(0.08, '#ffd23f', 0, 0.06, 0);
  cuerpo.scale.set(1.2, 0.8, 1);
  return grupoCon(
    cuerpo,
    esfera(0.05, '#ffd23f', 0.06, 0.14, 0), // cabeza
    caja(0.04, 0.015, 0.03, '#ff8c00', 0.115, 0.13, 0), // pico
    esfera(0.008, '#000000', 0.09, 0.16, 0.025), // ojitos
    esfera(0.008, '#000000', 0.09, 0.16, -0.025),
  );
}

// Dentadura postiza adentro de un vaso de agua
function crearDentadura() {
  return grupoCon(
    cilindro(0.07, 0.16, '#bde0fe', 0, 0, 0, 0.06), // el vaso (más ancho arriba)
    cilindro(0.062, 0.1, '#74c0fc', 0, 0.01, 0, 0.055), // el agua
    caja(0.1, 0.035, 0.06, '#ff8fab', 0, 0.13, 0), // encías
    caja(0.09, 0.035, 0.045, '#ffffff', 0, 0.16, 0.005), // dientes que asoman por arriba del vaso
  );
}

// Reloj de bolsillo de oro con su cadenita
function crearReloj() {
  const reloj = cilindro(0.07, 0.025, '#e9c46a');
  const cadena = aro(0.06, 0.008, '#e9c46a', 0.12, 0.01, 0);
  cadena.rotation.x = Math.PI / 2;
  return grupoCon(
    reloj,
    cilindro(0.058, 0.027, '#fffaf0'), // la cara blanca
    caja(0.004, 0.004, 0.045, '#222222', 0, 0.027, -0.018), // agujas
    caja(0.03, 0.004, 0.004, '#222222', 0.012, 0.027, 0),
    cilindro(0.012, 0.02, '#e9c46a', 0, 0.005, -0.075), // la "coronita"
    cadena,
  );
}

function crearAnteojos() {
  const lenteIzq = aro(0.045, 0.01, '#222222', -0.055, 0.05, 0);
  const lenteDer = aro(0.045, 0.01, '#222222', 0.055, 0.05, 0);
  return grupoCon(
    lenteIzq,
    lenteDer,
    caja(0.03, 0.01, 0.01, '#222222', 0, 0.06, 0), // puente
    caja(0.01, 0.01, 0.15, '#222222', -0.1, 0.05, -0.075), // patillas
    caja(0.01, 0.01, 0.15, '#222222', 0.1, 0.05, -0.075),
  );
}

function crearBilletera() {
  return grupoCon(
    caja(0.2, 0.04, 0.12, '#6f4518'),
    caja(0.15, 0.01, 0.08, '#52b788', 0.04, 0.04, 0), // un billete que asoma
    caja(0.01, 0.041, 0.12, '#3e2723', -0.03, 0, 0), // costura
  );
}

// Alcancía chanchito
function crearChanchito() {
  const cuerpo = esfera(0.11, '#ffafcc', 0, 0.13, 0);
  cuerpo.scale.set(1.3, 1, 1);
  const hocico = cilindro(0.04, 0.04, '#ff8fab', 0.15, 0.09, 0);
  hocico.rotation.z = Math.PI / 2;
  const grupo = grupoCon(
    cuerpo,
    hocico,
    caja(0.04, 0.05, 0.02, '#ff8fab', 0.07, 0.21, 0.05), // orejas
    caja(0.04, 0.05, 0.02, '#ff8fab', 0.07, 0.21, -0.05),
    caja(0.06, 0.005, 0.012, '#333333', -0.02, 0.24, 0), // la ranura de las monedas
    esfera(0.01, '#000000', 0.12, 0.17, 0.04), // ojitos
    esfera(0.01, '#000000', 0.12, 0.17, -0.04),
  );
  for (const [x, z] of [[0.07, 0.05], [0.07, -0.05], [-0.07, 0.05], [-0.07, -0.05]]) {
    grupo.add(cilindro(0.02, 0.04, '#ff8fab', x, 0, z)); // patitas
  }
  return grupo;
}

function crearTrofeo() {
  const asaIzq = aro(0.04, 0.01, '#ffd23f', -0.08, 0.22, 0);
  const asaDer = aro(0.04, 0.01, '#ffd23f', 0.08, 0.22, 0);
  return grupoCon(
    caja(0.14, 0.05, 0.14, '#6d4c41'), // base de madera
    cilindro(0.015, 0.08, '#ffd23f', 0, 0.05, 0), // palito
    cilindro(0.08, 0.14, '#ffd23f', 0, 0.13, 0, 0.03), // la copa
    asaIzq,
    asaDer,
  );
}

// Mate con bombilla
function crearMate() {
  const bombilla = cilindro(0.006, 0.2, '#c0c0c0', 0.02, 0.08, 0);
  bombilla.rotation.z = -0.25;
  return grupoCon(
    esfera(0.07, '#8d5524', 0, 0.07, 0),
    cilindro(0.05, 0.03, '#6d4c41', 0, 0.11, 0), // la boca, con virola
    cilindro(0.045, 0.005, '#2d6a4f', 0, 0.14, 0), // la yerba
    bombilla,
  );
}

// Peluca con rulos
function crearPeluca() {
  const grupo = new THREE.Group();
  const casco = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), materialToon('#e76f51'));
  grupo.add(casco);
  for (let i = 0; i < 10; i++) {
    const angulo = (i / 10) * Math.PI * 2;
    grupo.add(esfera(0.04, '#e76f51', Math.cos(angulo) * 0.13, 0.03, Math.sin(angulo) * 0.13)); // rulos
  }
  return grupo;
}

// Teléfono antiguo de disco
function crearTelefono() {
  const auricular = caja(0.24, 0.035, 0.05, '#9d0208', 0, 0.12, 0);
  const disco = cilindro(0.055, 0.01, '#fffaf0', 0, 0.1, 0.065);
  disco.rotation.x = -Math.PI / 2.6;
  return grupoCon(
    caja(0.2, 0.1, 0.16, '#c1121f'), // cuerpo
    caja(0.04, 0.06, 0.05, '#9d0208', -0.1, 0.1, 0), // extremos del auricular
    caja(0.04, 0.06, 0.05, '#9d0208', 0.1, 0.1, 0),
    auricular,
    disco,
    caja(0.03, 0.03, 0.2, '#222222', -0.14, 0, 0), // cable enrulado (bueno, derecho)
  );
}

// Gnomo de porcelana
function crearGnomo() {
  return grupoCon(
    cilindro(0.07, 0.14, '#1982c4', 0, 0, 0, 0.1), // cuerpo
    esfera(0.065, '#ffcc99', 0, 0.19, 0), // cabeza
    esfera(0.055, '#ffffff', 0, 0.15, 0.04), // barba
    new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 12), materialToon('#e63946')).translateY(0.3), // gorro
  );
}

function crearPava() {
  const pico = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.12, 10), materialToon('#adb5bd'));
  pico.position.set(0.12, 0.1, 0);
  pico.rotation.z = -0.9;
  const manija = aro(0.06, 0.012, '#222222', 0, 0.2, 0);
  return grupoCon(
    cilindro(0.08, 0.16, '#adb5bd', 0, 0, 0, 0.1),
    cilindro(0.025, 0.02, '#222222', 0, 0.16, 0), // tapa
    pico,
    manija,
  );
}

function crearCepillo() {
  return grupoCon(
    caja(0.2, 0.02, 0.025, '#4cc9f0'), // mango
    caja(0.05, 0.03, 0.022, '#ffffff', 0.08, 0.02, 0), // cerdas
    caja(0.05, 0.012, 0.022, '#90e0ef', 0.08, 0.05, 0), // pasta de dientes
  );
}

// ------------------------------------------------------------
//  LISTA DE OBJETOS
//  pista: el acertijo que ve el jugador.
//  ubicaciones: lugares lógicos donde puede aparecer.
//    piso = -1 (sótano), 0 (planta baja), 1, 2 o 3 (ático); y = altura sobre ese piso
//    (la superficie del mueble donde está apoyado). Afuera de la casa también es piso 0.
//    rot (opcional, en grados): gira el objeto, para que su "frente" (+Z) mire al jugador.
// ------------------------------------------------------------
export const OBJETOS = [
  {
    nombre: 'las llaves',
    pista: 'Tintineamos, abrimos la puerta y siempre desaparecemos cuando estás apurado.',
    crear: crearLlaves,
    ubicaciones: [
      { lugar: 'mueble de la entrada', piso: 0, x: -2.4, y: 0.9, z: 5.6 },
      { lugar: 'aparador del comedor', piso: 0, x: 8.6, y: 0.9, z: -0.6 },
      { lugar: 'cómoda del dormitorio', piso: 1, x: -8.2, y: 0.9, z: 5.6 },
      { lugar: 'mesa de luz', piso: 1, x: -8.6, y: 0.5, z: 1.3 },
      { lugar: 'lavarropas del sótano', piso: -1, x: -8.55, y: 0.85, z: 4.6 },
    ],
  },
  {
    nombre: 'el control remoto',
    pista: 'Sin mí nadie cambia de canal. Me suelen esconder entre los almohadones.',
    crear: crearControlRemoto,
    ubicaciones: [
      { lugar: 'sillón del living', piso: 0, x: -8.3, y: 0.45, z: 0.6 },
      { lugar: 'mesa ratona', piso: 0, x: -7, y: 0.4, z: 0.3 },
      { lugar: 'mueble de la tele', piso: 0, x: -3.6, y: 0.5, z: 0.25 },
      { lugar: 'cama del dormitorio', piso: 1, x: -7.4, y: 0.66, z: 0.4 },
      { lugar: 'arriba de la tele de la abuela', piso: 1, x: 8.5, y: 1, z: -1.5 },
      { lugar: 'sillón viejo del ático', piso: 3, x: 4.3, y: 0.45, z: 3.6 },
    ],
  },
  {
    nombre: 'el cargador',
    pista: 'Le doy de comer a tu celular, pero solo si estoy enchufado.',
    crear: crearCargador,
    ubicaciones: [
      { lugar: 'escritorio de la biblioteca', piso: 2, x: -8.4, y: 0.78, z: 0.3 },
      { lugar: 'escritorio del hijo', piso: 1, x: 0.4, y: 0.78, z: -5.6 },
      { lugar: 'mesa de luz', piso: 1, x: -8.6, y: 0.5, z: -1.3 },
      { lugar: 'mesada de la cocina', piso: 0, x: 1, y: 0.96, z: -5.5 },
    ],
  },
  {
    nombre: 'la sartén',
    pista: 'Soy redonda, tengo mango y los huevos fritos me aman.',
    crear: crearSarten,
    ubicaciones: [
      { lugar: 'mesada de la cocina', piso: 0, x: -1.5, y: 0.96, z: -5.5 },
      { lugar: 'mesa de la cocina', piso: 0, x: -1, y: 0.78, z: -3.8 },
      { lugar: 'mesada, al lado de la heladera', piso: 0, x: 0.9, y: 0.96, z: -5.5 },
      { lugar: 'mesa del comedor', piso: 0, x: 7, y: 0.78, z: 0.2 },
      { lugar: 'mesa de la bodega', piso: -1, x: 6.9, y: 0.78, z: -3.6 },
    ],
  },
  {
    nombre: 'el abrelatas',
    pista: 'Tengo dientes pero no como: giro y giro hasta que la lata se rinde.',
    crear: crearAbrelatas,
    ubicaciones: [
      { lugar: 'mesada de la cocina', piso: 0, x: 0.3, y: 0.96, z: -5.45 },
      { lugar: 'mesa de la cocina', piso: 0, x: -0.6, y: 0.78, z: -3.6 },
      { lugar: 'aparador del comedor', piso: 0, x: 8.6, y: 0.9, z: -1.4 },
      { lugar: 'mesa de trabajo del garaje', piso: 0, x: -11.8, y: 0.9, z: -1.35 },
    ],
  },
  {
    nombre: 'el patito de goma',
    pista: 'Soy amarillo, floto y me encanta la hora del baño.',
    crear: crearPatito,
    ubicaciones: [
      { lugar: 'bañera de abajo', piso: 0, x: 4.2, y: 0.4, z: -3.3 },
      { lugar: 'bañera de arriba', piso: 1, x: 8.5, y: 0.4, z: -4.5 },
      { lugar: 'lavamanos de abajo', piso: 0, x: 6, y: 0.85, z: -5.65 },
      { lugar: 'lavamanos de arriba', piso: 1, x: 5.5, y: 0.85, z: -5.65 },
    ],
  },
  {
    nombre: 'la dentadura postiza',
    pista: 'Me paso la noche sonriendo adentro de un vaso de agua.',
    crear: crearDentadura,
    ubicaciones: [
      { lugar: 'mesa de luz', piso: 1, x: -8.6, y: 0.5, z: -1.3 },
      { lugar: 'mochila del inodoro de abajo', piso: 0, x: 8.5, y: 0.85, z: -5.7 },
      { lugar: 'lavamanos de arriba', piso: 1, x: 5.35, y: 0.85, z: -5.6 },
      { lugar: 'mochila del inodoro de arriba', piso: 1, x: 4, y: 0.85, z: -2.3 },
    ],
  },
  {
    nombre: 'el reloj de oro',
    pista: 'Tengo agujas pero no coso, y el abuelo me dejó de herencia.',
    crear: crearReloj,
    ubicaciones: [
      { lugar: 'escritorio de la biblioteca', piso: 2, x: -8.4, y: 0.78, z: -0.3 },
      { lugar: 'arriba del baúl del ático', piso: 3, x: -6, y: 0.64, z: -3.8 },
      { lugar: 'caja fuerte del cuarto secreto', piso: 2, x: -8.5, y: 0.9, z: -5.55 },
      { lugar: 'cómoda del dormitorio', piso: 1, x: -7.6, y: 0.9, z: 5.6 },
      { lugar: 'aparador del comedor', piso: 0, x: 8.6, y: 0.9, z: -1.5 },
      { lugar: 'mesa de luz', piso: 1, x: -8.6, y: 0.5, z: 1.3 },
    ],
  },
  {
    nombre: 'los anteojos',
    pista: 'Sin mí, el dueño no ve ni el diario... ni a vos.',
    crear: crearAnteojos,
    ubicaciones: [
      { lugar: 'mesa ratona', piso: 0, x: -7, y: 0.4, z: -0.3 },
      { lugar: 'mesa de luz', piso: 1, x: -8.6, y: 0.5, z: -1.3 },
      { lugar: 'escritorio de la biblioteca', piso: 2, x: -8.4, y: 0.78, z: 0.35 },
      { lugar: 'mesa de luz de la abuela', piso: 1, x: 8.6, y: 0.5, z: 0.25 },
      { lugar: 'mesa del comedor', piso: 0, x: 7.5, y: 0.78, z: -0.2 },
    ],
  },
  {
    nombre: 'la billetera',
    pista: 'Gordita de papelitos, flaquita de billetes.',
    crear: crearBilletera,
    ubicaciones: [
      { lugar: 'mueble de la entrada', piso: 0, x: -2.1, y: 0.9, z: 5.65 },
      { lugar: 'arriba de la heladera', piso: 0, x: 2.4, y: 1.9, z: -5.45 },
      { lugar: 'cómoda del dormitorio', piso: 1, x: -8.4, y: 0.9, z: 5.6 },
      { lugar: 'mesa de la cocina', piso: 0, x: -1.4, y: 0.78, z: -4 },
      { lugar: 'arriba de un barril de la bodega', piso: -1, x: 8.4, y: 0.9, z: -3.2 },
      { lugar: 'cofre del cuarto secreto', piso: 2, x: -7.2, y: 0.64, z: -5.5 },
    ],
  },
  {
    nombre: 'la alcancía chanchito',
    pista: 'Como monedas todo el día y nunca me lleno... bueno, casi.',
    crear: crearChanchito,
    ubicaciones: [
      { lugar: 'escritorio del hijo', piso: 1, x: 0.85, y: 0.78, z: -5.6 },
      { lugar: 'cama del hijo', piso: 1, x: -2.2, y: 0.66, z: -4.3 },
      { lugar: 'cómoda del dormitorio', piso: 1, x: -7.8, y: 0.9, z: 5.6 },
      { lugar: 'mesa de pool', piso: 2, x: 5.9, y: 0.84, z: 0.6 },
    ],
  },
  {
    nombre: 'el trofeo',
    pista: 'Brillo en un estante por algo que pasó hace muuucho tiempo.',
    crear: crearTrofeo,
    ubicaciones: [
      { lugar: 'escritorio de la biblioteca', piso: 2, x: -8.4, y: 0.78, z: 0 },
      { lugar: 'mesa de trabajo del garaje', piso: 0, x: -12.8, y: 0.9, z: -1.35 },
      { lugar: 'caja fuerte del cuarto secreto', piso: 2, x: -8.5, y: 0.9, z: -5.55 },
      { lugar: 'arriba de las cajas del garaje', piso: 0, x: -14.5, y: 1.1, z: 4.95 },
      { lugar: 'escritorio del hijo', piso: 1, x: 0, y: 0.78, z: -5.6 },
    ],
  },
  {
    nombre: 'el mate',
    pista: 'Paso de mano en mano y siempre vuelvo vacío.',
    crear: crearMate,
    ubicaciones: [
      { lugar: 'mesa de la cocina', piso: 0, x: -1.4, y: 0.78, z: -3.6 },
      { lugar: 'mesa del comedor', piso: 0, x: 6.6, y: 0.78, z: 0.2 },
      { lugar: 'mesa del jardín', piso: 0, x: 12.5, y: 0.78, z: -0.5 },
      { lugar: 'mesa ratona', piso: 0, x: -7, y: 0.4, z: 0.3 },
      { lugar: 'mesa de la bodega', piso: -1, x: 7.5, y: 0.78, z: -3.6 },
    ],
  },
  {
    nombre: 'la peluca',
    pista: 'Le presto pelo al que ya no tiene.',
    crear: crearPeluca,
    ubicaciones: [
      { lugar: 'cama del dormitorio', piso: 1, x: -7.4, y: 0.66, z: -0.5 },
      { lugar: 'cómoda del dormitorio', piso: 1, x: -7.6, y: 0.9, z: 5.6 },
      { lugar: 'lavamanos de arriba', piso: 1, x: 5.5, y: 0.85, z: -5.6 },
      { lugar: 'lavarropas', piso: 0, x: 8.55, y: 0.85, z: -3.6 },
      { lugar: 'cama del cuarto de las muñecas', piso: -1, x: 4.4, y: 0.66, z: -1.35 },
    ],
  },
  {
    nombre: 'el teléfono antiguo',
    pista: 'Tengo una rueda con números y un cable enrulado.',
    crear: crearTelefono,
    ubicaciones: [
      { lugar: 'mueble de la entrada', piso: 0, x: -2.4, y: 0.9, z: 5.65, rot: 180 },
      { lugar: 'escritorio de la biblioteca', piso: 2, x: -8.4, y: 0.78, z: 0, rot: 90 },
      { lugar: 'aparador del comedor', piso: 0, x: 8.6, y: 0.9, z: -1, rot: -90 },
      { lugar: 'mesa de luz', piso: 1, x: -8.6, y: 0.5, z: 1.3, rot: 90 },
    ],
  },
  {
    nombre: 'el gnomo de porcelana',
    pista: 'Soy chiquito, barbudo y vigilo en silencio.',
    crear: crearGnomo,
    ubicaciones: [
      { lugar: 'frente a la cucha del perro', piso: 0, x: 15.8, y: 0, z: -7.8 },
      { lugar: 'arriba de las cajas del garaje', piso: 0, x: -14.5, y: 1.1, z: 4.95 },
      { lugar: 'aparador del comedor', piso: 0, x: 8.6, y: 0.9, z: -1.4 },
      { lugar: 'mesa del jardín', piso: 0, x: 12.5, y: 0.78, z: -0.5 },
      { lugar: 'arriba del baúl del ático', piso: 3, x: 6.5, y: 0.64, z: 3.8 },
    ],
  },
  {
    nombre: 'la pava',
    pista: 'Silbo cuando me calientan.',
    crear: crearPava,
    ubicaciones: [
      { lugar: 'hornallas de la cocina', piso: 0, x: 0.5, y: 0.96, z: -5.5 },
      { lugar: 'mesa de la cocina', piso: 0, x: -0.6, y: 0.78, z: -4 },
      { lugar: 'mesa del comedor', piso: 0, x: 7, y: 0.78, z: 0 },
      { lugar: 'mesada de la cocina', piso: 0, x: -1.1, y: 0.96, z: -5.5 },
    ],
  },
  {
    nombre: 'el cepillo de dientes',
    pista: 'Trabajo de mañana y de noche, siempre metido en tu boca.',
    crear: crearCepillo,
    ubicaciones: [
      { lugar: 'lavamanos de abajo', piso: 0, x: 6.15, y: 0.85, z: -5.6 },
      { lugar: 'lavamanos de arriba', piso: 1, x: 5.6, y: 0.85, z: -5.6 },
      { lugar: 'mochila del inodoro de arriba', piso: 1, x: 4, y: 0.85, z: -2.3 },
      { lugar: 'mochila del inodoro de abajo', piso: 0, x: 8.5, y: 0.85, z: -5.7 },
    ],
  },
];

// Elige un elemento al azar de un arreglo
function alAzar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Devuelve una copia del arreglo mezclada (algoritmo de Fisher-Yates)
function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ¿Dos ubicaciones son "el mismo lugar"? (mismo piso y muy cerca)
function mismoLugar(a, b) {
  return a.piso === b.piso && Math.hypot(a.x - b.x, a.z - b.z) < DISTANCIA_MINIMA_ENTRE_OBJETOS;
}

export class Items {
  constructor(scene) {
    this.scene = scene;
    // Los objetos de esta partida. Cada uno: { objeto, ubicacion, malla, alturaBase, encontrado }
    this.objetivos = [];
    this.tiempo = 0; // para la animación

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = DISTANCIA_PARA_AGARRAR;
    this.centroPantalla = new THREE.Vector2(0, 0);
  }

  get cantidadEncontrados() {
    return this.objetivos.filter((o) => o.encontrado).length;
  }

  get todosEncontrados() {
    return this.objetivos.length > 0 && this.cantidadEncontrados === this.objetivos.length;
  }

  // Sortea los objetos de la partida y los pone en la casa (borrando los de la partida anterior).
  //  1. Mezclamos la lista de objetos.
  //  2. Recorremos la lista: a cada objeto le elegimos al azar una ubicación que no esté
  //     ocupada por otro objetivo ya elegido. Si todas sus ubicaciones están ocupadas, lo salteamos.
  //  3. Paramos cuando tenemos los que hacen falta.
  // "elegidos" es opcional: una lista de { objeto, ubicacion } para probar un caso en particular.
  sortearObjetivos(cantidad = CANTIDAD_A_ROBAR, elegidos = null) {
    for (const o of this.objetivos) this.scene.remove(o.malla);

    if (!elegidos) {
      elegidos = [];
      for (const objeto of mezclar(OBJETOS)) {
        if (elegidos.length === cantidad) break;
        const libres = objeto.ubicaciones.filter((u) => !elegidos.some((e) => mismoLugar(e.ubicacion, u)));
        if (libres.length > 0) elegidos.push({ objeto, ubicacion: alAzar(libres) });
      }
    }

    this.objetivos = elegidos.map(({ objeto, ubicacion }) => this.ponerEnLaCasa(objeto, ubicacion));

    if (import.meta.env.DEV) {
      console.log('[debug] Objetivos:', this.objetivos.map((o) => `${o.objeto.nombre} (${o.ubicacion.lugar})`).join(' · '));
    }
  }

  // Crea la malla del objeto y la ubica en su lugar
  ponerEnLaCasa(objeto, ubicacion) {
    const malla = objeto.crear();
    const { piso, x, y, z } = ubicacion;
    const alturaBase = piso * ALTURA_PISO + y;
    malla.position.set(x, alturaBase, z);
    malla.rotation.y = THREE.MathUtils.degToRad(ubicacion.rot ?? 0);
    malla.traverse((hijo) => (hijo.castShadow = true));

    // "Zona para apuntar": una esfera invisible más grande que el objeto.
    // Así no hace falta apuntar al milímetro para agarrar algo chiquito.
    const zona = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial());
    zona.visible = false; // no se ve, pero el raycaster la detecta igual
    zona.position.y = 0.1;
    malla.add(zona);

    this.scene.add(malla);
    malla.updateMatrixWorld(true);
    return { objeto, ubicacion, malla, alturaBase, encontrado: false };
  }

  // El jugador agarró un objeto: lo sacamos de la casa
  agarrar(objetivo) {
    objetivo.encontrado = true;
    this.scene.remove(objetivo.malla);
  }

  // Animación: los objetos "flotan" un poquito para que se distingan (es un dibujito).
  // No los hacemos girar porque podrían atravesar paredes o muebles cercanos.
  update(dt) {
    this.tiempo += dt;
    this.objetivos.forEach((o, i) => {
      if (o.encontrado) return;
      // (cada uno con un desfase distinto, así no suben y bajan todos a la vez)
      o.malla.position.y = o.alturaBase + 0.03 + Math.sin(this.tiempo * 3 + i) * 0.02;
      // Recalculamos su posición en el mundo ya mismo: el raycaster la necesita actualizada
      o.malla.updateMatrixWorld(true);
    });
  }

  // ¿La mira del jugador apunta a alguno de los objetos, está cerca y no hay nada en el medio?
  // Tiramos un rayo desde el centro de la cámara y vemos qué es lo PRIMERO que toca.
  // Devuelve el objetivo que se está mirando, o null.
  objetivoMirado(camera) {
    this.raycaster.setFromCamera(this.centroPantalla, camera);
    const choques = this.raycaster.intersectObjects(this.scene.children, true);
    if (choques.length === 0) return null;

    // Subimos por los "padres" de lo que tocó para ver si es parte de algún objeto
    let obj = choques[0].object;
    while (obj) {
      const objetivo = this.objetivos.find((o) => !o.encontrado && o.malla === obj);
      if (objetivo) return objetivo;
      obj = obj.parent;
    }
    return null;
  }
}
