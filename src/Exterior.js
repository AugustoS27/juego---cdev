// El exterior de la casa: cielo, jardín, cerca, techos, balcón, ventanas de afuera,
// árboles, cucha, tendedero, el cerco del patio de los perros y el barrio de fondo.
//
// Casi todo está hecho con formas básicas. Los árboles, flores, piedras y pasto se arman
// primero con formas básicas y después se reemplazan por modelos de Kenney (si un modelo no
// carga, queda la forma básica). Los arbustos son siempre esferas: tienen que ser redondos y
// tupidos para poder esconderse adentro (los de Kenney son plantas de hojas finitas).
//
// Lo que se puede pisar o contra lo que se choca se registra en la casa (house)
// usando house.agregarCaja(...) o agregando cajas (Box3) a house.colliders.
// El resto es solo decoración.
import * as THREE from 'three';
import { materialToon, materialConTextura } from './Materials.js';
import { textura } from './Texturas.js';
import { cargarPiezas } from './Models.js';
import { TURNOS } from './Turno.js';
import { crearTechoDosAguas } from './House.js';
import { UBICACION_MUEBLES, BALCON, COLOR_EXTERIOR, TECHO, LIMITES_CASA, CERCOS_PATIO, CUCHA, TECHO_GARAJE, TRASTOS } from './HouseData.js';

// Ruta de un modelo de naturaleza de Kenney (en public/models/naturaleza)
const N = (nombre) => `/models/naturaleza/${nombre}.glb`;
const MODELOS_ARBOL = {
  redondo: [N('tree_default'), N('tree_oak'), N('tree_detailed')],
  pino: [N('tree_pineRoundA'), N('tree_pineRoundC'), N('tree_cone')],
};
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
  { piso: 1, x: 6, z: -6 },
  { piso: 0, x: -15.5, z: 2 },
  { piso: 2, x: 4, z: 6 },
  { piso: 2, x: 7.8, z: 6 },
  { piso: 2, x: -4.5, z: -6 },
  { piso: 2, x: 4.5, z: -6 },
];

export class Exterior {
  constructor(scene, house) {
    this.scene = scene;
    this.house = house;
    this.cargas = []; // promesas de los modelos que se están cargando (Game espera a que terminen)
    // Materiales que cambian con el turno (ver ponerTurno): el vidrio de las ventanas de la casa, las de
    // las casas del barrio y las bombitas de las farolas y del porche. Y las luces que se prenden de noche.
    this.materialVidrio = materialToon('#9be7ff').clone();
    this.materialVentanaBarrio = materialToon('#9be7ff').clone();
    this.materialBombita = materialToon('#fff3b0').clone();
    this.materialBombitaPorche = this.materialBombita.clone(); // (la del porche se apaga con los cortes de luz)
    this.lucesDeNoche = [];
    this.noche = false;

    this.crearCielo();
    this.crearSuelo();
    this.crearCerca();
    this.crearCercoDelPatio();
    this.crearTechos();
    this.crearBalcon();
    this.crearAleroDeLaPuerta();
    this.crearVentanasExteriores();
    this.crearJardin();
    this.crearTrastos();
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

  // Una caja invisible de colisión (desde el piso hasta "alto"). La devuelve (los escondites la usan).
  colision(x1, z1, x2, z2, alto = 2) {
    const caja = new THREE.Box3(new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, alto, z2));
    this.house.colliders.push(caja);
    return caja;
  }

  // ------------------------------------------------------------
  //  CIELO Y SUELO
  // ------------------------------------------------------------
  crearCielo() {
    // Un cielo por turno (ver Turno.js): un degradé vertical dibujado en un canvas
    this.cielos = {};
    for (const [turno, { cielo }] of Object.entries(TURNOS)) {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const degrade = ctx.createLinearGradient(0, 0, 0, 256);
      degrade.addColorStop(0, cielo[0]);
      degrade.addColorStop(0.6, cielo[1]);
      degrade.addColorStop(1, cielo[2]);
      ctx.fillStyle = degrade;
      ctx.fillRect(0, 0, 2, 256);
      const textura = new THREE.CanvasTexture(canvas);
      textura.colorSpace = THREE.SRGBColorSpace;
      this.cielos[turno] = textura;
    }

    // Niebla a lo lejos: el barrio se "funde" con el cielo (el color y la distancia cambian con el turno)
    this.scene.fog = new THREE.Fog('#d6f0ff', 50, 150);

    // Nubes: grupos de esferas. Tienen su propio material para poder oscurecerlas de noche.
    this.materialNubes = materialToon('#ffffff').clone();
    const posiciones = [
      [-60, 35, -40], [10, 40, -80], [70, 32, -30], [-80, 38, 30], [40, 36, 60], [-20, 42, 90], [90, 40, 20],
    ];
    for (const [x, y, z] of posiciones) {
      for (let i = 0; i < 4; i++) {
        const radio = 4 + Math.random() * 3;
        const nube = new THREE.Mesh(new THREE.SphereGeometry(radio, 12, 10), this.materialNubes);
        nube.position.set(x + i * 5 - 7, y + Math.random() * 2, z + Math.random() * 3);
        nube.userData.estatico = true;
        this.scene.add(nube);
      }
    }

    // De noche: estrellas (puntitos en la mitad de arriba de una esfera enorme) y la luna con su halo
    const puntos = [];
    for (let i = 0; i < 700; i++) {
      const angulo = Math.random() * Math.PI * 2;
      const altura = 0.08 + Math.random() * 0.92; // (no muy pegadas al horizonte)
      const radio = Math.sqrt(1 - altura * altura);
      puntos.push(Math.cos(angulo) * radio * 170, altura * 170, Math.sin(angulo) * radio * 170);
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(puntos, 3));
    const materialEstrellas = new THREE.PointsMaterial({ color: '#e8eeff', size: 1.6, sizeAttenuation: false, fog: false });
    materialEstrellas.userData.outlineParameters = { visible: false };
    this.estrellas = new THREE.Points(geometria, materialEstrellas);
    this.estrellas.raycast = () => {};

    this.luna = new THREE.Group();
    this.luna.position.set(-55, 62, -115);
    const disco = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), new THREE.MeshBasicMaterial({ color: '#f4f1de', fog: false }));
    disco.userData.outlineParameters = { visible: false };
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color: '#b8c8ff', transparent: true, opacity: 0.6, fog: false, depthWrite: false }));
    halo.material.userData.outlineParameters = { visible: false };
    halo.scale.set(34, 34, 1);
    this.luna.add(halo, disco);
    for (const objeto of [disco, halo]) objeto.raycast = () => {};
    this.scene.add(this.estrellas, this.luna);
  }

  // Cambia el cielo, la niebla, las nubes y las luces de afuera según el turno ('dia' o 'noche')
  ponerTurno(turno) {
    const datos = TURNOS[turno];
    const noche = turno === 'noche';
    this.scene.background = this.cielos[turno];
    this.scene.fog.color.set(datos.niebla.color);
    this.scene.fog.near = datos.niebla.cerca;
    this.scene.fog.far = datos.niebla.lejos;
    this.materialNubes.color.set(datos.nubes);
    this.estrellas.visible = this.luna.visible = noche;
    // Farolas y luz del porche: prendidas de noche (la bombita brilla aunque no le llegue luz)
    for (const luz of this.lucesDeNoche) luz.intensity = noche ? luz.userData.intensidad : 0;
    this.materialBombita.emissive.set(noche ? '#ffd27a' : '#000000');
    this.materialBombitaPorche.emissive.set(noche ? '#ffd27a' : '#000000');
    this.noche = noche;
    // Las ventanas de la casa y algunas del barrio, con luz adentro
    this.materialVidrio.color.set(noche ? '#33405e' : '#9be7ff');
    this.materialVidrio.emissive.set(noche ? '#ffb85c' : '#000000');
    this.materialVidrio.emissiveIntensity = 0.32;
    this.materialVentanaBarrio.emissive.set(noche ? '#ffc46b' : '#000000');
    this.materialVentanaBarrio.color.set(noche ? '#3d3a35' : '#9be7ff');
    this.ponerCorriente(1);
  }

  // Corte de luz en la casa (etapa 16C): se apagan la luz del porche y las ventanas de la casa (las
  // farolas y las casas del barrio, no). corriente: de 0 (cortada) a 1 (normal)
  ponerCorriente(corriente) {
    this.luzPorche.intensity = this.noche ? this.luzPorche.userData.intensidad * corriente : 0;
    this.materialBombitaPorche.emissiveIntensity = corriente;
    this.materialVidrio.emissiveIntensity = 0.32 * corriente;
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

    // Travesaños (los del frente, cortados en la tranquera de los autos: se abre en la cinemática de victoria)
    for (const y of [0.35, 0.85]) {
      this.cajaDecor((x1 + x2) / 2, y, z1, x2 - x1, 0.08, 0.04, '#fdfdfd');
      for (const [a, b] of [[x1, -14.8], [-9.7, x2]]) this.cajaDecor((a + b) / 2, y, z2, b - a, 0.08, 0.04, '#fdfdfd');
      this.cajaDecor(x1, y, (z1 + z2) / 2, 0.04, 0.08, z2 - z1, '#fdfdfd');
      this.cajaDecor(x2, y, (z1 + z2) / 2, 0.04, 0.08, z2 - z1, '#fdfdfd');
    }

    // Tranquera cerrada del camino (la de los autos está en Escape.js: se abre en la cinemática de victoria)
    this.cajaDecor(-1, 0.1, z2, 2, 0.9, 0.08, '#b08968');

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

    // Techo plano del garaje. Se puede pisar (se llega saltando por los trastos, ver crearTrastos):
    // la caja de colisión llega solo hasta la pared de la casa, así no "asoma" en el primer piso.
    this.cajaDecor(-12.2, 2.98, 2, 6.9, 0.22, 8.5, '#6c757d');
    const g = TECHO_GARAJE;
    this.house.colliders.push(new THREE.Box3(new THREE.Vector3(g.x1, 2.98, g.z1), new THREE.Vector3(g.x2, g.y, g.z2)));
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
    // La luz del porche, colgando del alero al lado de la puerta (de noche, prendida). Es un foco que apunta
    // para abajo y hacia afuera: una luz que alumbra para todos lados se metería en la casa por las paredes.
    this.luzPorche = this.luzDeNoche(-0.1, 2.35, 6.9, '#ffb35c', 9, 9, [-0.1, 0, 8.4], this.materialBombitaPorche);
  }

  // Una bombita (que brilla de noche) con su luz. La luz arranca apagada: ver ponerTurno.
  // haciaDonde: si se pasa un punto, la luz es un foco que apunta ahí (si no, alumbra para todos lados)
  luzDeNoche(x, y, z, color, intensidad, distancia, haciaDonde = null, material = this.materialBombita) {
    const bombita = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), material);
    bombita.position.set(x, y, z);
    bombita.userData.estatico = true;
    this.scene.add(bombita);
    let luz;
    if (haciaDonde) {
      luz = new THREE.SpotLight(color, 0, distancia, 0.95, 0.6, 2);
      luz.target.position.set(...haciaDonde);
      this.scene.add(luz.target);
    } else {
      luz = new THREE.PointLight(color, 0, distancia, 2);
    }
    luz.position.set(x, y - 0.25, z);
    luz.userData.intensidad = intensidad;
    this.scene.add(luz);
    this.lucesDeNoche.push(luz);
    return luz;
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
      const material = typeof color === 'string' ? materialToon(color) : color;
      const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, prof), material);
      m.position.set(px, py, pz);
      m.userData.estatico = true;
      grupo.add(m); // sin sombra: están pegadas a la pared, no se notaría
    };
    parte(1.5, 1.3, 0.06, COLOR_MARCO, 0, 0.65, 0); // marco
    parte(1.3, 1.1, 0.06, this.materialVidrio, 0, 0.65, 0.02); // vidrio (de noche, con luz adentro)
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

    // Arbustos contra el frente de la casa, en la vereda y en el patio de los perros (todos son escondites)
    for (const x of [3.5, 5.5, 7.5, -8.4]) this.arbusto(x, 6.8);
    for (const [x, z] of [[-3.5, 20.5], [1.8, 20.5], [16, 21], [-18, 21]]) this.arbusto(x, z);
    for (const [x, z] of [[16.6, 3.5], [18.2, -7.6], [-1.5, -11.5]]) this.arbusto(x, z);
    // Etapa 17B: uno atrás, cerca de la ventana de la cocina, y otro al costado, cerca de la ventanita del sótano
    for (const [x, z] of [[-4.5, -7.2], [-11.2, -6.2]]) this.arbusto(x, z);

    // Tachos de basura al lado de la tranquera del patio (escondite: salís oliendo a basura)
    this.tachoDeBasura(14.4, 6.95);
    this.tachoDeBasura(15.25, 6.95);

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

  // Arbusto redondo y tupido (cuatro esferas), de 1,2 m de alto: entra una persona agachada
  arbusto(x, z) {
    const grupo = this.grupoEn(x, z, Math.random() * Math.PI * 2);
    const verde = alAzar(VERDES);
    const bolas = [[0, 0.6, 0, 0.72], [0.45, 0.5, 0.25, 0.52], [-0.42, 0.5, -0.2, 0.56], [0.1, 0.85, -0.1, 0.5]];
    for (const [bx, by, bz, radio] of bolas) {
      this.decor(new THREE.SphereGeometry(radio, 12, 10), verde, bx, by, bz, true, grupo).scale.y = 0.85;
    }
    grupo.traverse((m) => m.isMesh && (m.userData.estatico = true));
    const caja = this.colision(x - 0.8, z - 0.75, x + 0.8, z + 0.75, 1.2);
    this.house.agregarEscondite('arbusto', grupo, caja); // te podés meter adentro (y tapa la vista)
  }

  // Tacho de basura grande con ruedas (verde, de los de la municipalidad). La tapa quedó un poco
  // abierta y hay moscas dando vueltas: está claro que adentro no huele bien.
  tachoDeBasura(x, z) {
    const grupo = this.grupoEn(x, z);
    this.decor(new THREE.BoxGeometry(0.75, 1.05, 0.7), '#2d6a4f', 0, 0.6, 0, true, grupo);
    this.decor(new THREE.BoxGeometry(0.79, 0.06, 0.74), '#1b4332', 0, 1.1, 0, true, grupo); // borde
    const tapa = this.decor(new THREE.BoxGeometry(0.8, 0.05, 0.76), '#1b4332', 0, 1.2, 0.04, true, grupo);
    tapa.rotation.x = 0.25; // levantada de adelante (la bisagra está atrás)
    for (const lado of [-1, 1]) {
      const rueda = this.decor(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10), '#212529', lado * 0.33, 0.08, -0.3, false, grupo);
      rueda.rotation.z = Math.PI / 2;
    }
    this.decor(new THREE.BoxGeometry(0.5, 0.04, 0.04), '#1b4332', 0, 1.02, -0.38, false, grupo); // manija
    for (const [mx, my, mz] of [[0.1, 1.45, 0.2], [-0.2, 1.6, 0], [0.25, 1.7, -0.1]]) {
      this.decor(new THREE.SphereGeometry(0.025, 6, 4), '#000000', mx, my, mz, false, grupo); // moscas
    }
    grupo.traverse((m) => m.isMesh && (m.userData.estatico = true));
    const caja = this.colision(x - 0.4, z - 0.38, x + 0.4, z + 0.38, 1.15);
    this.house.agregarEscondite('tacho', grupo, caja);
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

  // Trastos contra la pared oeste del garaje: cada uno un poco más alto que el anterior, así se
  // puede subir saltando hasta el techo del garaje (tacho 0,9 m → cajones 1,7 → aire 2,5 → techo 3,2)
  crearTrastos() {
    for (const { tipo, x, z, ancho, prof, alto } of TRASTOS) {
      if (tipo === 'tacho') {
        this.decor(new THREE.CylinderGeometry(0.33, 0.28, alto - 0.06, 14), '#2d6a4f', x, (alto - 0.06) / 2, z);
        this.decor(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 14), '#1b4332', x, alto - 0.03, z); // tapa
      } else if (tipo === 'cajones') {
        // Dos cajones de madera apilados, con tablitas
        for (const base of [0, alto / 2]) {
          this.cajaDecor(x, base, z, ancho, alto / 2 - 0.02, prof, '#c68642');
          this.cajaDecor(x, base + alto / 4 - 0.04, z, ancho + 0.02, 0.06, prof + 0.02, '#8d5524');
        }
      } else if (tipo === 'aire') {
        // Aparato de aire acondicionado arriba de un soporte de metal
        const caja = 0.75;
        for (const dz of [-0.3, 0.3]) this.cajaDecor(x, 0, z + dz, 0.08, alto - caja, 0.08, '#6c757d');
        this.cajaDecor(x, alto - caja, z, ancho, caja, prof, '#e9ecef');
        const rejilla = this.decor(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 20), '#495057', x - ancho / 2 - 0.01, alto - caja / 2, z);
        rejilla.rotation.z = Math.PI / 2; // mira hacia afuera (-X)
      }
      this.colision(x - ancho / 2, z - prof / 2, x + ancho / 2, z + prof / 2, alto);
    }
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
      // Dos ventanas del lado de la calle (las casas de enfrente): de noche, una con luz y otra no
      if (z > 30) {
        [-2.5, 2.5].forEach((dx, i) => {
          const ventana = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.1), i === 0 ? this.materialVentanaBarrio : materialToon('#3d4a5c'));
          ventana.position.set(x + dx, 2.6, z - 4.03);
          ventana.userData.estatico = true;
          this.scene.add(ventana);
        });
      }
    }
    // Farolas en la vereda (de noche, prendidas)
    for (const x of [-18, 6, 26]) {
      this.cajaDecor(x, 0, 24.2, 0.15, 4, 0.15, '#343a40');
      this.luzDeNoche(x, 4.1, 24.2, '#ffcf8a', 14, 16);
    }
  }
}

// Un círculo blanco que se desvanece hacia afuera (el halo de la luna), dibujado en un canvas
function texturaHalo() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const degrade = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  degrade.addColorStop(0, 'rgba(255,255,255,0.9)');
  degrade.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  degrade.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
