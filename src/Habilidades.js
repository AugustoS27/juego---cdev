// Objetos de habilidad: cosas repartidas por la casa y el patio que te dan una ventaja por un rato.
//   🥕 Zanahoria:         revela dónde está UNO de los objetos que te faltan (brilla a través de las paredes)
//   🧦 Botas de lana:     tus pasos no hacen ruido (ni corriendo)
//   🥤 Bebida energética: caminás y corrés un 50% más rápido
//
// En cada partida hay una de cada una, en un lugar sorteado entre varios posibles.
// Se usan apenas las agarrás con E (no hay inventario). Mientras duran, el HUD muestra su ícono
// con una barrita que se va vaciando.
//
// Esta clase solo sabe QUÉ habilidades están activas y por cuánto tiempo más.
// Game es el que aplica el efecto (le dice al jugador que vaya más rápido o que no haga ruido).
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { ALTURA_PISO } from './HouseData.js';

const DISTANCIA_PARA_AGARRAR = 2.5; // metros (igual que los objetos del botín)
const DISTANCIA_MINIMA_A_UN_OBJETIVO = 0.8; // para no caer en el mismo lugar que un objeto del botín
export const MULTIPLICADOR_BEBIDA = 1.5; // la bebida te hace un 50% más rápido

// ------------------------------------------------------------
//  Cómo se ve cada una (formas básicas, un poco agrandadas como los objetos del botín).
//  La base queda en y = 0, así se apoya sobre el mueble.
// ------------------------------------------------------------
function malla(geometria, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometria, materialToon(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Zanahoria acostada, con su penacho de hojas
function crearZanahoria() {
  const grupo = new THREE.Group();
  const raiz = malla(new THREE.ConeGeometry(0.07, 0.32, 12), '#ff8c00', 0.04, 0.07, 0);
  raiz.rotation.z = Math.PI / 2; // la punta mira hacia +X
  grupo.add(raiz);
  for (const angulo of [-0.5, 0, 0.5]) {
    const hoja = malla(new THREE.ConeGeometry(0.025, 0.18, 6), '#52b788', -0.17, 0.09, 0);
    hoja.rotation.z = Math.PI / 2 + 0.4; // hacia atrás y un poco arriba
    hoja.rotation.y = angulo;
    grupo.add(hoja);
  }
  return grupo;
}

// Un par de botas tejidas, celestes con rayas blancas y pompón rojo
function crearBotas() {
  const grupo = new THREE.Group();
  for (const lado of [-1, 1]) {
    const x = lado * 0.08;
    grupo.add(malla(new THREE.BoxGeometry(0.11, 0.08, 0.2), '#74c0fc', x, 0.04, 0.04)); // pie
    grupo.add(malla(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 12), '#74c0fc', x, 0.15, -0.02)); // caña
    grupo.add(malla(new THREE.CylinderGeometry(0.062, 0.062, 0.03, 12), '#ffffff', x, 0.12, -0.02)); // rayas
    grupo.add(malla(new THREE.CylinderGeometry(0.062, 0.062, 0.03, 12), '#ffffff', x, 0.2, -0.02));
    grupo.add(malla(new THREE.SphereGeometry(0.035, 8, 6), '#e63946', x, 0.27, -0.02)); // pompón
  }
  return grupo;
}

// Lata de bebida energética con un rayo dibujado
function crearLata() {
  const grupo = new THREE.Group();
  grupo.add(malla(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 16), '#2b2d42', 0, 0.1, 0));
  grupo.add(malla(new THREE.CylinderGeometry(0.062, 0.062, 0.08, 16), '#52ff8a', 0, 0.1, 0)); // franja
  grupo.add(malla(new THREE.CylinderGeometry(0.05, 0.06, 0.015, 16), '#c0c0c0', 0, 0.207, 0)); // tapa
  grupo.add(malla(new THREE.BoxGeometry(0.02, 0.008, 0.035), '#adb5bd', 0, 0.217, 0.015)); // anillita
  // El rayo: dos rayitas cruzadas (de frente y de espaldas, así se ve siempre)
  for (const lado of [-1, 1]) {
    const rayo1 = malla(new THREE.BoxGeometry(0.02, 0.05, 0.005), '#ffd23f', 0.006, 0.115, lado * 0.063);
    const rayo2 = malla(new THREE.BoxGeometry(0.02, 0.05, 0.005), '#ffd23f', -0.006, 0.085, lado * 0.063);
    rayo1.rotation.z = rayo2.rotation.z = 0.5;
    grupo.add(rayo1, rayo2);
  }
  return grupo;
}

// ------------------------------------------------------------
//  LAS TRES HABILIDADES
//  color: el del aro que brilla debajo (y el de la barrita del HUD)
// ------------------------------------------------------------
export const HABILIDADES = {
  zanahoria: {
    nombre: 'Zanahoria',
    icono: '🥕',
    duracion: 20,
    color: '#ff8c00',
    crear: crearZanahoria,
    ayuda: '[E] Comer la zanahoria (te deja ver un objeto a través de las paredes)',
  },
  botas: {
    nombre: 'Botas de lana',
    icono: '🧦',
    duracion: 30,
    color: '#74c0fc',
    crear: crearBotas,
    ayuda: '[E] Ponerte las botas de lana (pasos silenciosos)',
  },
  bebida: {
    nombre: 'Bebida energética',
    icono: '🥤',
    duracion: 15,
    color: '#52ff8a',
    crear: crearLata,
    ayuda: '[E] Tomar la bebida energética (más rápido)',
  },
};

// ------------------------------------------------------------
//  LUGARES POSIBLES (casa y patio). Igual que en Items.js:
//  piso = -1 (sótano) a 3 (ático); y = altura sobre ese piso (0 = el suelo).
//  Los del patio son más arriesgados: ¡están los perros!
// ------------------------------------------------------------
export const LUGARES_HABILIDAD = [
  // Patio de los perros
  { lugar: 'mesa del jardín', piso: 0, x: 12.85, y: 0.78, z: -0.25 },
  { lugar: 'al lado de la cucha', piso: 0, x: 16.6, y: 0, z: -8.6 },
  { lugar: 'junto a la leña', piso: 0, x: 18.5, y: 0, z: -11.6 },
  { lugar: 'debajo del tendedero', piso: 0, x: 4.5, y: 0, z: -11.5 },
  // Casa
  { lugar: 'en el túnel secreto', piso: -1, x: 11, y: 0, z: -4.5 },
  { lugar: 'mesa de la bodega', piso: -1, x: 7.2, y: 0.78, z: -3.6 },
  { lugar: 'lavarropas del sótano', piso: -1, x: -8.55, y: 0.85, z: 4.6 },
  { lugar: 'mesa ratona', piso: 0, x: -6.7, y: 0.4, z: 0 },
  { lugar: 'mesa de la cocina', piso: 0, x: -1, y: 0.78, z: -3.8 },
  { lugar: 'mesa de trabajo del garaje', piso: 0, x: -12.3, y: 0.9, z: -1.35 },
  { lugar: 'cama del dormitorio', piso: 1, x: -7.4, y: 0.66, z: 0 },
  { lugar: 'escritorio del hijo', piso: 1, x: 0.4, y: 0.78, z: -5.6 },
  { lugar: 'mesa de luz de la abuela', piso: 1, x: 8.6, y: 0.5, z: 0.25 },
  { lugar: 'conducto del primer piso', piso: 1, x: 7.5, y: 0, z: -2.7 },
  { lugar: 'escritorio de la biblioteca', piso: 2, x: -8.4, y: 0.78, z: 0 },
  { lugar: 'mesa de pool', piso: 2, x: 6.8, y: 0.84, z: 0.3 },
  { lugar: 'arriba del baúl del ático', piso: 3, x: -6, y: 0.66, z: -3.8 },
];

// Elige un elemento al azar de un arreglo
function alAzar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// ¿Dos lugares son "el mismo"? (mismo piso y muy cerca)
function mismoLugar(a, b) {
  return a.piso === b.piso && Math.hypot(a.x - b.x, a.z - b.z) < DISTANCIA_MINIMA_A_UN_OBJETIVO;
}

// Material que "brilla": color plano, transparente y sin borde negro de dibujito.
// conPrioridad: se dibuja por encima de todo, aunque haya paredes en el medio (depthTest: false).
function materialBrillante(color, opacidad, conPrioridad = false) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: opacidad,
    depthWrite: false,
    depthTest: !conPrioridad,
  });
  material.userData.outlineParameters = { visible: false }; // sin borde (ver Game.js)
  return material;
}

// Hace que una malla (y sus hijos) no la detecten los rayos: es solo "un dibujo"
function sinRayos(objeto) {
  objeto.traverse((hijo) => (hijo.raycast = () => {}));
  return objeto;
}

export class Habilidades {
  constructor(scene, house) {
    this.scene = scene;
    this.house = house;
    this.enLaCasa = []; // las que todavía no agarraste: { tipo, ubicacion, malla, alturaBase }
    this.activas = new Map(); // tipo -> segundos que le quedan
    this.tiempo = 0; // para las animaciones

    // Marcador de la zanahoria (una copia brillante del objeto revelado). Lo armamos al usarla.
    this.revelado = null; // el objetivo (de Items) que se está mostrando
    this.marcador = null;
    this.materialMarcador = materialBrillante('#ff6a00', 1, true);
    this.materialHalo = materialBrillante('#fff176', 0.5, true);
    this.geometriaHalo = new THREE.SphereGeometry(0.35, 16, 12);
    this.geometriaHaz = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
    this.geometriaHaz.translate(0, 1.5, 0); // que el haz salga del objeto hacia arriba

    this.geometriaAro = new THREE.RingGeometry(0.2, 0.26, 24);
    this.geometriaAro.rotateX(-Math.PI / 2); // acostado

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = DISTANCIA_PARA_AGARRAR;
    this.centroPantalla = new THREE.Vector2(0, 0);
  }

  // Partida nueva: se apagan las habilidades y se reparten de nuevo.
  // ocupados: los lugares de los objetos del botín (para no poner una habilidad encima de uno).
  reiniciar(ocupados = []) {
    for (const h of this.enLaCasa) this.scene.remove(h.malla);
    this.activas.clear();
    this.sacarMarcador();

    const usados = [...ocupados];
    this.enLaCasa = [];
    for (const tipo of Object.keys(HABILIDADES)) {
      const libres = LUGARES_HABILIDAD.filter((l) => !usados.some((u) => mismoLugar(u, l)));
      if (libres.length === 0) continue; // (no pasa: hay muchos más lugares que cosas)
      const ubicacion = alAzar(libres);
      usados.push(ubicacion);
      this.enLaCasa.push(this.ponerEnLaCasa(tipo, ubicacion));
    }

    if (import.meta.env.DEV) {
      console.log('[debug] Habilidades:', this.enLaCasa.map((h) => `${h.tipo} (${h.ubicacion.lugar})`).join(' · '));
    }
  }

  // Arma la habilidad y la pone en su lugar, con un aro de su color que brilla debajo
  ponerEnLaCasa(tipo, ubicacion) {
    const { piso, x, y, z } = ubicacion;
    const grupo = new THREE.Group();
    const modelo = HABILIDADES[tipo].crear();
    grupo.add(modelo);

    const aro = sinRayos(new THREE.Mesh(this.geometriaAro, materialBrillante(HABILIDADES[tipo].color, 0.7)));
    aro.position.y = 0.01;
    grupo.add(aro);

    // "Zona para apuntar": esfera invisible más grande (como en Items.js)
    const zona = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial());
    zona.visible = false;
    zona.position.y = 0.12;
    grupo.add(zona);

    const alturaBase = piso * ALTURA_PISO + y;
    grupo.position.set(x, alturaBase, z);
    this.scene.add(grupo);
    grupo.updateMatrixWorld(true);
    return { tipo, ubicacion, malla: grupo, modelo, aro, alturaBase };
  }

  // ¿El jugador está mirando una habilidad (cerca y sin nada en el medio)? Devuelve cuál, o null.
  mirada(camera) {
    // Si no hay ninguna cerca, ni tiramos el rayo (es lo más caro)
    const cerca = this.enLaCasa.some((h) => h.malla.position.distanceTo(camera.position) < DISTANCIA_PARA_AGARRAR + 0.5);
    if (!cerca) return null;

    this.raycaster.setFromCamera(this.centroPantalla, camera);
    const objetos = [...this.house.obstaculos, ...this.enLaCasa.map((h) => h.malla)];
    const choques = this.raycaster.intersectObjects(objetos, true);
    if (choques.length === 0) return null;
    for (let obj = choques[0].object; obj; obj = obj.parent) {
      const habilidad = this.enLaCasa.find((h) => h.malla === obj);
      if (habilidad) return habilidad;
    }
    return null;
  }

  // La agarraste: sale de la casa y se activa (si ya estaba activa, vuelve a durar todo)
  agarrar(habilidad) {
    this.scene.remove(habilidad.malla);
    this.enLaCasa = this.enLaCasa.filter((h) => h !== habilidad);
    this.activas.set(habilidad.tipo, HABILIDADES[habilidad.tipo].duracion);
  }

  estaActiva(tipo) {
    return this.activas.has(tipo);
  }

  // Lo que muestra el HUD: [{ tipo, icono, nombre, color, restante, fraccion }]
  get paraElHUD() {
    return [...this.activas].map(([tipo, restante]) => {
      const { icono, nombre, color, duracion } = HABILIDADES[tipo];
      return { tipo, icono, nombre, color, restante, fraccion: restante / duracion };
    });
  }

  // ------------------------------------------------------------
  //  ZANAHORIA: revelar un objeto
  // ------------------------------------------------------------
  // Elige al azar uno de los objetos que te faltan y pone encima una copia naranja que se dibuja
  // por encima de todo (depthTest: false): así se ve a través de paredes y pisos.
  // Arriba le sale un haz de luz, para encontrarlo aunque esté en otro piso.
  // Devuelve el objetivo revelado (o null si ya tenés todo).
  revelar(objetivos) {
    this.sacarMarcador();
    const faltan = objetivos.filter((o) => !o.encontrado);
    if (faltan.length === 0) {
      this.activas.delete('zanahoria'); // no hay nada que mostrar: no queda activa
      return null;
    }
    this.revelado = alAzar(faltan);

    this.marcador = new THREE.Group();
    const copia = this.revelado.malla.clone(true);
    copia.position.set(0, 0, 0); // (el grupo es el que se ubica; la copia mantiene la rotación)
    copia.traverse((hijo) => {
      if (hijo.isMesh) hijo.material = this.materialMarcador;
    });
    this.halo = new THREE.Mesh(this.geometriaHalo, this.materialHalo);
    this.halo.position.y = 0.1;
    this.haz = new THREE.Mesh(this.geometriaHaz, this.materialHalo);
    this.marcador.add(copia, this.halo, this.haz);
    // Que se dibuje último (encima de todo) y que la mira no lo "toque": si no, ¡se podría agarrar
    // el objeto a través de la pared!
    this.marcador.traverse((hijo) => (hijo.renderOrder = 999));
    sinRayos(this.marcador);
    this.scene.add(this.marcador);
    return this.revelado;
  }

  sacarMarcador() {
    if (this.marcador) this.scene.remove(this.marcador);
    this.marcador = null;
    this.revelado = null;
  }

  // ------------------------------------------------------------
  //  UPDATE
  // ------------------------------------------------------------
  // Anima las que están en la casa, descuenta el tiempo de las activas y mueve el marcador.
  // camera: para que el brillo de la zanahoria no se vea diminuto de lejos.
  // Devuelve la lista de habilidades que se terminaron en este frame (para avisar).
  update(dt, camera) {
    this.tiempo += dt;

    // Las que esperan en la casa flotan, giran despacito y el aro "respira"
    this.enLaCasa.forEach((h, i) => {
      h.modelo.position.y = 0.04 + Math.sin(this.tiempo * 3 + i) * 0.025;
      h.modelo.rotation.y += dt * 1.2;
      h.aro.scale.setScalar(1 + Math.sin(this.tiempo * 4 + i) * 0.15);
    });

    // Si agarraste el objeto que mostraba la zanahoria, ya cumplió: se termina antes
    if (this.revelado?.encontrado) this.activas.set('zanahoria', 0);

    const terminadas = [];
    for (const [tipo, restante] of this.activas) {
      const nuevo = restante - dt;
      if (nuevo > 0) {
        this.activas.set(tipo, nuevo);
      } else {
        this.activas.delete(tipo);
        terminadas.push(tipo);
      }
    }
    if (terminadas.includes('zanahoria')) this.sacarMarcador();

    // El marcador sigue al objeto (que flota) y late. El halo y el haz crecen con la distancia
    // (de lejos se ven del mismo tamaño que a 4 m): si no, a 10 m serían un puntito.
    if (this.marcador) {
      this.marcador.position.copy(this.revelado.malla.position);
      this.materialHalo.opacity = 0.5 + Math.sin(this.tiempo * 6) * 0.15;
      const escala = Math.max(1, camera.position.distanceTo(this.marcador.position) / 4);
      this.halo.scale.setScalar(escala);
      this.haz.scale.set(escala, 1, escala);
    }
    return terminadas;
  }
}
