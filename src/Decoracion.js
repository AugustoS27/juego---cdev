// Decoración de los interiores (etapa 11C). Nada de esto choca ni cambia cómo se juega:
// es para que la casa se vea "vivida".
//
//   - Marcos blancos alrededor de las puertas.
//   - Una lámpara en el techo de cada cuarto (colgante, plafón o tubo), según los datos. Desde la etapa 16B
//     alumbran de verdad: quedan anotadas en this.lamparas y Lamparas.js les pone luces.
//   - Cuadros en las paredes (ver Cuadros.js), incluido uno en el sótano que te sigue con la mirada.
//   - Sótano: telarañas en las esquinas del techo y goteras (gotas que caen sobre un charco, con sonido).
//   - Ático: polvo flotando en el aire.
//
// (Los empapelados, zócalos y molduras se hacen en House.agregarTramo, porque dependen de cada
// tramo de pared. Los detalles chiquitos sobre los muebles son muebles más en src/datos/.)
//
// Todo lo que no se mueve se marca como estático, así Optimizar.js lo junta en pocas mallas.
import * as THREE from 'three';
import { materialToon } from './Materials.js';
import { textura } from './Texturas.js';
import { crearCuadro } from './Cuadros.js';
import { ALTURA_PISO, HABITACIONES, PUERTAS, CUADROS, GOTAS, TECHO, pisoDeAltura } from './HouseData.js';

const GROSOR_PISO = 0.2;
const COLOR_MARCO = '#fffaf0';
const GRAVEDAD_GOTA = 9;
const COLOR_FOCO_PRENDIDO = new THREE.Color('#fff3b0');

export class Decoracion {
  constructor(scene, house) {
    this.scene = scene;
    this.house = house;
    this.pupilas = []; // las del cuadro que te sigue con la mirada
    this.gotas = [];
    this.alCaerGota = null; // alCaerGota(posicion): Game le pone el sonido
    this.lamparas = []; // { x, y, z, piso, radio }: dónde va la luz de cada lámpara del techo (ver Lamparas.js)
    // Las bombitas y los plafones comparten material: así se pueden "apagar" todos juntos (cortes de luz)
    this.materialFoco = new THREE.MeshBasicMaterial({ color: '#fff3b0' });
    this.materialPlafon = materialToon('#fffaf0').clone();
    this.materialPlafon.emissive.set('#ffe9b0');
    this.materialPlafon.emissiveIntensity = 0.7;

    this.crearMarcosDePuertas();
    this.crearLamparas();
    this.crearCuadros();
    this.crearTelaranas();
    this.crearGotas();
    this.crearPolvo();
  }

  // Corte de luz (etapa 16C): las bombitas y los plafones se apagan (corriente 0) o se prenden (1)
  ponerCorriente(corriente) {
    this.materialFoco.color.set('#4a4a4a').lerp(COLOR_FOCO_PRENDIDO, corriente);
    this.materialPlafon.emissiveIntensity = 0.7 * corriente;
  }

  // Una malla estática (no se mueve: se puede juntar con otras)
  pieza(geometria, material, x, y, z, padre = this.scene) {
    const malla = new THREE.Mesh(geometria, typeof material === 'string' ? materialToon(material) : material);
    malla.position.set(x, y, z);
    malla.userData.estatico = true;
    padre.add(malla);
    return malla;
  }

  // Altura del techo de un piso (la cara de abajo del piso de arriba)
  techo(piso) {
    return piso * ALTURA_PISO + ALTURA_PISO - GROSOR_PISO - 0.02;
  }

  // ------------------------------------------------------------
  //  MARCOS DE LAS PUERTAS: dos jambas y un dintel, que atraviesan la pared
  //  (así se ven de los dos lados). Solo en las puertas comunes.
  // ------------------------------------------------------------
  crearMarcosDePuertas() {
    const ANCHO = 1.4;
    const ALTO = 2.2;
    const PROFUNDO = 0.27; // un poquito más que la pared (0.2): sobresale 3,5 cm de cada lado
    for (const p of PUERTAS) {
      if (p.estilo && p.estilo !== 'normal') continue;
      const base = p.piso * ALTURA_PISO;
      const enX = p.eje === 'x';
      const caja = (a, alto, prof, dx, y) =>
        this.pieza(new THREE.BoxGeometry(enX ? a : prof, alto, enX ? prof : a), COLOR_MARCO, p.x + (enX ? dx : 0), base + y + alto / 2, p.z + (enX ? 0 : dx));
      for (const lado of [-1, 1]) caja(0.09, ALTO + 0.09, PROFUNDO, lado * (ANCHO / 2 + 0.045), 0);
      caja(ANCHO + 0.18, 0.09, PROFUNDO, 0, ALTO);
    }
  }

  // ------------------------------------------------------------
  //  LÁMPARAS DE TECHO
  //  Cada habitación puede decir en los datos: lampara: 'colgante' | 'plafon' | 'tubo' | false
  //  y lamparaEn: [x, z]. Si no dice nada: colgante en los pisos 0 a 2, nada en el sótano y el ático
  //  (ahí están las lamparitas que parpadean).
  // ------------------------------------------------------------
  crearLamparas() {
    for (const hab of HABITACIONES) {
      const tipo = hab.lampara ?? (hab.piso >= 0 && hab.piso <= 2 ? 'colgante' : false);
      if (!tipo) continue;
      const [x1, z1, x2, z2] = hab.rects[0];
      const [x, z] = hab.lamparaEn ?? [(x1 + x2) / 2, (z1 + z2) / 2];
      const techo = this.techo(hab.piso);
      const foco = this.materialFoco;
      // La luz sale de la bombita (en la colgante) o de abajo del plafón o del tubo. Su círculo en el piso
      // no pasa de la pared más cercana (más 25 cm): sin sombras, la luz se pasaría al cuarto de al lado.
      const [r1, r2, r3, r4] = hab.rects.find(([a, b, c, d]) => x >= a && x <= c && z >= b && z <= d) ?? hab.rects[0];
      const radio = Math.min(3.2, Math.min(x - r1, r3 - x, z - r2, r4 - z) + 0.25);
      this.lamparas.push({ x, y: techo - (tipo === 'colgante' ? 0.8 : 0.12), z, piso: hab.piso, radio });
      if (tipo === 'colgante') {
        this.pieza(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), '#222222', x, techo - 0.25, z);
        this.pieza(new THREE.ConeGeometry(0.3, 0.28, 16), hab.colorLampara ?? '#f4a261', x, techo - 0.62, z);
        this.pieza(new THREE.SphereGeometry(0.07, 10, 8), foco, x, techo - 0.78, z);
      } else if (tipo === 'plafon') {
        this.pieza(new THREE.SphereGeometry(0.3, 16, 8), this.materialPlafon, x, techo, z).scale.set(1, 0.3, 1);
      } else if (tipo === 'tubo') {
        this.pieza(new THREE.BoxGeometry(1.3, 0.06, 0.2), '#dee2e6', x, techo - 0.03, z);
        this.pieza(new THREE.BoxGeometry(1.2, 0.05, 0.08), foco, x, techo - 0.08, z);
      }
    }
  }

  // ------------------------------------------------------------
  //  CUADROS: en los datos de cada piso (cuadros: [{ dibujo, x, z, rot, y, ancho, alto, marco, alReves }])
  //  x, z = sobre la cara de la pared; rot = hacia dónde mira (0 = +Z, 180 = -Z, 90 = +X, -90 = -X)
  // ------------------------------------------------------------
  crearCuadros() {
    for (const c of CUADROS) {
      const { grupo, pupilas } = crearCuadro(c.dibujo, c.ancho ?? 0.8, c.alto ?? 0.6, { marco: c.marco !== false });
      grupo.position.set(c.x, c.piso * ALTURA_PISO + (c.y ?? 1.6), c.z);
      // (alReves: el cuadro "cabeza abajo", para el cuarto al revés)
      grupo.rotation.set(0, THREE.MathUtils.degToRad(c.rot ?? 0), c.alReves ? Math.PI : 0);
      grupo.traverse((m) => {
        if (m.isMesh && !pupilas.includes(m)) m.userData.estatico = true;
      });
      this.scene.add(grupo);
      this.pupilas.push(...pupilas);
    }
  }

  // ------------------------------------------------------------
  //  TELARAÑAS en las 4 esquinas del techo de cada cuarto del sótano.
  //  Cada una es un triángulo cruzado en la esquina, con el dibujo de la telaraña.
  // ------------------------------------------------------------
  crearTelaranas() {
    const material = new THREE.MeshBasicMaterial({ map: textura('telarana'), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    material.userData.outlineParameters = { visible: false };
    const LADO = 0.8;
    for (const hab of HABITACIONES.filter((h) => h.piso === -1)) {
      const techo = this.techo(hab.piso);
      for (const [x1, z1, x2, z2] of hab.rects) {
        // Cada esquina: su punto (corrido 11 cm hacia adentro de las paredes) y hacia dónde van las paredes
        for (const [cx, cz, dx, dz] of [[x1, z1, 1, 1], [x2, z1, -1, 1], [x1, z2, 1, -1], [x2, z2, -1, -1]]) {
          const x = cx + dx * 0.11;
          const z = cz + dz * 0.11;
          const geometria = new THREE.BufferGeometry();
          geometria.setAttribute('position', new THREE.Float32BufferAttribute([
            x + dx * LADO, techo, z, // sobre una pared, pegado al techo
            x, techo, z + dz * LADO, // sobre la otra pared
            x, techo - LADO, z, // bajando por la esquina
          ], 3));
          geometria.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
          geometria.computeVertexNormals();
          const tela = new THREE.Mesh(geometria, material);
          tela.userData.estatico = true;
          this.scene.add(tela);
        }
      }
    }
  }

  // ------------------------------------------------------------
  //  GOTERAS: una gota cae del techo sobre un charco, espera un rato y vuelve a caer
  // ------------------------------------------------------------
  crearGotas() {
    const agua = new THREE.MeshBasicMaterial({ color: '#9bd1ff' });
    for (const g of GOTAS) {
      const base = g.piso * ALTURA_PISO;
      const techo = this.techo(g.piso);
      this.pieza(new THREE.CircleGeometry(0.4, 16).rotateX(-Math.PI / 2), '#3a506b', g.x, base + 0.006, g.z); // charco
      this.pieza(new THREE.CircleGeometry(0.25, 12).rotateX(Math.PI / 2), '#4a4e69', g.x, techo - 0.005, g.z); // mancha en el techo
      const gota = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), agua);
      gota.scale.y = 1.6;
      gota.userData.outlineParameters = { visible: false };
      this.scene.add(gota);
      this.gotas.push({ malla: gota, x: g.x, z: g.z, suelo: base, techo, velocidad: 0, espera: Math.random() * 2 });
    }
  }

  // ------------------------------------------------------------
  //  POLVO en el ático: puntitos que flotan despacito cerca de la lamparita
  // ------------------------------------------------------------
  crearPolvo() {
    const CANTIDAD = 140;
    const posiciones = new Float32Array(CANTIDAD * 3);
    for (let i = 0; i < CANTIDAD; i++) {
      posiciones[i * 3] = -7 + Math.random() * 12;
      posiciones[i * 3 + 1] = TECHO.y + 0.3 + Math.random() * 2.6;
      posiciones[i * 3 + 2] = -3 + Math.random() * 6;
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    const material = new THREE.PointsMaterial({ color: '#fff3c4', size: 0.035, transparent: true, opacity: 0.7, depthWrite: false });
    material.userData.outlineParameters = { visible: false };
    this.polvo = new THREE.Points(geometria, material);
    this.polvo.frustumCulled = false;
    this.scene.add(this.polvo);
    this.tiempo = 0;
  }

  // ------------------------------------------------------------
  //  CADA FRAME
  // ------------------------------------------------------------
  update(dt, camara) {
    this.tiempo += dt;
    const piso = pisoDeAltura(camara.position.y - 1.6);

    // Gotas: caen con gravedad; al tocar el charco avisan (para el sonido) y esperan
    for (const g of this.gotas) {
      if (g.espera > 0) {
        g.espera -= dt;
        g.malla.visible = false;
        g.y = g.techo - 0.03;
        g.velocidad = 0;
        continue;
      }
      g.malla.visible = true;
      g.velocidad += GRAVEDAD_GOTA * dt;
      g.y -= g.velocidad * dt;
      if (g.y <= g.suelo) {
        g.espera = 1.2 + Math.random() * 2.5;
        this.alCaerGota?.(new THREE.Vector3(g.x, g.suelo, g.z));
      }
      g.malla.position.set(g.x, g.y, g.z);
    }

    // Polvo: solo se mueve (y se ve) si estás en el ático
    this.polvo.visible = piso === 3;
    if (this.polvo.visible) {
      const pos = this.polvo.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) + dt * 0.05;
        if (x > 5) x = -7;
        pos.setX(i, x);
        pos.setY(i, pos.getY(i) + Math.sin(this.tiempo * 0.7 + i) * dt * 0.03);
      }
      pos.needsUpdate = true;
    }

    // Pupilas que siguen a la cámara: se corren hacia donde está el jugador (visto desde el cuadro)
    for (const pupila of this.pupilas) {
      const local = pupila.parent.worldToLocal(camara.position.clone());
      const direccion = new THREE.Vector2(local.x - pupila.userData.centro.x, local.y - pupila.userData.centro.y);
      if (direccion.length() > 0) direccion.normalize().multiplyScalar(pupila.userData.alcance);
      pupila.position.set(pupila.userData.centro.x + direccion.x, pupila.userData.centro.y + direccion.y, pupila.userData.centro.z);
    }
  }
}
