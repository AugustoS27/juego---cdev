// Doña Pocha, la vecina (en el código le seguimos diciendo "la abuela"), con su LANZARREDES (etapa 15C).
// Usa el esqueleto de Enemigo.js, pero NO te persigue:
//
//   SENTADA  --(pasa un rato)-->  PATRULLA (da una vuelta por el pasillo y vuelve a su mecedora)
//   cualquiera --(te ve)--> APUNTAR (1 segundo: se ve un rayito rojo y hace "clic")
//   APUNTAR  --(pasa el segundo)--> dispara: ¡FUAP! sale una red  --> RECARGAR (2.5 s: ¡tu oportunidad!)
//   RECARGAR --(te sigue viendo)--> APUNTAR   /   --(no te ve)--> INVESTIGAR (donde te vio)
//   SENTADA / PATRULLA --(escucha algo)--> INVESTIGAR (es medio sorda: oído x0.5)
//
// La red vuela (ver Red.js): si te toca, quedás enredado 3 segundos y Doña Pocha le grita a Don Ernesto.
// Ella sola no te puede hacer perder (no te agarra), pero Don Ernesto sí, si llega mientras estás enredado.
// Puntería: apunta a donde estás cuando dispara, pero puede errar: la probabilidad de apuntar bien baja con la
// distancia y si te estás moviendo (ver probabilidadDeAcierto). Además, como la red tarda en llegar,
// corriendo de costado la podés esquivar. Si justo cuando dispara no te ve, erra seguro.
// Cada disparo hace ruido (lo escuchan Don Ernesto y los perros) y la red queda tirada donde pega.
// Mientras estás enredado (o recién soltado) no te apunta.
//
// Camina muy despacio y nunca sale de su cuarto y del pasillo del primer piso.
import * as THREE from 'three';
import { Enemigo, ESTADO } from './Enemigo.js';
import { Redes } from './Red.js';
import { crearDonaPocha } from './Personajes.js';
import { ABUELA, WAYPOINTS, CONEXIONES, ALTURA_PISO, pisoDeAltura } from './HouseData.js';

export const ESTADO_ABUELA = {
  SENTADA: 'sentada',
  APUNTAR: 'apuntar',
  RECARGAR: 'recargar',
};

const TIEMPO_APUNTANDO = 1; // segundos de aviso antes de disparar
const TIEMPO_RECARGA = 2.5;
const TIEMPO_SENTADA = [18, 28]; // se hamaca entre 18 y 28 segundos antes de levantarse
const PARADAS_POR_PASEO = 2; // puntos del pasillo que visita antes de volver a sentarse

// Probabilidad de apuntar bien (de 0 a 1). Si apunta mal, la red sale bastante desviada.
//  - De cerca apunta mejor: 60% a 3 m, 15% a 12 m (como mínimo 5%, como máximo 75%).
//  - Moverse la complica: corriendo x0.6, caminando x0.8, agachado x0.9, quieto x1.
// Ejemplos: quieto a 3 m -> 60%. Corriendo a 12 m -> 9%.
export function probabilidadDeAcierto(distancia, tipoDePaso) {
  const segunDistancia = THREE.MathUtils.clamp(0.75 - 0.05 * distancia, 0.05, 0.75);
  const segunMovimiento = { pasosCorriendo: 0.6, pasos: 0.8, pasosAgachado: 0.9 }[tipoDePaso] ?? 1;
  return segunDistancia * segunMovimiento;
}

export class Abuela extends Enemigo {
  constructor(scene, house, player) {
    const y = ABUELA.piso * ALTURA_PISO;
    super(scene, house, player, {
      nombre: 'abuela',
      velocidades: { patrulla: 0.8, investigar: 1.2 }, // (persiguiendo, apuntando o recargando no camina)
      alturaOjos: 1.4,
      distanciaVision: 14,
      anguloVision: 55,
      oido: 0.5, // un poco sorda
      tiempoBuscando: 4,
      tiempoMaximoYendo: 25, // camina tan despacio que le damos más tiempo
      velocidadGiro: 4,
      ritmoPasos: 7,
      abrePuertas: true,
      alturaCartel: 2.1,
      waypoints: WAYPOINTS.filter((wp) => ABUELA.waypoints.includes(wp.id)),
      conexiones: CONEXIONES,
      puntosPatrulla: ABUELA.puntosPatrulla,
      inicio: 'abuela',
    });
    this.scene = scene;
    this.zona = ABUELA.zona;
    this.alturaPiso = y;

    // Su mecedora (se hamaca con ella). La caja de choque es para el jugador: ella la atraviesa.
    const { x, z, rot } = ABUELA.silla;
    this.puntoSilla = new THREE.Vector3(x, y, z);
    this.rotacionSilla = THREE.MathUtils.degToRad(rot);
    this.mecedora = this.crearMecedora();
    this.mecedora.position.copy(this.puntoSilla);
    this.mecedora.rotation.y = this.rotacionSilla;
    scene.add(this.mecedora);
    this.ignorar = new THREE.Box3(new THREE.Vector3(x - 0.45, y, z - 0.45), new THREE.Vector3(x + 0.45, y + 1, z + 0.45));
    house.colliders.push(this.ignorar);

    // Rayito rojo de la mira (se ve mientras apunta)
    const materialRayo = new THREE.LineDashedMaterial({ color: '#ff1f1f', dashSize: 0.15, gapSize: 0.08 });
    materialRayo.userData.outlineParameters = { visible: false };
    this.rayo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), materialRayo);
    this.rayo.visible = false;
    this.rayo.frustumCulled = false;
    scene.add(this.rayo);

    this.redes = new Redes(scene, house, player); // las redes que vuelan y las que quedan tiradas
    this.humos = []; // nubecitas de aire del disparo

    // Funciones que conecta Game
    this.alApuntar = null; // alApuntar()
    this.alDisparar = null; // alDisparar({ objetivo, probabilidad })
    this.alRecargar = null; // alRecargar()
    this.alAtrapar = null; // alAtrapar(): la red enredó al jugador
    this.alErrar = null; // alErrar(): la red no le dio
    this.redes.alAtrapar = () => this.alAtrapar?.();
    this.redes.alErrar = () => this.alErrar?.();
  }

  reiniciar() {
    super.reiniciar();
    this.paradas = 0;
    this.volviendo = false; // true mientras vuelve a la mecedora
    this.tiempoApuntando = 0;
    this.tiempoRecarga = 0;
    this.balanceoSilla = 0;
    this.redes?.limpiar();
    this.sentarse();
  }

  cambiarEstado(nuevo) {
    const anterior = this.estado;
    // Si vuelve a patrullar después de investigar o disparar, va derecho a su mecedora
    if (nuevo === ESTADO.PATRULLA && anterior !== ESTADO_ABUELA.SENTADA) this.paradas = PARADAS_POR_PASEO;
    super.cambiarEstado(nuevo);
    this.cartelVisto.visible = nuevo === ESTADO_ABUELA.APUNTAR;
    this.volviendo = false;
  }

  get estaAlerta() {
    return this.estado === ESTADO_ABUELA.APUNTAR || this.estado === ESTADO_ABUELA.RECARGAR;
  }

  get sentada() {
    return this.estado === ESTADO_ABUELA.SENTADA;
  }

  // La abuela no te persigue: te apunta (si está recargando, primero termina de recargar).
  // Si ya estás enredado (o recién te soltaste), no te apunta: ya gritó "¡Ernesto!".
  alVerAlJugador() {
    if (this.estado === ESTADO_ABUELA.APUNTAR || this.estado === ESTADO_ABUELA.RECARGAR) return;
    if (!this.player.puedeSerEnredado) return;
    this.empezarAApuntar();
  }

  // Ella no te agarra: solo te enreda (el que te agarra es Don Ernesto)
  atrapoAlJugador() {
    return false;
  }

  // Apuntando o recargando no se distrae con ruidos
  oirRuido(posicion, radio) {
    if (this.estaAlerta) return false;
    return super.oirRuido(posicion, radio);
  }

  empezarAApuntar() {
    this.cambiarEstado(ESTADO_ABUELA.APUNTAR);
    this.camino = [];
    this.tiempoApuntando = TIEMPO_APUNTANDO;
    this.alApuntar?.();
  }

  actualizarEstado(dt) {
    if (this.estado === ESTADO_ABUELA.SENTADA) this.actualizarSentada(dt);
    else if (this.estado === ESTADO_ABUELA.APUNTAR) this.actualizarApuntar(dt);
    else if (this.estado === ESTADO_ABUELA.RECARGAR) this.actualizarRecarga(dt);
    else super.actualizarEstado(dt);
    this.actualizarHumo(dt);
    this.redes.update(dt);
  }

  // ------------------------------------------------------------
  //  SENTADA Y PASEO
  // ------------------------------------------------------------
  sentarse() {
    this.cambiarEstado(ESTADO_ABUELA.SENTADA);
    this.camino = [];
    this.position.copy(this.puntoSilla);
    this.rotacion = this.rotacionSilla;
    const [minimo, maximo] = TIEMPO_SENTADA;
    this.espera = minimo + Math.random() * (maximo - minimo);
  }

  actualizarSentada(dt) {
    this.espera -= dt;
    if (this.espera > 0) return;
    // Se levanta a dar una vuelta por el pasillo
    this.cambiarEstado(ESTADO.PATRULLA);
    this.paradas = 0;
    this.empezarEspera(0.5);
  }

  // Visita un par de puntos del pasillo y vuelve a la mecedora
  actualizarPatrulla(dt) {
    if (this.camino.length > 0) {
      if (this.seguirCamino(dt)) {
        if (this.volviendo) this.sentarse();
        else this.empezarEspera(this.v.esperaEnPunto);
      }
      return;
    }
    this.mirarAlrededor(dt);
    if (this.espera > 0) return;
    this.paradas++;
    if (this.paradas > PARADAS_POR_PASEO) {
      this.irA(this.puntoSilla);
      this.volviendo = true;
    } else {
      this.irA(this.waypoints[this.puntoDePatrullaAlAzar()]);
    }
  }

  // Su zona: su cuarto y el pasillo del primer piso. Si el punto está en otro piso,
  // va al lugar de su piso que queda justo encima (o debajo), lo más cerca posible.
  // Si ahí hay un mueble (ej: el ruido vino de abajo de su cama), va al waypoint más cercano.
  limitarAZona(punto) {
    const enSuPiso = punto.clone();
    if (pisoDeAltura(punto.y) !== ABUELA.piso) enSuPiso.y = this.alturaPiso;
    const destino = this.puntoEnRectangulos(enSuPiso, this.zona, this.alturaPiso);
    if (this.hayAlgoEn(destino)) return this.waypoints[this.waypointMasCercano(destino)].clone();
    return destino;
  }

  // ------------------------------------------------------------
  //  APUNTAR, DISPARAR Y RECARGAR
  // ------------------------------------------------------------
  actualizarApuntar(dt) {
    this.mirarHacia(this.ultimaPosicionVista, dt * 2);
    this.tiempoApuntando -= dt;
    // El rayito rojo va de la punta de la escopeta al pecho del jugador (si lo ve)
    const punta = this.puntaDelLanzador();
    const pecho = this.player.position.clone().setY(this.player.position.y + 1.1);
    const hasta = this.tiempoSinVer < 0.1 ? pecho : this.ultimaPosicionVista.clone().setY(pecho.y);
    const puntos = this.rayo.geometry.attributes.position;
    puntos.setXYZ(0, punta.x, punta.y, punta.z);
    puntos.setXYZ(1, hasta.x, hasta.y, hasta.z);
    puntos.needsUpdate = true;
    this.rayo.computeLineDistances(); // (la línea punteada necesita saber cuánto mide)
    this.rayo.visible = true;
    if (this.tiempoApuntando <= 0) this.disparar();
  }

  disparar() {
    this.rayo.visible = false;
    const punta = this.puntaDelLanzador();
    const loVe = this.puedeVerAlJugador() && this.player.puedeSerEnredado;
    const distancia = punta.distanceTo(this.player.camera.position);
    const probabilidad = loVe ? probabilidadDeAcierto(distancia, this.player.tipoDePaso) : 0;
    const apuntoBien = Math.random() < probabilidad;

    // A dónde apunta: al pecho del jugador si apuntó bien; si no, bastante al costado (o a donde te vio).
    // El desvío va de costado (perpendicular a la línea de tiro): si fuera para adelante o para atrás,
    // la red pasaría igual por donde estás.
    const objetivo = (loVe ? this.player.position : this.ultimaPosicionVista).clone();
    objetivo.y += this.player.agachado ? 0.6 : 1.1;
    if (!apuntoBien) {
      const tiro = objetivo.clone().sub(punta).setY(0).normalize();
      const costado = new THREE.Vector3(-tiro.z, 0, tiro.x); // (girado 90°)
      const desvio = (1.3 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1);
      objetivo.addScaledVector(costado, desvio);
      objetivo.y += (Math.random() - 0.3) * 0.8;
    }
    this.redes.lanzar(punta, objetivo);
    this.crearHumo(punta);
    this.alDisparar?.({ objetivo, probabilidad });

    this.cambiarEstado(ESTADO_ABUELA.RECARGAR);
    this.tiempoRecarga = TIEMPO_RECARGA;
    this.alRecargar?.();
  }

  actualizarRecarga(dt) {
    if (this.tiempoSinVer < 0.1) this.mirarHacia(this.ultimaPosicionVista, dt);
    this.tiempoRecarga -= dt;
    if (this.tiempoRecarga > 0) return;
    if (this.tiempoSinVer < 0.3 && !this.player.puedeSerEnredado) {
      this.tiempoRecarga = 0.2; // te ve enredado (o recién soltado): espera con la red lista
    } else if (this.tiempoSinVer < 0.3) {
      this.empezarAApuntar(); // te sigue viendo: ¡otra vez!
    } else {
      this.investigar(this.ultimaPosicionVista);
    }
  }

  // Posición en el mundo de la boca del lanzarredes
  puntaDelLanzador() {
    this.modelo.updateMatrixWorld(true);
    return this.punta.getWorldPosition(new THREE.Vector3());
  }

  // Nubecita de aire (el "fuap" del lanzador) que crece y se desvanece
  crearHumo(posicion) {
    const material = new THREE.MeshBasicMaterial({ color: '#dddddd', transparent: true, opacity: 0.8, depthWrite: false });
    material.userData.outlineParameters = { visible: false };
    const humo = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), material);
    humo.position.copy(posicion);
    this.scene.add(humo);
    this.humos.push({ malla: humo, tiempo: 0 });
  }

  actualizarHumo(dt) {
    for (const humo of this.humos) {
      humo.tiempo += dt;
      humo.malla.scale.setScalar(1 + humo.tiempo * 4);
      humo.malla.position.y += dt * 0.4;
      humo.malla.material.opacity = Math.max(0, 0.8 - humo.tiempo);
    }
    for (const humo of this.humos.filter((h) => h.tiempo > 0.8)) {
      this.scene.remove(humo.malla);
      humo.malla.material.dispose();
    }
    this.humos = this.humos.filter((h) => h.tiempo <= 0.8);
  }

  // ------------------------------------------------------------
  //  MODELO Y ANIMACIÓN
  // ------------------------------------------------------------
  // Doña Pocha (ver Personajes.js): guardamos sus partes para animarlas
  crearCuerpo() {
    const partes = crearDonaPocha();
    this.piernas = partes.piernas;
    this.brazos = partes.brazos;
    this.cabeza = partes.cabeza;
    this.ojos = partes.ojos;
    this.lanzador = partes.lanzador;
    this.punta = partes.punta;
    this.redCargada = partes.redCargada;
    this.tejido = partes.tejido;
    this.tiempoParaParpadear = 3;
    return partes.cuerpo;
  }

  // Mecedora de madera con almohadón (mira hacia +Z). "hamaca" es la parte que se balancea.
  crearMecedora() {
    const grupo = new THREE.Group();
    this.hamaca = new THREE.Group();
    grupo.add(this.hamaca);
    const madera = '#8d5524';
    const parte = (geometria, color, x, y, z) => this.parte(this.hamaca, geometria, color, x, y, z);
    // Patines curvos: un pedazo de aro (toro) parado de costado
    for (const lado of [-1, 1]) {
      const patin = parte(new THREE.TorusGeometry(1, 0.03, 6, 20, 1), madera, lado * 0.26, 1.02, 0);
      patin.rotation.set(0, Math.PI / 2, -Math.PI / 2 - 0.5);
      for (const z of [-0.2, 0.22]) parte(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), madera, lado * 0.26, 0.24, z);
      parte(new THREE.BoxGeometry(0.05, 0.05, 0.45), madera, lado * 0.28, 0.68, 0.02); // apoyabrazos
    }
    parte(new THREE.BoxGeometry(0.56, 0.06, 0.5), madera, 0, 0.45, 0); // asiento
    parte(new THREE.BoxGeometry(0.5, 0.08, 0.44), '#e5989b', 0, 0.51, 0.02); // almohadón
    const respaldo = parte(new THREE.BoxGeometry(0.56, 0.7, 0.05), madera, 0, 0.82, -0.28);
    respaldo.rotation.x = -0.2;
    return grupo;
  }

  animarCuerpo(dt, caminando) {
    // Parpadea cada 2 a 5 segundos
    this.tiempoParaParpadear -= dt;
    if (this.tiempoParaParpadear < -0.12) this.tiempoParaParpadear = 2 + Math.random() * 3;
    for (const ojo of this.ojos) ojo.scale.y = this.tiempoParaParpadear < 0 ? 0.15 : 1;

    // Sentada teje (las agujas van y vienen) y el lanzarredes descansa; si no, lo tiene en la mano
    const sentada = this.sentada;
    this.tejido.visible = sentada;
    this.lanzador.visible = !sentada;
    this.tejido.rotation.z = sentada ? Math.sin(this.tiempoTotal * 7) * 0.15 : 0;
    this.cabeza.rotation.x = sentada ? 0.25 : 0; // sentada mira para abajo, al tejido

    // Sentada: piernas para adelante, más bajita y hamacándose con la silla
    this.cuerpo.position.y = sentada ? -0.1 : 0;
    const balanceo = caminando ? Math.sin(this.tiempoAnimacion) * 0.35 : 0;
    this.piernas.forEach((pierna, i) => (pierna.rotation.x = sentada ? -1.35 : i === 0 ? balanceo : -balanceo));
    this.balanceoSilla = sentada ? Math.sin(this.tiempoTotal * 1.8) * 0.12 : this.balanceoSilla * Math.max(0, 1 - dt * 1.5);
    this.hamaca.rotation.x = this.balanceoSilla;
    this.cuerpo.rotation.x = sentada ? this.balanceoSilla : 0;

    // Lanzarredes: apuntando, a la altura de los ojos; recargando, apuntando al piso mientras mete otra
    // red (el bollo aparece recién al final); si no, en diagonal (sentada, sobre las piernas)
    let alturaBrazos = 1.18;
    let inclinacion = 0.5;
    if (this.estado === ESTADO_ABUELA.APUNTAR) {
      alturaBrazos = 1.3;
      inclinacion = 0;
    } else if (this.estado === ESTADO_ABUELA.RECARGAR) {
      inclinacion = 0.9 + Math.sin(this.tiempoRecarga * 5) * 0.15;
    }
    this.brazos.position.y = alturaBrazos;
    this.lanzador.rotation.x = inclinacion;
    this.redCargada.visible = this.estado !== ESTADO_ABUELA.RECARGAR || this.tiempoRecarga < 0.6;
  }
}
