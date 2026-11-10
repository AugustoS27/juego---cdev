// Zonas especiales de la casa que se usan con E (etapa 11B):
//
//   Trampilla del ático: la escalera de la sala de trofeos es PLEGABLE. Plegada queda acostada en
//     el techo tapando el hueco (desde el ático es la tapa de la trampilla) y de ella cuelga una
//     cuerda. Tirando de la cuerda (E) se despliega. Hace ruido.
//   Pozo del jardín: bajás por una escalerita hasta el fondo, donde arranca el túnel secreto que
//     llega a la bodega del sótano. Es una forma nueva de entrar a la casa.
//
// Funcionan igual que las entradas (ver Entradas.js): tienen una "raiz" (lo que se mira), un texto
// de ayuda y un usar() que devuelve qué pasó { sonido, ruido, animacion }. Game lo aplica.
import * as THREE from 'three';
import { materialToon } from './Materials.js';

const VELOCIDAD_PLEGADO = 1.2; // radianes por segundo
const RUIDO_TRAMPILLA = 6; // metros

// ------------------------------------------------------------
//  TRAMPILLA DEL ÁTICO (escalera plegable)
// ------------------------------------------------------------
export class Trampilla {
  // bisagra:       grupo en la punta de arriba de la escalera; todo lo de la escalera es hijo suyo,
  //                así que girando la bisagra se pliega o se despliega la escalera entera
  // rebanadas:     sus colisiones (solo cuentan con la escalera desplegada)
  // anguloPlegada: cuánto gira la bisagra para que la escalera quede acostada en el techo
  // haciaAbajo:    vector de la bisagra al pie de la escalera (con la escalera desplegada)
  // abajo, arriba: puntos al pie y al final de la escalera (ahí el dueño la despliega si hace falta)
  // zona:          caja que ocupa la escalera desplegada (no se pliega con alguien encima)
  constructor(house, { bisagra, rebanadas, anguloPlegada, haciaAbajo, abajo, arriba, zona }) {
    this.house = house;
    this.raiz = bisagra;
    this.rebanadas = rebanadas;
    this.anguloPlegada = anguloPlegada;
    this.abajo = abajo;
    this.arriba = arriba;
    this.zona = zona;
    this.centro = abajo.clone().setY(abajo.y + 2.5); // de dónde sale el sonido
    this.crearCuerda(haciaAbajo);
    this.reiniciar();
  }

  // La cuerda cuelga cerca del pie de la escalera, del lado de abajo. Como es hija de la bisagra,
  // la calculamos para que quede vertical cuando la escalera está plegada.
  crearCuerda(haciaAbajo) {
    const largo = haciaAbajo.length();
    const direccion = haciaAbajo.clone().normalize();
    // "Abajo" de la escalera (perpendicular a ella, del lado opuesto a los escalones)
    const debajo = new THREE.Vector3(0, direccion.z, -direccion.y);
    const punto = direccion.clone().multiplyScalar(largo * 0.9).addScaledVector(debajo, 0.3);
    // Con la escalera plegada, "hacia el piso" visto desde la bisagra es esta dirección:
    const phi = this.anguloPlegada;
    const haciaElPiso = new THREE.Vector3(0, -Math.cos(phi), Math.sin(phi));

    const cuerda = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), materialToon('#f4e1c1'));
    cuerda.position.copy(punto).addScaledVector(haciaElPiso, 0.35);
    cuerda.rotation.x = -phi;
    const manija = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), materialToon('#e63946'));
    manija.position.copy(punto).addScaledVector(haciaElPiso, 0.75);
    this.raiz.add(cuerda, manija);
  }

  get plegada() {
    return this.objetivo === this.anguloPlegada;
  }

  get moviendose() {
    return this.angulo !== this.objetivo;
  }

  ayuda(jugador) {
    if (this.moviendose) return null;
    if (!this.plegada) return '[E] Plegar la escalera';
    return jugador.position.y < this.abajo.y + 1.5 ? '[E] Tirar de la cuerda (¿qué habrá arriba?)' : '[E] Abrir la trampilla';
  }

  usar(jugador) {
    if (this.moviendose) return null;
    const ruido = { posicion: this.centro, radio: RUIDO_TRAMPILLA };
    if (this.plegada) {
      this.desplegar();
      return { sonido: 'trampilla', ruido };
    }
    if (jugador.obtenerCaja().intersectsBox(this.zona)) return null;
    this.plegar();
    return { sonido: 'trampilla', ruido };
  }

  desplegar() {
    this.objetivo = 0; // las colisiones se agregan cuando termina de bajar (ver update)
  }

  plegar() {
    this.quitarRebanadas();
    this.objetivo = this.anguloPlegada;
  }

  quitarRebanadas() {
    this.house.colliders = this.house.colliders.filter((c) => !this.rebanadas.includes(c));
  }

  // Para el dueño: si está plegada y él está al pie o arriba, la despliega. Devuelve true si lo hizo.
  abrirSiEstaCerca(posicion) {
    if (!this.plegada || this.moviendose) return false;
    const cerca = (punto) => Math.hypot(posicion.x - punto.x, posicion.z - punto.z) < 1.5 && Math.abs(posicion.y - punto.y) < 1;
    if (!cerca(this.abajo) && !cerca(this.arriba)) return false;
    this.desplegar();
    return true;
  }

  // Animación: la bisagra gira de a poco hacia el ángulo objetivo
  update(dt) {
    const diferencia = this.objetivo - this.angulo;
    const paso = VELOCIDAD_PLEGADO * dt;
    this.angulo = Math.abs(diferencia) <= paso ? this.objetivo : this.angulo + Math.sign(diferencia) * paso;
    // Terminó de bajar: ahora sí la escalera choca por los costados
    if (this.angulo === 0 && this.objetivo === 0 && !this.house.colliders.includes(this.rebanadas[0])) {
      this.house.colliders.push(...this.rebanadas);
    }
    this.raiz.rotation.x = this.angulo;
    this.raiz.updateMatrixWorld(true); // los rayos (el suelo) la necesitan actualizada ya mismo
  }

  reiniciar() {
    this.angulo = this.anguloPlegada;
    this.objetivo = this.anguloPlegada;
    this.quitarRebanadas();
    this.update(0);
  }
}

// ------------------------------------------------------------
//  POZO DEL JARDÍN (entrada al túnel secreto)
// ------------------------------------------------------------
export class Pozo {
  // x, z: centro del pozo. fondo: altura del piso del túnel (y)
  constructor(scene, house, { x, z }, fondo) {
    this.raiz = new THREE.Group();
    scene.add(this.raiz);
    const parte = (geometria, material, px, py, pz) => {
      const m = new THREE.Mesh(geometria, typeof material === 'string' ? materialToon(material) : material);
      m.position.set(px, py, pz);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.estatico = true; // el pozo no se mueve: se junta con lo demás (ver Optimizar.js)
      this.raiz.add(m);
      return m;
    };

    // --- Arriba: el pozo de piedra con su techito ---
    const piedra = new THREE.MeshToonMaterial({ color: '#a8a29e', side: THREE.DoubleSide });
    parte(new THREE.CylinderGeometry(0.75, 0.8, 0.8, 20, 1, true), piedra, x, 0.4, z); // la pared (sin tapas)
    const borde = parte(new THREE.TorusGeometry(0.75, 0.09, 8, 24), '#78716c', x, 0.8, z);
    borde.rotation.x = Math.PI / 2;
    // Adentro, negro: parece que no tiene fondo
    const oscuro = new THREE.Mesh(new THREE.CircleGeometry(0.72, 20), new THREE.MeshBasicMaterial({ color: '#0b0b0b' }));
    oscuro.rotation.x = -Math.PI / 2;
    oscuro.position.set(x, 0.05, z);
    oscuro.userData.outlineParameters = { visible: false };
    this.raiz.add(oscuro);
    for (const lado of [-1, 1]) parte(new THREE.BoxGeometry(0.12, 1.9, 0.12), '#8d5524', x + lado * 0.85, 0.95, z); // postes
    for (const lado of [-1, 1]) {
      const techito = parte(new THREE.BoxGeometry(2, 0.06, 0.8), '#b5523b', x, 2.05, z + lado * 0.3);
      techito.rotation.x = lado * 0.5;
    }
    const rodillo = parte(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8), '#6f4518', x, 1.5, z);
    rodillo.rotation.z = Math.PI / 2;
    parte(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), '#f4e1c1', x, 1.25, z); // soga
    parte(new THREE.CylinderGeometry(0.13, 0.1, 0.22, 10), '#6c757d', x, 0.9, z); // balde

    // --- Abajo: el caño de piedra y la escalerita de hierro (en la punta este del túnel) ---
    const hueco = new THREE.MeshToonMaterial({ color: '#3d3229', side: THREE.BackSide });
    const alturaCaño = -0.35 - (fondo + 1.25);
    parte(new THREE.CylinderGeometry(0.6, 0.6, alturaCaño, 14, 1, true), hueco, x, fondo + 1.25 + alturaCaño / 2, z).userData.outlineParameters = { visible: false };
    const xEscalera = x + 0.42;
    for (let y = fondo + 0.3; y < -0.4; y += 0.3) parte(new THREE.BoxGeometry(0.05, 0.04, 0.45), '#495057', xEscalera, y, z);
    for (const lado of [-1, 1]) parte(new THREE.BoxGeometry(0.05, -0.4 - fondo, 0.05), '#495057', xEscalera, (fondo - 0.4) / 2, z + lado * 0.22);
    // "Zona para apuntar" invisible sobre la escalerita (el rayo pasaría entre los peldaños)
    const zona = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 0.6), new THREE.MeshBasicMaterial());
    zona.position.set(xEscalera - 0.05, fondo + 1.3, z);
    zona.visible = false;
    this.raiz.add(zona);
    this.raiz.updateMatrixWorld(true);

    // No se puede caminar adentro del pozo (hay que usarlo con E)
    house.colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.9, 0, z - 0.9), new THREE.Vector3(x + 0.9, 1, z + 0.9)));

    this.arriba = new THREE.Vector3(x, 0, z + 1.3); // al lado del pozo, en el pasto
    this.abajo = new THREE.Vector3(x - 0.1, fondo, z); // en el fondo, al lado de la escalerita
  }

  ayuda(jugador) {
    return jugador.position.y > -1.5 ? '[E] Bajar por el pozo (¿adónde llevará?)' : '[E] Subir por la escalerita del pozo';
  }

  usar(jugador) {
    if (jugador.position.y > -1.5) {
      return { sonido: 'trepar', animacion: { destino: this.abajo, duracion: 1.8, arco: 0.15 } };
    }
    return { sonido: 'trepar', animacion: { destino: this.arriba, duracion: 1.8, arco: 0.15 } };
  }

  update() {}

  reiniciar() {
  }
}
