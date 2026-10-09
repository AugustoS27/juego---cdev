// La casa: lee los datos de HouseData.js y construye pisos, paredes, puertas,
// escaleras, muebles, el ático y las lamparitas. También responde preguntas como
// "¿esta caja choca con algo?" o "¿qué altura tiene el suelo acá?".
import * as THREE from 'three';
import { materialToon, materialConTextura, materialVidrioAdentro } from './Materials.js';
import { textura } from './Texturas.js';
import { cargarPiezas } from './Models.js';
import { Door } from './Door.js';
import { Trampilla } from './Especiales.js';
import {
  ALTURA_PISO,
  HABITACIONES,
  COLORES_PAREDES,
  COLOR_EXTERIOR,
  PAREDES,
  PUERTAS,
  VENTANA_ROMPIBLE,
  PORTON_GARAJE,
  ESCALERAS,
  BARANDAS,
  MUEBLES,
  UBICACION_MUEBLES,
  LUCES,
  TECHO,
  PISO_MINIMO,
  LIMITES_CASA,
  CONDUCTOS,
  PUENTES,
  TUNEL,
  POZO,
  WAYPOINTS,
  CONEXIONES,
} from './HouseData.js';

const GROSOR_PARED = 0.2;
const GROSOR_PISO = 0.2;
const ANCHO_PUERTA = 1.4;
const ALTO_PUERTA = 2.2;
const DISTANCIA_INTERACCION = 2; // a cuántos metros se puede usar una puerta

// Conductos de ventilación y túnel: por dentro miden 0.8 de ancho y 1.15 de alto
// (el jugador agachado mide 1.05, parado 1.7: solo se pasa agachado; el dueño mide 1.8)
const ANCHO_CONDUCTO = 1; // por fuera
const ALTO_CONDUCTO = 1.25; // por fuera (el techo del conducto empieza en 1.15)
const PUERTITA = { ancho: 0.8, alto: 1.1 }; // la rejilla o la tabla que tapa cada punta

// Zócalos (abajo) y molduras (arriba) de las paredes de adentro
const ZOCALO = { alto: 0.12, grosor: 0.025 };
const MOLDURA = { alto: 0.08, grosor: 0.04 };

// Poné esto en true para ver los waypoints (esferas rojas) y sus conexiones
const MOSTRAR_WAYPOINTS = false;

export class House {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Cajas (Box3) fijas contra las que se choca
    this.floors = []; // Mallas sobre las que se puede caminar
    this.puertas = []; // Objetos Door
    this.muebles = []; // { tipo, piso, grupo, collider, escondite }
    this.escondites = []; // donde el jugador se puede esconder: { escondite (tipo), grupo, collider }
    this.obstaculos = []; // Todo lo que tapa la vista (para los rayos de visión del dueño)
    this.lamparitas = []; // luces propias de la casa (algunas parpadean)
    this.corriente = 1; // corte de luz (etapa 16C): 0 = las lamparitas se apagan (el fuego de la caldera, no)
    this.conductos = []; // rectángulos de adentro de los conductos (para el ruido metálico)
    this.tuneles = []; // rectángulos de adentro del túnel
    this.trampilla = null; // la escalera plegable del ático (ver Especiales.js)
    this.materialesDePared = new Map(); // empapelados ya creados (uno por dibujo y color)
    this.cargas = []; // promesas de los modelos que se están cargando (Game espera a que terminen)
    this.juntadosPorPiso = {}; // mallas juntadas de los muebles de cada piso (ver Optimizar.js)

    // Objetos reutilizables para los rayos
    this.raycaster = new THREE.Raycaster();
    this.abajo = new THREE.Vector3(0, -1, 0);

    // Huecos que se recortan de las paredes: cada uno con su ancho y desde/hasta qué altura
    // (los conductos y el túnel atraviesan paredes: también les hacemos su agujero)
    this.huecos = [
      ...PUERTAS.map((p) => ({ ...p, ancho: p.ancho ?? ANCHO_PUERTA, abajo: 0, arriba: p.alto ?? ALTO_PUERTA })),
      VENTANA_ROMPIBLE,
      { ...PORTON_GARAJE, abajo: 0, arriba: PORTON_GARAJE.alto },
      ...CONDUCTOS.flatMap((c) => this.huecosDeConducto(c)),
      { piso: TUNEL.piso, x: TUNEL.desde[0], z: TUNEL.desde[1], eje: 'z', ancho: ANCHO_CONDUCTO, abajo: 0, arriba: ALTO_CONDUCTO },
    ];

    this.crearPisos();
    for (const pared of PAREDES) this.crearPared(pared);
    this.crearPuertas();
    for (const escalera of ESCALERAS) this.crearEscalera(escalera);
    this.crearBarandas();
    for (const conducto of CONDUCTOS) this.crearConducto(conducto);
    this.crearTunel(TUNEL);
    for (const puente of PUENTES) this.crearPuente(puente);
    for (const mueble of UBICACION_MUEBLES) this.agregarMueble(mueble);
    this.crearAtico();
    this.crearLamparitas();
    if (MOSTRAR_WAYPOINTS) this.dibujarWaypoints();
  }

  // Altura (y) donde empieza un piso: -3 el sótano, 0 la planta baja, 3 el primer piso...
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
    malla.userData.estatico = true; // no se mueve: se puede juntar con otras (ver Optimizar.js)
    this.scene.add(malla);
    this.obstaculos.push(malla);

    if (solido) this.colliders.push(new THREE.Box3().setFromObject(malla));
    if (suelo) this.floors.push(malla);
    return malla;
  }

  // Pisos: uno por cada rectángulo de cada habitación.
  // El piso de cada nivel es a la vez el techo del de abajo, así que (salvo en el sótano)
  // le pegamos una placa blanca debajo para que el techo se vea blanco.
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
        if (hab.piso > PISO_MINIMO) {
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

    // Donde cambia la habitación de al lado, la pared se corta en otro tramo (así cada pedazo
    // toma el color del cuarto al que da). Los cortes son los bordes de las habitaciones que tocan la pared.
    const cortes = HABITACIONES.filter((hab) => hab.piso === piso)
      .flatMap((hab) => hab.rects)
      .filter(([x1, z1, x2, z2]) => (vaEnX ? z1 <= fijo + 0.3 && z2 >= fijo - 0.3 : x1 <= fijo + 0.3 && x2 >= fijo - 0.3))
      .flatMap(([x1, z1, x2, z2]) => (vaEnX ? [x1, x2] : [z1, z2]));
    const tramo = (a, b, y, alto) => {
      const puntos = [a, ...cortes.filter((c) => c > a + 0.01 && c < b - 0.01).sort((m, n) => m - n), b];
      for (let i = 0; i < puntos.length - 1; i++) this.agregarTramo(piso, vaEnX, fijo, puntos[i], puntos[i + 1], y, alto);
    };

    let inicio = desde;
    for (const h of huecos) {
      const bordeIzq = h.centro - h.ancho / 2;
      const bordeDer = h.centro + h.ancho / 2;
      tramo(inicio, bordeIzq, base, ALTURA_PISO); // pared hasta el hueco
      if (h.abajo > 0) tramo(bordeIzq, bordeDer, base, h.abajo); // alféizar
      tramo(bordeIzq, bordeDer, base + h.arriba, ALTURA_PISO - h.arriba); // dintel
      inicio = bordeDer;
    }
    tramo(inicio, hasta, base, ALTURA_PISO); // lo que queda
  }

  // Un tramo de pared entre dos coordenadas (desde, hasta) a lo largo de la pared.
  // Cada cara toma el color (y el empapelado) de la habitación a la que da, o el color de afuera.
  // Del lado de adentro, además, lleva zócalo abajo y moldura arriba.
  agregarTramo(piso, vaEnX, fijo, desde, hasta, y, alto) {
    const largo = hasta - desde;
    if (largo <= 0.01) return;
    const centro = (desde + hasta) / 2;
    const base = this.alturaDePiso(piso);
    // Si llega hasta arriba, la bajamos 1 cm: si no, su cara de arriba queda justo a la altura del
    // piso de arriba y las dos "titilan" (se ve una raya del color de la pared en el piso)
    if (y + alto >= base + ALTURA_PISO - 0.001) alto -= 0.01;

    // Miramos 30 cm hacia cada lado de la pared: ¿qué habitación hay ahí?
    // Devuelve el material de esa cara (con el empapelado del cuarto, si tiene).
    const ladoDe = (x, z) => {
      const hab = this.habitacionEn(x, z, piso);
      if (hab) return { adentro: true, material: this.materialDePared(hab.colorParedes || COLORES_PAREDES[piso], hab.pared) };
      // Sin habitación pero adentro de la casa (el hueco de la escalera): color de adentro
      const { x1, z1, x2, z2 } = LIMITES_CASA;
      const adentro = x > x1 && x < x2 && z > z1 && z < z2;
      return { adentro, material: materialToon(adentro ? COLORES_PAREDES[piso] : COLOR_EXTERIOR) };
    };
    const colorDelLado = (x, z) => ladoDe(x, z).material;

    // Las puntas del tramo también: si del otro lado de la punta es afuera, van del color
    // exterior (si no, una pared interior "asoma" con su color en la fachada); si es el
    // marco de una puerta, van del color de la habitación.
    let medidas, colores, lados;
    if (vaEnX) {
      medidas = { x: centro, z: fijo, ancho: largo, prof: GROSOR_PARED };
      const sur = colorDelLado(centro, fijo + 0.3);
      const norte = colorDelLado(centro, fijo - 0.3);
      const puntaEste = colorDelLado(hasta + 0.3, fijo);
      const puntaOeste = colorDelLado(desde - 0.3, fijo);
      colores = [puntaEste, puntaOeste, sur, sur, sur, norte]; // orden: +x, -x, +y, -y, +z, -z
      lados = [[0, 1, ladoDe(centro, fijo + 0.3)], [0, -1, ladoDe(centro, fijo - 0.3)]];
    } else {
      medidas = { x: fijo, z: centro, ancho: GROSOR_PARED, prof: largo };
      const este = colorDelLado(fijo + 0.3, centro);
      const oeste = colorDelLado(fijo - 0.3, centro);
      const puntaSur = colorDelLado(fijo, hasta + 0.3);
      const puntaNorte = colorDelLado(fijo, desde - 0.3);
      colores = [este, oeste, este, este, puntaSur, puntaNorte];
      lados = [[1, 0, ladoDe(fijo + 0.3, centro)], [-1, 0, ladoDe(fijo - 0.3, centro)]];
    }
    const pared = this.agregarCaja({ ...medidas, y, alto, material: colores, solido: true });
    this.uvEnMetros(pared);

    // Zócalo (si el tramo arranca en el piso) y moldura (si llega al techo), de cada lado de adentro
    const techo = base + ALTURA_PISO - GROSOR_PISO - 0.02;
    for (const [dx, dz, lado] of lados) {
      if (!lado.adentro) continue;
      const pegado = (grosor) => ({
        x: vaEnX ? centro : fijo + dx * (GROSOR_PARED / 2 + grosor / 2),
        z: vaEnX ? fijo + dz * (GROSOR_PARED / 2 + grosor / 2) : centro,
        ancho: vaEnX ? largo : grosor,
        prof: vaEnX ? grosor : largo,
      });
      const colorZocalo = piso < 0 ? '#3d3a45' : '#fffaf0';
      if (y <= base + 0.01) this.agregarCaja({ ...pegado(ZOCALO.grosor), y: base, alto: ZOCALO.alto, color: colorZocalo, sombra: false });
      if (y + alto >= techo) this.agregarCaja({ ...pegado(MOLDURA.grosor), y: techo - MOLDURA.alto, alto: MOLDURA.alto, color: colorZocalo, sombra: false });
    }
  }

  // Material de una cara de pared de adentro: el color del cuarto, con su empapelado si tiene
  // ('rayas', 'flores', 'azulejos', 'ladrillos'...: ver Texturas.js). Se crea uno solo por
  // dibujo y color, y todas las paredes lo comparten (por eso las coordenadas van en metros).
  materialDePared(color, dibujo) {
    if (!dibujo) return materialToon(color);
    const clave = `${dibujo}|${color}`;
    if (!this.materialesDePared.has(clave)) this.materialesDePared.set(clave, materialConTextura(color, textura(dibujo, 1, 1)));
    return this.materialesDePared.get(clave);
  }

  // Coordenadas de textura "en metros": cada vértice toma su posición en el mundo. Así el dibujo
  // del empapelado mide siempre 1 m, sin importar el largo del tramo (y todos los tramos comparten
  // el mismo material). Según hacia dónde mira cada cara, usamos dos de las tres coordenadas.
  uvEnMetros(malla) {
    const posicion = malla.geometry.attributes.position;
    const normal = malla.geometry.attributes.normal;
    const uv = malla.geometry.attributes.uv;
    const p = malla.position;
    for (let i = 0; i < posicion.count; i++) {
      const x = posicion.getX(i) + p.x;
      const y = posicion.getY(i) + p.y;
      const z = posicion.getZ(i) + p.z;
      if (Math.abs(normal.getY(i)) > 0.5) uv.setXY(i, x, z); // arriba y abajo
      else if (Math.abs(normal.getX(i)) > 0.5) uv.setXY(i, z, y); // caras que miran a ±X
      else uv.setXY(i, x, y); // caras que miran a ±Z
    }
    uv.needsUpdate = true;
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
    for (const datos of PUERTAS) this.agregarPuerta(datos);
  }

  // Crea una puerta (o rejilla, tabla, estante secreto: ver Door.js) y la registra
  agregarPuerta(datos) {
    const puerta = new Door(this.scene, {
      ...datos,
      y: this.alturaDePiso(datos.piso),
      ancho: datos.ancho ?? ANCHO_PUERTA,
      alto: datos.alto ?? ALTO_PUERTA,
    });
    this.puertas.push(puerta);
    this.obstaculos.push(puerta.bisagra);
    if (puerta.deCalle) this.puertaDeCalle = puerta;
    return puerta;
  }

  // Cada escalera tiene 3 partes:
  //  1. Una RAMPA invisible: es lo que pisa el jugador (así no hace falta física de escalones).
  //  2. ESCALONES de decoración (lo que se ve) y dos vigas a los costados.
  //  3. REBANADAS invisibles de colisión: para no atravesar la escalera por los costados.
  // Los escalones y las rebanadas son finitos (no llegan hasta el piso): así debajo de una
  // escalera puede pasar otra, o se puede caminar por abajo de la parte alta.
  //
  // Si es PLEGABLE (la del ático, que sube hacia +Z), todo se arma adentro de un grupo que gira
  // sobre la punta de arriba (la bisagra): girándolo, la escalera se pliega contra el techo.
  crearEscalera({ pisoAbajo, inicio: [x0, z0], dir, largo, ancho, plegable = false }) {
    const base = this.alturaDePiso(pisoAbajo);
    const altura = ALTURA_PISO;
    const enX = dir === 'x';
    // Un punto sobre el eje de la escalera, a "d" metros del pie: [x, z]
    const punto = (d) => (enX ? [x0 + d, z0] : [x0, z0 + d]);
    // Una caja alineada con la escalera: "largoCaja" a lo largo, "anchoCaja" de costado
    const medidas = (largoCaja, anchoCaja) => (enX ? { ancho: largoCaja, prof: anchoCaja } : { ancho: anchoCaja, prof: largoCaja });

    // Plegable: la bisagra está en la punta de arriba. Adentro va un "contenedor" corrido al revés,
    // así las piezas se pueden ubicar con coordenadas del mundo como siempre.
    let bisagra = null;
    let contenedor = null;
    const [px, pz] = punto(largo);
    if (plegable) {
      bisagra = new THREE.Group();
      bisagra.position.set(px, base + altura, pz);
      contenedor = new THREE.Group();
      contenedor.position.set(-px, -(base + altura), -pz);
      bisagra.add(contenedor);
      this.scene.add(bisagra);
    }
    // Pone una pieza en su lugar: en la escena, o adentro de la escalera plegable (que se mueve)
    const ubicar = (malla) => {
      if (!plegable) return;
      contenedor.add(malla); // (la saca de la escena)
      malla.userData.estatico = false;
    };

    // 1. Rampa: una caja finita inclinada
    const largoReal = Math.hypot(largo, altura); // hipotenusa
    const inclinacion = Math.atan2(altura, largo);
    const rampa = new THREE.Mesh(new THREE.BoxGeometry(enX ? largoReal : ancho, 0.1, enX ? ancho : largoReal), materialToon('#f15bb5'));
    const [cx, cz] = punto(largo / 2);
    rampa.position.set(cx, base + altura / 2, cz);
    // La inclinamos: si sube hacia +X gira sobre Z; si sube hacia +Z gira sobre X (al revés)
    if (enX) rampa.rotation.z = inclinacion;
    else rampa.rotation.x = -inclinacion;
    rampa.visible = false; // los rayos la detectan igual aunque no se vea
    rampa.updateMatrixWorld();
    this.scene.add(rampa);
    ubicar(rampa);
    this.floors.push(rampa);

    // 2. Escalones: tablones cada vez más altos (de 25 cm de grueso)
    const cantidadEscalones = Math.round(largo / 0.5);
    const huella = largo / cantidadEscalones; // profundidad de cada escalón
    const contrahuella = altura / cantidadEscalones; // alto de cada escalón
    for (let i = 0; i < cantidadEscalones; i++) {
      const arriba = contrahuella * (i + 1);
      const grueso = Math.min(arriba, 0.25);
      const [ex, ez] = punto(huella * (i + 0.5));
      const escalon = this.agregarCaja({
        x: ex, y: base + arriba - grueso, z: ez, ...medidas(huella, ancho - 0.1), alto: grueso,
        color: i % 2 === 0 ? '#c68642' : '#b5733a',
      });
      ubicar(escalon);
    }
    // Vigas de los costados (zancas): tablas inclinadas debajo de los bordes de los escalones
    for (const lado of [-1, 1]) {
      // (no más gruesas que los escalones: así la escalera plegada del ático queda al ras del techo)
      const viga = new THREE.Mesh(new THREE.BoxGeometry(enX ? largoReal : 0.08, 0.25, enX ? 0.08 : largoReal), materialToon('#8d5524'));
      viga.position.set(cx + (enX ? 0 : lado * (ancho / 2 - 0.04)), base + altura / 2 - 0.13, cz + (enX ? lado * (ancho / 2 - 0.04) : 0));
      viga.rotation.copy(rampa.rotation);
      viga.castShadow = true;
      viga.userData.estatico = true;
      viga.updateMatrixWorld();
      this.scene.add(viga);
      ubicar(viga);
      this.obstaculos.push(viga);
    }

    // 3. Rebanadas de colisión: cada una llega hasta la altura de la rampa en su borde más bajo
    // (así quedan siempre por DEBAJO de la superficie y no molestan al subir) y mide medio metro
    // de alto. (Una sola caja AABB no sirve: sería tan alta como toda la rampa y no se podría subir.)
    const ANCHO_REBANADA = 0.25;
    const cantidad = Math.ceil(largo / ANCHO_REBANADA);
    const rebanadas = [];
    for (let i = 1; i < cantidad; i++) {
      const d0 = i * ANCHO_REBANADA;
      const d1 = Math.min(d0 + ANCHO_REBANADA, largo);
      const arriba = base + (altura * d0) / largo; // altura de la rampa en d0
      const [ax, az] = punto(d0);
      const [bx, bz] = punto(d1);
      const mitad = ancho / 2;
      rebanadas.push(
        new THREE.Box3(
          new THREE.Vector3(enX ? ax : ax - mitad, Math.max(base, arriba - 0.5), enX ? az - mitad : az),
          new THREE.Vector3(enX ? bx : bx + mitad, arriba, enX ? bz + mitad : bz),
        ),
      );
    }
    if (!plegable) {
      this.colliders.push(...rebanadas);
      return;
    }

    // Escalera plegable: la maneja la Trampilla (Especiales.js). Plegada, la escalera gira hasta
    // quedar acostada: el mismo ángulo que su inclinación.
    const [ix, iz] = punto(0);
    this.trampilla = new Trampilla(this, {
      bisagra,
      rebanadas,
      anguloPlegada: inclinacion,
      haciaAbajo: new THREE.Vector3(0, -altura, -largo),
      abajo: new THREE.Vector3(ix, base, iz - 0.8),
      arriba: new THREE.Vector3(px, base + altura, pz + 0.8),
      zona: new THREE.Box3(new THREE.Vector3(ix - ancho / 2, base, iz), new THREE.Vector3(ix + ancho / 2, base + altura + 0.3, pz)),
    });
  }

  // ------------------------------------------------------------
  //  CONDUCTOS, TÚNEL Y PUENTE (etapa 11B)
  // ------------------------------------------------------------
  // Un conducto de ventilación es un "caño" cuadrado de chapa, a ras del piso, que atraviesa una
  // pared: dos costados, un techo y una rejilla en cada punta (que se abre con E como una puerta).
  // Solo se pasa agachado, el dueño no entra, y moverse adentro hace ruido metálico (ver Game.js).
  crearConducto({ piso, desde, hasta }) {
    const base = this.alturaDePiso(piso);
    const { enX, a, b, fijo } = this.medidasDeConducto(desde, hasta);
    this.crearCaño(base, enX, a, b, fijo, '#9aa5b1', true);
    // Rejillas en las dos puntas
    for (const punta of [a, b]) {
      this.agregarPuerta({ piso, x: enX ? punta : fijo, z: enX ? fijo : punta, eje: enX ? 'z' : 'x', ...PUERTITA, estilo: 'rejilla', soloJugador: true });
    }
    this.conductos.push(this.rectanguloDeCaño(piso, enX, a, b, fijo));
  }

  // El túnel secreto: igual que un conducto pero de tierra, afuera y bajo tierra. Arranca en la pared
  // del sótano (tapado por una tabla floja) y termina en el fondo del pozo del jardín, donde no tiene
  // techo (arriba está el caño del pozo) y te podés parar.
  crearTunel({ piso, desde, hasta }) {
    const base = this.alturaDePiso(piso);
    const { enX, a, b, fijo } = this.medidasDeConducto(desde, hasta);
    const inicio = a + GROSOR_PARED / 2; // del otro lado de la pared
    const finDelTecho = POZO.x - 0.5; // donde empieza el fondo del pozo
    // Piso de tierra (se pisa)
    this.agregarCaja({ x: (inicio + b) / 2, y: base - GROSOR_PISO, z: fijo, ancho: b - inicio, alto: GROSOR_PISO, prof: ANCHO_CONDUCTO, color: '#5c4033', suelo: true, sombra: false });
    // Costados y techo (el techo solo hasta el pozo)
    this.crearCaño(base, enX, inicio, b, fijo, '#6b4f3a', false);
    this.agregarCaja({ x: (inicio + finDelTecho) / 2, y: base + ALTO_CONDUCTO - 0.1, z: fijo, ancho: finDelTecho - inicio, alto: 0.1, prof: ANCHO_CONDUCTO, color: '#6b4f3a', solido: true });
    // Pared del fondo
    this.agregarCaja({ x: b + 0.05, y: base, z: fijo, ancho: 0.1, alto: 2.6, prof: ANCHO_CONDUCTO, color: '#6b4f3a', solido: true });
    // Marcos de madera cada 1.2 m (como en las minas; solo decoración)
    for (let x = inicio + 0.6; x < finDelTecho; x += 1.2) {
      for (const lado of [-1, 1]) this.agregarCaja({ x, y: base, z: fijo + lado * 0.37, ancho: 0.1, alto: 1.15, prof: 0.06, color: '#8d5524' });
      this.agregarCaja({ x, y: base + 1.07, z: fijo, ancho: 0.1, alto: 0.08, prof: 0.8, color: '#8d5524' });
    }
    // La tabla floja en la pared del sótano
    this.agregarPuerta({ piso, x: a, z: fijo, eje: 'z', ...PUERTITA, estilo: 'tabla', soloJugador: true });
    this.tuneles.push(this.rectanguloDeCaño(piso, enX, inicio, b, fijo));
  }

  // Los costados (y el techo, si conTecho) de un caño a ras del piso, de "a" hasta "b"
  crearCaño(base, enX, a, b, fijo, color, conTecho) {
    const caja = (lateral, y, alto, anchoLateral) =>
      this.agregarCaja({
        x: enX ? (a + b) / 2 : fijo + lateral,
        z: enX ? fijo + lateral : (a + b) / 2,
        ancho: enX ? b - a : anchoLateral,
        prof: enX ? anchoLateral : b - a,
        y, alto, color, solido: true,
      });
    const mitad = ANCHO_CONDUCTO / 2;
    caja(-mitad + 0.05, base, ALTO_CONDUCTO, 0.1);
    caja(mitad - 0.05, base, ALTO_CONDUCTO, 0.1);
    if (conTecho) caja(0, base + ALTO_CONDUCTO - 0.1, 0.1, ANCHO_CONDUCTO);
  }

  // Un conducto va en línea recta: ¿a lo largo de X o de Z?, de dónde a dónde y en qué línea
  medidasDeConducto([x1, z1], [x2, z2]) {
    const enX = z1 === z2;
    return {
      enX,
      a: Math.min(enX ? x1 : z1, enX ? x2 : z2),
      b: Math.max(enX ? x1 : z1, enX ? x2 : z2),
      fijo: enX ? z1 : x1,
    };
  }

  // El rectángulo de adentro de un caño (para saber si alguien está adentro)
  rectanguloDeCaño(piso, enX, a, b, fijo) {
    const m = ANCHO_CONDUCTO / 2 - 0.1;
    return enX ? { piso, x1: a, z1: fijo - m, x2: b, z2: fijo + m } : { piso, x1: fijo - m, z1: a, x2: fijo + m, z2: b };
  }

  // Las paredes que atraviesa un conducto necesitan un agujero (como el de una puerta, pero bajito)
  huecosDeConducto({ piso, desde, hasta }) {
    const { enX, a, b, fijo } = this.medidasDeConducto(desde, hasta);
    const entre = (v, m, n) => v > Math.min(m, n) && v < Math.max(m, n);
    return PAREDES.filter((p) => p.piso === piso)
      .filter((p) => (enX ? p.x1 === p.x2 && entre(p.x1, a, b) && entre(fijo, p.z1, p.z2) : p.z1 === p.z2 && entre(p.z1, a, b) && entre(fijo, p.x1, p.x2)))
      .map((p) => ({ piso, x: enX ? p.x1 : fijo, z: enX ? fijo : p.z1, eje: enX ? 'z' : 'x', ancho: ANCHO_CONDUCTO, abajo: 0, arriba: ALTO_CONDUCTO }));
  }

  // ¿La posición está adentro de un conducto? ¿Y del túnel?
  enConducto(posicion) {
    return this.adentroDe(this.conductos, posicion);
  }

  enTunel(posicion) {
    return this.adentroDe(this.tuneles, posicion);
  }

  adentroDe(rectangulos, { x, y, z }) {
    return rectangulos.some((r) => {
      const base = this.alturaDePiso(r.piso);
      return x > r.x1 && x < r.x2 && z > r.z1 && z < r.z2 && y > base - 0.3 && y < base + 1;
    });
  }

  // Puente: tablones sobre un vacío, sin baranda (si te caés, aterrizás abajo con ruido)
  crearPuente({ piso, x1, z1, x2, z2 }) {
    const base = this.alturaDePiso(piso);
    const ancho = x2 - x1;
    const prof = z2 - z1;
    const tablones = materialConTextura('#a0522d', textura('madera', ancho / 2, prof / 2));
    this.agregarCaja({ x: (x1 + x2) / 2, y: base - 0.12, z: (z1 + z2) / 2, ancho, alto: 0.12, prof, material: tablones, suelo: true });
    // Dos vigas debajo, a lo largo, y tablas cruzadas (decoración)
    const aLoLargoDeZ = prof > ancho;
    for (const lado of [-1, 1]) {
      this.agregarCaja({
        x: aLoLargoDeZ ? (x1 + x2) / 2 + lado * (ancho / 2 - 0.05) : (x1 + x2) / 2,
        z: aLoLargoDeZ ? (z1 + z2) / 2 : (z1 + z2) / 2 + lado * (prof / 2 - 0.05),
        y: base - 0.3, alto: 0.18, ancho: aLoLargoDeZ ? 0.1 : ancho, prof: aLoLargoDeZ ? prof : 0.1, color: '#6f4518',
      });
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

  // Un mueble es un grupo de formas básicas (sus "partes" en el catálogo).
  //   alReves: el mueble cuelga del techo, dado vuelta (el cuarto al revés). No se choca.
  //   patasArriba: dado vuelta pero apoyado en el piso.
  //   y: altura extra (para apoyarlo arriba de otro mueble, o colgarlo en la pared)
  //   escala: [x, y, z] para estirarlo (ej: una alfombra larga)
  //   colores: { nombre: color } para las partes cuyo color es '$nombre' (ej: la tela de las cortinas)
  agregarMueble({ tipo, piso, x, z, rot = 0, alReves = false, patasArriba = false, y = 0, escala = null, colores = {} }) {
    const def = MUEBLES[tipo];
    const grupo = new THREE.Group();
    const colorDe = (color) => (color.startsWith('$') ? colores[color.slice(1)] ?? def.colores?.[color.slice(1)] ?? '#ffffff' : color);
    // '@vidrio': el vidrio de las ventanas de adentro (un material propio, que cambia con el turno)
    const materialDe = (color) => (color === '@vidrio' ? materialVidrioAdentro : materialToon(colorDe(color)));

    for (const [px, py, pz, ancho, alto, prof, color, forma] of def.partes) {
      const parte = new THREE.Mesh(geometriaDeParte(forma, ancho, alto, prof), materialDe(color));
      parte.position.set(px, py + alto / 2, pz);
      parte.castShadow = def.sombra !== false;
      parte.receiveShadow = true;
      grupo.add(parte);
    }

    // Medimos el mueble ANTES de rotarlo: esa es la caja donde va a encajar el modelo GLTF
    const cajaLocal = new THREE.Box3().setFromObject(grupo);
    const centro = cajaLocal.getCenter(new THREE.Vector3());
    const tamaño = cajaLocal.getSize(new THREE.Vector3());

    // Las partes "fijas" van después de medir (el modelo no tiene que estirarse para cubrirlas)
    // y quedan aunque cargue el modelo
    for (const [px, py, pz, ancho, alto, prof, color, forma] of def.fijas || []) {
      const parte = new THREE.Mesh(geometriaDeParte(forma, ancho, alto, prof), materialToon(colorDe(color)));
      parte.position.set(px, py + alto / 2, pz);
      parte.castShadow = def.sombra !== false;
      parte.receiveShadow = true;
      parte.userData.fija = true;
      grupo.add(parte);
    }

    const base = this.alturaDePiso(piso) + y;
    grupo.position.set(x, base, z);
    grupo.rotation.y = THREE.MathUtils.degToRad(rot);
    if (escala) grupo.scale.set(...escala);
    if (alReves || patasArriba) {
      // Dado vuelta: media vuelta sobre X. Las partes quedan "colgando" hacia abajo del origen,
      // así que el origen va al techo (alReves) o a la altura del mueble (patasArriba)
      grupo.rotation.x = Math.PI;
      // (un poquito debajo del techo, para que no quede pegado a la placa blanca y "titile")
      grupo.position.y = alReves ? base + ALTURA_PISO - GROSOR_PISO - 0.04 : base + cajaLocal.max.y;
    }
    grupo.updateMatrixWorld(true);
    this.scene.add(grupo);
    this.obstaculos.push(grupo);

    // La caja de colisión es la caja que envuelve a todo el mueble (los del techo no chocan)
    let collider = null;
    if (def.solido !== false && !alReves) {
      collider = new THREE.Box3().setFromObject(grupo);
      this.colliders.push(collider);
    }
    const mueble = { tipo, piso, grupo, collider, escondite: def.escondite || null };
    this.muebles.push(mueble);
    if (mueble.escondite && collider) this.escondites.push(mueble); // (la mesa del cuarto al revés no)

    // Cuando el mueble tenga su forma final (modelo o formas básicas), sus mallas se marcan como
    // estáticas, en la "capa" de su piso, para juntarlas con las de los otros muebles del piso
    const marcarEstatico = () =>
      grupo.traverse((m) => {
        if (!m.isMesh) return;
        m.userData.estatico = true;
        m.userData.capa = `piso${piso}`;
      });

    // Si el mueble tiene modelo(s) GLTF, los cargamos y reemplazamos las cajas.
    // Mientras cargan (o si fallan) se sigue viendo la versión con cajas.
    const piezas = def.modelos || (def.modelo && [
      { archivo: def.modelo, caja: [centro.x, cajaLocal.min.y, centro.z, tamaño.x, tamaño.y, tamaño.z] },
    ]);
    if (piezas) {
      const carga = cargarPiezas(piezas)
        .then((modelo) => {
          modelo.traverse((hijo) => (hijo.castShadow = def.sombra !== false));
          grupo.remove(...grupo.children.filter((parte) => !parte.userData.fija)); // sacamos las cajas
          grupo.add(modelo);
          grupo.updateMatrixWorld(true);
        })
        .catch(() => console.warn(`No se pudo cargar el modelo de "${tipo}": queda la forma básica`))
        .finally(marcarEstatico);
      this.cargas.push(carga);
    } else {
      marcarEstatico();
    }
    return grupo;
  }

  // El ático está adentro del techo a dos aguas (el techo de afuera lo arma Exterior.js).
  // Acá armamos:
  //  1. El techo visto desde adentro: igual al de afuera pero un poco más chico, con el material
  //     del lado de atrás (BackSide), así se ve solo desde adentro.
  //  2. Las colisiones del techo inclinado: franjas (como las rebanadas de la escalera). Cada franja
  //     empieza a la altura del techo en su mitad: cerca de los bordes el techo queda tan bajo
  //     que hay que agacharse, y más cerca todavía no se puede pasar.
  //  3. Las paredes de las puntas (hastiales), invisibles: lo que se ve es el techo de adentro.
  crearAtico() {
    const { y, alto, mitad, x1, x2 } = TECHO;
    const MARGEN = 0.12; // cuánto más chico es el techo de adentro

    // 1. Techo por dentro (tablas de madera)
    const medidas = { y, alto: alto - MARGEN, mitad: mitad - MARGEN, x1: x1 + MARGEN / 2, x2: x2 - MARGEN / 2 };
    const madera = materialConTextura('#b08968', textura('madera', (x2 - x1) / 2, 4));
    madera.side = THREE.BackSide;
    const techoAdentro = crearTechoDosAguas(medidas, madera, madera);
    techoAdentro.traverse((m) => {
      m.receiveShadow = true;
      m.userData.outlineParameters = { visible: false }; // sin bordes negros (se ven raros de adentro)
    });
    this.scene.add(techoAdentro);
    const largo = x2 - x1 - MARGEN;
    // Una viga en la cumbrera, para que se note la forma del techo
    this.agregarCaja({ x: 0, y: y + alto - MARGEN - 0.3, z: 0, ancho: largo, alto: 0.2, prof: 0.2, color: '#6f4518', sombra: false });

    // 2. Franjas de colisión del techo inclinado (desde 3 m del centro hasta el alero, de los dos lados)
    const FRANJA = 0.25;
    for (let d = 3; d < mitad; d += FRANJA) {
      const alturaTecho = y + alto * (1 - (d + FRANJA / 2) / mitad);
      for (const lado of [-1, 1]) {
        const zA = lado * d;
        const zB = lado * (d + FRANJA);
        this.colliders.push(
          new THREE.Box3(
            new THREE.Vector3(x1, alturaTecho, Math.min(zA, zB)),
            new THREE.Vector3(x2, y + alto + 1, Math.max(zA, zB)),
          ),
        );
      }
    }

    // 3. Paredes invisibles en las puntas
    this.colliders.push(new THREE.Box3(new THREE.Vector3(x1 - 0.3, y, -mitad), new THREE.Vector3(x1 + 0.05, y + alto, mitad)));
    this.colliders.push(new THREE.Box3(new THREE.Vector3(x2 - 0.05, y, -mitad), new THREE.Vector3(x2 + 0.3, y + alto, mitad)));
  }

  // Lamparitas: luces puntuales propias de algunos pisos (el sótano y el ático).
  // Las que parpadean cambian de intensidad al azar en update().
  crearLamparitas() {
    for (const datos of LUCES) {
      const luz = new THREE.PointLight(datos.color, datos.intensidad, datos.distancia, 2);
      luz.position.set(datos.x, this.alturaDePiso(datos.piso) + datos.y, datos.z);
      this.scene.add(luz);
      // Una bombita colgando (sin luces ni sombras: siempre se ve encendida)
      const bombita = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: datos.color }));
      bombita.position.copy(luz.position);
      bombita.userData.outlineParameters = { visible: false };
      this.scene.add(bombita);
      const cable = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.02), materialToon('#222222'));
      cable.position.set(luz.position.x, luz.position.y + 0.3, luz.position.z);
      cable.userData.estatico = true;
      this.scene.add(cable);
      this.lamparitas.push({ luz, bombita, intensidad: datos.intensidad, parpadea: !!datos.parpadea, fuego: !!datos.fuego, tiempo: 0 });
    }
  }

  // Parpadeo: cada tanto la lamparita se apaga un instante o baja de golpe (efecto de película de terror)
  actualizarLamparitas(dt) {
    for (const l of this.lamparitas) {
      if (!l.parpadea || this.corriente < 1) continue; // (sin luz, las maneja ponerCorriente)
      l.tiempo -= dt;
      if (l.tiempo > 0) continue;
      const apagon = Math.random() < 0.25;
      l.luz.intensity = apagon ? 0 : l.intensidad * (0.6 + Math.random() * 0.4);
      l.bombita.visible = !apagon;
      l.tiempo = apagon ? 0.05 + Math.random() * 0.15 : 0.1 + Math.random() * 0.6;
    }
  }

  // Corte de luz (etapa 16C): de 0 (cortada) a 1 (normal). El fuego de la caldera sigue igual.
  ponerCorriente(corriente) {
    this.corriente = corriente;
    for (const l of this.lamparitas) {
      if (l.fuego) continue;
      l.luz.intensity = l.intensidad * corriente;
      l.bombita.visible = corriente > 0.5;
    }
  }

  // Rendimiento: dibujamos solo los muebles del piso donde está el jugador y de los pisos
  // de al lado. Los demás igual siguen tapando la vista del dueño y chocando (solo no se dibujan).
  mostrarPisosCercanos(piso) {
    if (piso === this.pisoVisible) return;
    this.pisoVisible = piso;
    for (const mueble of this.muebles) mueble.grupo.visible = Math.abs(mueble.piso - piso) <= 1;
    for (const [pisoMuebles, mallas] of Object.entries(this.juntadosPorPiso)) {
      for (const malla of mallas) malla.visible = Math.abs(pisoMuebles - piso) <= 1;
    }
  }

  // Game avisa qué mallas juntadas salieron de los muebles de cada piso (capas 'piso-1', 'piso0'...)
  registrarJuntados(porCapa) {
    for (const [capa, mallas] of porCapa) {
      if (!capa.startsWith('piso')) continue;
      const piso = Number(capa.slice(4));
      this.juntadosPorPiso[piso] = [...(this.juntadosPorPiso[piso] || []), ...mallas];
    }
    // Volvemos a aplicar qué pisos se ven, ahora con las mallas nuevas
    const actual = this.pisoVisible;
    this.pisoVisible = null;
    if (actual !== undefined && actual !== null) this.mostrarPisosCercanos(actual);
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
    this.trampilla?.update(dt);
    this.actualizarLamparitas(dt);
  }

  // Deja la casa como al principio (cada puerta como arranca: cerrada, abierta o con llave)
  reiniciar() {
    for (const puerta of this.puertas) puerta.reiniciar();
    this.trampilla?.reiniciar();
  }

  // Saca una caja de colisión (ej: cuando se abre el portón del garaje)
  quitarCollider(caja) {
    this.colliders = this.colliders.filter((c) => c !== caja);
  }

  // ¿La caja dada choca con una pared, un mueble o una puerta cerrada?
  // ignorar (opcional): un collider que no cuenta (la abuela atraviesa su propia mecedora)
  chocaCon(caja, ignorar = null) {
    for (const collider of this.colliders) {
      if (collider !== ignorar && caja.intersectsBox(collider)) return true;
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
  sePuedeCaminar(desde, hasta, radio, ignorar = null) {
    const distancia = Math.hypot(hasta.x - desde.x, hasta.z - desde.z);
    // Más empinado que la escalera más empinada (la del ático: 3 m de alto en 4 m) no se puede
    // caminar. Sin esto, dos puntos uno encima del otro en pisos distintos "parecen" conectados.
    if (Math.abs(hasta.y - desde.y) > distancia * 0.8 + 0.6) return false;
    const pasos = Math.max(1, Math.ceil(distancia / 0.3));
    const punto = new THREE.Vector3();
    const caja = new THREE.Box3();

    for (let i = 0; i <= pasos; i++) {
      punto.lerpVectors(desde, hasta, i / pasos);
      const suelo = this.alturaDelSuelo(punto, 0.5);
      if (suelo === null || Math.abs(suelo - punto.y) > 0.6) return false; // no hay piso o es otro piso

      caja.min.set(punto.x - radio, suelo + 0.35, punto.z - radio);
      caja.max.set(punto.x + radio, suelo + 1.8, punto.z + radio);
      if (this.colliders.some((collider) => collider !== ignorar && caja.intersectsBox(collider))) return false;
    }
    return true;
  }

  // Escondites que no son muebles de la casa (los arbustos y los tachos de afuera, ver Exterior.js).
  // También tapan la vista de los enemigos.
  agregarEscondite(tipo, grupo, collider) {
    this.escondites.push({ escondite: tipo, grupo, collider });
    this.obstaculos.push(grupo);
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
  // filtro (opcional): qué puertas cuentan (ej: el dueño no usa las rejillas de los conductos)
  puertaCercana(posicion, direccion, distanciaMax = DISTANCIA_INTERACCION, filtro = null) {
    let mejor = null;
    let mejorDistancia = distanciaMax;
    const haciaPuerta = new THREE.Vector3();
    const mirada = new THREE.Vector3(direccion.x, 0, direccion.z).normalize();

    for (const puerta of this.puertas) {
      if (filtro && !filtro(puerta)) continue;
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

// La geometría de una parte de mueble según su forma (ancho, alto y prof son las medidas de su caja)
function geometriaDeParte(forma, ancho, alto, prof) {
  if (forma === 'cilindro') {
    const geometria = new THREE.CylinderGeometry(ancho / 2, ancho / 2, alto, 16);
    geometria.scale(1, 1, prof / ancho); // si prof ≠ ancho queda ovalado
    return geometria;
  }
  if (forma === 'esfera') {
    const geometria = new THREE.SphereGeometry(ancho / 2, 16, 12);
    geometria.scale(1, alto / ancho, prof / ancho); // esfera "estirada" hasta ocupar la caja
    return geometria;
  }
  return new THREE.BoxGeometry(ancho, alto, prof);
}

// Techo a dos aguas SIN base: 2 faldones (planos inclinados) y 2 puntas (triángulos).
// (Un prisma cerrado, como ExtrudeGeometry, tiene una cara abajo, a la altura del piso del ático,
// que tapa el hueco de la escalera.) Lo usan Exterior (el de afuera) y crearAtico (el de adentro).
export function crearTechoDosAguas({ y, alto, mitad, x1, x2 }, materialFaldon, materialPunta) {
  const grupo = new THREE.Group();
  const inclinado = Math.hypot(mitad, alto); // largo de cada faldón, de la cumbrera al alero
  const angulo = Math.atan2(alto, mitad);
  for (const lado of [-1, 1]) {
    // Un plano (mira hacia +Z) que giramos sobre X hasta que quede inclinado hacia su lado
    const faldon = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, inclinado), materialFaldon);
    faldon.position.set((x1 + x2) / 2, y + alto / 2, (lado * mitad) / 2);
    faldon.rotation.x = lado > 0 ? angulo - Math.PI / 2 : -(Math.PI / 2 + angulo);
    grupo.add(faldon);
    // Triángulo de la punta, mirando hacia afuera (±X)
    const forma = new THREE.Shape([new THREE.Vector2(-mitad, 0), new THREE.Vector2(mitad, 0), new THREE.Vector2(0, alto)]);
    const punta = new THREE.Mesh(new THREE.ShapeGeometry(forma), materialPunta);
    punta.position.set(lado > 0 ? x2 : x1, y, 0);
    punta.rotation.y = (lado * Math.PI) / 2;
    grupo.add(punta);
  }
  return grupo;
}
