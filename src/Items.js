// Los juguetes de Tomi que los vecinos se quedaron (etapa 15A).
// Cada partida se sortean 3 juguetes distintos (de una lista de 8) y, para cada uno,
// una de sus ubicaciones posibles, sin que dos juguetes caigan en el mismo lugar.
// El jugador sabe qué juguetes tiene que buscar (están en el HUD); dónde están se lo dice Facu por el walkie.
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { ALTURA_PISO } from './HouseData.js';

export const CANTIDAD_A_RECUPERAR = 3;
const DISTANCIA_PARA_AGARRAR = 2.5; // metros
const DISTANCIA_MINIMA_ENTRE_OBJETOS = 0.8; // más cerca que esto = "el mismo lugar"

// ------------------------------------------------------------
//  Funciones que arman cada juguete con formas básicas.
//  Son un poco grandes (estilo dibujito) para que se vean de lejos.
//  La base del juguete queda en y = 0 (así se apoya sobre el mueble) y su frente mira hacia +Z.
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

function cono(radio, alto, color, x = 0, y = 0, z = 0) {
  const malla = new THREE.Mesh(new THREE.ConeGeometry(radio, alto, 12), materialToon(color));
  malla.position.set(x, y + alto / 2, z);
  return malla;
}

// Arma un grupo con las partes que se le pasen
function grupoCon(...partes) {
  const grupo = new THREE.Group();
  grupo.add(...partes);
  return grupo;
}

// Pelota de fútbol: blanca con "parches" negros (esferitas medio hundidas en la superficie)
function crearPelota() {
  const radio = 0.11;
  const pelota = grupoCon(esfera(radio, '#ffffff', 0, radio, 0));
  // Los parches van en las puntas de un icosaedro (12 puntos repartidos parejo sobre la esfera)
  const puntas = new THREE.IcosahedronGeometry(radio * 0.93).attributes.position;
  const vistos = [];
  for (let i = 0; i < puntas.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(puntas, i);
    if (vistos.some((v) => v.distanceTo(p) < 0.01)) continue; // (la geometría repite vértices)
    vistos.push(p);
    pelota.add(esfera(0.035, '#222222', p.x, radio + p.y, p.z));
  }
  return pelota;
}

// Autito a control remoto: rojo, con cabina, ruedas y antenita
function crearAutito() {
  const grupo = grupoCon(
    caja(0.16, 0.07, 0.32, '#e63946', 0, 0.04, 0), // carrocería (largo en Z: mira hacia adelante)
    caja(0.13, 0.07, 0.15, '#4cc9f0', 0, 0.11, -0.02), // cabina con vidrios
    caja(0.14, 0.015, 0.16, '#e63946', 0, 0.18, -0.02), // techo
    cilindro(0.004, 0.16, '#222222', 0.05, 0.18, -0.12), // antena
    esfera(0.012, '#ffd23f', 0.05, 0.345, -0.12),
  );
  for (const [x, z] of [[-0.085, 0.1], [0.085, 0.1], [-0.085, -0.1], [0.085, -0.1]]) {
    const rueda = cilindro(0.045, 0.03, '#222222', x, 0, z);
    rueda.rotation.z = Math.PI / 2; // acostada
    rueda.position.y = 0.045;
    grupo.add(rueda);
  }
  for (const x of [-0.05, 0.05]) grupo.add(esfera(0.014, '#fff3b0', x, 0.08, 0.16)); // faros
  return grupo;
}

// Robot de lata: cabeza cuadrada, ojos celestes, antena con bolita roja
function crearRobot() {
  const grupo = grupoCon(
    caja(0.05, 0.1, 0.06, '#6c757d', -0.045, 0, 0), // piernas
    caja(0.05, 0.1, 0.06, '#6c757d', 0.045, 0, 0),
    caja(0.17, 0.16, 0.12, '#adb5bd', 0, 0.1, 0), // cuerpo
    caja(0.08, 0.05, 0.01, '#e63946', 0, 0.17, 0.062), // panel del pecho
    caja(0.13, 0.1, 0.11, '#ced4da', 0, 0.27, 0), // cabeza
    esfera(0.018, '#4cc9f0', -0.03, 0.325, 0.056), // ojos
    esfera(0.018, '#4cc9f0', 0.03, 0.325, 0.056),
    caja(0.06, 0.012, 0.01, '#343a40', 0, 0.29, 0.056), // boca
    cilindro(0.005, 0.06, '#343a40', 0, 0.37, 0), // antena
    esfera(0.018, '#e63946', 0, 0.44, 0),
  );
  for (const lado of [-1, 1]) {
    const brazo = caja(0.035, 0.12, 0.035, '#6c757d', lado * 0.105, 0.12, 0);
    brazo.rotation.z = lado * 0.25;
    grupo.add(brazo, esfera(0.025, '#495057', lado * 0.12, 0.12, 0)); // con "pinza"
  }
  return grupo;
}

// Osito de peluche marrón con moño rojo
function crearOso() {
  const marron = '#b07d4f';
  const claro = '#e6c39a';
  const grupo = grupoCon(
    esfera(0.1, marron, 0, 0.1, 0), // panza
    esfera(0.06, claro, 0, 0.1, 0.06), // panza clarita
    esfera(0.08, marron, 0, 0.25, 0), // cabeza
    esfera(0.035, claro, 0, 0.235, 0.07), // hocico
    esfera(0.012, '#222222', 0, 0.245, 0.103), // nariz
    esfera(0.012, '#222222', -0.03, 0.275, 0.07), // ojos
    esfera(0.012, '#222222', 0.03, 0.275, 0.07),
    esfera(0.03, marron, -0.06, 0.32, 0), // orejas
    esfera(0.03, marron, 0.06, 0.32, 0),
    esfera(0.03, '#e63946', -0.025, 0.175, 0.06), // moño
    esfera(0.03, '#e63946', 0.025, 0.175, 0.06),
  );
  for (const lado of [-1, 1]) {
    grupo.add(esfera(0.04, marron, lado * 0.1, 0.13, 0.02)); // bracitos
    grupo.add(esfera(0.045, marron, lado * 0.06, 0.03, 0.06)); // patitas
  }
  return grupo;
}

// Dinosaurio verde (tiranosaurio de juguete) con pinchos naranjas
function crearDinosaurio() {
  const verde = '#52b788';
  const cuerpo = esfera(0.08, verde, 0, 0.14, 0);
  cuerpo.scale.set(1, 0.9, 1.5);
  const cabeza = esfera(0.06, verde, 0, 0.26, 0.11);
  cabeza.scale.set(1, 0.9, 1.3);
  const cola = cono(0.05, 0.2, verde, 0, 0.1, -0.2);
  cola.rotation.x = -Math.PI / 2 - 0.3;
  cola.position.set(0, 0.11, -0.2);
  const grupo = grupoCon(
    cuerpo,
    cabeza,
    cola,
    esfera(0.012, '#ffffff', -0.035, 0.29, 0.15), // ojos
    esfera(0.012, '#ffffff', 0.035, 0.29, 0.15),
    esfera(0.006, '#000000', -0.037, 0.29, 0.162),
    esfera(0.006, '#000000', 0.037, 0.29, 0.162),
    caja(0.07, 0.008, 0.02, '#1b4332', 0, 0.235, 0.18), // boca
  );
  for (const lado of [-1, 1]) {
    grupo.add(caja(0.04, 0.08, 0.05, verde, lado * 0.05, 0, 0.0)); // patas
    const bracito = caja(0.015, 0.04, 0.015, verde, lado * 0.04, 0.15, 0.1);
    bracito.rotation.x = -0.6;
    grupo.add(bracito);
  }
  for (let i = 0; i < 4; i++) grupo.add(cono(0.018, 0.04, '#f4a261', 0, 0.2 - i * 0.015, 0.05 - i * 0.06)); // pinchos
  return grupo;
}

// Avioncito de juguete amarillo con alas rojas y hélice
function crearAvion() {
  const fuselaje = cilindro(0.035, 0.34, '#ffd23f', 0, 0, 0, 0.025);
  fuselaje.rotation.x = Math.PI / 2;
  fuselaje.position.set(0, 0.07, 0);
  const helice = caja(0.14, 0.02, 0.008, '#495057', 0, 0.06, 0.18);
  const grupo = grupoCon(
    fuselaje,
    caja(0.42, 0.012, 0.09, '#e63946', 0, 0.065, 0.03), // alas
    caja(0.16, 0.01, 0.05, '#e63946', 0, 0.075, -0.15), // alas de atrás
    caja(0.01, 0.07, 0.05, '#e63946', 0, 0.08, -0.15), // timón
    esfera(0.025, '#4cc9f0', 0, 0.1, 0.05), // cabina
    esfera(0.015, '#495057', 0, 0.07, 0.175), // nariz
    helice,
    caja(0.01, 0.035, 0.01, '#343a40', -0.06, 0, 0.04), // patitas con ruedas
    caja(0.01, 0.035, 0.01, '#343a40', 0.06, 0, 0.04),
  );
  return grupo;
}

// Cohete parado sobre sus aletas: blanco, punta roja, ventanita celeste
function crearCohete() {
  const grupo = grupoCon(
    cilindro(0.05, 0.26, '#f8f9fa', 0, 0.04, 0),
    cono(0.05, 0.12, '#e63946', 0, 0.3, 0), // punta
    cilindro(0.025, 0.04, '#495057', 0, 0, 0, 0.035), // tobera
    esfera(0.025, '#4cc9f0', 0, 0.22, 0.042), // ventanita
    cilindro(0.052, 0.02, '#e63946', 0, 0.12, 0), // franja
  );
  for (let i = 0; i < 3; i++) {
    const angulo = (i / 3) * Math.PI * 2;
    const aleta = caja(0.012, 0.09, 0.06, '#e63946', Math.sin(angulo) * 0.06, 0, Math.cos(angulo) * 0.06);
    aleta.rotation.y = angulo;
    grupo.add(aleta);
  }
  return grupo;
}

// Consola portátil violeta: pantalla, cruz y dos botones
function crearConsola() {
  const pantalla = caja(0.09, 0.005, 0.07, '#9be7ff', 0, 0.03, 0);
  return grupoCon(
    caja(0.22, 0.03, 0.11, '#7b2cbf'),
    pantalla,
    caja(0.035, 0.008, 0.012, '#222222', -0.08, 0.03, 0), // cruz
    caja(0.012, 0.008, 0.035, '#222222', -0.08, 0.03, 0),
    esfera(0.011, '#e63946', 0.07, 0.033, -0.012), // botones
    esfera(0.011, '#ffd23f', 0.09, 0.033, 0.012),
  );
}

// ------------------------------------------------------------
//  LISTA DE JUGUETES
//  icono: el emoji que se ve en el HUD.
//  ubicaciones: lugares donde los vecinos lo pueden haber guardado.
//    piso = -1 (sótano), 0 (planta baja), 1, 2 o 3 (ático); y = altura sobre ese piso
//    (la superficie del mueble donde está apoyado). Afuera de la casa también es piso 0.
//    rot (opcional, en grados): gira el juguete, para que su "frente" (+Z) mire al jugador.
//  (Los lugares son los mismos que usaban los objetos de antes: ya se probó que se pueden alcanzar.)
// ------------------------------------------------------------
export const JUGUETES = [
  {
    nombre: 'la pelota de fútbol',
    icono: '⚽',
    crear: crearPelota,
    ubicaciones: [
      { lugar: 'mesa del jardín', piso: 0, x: 12.5, y: 0.78, z: -0.5 },
      { lugar: 'frente a la cucha del perro', piso: 0, x: 15.8, y: 0, z: -7.8 },
      { lugar: 'cama del hijo', piso: 1, x: -2.2, y: 0.66, z: -4.3 },
      { lugar: 'arriba de las cajas del garaje', piso: 0, x: -14.5, y: 1.1, z: 4.95 },
      { lugar: 'mesa de pool', piso: 2, x: 5.9, y: 0.84, z: 0.6 },
      { lugar: 'bañera de abajo', piso: 0, x: 4.2, y: 0.4, z: -3.3 },
    ],
  },
  {
    nombre: 'el autito a control remoto',
    icono: '🚗',
    crear: crearAutito,
    ubicaciones: [
      { lugar: 'mesa ratona', piso: 0, x: -7, y: 0.4, z: 0.3, rot: 90 },
      { lugar: 'mesa de trabajo del garaje', piso: 0, x: -12.8, y: 0.9, z: -1.35, rot: 90 },
      { lugar: 'escritorio del hijo', piso: 1, x: 0.4, y: 0.78, z: -5.6, rot: 90 },
      { lugar: 'mesa de la bodega', piso: -1, x: 7.5, y: 0.78, z: -3.6, rot: 90 },
      { lugar: 'arriba de la heladera', piso: 0, x: 2.4, y: 1.9, z: -5.45, rot: 90 },
    ],
  },
  {
    nombre: 'el robot',
    icono: '🤖',
    crear: crearRobot,
    ubicaciones: [
      { lugar: 'escritorio de la biblioteca', piso: 2, x: -8.4, y: 0.78, z: 0, rot: 90 },
      { lugar: 'caja fuerte del cuarto secreto', piso: 2, x: -8.5, y: 0.9, z: -5.55 },
      { lugar: 'arriba del baúl del ático', piso: 3, x: -6, y: 0.64, z: -3.8 },
      { lugar: 'cómoda del dormitorio', piso: 1, x: -7.8, y: 0.9, z: 5.6, rot: 180 },
      { lugar: 'arriba de un barril de la bodega', piso: -1, x: 8.4, y: 0.9, z: -3.2 },
    ],
  },
  {
    nombre: 'el oso de peluche',
    icono: '🧸',
    crear: crearOso,
    ubicaciones: [
      { lugar: 'cama del dormitorio', piso: 1, x: -7.4, y: 0.66, z: -0.5, rot: 90 },
      { lugar: 'cama del cuarto de las muñecas', piso: -1, x: 4.4, y: 0.66, z: -1.35 },
      { lugar: 'sillón viejo del ático', piso: 3, x: 4.3, y: 0.45, z: 3.6, rot: 180 },
      { lugar: 'sillón del living', piso: 0, x: -8.3, y: 0.45, z: 0.6, rot: 90 },
      { lugar: 'mesa de luz de Doña Pocha', piso: 1, x: 8.6, y: 0.5, z: 0.25, rot: -90 },
    ],
  },
  {
    nombre: 'el dinosaurio',
    icono: '🦖',
    crear: crearDinosaurio,
    ubicaciones: [
      { lugar: 'bañera de arriba', piso: 1, x: 8.5, y: 0.4, z: -4.5, rot: -90 },
      { lugar: 'mesa de la cocina', piso: 0, x: -1, y: 0.78, z: -3.8 },
      { lugar: 'lavarropas del sótano', piso: -1, x: -8.55, y: 0.85, z: 4.6, rot: 90 },
      { lugar: 'arriba del baúl del ático', piso: 3, x: 6.5, y: 0.64, z: 3.8, rot: 180 },
      { lugar: 'mueble de la entrada', piso: 0, x: -2.4, y: 0.9, z: 5.6, rot: 180 },
    ],
  },
  {
    nombre: 'el avioncito',
    icono: '✈️',
    crear: crearAvion,
    ubicaciones: [
      { lugar: 'aparador del comedor', piso: 0, x: 8.6, y: 0.9, z: -1, rot: -90 },
      { lugar: 'mesa del comedor', piso: 0, x: 7, y: 0.78, z: 0 },
      { lugar: 'cofre del cuarto secreto', piso: 2, x: -7.2, y: 0.64, z: -5.5 },
      { lugar: 'escritorio de la biblioteca', piso: 2, x: -8.4, y: 0.78, z: 0.3, rot: 90 },
      { lugar: 'arriba de las cajas del garaje', piso: 0, x: -14.5, y: 1.1, z: 4.95, rot: 90 },
    ],
  },
  {
    nombre: 'el cohete',
    icono: '🚀',
    crear: crearCohete,
    ubicaciones: [
      { lugar: 'escritorio del hijo', piso: 1, x: 0.85, y: 0.78, z: -5.6 },
      { lugar: 'arriba de la tele de Doña Pocha', piso: 1, x: 8.5, y: 1, z: -1.5 },
      { lugar: 'mesada de la cocina', piso: 0, x: -1.5, y: 0.96, z: -5.5 },
      { lugar: 'cómoda del dormitorio', piso: 1, x: -8.2, y: 0.9, z: 5.6 },
      { lugar: 'mesa de luz del dormitorio', piso: 1, x: -8.6, y: 0.5, z: -1.3 },
    ],
  },
  {
    nombre: 'la consola',
    icono: '🎮',
    crear: crearConsola,
    ubicaciones: [
      { lugar: 'mueble de la tele', piso: 0, x: -3.6, y: 0.5, z: 0.25, rot: -90 },
      { lugar: 'sillón viejo del ático', piso: 3, x: 4.3, y: 0.45, z: 3.6, rot: 180 },
      { lugar: 'mesa de luz del dormitorio', piso: 1, x: -8.6, y: 0.5, z: 1.3, rot: 90 },
      { lugar: 'escritorio de la biblioteca', piso: 2, x: -8.4, y: 0.78, z: -0.3, rot: 90 },
      { lugar: 'mesa de la cocina', piso: 0, x: -1.4, y: 0.78, z: -4 },
      { lugar: 'mochila del inodoro de arriba', piso: 1, x: 4, y: 0.85, z: -2.3 },
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
    // Los juguetes de esta partida. Cada uno: { objeto (el juguete), ubicacion, malla, alturaBase, encontrado }
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

  // Sortea los juguetes de la partida y los pone en la casa (borrando los de la partida anterior).
  //  1. Mezclamos la lista de juguetes.
  //  2. Recorremos la lista: a cada juguete le elegimos al azar una ubicación que no esté
  //     ocupada por otro ya elegido. Si todas sus ubicaciones están ocupadas, lo salteamos.
  //  3. Paramos cuando tenemos los que hacen falta.
  // "elegidos" es opcional: una lista de { objeto, ubicacion } para probar un caso en particular.
  sortearObjetivos(cantidad = CANTIDAD_A_RECUPERAR, elegidos = null) {
    for (const o of this.objetivos) this.scene.remove(o.malla);

    if (!elegidos) {
      elegidos = [];
      for (const objeto of mezclar(JUGUETES)) {
        if (elegidos.length === cantidad) break;
        const libres = objeto.ubicaciones.filter((u) => !elegidos.some((e) => mismoLugar(e.ubicacion, u)));
        if (libres.length > 0) elegidos.push({ objeto, ubicacion: alAzar(libres) });
      }
    }

    this.objetivos = elegidos.map(({ objeto, ubicacion }) => this.ponerEnLaCasa(objeto, ubicacion));

    if (import.meta.env.DEV) {
      console.log('[debug] Juguetes:', this.objetivos.map((o) => `${o.objeto.nombre} (${o.ubicacion.lugar})`).join(' · '));
    }
  }

  // Crea la malla del juguete y la ubica en su lugar
  ponerEnLaCasa(objeto, ubicacion) {
    const malla = objeto.crear();
    const { piso, x, y, z } = ubicacion;
    const alturaBase = piso * ALTURA_PISO + y;
    malla.position.set(x, alturaBase, z);
    malla.rotation.y = THREE.MathUtils.degToRad(ubicacion.rot ?? 0);
    malla.traverse((hijo) => (hijo.castShadow = true));

    // "Zona para apuntar": una esfera invisible un poco más grande que el juguete, en su centro.
    // Así no hace falta apuntar al milímetro.
    const alto = new THREE.Box3().setFromObject(malla).getSize(new THREE.Vector3()).y;
    const zona = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial());
    zona.visible = false; // no se ve, pero el raycaster la detecta igual
    zona.position.y = alto / 2;
    malla.add(zona);

    this.scene.add(malla);
    malla.updateMatrixWorld(true);
    return { objeto, ubicacion, malla, alturaBase, encontrado: false };
  }

  // El jugador agarró un juguete: lo sacamos de la casa
  agarrar(objetivo) {
    objetivo.encontrado = true;
    this.scene.remove(objetivo.malla);
  }

  // Animación: los juguetes "flotan" un poquito para que se distingan (es un dibujito).
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

  // ¿La mira del jugador apunta a alguno de los juguetes, está cerca y no hay nada en el medio?
  // Tiramos un rayo desde el centro de la cámara y vemos qué es lo PRIMERO que toca.
  // Devuelve el objetivo que se está mirando, o null.
  objetivoMirado(camera) {
    this.raycaster.setFromCamera(this.centroPantalla, camera);
    const choques = this.raycaster.intersectObjects(this.scene.children, true);
    if (choques.length === 0) return null;

    // Subimos por los "padres" de lo que tocó para ver si es parte de algún juguete
    let obj = choques[0].object;
    while (obj) {
      const objetivo = this.objetivos.find((o) => !o.encontrado && o.malla === obj);
      if (objetivo) return objetivo;
      obj = obj.parent;
    }
    return null;
  }
}
