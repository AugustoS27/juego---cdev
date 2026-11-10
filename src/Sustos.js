// Sustos y cosas raras de la casa (etapa 16F-2). Ninguno te hace perder, pero algunos hacen ruido y
// atraen a Don Ernesto. Miedo "de película para chicos": cosas que se mueven solas, nada de sangre.
//
// Cosas que pasan SIEMPRE (son parte de la casa):
//   - El maniquí del ático gira hacia vos... pero solo cuando no lo mirás.
//   - La muñeca aparece en otro lugar cada vez que le sacás los ojos de encima.
//   - Tablas flojas: si las pisás sin agacharte, crujen fuerte (corriendo, más fuerte todavía).
//
// Sustos de UNA sola vez por partida (y con un rato entre uno y otro, para que no cansen):
//   - El teléfono de la entrada suena de golpe: si no lo atendés (E), Don Ernesto viene a ver.
//   - La tele del living se prende sola, con estática.
//   - Un cuadro del pasillo de arriba se cae cuando pasás.
//   - Una puerta se cierra sola de un portazo atrás tuyo.
//   - En el cuarto de las muñecas, la mecedora vacía se hamaca sola y suena una cajita de música.
//   - En el ático, el caballito mecedor se hamaca solo.
//
// Game llama a update() cada frame y le pasa hacerRuido() para los que hacen ruido.
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { crearCuadro } from './Cuadros.js';
import { ALTURA_PISO, pisoDeAltura } from './HouseData.js';

const ESPERA_ENTRE_SUSTOS = 35; // segundos, como mínimo, entre un susto de una sola vez y el siguiente
const ESPERA_AL_EMPEZAR = 25; // segundos de partida antes del primer susto
const DISTANCIA_USO = 2.5;

// Dónde están las cosas (x, altura sobre el piso, z)
const TELEFONO = { piso: 0, x: -2.4, y: 0.9, z: 5.62 }; // sobre el mueble de la entrada
const TELE = { piso: 0, x: -3.53, y: 0.92, z: 0.8 }; // la pantalla de la tele del living (mira hacia -X)
const CUADRO = { piso: 1, x: -1.6, y: 1.75, z: 2.11 }; // pasillo de arriba, pared norte
const TIMBRAZOS = 5; // cuántas veces suena el teléfono antes de que Don Ernesto venga a ver
// Tablas flojas: [piso, x, z]
const TABLAS = [[0, -5.5, 1.6], [1, 3.6, 3], [1, -5.2, -1.8], [2, -6, 2.2], [3, -3, 0.2]];
// Lugares donde puede aparecer la muñeca: [piso, x, z, hacia dónde mira (grados)]
const LUGARES_MUNECA = [
  [-1, -1.5, 3.4, 90], [-1, 5, -4.8, 0], [0, -8.3, 4.6, 90], [0, 8.3, 0.9, -90], [0, -4, -4.3, 0],
  [1, 8.4, 3.2, -90], [1, -8.3, 4.2, 90], [1, -3.6, -5.2, -90], [2, -8.3, 4.5, 90], [2, 2.4, -5.3, -90],
  [3, 2, 5, 180], [3, -6, -5, 0],
];

export class Sustos {
  constructor(scene, house, audio) {
    this.scene = scene;
    this.house = house;
    this.audio = audio;
    // Muebles que se mueven (en los datos tienen "animado: true": no se juntan con los demás)
    const animado = (tipo, piso) => house.muebles.find((m) => m.animado && m.tipo === tipo && m.piso === piso)?.grupo ?? null;
    this.maniqui = animado('maniqui', 3);
    this.mecedora = animado('mecedora', -1);
    this.caballito = animado('caballitoMecedor', 3);
    this.crearTelefono();
    this.crearEstatica();
    this.crearCuadro();
    this.crearMuneca();
    this.crearTablas();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = DISTANCIA_USO;
    this.centroPantalla = new THREE.Vector2(0, 0);
    this.mirada = new THREE.Vector3();
    this.haciaEso = new THREE.Vector3();
    this.reiniciar();
  }

  // ------------------------------------------------------------
  //  ARMADO
  // ------------------------------------------------------------
  crearTelefono() {
    this.telefono = new THREE.Group();
    this.telefono.position.set(TELEFONO.x, TELEFONO.y, TELEFONO.z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.18), materialToon('#b5179e'));
    base.position.y = 0.035;
    this.tubo = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.06), materialToon('#7209b7'));
    this.tubo.position.y = 0.1;
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 12), materialToon('#f8f9fa'));
    disco.position.set(0, 0.075, 0.03);
    this.telefono.add(base, this.tubo, disco);
    this.scene.add(this.telefono);
  }

  // La estática de la tele: un plano delante de la pantalla, con puntitos que cambian todo el tiempo
  crearEstatica() {
    this.lienzoEstatica = document.createElement('canvas');
    this.lienzoEstatica.width = 48;
    this.lienzoEstatica.height = 28;
    this.texturaEstatica = new THREE.CanvasTexture(this.lienzoEstatica);
    this.texturaEstatica.magFilter = THREE.NearestFilter;
    const material = new THREE.MeshBasicMaterial({ map: this.texturaEstatica });
    material.userData.outlineParameters = { visible: false };
    this.estatica = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.66), material);
    this.estatica.position.set(TELE.x, TELE.y, TELE.z);
    this.estatica.rotation.y = -Math.PI / 2; // mira hacia -X, como la tele
    this.estatica.raycast = () => {};
    this.scene.add(this.estatica);
  }

  crearCuadro() {
    const { grupo } = crearCuadro('retratoAbuela', 0.6, 0.8);
    this.cuadro = grupo;
    this.scene.add(grupo);
  }

  // La muñeca: vestido, cabeza, pelo y dos ojos negros grandes
  crearMuneca() {
    this.muneca = new THREE.Group();
    const parte = (geometria, color, y, x = 0, z = 0) => {
      const malla = new THREE.Mesh(geometria, materialToon(color));
      malla.position.set(x, y, z);
      malla.castShadow = true;
      malla.raycast = () => {};
      this.muneca.add(malla);
    };
    parte(new THREE.ConeGeometry(0.2, 0.42, 12), '#c9184a', 0.21);
    parte(new THREE.SphereGeometry(0.14, 14, 10), '#ffe5d9', 0.52);
    parte(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#3a2a1a', 0.55);
    for (const x of [-0.055, 0.055]) parte(new THREE.SphereGeometry(0.035, 8, 6), '#111111', 0.53, x, 0.12);
    for (const x of [-0.19, 0.19]) parte(new THREE.BoxGeometry(0.05, 0.2, 0.05), '#ffe5d9', 0.3, x);
    this.scene.add(this.muneca);
  }

  // Tablas flojas: una tabla apenas más oscura que el piso (si mirás bien, se las ve)
  crearTablas() {
    this.tablas = TABLAS.map(([piso, x, z]) => {
      const tabla = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.012, 0.3), materialToon('#6f4e37'));
      tabla.position.set(x, piso * ALTURA_PISO + 0.008, z);
      tabla.receiveShadow = true;
      tabla.userData.estatico = true;
      this.scene.add(tabla);
      return { piso, x, z, pisada: false };
    });
  }

  reiniciar() {
    this.tiempo = 0;
    this.proximoSusto = ESPERA_AL_EMPEZAR;
    this.hechos = new Set(); // los sustos de una sola vez que ya pasaron en esta partida
    this.sonando = null; // el teléfono: { timbrazos, espera }
    this.tele = 0; // segundos que le quedan prendida
    this.caida = null; // el cuadro cayéndose: { velocidad }
    this.hamaca = { mecedora: 0, caballito: 0 }; // segundos que les queda hamacándose
    this.cajita = 0; // la cajita de música: nota que viene
    this.tubo.position.y = 0.1;
    this.tubo.rotation.z = 0;
    this.estatica.visible = false;
    this.cuadro.position.set(CUADRO.x, CUADRO.piso * ALTURA_PISO + CUADRO.y, CUADRO.z);
    this.cuadro.rotation.set(0, 0, 0);
    if (this.mecedora) this.mecedora.rotation.x = 0;
    if (this.caballito) this.caballito.rotation.z = 0;
    if (this.maniqui) this.maniqui.rotation.y = Math.PI / 2;
    for (const tabla of this.tablas) tabla.pisada = false;
    this.lugarMuneca = -1;
    this.moverMuneca(null, null);
  }

  // ------------------------------------------------------------
  //  CADA FRAME
  // ------------------------------------------------------------
  // jugador: su posición (los pies) · camara · agachado / corriendo · corriente: hay luz (0 a 1)
  // hacerRuido(posicion, radio): un ruido que escuchan los enemigos
  update(dt, { jugador, camara, agachado, corriendo, enElSuelo, corriente, hacerRuido }) {
    this.tiempo += dt;
    const piso = pisoDeAltura(jugador.y);
    camara.getWorldDirection(this.mirada);

    this.actualizarManiqui(dt, jugador, camara, piso);
    this.actualizarMuneca(jugador, camara, piso);
    this.actualizarTablas(jugador, piso, agachado, corriendo, enElSuelo, hacerRuido);

    // ¿Toca un susto nuevo? (como mucho uno cada ESPERA_ENTRE_SUSTOS)
    if (this.tiempo > this.proximoSusto) {
      const cual = this.sustoPosible(jugador, piso, corriente);
      if (cual) {
        this.hechos.add(cual);
        this.proximoSusto = this.tiempo + ESPERA_ENTRE_SUSTOS;
        this.empezar(cual, jugador, hacerRuido);
      }
    }
    this.actualizarTelefono(dt, hacerRuido);
    this.actualizarTele(dt);
    this.actualizarCuadro(dt, hacerRuido);
    this.actualizarHamacas(dt);
  }

  // ¿El jugador está mirando hacia ese punto? (no importa si hay paredes en el medio)
  loMira(camara, punto) {
    this.haciaEso.copy(punto).sub(camara.position).normalize();
    return this.haciaEso.dot(this.mirada) > 0.45;
  }

  // El maniquí gira hacia vos mientras no lo mirás (y se queda duro cuando lo mirás)
  actualizarManiqui(dt, jugador, camara, piso) {
    const m = this.maniqui;
    if (!m || piso !== 3 || m.position.distanceTo(jugador) > 9) return;
    if (this.loMira(camara, m.position.clone().setY(m.position.y + 1.3))) return;
    const hacia = Math.atan2(jugador.x - m.position.x, jugador.z - m.position.z);
    const diferencia = Math.atan2(Math.sin(hacia - m.rotation.y), Math.cos(hacia - m.rotation.y));
    m.rotation.y += THREE.MathUtils.clamp(diferencia, -dt * 1.2, dt * 1.2);
  }

  // La muñeca: si está en tu piso, no la estás mirando y te alejaste (o cambiaste de piso), aparece en otro
  // lugar de tu piso que tampoco estés mirando
  actualizarMuneca(jugador, camara, piso) {
    const m = this.muneca;
    const lejos = m.userData.piso !== piso || Math.hypot(m.position.x - jugador.x, m.position.z - jugador.z) > 7;
    if (!lejos || this.loMira(camara, m.position)) return;
    if (this.tiempo < this.proximaMuneca) return;
    this.moverMuneca(piso, camara);
  }

  moverMuneca(piso, camara) {
    const candidatos = LUGARES_MUNECA.map((l, i) => ({ l, i })).filter(({ l, i }) => {
      if (i === this.lugarMuneca) return false;
      if (piso === null) return l[0] !== 0; // al empezar: en cualquier piso menos la planta baja
      return l[0] === piso && !this.loMira(camara, new THREE.Vector3(l[1], l[0] * ALTURA_PISO + 0.4, l[2]));
    });
    if (candidatos.length === 0) return;
    const { l, i } = candidatos[Math.floor(Math.random() * candidatos.length)];
    this.lugarMuneca = i;
    this.muneca.position.set(l[1], l[0] * ALTURA_PISO, l[2]);
    this.muneca.rotation.y = THREE.MathUtils.degToRad(l[3]);
    this.muneca.userData.piso = l[0];
    this.proximaMuneca = this.tiempo + 12; // (que no salte de lugar todo el tiempo)
  }

  // Tablas flojas: crujen al pisarlas parado (agachado, despacito, no)
  actualizarTablas(jugador, piso, agachado, corriendo, enElSuelo, hacerRuido) {
    for (const tabla of this.tablas) {
      const encima = tabla.piso === piso && enElSuelo && Math.abs(jugador.x - tabla.x) < 0.55 && Math.abs(jugador.z - tabla.z) < 0.3;
      if (encima && !tabla.pisada && !agachado) {
        this.audio.enElMundo('crujido', corriendo ? 5 : 3);
        hacerRuido(jugador.clone(), corriendo ? 9 : 5);
      }
      tabla.pisada = encima;
    }
  }

  // Qué susto de una sola vez puede pasar ahora, según dónde está el jugador (o null)
  sustoPosible(jugador, piso, corriente) {
    const libre = (nombre) => !this.hechos.has(nombre);
    const cerca = (x, z, radio) => Math.hypot(jugador.x - x, jugador.z - z) < radio;
    const enLaCasa = jugador.x > -9 && jugador.x < 9 && jugador.z > -6 && jugador.z < 6;
    if (!enLaCasa) return null;
    const posibles = [];
    if (piso === 0 && libre('telefono') && cerca(TELEFONO.x, TELEFONO.z, 9)) posibles.push('telefono');
    if (piso === 0 && libre('tele') && corriente > 0.5 && cerca(TELE.x - 2, TELE.z, 4.5)) posibles.push('tele');
    if (piso === 1 && libre('cuadro') && cerca(CUADRO.x, CUADRO.z + 0.9, 1.6)) posibles.push('cuadro');
    if (piso === -1 && libre('mecedora') && this.mecedora && cerca(this.mecedora.position.x, this.mecedora.position.z, 5)) posibles.push('mecedora');
    if (piso === 3 && libre('caballito') && this.caballito && cerca(this.caballito.position.x, this.caballito.position.z, 6)) posibles.push('caballito');
    if (libre('portazo') && this.puertaParaPortazo(jugador, piso)) posibles.push('portazo');
    return posibles.length > 0 ? posibles[Math.floor(Math.random() * posibles.length)] : null;
  }

  // Una puerta común abierta que acabás de cruzar (está a tu espalda, a 1,5 - 3 m)
  puertaParaPortazo(jugador, piso) {
    return this.house.puertas.find((p) => {
      if (!p.abierta || p.estilo !== 'normal' || p.conLlave || p.piso !== piso) return false;
      const distancia = Math.hypot(p.centro.x - jugador.x, p.centro.z - jugador.z);
      if (distancia < 1.5 || distancia > 3) return false;
      this.haciaEso.set(p.centro.x - jugador.x, 0, p.centro.z - jugador.z).normalize();
      return this.haciaEso.dot(this.mirada) < -0.3; // (a tu espalda: que no la veas cerrarse)
    });
  }

  empezar(cual, jugador, hacerRuido) {
    if (cual === 'telefono') {
      this.sonando = { timbrazos: 0, espera: 0 };
    } else if (cual === 'tele') {
      this.tele = 7;
      hacerRuido(this.estatica.position.clone().setY(0), 6);
    } else if (cual === 'cuadro') {
      this.caida = { velocidad: 0 };
    } else if (cual === 'mecedora') {
      this.hamaca.mecedora = 14;
      this.cajita = 0;
    } else if (cual === 'caballito') {
      this.hamaca.caballito = 10;
    } else if (cual === 'portazo') {
      const puerta = this.puertaParaPortazo(jugador, pisoDeAltura(jugador.y));
      if (!puerta) return;
      puerta.alternar();
      this.audio.desde(puerta.centro, 'portazo');
      hacerRuido(puerta.centro.clone().setY(jugador.y), 7);
    }
  }

  // El teléfono suena TIMBRAZOS veces. Si nadie lo atiende, el último hace un ruido grande: Don Ernesto viene
  actualizarTelefono(dt, hacerRuido) {
    const s = this.sonando;
    if (!s) return;
    this.tubo.rotation.z = Math.sin(this.tiempo * 60) * 0.06; // (el tubo tiembla mientras suena)
    s.espera -= dt;
    if (s.espera > 0) return;
    if (s.timbrazos >= TIMBRAZOS) {
      hacerRuido(this.telefono.position.clone().setY(0), 16);
      this.colgar();
      return;
    }
    s.timbrazos++;
    s.espera = 1.6;
    this.audio.desde(this.telefono.position, 'telefono');
  }

  colgar() {
    this.sonando = null;
    this.tubo.rotation.z = 0;
  }

  // E mirando el teléfono mientras suena: lo atendés (del otro lado, alguien respira...)
  atender() {
    if (!this.sonando) return false;
    this.colgar();
    this.audio.enElMundo('llamada');
    return true;
  }

  // ¿Está mirando el teléfono (y está sonando)?
  mirandoElTelefono(camera) {
    if (!this.sonando) return false;
    this.raycaster.setFromCamera(this.centroPantalla, camera);
    const choques = this.raycaster.intersectObjects([...this.house.obstaculos, this.telefono], true);
    if (choques.length === 0) return false;
    for (let obj = choques[0].object; obj; obj = obj.parent) if (obj === this.telefono) return true;
    return false;
  }

  // La tele: estática en la pantalla y "shhhh"
  actualizarTele(dt) {
    if (this.tele <= 0) return;
    this.tele -= dt;
    this.estatica.visible = this.tele > 0;
    if (!this.estatica.visible) return;
    const ctx = this.lienzoEstatica.getContext('2d');
    const imagen = ctx.createImageData(48, 28);
    for (let i = 0; i < imagen.data.length; i += 4) {
      const v = Math.random() * 255;
      imagen.data[i] = imagen.data[i + 1] = imagen.data[i + 2] = v;
      imagen.data[i + 3] = 255;
    }
    ctx.putImageData(imagen, 0, 0);
    this.texturaEstatica.needsUpdate = true;
    this.proximaEstatica = (this.proximaEstatica ?? 0) - dt;
    if (this.proximaEstatica <= 0) {
      this.proximaEstatica = 0.5;
      this.audio.desde(this.estatica.position, 'estatica');
    }
  }

  // El cuadro se suelta, cae y se rompe contra el piso
  actualizarCuadro(dt, hacerRuido) {
    const c = this.caida;
    if (!c) return;
    c.velocidad += 9.8 * dt;
    this.cuadro.position.y -= c.velocidad * dt;
    this.cuadro.rotation.z += dt * 2.5;
    const suelo = CUADRO.piso * ALTURA_PISO + 0.42;
    if (this.cuadro.position.y > suelo) return;
    this.cuadro.position.y = suelo;
    this.cuadro.position.z = CUADRO.z + 0.25;
    this.cuadro.rotation.set(-1.25, 0, 0.5); // queda apoyado contra la pared, torcido
    this.caida = null;
    this.audio.desde(this.cuadro.position, 'vidrio');
    hacerRuido(this.cuadro.position.clone().setY(CUADRO.piso * ALTURA_PISO), 9);
  }

  // La mecedora y el caballito se hamacan solos un rato (con su crujido) y se van frenando
  actualizarHamacas(dt) {
    const h = this.hamaca;
    if (h.mecedora > 0 && this.mecedora) {
      h.mecedora -= dt;
      const fuerza = Math.min(1, h.mecedora / 3);
      const antes = this.mecedora.rotation.x;
      this.mecedora.rotation.x = Math.sin(this.tiempo * 2.4) * 0.13 * fuerza;
      if (antes < 0 && this.mecedora.rotation.x >= 0) this.audio.desde(this.mecedora.position, 'crujido', 2);
      // La cajita de música: una nota cada tanto, mientras se hamaca
      this.proximaNota = (this.proximaNota ?? 0) - dt;
      if (this.proximaNota <= 0 && h.mecedora > 2) {
        this.proximaNota = 0.42;
        this.audio.desde(this.mecedora.position.clone().setY(this.mecedora.position.y + 0.8), 'cajita', this.cajita++);
      }
    }
    if (h.caballito > 0 && this.caballito) {
      h.caballito -= dt;
      const fuerza = Math.min(1, h.caballito / 3);
      const antes = this.caballito.rotation.z;
      this.caballito.rotation.z = Math.sin(this.tiempo * 3) * 0.16 * fuerza;
      if (antes < 0 && this.caballito.rotation.z >= 0) this.audio.desde(this.caballito.position, 'crujido', 1.5);
    }
  }
}
