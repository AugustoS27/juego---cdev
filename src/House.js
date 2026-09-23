// La casa: lee los datos de HouseData.js y construye pisos, paredes, puertas,
// escalera y muebles. También responde preguntas como "¿esta caja choca con algo?".
import * as THREE from 'three';
import { materialToon, materialConTextura } from './Materials.js';
import { textura } from './Texturas.js';
import { cargarPiezas } from './Models.js';
import { Door } from './Door.js';
import {
  ALTURA_PISO,
  HABITACIONES,
  COLORES_PAREDES,
  COLOR_EXTERIOR,
  PAREDES,
  PUERTAS,
  VENTANA_ROMPIBLE,
  PORTON_GARAJE,
  ESCALERA,
  BARANDAS,
  MUEBLES,
  UBICACION_MUEBLES,
  WAYPOINTS,
  CONEXIONES,
} from './HouseData.js';

const GROSOR_PARED = 0.2;
const GROSOR_PISO = 0.2;
const ANCHO_PUERTA = 1.4;
const ALTO_PUERTA = 2.2;
const DISTANCIA_INTERACCION = 2; // a cuántos metros se puede usar una puerta

// Poné esto en true para ver los waypoints (esferas rojas) y sus conexiones
const MOSTRAR_WAYPOINTS = false;

export class House {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Cajas (Box3) fijas contra las que se choca
    this.floors = []; // Mallas sobre las que se puede caminar
    this.puertas = []; // Objetos Door
    this.muebles = []; // { tipo, piso, grupo, collider, escondite }
    this.escondites = []; // los muebles donde el jugador se puede esconder (placards y camas)
    this.obstaculos = []; // Todo lo que tapa la vista (para los rayos de visión del dueño)

    // Objetos reutilizables para los rayos
    this.raycaster = new THREE.Raycaster();
    this.abajo = new THREE.Vector3(0, -1, 0);

    // Huecos que se recortan de las paredes: cada uno con su ancho y desde/hasta qué altura
    this.huecos = [
      ...PUERTAS.map((p) => ({ ...p, ancho: ANCHO_PUERTA, abajo: 0, arriba: ALTO_PUERTA })),
      VENTANA_ROMPIBLE,
      { ...PORTON_GARAJE, abajo: 0, arriba: PORTON_GARAJE.alto },
    ];

    this.crearPisos();
    for (const pared of PAREDES) this.crearPared(pared);
    this.crearPuertas();
    this.crearEscalera();
    this.crearBarandas();
    for (const mueble of UBICACION_MUEBLES) this.agregarMueble(mueble);
    this.crearTecho();
    if (MOSTRAR_WAYPOINTS) this.dibujarWaypoints();
  }

  // Altura (y) donde empieza un piso: 0 para planta baja, 3 para planta alta
  alturaDePiso(piso) {
    return piso * ALTURA_PISO;
  }

  // ------------------------------------------------------------
  //  CONSTRUCCIÓN
  // ------------------------------------------------------------

  // Crea una caja en la escena y la registra como sólida y/o suelo.
  // y = altura donde empieza la caja (su base).
  // colores (opcional): un color por cara, en el orden de Three.js [+x, -x, +y, -y, +z, -z]
  // material (opcional): un material ya hecho (ej: con textura)
  agregarCaja({ x, y, z, ancho, alto, prof, color, colores = null, material = null, solido = false, suelo = false, sombra = true }) {
    if (!material) material = colores ? colores.map((c) => materialToon(c)) : materialToon(color);
    const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, prof), material);
    // BoxGeometry se centra en el medio, por eso subimos la mitad del alto
    malla.position.set(x, y + alto / 2, z);
    // Calculamos ya su posición en el mundo: los rayos del suelo la necesitan
    // aunque todavía no se haya dibujado ningún frame.
    malla.updateMatrixWorld();
    malla.castShadow = sombra;
    malla.receiveShadow = true;
    this.scene.add(malla);
    this.obstaculos.push(malla);

    if (solido) this.colliders.push(new THREE.Box3().setFromObject(malla));
    if (suelo) this.floors.push(malla);
    return malla;
  }

  // Pisos: uno por cada rectángulo de cada habitación.
  // En la planta alta, el piso de arriba es a la vez el techo de abajo,
  // así que le pegamos una placa blanca debajo para que el techo se vea blanco.
  crearPisos() {
    for (const hab of HABITACIONES) {
      const base = this.alturaDePiso(hab.piso);
      for (const [x1, z1, x2, z2] of hab.rects) {
        const medidas = { x: (x1 + x2) / 2, z: (z1 + z2) / 2, ancho: x2 - x1, prof: z2 - z1 };
        // El dibujo del piso se repite cada 2 metros (la cerámica cada 1.2 m, así las baldosas
        // quedan de 60 cm), según el tamaño del rectángulo
        const metros = hab.textura === 'ceramica' ? 1.2 : 2;
        const material = hab.textura
          ? materialConTextura(hab.colorPiso, textura(hab.textura, medidas.ancho / metros, medidas.prof / metros))
          : null;
        this.agregarCaja({
          ...medidas,
          y: base - GROSOR_PISO,
          alto: GROSOR_PISO,
          color: hab.colorPiso,
          material,
          suelo: true,
          sombra: false,
        });
        if (hab.piso > 0) {
          this.agregarCaja({ ...medidas, y: base - GROSOR_PISO - 0.02, alto: 0.02, color: '#fffaf0', sombra: false });
        }
      }
    }
  }

  // Una pared es una línea recta. Buscamos los huecos (puertas, ventana, portón) que caen
  // sobre esa línea y la cortamos en tramos. Por cada hueco queda:
  //   pared hasta el hueco + alféizar abajo (si el hueco no llega al piso) + dintel arriba
  crearPared({ piso, x1, z1, x2, z2 }) {
    const base = this.alturaDePiso(piso);
    const vaEnX = z1 === z2; // true: la pared corre de oeste a este
    const fijo = vaEnX ? z1 : x1; // la coordenada que no cambia a lo largo de la pared

    // Alargamos medio grosor en cada punta para que las esquinas queden cerradas
    const desde = Math.min(vaEnX ? x1 : z1, vaEnX ? x2 : z2) - GROSOR_PARED / 2;
    const hasta = Math.max(vaEnX ? x1 : z1, vaEnX ? x2 : z2) + GROSOR_PARED / 2;

    // Huecos que están sobre esta pared, ordenados de un extremo al otro
    const huecos = this.huecos
      .filter((h) => h.piso === piso)
      .filter((h) => (vaEnX ? h.eje === 'x' && h.z === fijo : h.eje === 'z' && h.x === fijo))
      .map((h) => ({ ...h, centro: vaEnX ? h.x : h.z }))
      .filter((h) => h.centro > desde && h.centro < hasta)
      .sort((a, b) => a.centro - b.centro);

    let inicio = desde;
    for (const h of huecos) {
      const bordeIzq = h.centro - h.ancho / 2;
      const bordeDer = h.centro + h.ancho / 2;
      this.agregarTramo(piso, vaEnX, fijo, inicio, bordeIzq, base, ALTURA_PISO); // pared hasta el hueco
      if (h.abajo > 0) this.agregarTramo(piso, vaEnX, fijo, bordeIzq, bordeDer, base, h.abajo); // alféizar
      this.agregarTramo(piso, vaEnX, fijo, bordeIzq, bordeDer, base + h.arriba, ALTURA_PISO - h.arriba); // dintel
      inicio = bordeDer;
    }
    this.agregarTramo(piso, vaEnX, fijo, inicio, hasta, base, ALTURA_PISO); // lo que queda
  }

  // Un tramo de pared entre dos coordenadas (desde, hasta) a lo largo de la pared.
  // Cada cara toma el color de la habitación a la que da (o el color de afuera).
  agregarTramo(piso, vaEnX, fijo, desde, hasta, y, alto) {
    const largo = hasta - desde;
    if (largo <= 0.01) return;
    const centro = (desde + hasta) / 2;

    // Miramos 30 cm hacia cada lado de la pared: ¿qué habitación hay ahí?
    const colorDelLado = (x, z) => {
      const hab = this.habitacionEn(x, z, piso);
      if (!hab) return COLOR_EXTERIOR;
      return hab.colorParedes || COLORES_PAREDES[piso];
    };

    // Las puntas del tramo también: si del otro lado de la punta es afuera, van del color
    // exterior (si no, una pared interior "asoma" con su color en la fachada); si es el
    // marco de una puerta, van del color de la habitación.
    let medidas, colores;
    if (vaEnX) {
      medidas = { x: centro, z: fijo, ancho: largo, prof: GROSOR_PARED };
      const sur = colorDelLado(centro, fijo + 0.3);
      const norte = colorDelLado(centro, fijo - 0.3);
      const puntaEste = colorDelLado(hasta + 0.3, fijo);
      const puntaOeste = colorDelLado(desde - 0.3, fijo);
      colores = [puntaEste, puntaOeste, sur, sur, sur, norte]; // orden: +x, -x, +y, -y, +z, -z
    } else {
      medidas = { x: fijo, z: centro, ancho: GROSOR_PARED, prof: largo };
      const este = colorDelLado(fijo + 0.3, centro);
      const oeste = colorDelLado(fijo - 0.3, centro);
      const puntaSur = colorDelLado(fijo, hasta + 0.3);
      const puntaNorte = colorDelLado(fijo, desde - 0.3);
      colores = [este, oeste, este, este, puntaSur, puntaNorte];
    }
    this.agregarCaja({ ...medidas, y, alto, colores, solido: true });
  }

  // La habitación que ocupa el punto (x, z) en ese piso, o null si es afuera
  habitacionEn(x, z, piso) {
    return (
      HABITACIONES.find(
        (hab) => hab.piso === piso && hab.rects.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2),
      ) || null
    );
  }

  crearPuertas() {
    for (const datos of PUERTAS) {
      const puerta = new Door(this.scene, {
        ...datos,
        y: this.alturaDePiso(datos.piso),
        ancho: ANCHO_PUERTA,
        alto: ALTO_PUERTA,
      });
      this.puertas.push(puerta);
      this.obstaculos.push(puerta.bisagra);
      if (puerta.deCalle) this.puertaDeCalle = puerta;
    }
  }

  // La escalera tiene 3 partes:
  //  1. Una RAMPA invisible: es lo que pisa el jugador (así no hace falta física de escalones).
  //  2. ESCALONES de decoración: lo que se ve.
  //  3. REBANADAS invisibles de colisión: para no atravesar la escalera por los costados.
  crearEscalera() {
    const { inicioX, z, largo, ancho, altura } = ESCALERA;

    // 1. Rampa: una caja finita inclinada
    const largoReal = Math.hypot(largo, altura); // hipotenusa
    const rampa = new THREE.Mesh(new THREE.BoxGeometry(largoReal, 0.1, ancho), materialToon('#f15bb5'));
    rampa.position.set(inicioX + largo / 2, altura / 2, z);
    rampa.rotation.z = Math.atan2(altura, largo); // la inclinamos
    rampa.visible = false; // los rayos la detectan igual aunque no se vea
    rampa.updateMatrixWorld();
    this.scene.add(rampa);
    this.floors.push(rampa);

    // 2. Escalones: bloques cada vez más altos
    const CANTIDAD_ESCALONES = 12;
    const huella = largo / CANTIDAD_ESCALONES; // profundidad de cada escalón
    const contrahuella = altura / CANTIDAD_ESCALONES; // alto de cada escalón
    for (let i = 0; i < CANTIDAD_ESCALONES; i++) {
      this.agregarCaja({
        x: inicioX + huella * (i + 0.5),
        y: 0,
        z,
        ancho: huella,
        alto: contrahuella * (i + 1),
        prof: ancho,
        color: i % 2 === 0 ? '#c68642' : '#b5733a',
      });
    }

    // 3. Rebanadas de colisión: cada una llega hasta la altura de la rampa en su
    // borde más bajo, así quedan siempre por DEBAJO de la superficie y no molestan al subir.
    // (Una sola caja AABB no sirve: sería tan alta como toda la rampa y no se podría subir.)
    const ANCHO_REBANADA = 0.25;
    const cantidad = Math.ceil(largo / ANCHO_REBANADA);
    for (let i = 0; i < cantidad; i++) {
      const x0 = inicioX + i * ANCHO_REBANADA;
      const x1 = Math.min(x0 + ANCHO_REBANADA, inicioX + largo);
      const alturaRebanada = (altura * (x0 - inicioX)) / largo; // altura de la rampa en x0
      if (alturaRebanada <= 0) continue;
      this.colliders.push(
        new THREE.Box3(
          new THREE.Vector3(x0, 0, z - ancho / 2),
          new THREE.Vector3(x1, alturaRebanada, z + ancho / 2),
        ),
      );
    }
  }

  crearBarandas() {
    for (const { piso, x1, z1, x2, z2 } of BARANDAS) {
      this.agregarCaja({
        x: (x1 + x2) / 2,
        y: this.alturaDePiso(piso),
        z: (z1 + z2) / 2,
        ancho: x2 - x1,
        alto: 1,
        prof: z2 - z1,
        color: '#8d5524',
        solido: true,
      });
    }
  }

  // Un mueble es un grupo de cajas (sus "partes" en el catálogo).
  agregarMueble({ tipo, piso, x, z, rot = 0 }) {
    const def = MUEBLES[tipo];
    const grupo = new THREE.Group();

    for (const [px, py, pz, ancho, alto, prof, color] of def.partes) {
      const parte = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, prof), materialToon(color));
      parte.position.set(px, py + alto / 2, pz);
      parte.castShadow = def.sombra !== false;
      parte.receiveShadow = true;
      grupo.add(parte);
    }

    // Medimos el mueble ANTES de rotarlo: esa es la caja donde va a encajar el modelo GLTF
    const cajaLocal = new THREE.Box3().setFromObject(grupo);
    const centro = cajaLocal.getCenter(new THREE.Vector3());
    const tamaño = cajaLocal.getSize(new THREE.Vector3());

    grupo.position.set(x, this.alturaDePiso(piso), z);
    grupo.rotation.y = THREE.MathUtils.degToRad(rot);
    grupo.updateMatrixWorld(true);
    this.scene.add(grupo);
    this.obstaculos.push(grupo);

    // La caja de colisión es la caja que envuelve a todo el mueble
    let collider = null;
    if (def.solido !== false) {
      collider = new THREE.Box3().setFromObject(grupo);
      this.colliders.push(collider);
    }
    const mueble = { tipo, piso, grupo, collider, escondite: def.escondite || null };
    this.muebles.push(mueble);
    if (mueble.escondite) this.escondites.push(mueble);

    // Si el mueble tiene modelo(s) GLTF, los cargamos y reemplazamos las cajas.
    // Mientras cargan (o si fallan) se sigue viendo la versión con cajas.
    const piezas = def.modelos || (def.modelo && [
      { archivo: def.modelo, caja: [centro.x, cajaLocal.min.y, centro.z, tamaño.x, tamaño.y, tamaño.z] },
    ]);
    if (piezas) {
      cargarPiezas(piezas)
        .then((modelo) => {
          modelo.traverse((hijo) => (hijo.castShadow = def.sombra !== false));
          grupo.clear(); // sacamos las cajas
          grupo.add(modelo);
          grupo.updateMatrixWorld(true);
        })
        .catch(() => console.warn(`No se pudo cargar el modelo de "${tipo}": queda la forma básica`));
    }
    return grupo;
  }

  // Techo de la planta alta (no proyecta sombra, ver luces en Game.js)
  crearTecho() {
    const y = this.alturaDePiso(2) - 0.02;
    this.agregarCaja({ x: 0, y, z: 0, ancho: 18.2, alto: 0.2, prof: 12.2, color: '#fffaf0', sombra: false });
  }

  // Esferas rojas en cada waypoint y líneas entre los conectados (solo para depurar)
  dibujarWaypoints() {
    const posiciones = {};
    for (const wp of WAYPOINTS) {
      posiciones[wp.id] = new THREE.Vector3(wp.pos[0], wp.pos[1] + 0.3, wp.pos[2]);
      const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 'red' }));
      esfera.position.copy(posiciones[wp.id]);
      this.scene.add(esfera);
    }
    const puntos = CONEXIONES.flatMap(([a, b]) => [posiciones[a], posiciones[b]]);
    const lineas = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(puntos),
      new THREE.LineBasicMaterial({ color: 'red' }),
    );
    this.scene.add(lineas);
  }

  // ------------------------------------------------------------
  //  CONSULTAS (las usan el jugador y, más adelante, el dueño)
  // ------------------------------------------------------------

  update(dt) {
    for (const puerta of this.puertas) puerta.update(dt);
  }

  // Deja la casa como al principio (cada puerta como arranca: cerrada, abierta o con llave)
  reiniciar() {
    for (const puerta of this.puertas) puerta.reiniciar();
  }

  // Saca una caja de colisión (ej: cuando se abre el portón del garaje)
  quitarCollider(caja) {
    this.colliders = this.colliders.filter((c) => c !== caja);
  }

  // ¿La caja dada choca con una pared, un mueble o una puerta cerrada?
  chocaCon(caja) {
    for (const collider of this.colliders) {
      if (caja.intersectsBox(collider)) return true;
    }
    for (const puerta of this.puertas) {
      if (puerta.bloquea && caja.intersectsBox(puerta.collider)) return true;
    }
    return false;
  }

  // Altura del suelo debajo de una posición (o null si no hay nada).
  // El rayo sale "margen" metros arriba de los pies: así detecta una rampa que sube.
  alturaDelSuelo(posicion, margen) {
    this.raycaster.set(new THREE.Vector3(posicion.x, posicion.y + margen, posicion.z), this.abajo);
    this.raycaster.far = 50;
    const choques = this.raycaster.intersectObjects(this.floors, false);
    return choques.length > 0 ? choques[0].point.y : null;
  }

  // ¿Hay algo que tape la vista entre dos puntos? (paredes, muebles, pisos, puertas)
  hayVisionEntre(desde, hasta) {
    const direccion = new THREE.Vector3().subVectors(hasta, desde);
    const distancia = direccion.length();
    this.raycaster.set(desde, direccion.normalize());
    this.raycaster.far = distancia;
    return this.raycaster.intersectObjects(this.obstaculos, true).length === 0;
  }

  // ¿Se puede caminar en línea recta de "desde" a "hasta" sin chocar nada?
  // Probamos la caja del caminante en varios puntos de la recta. Las puertas no cuentan
  // (el dueño las abre), pero sí que haya suelo a la altura esperada en cada punto.
  sePuedeCaminar(desde, hasta, radio) {
    const distancia = Math.hypot(hasta.x - desde.x, hasta.z - desde.z);
    const pasos = Math.max(1, Math.ceil(distancia / 0.3));
    const punto = new THREE.Vector3();
    const caja = new THREE.Box3();

    for (let i = 0; i <= pasos; i++) {
      punto.lerpVectors(desde, hasta, i / pasos);
      const suelo = this.alturaDelSuelo(punto, 0.5);
      if (suelo === null || Math.abs(suelo - punto.y) > 0.6) return false; // no hay piso o es otro piso

      caja.min.set(punto.x - radio, suelo + 0.35, punto.z - radio);
      caja.max.set(punto.x + radio, suelo + 1.8, punto.z + radio);
      if (this.colliders.some((collider) => caja.intersectsBox(collider))) return false;
    }
    return true;
  }

  // ¿La mira del jugador apunta a un escondite cercano? Devuelve el mueble o null.
  // Como con el objeto: rayo desde el centro de la cámara, miramos lo PRIMERO que toca.
  esconditeMirado(camera) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    this.raycaster.far = 2;
    const choques = this.raycaster.intersectObjects(this.obstaculos, true);
    if (choques.length === 0) return null;
    // Subimos por los "padres" de lo que tocó hasta encontrar el grupo de un mueble-escondite
    for (let obj = choques[0].object; obj; obj = obj.parent) {
      const escondite = this.escondites.find((esc) => esc.grupo === obj);
      if (escondite) return escondite;
    }
    return null;
  }

  // Devuelve la puerta más cercana que está adelante (a menos de distanciaMax), o null.
  // posicion: pies de quien pregunta. direccion: hacia dónde mira.
  puertaCercana(posicion, direccion, distanciaMax = DISTANCIA_INTERACCION) {
    let mejor = null;
    let mejorDistancia = distanciaMax;
    const haciaPuerta = new THREE.Vector3();
    const mirada = new THREE.Vector3(direccion.x, 0, direccion.z).normalize();

    for (const puerta of this.puertas) {
      // Solo puertas del mismo piso
      if (Math.abs(puerta.centro.y - (posicion.y + ALTO_PUERTA / 2)) > 1) continue;

      haciaPuerta.set(puerta.centro.x - posicion.x, 0, puerta.centro.z - posicion.z);
      const distancia = haciaPuerta.length();
      if (distancia > mejorDistancia) continue;

      // Tiene que estar más o menos adelante del jugador (salvo que esté parado en el hueco)
      const laEstaMirando = haciaPuerta.normalize().dot(mirada) > 0.5;
      if (distancia > 0.6 && !laEstaMirando) continue;

      mejor = puerta;
      mejorDistancia = distancia;
    }
    return mejor;
  }
}
