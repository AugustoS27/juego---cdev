// El exterior de la casa: cielo, jardín, cerca, techos, balcón, ventanas de afuera,
// árboles, cucha, tendedero, el cerco del patio de los perros y el barrio de fondo.
//
// Casi todo está hecho con formas básicas. Los árboles, arbustos, flores, piedras y pasto
// se arman primero con formas básicas y después se reemplazan por modelos de Kenney
// (si un modelo no carga, queda la forma básica).
//
// Lo que se puede pisar o contra lo que se choca se registra en la casa (house)
// usando house.agregarCaja(...) o agregando cajas (Box3) a house.colliders.
// El resto es solo decoración.
import * as THREE from 'three';
import { materialToon, materialConTextura } from './Materials.js';
import { textura } from './Texturas.js';
import { cargarPiezas } from './Models.js';
import { crearTechoDosAguas } from './House.js';
import { UBICACION_MUEBLES, BALCON, COLOR_EXTERIOR, TECHO, LIMITES_CASA, CERCOS_PATIO, CUCHA } from './HouseData.js';

// Ruta de un modelo de naturaleza de Kenney (en public/models/naturaleza)
const N = (nombre) => `/models/naturaleza/${nombre}.glb`;
const MODELOS_ARBOL = {
  redondo: [N('tree_default'), N('tree_oak'), N('tree_detailed')],
  pino: [N('tree_pineRoundA'), N('tree_pineRoundC'), N('tree_cone')],
};
const MODELOS_ARBUSTO = [N('plant_bushLarge'), N('plant_bushDetailed'), N('plant_bush')];
const MODELOS_FLOR = [N('flower_redA'), N('flower_yellowA'), N('flower_purpleA')];

// Elige un elemento al azar de una lista
const alAzar = (lista) => lista[Math.floor(Math.random() * lista.length)];

// Terreno de la casa (encerrado por la cerca)
const TERRENO = { x1: -24, z1: -16, x2: 24, z2: 22 };

const COLOR_TECHO = '#d1495b';
const COLOR_MARCO = '#ffffff';
const COLOR_POSTIGO = '#457b9d';
const VERDES = ['#52b788', '#40916c', '#74c69d'];
const COLORES_FLORES = ['#ff595e', '#ffca3a', '#ff99c8', '#ffffff', '#c77dff'];

// Ventanas que solo existen por fuera (para que las fachadas no queden lisas)
const VENTANAS_SOLO_AFUERA = [
  { piso: 0, x: 4, z: 6 },
  { piso: 1, x: 4, z: 6 },
  { piso: 1, x: 7.8, z: 6 },
  { piso: 0, x: 9, z: -4 },
  { piso: 1, x: 9, z: -4 },
  { piso: 1, x: 6, z: -6 },
  { piso: 0, x: -15.5, z: 2 },
  { piso: 2, x: 4, z: 6 },
  { piso: 2, x: 7.8, z: 6 },
  { piso: 2, x: 9, z: -4 },
  { piso: 2, x: -4.5, z: -6 },
  { piso: 2, x: 4.5, z: -6 },
];

export class Exterior {
  constructor(scene, house) {
    this.scene = scene;
    this.house = house;
    this.cargas = []; // promesas de los modelos que se están cargando (Game espera a que terminen)

    this.crearCielo();
    this.crearSuelo();
    this.crearCerca();
    this.crearCercoDelPatio();
    this.crearTechos();
    this.crearBalcon();
    this.crearAleroDeLaPuerta();
    this.crearVentanasExteriores();
    this.crearJardin();
    this.crearBarrio();

    // Calculamos ya la posición en el mundo de todo lo que creamos
    // (los rayos la necesitan aunque todavía no se haya dibujado ningún frame)
    this.scene.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------
  //  AYUDANTES
  // ------------------------------------------------------------
  // Una malla de decoración (no choca ni se pisa). y = altura del centro.
  // padre: dónde se agrega (la escena, o un grupo)
  decor(geometria, color, x, y, z, sombra = true, padre = this.scene) {
    const malla = new THREE.Mesh(geometria, materialToon(color));
    malla.position.set(x, y, z);
    malla.castShadow = sombra;
    malla.receiveShadow = true;
    // Lo que va directo en la escena no se mueve nunca: se puede juntar con otras mallas (ver Optimizar.js).
    // (Lo que va adentro de un grupo puede ser reemplazado por un modelo, así que no.)
    malla.userData.estatico = padre === this.scene;
    padre.add(malla);
    return malla;
  }

  // Intenta reemplazar lo que hay en "grupo" (formas básicas) por un modelo GLTF que
  // entra en la caja [x, y, z, ancho, alto, prof] (coordenadas del grupo).
  // Si falla la carga, el grupo queda como estaba.
  // sombra: false para cosas chiquitas (pasto, flores): menos sombras = el juego anda más rápido
  // Cuando termina (cargue o no), lo que quedó en el grupo se marca como estático para juntarlo.
  reemplazarPorModelo(grupo, archivo, caja, rot = 0, sombra = true) {
    const carga = cargarPiezas([{ archivo, caja, rot }], false)
      .then((modelo) => {
        if (!sombra) modelo.traverse((hijo) => (hijo.castShadow = false));
        grupo.clear();
        grupo.add(modelo);
        grupo.updateMatrixWorld(true);
      })
      .catch(() => console.warn(`No se pudo cargar ${archivo}: queda la forma básica`))
      .finally(() => grupo.traverse((m) => m.isMesh && (m.userData.estatico = true)));
    this.cargas.push(carga);
  }

  // Un grupo vacío ubicado en (x, 0, z), para armar algo adentro
  grupoEn(x, z, rotY = 0) {
    const grupo = new THREE.Group();
    grupo.position.set(x, 0, z);
    grupo.rotation.y = rotY;
    this.scene.add(grupo);
    return grupo;
  }

  // Una caja de decoración apoyada en y (su base)
  cajaDecor(x, y, z, ancho, alto, prof, color, sombra = true) {
    return this.decor(new THREE.BoxGeometry(ancho, alto, prof), color, x, y + alto / 2, z, sombra);
  }

  // Una caja invisible de colisión (desde el piso hasta "alto")
  colision(x1, z1, x2, z2, alto = 2) {
    this.house.colliders.push(new THREE.Box3(new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, alto, z2)));
  }

  // ------------------------------------------------------------
  //  CIELO Y SUELO
  // ------------------------------------------------------------
  crearCielo() {
    // Degradé vertical dibujado en un canvas: celeste arriba, casi blanco en el horizonte
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const degrade = ctx.createLinearGradient(0, 0, 0, 256);
    degrade.addColorStop(0, '#4ea8de');
    degrade.addColorStop(0.6, '#a9def9');
    degrade.addColorStop(1, '#e8f7ff');
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, 2, 256);
    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = textura;

    // Niebla suave a lo lejos: el barrio se "funde" con el cielo
    this.scene.fog = new THREE.Fog('#d6f0ff', 50, 150);

    // Nubes: grupos de esferas blancas
    const posiciones = [
      [-60, 35, -40], [10, 40, -80], [70, 32, -30], [-80, 38, 30], [40, 36, 60], [-20, 42, 90], [90, 40, 20],
    ];
    for (const [x, y, z] of posiciones) {
      for (let i = 0; i < 4; i++) {
        const radio = 4 + Math.random() * 3;
        this.decor(new THREE.SphereGeometry(radio, 12, 10), '#ffffff', x + i * 5 - 7, y + Math.random() * 2, z + Math.random() * 3, false);
      }
    }
  }

  crearSuelo() {
    const h = this.house;
    const { x1, z1, x2, z2 } = TERRENO;

    // Pasto del terreno (se pisa). Queda 2 cm más bajo que el piso de la casa.
    // Se arma con 4 rectángulos que rodean la casa: debajo de la casa está el sótano,
    // así que ahí no puede haber pasto (taparía la escalera que baja).
    const casa = { x1: LIMITES_CASA.x1 - 0.1, z1: LIMITES_CASA.z1 - 0.1, x2: LIMITES_CASA.x2 + 0.1, z2: LIMITES_CASA.z2 + 0.1 };
    const pasto = (px1, pz1, px2, pz2) => {
      const ancho = px2 - px1;
      const prof = pz2 - pz1;
      h.agregarCaja({
        x: (px1 + px2) / 2, y: -0.3, z: (pz1 + pz2) / 2, ancho, alto: 0.28, prof,
        material: materialConTextura('#7cc36b', textura('pasto', ancho / 3, prof / 3)),
        suelo: true, sombra: false,
      });
    };
    pasto(x1, z1, x2, casa.z1); // fondo
    pasto(x1, casa.z2, x2, z2); // frente
    pasto(x1, casa.z1, casa.x1, casa.z2); // costado oeste (incluye el garaje)
    pasto(casa.x2, casa.z1, x2, casa.z2); // costado este

    // Caminos (se pisan). El dibujo de baldosas se repite cada 1.5 m.
    const camino = (cx1, cz1, cx2, cz2, color, conBaldosas) => {
      const a = cx2 - cx1;
      const p = cz2 - cz1;
      const material = conBaldosas ? materialConTextura(color, textura('baldosas', a / 1.5, p / 1.5)) : null;
      h.agregarCaja({ x: (cx1 + cx2) / 2, y: -0.05, z: (cz1 + cz2) / 2, ancho: a, alto: 0.05, prof: p, color, material, suelo: true, sombra: false });
    };
    camino(-1.8, 7.9, -0.2, 22, '#e9d8a6', true); // camino de la puerta a la calle
    camino(-3.2, 6.1, 2.2, 7.9, '#d4a373', true); // porche
    camino(-14.6, 6.1, -9.9, 22, '#adb5bd', false); // entrada de autos
    camino(9.1, -2, 14.5, 4.5, '#e0c9a6', true); // patio trasero con baldosas

    // Afuera del terreno: solo decoración (vereda, calle y el pasto del barrio)
    // El pasto del barrio es un "marco" alrededor del terreno (4 planos): por debajo del terreno
    // no puede pasar, porque se vería por el hueco de la escalera del sótano.
    const barrio = (bx1, bz1, bx2, bz2) =>
      this.decor(new THREE.PlaneGeometry(bx2 - bx1, bz2 - bz1).rotateX(-Math.PI / 2), '#6fb35f', (bx1 + bx2) / 2, -0.08, (bz1 + bz2) / 2, false);
    barrio(-200, -200, 200, z1);
    barrio(-200, z2, 200, 200);
    barrio(-200, z1, x1, z2);
    barrio(x2, z1, 200, z2);
    this.cajaDecor(0, -0.06, 23.5, 200, 0.06, 3, '#d9d9d9', false); // vereda
    this.cajaDecor(0, -0.07, 29, 200, 0.06, 8, '#555b61', false); // calle
    for (let x = -96; x < 100; x += 6) this.cajaDecor(x, -0.005, 29, 3, 0.01, 0.2, '#ffffff', false); // líneas
  }

  // Cerca de madera blanca alrededor del terreno. Los palitos son muchos:
  // usamos un InstancedMesh (una sola malla dibujada muchas veces, mucho más rápido).
  crearCerca() {
    const { x1, z1, x2, z2 } = TERRENO;
    const puntos = [];
    const agregarLado = (ax, az, bx, bz, huecos = []) => {
      const largo = Math.hypot(bx - ax, bz - az);
      for (let d = 0; d <= largo; d += 0.3) {
        const x = ax + ((bx - ax) * d) / largo;
        const z = az + ((bz - az) * d) / largo;
        if (huecos.some(([h1, h2]) => x > h1 && x < h2)) continue; // tranqueras
        puntos.push([x, z, ax === bx]);
      }
    };
    agregarLado(x1, z1, x2, z1);
    agregarLado(x1, z2, x2, z2, [[-2, 0], [-14.8, -9.7]]); // frente, con huecos para las tranqueras
    agregarLado(x1, z1, x1, z2);
    agregarLado(x2, z1, x2, z2);

    const palitos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1.1, 0.05), materialToon('#fdfdfd'), puntos.length);
    const matriz = new THREE.Matrix4();
    puntos.forEach(([x, z, lateral], i) => {
      matriz.makeRotationY(lateral ? Math.PI / 2 : 0).setPosition(x, 0.55, z);
      palitos.setMatrixAt(i, matriz);
    });
    palitos.castShadow = true;
    this.scene.add(palitos);

    // Travesaños
    for (const y of [0.35, 0.85]) {
      this.cajaDecor((x1 + x2) / 2, y, z1, x2 - x1, 0.08, 0.04, '#fdfdfd');
      this.cajaDecor((x1 + x2) / 2, y, z2, x2 - x1, 0.08, 0.04, '#fdfdfd');
      this.cajaDecor(x1, y, (z1 + z2) / 2, 0.04, 0.08, z2 - z1, '#fdfdfd');
      this.cajaDecor(x2, y, (z1 + z2) / 2, 0.04, 0.08, z2 - z1, '#fdfdfd');
    }

    // Tranqueras cerradas (la del camino y la de los autos)
    this.cajaDecor(-1, 0.1, z2, 2, 0.9, 0.08, '#b08968');
    this.cajaDecor(-12.25, 0.1, z2, 5.1, 1, 0.08, '#6c757d');

    // Colisiones: el jugador no puede salir del terreno
    const g = 0.3;
    this.colision(x1, z1 - g, x2, z1 + g);
    this.colision(x1, z2 - g, x2, z2 + g);
    this.colision(x1 - g, z1, x1 + g, z2);
    this.colision(x2 - g, z1, x2 + g, z2);
  }

  // Cerco del patio de los perros (ver datos/patio.js): palitos más bajos que la cerca del terreno,
  // con una tranquera abierta en cada cerco y un cartel. Los perros no cruzan: "están entrenados".
  crearCercoDelPatio() {
    const puntos = [];
    for (const { desde: [ax, az], hasta: [bx, bz], tranquera } of CERCOS_PATIO) {
      const enX = az === bz; // ¿el cerco va a lo largo de X?
      // Todo se mide sobre el eje del cerco ("u"): de dónde a dónde va y dónde está la tranquera
      const [u1, u2] = enX ? [Math.min(ax, bx), Math.max(ax, bx)] : [Math.min(az, bz), Math.max(az, bz)];
      const [t1, t2] = [Math.min(...tranquera), Math.max(...tranquera)];
      const fijo = enX ? az : ax;
      const punto = (u) => (enX ? [u, fijo] : [fijo, u]);

      for (let u = u1; u <= u2; u += 0.3) {
        if (u > t1 && u < t2) continue;
        puntos.push([...punto(u), !enX]);
      }
      // Travesaños y colisión: un tramo de cada lado de la tranquera
      for (const [desde, hasta] of [[u1, t1], [t2, u2]]) {
        const largo = hasta - desde;
        const [cx, cz] = punto((desde + hasta) / 2);
        for (const y of [0.3, 0.7]) this.cajaDecor(cx, y, cz, enX ? largo : 0.04, 0.07, enX ? 0.04 : largo, '#e9d8a6');
        const g = 0.15;
        if (enX) this.colision(desde, fijo - g, hasta, fijo + g, 2);
        else this.colision(fijo - g, desde, fijo + g, hasta, 2);
      }
      // Postes de la tranquera y la hoja abierta (girada hacia afuera del patio, pegada al cerco)
      for (const u of [t1, t2]) {
        const [px, pz] = punto(u);
        this.cajaDecor(px, 0, pz, 0.14, 1.25, 0.14, '#b08968');
      }
      const largoHoja = t2 - t1 - 0.1;
      const [hx, hz] = punto(t2);
      if (enX) this.cajaDecor(hx + 0.07, 0.1, hz + largoHoja / 2 + 0.1, 0.06, 0.8, largoHoja, '#b08968');
      else this.cajaDecor(hx - largoHoja / 2 - 0.1, 0.1, hz + 0.07, largoHoja, 0.8, 0.06, '#b08968');
      // Cartel al lado de la tranquera, mirando hacia afuera del patio
      const [sx, sz] = punto(t1 - 0.8);
      if (enX) this.cartel(sx, sz + 0.2, ['PATIO DE', 'LOS PERROS', '(están entrenados)']);
      else this.cartel(sx - 0.2, sz, ['PATIO DE', 'LOS PERROS', '(están entrenados)'], -Math.PI / 2);
    }

    const palitos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.9, 0.04), materialToon('#e9d8a6'), puntos.length);
    const matriz = new THREE.Matrix4();
    puntos.forEach(([x, z, lateral], i) => {
      matriz.makeRotationY(lateral ? Math.PI / 2 : 0).setPosition(x, 0.45, z);
      palitos.setMatrixAt(i, matriz);
    });
    palitos.castShadow = true;
    this.scene.add(palitos);
  }

  // ------------------------------------------------------------
  //  CASA POR FUERA
  // ------------------------------------------------------------
  crearTechos() {
    // Techo a dos aguas: dos faldones de tejas y las puntas del color de la casa.
    // Bien empinado para que se vea desde el piso (si es muy chato, desde abajo queda "de canto").
    // Arranca arriba del segundo piso; adentro está el ático (su interior lo arma House.crearAtico).
    const { y, alto, mitad, x1, x2 } = TECHO;
    const inclinado = Math.hypot(mitad, alto);
    // El dibujo de tejas se repite cada 1.25 m
    const tejas = materialConTextura(COLOR_TECHO, textura('tejas', (x2 - x1) / 1.25, inclinado / 1.25));
    const puntas = materialToon(COLOR_EXTERIOR).clone();
    // Son planos de una sola cara: que hagan sombra de los dos lados (si no, el sol "atraviesa" el techo)
    tejas.shadowSide = THREE.DoubleSide;
    puntas.shadowSide = THREE.DoubleSide;
    const techo = crearTechoDosAguas(TECHO, tejas, puntas);
    techo.traverse((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    this.scene.add(techo);
    this.cajaDecor(0, y + alto - 0.1, 0, x2 - x1 + 0.2, 0.15, 0.3, '#9d0208'); // cumbrera

    // Chimenea: atraviesa el ático (ahí adentro también se choca contra ella)
    this.cajaDecor(5, y, -2.5, 0.9, 5.6, 0.9, '#b5523b');
    this.cajaDecor(5, y + 5.6, -2.5, 1.1, 0.2, 1.1, '#6c3a2b');
    this.house.colliders.push(new THREE.Box3(new THREE.Vector3(4.55, y, -2.95), new THREE.Vector3(5.45, y + 5.8, -2.05)));

    // Ventanas redondas ("ojos de buey") en las dos puntas del techo, por fuera y por dentro del ático
    for (const lado of [-1, 1]) {
      for (const x of [lado * (x2 + 0.03), lado * (x2 - 0.1)]) this.ventanaRedonda(x, y + 1.8, 0);
    }

    // Techo plano del garaje
    this.cajaDecor(-12.2, 2.98, 2, 6.9, 0.22, 8.5, '#6c757d');
  }

  // Ventana redonda mirando hacia los costados (±X): aro blanco, vidrio y una cruz
  ventanaRedonda(x, y, z) {
    const aro = this.decor(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), COLOR_MARCO, x, y, z, false);
    const vidrio = this.decor(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 24), '#9be7ff', x, y, z, false);
    const cruz1 = this.decor(new THREE.BoxGeometry(0.1, 0.9, 0.06), COLOR_MARCO, x, y, z, false);
    const cruz2 = this.decor(new THREE.BoxGeometry(0.1, 0.06, 0.9), COLOR_MARCO, x, y, z, false);
    aro.rotation.z = Math.PI / 2; // el cilindro acostado: mira hacia los costados
    vidrio.rotation.z = Math.PI / 2;
    for (const m of [cruz1, cruz2]) m.scale.x = 1.2;
  }

  crearBalcon() {
    const { x1, z1, x2, z2 } = BALCON;
    const h = this.house;
    // Piso del balcón: a la misma altura que el piso de arriba (se pisa)
    h.agregarCaja({ x: (x1 + x2) / 2, y: 2.8, z: (z1 + z2) / 2, ancho: x2 - x1, alto: 0.2, prof: z2 - z1, color: '#d9c5b2', suelo: true });
    // Columnas que lo sostienen (se choca contra ellas)
    h.agregarCaja({ x: x1 + 0.15, y: 0, z: z2 - 0.15, ancho: 0.2, alto: 2.8, prof: 0.2, color: COLOR_MARCO, solido: true });
    h.agregarCaja({ x: x2 - 0.15, y: 0, z: z2 - 0.15, ancho: 0.2, alto: 2.8, prof: 0.2, color: COLOR_MARCO, solido: true });
    // Barandas en los tres lados que dan afuera
    this.baranda(x1, z2 - 0.05, x2, z2 - 0.05, 3);
    this.baranda(x1 + 0.05, z1, x1 + 0.05, z2, 3);
    this.baranda(x2 - 0.05, z1, x2 - 0.05, z2, 3);
  }

  // Baranda: pasamanos + barrotes (decoración) + una caja invisible para chocar
  baranda(ax, az, bx, bz, y) {
    const largo = Math.hypot(bx - ax, bz - az);
    const enX = az === bz;
    this.cajaDecor((ax + bx) / 2, y + 0.95, (az + bz) / 2, enX ? largo : 0.1, 0.08, enX ? 0.1 : largo, COLOR_MARCO);
    for (let d = 0; d <= largo; d += 0.22) {
      const x = ax + ((bx - ax) * d) / largo;
      const z = az + ((bz - az) * d) / largo;
      this.cajaDecor(x, y, z, 0.04, 0.95, 0.04, COLOR_MARCO, false); // barrotes finitos: sin sombra
    }
    const g = 0.08;
    this.house.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(Math.min(ax, bx) - g, y, Math.min(az, bz) - g),
        new THREE.Vector3(Math.max(ax, bx) + g, y + 1, Math.max(az, bz) + g),
      ),
    );
  }

  // Alero sobre la puerta de calle, con dos postes
  crearAleroDeLaPuerta() {
    this.cajaDecor(-0.5, 2.55, 7, 5.6, 0.15, 1.9, COLOR_TECHO);
    for (const x of [-3, 2]) {
      this.house.agregarCaja({ x, y: 0, z: 7.7, ancho: 0.15, alto: 2.55, prof: 0.15, color: COLOR_MARCO, solido: true });
    }
  }

  // Por cada ventana de adentro que da a una pared exterior, ponemos su versión de afuera.
  // Además agregamos algunas ventanas que solo existen por fuera.
  crearVentanasExteriores() {
    // (solo los pisos con ventanas hacia afuera: el sótano está bajo tierra y el ático no tiene paredes)
    const conVentanas = (m) => m.tipo === 'ventana' && m.piso >= 0 && m.piso <= 2;
    const deAdentro = UBICACION_MUEBLES.filter(conVentanas).map(({ piso, x, z }) => {
      // Buscamos a qué pared exterior está pegada
      if (Math.abs(x) > 8.5) return { piso, x: Math.sign(x) * 9, z };
      return { piso, x, z: Math.sign(z) * 6 };
    });
    for (const v of [...deAdentro, ...VENTANAS_SOLO_AFUERA]) this.ventanaExterior(v);
  }

  // Ventana de afuera: marco, vidrio, postigos y alféizar. Mira hacia afuera de la pared.
  ventanaExterior({ piso, x, z }) {
    const grupo = new THREE.Group();
    const parte = (ancho, alto, prof, color, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, prof), materialToon(color));
      m.position.set(px, py, pz);
      m.userData.estatico = true;
      grupo.add(m); // sin sombra: están pegadas a la pared, no se notaría
    };
    parte(1.5, 1.3, 0.06, COLOR_MARCO, 0, 0.65, 0); // marco
    parte(1.3, 1.1, 0.06, '#9be7ff', 0, 0.65, 0.02); // vidrio
    parte(0.06, 1.1, 0.07, COLOR_MARCO, 0, 0.65, 0.03); // cruz del marco
    parte(1.3, 0.06, 0.07, COLOR_MARCO, 0, 0.65, 0.03);
    parte(0.4, 1.3, 0.05, COLOR_POSTIGO, -0.98, 0.65, 0); // postigos
    parte(0.4, 1.3, 0.05, COLOR_POSTIGO, 0.98, 0.65, 0);
    parte(1.7, 0.08, 0.2, COLOR_MARCO, 0, -0.04, 0.08); // alféizar

    // Orientación según la pared: el frente del grupo (+Z) tiene que mirar hacia afuera
    let rot = 0;
    let px = x;
    let pz = z;
    const separacion = 0.13; // la pared mide 0.2: la ventana queda apenas afuera
    if (z === 6) pz = z + separacion;
    else if (z === -6) { pz = z - separacion; rot = Math.PI; }
    else if (x > 0) { px = x + separacion; rot = Math.PI / 2; }
    else { px = x - separacion; rot = -Math.PI / 2; }

    grupo.position.set(px, piso * 3 + 1, pz);
    grupo.rotation.y = rot;
    this.scene.add(grupo);
  }

  // ------------------------------------------------------------
  //  JARDÍN
  // ------------------------------------------------------------
  crearJardin() {
    // Árboles (redondos y pinos)
    const arboles = [
      [-20, -12, 'redondo'], [-19, 9, 'pino'], [15, 15, 'redondo'], [20, -10, 'pino'], [7, -12, 'redondo'],
      [-6, -12.5, 'pino'], [19, 5, 'redondo'], [-21, 17, 'redondo'], [11, 19, 'pino'], [-20, 1, 'redondo'],
    ];
    for (const [x, z, tipo] of arboles) this.arbol(x, z, tipo, 0.9 + Math.random() * 0.4);

    // Arbustos contra el frente de la casa
    for (const x of [3.5, 5.5, 7.5, -8.4]) this.arbusto(x, 6.8);
    for (const [x, z] of [[-3.5, 20.5], [1.8, 20.5], [16, 21], [-18, 21]]) this.arbusto(x, z);

    // Canteros con flores al costado del camino
    for (let z = 9; z < 21; z += 0.7) {
      this.flor(-2.4, z);
      this.flor(0.4, z);
    }

    this.buzon(0.9, 21.2);
    this.cucha(CUCHA.x, CUCHA.z);
    this.tendedero(1, -11, 8, -11);
    this.mesaDeJardin(12.5, -0.5);
    this.enanito(2.9, 8.3);
    this.detallesDeNaturaleza();
  }

  // Árbol: primero con formas básicas (tronco + copa) y después se cambia por un modelo de Kenney
  arbol(x, z, tipo, escala) {
    const grupo = this.grupoEn(x, z, Math.random() * Math.PI * 2);
    this.decor(new THREE.CylinderGeometry(0.2 * escala, 0.3 * escala, 2.4 * escala, 8), '#8d5524', 0, 1.2 * escala, 0, true, grupo);
    const verde = alAzar(VERDES);
    if (tipo === 'pino') {
      for (let i = 0; i < 3; i++) {
        this.decor(new THREE.ConeGeometry((2 - i * 0.5) * escala, 2 * escala, 10), verde, 0, (2.4 + i * 1.1) * escala, 0, true, grupo);
      }
    } else {
      this.decor(new THREE.SphereGeometry(1.8 * escala, 12, 10), verde, 0, 3.4 * escala, 0, true, grupo);
      this.decor(new THREE.SphereGeometry(1.3 * escala, 12, 10), verde, 1 * escala, 3 * escala, 0.5 * escala, true, grupo);
      this.decor(new THREE.SphereGeometry(1.2 * escala, 12, 10), verde, -0.9 * escala, 3.1 * escala, -0.4 * escala, true, grupo);
    }
    this.reemplazarPorModelo(grupo, alAzar(MODELOS_ARBOL[tipo]), [0, 0, 0, 4 * escala, 6.5 * escala, 4 * escala]);
    this.colision(x - 0.35, z - 0.35, x + 0.35, z + 0.35, 3); // el tronco
  }

  arbusto(x, z) {
    const grupo = this.grupoEn(x, z, Math.random() * Math.PI * 2);
    const verde = alAzar(VERDES);
    this.decor(new THREE.SphereGeometry(0.6, 10, 8), verde, 0, 0.45, 0, true, grupo);
    this.decor(new THREE.SphereGeometry(0.45, 10, 8), verde, 0.45, 0.35, 0.1, true, grupo);
    this.reemplazarPorModelo(grupo, alAzar(MODELOS_ARBUSTO), [0.1, 0, 0, 1.5, 1.1, 1.3]);
    this.colision(x - 0.6, z - 0.5, x + 0.8, z + 0.5, 1);
  }

  flor(x, z) {
    const grupo = this.grupoEn(x, z, Math.random() * Math.PI * 2);
    this.decor(new THREE.BoxGeometry(0.03, 0.3, 0.03), '#2d6a4f', 0, 0.15, 0, false, grupo); // tallo
    this.decor(new THREE.SphereGeometry(0.09, 8, 6), alAzar(COLORES_FLORES), 0, 0.33, 0, false, grupo);
    this.reemplazarPorModelo(grupo, alAzar(MODELOS_FLOR), [0, 0, 0, 0.4, 0.45, 0.4], 0, false);
  }

  // Detalles que solo existen como modelos de Kenney (si no cargan, simplemente no aparecen):
  // matas de pasto, piedritas, hongos, un tronco cortado y leña.
  detallesDeNaturaleza() {
    // (sombra = false para lo chiquito: pasto, piedritas y hongos)
    const modelo = (archivo, x, z, caja, rot = Math.random() * 360, sombra = false) => {
      const grupo = this.grupoEn(x, z);
      this.reemplazarPorModelo(grupo, archivo, caja, rot, sombra);
      return grupo;
    };

    // Zonas donde NO ponemos pasto ni piedras (casa, garaje, caminos, porche, escalera tirada)
    const libres = (x, z) =>
      !(x > -16 && x < 10 && z > -7 && z < 8.5) && // casa, garaje y porche
      !(x > -3 && x < 1 && z > 7) && // camino con canteros
      !(x > -15 && x < -9.5 && z > 6) && // entrada de autos
      !(x > 8.5 && x < 15 && z > -2.5 && z < 5) && // patio
      !(x > -8 && x < -5.8 && z > 8.5 && z < 14.5) && // la escalera tirada en el pasto
      !(x > 11.5 && x < 14.3 && z > -6 && z < -3); // el pozo

    let puestas = 0;
    while (puestas < 70) {
      const x = -23 + Math.random() * 46;
      const z = -15 + Math.random() * 36;
      if (!libres(x, z)) continue;
      puestas++;
      if (puestas <= 55) modelo(Math.random() < 0.6 ? N('grass') : N('grass_large'), x, z, [0, 0, 0, 0.6, 0.35, 0.6]);
      else if (puestas <= 65) modelo(Math.random() < 0.5 ? N('rock_smallA') : N('rock_smallC'), x, z, [0, 0, 0, 0.5, 0.3, 0.5]);
      else modelo(N('mushroom_red'), x, z, [0, 0, 0, 0.3, 0.3, 0.3]);
    }

    // Rincón del fondo: tronco cortado y leña apilada (la leña choca)
    modelo(N('stump_round'), -15, -11, [0, 0, 0, 1, 0.6, 1], 0, true);
    modelo(N('log_stack'), 18.5, -13, [0, 0, 0, 2.4, 1.2, 1.4], 0, true);
    this.colision(17.3, -13.7, 19.7, -12.3, 1.2);

    // Felpudo en la puerta de calle
    const felpudo = this.grupoEn(-1, 6.55);
    cargarPiezas([{ archivo: '/models/muebles/rugDoormat.glb', caja: [0, 0.001, 0, 1.2, 0.03, 0.7] }])
      .then((m) => felpudo.add(m))
      .catch(() => {});
  }

  buzon(x, z) {
    this.cajaDecor(x, 0, z, 0.1, 1.1, 0.1, '#6c584c');
    this.cajaDecor(x, 1.1, z, 0.35, 0.3, 0.5, '#e63946');
    this.cajaDecor(x + 0.19, 1.25, z - 0.1, 0.03, 0.25, 0.12, '#ffd23f'); // banderita
    this.colision(x - 0.2, z - 0.3, x + 0.2, z + 0.3, 1.5);
  }

  // Cucha de los perros (volvieron de vacaciones: ver Perro.js)
  cucha(x, z) {
    this.cajaDecor(x, 0, z, 1.4, 1, 1.6, '#bc6c25');
    const techo1 = this.cajaDecor(x - 0.4, 1, z, 0.95, 0.08, 1.8, COLOR_TECHO);
    techo1.rotation.z = 0.6;
    techo1.position.y = 1.25;
    const techo2 = this.cajaDecor(x + 0.4, 1, z, 0.95, 0.08, 1.8, COLOR_TECHO);
    techo2.rotation.z = -0.6;
    techo2.position.y = 1.25;
    this.cajaDecor(x, 0, z + 0.81, 0.6, 0.7, 0.02, '#3a2c20'); // la "puertita"
    this.cartel(x + 1.3, z + 0.6, ['CUIDADO', 'CON LOS PERROS', '(volvieron de vacaciones)']);
    this.colision(x - 0.8, z - 0.9, x + 0.8, z + 0.9, 1.5);
  }

  // Cartel de madera con texto dibujado en un canvas. rot: hacia dónde mira (0 = hacia +Z)
  cartel(x, z, lineas, rot = 0) {
    this.cajaDecor(x, 0, z, 0.08, 1, 0.08, '#6c584c');
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4e1c1';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#6b2d0c';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(lineas[0], 128, 38);
    ctx.fillText(lineas[1], 128, 74);
    ctx.font = 'italic 20px sans-serif';
    ctx.fillText(lineas[2], 128, 108);
    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    const placa = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.04), [
      materialToon('#c9a27e'), materialToon('#c9a27e'), materialToon('#c9a27e'), materialToon('#c9a27e'),
      new THREE.MeshToonMaterial({ map: textura }), materialToon('#c9a27e'),
    ]);
    placa.position.set(x + Math.sin(rot) * 0.05, 1.1, z + Math.cos(rot) * 0.05);
    placa.rotation.y = rot;
    placa.castShadow = true;
    this.scene.add(placa);
  }

  tendedero(x1, z1, x2, z2) {
    for (const x of [x1, x2]) {
      this.cajaDecor(x, 0, z1, 0.1, 2, 0.1, '#adb5bd');
      this.colision(x - 0.15, z1 - 0.15, x + 0.15, z1 + 0.15, 2);
    }
    this.cajaDecor((x1 + x2) / 2, 1.9, z1, x2 - x1, 0.02, 0.02, '#ffffff', false); // soga
    // Ropa colgada
    const ropa = [['#ff595e', 0.7, 0.8], ['#1982c4', 0.5, 0.4], ['#ffca3a', 0.8, 0.9], ['#ffffff', 0.35, 0.5], ['#8ac926', 0.6, 0.7]];
    ropa.forEach(([color, ancho, alto], i) => {
      this.cajaDecor(x1 + 1 + i * 1.2, 1.9 - alto, z1, ancho, alto, 0.02, color, true);
    });
  }

  mesaDeJardin(x, z) {
    this.decor(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 16), '#ffffff', x, 0.75, z);
    this.decor(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8), '#ffffff', x, 0.37, z);
    this.decor(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), '#adb5bd', x, 1.1, z, false); // palo de la sombrilla
    this.decor(new THREE.ConeGeometry(1.5, 0.5, 12), '#ff595e', x, 2.3, z); // sombrilla
    // (Tan alta como la tapa: así se puede saltar arriba... y salvarse de los perros)
    this.colision(x - 0.75, z - 0.75, x + 0.75, z + 0.75, 0.78);
  }

  // Enanito de jardín (mira fijo a la casa... sospechoso)
  enanito(x, z) {
    this.decor(new THREE.CylinderGeometry(0.12, 0.18, 0.35, 10), '#1982c4', x, 0.18, z);
    this.decor(new THREE.SphereGeometry(0.12, 10, 8), '#ffcc99', x, 0.45, z);
    this.decor(new THREE.SphereGeometry(0.1, 10, 8), '#ffffff', x, 0.36, z + 0.07); // barba
    this.decor(new THREE.ConeGeometry(0.13, 0.3, 10), '#e63946', x, 0.66, z);
  }

  // ------------------------------------------------------------
  //  BARRIO DE FONDO (solo decoración, del otro lado de la calle)
  // ------------------------------------------------------------
  crearBarrio() {
    const casas = [
      [-30, 42, '#ffb4a2'], [-12, 44, '#b8e0d2'], [8, 42, '#ffe066'], [28, 44, '#cdb4db'],
      [-38, -2, '#a2d2ff'], [38, 6, '#ffc8dd'],
    ];
    for (const [x, z, color] of casas) {
      this.cajaDecor(x, 0, z, 10, 5, 8, color);
      const forma = new THREE.Shape();
      forma.moveTo(-4.6, 0);
      forma.lineTo(4.6, 0);
      forma.lineTo(0, 3);
      forma.lineTo(-4.6, 0);
      const geo = new THREE.ExtrudeGeometry(forma, { depth: 11, bevelEnabled: false });
      geo.rotateY(Math.PI / 2);
      geo.translate(x - 5.5, 5, z);
      const techo = new THREE.Mesh(geo, materialToon('#8d5524'));
      techo.castShadow = true;
      this.scene.add(techo);
      this.cajaDecor(x, 0, z + 4.05, 1.2, 2.2, 0.1, '#6c584c'); // puerta
    }
    // Farolas en la vereda
    for (const x of [-18, 6, 26]) {
      this.cajaDecor(x, 0, 24.2, 0.15, 4, 0.15, '#343a40');
      this.decor(new THREE.SphereGeometry(0.3, 10, 8), '#fff3b0', x, 4.1, 24.2);
    }
  }
}
