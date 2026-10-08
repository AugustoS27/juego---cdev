// Las distintas formas de entrar a la casa. Cada una tiene su "precio":
//
//   Ventana del living:  rápida y cerca, pero romperla hace MUCHO ruido.
//   Puerta trasera:      silenciosa (quedó abierta), pero está del otro lado de la casa.
//                        (Es una puerta común: está en PUERTAS de HouseData.js)
//   Escalera al balcón:  poco ruido, pero entrás arriba... donde duerme el dueño.
//   Portón del garaje:   hay que forzarlo varios segundos, y cada tirón hace ruido.
//   Llave en la maceta:  silenciosa, pero hay que adivinar en cuál de las macetas está.
//   Pozo del jardín:     silencioso, pero el túnel es largo, oscuro y hay que ir agachado.
//                        Llega al sótano. (Está en Especiales.js, igual que la trampilla del ático,
//                        que también se usa desde acá aunque no sea una entrada.)
//   Y cinco más en EntradasNuevas.js: chimenea, ventanita del sótano, gatera, enredadera y tragaluz.
//
// Todas funcionan igual: tienen una "raiz" (el objeto 3D que se mira), un texto de ayuda,
// y un usar() que hace la acción y DEVUELVE qué pasó (un "resultado"):
//   { aviso, sonido, ruido: { posicion, radio }, animacion: { destino, duracion, arco, ... }, llave, hollin }
// Game lee ese resultado y se encarga del sonido, el ruido, el cartel y la animación.
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { VENTANA_ROMPIBLE, PORTON_GARAJE, ESCALERA_BALCON, BALCON, MACETAS, POZO, TUNEL, ALTURA_PISO } from './HouseData.js';
import { Pozo } from './Especiales.js';
import { Chimenea, VentanaSotano, Gatera, Enredadera, Tragaluz } from './EntradasNuevas.js';

const DISTANCIA_USO = 2.5; // a cuántos metros se puede usar una entrada
const RUIDO = { romperVentana: 15, levantarEscalera: 5, forcejeo: 9 };
const TIEMPO_FORZAR = 3; // segundos manteniendo E para abrir el portón

// ------------------------------------------------------------
//  VENTANA ROMPIBLE
// ------------------------------------------------------------
class VentanaRompible {
  constructor(scene) {
    const { x, z, ancho, abajo, arriba } = VENTANA_ROMPIBLE;
    const alto = arriba - abajo;
    this.raiz = new THREE.Group();
    this.raiz.position.set(x, 0, z);
    scene.add(this.raiz);

    // Marco (4 listones) del grosor de la pared
    const liston = (a, h, px, py) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(a, h, 0.26), materialToon('#ffffff'));
      m.position.set(px, py, 0);
      m.castShadow = true;
      this.raiz.add(m);
    };
    liston(ancho, 0.08, 0, abajo + 0.04);
    liston(ancho, 0.08, 0, arriba - 0.04);
    liston(0.08, alto, -ancho / 2 + 0.04, abajo + alto / 2);
    liston(0.08, alto, ancho / 2 - 0.04, abajo + alto / 2);

    // Vidrio semitransparente (material propio, porque el de los demás es opaco)
    this.vidrio = new THREE.Mesh(
      new THREE.BoxGeometry(ancho - 0.1, alto - 0.1, 0.03),
      new THREE.MeshToonMaterial({ color: '#bde0fe', transparent: true, opacity: 0.5 }),
    );
    this.vidrio.position.y = abajo + alto / 2;
    this.vidrio.material.userData.outlineParameters = { visible: false }; // sin borde negro
    this.raiz.add(this.vidrio);

    // Pedacitos de vidrio en el piso (aparecen al romperla)
    this.vidriosRotos = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const pedazo = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06 + Math.random() * 0.06), materialToon('#caf0f8'));
      pedazo.position.set((Math.random() - 0.5) * 1.6, 0.03, (Math.random() - 0.5) * 2.2);
      pedazo.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.vidriosRotos.add(pedazo);
    }
    this.raiz.add(this.vidriosRotos);

    // Puntos de un lado y del otro de la ventana (para trepar)
    this.afuera = new THREE.Vector3(x, 0, z + 0.9);
    this.adentro = new THREE.Vector3(x, 0, z - 0.9);
  }

  ayuda() {
    return this.rota ? '[E] Trepar por la ventana' : '[E] Romper la ventana (¡hace MUCHO ruido!)';
  }

  usar(jugador) {
    if (!this.rota) {
      this.rota = true;
      this.vidrio.visible = false; // (el rayo la sigue detectando, así se puede "mirar" para trepar)
      this.vidriosRotos.visible = true;
      return {
        sonido: 'vidrio',
        aviso: '💥 ¡CRASH! Rompiste la ventana... te escuchó todo el barrio',
        ruido: { posicion: this.adentro, radio: RUIDO.romperVentana },
      };
    }
    // Trepar al otro lado
    const estaAfuera = jugador.position.z > VENTANA_ROMPIBLE.z;
    return { sonido: 'trepar', animacion: { destino: estaAfuera ? this.adentro : this.afuera, duracion: 1.1, arco: 0.9 } };
  }

  update() {}

  reiniciar() {
    this.rota = false;
    this.vidrio.visible = true;
    this.vidriosRotos.visible = false;
  }
}

// ------------------------------------------------------------
//  ESCALERA AL BALCÓN
// ------------------------------------------------------------
class EscaleraBalcon {
  constructor(scene) {
    const { x, zBase, zApoyo, alturaApoyo } = ESCALERA_BALCON;
    const largo = Math.hypot(zBase - zApoyo, alturaApoyo);
    // Ángulos de giro en X: apoyada se inclina hacia la casa; tirada queda acostada en el pasto
    this.anguloApoyada = -Math.atan2(zBase - zApoyo, alturaApoyo);
    this.anguloTirada = Math.PI / 2 - 0.02;

    // La raíz está en la base de la escalera: girándola, la escalera se levanta
    this.raiz = new THREE.Group();
    this.raiz.position.set(x, 0.05, zBase);
    scene.add(this.raiz);
    const color = '#c0c7ce';
    for (const lado of [-0.25, 0.25]) {
      const larguero = new THREE.Mesh(new THREE.BoxGeometry(0.07, largo, 0.07), materialToon(color));
      larguero.position.set(lado, largo / 2, 0);
      larguero.castShadow = true;
      this.raiz.add(larguero);
    }
    for (let y = 0.3; y < largo; y += 0.32) {
      const peldaño = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), materialToon(color));
      peldaño.position.set(0, y, 0);
      peldaño.castShadow = true;
      this.raiz.add(peldaño);
    }
    // "Zona para apuntar" invisible que tapa los huecos entre peldaños
    // (si no, el rayo de la mira pasa entre dos peldaños y no detecta la escalera)
    const zona = new THREE.Mesh(new THREE.BoxGeometry(0.6, largo, 0.15), new THREE.MeshBasicMaterial());
    zona.position.y = largo / 2;
    zona.visible = false;
    this.raiz.add(zona);

    this.abajo = new THREE.Vector3(x, 0, zBase + 0.6);
    this.arriba = new THREE.Vector3(x, 3, BALCON.z2 - 0.7);
  }

  ayuda(jugador) {
    if (this.estado === 'tirada') return '[E] Levantar la escalera';
    if (this.estado === 'levantando') return null;
    return jugador.position.y > 1.5 ? '[E] Bajar por la escalera' : '[E] Subir al balcón';
  }

  usar(jugador) {
    if (this.estado === 'tirada') {
      this.estado = 'levantando';
      return {
        sonido: 'escalera',
        aviso: '🪜 Apoyaste la escalera contra el balcón',
        ruido: { posicion: this.abajo, radio: RUIDO.levantarEscalera },
      };
    }
    if (this.estado !== 'apoyada') return null;
    const estaArriba = jugador.position.y > 1.5;
    return { sonido: 'trepar', animacion: { destino: estaArriba ? this.abajo : this.arriba, duracion: 1.8, arco: 0.4 } };
  }

  // Animación de levantarla: gira desde acostada hasta apoyada
  update(dt) {
    if (this.estado === 'levantando') {
      this.angulo = Math.max(this.anguloApoyada, this.angulo - 1.6 * dt);
      if (this.angulo === this.anguloApoyada) this.estado = 'apoyada';
    }
    this.raiz.rotation.x = this.angulo;
    this.raiz.updateMatrixWorld(true);
  }

  reiniciar() {
    this.estado = 'tirada';
    this.angulo = this.anguloTirada;
    this.update(0);
  }
}

// ------------------------------------------------------------
//  PORTÓN DEL GARAJE (se fuerza manteniendo E)
// ------------------------------------------------------------
class PortonGaraje {
  constructor(scene, house) {
    const { x, z, ancho, alto } = PORTON_GARAJE;
    this.house = house;
    this.seMantiene = true; // se usa manteniendo E (no con un solo toque)

    // Portón basculante: gira desde arriba hacia adentro del garaje
    this.raiz = new THREE.Group();
    this.raiz.position.set(x, alto, z);
    scene.add(this.raiz);
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(ancho - 0.05, alto - 0.02, 0.08), materialToon('#e9ecef'));
    hoja.position.y = -alto / 2;
    hoja.castShadow = true;
    this.raiz.add(hoja);
    for (let i = 1; i < 6; i++) {
      const franja = new THREE.Mesh(new THREE.BoxGeometry(ancho - 0.2, 0.04, 0.02), materialToon('#adb5bd'));
      franja.position.set(0, -i * (alto / 6), 0.05);
      this.raiz.add(franja);
    }
    const manija = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.06), materialToon('#495057'));
    manija.position.set(0, -alto + 0.3, 0.07);
    this.raiz.add(manija);
    house.obstaculos.push(this.raiz);

    // Mientras está cerrado, choca
    this.collider = new THREE.Box3(new THREE.Vector3(x - ancho / 2, 0, z - 0.1), new THREE.Vector3(x + ancho / 2, alto, z + 0.1));
    this.puntoRuido = new THREE.Vector3(x, 0, z);
  }

  ayuda() {
    if (this.abierto) return null;
    if (this.progreso > 0) return `Forzando el portón... ${Math.round(this.progreso * 100)}% (mantené E)`;
    return '[Mantené E] Forzar el portón (hace ruido)';
  }

  usar() {
    return null; // se usa con forzar(), manteniendo la tecla
  }

  // Se llama en cada frame mientras el jugador mantiene E mirando el portón.
  // Devuelve una lista de resultados (tirones con ruido, y el aviso final).
  forzar(dt) {
    if (this.abierto) return [];
    const resultados = [];
    this.forzandoAhora = true;
    this.progreso += dt / TIEMPO_FORZAR;
    this.tiempoParaRuido -= dt;
    if (this.tiempoParaRuido <= 0) {
      this.tiempoParaRuido = 0.8;
      resultados.push({ sonido: 'forcejeo', ruido: { posicion: this.puntoRuido, radio: RUIDO.forcejeo } });
    }
    if (this.progreso >= 1) {
      this.abierto = true;
      this.house.quitarCollider(this.collider);
      resultados.push({ sonido: 'porton', aviso: '🚗 ¡El portón cedió! Ya podés entrar al garaje' });
    }
    return resultados;
  }

  update(dt) {
    // Si soltó la tecla, el progreso baja despacito (el portón "vuelve")
    if (!this.forzandoAhora && !this.abierto) this.progreso = Math.max(0, this.progreso - dt * 0.25);
    this.forzandoAhora = false;
    // Animación de apertura: gira 90° hacia adentro
    if (this.abierto) this.angulo = Math.min(Math.PI / 2, this.angulo + 2 * dt);
    this.raiz.rotation.x = this.angulo;
    this.raiz.updateMatrixWorld(true);
  }

  reiniciar() {
    this.abierto = false;
    this.progreso = 0;
    this.tiempoParaRuido = 0;
    this.angulo = 0;
    this.house.quitarCollider(this.collider); // (por si ya estaba)
    this.house.colliders.push(this.collider);
    this.update(0);
  }
}

// ------------------------------------------------------------
//  MACETA (en una de ellas está la llave de la puerta de calle)
// ------------------------------------------------------------
const FRASES_SIN_LLAVE = [
  'Nada... solo una lombriz 🪱',
  'Nada. Un bicho bolita te saluda.',
  'Nada, pero encontraste 10 pesos. No alcanzan para nada.',
];

class Maceta {
  constructor(scene, house, x, z) {
    this.raiz = new THREE.Group();
    this.raiz.position.set(x, 0, z);
    scene.add(this.raiz);

    // La maceta en sí (un grupo aparte, para poder inclinarla al levantarla)
    this.maceta = new THREE.Group();
    this.raiz.add(this.maceta);
    const parte = (geometria, color, y) => {
      const m = new THREE.Mesh(geometria, materialToon(color));
      m.position.y = y;
      m.castShadow = true;
      this.maceta.add(m);
    };
    parte(new THREE.CylinderGeometry(0.28, 0.2, 0.45, 14), '#d2691e', 0.225);
    parte(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 14), '#5c4033', 0.44);
    parte(new THREE.SphereGeometry(0.3, 10, 8), '#52b788', 0.65);
    parte(new THREE.SphereGeometry(0.07, 8, 6), '#ff595e', 0.9);

    // La llave (escondida debajo, aparece al levantar la maceta que la tiene)
    this.llave = new THREE.Group();
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 16), materialToon('#ffd23f'));
    aro.rotation.x = Math.PI / 2;
    const vara = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.03), materialToon('#ffd23f'));
    vara.position.x = 0.12;
    this.llave.add(aro, vara);
    this.llave.position.set(0.1, 0.02, 0.1);
    this.raiz.add(this.llave);

    house.colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.3, 0, z - 0.3), new THREE.Vector3(x + 0.3, 1, z + 0.3)));
  }

  ayuda() {
    if (!this.revisada) return '[E] Mirar debajo de la maceta';
    return this.tieneLlave ? 'Acá estaba la llave' : 'Ya revisaste esta maceta';
  }

  usar() {
    if (this.revisada) return null;
    this.revisada = true;
    this.tiempoAnimacion = 0;
    if (this.tieneLlave) {
      this.llave.visible = true;
      return { sonido: 'llave', aviso: '🔑 ¡La llave de repuesto! Ya podés abrir la puerta de calle', llave: true };
    }
    return { sonido: 'maceta', aviso: FRASES_SIN_LLAVE[Math.floor(Math.random() * FRASES_SIN_LLAVE.length)] };
  }

  // Animación: la maceta se inclina (como si la levantaras) y vuelve a su lugar
  update(dt) {
    if (this.tiempoAnimacion === null) return;
    this.tiempoAnimacion += dt;
    const t = Math.min(this.tiempoAnimacion / 1.2, 1);
    this.maceta.rotation.z = Math.sin(t * Math.PI) * 0.7;
    this.maceta.position.x = Math.sin(t * Math.PI) * -0.15;
    if (t >= 1) {
      this.tiempoAnimacion = null;
      this.llave.visible = false; // "te la guardaste"
    }
  }

  reiniciar() {
    this.revisada = false;
    this.tieneLlave = false;
    this.tiempoAnimacion = null;
    this.llave.visible = false;
    this.maceta.rotation.z = 0;
    this.maceta.position.x = 0;
  }
}

// ------------------------------------------------------------
//  TODAS LAS ENTRADAS JUNTAS
// ------------------------------------------------------------
export class Entradas {
  constructor(scene, house) {
    this.house = house;
    this.ventana = new VentanaRompible(scene);
    this.escalera = new EscaleraBalcon(scene);
    this.porton = new PortonGaraje(scene, house);
    this.macetas = MACETAS.map(({ x, z }) => new Maceta(scene, house, x, z));
    this.pozo = new Pozo(scene, house, POZO, TUNEL.piso * ALTURA_PISO);
    this.nuevas = [
      new Chimenea(scene, house),
      new VentanaSotano(scene),
      new Gatera(house.puertaDeCalle),
      new Enredadera(scene),
      new Tragaluz(scene),
    ];
    this.lista = [this.ventana, this.escalera, this.porton, ...this.macetas, this.pozo, ...this.nuevas];
    if (house.trampilla) this.lista.push(house.trampilla); // la escalera plegable del ático

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = DISTANCIA_USO;
    this.centroPantalla = new THREE.Vector2(0, 0);
    this.reiniciar();
  }

  // ¿Qué entrada está mirando el jugador? Tiramos un rayo desde el centro de la cámara
  // contra la casa y las entradas, y vemos si lo PRIMERO que toca es parte de una entrada.
  mirada(camera) {
    this.raycaster.setFromCamera(this.centroPantalla, camera);
    const objetos = [...this.house.obstaculos, ...this.lista.map((e) => e.raiz)];
    const choques = this.raycaster.intersectObjects(objetos, true);
    if (choques.length === 0) return null;
    for (let obj = choques[0].object; obj; obj = obj.parent) {
      const entrada = this.lista.find((e) => e.raiz === obj);
      if (entrada) return entrada;
    }
    return null;
  }

  update(dt) {
    for (const entrada of this.lista) entrada.update(dt);
  }

  // Todo como al principio, y la llave va a parar a una maceta al azar
  reiniciar() {
    for (const entrada of this.lista) entrada.reiniciar();
    const conLlave = Math.floor(Math.random() * this.macetas.length);
    this.macetas.forEach((maceta, i) => (maceta.tieneLlave = i === conLlave));
    if (import.meta.env.DEV) console.log(`[debug] La llave está en la maceta ${conLlave + 1}`);
  }
}
