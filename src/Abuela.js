// La abuela con escopeta (de perdigones de sal). Usa el esqueleto de Enemigo.js, pero NO te persigue:
//
//   SENTADA  --(pasa un rato)-->  PATRULLA (da una vuelta por el pasillo y vuelve a su mecedora)
//   cualquiera --(te ve)--> APUNTAR (1 segundo: se ve un rayito rojo y hace "clic")
//   APUNTAR  --(pasa el segundo)--> dispara: ¡BANG!  --> RECARGAR (2.5 s: ¡tu oportunidad!)
//   RECARGAR --(te sigue viendo)--> APUNTAR   /   --(no te ve)--> INVESTIGAR (donde te vio)
//   SENTADA / PATRULLA --(escucha algo)--> INVESTIGAR (es medio sorda: oído x0.5)
//
// Puntería: la probabilidad de acertar baja con la distancia y si te estás moviendo (ver
// probabilidadDeAcierto). Si justo cuando dispara no te ve (te agachaste detrás de un mueble), erra seguro.
// Cada disparo hace muchísimo ruido (lo escuchan el dueño y los perros) y deja un agujero donde pega.
//
// Camina muy despacio y nunca sale de su cuarto y del pasillo del primer piso.
import * as THREE from 'three';
import { Enemigo, ESTADO } from './Enemigo.js';
import { materialToon } from './Materials.js';
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
const MAXIMO_AGUJEROS = 30;

// Probabilidad de acertar un tiro (de 0 a 1).
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

    this.agujeros = []; // agujeros de los perdigones en paredes y muebles
    this.humos = []; // nubecitas de humo del disparo
    this.raycaster = new THREE.Raycaster();

    // Funciones que conecta Game
    this.alApuntar = null; // alApuntar()
    this.alDisparar = null; // alDisparar({ acerto, objetivo, probabilidad })
    this.alRecargar = null; // alRecargar()
  }

  reiniciar() {
    super.reiniciar();
    this.acerto = false;
    this.paradas = 0;
    this.volviendo = false; // true mientras vuelve a la mecedora
    this.tiempoApuntando = 0;
    this.tiempoRecarga = 0;
    this.balanceoSilla = 0;
    this.limpiarAgujeros();
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

  // La abuela no te persigue: te apunta (si está recargando, primero termina de recargar)
  alVerAlJugador() {
    if (this.estado === ESTADO_ABUELA.APUNTAR || this.estado === ESTADO_ABUELA.RECARGAR) return;
    this.empezarAApuntar();
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
    const punta = this.puntaDeLaEscopeta();
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
    const punta = this.puntaDeLaEscopeta();
    const loVe = this.puedeVerAlJugador();
    const distancia = punta.distanceTo(this.player.camera.position);
    const probabilidad = loVe ? probabilidadDeAcierto(distancia, this.player.tipoDePaso) : 0;
    this.acerto = Math.random() < probabilidad;

    // A dónde va el tiro: al jugador si acertó; si no, un poco al costado (o a donde te vio)
    const objetivo = (loVe ? this.player.position : this.ultimaPosicionVista).clone();
    objetivo.y += 1.1;
    if (!this.acerto) {
      const angulo = Math.random() * Math.PI * 2;
      const desvio = 0.6 + Math.random() * 0.6;
      objetivo.x += Math.cos(angulo) * desvio;
      objetivo.z += Math.sin(angulo) * desvio;
      objetivo.y += (Math.random() - 0.3) * 0.8;
      this.hacerAgujero(punta, objetivo);
    }
    this.crearHumo(punta);
    this.alDisparar?.({ acerto: this.acerto, objetivo, probabilidad });

    this.cambiarEstado(ESTADO_ABUELA.RECARGAR);
    this.tiempoRecarga = TIEMPO_RECARGA;
    this.alRecargar?.();
  }

  actualizarRecarga(dt) {
    if (this.tiempoSinVer < 0.1) this.mirarHacia(this.ultimaPosicionVista, dt);
    this.tiempoRecarga -= dt;
    if (this.tiempoRecarga > 0) return;
    if (this.tiempoSinVer < 0.3) {
      this.empezarAApuntar(); // te sigue viendo: ¡otra vez!
    } else {
      this.investigar(this.ultimaPosicionVista);
    }
  }

  // Posición en el mundo de la punta del caño
  puntaDeLaEscopeta() {
    this.modelo.updateMatrixWorld(true);
    return this.punta.getWorldPosition(new THREE.Vector3());
  }

  // El perdigón sigue derecho hasta pegar en algo: ahí deja un agujerito negro
  hacerAgujero(desde, hacia) {
    const direccion = hacia.clone().sub(desde).normalize();
    this.raycaster.set(desde, direccion);
    this.raycaster.far = 30;
    const choque = this.raycaster.intersectObjects(this.house.obstaculos, true).find((c) => c.face);
    if (!choque) return;
    const normal = choque.face.normal.clone().transformDirection(choque.object.matrixWorld);
    const agujero = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), materialToon('#1a1a1a'));
    agujero.position.copy(choque.point).addScaledVector(normal, 0.01);
    agujero.lookAt(choque.point.clone().add(normal.multiplyScalar(2)));
    this.scene.add(agujero);
    this.agujeros.push(agujero);
    if (this.agujeros.length > MAXIMO_AGUJEROS) this.scene.remove(this.agujeros.shift());
  }

  limpiarAgujeros() {
    for (const agujero of this.agujeros) this.scene.remove(agujero);
    this.agujeros = [];
  }

  // Nubecita de humo gris que crece y se desvanece
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
  // Una abuelita petisa: rodete gris, anteojos, saquito rosa y pantuflas. Mira hacia +Z.
  crearCuerpo() {
    const cuerpo = new THREE.Group();
    const parte = (geometria, color, x, y, z, padre = cuerpo) => this.parte(padre, geometria, color, x, y, z);
    const piel = '#f5c9a6';

    this.piernas = [-0.09, 0.09].map((x) => {
      const cadera = new THREE.Group();
      cadera.position.set(x, 0.55, 0);
      cuerpo.add(cadera);
      parte(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), '#e9c9a0', 0, -0.26, 0, cadera); // medias
      parte(new THREE.BoxGeometry(0.13, 0.08, 0.24), '#6d597a', 0, -0.52, 0.04, cadera); // pantuflas
      return cadera;
    });

    // Pollera larga, saquito y delantal
    parte(new THREE.CylinderGeometry(0.2, 0.3, 0.5, 14), '#6a4c93', 0, 0.62, 0);
    parte(new THREE.CylinderGeometry(0.19, 0.21, 0.42, 14), '#ffafcc', 0, 1.06, 0);
    parte(new THREE.BoxGeometry(0.26, 0.4, 0.02), '#ffffff', 0, 0.75, 0.22);

    // Cabeza, rodete, anteojos y cachetes colorados
    parte(new THREE.SphereGeometry(0.16, 14, 10), piel, 0, 1.4, 0);
    parte(new THREE.SphereGeometry(0.17, 14, 10), '#d9d9d9', 0, 1.46, -0.03).scale.set(1, 0.8, 1);
    parte(new THREE.SphereGeometry(0.09, 10, 8), '#d9d9d9', 0, 1.58, -0.12); // rodete
    for (const lado of [-1, 1]) {
      parte(new THREE.TorusGeometry(0.045, 0.01, 6, 14), '#343a40', lado * 0.06, 1.42, 0.15); // anteojos
      parte(new THREE.SphereGeometry(0.02, 6, 5), '#000000', lado * 0.06, 1.42, 0.155);
      parte(new THREE.SphereGeometry(0.035, 8, 6), '#ff8fab', lado * 0.1, 1.35, 0.12);
    }
    parte(new THREE.SphereGeometry(0.04, 8, 6), '#f4a582', 0, 1.37, 0.16); // nariz

    // Brazos y escopeta: todo en un grupo que sube a la altura de los ojos cuando apunta
    this.brazos = new THREE.Group();
    this.brazos.position.set(0, 1.18, 0);
    cuerpo.add(this.brazos);
    for (const lado of [-1, 1]) {
      const brazo = parte(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), '#ffafcc', lado * 0.16, -0.05, 0.14, this.brazos);
      brazo.rotation.x = Math.PI / 2 - 0.3;
      parte(new THREE.SphereGeometry(0.055, 8, 6), piel, lado * 0.12, -0.08, 0.32, this.brazos);
    }
    this.escopeta = new THREE.Group();
    this.escopeta.position.set(0.05, -0.06, 0.25);
    this.brazos.add(this.escopeta);
    parte(new THREE.BoxGeometry(0.07, 0.1, 0.3), '#8d5524', 0, -0.02, -0.12, this.escopeta); // culata
    for (const lado of [-1, 1]) {
      const cano = parte(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 8), '#495057', lado * 0.023, 0.02, 0.3, this.escopeta);
      cano.rotation.x = Math.PI / 2;
    }
    this.punta = new THREE.Object3D(); // la punta del caño (de acá salen el rayo, el humo y el tiro)
    this.punta.position.set(0, 0.02, 0.62);
    this.escopeta.add(this.punta);
    return cuerpo;
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
    // Sentada: piernas para adelante, más bajita y hamacándose con la silla
    const sentada = this.sentada;
    this.cuerpo.position.y = sentada ? -0.1 : 0;
    const balanceo = caminando ? Math.sin(this.tiempoAnimacion) * 0.35 : 0;
    this.piernas.forEach((pierna, i) => (pierna.rotation.x = sentada ? -1.35 : i === 0 ? balanceo : -balanceo));
    this.balanceoSilla = sentada ? Math.sin(this.tiempoTotal * 1.8) * 0.12 : this.balanceoSilla * Math.max(0, 1 - dt * 1.5);
    this.hamaca.rotation.x = this.balanceoSilla;
    this.cuerpo.rotation.x = sentada ? this.balanceoSilla : 0;

    // Escopeta: apuntando, a la altura de los ojos; recargando, "quebrada" hacia abajo;
    // si no, en diagonal (sentada, sobre las piernas)
    let alturaBrazos = 1.18;
    let inclinacion = 0.5;
    if (this.estado === ESTADO_ABUELA.APUNTAR) {
      alturaBrazos = 1.3;
      inclinacion = 0;
    } else if (this.estado === ESTADO_ABUELA.RECARGAR) {
      inclinacion = 0.9 + Math.sin(this.tiempoRecarga * 5) * 0.15;
    }
    this.brazos.position.y = alturaBrazos;
    this.escopeta.rotation.x = inclinacion;
  }
}
