// Día y noche (etapa 16A). Cada partida se juega de día o de noche: acá están, como datos, los colores
// y las luces de cada turno (los usan Game.js y Exterior.js), y la linterna (la de Tomi y la de Don Ernesto).
//
// Las luces nunca se agregan ni se sacan: de día la linterna existe igual, con intensidad 0.
// (Cambiar la CANTIDAD de luces de la escena obliga a la placa de video a rearmar todos los materiales y
// el juego se traba un rato; cambiar la intensidad o el color, en cambio, no cuesta nada.)
import * as THREE from 'three';

export const TURNOS = {
  dia: {
    nombre: 'De día',
    icono: '☀️',
    // Cielo: un degradé de arriba hacia el horizonte. Una tarde nublada, con tormenta a lo lejos.
    cielo: ['#56677d', '#8e9aa8', '#d3c9b9'],
    niebla: { color: '#c3c9cf', cerca: 40, lejos: 130 },
    nubes: '#c9ced8',
    // Luz de ambiente de dos colores (cielo / suelo) y el sol de afuera (de la tarde: bajito y anaranjado)
    hemisferio: { cielo: '#ffffff', suelo: '#fff1e0' },
    afuera: { color: '#ffd9a8', intensidad: 0.95, posicion: [26, 20, 18] },
    // Luces de adentro según el piso donde está el jugador (ver Game.actualizarLuces)
    luz: { sol: 1.1, relleno: 0.35, cielo: 0.6, ambiente: 0.16 }, // (16B: menos luz pareja, más contraste)
    luzPorPiso: {
      [-1]: { sol: 0.4, relleno: 0.13, cielo: 0.32, ambiente: 0.1 },
      3: { sol: 0.8, relleno: 0.28, cielo: 0.5, ambiente: 0.14 },
    },
    // Cuánto ven los enemigos (multiplica su distancia de visión): de día, normal
    vision: { sinLinterna: 1, conLinterna: 1, perros: 1 },
    // --- Etapa 16B ---
    // Las lámparas de los cuartos (ver Lamparas.js): de día alumbran menos (ya entra luz por las ventanas)
    lamparas: { intensidad: 0.6 },
    // La luz que entra por las ventanas (la mancha en el piso) y el vidrio (ver Atmosfera.js)
    ventanas: { mancha: '#fff0c8', opacidad: 0.3, vidrio: '#9be7ff', brilloVidrio: '#000000', intensidadBrillo: 0 },
    // Los 3 tonos del dibujito (sombra, medio, luz): ver Materials.ponerContraste
    contraste: [65, 165, 255],
    // Efectos de pantalla (ver UI.mostrarAtmosfera): bordes oscuros y grano de película
    pantalla: { vineta: 0.3, grano: 0.04 },
    // Tormenta (relámpagos y lluvia en la partida): de día está lejos (solo algún trueno a lo lejos)
    tormenta: 0,
  },
  noche: {
    nombre: 'De noche',
    icono: '🌙',
    cielo: ['#03040c', '#0e1430', '#283055'],
    niebla: { color: '#10162b', cerca: 18, lejos: 85 },
    nubes: '#343a58',
    hemisferio: { cielo: '#6d7fb8', suelo: '#1c1a26' },
    // La luna: luz azulada y suave (también hace sombras)
    afuera: { color: '#9fb4ff', intensidad: 0.4, posicion: [18, 30, 22] },
    luz: { sol: 0.22, relleno: 0.07, cielo: 0.14, ambiente: 0.04 },
    luzPorPiso: {
      [-1]: { sol: 0.1, relleno: 0.03, cielo: 0.12, ambiente: 0.04 },
      3: { sol: 0.2, relleno: 0.06, cielo: 0.18, ambiente: 0.05 },
    },
    // A oscuras ven menos... salvo que tengas la linterna prendida (ven el haz). Los perros ven bien de noche.
    vision: { sinLinterna: 0.55, conLinterna: 1.2, perros: 0.85 },
    lamparas: { intensidad: 0.75 },
    // De noche entra la luz azul de la luna, y el vidrio brilla un poquito (el reflejo del cielo)
    ventanas: { mancha: '#6d86d8', opacidad: 0.4, vidrio: '#28324f', brilloVidrio: '#3c4f8f', intensidadBrillo: 0.35 },
    contraste: [45, 150, 255], // (las caras a la sombra, más oscuras)
    pantalla: { vineta: 0.7, grano: 0.08 },
    tormenta: 0.5, // la mitad de las noches hay tormenta
  },
};

// "dia" o "noche": el que se eligió en el menú, o uno al azar (mitad y mitad)
export function sortearTurno(eleccion) {
  if (eleccion === 'dia' || eleccion === 'noche') return eleccion;
  return Math.random() < 0.5 ? 'dia' : 'noche';
}

// ------------------------------------------------------------
//  LINTERNA: una luz en forma de cono (SpotLight) que sigue a quien la lleva.
//  cono: además se ve el haz (un cono transparente), para ver venir a Don Ernesto por los pasillos.
// ------------------------------------------------------------
export class Linterna {
  constructor(scene, { color = '#fff3d6', intensidad = 9, distancia = 20, angulo = 0.42, sombra = false, cono = false }) {
    this.intensidad = intensidad;
    this.luz = new THREE.SpotLight(color, 0, distancia, angulo, 0.55, 1.3);
    this.luz.castShadow = sombra;
    if (sombra) {
      this.luz.shadow.mapSize.set(512, 512);
      this.luz.shadow.bias = -0.002;
      this.luz.shadow.camera.near = 0.2;
    }
    scene.add(this.luz, this.luz.target);

    if (cono) {
      // El haz: un cono con la punta en la linterna, transparente y que suma luz (se ve más en la oscuridad)
      const largo = 3.5;
      const geometria = new THREE.ConeGeometry(Math.tan(angulo) * largo, largo, 20, 1, true);
      geometria.translate(0, -largo / 2, 0); // la punta en el origen
      geometria.rotateX(-Math.PI / 2); // acostado, abriéndose hacia +Z (lookAt apunta el +Z hacia el objetivo)
      this.cono = new THREE.Mesh(
        geometria,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      );
      this.cono.userData.outlineParameters = { visible: false };
      this.cono.raycast = () => {}; // (que no tape la vista ni la mira)
      this.cono.visible = false;
      scene.add(this.cono);
    }
    this.prender(false); // (arranca apagada: sin luz ni sombra)
    // ...pero su sombra se dibuja UNA vez igual: una luz con sombra que nunca la dibujó no tiene dónde
    // guardarla, y eso rompe el efecto de los bordes (desde algunos ángulos la pantalla queda marrón)
    if (sombra) this.luz.shadow.needsUpdate = true;
  }

  prender(prendida) {
    this.prendida = prendida;
    this.alumbrar(prendida);
    if (this.cono) this.cono.visible = prendida;
  }

  // La luz alumbra o no (sin tocar el haz). Apagada, tampoco se calcula su sombra: dibujar la sombra
  // de una luz cuesta casi como dibujar la escena otra vez. (No se apaga "castShadow": eso también
  // obligaría a rearmar los materiales.)
  alumbrar(alumbra) {
    this.luz.intensity = alumbra ? this.intensidad : 0;
    this.luz.shadow.autoUpdate = alumbra;
  }

  // La pone en "desde" apuntando hacia "hacia" (dos Vector3)
  seguir(desde, hacia) {
    this.luz.position.copy(desde);
    this.luz.target.position.copy(hacia);
    this.luz.target.updateMatrixWorld();
    if (this.cono) {
      this.cono.position.copy(desde);
      this.cono.lookAt(hacia);
    }
  }
}
