// Las lámparas que alumbran de verdad (etapa 16B).
//
// Hasta ahora los cuartos se iluminaban con un "sol" de adentro, parejo, y las lámparas del techo eran de
// adorno. Ahora cada lámpara tira un círculo de luz cálida en el piso y los rincones quedan más oscuros.
//
// ¿Una luz por lámpara? No: hay más de 20 lámparas y cada luz encarece el dibujo de TODO lo que se ve.
// Hay un grupo fijo de luces (CANTIDAD_LUCES) que se "mudan" a las lámparas más cercanas al jugador,
// en su mismo piso. Las demás lámparas quedan con la bombita prendida, pero sin luz de verdad.
// (Las luces nunca se agregan ni se sacan, solo se mueven y se les cambia la intensidad: ver Turno.js.)
//
// Las luces son focos que apuntan para abajo (SpotLight) y llegan justo hasta el piso del cuarto: así no
// atraviesan el piso ni iluminan el cuarto de abajo o el de arriba. Y el círculo de luz se achica si la
// lámpara está cerca de una pared, para que no se "pase" al cuarto de al lado (no tienen sombra).
import * as THREE from 'three';
import { UBICACION_MUEBLES, ALTURA_PISO } from './HouseData.js';

const CANTIDAD_LUCES = 6;
const CADA_CUANTO = 0.25; // segundos entre una mudanza de las luces y la siguiente
const COLOR_LUZ = '#ffd49a'; // luz de lamparita, cálida
const RADIO_MAXIMO = 3.2; // el círculo de luz más grande (en el piso), en metros

// Lámparas que son muebles (las de pie y los veladores): a qué altura está la luz y qué tan grande es su círculo
const LAMPARAS_MUEBLE = {
  lamparaPie: { altura: 1.4, radio: 1.8, intensidad: 0.6 },
  mesaConVelador: { altura: 0.95, radio: 1.1, intensidad: 0.4 },
};

export class Lamparas {
  // delTecho: las lámparas de techo de Decoracion ([{ x, y, z, piso, radio }])
  constructor(scene, delTecho) {
    this.lamparas = [...delTecho.map((l) => ({ ...l, intensidad: 1 })), ...this.lamparasMueble()];
    for (const l of this.lamparas) {
      // Hasta dónde llega la luz: el borde del círculo, pero apenas un metro más abajo del piso
      // (si llegara más, se vería la luz en las paredes del piso de abajo, por el hueco de la escalera)
      const alto = l.y - l.piso * ALTURA_PISO;
      l.angulo = Math.atan2(l.radio, alto);
      l.distancia = Math.min(Math.hypot(alto, l.radio) * 1.2, alto + 1.2);
    }

    this.luces = [];
    for (let i = 0; i < CANTIDAD_LUCES; i++) {
      const luz = new THREE.SpotLight(COLOR_LUZ, 0, 5, 1, 0.8, 1.6);
      luz.userData.lampara = null;
      scene.add(luz, luz.target);
      this.luces.push(luz);
    }
    this.fuerza = 1; // la del turno (de día alumbran menos: ya entra luz por las ventanas)
    this.corriente = 1; // 1 = hay luz, 0 = luz cortada (etapa 16C; en el medio, mientras parpadea)
    this.espera = 0;
    this.piso = null;
  }

  lamparasMueble() {
    const lista = [];
    for (const m of UBICACION_MUEBLES) {
      const datos = LAMPARAS_MUEBLE[m.tipo];
      if (!datos || m.alReves) continue; // (la lámpara de pie colgada del techo del cuarto al revés no alumbra)
      lista.push({ x: m.x, y: m.piso * ALTURA_PISO + (m.y ?? 0) + datos.altura, z: m.z, piso: m.piso, radio: datos.radio, intensidad: datos.intensidad });
    }
    return lista;
  }

  ponerTurno({ intensidad }) {
    this.fuerza = intensidad;
    this.repartir();
  }

  // Cada tanto: las luces se mudan a las lámparas más cercanas a "donde" (el jugador), en su piso
  actualizar(dt, donde, piso) {
    this.espera -= dt;
    if (this.espera > 0 && piso === this.piso) return;
    this.espera = CADA_CUANTO;
    this.piso = piso;
    this.donde = donde;
    this.repartir();
  }

  repartir() {
    if (!this.donde) return;
    const { x, z } = this.donde;
    const cercanas = this.lamparas
      .filter((l) => l.piso === this.piso)
      .sort((a, b) => (a.x - x) ** 2 + (a.z - z) ** 2 - ((b.x - x) ** 2 + (b.z - z) ** 2))
      .slice(0, CANTIDAD_LUCES);
    // Las que ya alumbran una de las cercanas se quedan donde están (así no "saltan" de lámpara)
    const libres = [];
    for (const luz of this.luces) {
      if (cercanas.includes(luz.userData.lampara)) cercanas.splice(cercanas.indexOf(luz.userData.lampara), 1);
      else libres.push(luz);
    }
    for (const luz of libres) this.ponerEn(luz, cercanas.shift() ?? null);
    this.ponerIntensidades();
  }

  // Corte de luz (etapa 16C): de 0 (cortada) a 1 (normal)
  ponerCorriente(corriente) {
    this.corriente = corriente;
    this.ponerIntensidades();
  }

  ponerIntensidades() {
    for (const luz of this.luces) {
      const l = luz.userData.lampara;
      luz.intensity = l ? 9 * l.intensidad * this.fuerza * this.corriente : 0;
    }
  }

  ponerEn(luz, lampara) {
    luz.userData.lampara = lampara;
    if (!lampara) return;
    luz.position.set(lampara.x, lampara.y, lampara.z);
    luz.target.position.set(lampara.x, lampara.y - 5, lampara.z);
    luz.target.updateMatrixWorld();
    luz.angle = lampara.angulo;
    luz.distance = lampara.distancia;
  }
}
