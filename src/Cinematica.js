// Cinematica: el "reproductor" de cinemáticas (etapa 15E). No sabe nada de la historia: recibe un
// guion (ver Escenas.js) y lo reproduce. Un guion es una lista de TOMAS, una detrás de la otra:
//
//   {
//     duracion: 4,                          // segundos
//     camara: [[x, y, z], [x, y, z]],       // dónde arranca y dónde termina la cámara (o una sola: quieta)
//     fov: 60,                              // (opcional) el "zoom" de la cámara en grados; si no, FOV
//     mira: [[x, y, z], [x, y, z]],         // a qué punto mira al principio y al final
//     lineas: [{ en: 0.5, quien: 'Tomi', texto: '¡Uy!' }],  // subtítulos (quien: null = narrador)
//     alEmpezar() {},                       // al arrancar la toma (ubicar a los personajes, un sonido...)
//     animar(s, t, dt) {},                  // en cada frame: s = segundos desde que empezó, t = de 0 a 1
//   }
//
// La cámara va de un punto al otro con una curva suave (arranca y frena despacio). Arriba y abajo
// aparecen las barras negras de cine; el texto de cada línea aparece letra por letra. Al principio
// la pantalla se aclara desde negro y al final se oscurece. Con Espacio (o el botón) se saltea.
import * as THREE from 'three';

const LETRAS_POR_SEGUNDO = 38;
const FUNDIDO = 0.6; // segundos que tarda en aclararse (al empezar) y en oscurecerse (al terminar)
const ESPERA_PARA_SALTEAR = 0.6; // (por si venías apretando Espacio, no se saltea apenas empieza)
// Campo de visión de las tomas: más cerrado que el del juego (75°), como un lente de cine
const FOV = 50;

// Color del nombre de cada personaje en los subtítulos
const COLORES = { Tomi: '#ffd23f', Facu: '#52d6c4', 'Don Ernesto': '#ff6b6b', 'Doña Pocha': '#ff9ecd' };

// Curva suave: arranca despacio, acelera y frena (t de 0 a 1)
const suave = (t) => t * t * (3 - 2 * t);

export class Cinematica {
  constructor(camera) {
    this.camera = camera;
    const $ = (id) => document.getElementById(id);
    this.contenedor = $('cine');
    this.negro = $('cine-negro');
    this.subtitulo = $('cine-subtitulo');
    this.quien = $('cine-quien');
    this.texto = $('cine-texto');
    const boton = $('cine-saltear');
    boton.addEventListener('click', () => {
      boton.blur(); // (si queda con foco, el Espacio del juego lo volvería a apretar)
      this.saltear();
    });

    this.guion = null;
    this.alHablar = null; // alHablar(quien): cada un par de letras (la "vocecita" de cada personaje)
    this.desde = new THREE.Vector3();
    this.hasta = new THREE.Vector3();
    this.miraDesde = new THREE.Vector3();
    this.miraHasta = new THREE.Vector3();
    this.mira = new THREE.Vector3();
  }

  get activa() {
    return this.guion !== null;
  }

  // Empieza a reproducir el guion (una lista de tomas). alTerminar(salteada): cuando termina o se saltea.
  reproducir(tomas, alTerminar) {
    this.guion = tomas;
    this.alTerminar = alTerminar;
    this.tiempoTotal = 0;
    this.fovDelJuego = this.camera.fov;
    this.duracionTotal = tomas.reduce((suma, toma) => suma + toma.duracion, 0);
    this.contenedor.classList.add('activa');
    document.body.classList.add('en-cine'); // (esconde la mira, ver style.css)
    this.empezarToma(0);
  }

  empezarToma(numero) {
    this.numeroToma = numero;
    this.toma = this.guion[numero];
    this.segundos = 0;
    const { camara, mira } = this.toma;
    this.desde.fromArray(camara[0]);
    this.hasta.fromArray(camara[1] || camara[0]);
    this.miraDesde.fromArray(mira[0]);
    this.miraHasta.fromArray(mira[1] || mira[0]);
    this.camera.fov = this.toma.fov || FOV;
    this.camera.updateProjectionMatrix();
    this.lineaActual = -1;
    this.mostrarLinea(null);
    this.toma.alEmpezar?.();
    this.toma.animar?.(0, 0, 0); // (así el primer frame de la toma ya muestra todo en su lugar)
    this.moverCamara(0);
  }

  update(dt) {
    if (!this.activa) return;
    this.segundos += dt;
    this.tiempoTotal += dt;
    const t = Math.min(1, this.segundos / this.toma.duracion);

    this.toma.animar?.(this.segundos, t, dt);
    this.moverCamara(t);
    this.actualizarSubtitulo(dt);

    // Fundido desde negro al principio y hacia negro al final
    const restante = this.duracionTotal - this.tiempoTotal;
    this.negro.style.opacity = Math.max(0, 1 - this.tiempoTotal / FUNDIDO, 1 - restante / FUNDIDO).toFixed(2);

    if (t >= 1) {
      if (this.numeroToma + 1 < this.guion.length) this.empezarToma(this.numeroToma + 1);
      else this.terminar(false);
    }
  }

  moverCamara(t) {
    const avance = suave(t);
    this.camera.position.lerpVectors(this.desde, this.hasta, avance);
    this.mira.lerpVectors(this.miraDesde, this.miraHasta, avance);
    this.camera.lookAt(this.mira);
  }

  // ------------------------------------------------------------
  //  SUBTÍTULOS
  // ------------------------------------------------------------
  actualizarSubtitulo(dt) {
    const lineas = this.toma.lineas || [];
    // ¿Empieza la línea siguiente?
    const siguiente = lineas[this.lineaActual + 1];
    if (siguiente && this.segundos >= siguiente.en) {
      this.lineaActual++;
      this.mostrarLinea(siguiente);
    }
    // El texto aparece letra por letra (y cada dos letras, la "vocecita" del que habla)
    if (this.linea && this.letras < this.linea.texto.length) {
      const antes = Math.floor(this.letras);
      this.letras = Math.min(this.linea.texto.length, this.letras + dt * LETRAS_POR_SEGUNDO);
      const ahora = Math.floor(this.letras);
      if (ahora !== antes) {
        this.texto.textContent = this.linea.texto.slice(0, ahora);
        if (this.linea.quien && Math.floor(ahora / 2) !== Math.floor(antes / 2)) this.alHablar?.(this.linea.quien);
      }
    }
  }

  mostrarLinea(linea) {
    this.linea = linea;
    this.letras = 0;
    this.texto.textContent = '';
    this.subtitulo.classList.toggle('oculto', !linea);
    if (!linea) return;
    this.subtitulo.classList.toggle('narrador', !linea.quien);
    this.quien.textContent = linea.quien || '';
    this.quien.style.color = COLORES[linea.quien] || '#ffffff';
  }

  // ------------------------------------------------------------
  //  TERMINAR
  // ------------------------------------------------------------
  // Espacio: se corta acá (si ya pasó un ratito desde que empezó)
  saltear() {
    if (!this.activa || this.tiempoTotal < ESPERA_PARA_SALTEAR) return;
    this.terminar(true);
  }

  terminar(salteada) {
    this.guion = null;
    this.toma = null;
    this.mostrarLinea(null);
    this.contenedor.classList.remove('activa');
    document.body.classList.remove('en-cine');
    this.negro.style.opacity = 0;
    this.camera.fov = this.fovDelJuego;
    this.camera.updateProjectionMatrix();
    this.alTerminar?.(salteada);
  }
}
