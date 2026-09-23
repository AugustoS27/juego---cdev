// El dueño de la casa. Funciona con una MÁQUINA DE ESTADOS simple:
//
//   PATRULLA  --(ve al jugador)-->  PERSEGUIR
//   PERSEGUIR --(lo pierde de vista)--> INVESTIGAR (va a la última posición donde lo vio)
//   INVESTIGAR --(llega, mira alrededor y no encuentra nada)--> PATRULLA
//   INVESTIGAR --(ve al jugador)--> PERSEGUIR
//   PATRULLA / INVESTIGAR --(escucha un ruido)--> INVESTIGAR (va al lugar del ruido)
//
// Extras:
//   - Si el jugador está escondido y el dueño pasa cerca, puede sospechar y revisar el escondite.
//   - Al cruzar una puerta, a veces la cierra y la traba unos segundos para cortarle el paso al jugador.
//   - Nunca sale de la casa (¡está en pijama!): si el ruido o el jugador están afuera,
//     va hasta el punto de adentro más cercano.
//
// Para moverse usa los waypoints de HouseData.js: camina en línea recta de uno a otro.
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { cargarPiezas } from './Models.js';
import { WAYPOINTS, CONEXIONES, LIMITES_CASA } from './HouseData.js';

export const ESTADO_DUENO = {
  PATRULLA: 'patrulla',
  INVESTIGAR: 'investigar',
  PERSEGUIR: 'perseguir',
};

// Valores del dueño (fáciles de ajustar)
const VELOCIDADES = { patrulla: 1.6, investigar: 2.6, perseguir: 3.9 }; // m/s (el jugador camina a 3.5 y corre a 6.5)
const RADIO = 0.3;
const ALTURA_OJOS = 1.6;
const DISTANCIA_VISION = 12;
const ANGULO_VISION = THREE.MathUtils.degToRad(55); // mitad del "cono" de visión
const DISTANCIA_SENTIR = 1.5; // tan cerca te nota aunque estés a su espalda
const DISTANCIA_ATRAPAR = 1;
const TIEMPO_MEMORIA = 0.6; // segundos que sigue persiguiendo después de perderte de vista
const ESPERA_EN_PUNTO = 1.5; // segundos que se queda mirando en cada punto de patrulla
const TIEMPO_BUSCANDO = 3; // segundos que busca al llegar a donde te vio (o al ruido)
const VELOCIDAD_GIRO = 8; // radianes por segundo
const DISTANCIA_SOSPECHA = 2.5; // si pasa así de cerca de tu escondite, puede sospechar
const PROBABILIDAD_SOSPECHA = 0.4; // 40% de revisar cada vez que pasa cerca
const PROBABILIDAD_TRABAR = 0.35; // 35% de trabar cada puerta que cruza
const TIEMPO_TRABA = 20; // segundos que queda trabada la puerta
const TIEMPO_MAXIMO_YENDO = 15; // si en 15 s no llegó a donde investigaba, se rinde

const WAYPOINT_INICIAL = 'dormitorio'; // arranca arriba, así el jugador tiene unos segundos
// Habitaciones que recorre al patrullar (elige una al azar cada vez)
const PUNTOS_PATRULLA = ['living', 'cocina', 'comedor', 'baño', 'entrada-este', 'dormitorio', 'hijo', 'baño-arriba', 'estudio'];

// Si ponés acá la ruta a un modelo GLTF (ej: '/models/dueno.glb') se usa ese modelo.
// Si es null o no carga, queda el muñeco hecho con formas básicas.
const URL_MODELO = null;

export class Owner {
  constructor(scene, house, player) {
    this.house = house;
    this.player = player;

    // Waypoints como Vector3 y, para cada uno, la lista de sus vecinos
    this.waypoints = {};
    this.vecinos = {};
    for (const wp of WAYPOINTS) {
      this.waypoints[wp.id] = new THREE.Vector3(...wp.pos);
      this.vecinos[wp.id] = [];
    }
    for (const [a, b] of CONEXIONES) {
      this.vecinos[a].push(b);
      this.vecinos[b].push(a);
    }

    // Modelo 3D: "modelo" es el que se mueve y gira; adentro están el cuerpo y los carteles
    this.modelo = new THREE.Group();
    this.cuerpo = this.crearCuerpo();
    this.modelo.add(this.cuerpo);
    this.cartelVisto = crearCartel('!', '#ff3b30');
    this.cartelDuda = crearCartel('?', '#ffd23f');
    this.modelo.add(this.cartelVisto, this.cartelDuda);
    scene.add(this.modelo);
    if (URL_MODELO) this.cargarModeloGLTF();

    // position es la del modelo: mover al dueño = mover su modelo
    this.position = this.modelo.position;
    this.caja = new THREE.Box3();
    this.ultimaPosicionVista = new THREE.Vector3();
    this.tiempoAnimacion = 0; // avanza solo al caminar (para el balanceo)
    this.tiempoTotal = 0; // avanza siempre (para el rebote de los carteles)
    // Funciones que Game conecta para sonidos y avisos (el dueño solo "avisa" que pasó algo)
    this.alTrabarPuerta = null; // alTrabarPuerta(puerta)
    this.alAbrirPuerta = null; // alAbrirPuerta(puerta)
    this.alCambiarEstado = null; // alCambiarEstado(nuevo, anterior)
    this.alDarPaso = null; // alDarPaso()

    this.reiniciar();
  }

  // Vuelve al punto de partida (al empezar cada partida)
  reiniciar() {
    this.position.copy(this.waypoints[WAYPOINT_INICIAL]);
    this.rotacion = 0; // hacia dónde mira (ángulo en Y)
    this.camino = []; // puntos (Vector3) que le faltan recorrer
    this.espera = 0;
    this.ultimoPuntoPatrulla = WAYPOINT_INICIAL;
    this.tiempoSinVer = 0;
    this.tiempoRecalculo = 0;
    this.tiempoAtascado = 0;
    this.tiempoYendo = 0;
    this.multiplicadorVelocidad = 1; // en la etapa 6 va a ir subiendo con el tiempo
    this.esconditeARevisar = null; // escondite que va a revisar (o null)
    this.encontroAlJugador = false; // true si lo encontró escondido
    this.yaSospecho = false; // para tirar "la moneda" una sola vez por pasada
    this.puertaCruzada = null; // puerta por la que está pasando (para trabarla después)
    this.cambiarEstado(ESTADO_DUENO.PATRULLA);
    this.empezarEspera(1); // se queda un segundo quieto antes de empezar a patrullar
  }

  cambiarEstado(nuevo) {
    const anterior = this.estado;
    this.estado = nuevo;
    if (nuevo !== anterior) this.alCambiarEstado?.(nuevo, anterior);
    this.cartelVisto.visible = nuevo === ESTADO_DUENO.PERSEGUIR;
    this.cartelDuda.visible = nuevo === ESTADO_DUENO.INVESTIGAR;
  }

  velocidad() {
    return VELOCIDADES[this.estado] * this.multiplicadorVelocidad;
  }

  // ------------------------------------------------------------
  //  LOOP
  // ------------------------------------------------------------
  update(dt) {
    // 1. ¿Ve al jugador? En cualquier estado, verlo = perseguirlo
    if (this.puedeVerAlJugador()) {
      this.ultimaPosicionVista.copy(this.player.position);
      this.tiempoSinVer = 0;
      if (this.estado !== ESTADO_DUENO.PERSEGUIR) {
        this.cambiarEstado(ESTADO_DUENO.PERSEGUIR);
        this.tiempoRecalculo = 0;
      }
    } else {
      this.tiempoSinVer += dt;
    }

    // 2. ¿El jugador está escondido cerca? Puede sospechar
    this.sospecharDelEscondite();

    // 3. Qué hace según su estado
    if (this.estado === ESTADO_DUENO.PATRULLA) this.actualizarPatrulla(dt);
    else if (this.estado === ESTADO_DUENO.INVESTIGAR) this.actualizarInvestigar(dt);
    else if (this.estado === ESTADO_DUENO.PERSEGUIR) this.actualizarPersecucion(dt);

    // 4. Puertas: abre las que tiene adelante y a veces traba las que deja atrás
    this.abrirPuertaDeAdelante();
    this.trabarPuertaQueCruzo();

    this.animar(dt);
  }

  // PATRULLA: va a un punto al azar, mira alrededor un rato y elige otro
  actualizarPatrulla(dt) {
    if (this.camino.length > 0) {
      if (this.seguirCamino(dt)) this.empezarEspera(ESPERA_EN_PUNTO);
      return;
    }
    this.mirarAlrededor(dt);
    if (this.espera <= 0) {
      this.irA(this.waypoints[this.puntoDePatrullaAlAzar()]);
    }
  }

  // INVESTIGAR: va al punto sospechoso, busca un rato y vuelve a patrullar
  actualizarInvestigar(dt) {
    if (this.camino.length > 0) {
      // Si tarda demasiado (el lugar no se puede alcanzar), se rinde y busca desde donde está
      this.tiempoYendo += dt;
      if (this.tiempoYendo > TIEMPO_MAXIMO_YENDO) {
        this.camino = [];
        this.esconditeARevisar = null;
        this.empezarEspera(TIEMPO_BUSCANDO);
        return;
      }
      if (this.seguirCamino(dt)) {
        // Llegó. Si venía a revisar un escondite, "lo abre": ¿está el jugador adentro?
        if (this.esconditeARevisar && this.player.escondite === this.esconditeARevisar) {
          this.encontroAlJugador = true;
        }
        this.esconditeARevisar = null;
        this.empezarEspera(TIEMPO_BUSCANDO);
      }
      return;
    }
    this.mirarAlrededor(dt);
    if (this.espera <= 0) this.cambiarEstado(ESTADO_DUENO.PATRULLA);
  }

  // PERSEGUIR: va hacia donde vio al jugador por última vez (recalcula el camino seguido)
  actualizarPersecucion(dt) {
    if (this.tiempoSinVer > TIEMPO_MEMORIA) {
      this.investigar(this.ultimaPosicionVista); // lo perdió: va a donde lo vio por última vez
      return;
    }
    this.tiempoRecalculo -= dt;
    if (this.tiempoRecalculo <= 0) {
      this.irA(this.puntoDentroDeLaCasa(this.ultimaPosicionVista));
      this.tiempoRecalculo = 0.5;
    }
    this.seguirCamino(dt);
  }

  // Manda al dueño a revisar un punto (la usan la persecución y los ruidos)
  investigar(punto) {
    this.cambiarEstado(ESTADO_DUENO.INVESTIGAR);
    this.esconditeARevisar = null;
    this.tiempoYendo = 0;
    this.irA(this.puntoDentroDeLaCasa(punto));
    this.empezarEspera(TIEMPO_BUSCANDO); // por si ya está en el lugar
  }

  // El dueño no sale de la casa. Si el punto está afuera, lo "acercamos" al borde de adentro
  // (a 45 cm de la pared). Si justo ahí hay un mueble, usa el waypoint más cercano.
  puntoDentroDeLaCasa(punto) {
    const { x1, z1, x2, z2 } = LIMITES_CASA;
    const margen = 0.45;
    const adentro = new THREE.Vector3(
      THREE.MathUtils.clamp(punto.x, x1 + margen, x2 - margen),
      punto.y > 1.5 ? 3 : 0, // planta alta o baja
      THREE.MathUtils.clamp(punto.z, z1 + margen, z2 - margen),
    );
    if (adentro.x === punto.x && adentro.z === punto.z) return punto.clone(); // ya estaba adentro

    const caja = new THREE.Box3(
      new THREE.Vector3(adentro.x - RADIO, adentro.y + 0.35, adentro.z - RADIO),
      new THREE.Vector3(adentro.x + RADIO, adentro.y + 1.8, adentro.z + RADIO),
    );
    if (!this.house.colliders.some((c) => caja.intersectsBox(c))) return adentro;
    return this.waypoints[this.waypointMasCercano(adentro)].clone();
  }

  // El waypoint más cercano a un punto. La diferencia de altura "pesa" mucho más,
  // así siempre prefiere uno del mismo piso (si no, podría mandarlo al piso de arriba).
  waypointMasCercano(punto) {
    const distancia = (id) => {
      const wp = this.waypoints[id];
      return Math.hypot(wp.x - punto.x, wp.z - punto.z) + Math.abs(wp.y - punto.y) * 10;
    };
    return Object.keys(this.waypoints).reduce((mejor, id) => (distancia(id) < distancia(mejor) ? id : mejor));
  }

  // ------------------------------------------------------------
  //  RUIDO Y ESCONDITES
  // ------------------------------------------------------------
  // Lo llama el sistema de ruido. Si el ruido llega hasta él, va a investigar.
  // Devuelve true si lo escuchó.
  oirRuido(posicion, radio) {
    if (this.position.distanceTo(posicion) > radio) return false; // no le llega
    if (this.estado === ESTADO_DUENO.PERSEGUIR) return false; // ya te está persiguiendo
    this.investigar(posicion);
    return true;
  }

  // El jugador se acaba de esconder. Si lo estaba persiguiendo, lo vio meterse: va a revisar ahí.
  alEsconderseElJugador(escondite) {
    if (this.estado === ESTADO_DUENO.PERSEGUIR) this.revisarEscondite(escondite);
  }

  // Va hasta donde estaba parado el jugador al esconderse y revisa el escondite
  revisarEscondite(escondite) {
    this.investigar(this.player.posicionAntesDeEsconderse);
    this.esconditeARevisar = escondite;
  }

  // Si pasa cerca del escondite (y lo ve), tira una "moneda cargada": 40% de revisarlo.
  // Tira una sola vez por pasada: tiene que alejarse para volver a tirar.
  sospecharDelEscondite() {
    const escondite = this.player.escondido ? this.player.escondite : null;
    if (!escondite || this.esconditeARevisar || this.estado === ESTADO_DUENO.PERSEGUIR) return;

    const puntoDeEntrada = this.player.posicionAntesDeEsconderse;
    const distancia = Math.hypot(puntoDeEntrada.x - this.position.x, puntoDeEntrada.z - this.position.z);
    const mismoPiso = Math.abs(puntoDeEntrada.y - this.position.y) < 1;
    const ojos = this.position.clone();
    ojos.y += ALTURA_OJOS;
    const loVe = () => this.house.hayVisionEntre(ojos, puntoDeEntrada.clone().setY(puntoDeEntrada.y + 1));
    const cerca = distancia < DISTANCIA_SOSPECHA && mismoPiso && loVe();

    if (cerca && !this.yaSospecho) {
      this.yaSospecho = true;
      if (Math.random() < PROBABILIDAD_SOSPECHA) this.revisarEscondite(escondite);
    } else if (!cerca && distancia > DISTANCIA_SOSPECHA + 1) {
      this.yaSospecho = false;
    }
  }

  // ------------------------------------------------------------
  //  VISIÓN
  // ------------------------------------------------------------
  // Lo ve si: está cerca, está dentro de su cono de visión y no hay nada en el medio.
  puedeVerAlJugador() {
    if (this.player.escondido) return false; // escondido no se lo ve
    const ojos = this.position.clone();
    ojos.y += ALTURA_OJOS;
    const objetivo = this.player.camera.position; // los ojos del jugador

    // 1. Distancia
    const distancia = ojos.distanceTo(objetivo);
    if (distancia > DISTANCIA_VISION) return false;

    // 2. Ángulo: comparamos hacia dónde mira con la dirección hacia el jugador
    if (distancia > DISTANCIA_SENTIR) {
      const haciaJugador = new THREE.Vector3(objetivo.x - ojos.x, 0, objetivo.z - ojos.z).normalize();
      const mirada = new THREE.Vector3(Math.sin(this.rotacion), 0, Math.cos(this.rotacion));
      if (haciaJugador.dot(mirada) < Math.cos(ANGULO_VISION)) return false;
    }

    // 3. Raycast: ¿hay una pared, mueble o piso en el medio?
    return this.house.hayVisionEntre(ojos, objetivo);
  }

  atrapoAlJugador() {
    if (this.encontroAlJugador) return true; // lo encontró escondido
    if (this.player.escondido) return false; // escondido no lo puede tocar
    const p = this.player.position;
    const distancia = Math.hypot(p.x - this.position.x, p.z - this.position.z);
    return distancia < DISTANCIA_ATRAPAR && Math.abs(p.y - this.position.y) < 1;
  }

  // ------------------------------------------------------------
  //  NAVEGACIÓN CON WAYPOINTS
  // ------------------------------------------------------------
  // Arma el camino hasta "destino":
  //  - Si se puede ir derecho, va derecho.
  //  - Si no: waypoint cercano a él -> ...waypoints... -> waypoint cercano al destino -> destino
  irA(destino) {
    const final = destino.clone();
    if (this.house.sePuedeCaminar(this.position, final, RADIO)) {
      this.camino = [final];
      return;
    }

    const inicio = this.waypointAlcanzable(this.position);
    const fin = this.waypointAlcanzable(final);
    this.camino = this.buscarCamino(inicio, fin).map((id) => this.waypoints[id].clone());
    this.camino.push(final);

    // Atajo: si ya puede ir derecho al segundo punto, se saltea el primero
    while (this.camino.length >= 2 && this.house.sePuedeCaminar(this.position, this.camino[1], RADIO)) {
      this.camino.shift();
    }
  }

  // El waypoint más cercano al que se puede llegar caminando en línea recta desde "punto"
  waypointAlcanzable(punto) {
    const ordenados = Object.keys(this.waypoints).sort(
      (a, b) => this.waypoints[a].distanceTo(punto) - this.waypoints[b].distanceTo(punto),
    );
    for (const id of ordenados) {
      if (this.house.sePuedeCaminar(punto, this.waypoints[id], RADIO)) return id;
    }
    return ordenados[0]; // si no hay ninguno (no debería pasar), el más cercano
  }

  // Búsqueda en anchura (BFS): el camino con menos saltos entre dos waypoints.
  // Se recorren los vecinos "por capas" y se anota de dónde se llegó a cada uno.
  buscarCamino(inicio, fin) {
    const vieneDe = { [inicio]: null };
    const cola = [inicio];
    while (cola.length > 0) {
      const actual = cola.shift();
      if (actual === fin) break;
      for (const vecino of this.vecinos[actual]) {
        if (!(vecino in vieneDe)) {
          vieneDe[vecino] = actual;
          cola.push(vecino);
        }
      }
    }
    // Reconstruimos el camino yendo para atrás desde el final
    const camino = [];
    for (let id = fin; id != null; id = vieneDe[id]) camino.unshift(id);
    return camino;
  }

  puntoDePatrullaAlAzar() {
    let id;
    do {
      id = PUNTOS_PATRULLA[Math.floor(Math.random() * PUNTOS_PATRULLA.length)];
    } while (id === this.ultimoPuntoPatrulla);
    this.ultimoPuntoPatrulla = id;
    return id;
  }

  // Avanza hacia el primer punto del camino. Devuelve true cuando terminó el camino.
  seguirCamino(dt) {
    if (this.camino.length === 0) return true;
    const objetivo = this.camino[0];
    if (Math.hypot(objetivo.x - this.position.x, objetivo.z - this.position.z) < 0.2) {
      this.camino.shift();
      return this.camino.length === 0;
    }
    this.moverHacia(objetivo, dt);
    return false;
  }

  // Movimiento en línea recta con colisiones AABB (igual que el jugador: un eje por vez)
  moverHacia(objetivo, dt) {
    const dx = objetivo.x - this.position.x;
    const dz = objetivo.z - this.position.z;
    const distancia = Math.hypot(dx, dz);
    const paso = Math.min(this.velocidad() * dt, distancia); // no pasarse del objetivo
    const antesX = this.position.x;
    const antesZ = this.position.z;

    this.girarHacia(Math.atan2(dx, dz), dt);

    this.position.x += (dx / distancia) * paso;
    if (this.chocaConAlgo()) this.position.x = antesX;
    this.position.z += (dz / distancia) * paso;
    if (this.chocaConAlgo()) this.position.z = antesZ;

    // Pegado al suelo (así sube y baja la escalera)
    const suelo = this.house.alturaDelSuelo(this.position, 0.35);
    if (suelo !== null) this.position.y = suelo;

    // ¿Está trabado contra algo? Si pasa más de 1 segundo, recalcula el camino
    const movido = Math.hypot(this.position.x - antesX, this.position.z - antesZ);
    this.tiempoAtascado = movido < paso * 0.3 ? this.tiempoAtascado + dt : 0;
    if (this.tiempoAtascado > 1) {
      this.tiempoAtascado = 0;
      this.irA(this.camino[this.camino.length - 1]);
    }
  }

  chocaConAlgo() {
    const p = this.position;
    this.caja.min.set(p.x - RADIO, p.y + 0.35, p.z - RADIO);
    this.caja.max.set(p.x + RADIO, p.y + 1.8, p.z + RADIO);
    return this.house.chocaCon(this.caja);
  }

  // Gira de a poco hacia un ángulo (por el lado más corto)
  girarHacia(angulo, dt) {
    let diferencia = angulo - this.rotacion;
    diferencia = Math.atan2(Math.sin(diferencia), Math.cos(diferencia)); // entre -PI y PI
    const maximo = VELOCIDAD_GIRO * dt;
    this.rotacion += THREE.MathUtils.clamp(diferencia, -maximo, maximo);
  }

  empezarEspera(segundos) {
    this.espera = segundos;
    this.anguloBase = this.rotacion;
    this.tiempoMirando = 0;
  }

  // Mientras espera, gira la cabeza (todo el cuerpo) a un lado y al otro
  mirarAlrededor(dt) {
    this.espera -= dt;
    this.tiempoMirando += dt;
    this.rotacion = this.anguloBase + Math.sin(this.tiempoMirando * 2) * 0.9;
  }

  // Abre la puerta cerrada que tiene adelante (si la había trabado él, la destraba: tiene la llave)
  abrirPuertaDeAdelante() {
    const mirada = new THREE.Vector3(Math.sin(this.rotacion), 0, Math.cos(this.rotacion));
    const puerta = this.house.puertaCercana(this.position, mirada, 1.3);
    if (puerta && !puerta.abierta && !puerta.conLlave) {
      puerta.destrabar();
      puerta.alternar();
      this.alAbrirPuerta?.(puerta);
    }
  }

  // Cuando pasa por una puerta, la recuerda. Cuando ya se alejó un poco, a veces
  // la cierra y la traba para cortarle el paso al jugador. (Persiguiendo no, está apurado.)
  trabarPuertaQueCruzo() {
    if (this.estado === ESTADO_DUENO.PERSEGUIR) {
      this.puertaCruzada = null;
      return;
    }

    if (!this.puertaCruzada) {
      // ¿Está parado en el hueco de alguna puerta abierta?
      this.puertaCruzada =
        this.house.puertas.find(
          (p) =>
            p.abierta &&
            !p.conLlave &&
            Math.abs(p.centro.y - 1.1 - this.position.y) < 1 &&
            Math.hypot(p.centro.x - this.position.x, p.centro.z - this.position.z) < 0.6,
        ) || null;
      return;
    }

    const puerta = this.puertaCruzada;
    const distancia = Math.hypot(puerta.centro.x - this.position.x, puerta.centro.z - this.position.z);
    if (distancia < 1.4) return; // todavía está cerca

    this.puertaCruzada = null;
    const jugadorEnElHueco = this.player.obtenerCaja().intersectsBox(puerta.collider);
    if (puerta.abierta && !jugadorEnElHueco && Math.random() < PROBABILIDAD_TRABAR) {
      puerta.trabar(TIEMPO_TRABA);
      this.alTrabarPuerta?.(puerta); // aviso para la UI (lo conecta Game)
    }
  }

  // ------------------------------------------------------------
  //  MODELO Y ANIMACIÓN
  // ------------------------------------------------------------
  // Un señor en bata, pantuflas y gorro de dormir, con un palo de amasar. Mira hacia +Z.
  crearCuerpo() {
    const cuerpo = new THREE.Group();
    const parte = (geometria, color, x, y, z, padre = cuerpo) => {
      const malla = new THREE.Mesh(geometria, materialToon(color));
      malla.position.set(x, y, z);
      malla.castShadow = true;
      padre.add(malla);
      return malla;
    };
    const piel = '#ffcc99';

    // Piernas: cada una cuelga de un "pivote" en la cadera, así se pueden balancear
    this.piernas = [-0.12, 0.12].map((x) => {
      const cadera = new THREE.Group();
      cadera.position.set(x, 0.7, 0);
      cuerpo.add(cadera);
      parte(new THREE.CylinderGeometry(0.09, 0.09, 0.62, 10), '#4c6ef5', 0, -0.33, 0, cadera); // pijama
      parte(new THREE.BoxGeometry(0.16, 0.1, 0.3), '#ff8fab', 0, -0.65, 0.05, cadera); // pantufla
      return cadera;
    });

    // Bata y cinturón
    parte(new THREE.CylinderGeometry(0.26, 0.34, 0.75, 14), '#9b5de5', 0, 1.075, 0);
    parte(new THREE.CylinderGeometry(0.315, 0.315, 0.06, 14), '#f15bb5', 0, 1.0, 0);

    // Brazos (también con pivote en el hombro)
    this.brazos = [-0.32, 0.32].map((x) => {
      const hombro = new THREE.Group();
      hombro.position.set(x, 1.38, 0);
      cuerpo.add(hombro);
      parte(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 8), '#9b5de5', 0, -0.27, 0, hombro);
      parte(new THREE.SphereGeometry(0.08, 10, 8), piel, 0, -0.57, 0, hombro);
      return hombro;
    });
    // Palo de amasar en la mano derecha
    const palo = parte(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 10), '#c68642', 0, -0.6, 0.15, this.brazos[1]);
    palo.rotation.x = Math.PI / 2;

    // Cabeza con nariz grande, ojos, cejas enojadas y bigote
    parte(new THREE.SphereGeometry(0.2, 16, 12), piel, 0, 1.62, 0);
    parte(new THREE.SphereGeometry(0.07, 10, 8), '#ff9e80', 0, 1.6, 0.2);
    for (const lado of [-1, 1]) {
      parte(new THREE.SphereGeometry(0.045, 10, 8), '#ffffff', lado * 0.08, 1.68, 0.16);
      parte(new THREE.SphereGeometry(0.022, 8, 6), '#000000', lado * 0.08, 1.68, 0.2);
      const ceja = parte(new THREE.BoxGeometry(0.1, 0.025, 0.02), '#5d4037', lado * 0.08, 1.75, 0.18);
      ceja.rotation.z = lado * 0.35;
    }
    parte(new THREE.BoxGeometry(0.24, 0.05, 0.05), '#5d4037', 0, 1.53, 0.18);

    // Gorro de dormir con pompón
    const gorro = parte(new THREE.ConeGeometry(0.19, 0.34, 12), '#e4572e', 0, 1.92, 0);
    gorro.rotation.z = -0.35;
    parte(new THREE.SphereGeometry(0.06, 10, 8), '#ffffff', 0.06, 2.08, 0);

    return cuerpo;
  }

  // Reemplaza el muñeco por un modelo GLTF (si falla, queda el muñeco)
  cargarModeloGLTF() {
    cargarPiezas([{ archivo: URL_MODELO, caja: [0, 0, 0, 0.8, 2, 0.6] }], false)
      .then((modelo) => {
        this.cuerpo.clear();
        this.cuerpo.add(modelo);
        this.piernas = [];
        this.brazos = [];
      })
      .catch(() => console.warn(`No se pudo cargar ${URL_MODELO}: queda el dueño hecho con formas básicas`));
  }

  animar(dt) {
    this.modelo.rotation.y = this.rotacion;
    this.tiempoTotal += dt;

    // Balanceo de piernas y brazos al caminar (más rápido cuanto más rápido camina)
    const caminando = this.camino.length > 0;
    if (caminando) {
      // Cada vez que el balanceo da media vuelta (un múltiplo de PI), apoya un pie: ¡paso!
      const pasoAntes = Math.floor(this.tiempoAnimacion / Math.PI);
      this.tiempoAnimacion += dt * this.velocidad() * 3.5;
      if (Math.floor(this.tiempoAnimacion / Math.PI) !== pasoAntes) this.alDarPaso?.();
    }
    const balanceo = caminando ? Math.sin(this.tiempoAnimacion) * 0.6 : 0;
    this.piernas.forEach((pierna, i) => (pierna.rotation.x = i === 0 ? balanceo : -balanceo));
    this.brazos.forEach((brazo, i) => (brazo.rotation.x = i === 0 ? -balanceo : balanceo));

    // Persiguiendo: levanta el palo de amasar y lo agita (¡cómico!)
    if (this.estado === ESTADO_DUENO.PERSEGUIR && this.brazos[1]) {
      this.brazos[1].rotation.x = -2.6 + Math.sin(this.tiempoAnimacion * 2) * 0.4;
    }

    // Los carteles "!" y "?" rebotan arriba de la cabeza
    const rebote = 2.45 + Math.abs(Math.sin(this.tiempoTotal * 6)) * 0.08;
    this.cartelVisto.position.y = rebote;
    this.cartelDuda.position.y = rebote;
  }
}

// Un cartelito (sprite) con un signo dibujado en un canvas. Siempre mira a la cámara.
function crearCartel(texto, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 90px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 64, 70);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
  sprite.scale.set(0.45, 0.45, 1);
  sprite.visible = false;
  return sprite;
}
