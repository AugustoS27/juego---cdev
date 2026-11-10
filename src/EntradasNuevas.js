// Más formas de entrar (etapa 14B). Igual que en Entradas.js, cada una tiene su "precio":
//
//   Chimenea:            te tirás desde el techo del garaje y caés en el living... con un ¡PUF! que
//                        se escucha y la pantalla llena de hollín.
//   Ventanita del sótano: silenciosa, pero entrás al sótano oscuro (lejos de casi todos los objetos).
//   Gatera:              en la puerta de calle. Solo agachado y muy despacio.
//   Enredadera:          trepás hasta el segundo piso. Tarda, y estás en el patio de los perros: te pueden ver.
//   Tragaluz del ático:  hay que subir al techo del garaje saltando por los trastos y trepar una escalerita.
//
// Funcionan igual que las de Entradas.js: una "raiz" (lo que se mira), ayuda(jugador) y usar(jugador),
// que devuelve un "resultado". Lo nuevo: las animaciones pueden tener puntos intermedios (por),
// un fundido a negro (para no ver cómo atravesás una pared) y algo que pasa al llegar (alTerminar).
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { CHIMENEA, VENTANA_SOTANO, ENREDADERA, TRAGALUZ, TECHO_GARAJE, TECHO, ALTURA_PISO } from './HouseData.js';

const RUIDO_CHIMENEA = 8; // caer en el hogar hace ¡PUF!
const RUIDO_HOJAS = 3; // empezar a trepar la enredadera hace crujir las hojas
const RUIDO_TRAGALUZ = 3; // el tragaluz rechina un poco

// Agrega una malla de formas básicas a "padre". estatico: no se mueve (se junta con otras, ver Optimizar.js)
function parte(padre, geometria, color, x, y, z, estatico = true) {
  const malla = new THREE.Mesh(geometria, typeof color === 'string' ? materialToon(color) : color);
  malla.position.set(x, y, z);
  malla.castShadow = true;
  malla.receiveShadow = true;
  malla.userData.estatico = estatico;
  padre.add(malla);
  return malla;
}

// "Zona para apuntar": una caja invisible (el rayo de la mira la detecta igual)
function zona(padre, ancho, alto, prof, x, y, z) {
  const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, prof), new THREE.MeshBasicMaterial());
  malla.position.set(x, y, z);
  malla.visible = false;
  padre.add(malla);
  return malla;
}

// Material negro sin luz ni borde (bocas de la chimenea, vidrios oscuros)
function negro(color = '#0b0b0b') {
  const material = new THREE.MeshBasicMaterial({ color });
  material.userData.outlineParameters = { visible: false };
  return material;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------
//  CHIMENEA
// ------------------------------------------------------------
export class Chimenea {
  constructor(scene, house) {
    const { x, z, ancho, prof, boca } = CHIMENEA;
    this.raiz = new THREE.Group();
    scene.add(this.raiz);

    // --- Afuera: la columna de ladrillos, la corona y la boca negra ---
    parte(this.raiz, new THREE.BoxGeometry(ancho, boca - 0.15, prof), '#b5523b', x, (boca - 0.15) / 2, z);
    for (let y = 0.5; y < boca - 0.3; y += 0.5) {
      parte(this.raiz, new THREE.BoxGeometry(ancho + 0.02, 0.04, prof + 0.02), '#8c3b2a', x, y, z); // juntas
    }
    parte(this.raiz, new THREE.BoxGeometry(ancho + 0.15, 0.15, prof + 0.15), '#6c3a2b', x, boca - 0.075, z);
    const hueco = parte(this.raiz, new THREE.BoxGeometry(ancho - 0.35, 0.02, prof - 0.35), negro(), x, boca + 0.005, z, false);
    hueco.castShadow = false;
    zona(this.raiz, ancho, 0.5, prof, x, boca + 0.25, z);
    house.colliders.push(new THREE.Box3(V(x - ancho / 2, 0, z - prof / 2), V(x + ancho / 2, boca, z + prof / 2)));

    // --- Adentro: el hogar del living (contra la pared oeste, x = -9) ---
    this.hogar = new THREE.Group();
    this.raiz.add(this.hogar);
    const xh = -8.62; // centro del hogar (sobresale 55 cm de la pared)
    parte(this.hogar, new THREE.BoxGeometry(0.55, 1.15, 1.3), '#c9ada7', xh, 0.575, z); // el cuerpo de piedra
    parte(this.hogar, new THREE.BoxGeometry(0.02, 0.62, 0.8), negro('#1a1a1a'), xh + 0.28, 0.36, z, false); // la boca
    for (const dz of [-0.15, 0.15]) {
      const leño = parte(this.hogar, new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), '#6f4518', xh + 0.3, 0.1, z + dz);
      leño.rotation.z = Math.PI / 2;
    }
    parte(this.hogar, new THREE.BoxGeometry(0.7, 0.08, 1.5), '#8d5524', -8.55, 1.19, z); // repisa
    parte(this.hogar, new THREE.BoxGeometry(0.3, 1.72, 0.7), '#b5523b', -8.75, 2.09, z); // el caño hasta el techo
    house.obstaculos.push(this.hogar);
    house.colliders.push(new THREE.Box3(V(-8.9, 0, z - 0.7), V(-8.3, 1.23, z + 0.7)));
    this.raiz.updateMatrixWorld(true);

    // Recorrido: hasta la boca, adentro de la columna hasta abajo, y al living por el hogar
    this.boca = V(x, boca + 0.1, z);
    this.fondo = V(x, 0.3, z);
    this.llegada = V(-7.9, 0, z);
  }

  ayuda(jugador) {
    if (jugador.position.y > TECHO_GARAJE.y - 0.5) return '[E] Tirarte por la chimenea (¡vas a caer con ruido!)';
    if (jugador.position.x > -9) return 'Por la chimenea se baja... no se sube';
    return 'La boca de la chimenea está muy alta... ¿y desde el techo del garaje?';
  }

  usar(jugador) {
    if (jugador.position.y < TECHO_GARAJE.y - 0.5) return null;
    return {
      sonido: 'trepar',
      animacion: {
        destino: this.llegada,
        por: [this.boca, this.fondo],
        duracion: 1.8,
        fundido: { desde: 0.3, hasta: 0.88 }, // negro mientras caés por adentro y atravesás la pared
        alTerminar: {
          sonido: 'chimenea',
          aviso: '💨 ¡PUF! Caíste en el hogar del living... lleno de hollín y haciendo ruido',
          ruido: { posicion: this.llegada, radio: RUIDO_CHIMENEA },
          hollin: true,
        },
      },
    };
  }

  update() {}
  reiniciar() {}
}

// ------------------------------------------------------------
//  VENTANITA DEL SÓTANO
// ------------------------------------------------------------
export class VentanaSotano {
  constructor(scene) {
    const { x, z } = VENTANA_SOTANO;
    const sotano = -ALTURA_PISO;
    this.raiz = new THREE.Group();
    scene.add(this.raiz);

    // Está en la pared oeste (una pared que corre a lo largo de Z): "d" son metros hacia afuera (-X) y
    // las cajas se dan como (ancho sobre la pared, alto, grosor)
    const caja = (ancho, alto, grosor) => new THREE.BoxGeometry(grosor, alto, ancho);

    // Afuera: al ras del pasto, con rejita (0.12 = la cara de afuera de la pared)
    parte(this.raiz, caja(0.9, 0.45, 0.06), '#ffffff', x - 0.12, 0.25, z);
    parte(this.raiz, caja(0.76, 0.33, 0.02), negro('#22223b'), x - 0.155, 0.25, z, false);
    for (const dz of [-0.2, 0, 0.2]) parte(this.raiz, caja(0.03, 0.33, 0.03), '#495057', x - 0.17, 0.25, z + dz);
    parte(this.raiz, caja(1.1, 0.06, 0.35), '#adb5bd', x - 0.3, 0.02, z); // piedra del borde
    zona(this.raiz, 0.35, 0.6, 1, x - 0.2, 0.25, z);

    // Adentro: arriba de la pared de la sala de la caldera (entra un poco de luz)
    const yAdentro = sotano + 2.5;
    parte(this.raiz, caja(0.9, 0.45, 0.06), '#adb5bd', x + 0.12, yAdentro, z);
    parte(this.raiz, caja(0.76, 0.33, 0.02), negro('#9be7ff'), x + 0.155, yAdentro, z, false);
    zona(this.raiz, 0.3, 0.6, 1, x + 0.2, yAdentro, z);
    this.raiz.updateMatrixWorld(true);

    this.afuera = V(x - 0.85, 0, z);
    this.paso = V(x - 0.3, -0.2, z); // agachado, metiéndote por el hueco
    this.adentro = V(x + 1, sotano, z);
  }

  ayuda(jugador) {
    return jugador.position.y > -1.5
      ? '[E] Meterte por la ventanita del sótano (silenciosa... pero adentro está oscuro)'
      : '[E] Salir por la ventanita';
  }

  usar(jugador) {
    if (jugador.position.y > -1.5) {
      const aviso = this.yaEntro ? null : '🕯️ Estás en el sótano. Está oscuro... y algo gotea';
      this.yaEntro = true;
      return {
        sonido: 'ventanita',
        animacion: { destino: this.adentro, por: [this.paso], duracion: 1.8, fundido: { desde: 0.3, hasta: 0.8 }, alTerminar: aviso ? { aviso } : null },
      };
    }
    return { sonido: 'ventanita', animacion: { destino: this.afuera, por: [this.paso], duracion: 1.8, fundido: { desde: 0.2, hasta: 0.7 } } };
  }

  update() {}

  reiniciar() {
    this.yaEntro = false;
  }
}

// ------------------------------------------------------------
//  GATERA (en la puerta de calle: la arma Door.js, acá solo se usa)
// ------------------------------------------------------------
const DURACION_GATERA = 3.5; // ¡muy lenta!

export class Gatera {
  constructor(puerta) {
    this.puerta = puerta;
    this.raiz = puerta.gatera;
    const { x, z } = puerta.centro;
    this.afuera = V(x, 0, z + 0.9);
    this.adentro = V(x, 0, z - 0.9);
  }

  ayuda(jugador) {
    if (this.puerta.abierta) return null; // con la puerta abierta, pasá caminando
    return jugador.agachado ? '[E] Pasar por la gatera (despacito)' : '🐈 Una gatera... agachate (C) para pasar';
  }

  usar(jugador) {
    if (this.puerta.abierta) return null;
    if (!jugador.agachado) return { aviso: '🐈 Así parado no entrás: agachate (C) para pasar por la gatera' };
    const estaAfuera = jugador.position.z > this.puerta.centro.z;
    this.tiempoTapa = -DURACION_GATERA / 2 + 0.3; // la tapita se mueve cuando pasás por el medio
    const aviso = this.yaPaso ? null : '🐈 Miau... pasando por la gatera (despacito)';
    this.yaPaso = true;
    return {
      sonido: 'gatera',
      aviso,
      animacion: { destino: estaAfuera ? this.adentro : this.afuera, duracion: DURACION_GATERA, fundido: { desde: 0.42, hasta: 0.58 } },
    };
  }

  // La tapita se hamaca cuando pasás y se va frenando
  update(dt) {
    if (this.tiempoTapa === null) return;
    this.tiempoTapa += dt;
    const t = Math.max(0, this.tiempoTapa);
    this.raiz.userData.tapa.rotation.x = Math.sin(t * 9) * 1.1 * Math.exp(-t * 1.8);
    if (t > 3) this.tiempoTapa = null;
  }

  reiniciar() {
    this.tiempoTapa = null;
    this.yaPaso = false;
    this.raiz.userData.tapa.rotation.x = 0;
  }
}

// ------------------------------------------------------------
//  ENREDADERA
// ------------------------------------------------------------
const DURACION_ENREDADERA = 5; // ¡larga!

export class Enredadera {
  constructor(scene) {
    const { x, z, piso } = ENREDADERA;
    const piso2 = piso * ALTURA_PISO;
    const arriba = piso2 + 1; // (la ventana de afuera empieza a 1 m del piso)
    const xp = x + 0.14; // pegada a la pared
    this.raiz = new THREE.Group();
    scene.add(this.raiz);

    // Enrejado de madera
    for (const dz of [-0.45, 0.45]) parte(this.raiz, new THREE.BoxGeometry(0.05, arriba, 0.06), '#8d5524', xp, arriba / 2, z + dz);
    for (let y = 0.4; y < arriba; y += 0.6) parte(this.raiz, new THREE.BoxGeometry(0.05, 0.05, 0.96), '#8d5524', xp + 0.02, y, z);
    // Hojas (esferitas verdes) y algunas flores, repartidas "al azar" pero siempre igual (con una cuenta)
    const verdes = ['#2d6a4f', '#40916c', '#52b788'];
    for (let i = 0; i < 46; i++) {
      const y = (i / 46) * arriba + 0.1;
      const dz = Math.sin(i * 2.3) * 0.5;
      const radio = 0.13 + ((i * 7) % 5) * 0.025;
      parte(this.raiz, new THREE.SphereGeometry(radio, 8, 6), verdes[i % 3], xp + 0.06, y, z + dz).scale.x = 0.6;
      if (i % 6 === 0) parte(this.raiz, new THREE.SphereGeometry(0.05, 6, 5), '#ff99c8', xp + 0.16, y + 0.05, z + dz);
    }
    zona(this.raiz, 0.35, arriba, 1.2, xp + 0.05, arriba / 2, z);
    // Adentro, en la ventana del segundo piso (para bajar)
    zona(this.raiz, 0.06, 1.3, 1.4, x - 0.16, piso2 + 1.6, z);
    this.raiz.updateMatrixWorld(true);

    // Recorrido para subir: tres tramos trepando y uno para meterte por la ventana
    this.abajo = V(x + 0.75, 0, z);
    this.trepando = [V(x + 0.75, arriba * 0.33, z), V(x + 0.75, arriba * 0.66, z), V(x + 0.75, arriba - 0.1, z)];
    this.adentro = V(x - 0.8, piso2, z);
    this.piso2 = piso2;
  }

  ayuda(jugador) {
    return jugador.position.y > this.piso2 - 1
      ? '[E] Bajar por la enredadera'
      : '[E] Trepar la enredadera hasta el segundo piso (tarda... y te pueden ver)';
  }

  usar(jugador) {
    if (jugador.position.y > this.piso2 - 1) {
      return {
        sonido: 'hojas',
        animacion: { destino: this.abajo, por: [...this.trepando].reverse(), duracion: DURACION_ENREDADERA, fundido: { desde: 0.02, hasta: 0.15 } },
      };
    }
    return {
      sonido: 'hojas',
      aviso: '🌿 Trepando... ¡mientras subís, cualquiera que mire te ve!',
      ruido: { posicion: this.abajo, radio: RUIDO_HOJAS },
      animacion: { destino: this.adentro, por: this.trepando, duracion: DURACION_ENREDADERA, fundido: { desde: 0.8, hasta: 0.9 } },
    };
  }

  update() {}
  reiniciar() {}
}

// ------------------------------------------------------------
//  TRAGALUZ DEL ÁTICO (y la escalerita de la antena que llega hasta él)
// ------------------------------------------------------------
export class Tragaluz {
  constructor(scene) {
    const { x, z } = TRAGALUZ;
    const { y: baseTecho, alto, mitad, x1 } = TECHO;
    const alturaTecho = (zz) => baseTecho + alto * (1 - Math.abs(zz) / mitad); // altura del techo en zz
    const inclinacion = Math.atan2(alto, mitad);
    this.raiz = new THREE.Group();
    scene.add(this.raiz);

    // --- La escalerita: en la pared oeste, desde el techo del garaje hasta cerca del techo ---
    const xe = x1 - 0.08;
    const desde = TECHO_GARAJE.y;
    const hasta = alturaTecho(z) - 0.3;
    for (const dz of [-0.25, 0.25]) parte(this.raiz, new THREE.BoxGeometry(0.05, hasta - desde, 0.05), '#adb5bd', xe, (desde + hasta) / 2, z + dz);
    for (let y = desde + 0.3; y < hasta; y += 0.3) parte(this.raiz, new THREE.BoxGeometry(0.05, 0.04, 0.5), '#adb5bd', xe, y, z);
    zona(this.raiz, 0.25, 2.6, 0.7, xe - 0.05, desde + 1.3, z);
    // Una antena de tele arriba de todo (por eso está la escalerita)
    parte(this.raiz, new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), '#6c757d', x1 + 0.6, baseTecho + alto + 0.7, 0);
    for (const largo of [1, 0.7, 0.45]) {
      parte(this.raiz, new THREE.BoxGeometry(0.03, 0.03, largo), '#6c757d', x1 + 0.6, baseTecho + alto + 0.6 + largo * 0.6, 0);
    }

    // --- El tragaluz: un marco con vidrio, acostado sobre el faldón (por fuera y por dentro) ---
    const tragaluz = (y, colorVidrio, conZona) => {
      const grupo = new THREE.Group();
      grupo.position.set(x, y, z);
      grupo.rotation.x = inclinacion; // así queda "paralelo" al faldón sur
      parte(grupo, new THREE.BoxGeometry(1.1, 0.1, 1), '#ffffff', 0, 0, 0);
      parte(grupo, new THREE.BoxGeometry(0.9, 0.12, 0.8), negro(colorVidrio), 0, 0, 0, false);
      if (conZona) zona(grupo, 1.1, 0.3, 1, 0, 0, 0);
      this.raiz.add(grupo);
    };
    tragaluz(alturaTecho(z) + 0.04, '#9be7ff', false);
    tragaluz(alturaTecho(z) - 0.2, '#cfefff', true); // el de adentro (debajo del techo de madera)
    this.raiz.updateMatrixWorld(true);

    // Recorrido: al pie de la escalerita, arriba, al lado del tragaluz y adentro del ático
    this.enElGaraje = V(xe - 0.45, desde, z);
    this.subiendo = [V(xe - 0.45, (desde + hasta) / 2, z), V(xe - 0.45, hasta - 0.2, z)];
    this.sobreElTecho = V(x - 0.5, alturaTecho(z) + 0.05, z);
    this.adentro = V(x + 0.7, baseTecho, z - 1.1);
  }

  ayuda(jugador) {
    const y = jugador.position.y;
    if (y > TECHO.y - 1) return '[E] Salir por el tragaluz';
    if (y > TECHO_GARAJE.y - 0.5) return '[E] Trepar la escalerita hasta el tragaluz del ático';
    return 'La escalerita arranca en el techo del garaje... ¿cómo se subirá ahí?';
  }

  usar(jugador) {
    const y = jugador.position.y;
    if (y > TECHO.y - 1) {
      return {
        sonido: 'tragaluz',
        animacion: { destino: this.enElGaraje, por: [this.sobreElTecho, ...[...this.subiendo].reverse()], duracion: 4, fundido: { desde: 0.02, hasta: 0.16 } },
      };
    }
    if (y < TECHO_GARAJE.y - 0.5) return null;
    return {
      sonido: 'trepar',
      animacion: {
        destino: this.adentro,
        por: [this.enElGaraje, ...this.subiendo, this.sobreElTecho],
        duracion: 5,
        fundido: { desde: 0.82, hasta: 0.9 },
        alTerminar: {
          sonido: 'tragaluz',
          aviso: '🪟 ¡Adentro! Entraste al ático por el tragaluz',
          ruido: { posicion: this.adentro, radio: RUIDO_TRAGALUZ },
        },
      },
    };
  }

  update() {}
  reiniciar() {}
}
