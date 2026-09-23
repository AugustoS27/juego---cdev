// Una puerta que gira sobre su bisagra. Cerrada bloquea el paso; abierta no.
import * as THREE from 'three';
import { materialToon } from './Materials.js';

const VELOCIDAD_GIRO = 5; // radianes por segundo (animación de abrir/cerrar)
const ANGULO_ABIERTA = Math.PI / 2; // 90 grados
const GROSOR_HUECO = 0.2; // igual que las paredes

export class Door {
  // x, z: centro del hueco. y: altura del piso. eje: hacia dónde corre la pared ('x' o 'z').
  constructor(scene, { x, y, z, eje, ancho, alto, conLlave = false, abierta = false, deCalle = false }) {
    this.conLlave = conLlave; // no se puede abrir (la puerta de calle, hasta encontrar la llave)
    this.abierta = false;
    this.deCalle = deCalle;
    // Cómo arranca en cada partida (ver reiniciar)
    this.conLlaveInicial = conLlave;
    this.abiertaInicial = abierta;
    this.angulo = 0; // ángulo actual (se anima hacia anguloObjetivo)
    this.anguloObjetivo = 0;
    this.tiempoTrabada = 0; // > 0 mientras el dueño la tenga trabada (segundos que faltan)
    this.piso = Math.round(y / 3);

    // Centro de la puerta: sirve para saber si el jugador está cerca
    this.centro = new THREE.Vector3(x, y + alto / 2, z);

    // La BISAGRA es un grupo vacío ubicado en un costado del hueco.
    // La hoja de la puerta es hija de la bisagra: al girar la bisagra, la hoja gira con ella.
    this.bisagra = new THREE.Group();
    if (eje === 'x') {
      this.bisagra.position.set(x - ancho / 2, y, z);
      this.rotacionBase = 0;
    } else {
      this.bisagra.position.set(x, y, z - ancho / 2);
      this.rotacionBase = -Math.PI / 2; // la giramos para que quede a lo largo de Z
    }
    this.bisagra.rotation.y = this.rotacionBase;
    scene.add(this.bisagra);

    // Hoja (un poco más chica que el hueco para que no roce)
    this.materialNormal = materialToon(deCalle ? '#8b4513' : '#ff9f1c');
    this.materialTrabada = materialToon('#e63946'); // roja mientras está trabada
    this.hoja = new THREE.Mesh(new THREE.BoxGeometry(ancho - 0.04, alto - 0.02, 0.08), this.materialNormal);
    this.hoja.position.set(ancho / 2, alto / 2, 0);
    this.hoja.castShadow = true;
    this.hoja.receiveShadow = true;
    this.bisagra.add(this.hoja);

    // Picaportes (uno de cada lado)
    for (const lado of [-1, 1]) {
      const picaporte = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), materialToon('#ffd23f'));
      picaporte.position.set(ancho - 0.15, 1, lado * 0.07);
      this.bisagra.add(picaporte);
    }

    // Caja de colisión: todo el hueco de la puerta. Solo se usa mientras está cerrada.
    const mitad = ancho / 2;
    const g = GROSOR_HUECO / 2;
    this.collider =
      eje === 'x'
        ? new THREE.Box3(new THREE.Vector3(x - mitad, y, z - g), new THREE.Vector3(x + mitad, y + alto, z + g))
        : new THREE.Box3(new THREE.Vector3(x - g, y, z - mitad), new THREE.Vector3(x + g, y + alto, z + mitad));
  }

  // ¿Bloquea el paso? Sí, mientras esté cerrada (o cerrándose).
  get bloquea() {
    return !this.abierta;
  }

  get trabada() {
    return this.tiempoTrabada > 0;
  }

  // Abre si está cerrada, cierra si está abierta. Devuelve false si no se pudo.
  alternar() {
    if (this.conLlave || this.trabada) return false;
    this.abierta = !this.abierta;
    this.anguloObjetivo = this.abierta ? ANGULO_ABIERTA : 0;
    return true;
  }

  // El dueño la cierra y la traba por unos segundos. Después se destraba y se abre sola.
  trabar(segundos) {
    this.abierta = false;
    this.anguloObjetivo = 0;
    this.tiempoTrabada = segundos;
    this.hoja.material = this.materialTrabada;
  }

  destrabar() {
    this.tiempoTrabada = 0;
    this.hoja.material = this.materialNormal;
  }

  // Vuelve a como estaba al empezar la partida, sin animación
  reiniciar() {
    this.destrabar();
    this.conLlave = this.conLlaveInicial;
    this.abierta = this.abiertaInicial;
    this.angulo = this.abierta ? ANGULO_ABIERTA : 0;
    this.anguloObjetivo = this.angulo;
    this.bisagra.rotation.y = this.rotacionBase + this.angulo;
    this.bisagra.updateMatrixWorld(true);
  }

  // Animación: acercamos el ángulo actual al objetivo un poquito por frame
  update(dt) {
    // Cuenta regresiva de la traba: al llegar a 0 se destraba y se abre sola
    if (this.trabada) {
      this.tiempoTrabada -= dt;
      if (this.tiempoTrabada <= 0) {
        this.destrabar();
        this.alternar();
      }
    }

    const diferencia = this.anguloObjetivo - this.angulo;
    const paso = VELOCIDAD_GIRO * dt;
    if (Math.abs(diferencia) <= paso) {
      this.angulo = this.anguloObjetivo;
    } else {
      this.angulo += Math.sign(diferencia) * paso;
    }
    this.bisagra.rotation.y = this.rotacionBase + this.angulo;
    // Actualizamos su posición en el mundo ya mismo: los rayos de visión del dueño la usan
    this.bisagra.updateMatrixWorld(true);
  }
}
