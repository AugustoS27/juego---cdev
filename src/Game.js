// Game: arma la escena, las luces y el loop principal. Es el "director" del juego:
// crea todas las partes, las conecta entre sí y decide en qué estado está la partida.
import * as THREE from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { House } from './House.js';
import { Player } from './Player.js';
import { UI } from './UI.js';
import { Items } from './Items.js';
import { Owner, ESTADO_DUENO } from './Owner.js';
import { SistemaDeRuido, RADIO_RUIDO } from './Noise.js';
import { Audio } from './Audio.js';
import { Exterior } from './Exterior.js';
import { Entradas } from './Entradas.js';
import { ZonaDeEscape } from './Escape.js';
import { ALTURA_PISO, INICIO_JUGADOR } from './HouseData.js';

// Estados posibles de la partida
const ESTADO = {
  MENU: 'menu', // menú principal
  JUGANDO: 'jugando',
  PAUSA: 'pausa', // se apretó Esc
  VICTORIA: 'victoria',
  DERROTA: 'derrota',
};

// Dificultad creciente: cada 30 segundos el dueño se enoja más y camina un 10% más rápido
const SEGUNDOS_POR_NIVEL = 30;
const NIVEL_MAXIMO_ENOJO = 6; // como mucho, un 60% más rápido
const AUMENTO_POR_NIVEL = 0.1;

export class Game {
  constructor(contenedor) {
    // --- Renderer: dibuja la escena en un <canvas> ---
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Las sombras las recalculamos nosotros cada 3 frames (ver loop): es lo más caro de dibujar
    this.renderer.shadowMap.autoUpdate = false;
    this.numeroDeFrame = 0;
    contenedor.appendChild(this.renderer.domElement);

    // Bordes negros de dibujo animado: el OutlineEffect dibuja cada objeto dos veces,
    // la segunda "inflado" y en negro por detrás, así queda un contorno alrededor.
    this.efectoBordes = new OutlineEffect(this.renderer, { defaultThickness: 0.007, defaultColor: [0.12, 0.08, 0.06] });
    this.conBordes = true;

    // --- Escena y cámara ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#87ceeb'); // celeste cielo
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    this.crearLuces();

    // --- Todas las partes del juego ---
    this.house = new House(this.scene);
    this.exterior = new Exterior(this.scene, this.house);
    this.entradas = new Entradas(this.scene, this.house);
    this.player = new Player(this.camera, document.body, this.house);
    this.items = new Items(this.scene);
    this.zonaEscape = new ZonaDeEscape(this.scene, this.house);
    this.owner = new Owner(this.scene, this.house, this.player);
    this.ruido = new SistemaDeRuido(this.scene, this.owner);
    this.audio = new Audio();
    this.ui = new UI();

    this.estado = ESTADO.MENU;
    this.tiempoPartida = 0; // segundos jugados en esta partida
    this.nivelEnojo = 0;
    this.tiempoParaEnojo = SEGUNDOS_POR_NIVEL;
    this.tiempoDesdeAvisoRuido = 99; // para no llenar la pantalla de avisos
    this.estabaEnLaZona = false; // para avisar "te faltan objetos" solo al entrar a la zona

    this.conectarEventos();
    this.configurarPantallas();
    this.configurarTeclado();

    // Reloj para medir cuánto tiempo pasó entre frames (dt)
    this.timer = new THREE.Timer();
    this.direccionMirada = new THREE.Vector3();
    window.addEventListener('resize', () => this.alCambiarTamano());

    this.reiniciar(); // deja lista la primera partida (se ve de fondo detrás del menú)
    this.ui.mostrarPantalla('menu');
  }

  crearLuces() {
    // Luz ambiente de dos colores (cielo / suelo): da un look suave de dibujito
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#fff1e0', 0.9));
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.3));

    // Un "sol" por piso, ubicado justo debajo del techo de ese piso y apuntando hacia abajo.
    // Cada sol solo ve lo que tiene debajo hasta el piso (su cámara de sombras llega hasta ahí),
    // así cada piso recibe solo las sombras de sus propios muebles.
    for (let piso = 0; piso < 2; piso++) {
      const techo = (piso + 1) * ALTURA_PISO - 0.25;
      const sol = new THREE.DirectionalLight('#fff4d6', 1.3);
      sol.position.set(0, techo, 0);
      sol.target.position.set(0, techo - 10, 0); // apunta derecho hacia abajo
      this.scene.add(sol, sol.target);

      sol.castShadow = true;
      // Mapa de sombras chico + mucho desenfoque = sombras suaves tipo "mancha" bajo los muebles
      sol.shadow.mapSize.set(1024, 1024);
      sol.shadow.radius = 8;
      sol.shadow.bias = -0.0005;
      // Área que cubren las sombras: toda la casa con el garaje y el balcón, y solo la altura de un piso
      const cam = sol.shadow.camera;
      cam.left = -16;
      cam.right = 10;
      cam.top = 7;
      cam.bottom = -9;
      cam.near = 0.05;
      cam.far = ALTURA_PISO - 0.15; // llega justo hasta el piso, sin pasar al techo de abajo
      cam.up.set(0, 0, -1); // mirando derecho hacia abajo, "arriba" no puede ser +Y
    }

    // Sol de afuera: inclinado, para las sombras del jardín (árboles, cerca, la casa).
    // Adentro no molesta: el techo y las paredes le hacen sombra a todo el interior.
    const solDeAfuera = new THREE.DirectionalLight('#fff1c9', 1.1);
    solDeAfuera.position.set(18, 30, 22);
    solDeAfuera.castShadow = true;
    solDeAfuera.shadow.mapSize.set(2048, 2048);
    solDeAfuera.shadow.radius = 3;
    solDeAfuera.shadow.bias = -0.0008;
    solDeAfuera.shadow.normalBias = 0.03;
    const camAfuera = solDeAfuera.shadow.camera;
    camAfuera.left = -34;
    camAfuera.right = 34;
    camAfuera.top = 34;
    camAfuera.bottom = -34;
    camAfuera.near = 1;
    camAfuera.far = 100;
    this.scene.add(solDeAfuera);
  }

  // ------------------------------------------------------------
  //  CONEXIONES: el jugador y el dueño "avisan" que pasó algo,
  //  y acá decidimos qué sonido, ruido o aviso corresponde.
  // ------------------------------------------------------------
  conectarEventos() {
    // Cada paso del jugador suena y hace ruido según cómo se mueve
    // (agachado casi nada, caminando un poco, corriendo mucho: ver RADIO_RUIDO en Noise.js)
    this.player.alDarPaso = (tipo) => {
      this.audio.paso(tipo);
      this.hacerRuido(this.player.position, RADIO_RUIDO[tipo]);
    };

    // Otros ruidos del jugador: chocar algo corriendo, saltar y aterrizar
    this.player.alHacerRuido = (tipo) => {
      if (tipo === 'choque') {
        this.audio.choque();
        this.ui.mostrarAviso('💥 ¡PUM! Te llevaste puesto un mueble', 1.5);
      } else if (tipo === 'salto') {
        this.audio.salto();
      } else if (tipo === 'aterrizaje') {
        this.audio.aterrizaje();
      }
      this.hacerRuido(this.player.position, RADIO_RUIDO[tipo]);
    };

    // Pasos y puertas del dueño: suenan más fuerte cuanto más cerca está
    this.owner.alDarPaso = () => this.audio.pasoDueno(this.volumenPorDistancia(this.owner.position));
    this.owner.alAbrirPuerta = (puerta) => this.audio.puerta(this.volumenPorDistancia(puerta.centro));

    // El dueño trabó una puerta
    this.owner.alTrabarPuerta = (puerta) => {
      this.audio.traba(Math.max(0.3, this.volumenPorDistancia(puerta.centro)));
      const donde = puerta.piso === 0 ? 'la planta baja' : 'la planta alta';
      this.ui.mostrarAviso(`🔒 ¡El dueño trabó una puerta en ${donde}! Se destraba en 20 s`, 4);
    };

    // El dueño cambió de estado: alerta si te vio, "¿?" si escuchó algo
    this.owner.alCambiarEstado = (nuevo, anterior) => {
      if (this.estado !== ESTADO.JUGANDO) return;
      if (nuevo === ESTADO_DUENO.PERSEGUIR) {
        this.audio.alerta();
        this.ui.mostrarAviso('❗ ¡TE VIO! ¡Corré o escondete!', 2);
      } else if (nuevo === ESTADO_DUENO.INVESTIGAR && anterior === ESTADO_DUENO.PATRULLA) {
        this.audio.duda();
      }
      this.ui.mostrarAlertaPersecucion(nuevo === ESTADO_DUENO.PERSEGUIR);
    };
  }

  // De 1 (al lado de la cámara) a 0 (a 15 m o más)
  volumenPorDistancia(posicion) {
    const distancia = this.camera.position.distanceTo(posicion);
    return THREE.MathUtils.clamp(1 - distancia / 15, 0, 1);
  }

  // Genera un ruido. Si el dueño lo escucha, avisamos (como mucho cada 3 segundos)
  hacerRuido(posicion, radio) {
    const loEscucho = this.ruido.hacerRuido(posicion, radio);
    if (loEscucho && this.tiempoDesdeAvisoRuido > 3) {
      this.ui.mostrarAviso('👂 El dueño escuchó algo y viene a ver...', 2.5);
      this.tiempoDesdeAvisoRuido = 0;
    }
  }

  // ------------------------------------------------------------
  //  PANTALLAS Y TECLADO
  // ------------------------------------------------------------
  // Cómo se pasa de una pantalla a otra:
  //  - "¡A robar!" / "Reiniciar": partida nueva y se bloquea el mouse.
  //  - Al bloquearse el mouse se empieza (o se sigue) jugando.
  //  - Esc: el navegador libera el mouse y aparece la pausa.
  //  - "Menú": vuelve al menú principal.
  configurarPantallas() {
    const controls = this.player.controls;

    controls.addEventListener('lock', () => {
      this.estado = ESTADO.JUGANDO;
      this.ui.mostrarPantalla(null);
      this.ui.mostrarHUD(true);
      if (this.tiempoPartida === 0) this.ui.mostrarAviso('🏠 Estás afuera. Buscá una forma de entrar... ¡hay varias!', 4);
    });

    controls.addEventListener('unlock', () => {
      // Si se liberó el mouse porque terminó la partida, no mostramos la pausa
      if (this.estado === ESTADO.JUGANDO) {
        this.estado = ESTADO.PAUSA;
        this.ui.mostrarPantalla('pausa');
        this.ui.mostrarRuido(0);
      }
    });

    const partidaNueva = () => {
      this.audio.iniciar(); // el audio solo puede arrancar después de un click
      this.reiniciar();
      controls.lock();
    };

    this.ui.conectarBotones({
      jugar: partidaNueva,
      reiniciar: partidaNueva,
      continuar: () => controls.lock(),
      menu: () => {
        this.reiniciar();
        this.estado = ESTADO.MENU;
        this.ui.mostrarHUD(false);
        this.ui.mostrarPantalla('menu');
      },
    });
  }

  configurarTeclado() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && this.estado === ESTADO.JUGANDO) this.interactuar();
      if (e.code === 'KeyM') this.ui.mostrarSilencio(this.audio.alternarSilencio());
      if (e.code === 'KeyB') this.conBordes = !this.conBordes; // bordes de dibujo animado sí/no
    });
  }

  // Deja todo listo para una partida nueva
  reiniciar() {
    if (this.player.escondido) this.salirDelEscondite();
    this.house.reiniciar();
    this.entradas.reiniciar();
    this.ruido.limpiar();
    this.player.setPosition(INICIO_JUGADOR.x, INICIO_JUGADOR.y, INICIO_JUGADOR.z);
    this.camera.rotation.set(0, 0, 0); // mirando hacia adentro de la casa
    this.items.sortearObjetivos();
    this.zonaEscape.activar(false);
    this.estabaEnLaZona = false;
    this.owner.reiniciar();

    this.tiempoPartida = 0;
    this.nivelEnojo = 0;
    this.tiempoParaEnojo = SEGUNDOS_POR_NIVEL;

    this.ui.ocultarCosasDelJuego();
    this.ui.mostrarBotin(this.items.objetivos);
    this.ui.actualizarHUD(0, 0);
  }

  // ------------------------------------------------------------
  //  LOOP
  // ------------------------------------------------------------
  start() {
    this.renderer.setAnimationLoop(() => this.loop());
  }

  // Se ejecuta ~60 veces por segundo
  loop() {
    // Limitamos dt: si la pestaña estuvo en segundo plano, no queremos un "salto" enorme
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);

    this.items.update(dt); // los objetos flotan aunque estemos en pausa
    this.zonaEscape.update(dt);

    if (this.estado === ESTADO.JUGANDO) {
      this.tiempoPartida += dt;
      this.tiempoDesdeAvisoRuido += dt;
      this.actualizarDificultad(dt);

      this.house.update(dt);
      this.entradas.update(dt);
      this.forzarSiMantieneE(dt);
      this.player.update(dt);
      this.owner.update(dt);
      this.ruido.update(dt);

      this.audio.actualizarMusica(dt, this.owner.estado === ESTADO_DUENO.PERSEGUIR);
      this.actualizarAyuda();
      this.ui.actualizarHUD(this.tiempoPartida, this.nivelEnojo);
      const paso = this.player.tipoDePaso;
      this.ui.mostrarRuido(paso ? RADIO_RUIDO[paso] : 0, this.player.agachado);

      if (this.owner.atrapoAlJugador()) this.perder();
      else this.revisarZonaDeEscape();
    }

    // Sombras: se recalculan 20 veces por segundo en vez de 60 (no se nota y ahorra mucho)
    this.numeroDeFrame++;
    if (this.numeroDeFrame % 3 === 0) this.renderer.shadowMap.needsUpdate = true;

    // Dibujamos con bordes (o sin, si se apagaron con B)
    const dibujante = this.conBordes ? this.efectoBordes : this.renderer;
    dibujante.render(this.scene, this.camera);
  }

  // Tensión creciente: cada SEGUNDOS_POR_NIVEL el dueño camina más rápido
  actualizarDificultad(dt) {
    if (this.nivelEnojo >= NIVEL_MAXIMO_ENOJO) return;
    this.tiempoParaEnojo -= dt;
    if (this.tiempoParaEnojo > 0) return;

    this.tiempoParaEnojo = SEGUNDOS_POR_NIVEL;
    this.nivelEnojo++;
    this.owner.multiplicadorVelocidad = 1 + this.nivelEnojo * AUMENTO_POR_NIVEL;
    this.audio.enojo();
    this.ui.mostrarAviso(`😠 El dueño está cada vez más enojado: ¡ahora camina más rápido! (nivel ${this.nivelEnojo})`, 3);
  }

  // El jugador agarró uno de los objetos: va a la bolsa
  agarrarObjeto(objetivo) {
    this.items.agarrar(objetivo);
    this.audio.guardar();
    this.ui.mostrarBotin(this.items.objetivos);

    if (this.items.todosEncontrados) {
      // ¡Tenés los cinco! Se prende la zona de escape
      this.zonaEscape.activar(true);
      this.audio.todoListo();
      this.ui.mostrarAviso('🚐 ¡Tenés todo! Corré a la van negra del frente para escapar', 5);
    } else {
      const faltan = this.items.objetivos.length - this.items.cantidadEncontrados;
      this.ui.mostrarAviso(`🎒 ¡Agarraste ${objetivo.objeto.nombre}! Te ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`}`, 2.5);
    }
  }

  // ¿El jugador llegó a la zona de escape (atrás de la van)?
  revisarZonaDeEscape() {
    const adentro = this.zonaEscape.contiene(this.player.position);
    if (adentro && this.items.todosEncontrados) {
      this.ganar();
    } else if (adentro && !this.estabaEnLaZona) {
      // Llegó antes de tiempo: avisamos una vez (al entrar), no en cada frame
      const faltan = this.items.objetivos.length - this.items.cantidadEncontrados;
      this.ui.mostrarAviso(`🚐 Tu cómplice no arranca sin el botín completo: te ${faltan === 1 ? 'falta 1 objeto' : `faltan ${faltan} objetos`}`, 3);
    }
    this.estabaEnLaZona = adentro;
  }

  // El jugador escapó en la van con los cinco objetos
  ganar() {
    this.estado = ESTADO.VICTORIA; // primero el estado, así "unlock" no muestra la pausa
    this.player.controls.unlock();
    this.audio.motor();
    this.audio.victoria();
    const nombres = this.items.objetivos.map((o) => o.objeto.nombre);
    this.ui.mostrarVictoria(nombres, this.tiempoPartida, this.nivelEnojo);
  }

  // El dueño atrapó al jugador
  perder() {
    const texto = this.owner.encontroAlJugador ? '¡Te encontró escondido! Resulta que no eras tan invisible...' : null;
    this.estado = ESTADO.DERROTA;
    this.player.controls.unlock();
    this.audio.derrota();
    this.ui.mostrarDerrota(texto, this.tiempoPartida, this.nivelEnojo);
  }

  // ------------------------------------------------------------
  //  INTERACCIÓN (tecla E)
  // ------------------------------------------------------------
  // La puerta que el jugador tiene adelante (o null)
  puertaAlFrente() {
    this.camera.getWorldDirection(this.direccionMirada);
    return this.house.puertaCercana(this.player.position, this.direccionMirada);
  }

  // Prioridad: salir del escondite > agarrar un objeto > entradas > esconderse > puerta
  interactuar() {
    if (this.player.animacion) return; // trepando no se puede hacer otra cosa

    if (this.player.escondido) {
      this.salirDelEscondite();
      return;
    }

    const objetivo = this.items.objetivoMirado(this.camera);
    if (objetivo) {
      this.agarrarObjeto(objetivo);
      return;
    }

    const entrada = this.entradas.mirada(this.camera);
    if (entrada) {
      if (!entrada.seMantiene) {
        const resultado = entrada.usar(this.player);
        if (resultado) this.aplicarResultado(resultado);
      }
      return; // (el portón se fuerza manteniendo E: lo maneja forzarSiMantieneE)
    }

    const escondite = this.house.esconditeMirado(this.camera);
    if (escondite) {
      this.esconderse(escondite);
      return;
    }

    const puerta = this.puertaAlFrente();
    if (!puerta) return;

    // No cerramos la puerta si el jugador está parado en el hueco (quedaría atrapado)
    if (puerta.abierta && this.player.obtenerCaja().intersectsBox(puerta.collider)) return;

    // Abrir o cerrar una puerta suena y hace ruido
    if (puerta.alternar()) {
      this.audio.puerta();
      this.hacerRuido(puerta.centro.clone().setY(this.player.position.y), RADIO_RUIDO.puerta);
    }
  }

  // Mientras se mantiene E mirando el portón del garaje, se lo va forzando
  forzarSiMantieneE(dt) {
    if (!this.player.teclas['KeyE'] || this.player.escondido || this.player.animacion) return;
    const entrada = this.entradas.mirada(this.camera);
    if (!entrada || !entrada.seMantiene) return;
    for (const resultado of entrada.forzar(dt)) this.aplicarResultado(resultado);
  }

  // Las entradas devuelven "qué pasó"; acá lo convertimos en sonido, ruido, aviso y animación
  aplicarResultado({ sonido, aviso, ruido, animacion, llave }) {
    if (sonido) this.audio[sonido]?.();
    if (aviso) this.ui.mostrarAviso(aviso, 3);
    if (ruido) this.hacerRuido(ruido.posicion, ruido.radio);
    if (animacion) this.player.moverAnimado(animacion);
    if (llave) this.house.puertaDeCalle.conLlave = false;
  }

  esconderse(escondite) {
    this.player.esconderse(escondite);
    this.owner.alEsconderseElJugador(escondite);
    this.ui.mostrarEscondite(escondite.escondite);
    this.audio.puerta(0.4);
  }

  salirDelEscondite() {
    this.player.salirDelEscondite();
    this.ui.mostrarEscondite(null);
    this.audio.puerta(0.4);
  }

  // Cartel de ayuda abajo de la mira
  actualizarAyuda() {
    if (this.player.animacion) {
      this.ui.mostrarAyuda(null);
      return;
    }

    if (this.player.escondido) {
      const donde = this.player.escondite.escondite === 'cama' ? 'debajo de la cama' : 'en el placard';
      this.ui.mostrarAyuda(`Escondido ${donde}... [E] Salir`);
      return;
    }

    const objetivo = this.items.objetivoMirado(this.camera);
    if (objetivo) {
      this.ui.mostrarAyuda(`[E] Agarrar ${objetivo.objeto.nombre}`);
      return;
    }

    const entrada = this.entradas.mirada(this.camera);
    if (entrada) {
      this.ui.mostrarAyuda(entrada.ayuda(this.player));
      return;
    }

    const escondite = this.house.esconditeMirado(this.camera);
    if (escondite) {
      this.ui.mostrarAyuda(escondite.escondite === 'cama' ? '[E] Meterse debajo de la cama' : '[E] Esconderse en el placard');
      return;
    }

    const puerta = this.puertaAlFrente();
    if (!puerta) {
      this.ui.mostrarAyuda(null);
    } else if (puerta.conLlave) {
      this.ui.mostrarAyuda('Cerrada con llave. ¿Habrá una llave de repuesto escondida por acá?');
    } else if (puerta.trabada) {
      this.ui.mostrarAyuda(`🔒 Trabada por el dueño (${Math.ceil(puerta.tiempoTrabada)} s)`);
    } else {
      this.ui.mostrarAyuda(puerta.abierta ? '[E] Cerrar puerta (hace ruido)' : '[E] Abrir puerta (hace ruido)');
    }
  }

  alCambiarTamano() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
