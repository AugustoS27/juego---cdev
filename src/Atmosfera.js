// La atmósfera (etapa 16B): lo que hace que la casa dé un poco más de miedo, sin cambiar cómo se juega.
//
//   - La luz que entra por las ventanas: una mancha en el piso, delante de cada ventana (cálida de día,
//     azul de luna de noche). En un relámpago se prende fuerte de golpe.
//   - El vidrio de las ventanas de adentro: celeste de día, azul oscuro de noche y, si hay tormenta,
//     con gotas que chorrean. En un relámpago se pone blanco.
//   - La lluvia de afuera (las noches de tormenta): rayitas que caen alrededor del jugador, pero no
//     adentro de la casa.
//   - Polvo en el aire que solo se ve en el haz de la linterna.
//
// (Las ventanas de los cuartos son de mentira: están pintadas sobre la pared. Por eso la luz que entra
// por ellas también es "pintada": una mancha transparente que suma luz, no una luz de verdad.)
import * as THREE from 'three';
import { materialVidrioAdentro } from './Materials.js';
import { UBICACION_MUEBLES, VENTANA_ROMPIBLE, ALTURA_PISO, TECHO, TECHO_GARAJE } from './HouseData.js';

const GOTAS_LLUVIA = 900;
const LLUVIA_ANCHO = 18; // la lluvia ocupa una caja de 36 x 36 m alrededor del jugador...
const LLUVIA_ALTO = 18; // ...y de 18 m de alto
const VELOCIDAD_LLUVIA = 14; // m/s
const VIENTO = 2.2; // m/s hacia +X (la lluvia cae un poco inclinada)
const LARGO_GOTA = 0.55;
const PARTICULAS_POLVO = 320;
const POLVO_LADO = 4; // el polvo ocupa una caja de 8 x 4 x 8 m alrededor del jugador
const ALCANCE_POLVO = 6; // hasta dónde se ve el polvo en el haz

export class Atmosfera {
  constructor(scene) {
    this.scene = scene;
    this.tiempo = 0;
    this.tormenta = false;
    this.crearManchasDeVentanas();
    this.crearVidrio();
    this.crearLluvia();
    this.crearPolvo();
  }

  // ------------------------------------------------------------
  //  LA LUZ DE LAS VENTANAS EN EL PISO
  // ------------------------------------------------------------
  crearManchasDeVentanas() {
    this.materialManchas = new THREE.MeshBasicMaterial({
      map: texturaManchaDeVentana(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true, // (para que no titile contra el piso)
      polygonOffsetFactor: -2,
    });
    this.materialManchas.userData.outlineParameters = { visible: false };
    const ventanas = UBICACION_MUEBLES.filter((m) => m.tipo === 'ventana' && !m.alReves)
      .map(({ x, z, rot = 0, piso }) => ({ x, z, rot, piso, ancho: 1.3 }));
    // La ventana que se puede romper (esa sí es un hueco en la pared)
    const r = VENTANA_ROMPIBLE;
    ventanas.push({ x: r.x, z: r.z - r.afuera * 0.1, rot: r.afuera > 0 ? 180 : 0, piso: r.piso, ancho: r.ancho });
    const LARGO = 2; // hasta dónde entra la mancha en el cuarto
    for (const v of ventanas) {
      const angulo = THREE.MathUtils.degToRad(v.rot);
      // La mancha arranca al pie de la ventana y entra en el cuarto (hacia donde mira la ventana)
      const adentro = 0.05 + LARGO / 2;
      const mancha = new THREE.Mesh(new THREE.PlaneGeometry(v.ancho, LARGO).rotateX(-Math.PI / 2), this.materialManchas);
      mancha.position.set(v.x + Math.sin(angulo) * adentro, v.piso * ALTURA_PISO + 0.03, v.z + Math.cos(angulo) * adentro);
      mancha.rotation.y = angulo;
      mancha.userData.estatico = true; // (se junta con las demás en una sola malla)
      mancha.raycast = () => {};
      this.scene.add(mancha);
    }
  }

  // ------------------------------------------------------------
  //  EL VIDRIO DE LAS VENTANAS DE ADENTRO (con gotas cuando llueve)
  // ------------------------------------------------------------
  crearVidrio() {
    this.vidrio = materialVidrioAdentro;
    this.vidrioSeco = this.vidrio.map;
    this.vidrioMojado = texturaVidrioMojado();
  }

  // ------------------------------------------------------------
  //  LLUVIA: cada gota es una rayita (dos puntos); las que caen adentro de la casa se achican a nada
  // ------------------------------------------------------------
  crearLluvia() {
    this.gotas = [];
    for (let i = 0; i < GOTAS_LLUVIA; i++) {
      this.gotas.push({
        x: (Math.random() * 2 - 1) * LLUVIA_ANCHO,
        y: Math.random() * LLUVIA_ALTO,
        z: (Math.random() * 2 - 1) * LLUVIA_ANCHO,
        velocidad: VELOCIDAD_LLUVIA * (0.85 + Math.random() * 0.3),
      });
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GOTAS_LLUVIA * 6), 3));
    const material = new THREE.LineBasicMaterial({ color: '#a9b8d8', transparent: true, opacity: 0.32, depthWrite: false });
    material.userData.outlineParameters = { visible: false };
    this.lluvia = new THREE.LineSegments(geometria, material);
    this.lluvia.frustumCulled = false; // (se mueve con el jugador: la caja calculada al principio no sirve)
    this.lluvia.raycast = () => {};
    this.lluvia.visible = false;
    this.scene.add(this.lluvia);
  }

  // ------------------------------------------------------------
  //  POLVO: puntitos que flotan alrededor del jugador. Solo se ven los que caen dentro del haz de la
  //  linterna (los demás quedan negros, y negro "sumado" no se ve)
  // ------------------------------------------------------------
  crearPolvo() {
    this.motas = [];
    for (let i = 0; i < PARTICULAS_POLVO; i++) {
      this.motas.push(new THREE.Vector3((Math.random() * 2 - 1) * POLVO_LADO, (Math.random() * 2 - 1) * 2, (Math.random() * 2 - 1) * POLVO_LADO));
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICULAS_POLVO * 3), 3));
    geometria.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PARTICULAS_POLVO * 3), 3));
    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    material.userData.outlineParameters = { visible: false };
    this.polvo = new THREE.Points(geometria, material);
    this.polvo.frustumCulled = false;
    this.polvo.raycast = () => {};
    this.polvo.visible = false;
    this.scene.add(this.polvo);
    this.desdeLuz = new THREE.Vector3();
    this.haciaLuz = new THREE.Vector3();
    this.mota = new THREE.Vector3();
  }

  // ------------------------------------------------------------
  //  TURNO
  // ------------------------------------------------------------
  // ventanas: { mancha, opacidad, vidrio, brilloVidrio } del turno (ver Turno.js) · tormenta: true/false
  ponerTurno({ ventanas }, tormenta) {
    this.ventanas = ventanas;
    this.tormenta = tormenta;
    this.materialManchas.color.set(ventanas.mancha);
    this.vidrio.color.set(ventanas.vidrio);
    this.vidrio.map = tormenta ? this.vidrioMojado : this.vidrioSeco;
    this.lluvia.visible = tormenta;
    this.relampago(0);
  }

  // Un relámpago (fuerza de 0 a 1): las manchas de las ventanas y los vidrios se prenden de golpe
  relampago(fuerza) {
    const v = this.ventanas;
    this.materialManchas.opacity = v.opacidad + fuerza * 0.9;
    this.vidrio.emissive.set(fuerza > 0 ? '#dfe8ff' : v.brilloVidrio);
    this.vidrio.emissiveIntensity = fuerza > 0 ? fuerza * 1.2 : v.intensidadBrillo;
  }

  // ------------------------------------------------------------
  //  CADA FRAME
  // ------------------------------------------------------------
  // camara: dónde está el jugador · linterna: la de Tomi (para el polvo)
  update(dt, camara, linterna) {
    this.tiempo += dt;
    if (this.tormenta) {
      this.vidrioMojado.offset.y = (this.tiempo * 0.18) % 1; // las gotas chorrean por el vidrio
      this.actualizarLluvia(dt, camara.position);
    }
    this.polvo.visible = linterna.prendida;
    if (this.polvo.visible) this.actualizarPolvo(dt, camara.position, linterna.luz);
  }

  actualizarLluvia(dt, centro) {
    const pos = this.lluvia.geometry.attributes.position.array;
    const inclinacion = (VIENTO / VELOCIDAD_LLUVIA) * LARGO_GOTA;
    for (let i = 0; i < GOTAS_LLUVIA; i++) {
      const g = this.gotas[i];
      g.y -= g.velocidad * dt;
      g.x += VIENTO * dt;
      // Cuando sale de la caja (por abajo o por los costados), vuelve a entrar por el otro lado
      const abajo = Math.max(centro.y - 6, -0.5);
      if (g.y < abajo) g.y += LLUVIA_ALTO;
      if (g.y > abajo + LLUVIA_ALTO) g.y -= LLUVIA_ALTO;
      if (g.x - centro.x > LLUVIA_ANCHO) g.x -= LLUVIA_ANCHO * 2;
      if (g.x - centro.x < -LLUVIA_ANCHO) g.x += LLUVIA_ANCHO * 2;
      if (g.z - centro.z > LLUVIA_ANCHO) g.z -= LLUVIA_ANCHO * 2;
      if (g.z - centro.z < -LLUVIA_ANCHO) g.z += LLUVIA_ANCHO * 2;
      const j = i * 6;
      pos[j] = g.x;
      pos[j + 1] = g.y;
      pos[j + 2] = g.z;
      if (g.y < 0 || bajoTecho(g.x, g.y, g.z)) {
        // Adentro de la casa (o bajo tierra): la rayita se achica a un punto y no se ve
        pos[j + 3] = g.x;
        pos[j + 4] = g.y;
        pos[j + 5] = g.z;
      } else {
        pos[j + 3] = g.x - inclinacion;
        pos[j + 4] = g.y - LARGO_GOTA;
        pos[j + 5] = g.z;
      }
    }
    this.lluvia.geometry.attributes.position.needsUpdate = true;
  }

  actualizarPolvo(dt, centro, luz) {
    const pos = this.polvo.geometry.attributes.position.array;
    const col = this.polvo.geometry.attributes.color.array;
    this.desdeLuz.copy(luz.position);
    this.haciaLuz.copy(luz.target.position).sub(luz.position).normalize();
    const cosBorde = Math.cos(luz.angle);
    for (let i = 0; i < PARTICULAS_POLVO; i++) {
      const m = this.motas[i];
      // Flotan despacito (cada una con su vaivén) y siguen al jugador (la caja se mueve con él)
      m.x += Math.sin(this.tiempo * 0.3 + i) * dt * 0.04;
      m.y += Math.sin(this.tiempo * 0.5 + i * 1.7) * dt * 0.03 - dt * 0.01;
      m.z += Math.cos(this.tiempo * 0.4 + i * 0.7) * dt * 0.04;
      if (m.y < -2) m.y += 4;
      this.mota.set(envolver(m.x + centro.x, centro.x, POLVO_LADO), envolver(m.y + centro.y, centro.y, 2), envolver(m.z + centro.z, centro.z, POLVO_LADO));
      pos[i * 3] = this.mota.x;
      pos[i * 3 + 1] = this.mota.y;
      pos[i * 3 + 2] = this.mota.z;
      // ¿Cae dentro del haz? Brilla más cerca de la linterna y en el centro del haz
      this.mota.sub(this.desdeLuz);
      const distancia = this.mota.length();
      const coseno = distancia > 0 ? this.mota.dot(this.haciaLuz) / distancia : 0;
      let brillo = 0;
      if (coseno > cosBorde && distancia < ALCANCE_POLVO) {
        brillo = (1 - distancia / ALCANCE_POLVO) * Math.min(1, (coseno - cosBorde) / (1 - cosBorde) * 2.5) * 0.9;
      }
      col[i * 3] = brillo;
      col[i * 3 + 1] = brillo * 0.95;
      col[i * 3 + 2] = brillo * 0.82;
    }
    this.polvo.geometry.attributes.position.needsUpdate = true;
    this.polvo.geometry.attributes.color.needsUpdate = true;
  }
}

// ¿El punto está debajo del techo de la casa o del garaje? (ahí no llueve)
function bajoTecho(x, y, z) {
  if (x > TECHO.x1 && x < TECHO.x2 && Math.abs(z) < TECHO.mitad + 0.2) {
    return y < TECHO.y + TECHO.alto * (1 - Math.abs(z) / TECHO.mitad) + 0.2;
  }
  const g = TECHO_GARAJE;
  return x > g.x1 && x < g.x2 && z > g.z1 && z < g.z2 && y < g.y + 0.2;
}

// Lleva un valor a la caja [centro - lado, centro + lado], "dando la vuelta" por el otro lado
function envolver(valor, centro, lado) {
  const d = valor - centro;
  return centro + ((((d + lado) % (lado * 2)) + lado * 2) % (lado * 2)) - lado;
}

// La mancha de luz de una ventana: los cuatro vidrios (con la cruz del marco), borrosos y apagándose
// a medida que entran en el cuarto. Arriba de la imagen = al pie de la ventana.
function texturaManchaDeVentana() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 128;
  lienzo.height = 256;
  const ctx = lienzo.getContext('2d');
  ctx.filter = 'blur(4px)';
  ctx.fillStyle = '#ffffff';
  for (const x of [12, 68]) {
    for (const y of [10, 132]) ctx.fillRect(x, y, 48, 112);
  }
  ctx.filter = 'none';
  // Se va apagando hacia adentro del cuarto
  ctx.globalCompositeOperation = 'destination-in';
  const degrade = ctx.createLinearGradient(0, 0, 0, 256);
  degrade.addColorStop(0, 'rgba(0,0,0,1)');
  degrade.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  degrade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 128, 256);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

// El vidrio mojado: blanco (el color lo pone el material) con gotas y chorritos un poco más oscuros.
// Se repite para abajo: moviéndola, las gotas chorrean.
function texturaVidrioMojado() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 64;
  lienzo.height = 128;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 128);
  ctx.strokeStyle = 'rgba(40, 60, 110, 0.45)';
  ctx.fillStyle = 'rgba(40, 60, 110, 0.55)';
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 128;
    const largo = 6 + Math.random() * 26;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 3, y + largo);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + largo, 1.6 + Math.random(), 0, Math.PI * 2);
    ctx.fill();
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  return textura;
}
