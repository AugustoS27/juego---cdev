// Los perros del patio (son dos). Usan el esqueleto de Enemigo.js con otros números:
//   - Solo andan por el PATIO trasero (ver datos/patio.js): no entran a la casa ni cruzan las tranqueras.
//   - Son muy rápidos (7 m/s, más que vos corriendo), pero ven poco (5 m) y no saben saltar:
//     subirte a la mesa del patio o al borde del pozo te salva.
//   - Escuchan al doble de distancia (caminá agachado por el patio).
//   - Cuando te persiguen, LADRAN: cada ladrido es un ruido que escuchan el dueño, la abuela y el otro perro.
//   - Si te tienen cerca pero no te alcanzan (estás arriba de algo), se aburren y vuelven a la cucha.
//   - Si saliste de un tacho de basura, te huelen de lejos (aunque no te vean) y van a ver qué es.
//     Escondido no te encuentran: los arbustos del patio son tu mejor amigo.
import * as THREE from 'three';
import { Enemigo, ESTADO } from './Enemigo.js';
import { ZONA_PATIO, WAYPOINTS_PATIO, CONEXIONES_PATIO } from './HouseData.js';
import { OLFATO_PERROS } from './Escondites.js';
import { crearPerro } from './Personajes.js';

const INTERVALO_LADRIDO = 1.4; // segundos entre ladridos mientras te persigue
const DISTANCIA_ABURRIRSE = 2.2; // si te tiene así de cerca...
const TIEMPO_PARA_ABURRIRSE = 5; // ...durante estos segundos y no te alcanza, se aburre
const TIEMPO_ABURRIDO = 8; // segundos que te ignora después de aburrirse
const INTERVALO_OLFATO = 2; // cada cuánto vuelve a buscar el olor (si sigue oliendo)

// Los dos perros: nombre, dónde arrancan y sus colores
export const PERROS = [
  { nombre: 'Firulais', inicio: 'cucha', colores: { pelo: '#c47a3a', manchas: '#7f4a1c', hocico: '#f1d3a4' } },
  { nombre: 'Manchita', inicio: 'patio-fondo', colores: { pelo: '#f8f9fa', manchas: '#343a40', hocico: '#ffffff' } },
];

export class Perro extends Enemigo {
  constructor(scene, house, player, { nombre, inicio, colores }) {
    super(scene, house, player, {
      nombre,
      colores,
      velocidades: { patrulla: 3, investigar: 4.5, perseguir: 7 },
      radio: 0.3,
      caja: [0.15, 0.8],
      alturaOjos: 0.55,
      distanciaVision: 5, // ven poco...
      anguloVision: 70,
      oido: 2, // ...pero escuchan al doble de distancia
      distanciaAtrapar: 0.9,
      diferenciaAlturaAtrapar: 0.5, // no saben saltar
      tiempoMemoria: 1,
      esperaEnPunto: 2, // (se quedan olfateando)
      tiempoMaximoYendo: 10,
      velocidadGiro: 10,
      ritmoPasos: 5,
      alturaCartel: 1.15,
      waypoints: WAYPOINTS_PATIO,
      conexiones: CONEXIONES_PATIO,
      puntosPatrulla: WAYPOINTS_PATIO.map((wp) => wp.id),
      inicio,
    });
    this.alLadrar = null; // alLadrar(perro): lo conecta Game (sonido + ruido)
    this.alAburrirse = null; // alAburrirse(perro): lo conecta Game (aviso)
  }

  reiniciar() {
    super.reiniciar();
    this.tiempoLadrido = 0;
    this.tiempoCerca = 0; // cuánto hace que te tiene cerca sin alcanzarte
    this.tiempoAburrido = 0; // mientras sea > 0, te ignora
    this.tiempoBoca = 0; // para abrir la boca al ladrar
    this.tiempoOlfato = 0;
  }

  update(dt) {
    this.tiempoAburrido = Math.max(0, this.tiempoAburrido - dt);
    this.tiempoBoca = Math.max(0, this.tiempoBoca - dt);
    this.olfatear(dt);
    super.update(dt);
  }

  // Olor a basura (después del tacho): si estás a menos de OLFATO_PERROS, va hasta donde estás
  // (o hasta el cerco, si estás afuera del patio). Al llegar cerca, te ve y te persigue.
  olfatear(dt) {
    this.tiempoOlfato -= dt;
    const p = this.player;
    if (p.olor <= 0 || p.escondido || this.estado === ESTADO.PERSEGUIR || this.tiempoAburrido > 0) return;
    if (this.tiempoOlfato > 0 || this.position.distanceTo(p.position) > OLFATO_PERROS) return;
    this.tiempoOlfato = INTERVALO_OLFATO;
    this.investigar(p.position);
  }

  // Aburrido, no te ve (se hace el distraído)
  puedeVerAlJugador() {
    if (this.tiempoAburrido > 0) return false;
    return super.puedeVerAlJugador();
  }

  alVerAlJugador() {
    if (this.estado !== ESTADO.PERSEGUIR) this.tiempoLadrido = 0; // ¡ladra apenas te ve!
    super.alVerAlJugador();
  }

  oirRuido(posicion, radio) {
    if (this.tiempoAburrido > 0) return false;
    return super.oirRuido(posicion, radio);
  }

  // Persiguiendo: ladra cada tanto y, si no te puede alcanzar, se aburre
  actualizarPersecucion(dt) {
    this.tiempoLadrido -= dt;
    if (this.tiempoLadrido <= 0) {
      this.tiempoLadrido = INTERVALO_LADRIDO;
      this.tiempoBoca = 0.25;
      this.alLadrar?.(this);
    }

    const p = this.player.position;
    const distancia = Math.hypot(p.x - this.position.x, p.z - this.position.z);
    this.tiempoCerca = distancia < DISTANCIA_ABURRIRSE ? this.tiempoCerca + dt : 0;
    if (this.tiempoCerca > TIEMPO_PARA_ABURRIRSE) {
      this.aburrirse();
      return;
    }
    super.actualizarPersecucion(dt);
  }

  // Se cansa de ladrarte y vuelve a la cucha (moviendo la cola, como si nada)
  aburrirse() {
    this.tiempoCerca = 0;
    this.tiempoAburrido = TIEMPO_ABURRIDO;
    this.cambiarEstado(ESTADO.PATRULLA);
    this.irA(this.waypoints.cucha);
    this.alAburrirse?.(this);
  }

  // Su zona es el patio (a nivel del suelo). Si el punto cae arriba de algo (la mesa, el pozo),
  // busca el lugar libre más cercano alrededor: desde ahí te ladra.
  limitarAZona(punto) {
    const enElSuelo = this.puntoEnRectangulos(punto, ZONA_PATIO, 0).setY(0);
    if (!this.hayAlgoEn(enElSuelo)) return enElSuelo;
    return this.puntoLibreCerca(enElSuelo) || this.waypoints[this.waypointMasCercano(enElSuelo)].clone();
  }

  // Prueba puntos en círculos cada vez más grandes alrededor de "centro" (16 direcciones por círculo)
  // y devuelve el libre más cercano al perro (o null si no hay ninguno).
  puntoLibreCerca(centro) {
    for (const radio of [0.9, 1.2, 1.5, 2]) {
      let mejor = null;
      for (let i = 0; i < 16; i++) {
        const angulo = (i / 16) * Math.PI * 2;
        const punto = centro.clone().add(new THREE.Vector3(Math.cos(angulo) * radio, 0, Math.sin(angulo) * radio));
        const enLaZona = ZONA_PATIO.some(([x1, z1, x2, z2]) => punto.x >= x1 && punto.x <= x2 && punto.z >= z1 && punto.z <= z2);
        if (!enLaZona || this.hayAlgoEn(punto)) continue;
        if (!mejor || punto.distanceTo(this.position) < mejor.distanceTo(this.position)) mejor = punto;
      }
      if (mejor) return mejor;
    }
    return null;
  }

  // ------------------------------------------------------------
  //  MODELO Y ANIMACIÓN
  // ------------------------------------------------------------
  // El modelo está en Personajes.js (también sale en las cinemáticas)
  crearCuerpo() {
    const perro = crearPerro(this.v.colores);
    this.patas = perro.patas;
    this.cola = perro.cola;
    this.cabeza = perro.cabeza;
    this.mandibula = perro.mandibula;
    return perro.cuerpo;
  }

  animarCuerpo(dt, caminando) {
    // Patas: las de adelante y las de atrás se mueven al revés (trote)
    const balanceo = caminando ? Math.sin(this.tiempoAnimacion) * 0.7 : 0;
    this.patas.forEach((pata, i) => (pata.rotation.x = i % 2 === Math.floor(i / 2) ? balanceo : -balanceo));
    // Cola: rápida si te persigue o está aburrido (¡contento!), lenta si patrulla
    const rapidez = this.estado === ESTADO.PERSEGUIR || this.tiempoAburrido > 0 ? 18 : 6;
    this.cola.rotation.z = Math.sin(this.tiempoTotal * rapidez) * 0.6;
    // Cabeza: olfatea el piso cuando está quieto buscando; al ladrar abre la boca y cabecea
    const olfateando = !caminando && this.estado !== ESTADO.PERSEGUIR;
    this.cabeza.rotation.x = olfateando ? 0.5 + Math.sin(this.tiempoTotal * 8) * 0.1 : 0;
    this.mandibula.rotation.x = this.tiempoBoca > 0 ? 0.6 : 0;
    if (this.tiempoBoca > 0) this.cabeza.rotation.x = -0.25;
  }
}
