// Enemigo: el "esqueleto" que comparten el dueño, los perros y la abuela.
// Cada enemigo es esta misma clase con otros números (velocidad, vista, oído...) y algo propio.
//
// Funciona con una MÁQUINA DE ESTADOS simple:
//
//   PATRULLA   --(ve al jugador)-->  PERSEGUIR
//   PERSEGUIR  --(lo pierde de vista)--> INVESTIGAR (va a la última posición donde lo vio)
//   INVESTIGAR --(llega, mira alrededor y no encuentra nada)--> PATRULLA
//   INVESTIGAR --(ve al jugador)--> PERSEGUIR
//   PATRULLA / INVESTIGAR --(escucha un ruido)--> INVESTIGAR (va al lugar del ruido)
//
// Para moverse usa un grafo de WAYPOINTS (puntos y conexiones entre ellos): camina en línea recta
// de uno a otro, y el camino entre dos puntos lejanos lo busca con una búsqueda en anchura (BFS).
//
// Cada enemigo tiene una ZONA de la que no sale (el dueño, la casa; los perros, el patio;
// la abuela, su piso): si el jugador o un ruido están afuera, va al punto de su zona más cercano.
//
// Lo que cambia en cada uno se sobrescribe en su clase (Dueno.js, Perro.js, Abuela.js):
//   crearCuerpo(), animarCuerpo(), limitarAZona(), alVerAlJugador(), actualizarEstado()...
import * as THREE from 'three';
import { materialToon } from './Materials.js';

export const ESTADO = {
  PATRULLA: 'patrulla',
  INVESTIGAR: 'investigar',
  PERSEGUIR: 'perseguir',
};

// Valores por defecto (cada enemigo cambia los que quiera)
const VALORES = {
  nombre: 'enemigo',
  velocidades: { patrulla: 1.6, investigar: 2.6, perseguir: 3.9 }, // m/s
  radio: 0.3, // "ancho" (mitad del lado de su caja)
  caja: [0.35, 1.8], // su caja de choque va desde esta altura hasta esta otra (sobre los pies)
  alturaOjos: 1.6,
  distanciaVision: 12,
  anguloVision: 55, // grados: la MITAD del cono de visión
  distanciaSentir: 1.5, // tan cerca te nota aunque estés a su espalda
  oido: 1, // x2 = escucha al doble de distancia; x0.5 = un poco sordo
  distanciaAtrapar: 1,
  diferenciaAlturaAtrapar: 1, // si estás más arriba que esto (ej: arriba de una mesa), no te alcanza
  tiempoMemoria: 0.6, // segundos que sigue persiguiendo después de perderte de vista
  esperaEnPunto: 1.5, // segundos que se queda mirando en cada punto de patrulla
  tiempoBuscando: 3, // segundos que busca al llegar a donde te vio (o al ruido)
  tiempoMaximoYendo: 15, // si no llegó a donde investigaba en este tiempo, se rinde
  velocidadGiro: 8, // radianes por segundo
  ritmoPasos: 3.5, // qué tan rápido balancea las piernas (más alto = pasos más cortitos)
  abrePuertas: false,
  alturaCartel: 2.45, // altura de los carteles "!" y "?"
  waypoints: [], // [{ id, pos: [x, y, z] }]
  conexiones: [], // [[idA, idB]]
  puntosPatrulla: [], // ids de los waypoints que recorre al patrullar
  inicio: null, // id del waypoint donde arranca
};

export class Enemigo {
  constructor(scene, house, player, valores) {
    this.house = house;
    this.player = player;
    this.v = { ...VALORES, ...valores }; // "v" de valores: this.v.distanciaVision, etc.

    // Waypoints como Vector3 y, para cada uno, la lista de sus vecinos
    this.waypoints = {};
    this.vecinos = {};
    for (const wp of this.v.waypoints) {
      this.waypoints[wp.id] = new THREE.Vector3(...wp.pos);
      this.vecinos[wp.id] = [];
    }
    for (const [a, b] of this.v.conexiones) {
      if (!this.vecinos[a] || !this.vecinos[b]) continue; // (conexiones con puntos que no son suyos)
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

    // position es la del modelo: mover al enemigo = mover su modelo
    this.position = this.modelo.position;
    this.caja = new THREE.Box3();
    this.ultimaPosicionVista = new THREE.Vector3();
    this.ignorar = null; // un collider que no le molesta (la abuela atraviesa su propia mecedora)
    this.multiplicadorVision = 1; // de noche ve menos lejos (o más, si tenés la linterna prendida): lo pone Game
    this.tiempoAnimacion = 0; // avanza solo al caminar (para el balanceo)
    this.tiempoTotal = 0; // avanza siempre (para el rebote de los carteles)
    // Funciones que Game conecta para sonidos y avisos (el enemigo solo "avisa" que pasó algo)
    this.alCambiarEstado = null; // alCambiarEstado(nuevo, anterior)
    this.alDarPaso = null; // alDarPaso()
    this.alAbrirPuerta = null; // alAbrirPuerta(puerta)
  }

  // Vuelve al punto de partida (al empezar cada partida)
  reiniciar() {
    this.position.copy(this.waypoints[this.v.inicio]);
    this.rotacion = 0; // hacia dónde mira (ángulo en Y)
    this.camino = []; // puntos (Vector3) que le faltan recorrer
    this.espera = 0;
    this.ultimoPuntoPatrulla = this.v.inicio;
    this.tiempoSinVer = 0;
    this.tiempoRecalculo = 0;
    this.tiempoAtascado = 0;
    this.tiempoYendo = 0;
    this.multiplicadorVelocidad = 1; // sube con el enojo (solo el dueño)
    this.estado = null;
    this.cambiarEstado(ESTADO.PATRULLA);
    this.empezarEspera(1); // se queda un segundo quieto antes de empezar a patrullar
  }

  cambiarEstado(nuevo) {
    const anterior = this.estado;
    this.estado = nuevo;
    if (nuevo !== anterior) this.alCambiarEstado?.(nuevo, anterior);
    this.cartelVisto.visible = nuevo === ESTADO.PERSEGUIR;
    this.cartelDuda.visible = nuevo === ESTADO.INVESTIGAR;
  }

  velocidad() {
    return (this.v.velocidades[this.estado] ?? 0) * this.multiplicadorVelocidad;
  }

  // ¿Está "cazando" al jugador? (para la música de persecución y el borde rojo de la pantalla)
  get estaAlerta() {
    return this.estado === ESTADO.PERSEGUIR;
  }

  // ------------------------------------------------------------
  //  LOOP
  // ------------------------------------------------------------
  update(dt) {
    this.tiempoTotal += dt;

    // 1. ¿Ve al jugador?
    if (this.puedeVerAlJugador()) {
      this.ultimaPosicionVista.copy(this.player.position);
      this.tiempoSinVer = 0;
      this.alVerAlJugador();
    } else {
      this.tiempoSinVer += dt;
    }

    // 2. Qué hace según su estado
    this.actualizarEstado(dt);

    // 3. Abre las puertas cerradas que tiene adelante (el dueño y la abuela)
    if (this.v.abrePuertas) this.abrirPuertaDeAdelante();

    this.animar(dt);
  }

  // Verlo = perseguirlo (la abuela, en cambio, le apunta)
  alVerAlJugador() {
    if (this.estado !== ESTADO.PERSEGUIR) {
      this.cambiarEstado(ESTADO.PERSEGUIR);
      this.tiempoRecalculo = 0;
    }
  }

  actualizarEstado(dt) {
    if (this.estado === ESTADO.PATRULLA) this.actualizarPatrulla(dt);
    else if (this.estado === ESTADO.INVESTIGAR) this.actualizarInvestigar(dt);
    else if (this.estado === ESTADO.PERSEGUIR) this.actualizarPersecucion(dt);
  }

  // PATRULLA: va a un punto al azar, mira alrededor un rato y elige otro
  actualizarPatrulla(dt) {
    if (this.camino.length > 0) {
      if (this.seguirCamino(dt)) this.empezarEspera(this.v.esperaEnPunto);
      return;
    }
    this.mirarAlrededor(dt);
    if (this.espera <= 0) this.irA(this.waypoints[this.puntoDePatrullaAlAzar()]);
  }

  // INVESTIGAR: va al punto sospechoso, busca un rato y vuelve a patrullar
  actualizarInvestigar(dt) {
    if (this.camino.length > 0) {
      // Si tarda demasiado (el lugar no se puede alcanzar), se rinde y busca desde donde está
      this.tiempoYendo += dt;
      if (this.tiempoYendo > this.v.tiempoMaximoYendo) {
        this.camino = [];
        this.alLlegarAInvestigar(false);
        this.empezarEspera(this.v.tiempoBuscando);
        return;
      }
      if (this.seguirCamino(dt)) {
        this.alLlegarAInvestigar(true);
        this.empezarEspera(this.v.tiempoBuscando);
      }
      return;
    }
    this.mirarAlrededor(dt);
    if (this.espera <= 0) this.cambiarEstado(ESTADO.PATRULLA);
  }

  // Llegó (o se rindió) al lugar que investigaba (el dueño revisa escondites acá)
  alLlegarAInvestigar() {}

  // PERSEGUIR: va hacia donde vio al jugador por última vez (recalcula el camino seguido)
  actualizarPersecucion(dt) {
    if (this.tiempoSinVer > this.v.tiempoMemoria) {
      this.investigar(this.ultimaPosicionVista); // lo perdió: va a donde lo vio por última vez
      return;
    }
    this.tiempoRecalculo -= dt;
    if (this.tiempoRecalculo <= 0) {
      this.irA(this.limitarAZona(this.ultimaPosicionVista));
      this.tiempoRecalculo = 0.5;
    }
    this.seguirCamino(dt);
  }

  // Manda al enemigo a revisar un punto (la usan la persecución y los ruidos)
  investigar(punto) {
    this.cambiarEstado(ESTADO.INVESTIGAR);
    this.tiempoYendo = 0;
    this.irA(this.limitarAZona(punto));
    this.empezarEspera(this.v.tiempoBuscando); // por si ya está en el lugar
  }

  // El punto de su zona más cercano a "punto" (cada enemigo tiene la suya: ver sus clases)
  limitarAZona(punto) {
    return punto.clone();
  }

  // Ayudante para las zonas hechas con rectángulos [x1, z1, x2, z2]: si el punto está afuera,
  // lo "acerca" al rectángulo más cercano (a la altura "y"). Si justo ahí hay algo sólido, usa el
  // waypoint más cercano.
  puntoEnRectangulos(punto, rectangulos, y = punto.y) {
    let mejor = null;
    let mejorDistancia = Infinity;
    for (const [x1, z1, x2, z2] of rectangulos) {
      const x = THREE.MathUtils.clamp(punto.x, x1, x2);
      const z = THREE.MathUtils.clamp(punto.z, z1, z2);
      const distancia = Math.hypot(x - punto.x, z - punto.z);
      if (distancia < mejorDistancia) {
        mejor = new THREE.Vector3(x, y, z);
        mejorDistancia = distancia;
      }
    }
    if (mejorDistancia === 0) return punto.clone(); // ya estaba adentro
    if (!this.hayAlgoEn(mejor)) return mejor;
    return this.waypoints[this.waypointMasCercano(mejor)].clone();
  }

  // ¿Hay algo sólido parado en ese punto? (usa una caja del tamaño del enemigo)
  hayAlgoEn(punto) {
    const [abajo, arriba] = this.v.caja;
    const r = this.v.radio;
    const caja = new THREE.Box3(
      new THREE.Vector3(punto.x - r, punto.y + abajo, punto.z - r),
      new THREE.Vector3(punto.x + r, punto.y + arriba, punto.z + r),
    );
    return this.house.colliders.some((c) => c !== this.ignorar && caja.intersectsBox(c));
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
  //  OÍDO
  // ------------------------------------------------------------
  // Lo llama el sistema de ruido. Si el ruido llega hasta él, va a investigar.
  // Con oído x2 escucha al doble de distancia; con x0.5, a la mitad. Devuelve true si lo escuchó.
  oirRuido(posicion, radio) {
    if (this.position.distanceTo(posicion) > radio * this.v.oido) return false; // no le llega
    if (this.estado === ESTADO.PERSEGUIR) return false; // ya te está persiguiendo
    this.investigar(posicion);
    return true;
  }

  // ------------------------------------------------------------
  //  VISIÓN
  // ------------------------------------------------------------
  // Lo ve si: está cerca, está dentro de su cono de visión y no hay nada en el medio.
  puedeVerAlJugador() {
    if (this.player.escondido) return false; // escondido no se lo ve
    const ojos = this.position.clone();
    ojos.y += this.v.alturaOjos;
    const objetivo = this.player.camera.position; // los ojos del jugador

    // 1. Distancia
    const distancia = ojos.distanceTo(objetivo);
    if (distancia > this.v.distanciaVision * this.multiplicadorVision) return false;

    // 2. Ángulo: comparamos hacia dónde mira con la dirección hacia el jugador
    if (distancia > this.v.distanciaSentir) {
      const haciaJugador = new THREE.Vector3(objetivo.x - ojos.x, 0, objetivo.z - ojos.z).normalize();
      const mirada = new THREE.Vector3(Math.sin(this.rotacion), 0, Math.cos(this.rotacion));
      if (haciaJugador.dot(mirada) < Math.cos(THREE.MathUtils.degToRad(this.v.anguloVision))) return false;
    }

    // 3. Raycast: ¿hay una pared, mueble o piso en el medio?
    return this.house.hayVisionEntre(ojos, objetivo);
  }

  // ¿Alcanzó al jugador? (cerca en el piso y a una altura parecida)
  atrapoAlJugador() {
    if (this.player.escondido) return false; // escondido no lo puede tocar
    const p = this.player.position;
    const distancia = Math.hypot(p.x - this.position.x, p.z - this.position.z);
    return distancia < this.v.distanciaAtrapar && Math.abs(p.y - this.position.y) < this.v.diferenciaAlturaAtrapar;
  }

  // ------------------------------------------------------------
  //  NAVEGACIÓN CON WAYPOINTS
  // ------------------------------------------------------------
  // Arma el camino hasta "destino":
  //  - Si se puede ir derecho, va derecho.
  //  - Si no: waypoint cercano a él -> ...waypoints... -> waypoint cercano al destino -> destino
  irA(destino) {
    const final = destino.clone();
    if (this.sePuedeCaminar(this.position, final)) {
      this.camino = [final];
      return;
    }

    const inicio = this.waypointAlcanzable(this.position);
    const fin = this.waypointAlcanzable(final);
    this.camino = this.buscarCamino(inicio, fin).map((id) => this.waypoints[id].clone());
    this.camino.push(final);

    // Atajo: si ya puede ir derecho al segundo punto, se saltea el primero
    while (this.camino.length >= 2 && this.sePuedeCaminar(this.position, this.camino[1])) {
      this.camino.shift();
    }
  }

  sePuedeCaminar(desde, hasta) {
    return this.house.sePuedeCaminar(desde, hasta, this.v.radio, this.ignorar);
  }

  // El waypoint más cercano al que se puede llegar caminando en línea recta desde "punto"
  waypointAlcanzable(punto) {
    const ordenados = Object.keys(this.waypoints).sort(
      (a, b) => this.waypoints[a].distanceTo(punto) - this.waypoints[b].distanceTo(punto),
    );
    for (const id of ordenados) {
      if (this.sePuedeCaminar(punto, this.waypoints[id])) return id;
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
    const lista = this.v.puntosPatrulla;
    let id;
    do {
      id = lista[Math.floor(Math.random() * lista.length)];
    } while (id === this.ultimoPuntoPatrulla && lista.length > 1);
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
    const [abajo, arriba] = this.v.caja;
    const r = this.v.radio;
    this.caja.min.set(p.x - r, p.y + abajo, p.z - r);
    this.caja.max.set(p.x + r, p.y + arriba, p.z + r);
    return this.house.chocaCon(this.caja, this.ignorar);
  }

  // Gira de a poco hacia un ángulo (por el lado más corto)
  girarHacia(angulo, dt) {
    let diferencia = angulo - this.rotacion;
    diferencia = Math.atan2(Math.sin(diferencia), Math.cos(diferencia)); // entre -PI y PI
    const maximo = this.v.velocidadGiro * dt;
    this.rotacion += THREE.MathUtils.clamp(diferencia, -maximo, maximo);
  }

  // Gira hacia un punto (sin moverse)
  mirarHacia(punto, dt) {
    this.girarHacia(Math.atan2(punto.x - this.position.x, punto.z - this.position.z), dt);
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

  // Abre la puerta cerrada que tiene adelante (si estaba trabada, la destraba: tiene la llave).
  // Las rejillas de los conductos y la tabla del túnel no le interesan: por ahí no entra.
  abrirPuertaDeAdelante() {
    const mirada = new THREE.Vector3(Math.sin(this.rotacion), 0, Math.cos(this.rotacion));
    const puerta = this.house.puertaCercana(this.position, mirada, 1.3, (p) => !p.soloJugador);
    if (puerta && !puerta.abierta && !puerta.conLlave) {
      puerta.destrabar();
      puerta.alternar();
      this.alAbrirPuerta?.(puerta);
    }
  }

  // ------------------------------------------------------------
  //  MODELO Y ANIMACIÓN
  // ------------------------------------------------------------
  // Cada enemigo arma su propio cuerpo (mirando hacia +Z)
  crearCuerpo() {
    return new THREE.Group();
  }

  // Ayudante para armar cuerpos con formas básicas: agrega una malla al "padre"
  parte(padre, geometria, color, x, y, z) {
    const malla = new THREE.Mesh(geometria, materialToon(color));
    malla.position.set(x, y, z);
    malla.castShadow = true;
    padre.add(malla);
    return malla;
  }

  animar(dt) {
    this.modelo.rotation.y = this.rotacion;

    // El "reloj" del balanceo avanza solo al caminar (más rápido cuanto más rápido camina).
    // Cada vez que da media vuelta (un múltiplo de PI), apoya un pie: ¡paso!
    const caminando = this.camino.length > 0 && this.velocidad() > 0;
    if (caminando) {
      const pasoAntes = Math.floor(this.tiempoAnimacion / Math.PI);
      this.tiempoAnimacion += dt * this.velocidad() * this.v.ritmoPasos;
      if (Math.floor(this.tiempoAnimacion / Math.PI) !== pasoAntes) this.alDarPaso?.();
    }
    this.animarCuerpo(dt, caminando);

    // Los carteles "!" y "?" rebotan arriba de la cabeza (y suben con el cuerpo si salta)
    const rebote = this.v.alturaCartel + this.cuerpo.position.y + Math.abs(Math.sin(this.tiempoTotal * 6)) * 0.08;
    this.cartelVisto.position.y = rebote;
    this.cartelDuda.position.y = rebote;
  }

  // Cada enemigo mueve sus piernas, brazos o cola como quiera
  animarCuerpo() {}
}

// Un cartelito (sprite) con un signo dibujado en un canvas. Siempre mira a la cámara.
export function crearCartel(texto, color) {
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

  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) });
  // Sin borde de dibujito: el efecto de bordes no sabe dibujar sprites y le dejaba un fondo cuadrado
  material.userData.outlineParameters = { visible: false };
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.45, 0.45, 1);
  sprite.visible = false;
  return sprite;
}
