// Game: arma la escena, las luces y el loop principal. Es el "director" del juego:
// crea todas las partes, las conecta entre sí y decide en qué estado está la partida.
import * as THREE from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { House } from './House.js';
import { Player } from './Player.js';
import { UI } from './UI.js';
import { Items } from './Items.js';
import { Habilidades, HABILIDADES, MULTIPLICADOR_BEBIDA } from './Habilidades.js';
import { Efectos } from './Efectos.js';
import { ESCONDITES } from './Escondites.js';
import { Walkie, RADIO_RUIDO_WALKIE } from './Walkie.js';
import { Dueno } from './Dueno.js';
import { Perro, PERROS } from './Perro.js';
import { Abuela, ESTADO_ABUELA } from './Abuela.js';
import { ESTADO } from './Enemigo.js';
import { SistemaDeRuido, RADIO_RUIDO } from './Noise.js';
import { Audio } from './Audio.js';
import { Exterior } from './Exterior.js';
import { Entradas } from './Entradas.js';
import { ZonaDeEscape } from './Escape.js';
import { Cinematica } from './Cinematica.js';
import { Escenas } from './Escenas.js';
import { TURNOS, sortearTurno, Linterna } from './Turno.js';
import { Lamparas } from './Lamparas.js';
import { Atmosfera } from './Atmosfera.js';
import { CorteDeLuz } from './CorteDeLuz.js';
import { Superficies, zonaDeEco } from './Sonido.js';
import { Ambiente } from './Ambiente.js';
import { Musica } from './Musica.js';
import { ponerContraste } from './Materials.js';
import { juntarMallasEstaticas } from './Optimizar.js';
import { Decoracion } from './Decoracion.js';
import { ALTURA_PISO, INICIO_JUGADOR, TECHO, PISO_MINIMO, NOMBRES_PISOS, ZONA_PATIO, TABLERO_LUZ, pisoDeAltura } from './HouseData.js';

// Estados posibles de la partida
const PARTIDA = {
  MENU: 'menu', // menú principal
  CINE: 'cine', // mirando una cinemática
  LISTO: 'listo', // terminó la intro: esperando el click en "¡Vamos!"
  JUGANDO: 'jugando',
  PAUSA: 'pausa', // se apretó Esc
  VICTORIA: 'victoria',
  DERROTA: 'derrota',
};

// (Cuánta luz hay según el turno y el piso donde está el jugador: ver TURNOS en Turno.js)

// El menú: la casa de fondo, vista desde la vereda de enfrente (la cámara se mueve despacito)
const CAMARA_MENU = { posicion: [0.5, 2.3, 28.5], mira: [-3.6, 3.6, 6], fov: 50 }; // (la casa queda a la derecha del panel)
const FOV_JUEGO = 75;

// Cortes de luz (etapa 16C)
const ESPERA_DUENO_TABLERO = 1.5; // segundos hasta que Don Ernesto sale para el tablero ("¡¿Otra vez la luz?!")
const MAXIMO_SIN_LUZ = 75; // por las dudas: si en este tiempo nadie la subió, la luz vuelve sola

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
    this.habilidades = new Habilidades(this.scene, this.house);
    this.efectos = new Efectos(this.scene); // lo que vuela hacia la cámara al agarrar algo
    this.zonaEscape = new ZonaDeEscape(this.scene, this.house);
    this.decoracion = new Decoracion(this.scene, this.house);
    // Etapa 16B: las lámparas que alumbran de verdad y la atmósfera (luz de las ventanas, lluvia, polvo)
    this.lamparas = new Lamparas(this.scene, this.decoracion.lamparas);
    this.atmosfera = new Atmosfera(this.scene);
    // Etapa 16C: el tablero de luz del garaje (los cortes de luz)
    this.corte = new CorteDeLuz(this.scene, this.house);
    this.corrienteActual = 1;
    this.esperaDueno = 0; // > 0: cuánto falta para que Don Ernesto salga para el tablero
    // Los enemigos: el dueño (toda la casa), dos perros (el patio) y la abuela (su piso)
    this.dueno = new Dueno(this.scene, this.house, this.player);
    this.perros = PERROS.map((datos) => new Perro(this.scene, this.house, this.player, datos));
    this.abuela = new Abuela(this.scene, this.house, this.player);
    this.enemigos = [this.dueno, ...this.perros, this.abuela];
    this.ruido = new SistemaDeRuido(this.scene, this.enemigos);
    this.audio = new Audio();
    // Etapa 16D: sobre qué se pisa (para los pasos), los ruidos de ambiente y cuánto tapan las paredes
    this.superficies = new Superficies(this.house);
    this.ambiente = new Ambiente(this.audio, this.house);
    this.musica = new Musica(this.audio); // etapa 17C: música por capas, según lo que pasa
    this.audio.alIniciar = () => (this.audio.espacio.tapado = (posicion) => this.tapadoHasta(posicion));
    this.audio.estilo = leerGuardado('estiloSonido', ['grabado', 'codigo'], 'grabado');
    if (import.meta.env.DEV) this.crearProbadorDeSonidos();
    this.ui = new UI();
    this.walkie = new Walkie(); // Facu, por radio (pistas, cuando se las pedís con T)
    // Cinemáticas: el reproductor (Cinematica.js) y los guiones con sus actores (Escenas.js)
    this.cinematica = new Cinematica(this.camera);
    this.cinematica.alHablar = (quien) => this.audio.voz(quien);
    this.escenas = new Escenas(this.scene, this.house, this.zonaEscape, this.audio);
    this.vioLaIntro = false; // la intro sale sola la primera vez que se toca "¡A jugar!"

    // Día y noche (ver Turno.js). La linterna de Tomi (tecla F, solo de noche) y la de Don Ernesto.
    this.linterna = new Linterna(this.scene, { intensidad: 11, distancia: 24, angulo: 0.48, sombra: true });
    // (Las dos con sombra: sin sombra, la luz atraviesa las paredes e ilumina el cuarto de al lado)
    this.linternaDueno = new Linterna(this.scene, { color: '#ffe9b0', intensidad: 7, distancia: 15, angulo: 0.32, sombra: true, cono: true });
    this.eleccionTurno = leerEleccionTurno(); // 'azar', 'dia' o 'noche' (lo que se eligió en el menú)
    this.ui.marcarTurno(this.eleccionTurno);
    this.ui.marcarEstiloSonido(this.audio.estilo);
    this.ponerTurno(sortearTurno(this.eleccionTurno));
    this.tiempoMenu = 0;
    this.tiempoRelampago = -1; // segundos desde que empezó el relámpago (-1: no hay)
    this.relampagoLejano = false;
    this.proximoRelampago = 3;
    this.cercania = 0; // qué tan cerca está el enemigo más cercano (0 a 1): cierra los bordes de la pantalla
    this.jugadorAdentro = false;

    // Rendimiento: todo lo que no se mueve (paredes, pisos, escalones, decoración) se junta en
    // pocas mallas, una por material. Tiene que ir DESPUÉS de crear la casa, el exterior y la van.
    const juntadas = juntarMallasEstaticas(this.scene);
    if (import.meta.env.DEV) console.log(`[debug] Mallas estáticas: ${juntadas.antes} juntadas en ${juntadas.despues}`);
    // Los muebles y las plantas del jardín cargan sus modelos de a poco: cuando terminan todos,
    // juntamos también esas mallas (los muebles, por piso)
    Promise.allSettled([...this.house.cargas, ...this.exterior.cargas]).then(() => {
      const modelos = juntarMallasEstaticas(this.scene);
      this.house.registrarJuntados(modelos.porCapa);
      if (import.meta.env.DEV) console.log(`[debug] Modelos: ${modelos.antes} mallas juntadas en ${modelos.despues}`);
    });

    this.estado = PARTIDA.MENU;
    this.tiempoPartida = 0; // segundos jugados en esta partida
    this.estabaEnLaZona = false; // para avisar "te faltan objetos" solo al entrar a la zona

    this.conectarEventos();
    this.configurarPantallas();
    this.configurarTeclado();

    // Reloj para medir cuánto tiempo pasó entre frames (dt)
    this.timer = new THREE.Timer();
    this.direccionMirada = new THREE.Vector3();
    window.addEventListener('resize', () => this.alCambiarTamano());

    this.reiniciar(); // deja lista la primera partida
    this.entrarAlMenu();
  }

  crearLuces() {
    // Luz ambiente de dos colores (cielo / suelo): da un look suave de dibujito
    const luz = TURNOS.dia.luz; // (los valores de verdad los pone ponerTurno)
    this.luzCielo = new THREE.HemisphereLight('#ffffff', '#fff1e0', luz.cielo);
    this.luzAmbiente = new THREE.AmbientLight('#ffffff', luz.ambiente);
    this.scene.add(this.luzCielo, this.luzAmbiente);

    // "Sol" de adentro: está justo debajo del techo del piso donde está el jugador y apunta
    // derecho hacia abajo. Hay UNO solo y se muda de piso con el jugador (ver actualizarLuces).
    // ¿Por qué no uno por piso? Porque una luz direccional ilumina TODO, esté donde esté:
    // con 5 soles, cada piso recibiría la luz de los 5 y quedaría todo quemado.
    // Su cámara de sombras llega hasta el fondo del sótano: los pisos de abajo quedan a la
    // sombra del piso donde estás (como si la luz entrara desde arriba).
    this.solInterior = new THREE.DirectionalLight('#fff4d6', luz.sol);
    this.solInterior.castShadow = true;
    // Mapa de sombras chico + mucho desenfoque = sombras suaves tipo "mancha" bajo los muebles
    this.solInterior.shadow.mapSize.set(1024, 1024);
    this.solInterior.shadow.radius = 8;
    this.solInterior.shadow.bias = -0.0005;
    // Área que cubren las sombras: toda la casa con el garaje y el balcón
    const cam = this.solInterior.shadow.camera;
    cam.left = -16;
    cam.right = 10;
    cam.top = 7;
    cam.bottom = -9;
    cam.near = 0.05;
    cam.up.set(0, 0, -1); // mirando derecho hacia abajo, "arriba" no puede ser +Y
    this.scene.add(this.solInterior, this.solInterior.target);
    this.pisoDeLaLuz = null;
    this.moverSolInterior(0);

    // Luz de relleno: vertical, suave y SIN sombras, para que los pisos de abajo no queden negros
    this.luzRelleno = new THREE.DirectionalLight('#fff4d6', luz.relleno);
    this.luzRelleno.position.set(0, 20, 0);
    this.scene.add(this.luzRelleno);

    // Sol de afuera (de noche, la luna): inclinado, para las sombras del jardín (árboles, cerca, la casa).
    // Adentro no molesta: el techo y las paredes le hacen sombra a todo el interior.
    const solDeAfuera = new THREE.DirectionalLight('#fff1c9', 1.1);
    this.solDeAfuera = solDeAfuera;
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

    // El relámpago: una luz blanca azulada que está siempre (apagada) y se prende un instante
    this.luzRelampago = new THREE.DirectionalLight('#dfe8ff', 0);
    this.luzRelampago.position.set(-10, 40, 30);
    this.scene.add(this.luzRelampago);
  }

  // ------------------------------------------------------------
  //  DÍA Y NOCHE (ver Turno.js)
  // ------------------------------------------------------------
  // Cambia todas las luces y colores al turno dado ('dia' o 'noche')
  ponerTurno(turno) {
    this.turno = turno;
    this.datosTurno = TURNOS[turno];
    const { hemisferio, afuera } = this.datosTurno;
    this.exterior.ponerTurno(turno);
    this.luzCielo.color.set(hemisferio.cielo);
    this.luzCielo.groundColor.set(hemisferio.suelo);
    this.solDeAfuera.color.set(afuera.color);
    this.solDeAfuera.intensity = afuera.intensidad;
    this.solDeAfuera.position.set(...afuera.posicion);
    this.dueno.ponerLinterna(turno === 'noche');
    this.linterna.prender(false);
    this.ui.mostrarTurno(this.datosTurno);
    // Etapa 16B: algunas noches hay tormenta (relámpagos y lluvia)
    this.tormenta = Math.random() < this.datosTurno.tormenta;
    this.lamparas.ponerTurno(this.datosTurno.lamparas);
    this.atmosfera.ponerTurno(this.datosTurno, this.tormenta);
    ponerContraste(this.datosTurno.contraste);
    this.actualizarLuces(1); // (de golpe)
  }

  // Las dos linternas siguen a quien las lleva (de día están apagadas)
  actualizarLinternas() {
    if (this.linterna.prendida) {
      // Sale de la mano (un poco abajo y a la derecha de los ojos) hacia donde mirás
      this.camera.getWorldDirection(this.direccionMirada);
      const mano = new THREE.Vector3(0.18, -0.2, 0).applyQuaternion(this.camera.quaternion).add(this.camera.position);
      this.linterna.seguir(mano, this.camera.position.clone().addScaledVector(this.direccionMirada, 6));
    }
    // La de Don Ernesto: prendida de noche mientras se lo ve (en el menú y en las cinemáticas está escondido)
    const dueno = this.dueno;
    const conLinterna = dueno.conLinterna && dueno.modelo.visible;
    if (conLinterna !== this.linternaDueno.prendida) this.linternaDueno.prender(conLinterna);
    if (conLinterna) {
      // La luz y el haz solo se ven si está en tu mismo piso: si no, atravesarían el piso y se meterían
      // en tu cuarto (las sombras no alcanzan a frenar una luz que entra tan rasante)
      const mismoPiso = pisoDeAltura(dueno.position.y) === pisoDeAltura(this.player.position.y);
      this.linternaDueno.alumbrar(mismoPiso);
      this.linternaDueno.cono.visible = mismoPiso;
      const desde = dueno.puntaLinterna.getWorldPosition(new THREE.Vector3());
      const giro = dueno.rotacion + (dueno.brazos[0]?.rotation.z ?? 0) * 0.6; // (buscando, la mueve de lado a lado)
      const hacia = new THREE.Vector3(Math.sin(giro), -0.15, Math.cos(giro));
      this.linternaDueno.seguir(desde, desde.clone().addScaledVector(hacia, 6));
    }
  }

  // F: prende o apaga la linterna (solo de noche)
  alternarLinterna() {
    if (this.turno !== 'noche') return; // (de día no hace falta: ni se prende)
    this.linterna.prender(!this.linterna.prendida);
    this.audio.linterna();
    this.ui.mostrarLinterna(this.linterna.prendida);
  }

  // De noche los enemigos ven menos lejos... salvo que tengas la linterna prendida (ven el haz).
  // Con la luz cortada ven todavía menos (pero la linterna se nota más). A los perros no les cambia.
  actualizarVision() {
    const { vision } = this.datosTurno;
    const sinLuz = this.corte.cortada;
    for (const enemigo of this.enemigos) {
      if (this.perros.includes(enemigo)) enemigo.multiplicadorVision = vision.perros;
      else if (this.linterna.prendida) enemigo.multiplicadorVision = sinLuz ? vision.conLinternaSinLuz : vision.conLinterna;
      else enemigo.multiplicadorVision = sinLuz ? vision.sinLuz : vision.sinLinterna;
    }
  }

  // ------------------------------------------------------------
  //  CORTES DE LUZ (etapa 16C, ver CorteDeLuz.js)
  // ------------------------------------------------------------
  // E mirando el tablero: baja la llave (o la vuelve a subir, si estaba cortada)
  usarTablero() {
    if (this.turno !== 'noche') return; // (de día no cambia nada: lo dice el cartel al mirarlo)
    if (this.corte.cortada) this.subirLlave(false);
    else this.bajarLlave();
  }

  bajarLlave() {
    this.corte.bajar();
    this.audio.enElMundo('tablero', true);
    this.hacerRuido(new THREE.Vector3(TABLERO_LUZ.x - 0.6, 0, TABLERO_LUZ.z), RADIO_RUIDO.puerta);
    this.esperaDueno = ESPERA_DUENO_TABLERO;
  }

  // porDueno: la subió Don Ernesto (si no, el jugador)
  subirLlave(porDueno) {
    this.corte.subir();
    if (porDueno) this.audio.desde(new THREE.Vector3(TABLERO_LUZ.x, TABLERO_LUZ.y, TABLERO_LUZ.z), 'tablero', false);
    else this.audio.enElMundo('tablero', false);
    if (!porDueno) this.dueno.olvidarTablero();
    this.esperaDueno = 0;
  }

  // En la partida: Don Ernesto sale para el tablero un ratito después del corte. Y, por las dudas,
  // si la luz estuvo cortada demasiado tiempo (se trabó en algún lado), vuelve sola.
  actualizarCorte(dt) {
    if (this.esperaDueno > 0) {
      this.esperaDueno -= dt;
      if (this.esperaDueno <= 0 && this.corte.cortada) {
        const sospecha = this.corte.veces >= 2;
        this.dueno.irAlTablero(this.dueno.waypoints.tablero, sospecha);
        this.audio.desde(this.cabezaDe(this.dueno), 'rezongo'); // ("¡¿Otra vez la luz?!")
      }
    }
    if (this.corte.cortada && this.corte.tiempoCortada > MAXIMO_SIN_LUZ) {
      this.dueno.olvidarTablero();
      this.subirLlave(true);
    }
  }

  // La corriente (de 0 a 1) llega a todo lo que tiene luces en la casa
  ponerCorriente(corriente) {
    this.corrienteActual = corriente;
    this.lamparas.ponerCorriente(corriente);
    this.decoracion.ponerCorriente(corriente);
    this.house.ponerCorriente(corriente);
    this.exterior.ponerCorriente(corriente);
  }

  // Relámpago: un destello que titila (dos o tres veces) y se apaga; el trueno llega un poco después.
  // lejano: la tormenta está lejos (de día): un destello débil y el trueno más tarde y más bajito.
  relampago(lejano = false) {
    this.tiempoRelampago = 0;
    this.relampagoLejano = lejano;
    if (lejano) this.audio.trueno(2.5 + Math.random() * 2.5, 0.45);
    else this.audio.trueno(0.4 + Math.random() * 1.2);
  }

  // En la partida: las noches de tormenta, un relámpago cada 10 a 25 s; de día, uno lejano cada tanto.
  // (Las noches sin tormenta, nada: noche clara con luna)
  actualizarTormenta(dt) {
    this.proximoRelampago -= dt;
    if (this.proximoRelampago > 0) return;
    if (this.tormenta) {
      this.relampago();
      this.proximoRelampago = 10 + Math.random() * 15;
    } else if (this.turno === 'dia') {
      this.relampago(true);
      this.proximoRelampago = 35 + Math.random() * 35;
    } else {
      this.proximoRelampago = 999;
    }
  }

  // Cuánto se ve el relámpago donde está el jugador: afuera, todo; adentro, menos; en el sótano, nada
  luzDeRelampagoAca() {
    if (this.estado !== PARTIDA.JUGANDO || !this.jugadorAdentro) return 1;
    return pisoDeAltura(this.player.position.y) === -1 ? 0 : 0.4;
  }

  actualizarRelampago(dt) {
    if (this.tiempoRelampago < 0) return;
    const t = (this.tiempoRelampago += dt);
    let fuerza = 0;
    if (t < 0.07) fuerza = 1;
    else if (t < 0.15) fuerza = 0.1;
    else if (t < 0.25) fuerza = 0.8;
    else if (t < 0.65) fuerza = ((0.65 - t) / 0.4) * 0.5;
    else this.tiempoRelampago = -1;
    if (this.relampagoLejano) fuerza *= 0.35;
    const aca = this.luzDeRelampagoAca();
    this.luzRelampago.intensity = fuerza * aca * (this.turno === 'noche' ? 3 : 1.8);
    this.ui.mostrarRelampago(fuerza * aca);
    // Las ventanas se prenden de golpe (aunque estés adentro: por ahí entra el destello)
    this.atmosfera.relampago(aca > 0 ? fuerza : 0);
  }

  // Los efectos de pantalla (ver UI.mostrarAtmosfera): los bordes se cierran si hay un enemigo cerca
  // (en tu mismo piso, a menos de 9 m)
  actualizarPantalla(dt) {
    let cercania = 0;
    if (this.estado === PARTIDA.JUGANDO) {
      const piso = pisoDeAltura(this.player.position.y);
      for (const enemigo of this.enemigos) {
        if (!enemigo.modelo.visible || pisoDeAltura(enemigo.position.y) !== piso) continue;
        const distancia = enemigo.position.distanceTo(this.player.position);
        cercania = Math.max(cercania, THREE.MathUtils.clamp((9 - distancia) / 6, 0, 1));
      }
    }
    this.cercania += (cercania - this.cercania) * Math.min(1, dt * 3);
    const { vineta, grano } = this.datosTurno.pantalla;
    this.ui.mostrarAtmosfera({ vineta, cerca: this.cercania * 0.85, grano });
  }

  // ------------------------------------------------------------
  //  MENÚ: la casa de fondo, con los vecinos y los perros mirando (ver Escenas.prepararMenu)
  // ------------------------------------------------------------
  entrarAlMenu() {
    this.estado = PARTIDA.MENU;
    this.ui.mostrarHUD(false);
    this.ui.ocultarCosasDelJuego();
    this.ui.mostrarPantalla('menu');
    for (const enemigo of this.enemigos) enemigo.modelo.visible = false;
    this.zonaEscape.prepararCinematica();
    this.escenas.prepararMenu(this.turno === 'noche');
    this.camera.fov = CAMARA_MENU.fov;
    this.camera.updateProjectionMatrix();
    this.tiempoMenu = 0;
    this.proximoRelampago = 2 + Math.random() * 3;
  }

  // Se sale del menú (a jugar o a ver la intro): todo vuelve a su lugar
  salirDelMenu() {
    this.escenas.limpiar();
    for (const enemigo of this.enemigos) enemigo.modelo.visible = true;
    this.camera.fov = FOV_JUEGO;
    this.camera.updateProjectionMatrix();
    this.player.actualizarCamara();
    this.camera.rotation.set(0, 0, 0);
  }

  // Cada frame en el menú: la cámara se hamaca despacito, los actores se mueven y, cada tanto, un relámpago
  actualizarMenu(dt) {
    this.tiempoMenu += dt;
    const t = this.tiempoMenu;
    const [x, y, z] = CAMARA_MENU.posicion;
    this.camera.position.set(x + Math.sin(t * 0.12) * 1.5, y + Math.sin(t * 0.17) * 0.25, z);
    this.camera.lookAt(...CAMARA_MENU.mira);
    this.escenas.animarMenu(t);
    this.proximoRelampago -= dt;
    if (this.proximoRelampago <= 0) {
      this.relampago();
      this.proximoRelampago = 6 + Math.random() * 8;
    }
  }

  // ------------------------------------------------------------
  //  CONEXIONES: el jugador y el dueño "avisan" que pasó algo,
  //  y acá decidimos qué sonido o ruido corresponde.
  // ------------------------------------------------------------
  conectarEventos() {
    // Cada paso del jugador suena y hace ruido según cómo se mueve
    // (agachado casi nada, caminando un poco, corriendo mucho: ver RADIO_RUIDO en Noise.js).
    // Adentro de un conducto de ventilación, cualquier paso suena a chapa.
    // Con las botas de lana puestas, los pasos no hacen ruido (ni corriendo, ni en la chapa).
    // Cómo suena depende de lo que pisás: madera, cerámica, alfombra, pasto... (ver Sonido.js).
    // El ruido que escuchan los enemigos no cambia: depende de cómo caminás, no del piso.
    this.player.alDarPaso = (tipo) => {
      if (this.player.pasosSilenciosos) {
        this.audio.enElMundo('paso', 'lana');
        return;
      }
      if (this.house.enConducto(this.player.position)) tipo = 'conducto';
      this.audio.enElMundo('paso', tipo, this.superficies.en(this.player.position));
      this.hacerRuido(this.player.position, RADIO_RUIDO[tipo]);
    };

    // Otros ruidos del jugador: chocar algo corriendo, saltar y aterrizar
    this.player.alHacerRuido = (tipo) => {
      if (tipo === 'choque') {
        this.audio.enElMundo('choque');
      } else if (tipo === 'salto') {
        this.audio.enElMundo('salto');
      } else if (tipo === 'aterrizaje') {
        this.audio.enElMundo('aterrizaje');
      }
      this.hacerRuido(this.player.position, RADIO_RUIDO[tipo]);
    };

    // Algunas animaciones de las entradas traen algo que pasa al llegar (ej: el ¡PUF! de la chimenea)
    this.player.alTerminarAnimacion = (resultado) => this.aplicarResultado(resultado);

    // Pasos y puertas de los enemigos: suenan donde están (de qué lado, qué tan lejos, tapados por las
    // paredes) y según lo que pisan: los de Don Ernesto pesados, las pantuflas de Doña Pocha, las uñas
    // de los perros
    const pasoDe = (enemigo, efecto) => () => this.audio.desde(enemigo.position.clone().setY(enemigo.position.y + 0.1), efecto, this.superficies.en(enemigo.position));
    const pasoDueno = pasoDe(this.dueno, 'pasoDueno');
    this.dueno.alDarPaso = () => {
      pasoDueno();
      // Si está cerca, la música baja un instante: sus pasos se tienen que escuchar siempre
      if (this.dueno.position.distanceTo(this.player.position) < 14) this.musica.agachar();
    };
    this.abuela.alDarPaso = pasoDe(this.abuela, 'pasoPocha');
    for (const perro of this.perros) perro.alDarPaso = pasoDe(perro, 'pasoPerro');
    for (const enemigo of [this.dueno, this.abuela]) {
      enemigo.alAbrirPuerta = (puerta) => this.audio.desde(puerta.centro, 'puerta');
    }

    // Goteras del sótano: "plic" (solo si estás en el sótano, y más fuerte cuanto más cerca)
    this.decoracion.alCaerGota = (posicion) => {
      if (this.estado !== PARTIDA.JUGANDO || pisoDeAltura(this.player.position.y) !== -1) return;
      this.audio.desde(posicion, 'gota');
    };

    // Don Ernesto llegó al tablero y subió la llave (ver Dueno.js)
    this.dueno.alArreglarTablero = () => this.subirLlave(true);

    // El dueño trabó una puerta
    this.dueno.alTrabarPuerta = (puerta) => {
      this.audio.desde(puerta.centro, 'traba');
    };

    // El walkie: "kshhh" al empezar y terminar cada mensaje, y la vocecita de Facu mientras se escribe
    this.walkie.alEmpezarMensaje = () => this.audio.walkie();
    this.walkie.alEscribirLetra = () => this.audio.vozFacu();
    this.walkie.alTerminarMensaje = () => this.audio.walkie(0.5);
    this.walkie.alCambiarPistas = () => this.ui.mostrarBotin(this.items.objetivos, this.walkie);

    // El dueño cambió de estado: alerta si te vio, "¿?" si escuchó algo
    this.dueno.alCambiarEstado = (nuevo, anterior) => {
      if (this.estado !== PARTIDA.JUGANDO) return;
      if (nuevo === ESTADO.PERSEGUIR) {
        this.musica.golpe('visto');
      } else if (nuevo === ESTADO.INVESTIGAR && anterior === ESTADO.PATRULLA) {
        this.musica.golpe('oyo');
      }
    };

    // Perros: cada ladrido suena y es un ruido que alerta a los demás (sobre todo al dueño)
    for (const perro of this.perros) {
      perro.alLadrar = () => {
        this.audio.desde(perro.position.clone().setY(perro.position.y + 0.6), 'ladrido');
        this.hacerRuido(perro.position, RADIO_RUIDO.ladrido, perro);
      };
      // Te vio: un susto de música. Escuchó algo: gruñe (se escucha de qué lado está)
      perro.alCambiarEstado = (nuevo, anterior) => {
        if (this.estado !== PARTIDA.JUGANDO) return;
        if (nuevo === ESTADO.PERSEGUIR) this.musica.golpe('susto');
        else if (nuevo === ESTADO.INVESTIGAR && anterior === ESTADO.PATRULLA) this.audio.desde(this.cabezaDe(perro), 'grunido');
      };
    }

    // Doña Pocha: "clic" al apuntar, ¡FUAP! al disparar la red (hace ruido) y ruiditos al recargar
    this.abuela.alApuntar = () => {
      this.audio.clic(Math.max(0.5, this.volumenPorDistancia(this.abuela.position)));
      this.musica.golpe('susto');
    };
    this.abuela.alDisparar = () => {
      this.audio.desde(this.cabezaDe(this.abuela), 'fuap');
      this.ui.mostrarFuap();
      // El ruido sale de donde te vio (a la altura de tus pies): el dueño va a ir a ver ahí
      this.hacerRuido(this.abuela.ultimaPosicionVista, RADIO_RUIDO.red, this.abuela);
    };
    // La red te enredó: 3 s sin moverte, y Doña Pocha grita "¡ERNESTOOO!" (un ruido grande donde estás)
    this.abuela.alAtrapar = () => {
      this.player.atraparEnRed();
      this.audio.enredado();
      this.audio.gritoPocha(Math.max(0.5, this.volumenPorDistancia(this.abuela.position)));
      this.hacerRuido(this.player.position.clone(), RADIO_RUIDO.grito, this.abuela);
    };
    this.player.alSoltarseDeLaRed = () => {
      this.abuela.redes.dejarEnElPiso(this.player.position);
      this.audio.enElMundo('trepar'); // (el roce de la red al soltarte)
    };
    this.abuela.alRecargar = () => this.audio.desde(this.cabezaDe(this.abuela), 'recarga');
  }

  // Pone el sol de adentro debajo del techo del piso dado (en el ático, debajo de la cumbrera)
  moverSolInterior(piso) {
    if (piso === this.pisoDeLaLuz) return;
    this.pisoDeLaLuz = piso;
    const techo = piso >= 3 ? TECHO.y + TECHO.alto - 0.9 : (piso + 1) * ALTURA_PISO - 0.25;
    this.solInterior.position.set(0, techo, 0);
    this.solInterior.target.position.set(0, techo - 10, 0);
    this.solInterior.target.updateMatrixWorld();
    // La cámara de sombras llega hasta el piso del sótano
    this.solInterior.shadow.camera.far = techo - (PISO_MINIMO * ALTURA_PISO - 0.3);
    this.solInterior.shadow.camera.updateProjectionMatrix();
  }

  // Cada frame: el sol se muda al piso del jugador y las luces se acercan de a poco a las de ese piso
  // (así, al bajar al sótano, "se te acostumbra la vista" en vez de oscurecerse de golpe).
  // También le decimos a la casa qué muebles dibujar y mostramos el piso en el HUD.
  // (En las cinemáticas y en el menú, que son afuera, se usa la luz de la planta baja)
  actualizarLuces(dt) {
    const afuera = this.estado === PARTIDA.CINE || this.estado === PARTIDA.MENU;
    const piso = afuera ? 0 : pisoDeAltura(this.player.position.y);
    this.moverSolInterior(piso);
    this.house.mostrarPisosCercanos(piso);
    const p = this.player.position;
    const enLaCasa = p.x > -15.5 && p.x < 9 && p.z > -6 && p.z < 6; // (casa + garaje)
    this.jugadorAdentro = enLaCasa && !afuera;
    let donde = enLaCasa ? NOMBRES_PISOS[piso] : 'Afuera';
    if (!enLaCasa && this.enElPatio(p)) donde = '🐕 Patio de los perros';
    if (this.house.enTunel(p)) donde = 'Túnel secreto';
    else if (this.house.enConducto(p)) donde = 'Conducto de ventilación';
    this.ui.mostrarPiso(donde);

    const objetivo = this.datosTurno.luzPorPiso[piso] || this.datosTurno.luz;
    const t = Math.min(1, dt * 3);
    // Las lámparas: las luces se mudan a las más cercanas (ver Lamparas.js). Y los cortes de luz
    this.lamparas.actualizar(dt, p, piso);
    const corriente = this.corte.update(dt, piso);
    if (corriente !== this.corrienteActual) this.ponerCorriente(corriente);
    this.solInterior.intensity += (objetivo.sol - this.solInterior.intensity) * t;
    this.luzRelleno.intensity += (objetivo.relleno - this.luzRelleno.intensity) * t;
    this.luzCielo.intensity += (objetivo.cielo - this.luzCielo.intensity) * t;
    this.luzAmbiente.intensity += (objetivo.ambiente - this.luzAmbiente.intensity) * t;
  }

  // ¿El punto está en el patio de los perros? (con un poco de margen: los perros no llegan al borde)
  enElPatio({ x, z }) {
    return ZONA_PATIO.some(([x1, z1, x2, z2]) => x > x1 - 0.5 && x < x2 + 0.5 && z > z1 - 0.5 && z < z2 + 0.5);
  }

  // ------------------------------------------------------------
  //  SONIDO (etapa 16D, ver Sonido.js y Ambiente.js)
  // ------------------------------------------------------------
  // Cuánto tapan las paredes un sonido que sale de "posicion": 0 si lo ves, 0.55 si hay algo en el medio,
  // 1 si está en otro piso
  tapadoHasta(posicion) {
    const oidos = this.camera.position;
    if (pisoDeAltura(posicion.y) !== pisoDeAltura(oidos.y - 1.6)) return 1;
    return this.house.hayVisionEntre(oidos, posicion) ? 0 : 0.55;
  }

  // La cabeza de un enemigo (de ahí salen su voz y sus ruidos)
  cabezaDe(enemigo) {
    return enemigo.position.clone().setY(enemigo.position.y + 1.4);
  }

  // Cada frame: los oídos van con la cámara, el eco cambia según el lugar y suena el ambiente
  actualizarSonido(dt, alerta) {
    if (!this.audio.ctx) return;
    this.camera.getWorldDirection(this.direccionMirada);
    this.audio.espacio.actualizarOyente(this.camera, this.direccionMirada);
    const jugando = this.estado === PARTIDA.JUGANDO;
    this.audio.espacio.ponerZona(jugando ? zonaDeEco(this.house, this.player.position) : 'afuera');
    const p = this.player.position;
    // La música: cuenta lo que pasa (calma, alguien cerca, te buscan, te persiguen)
    const afuera = !this.jugadorAdentro;
    this.musica.update({
      modo: jugando ? 'juego' : this.estado === PARTIDA.MENU ? 'menu' : 'silencio',
      peligro: this.cercania,
      persiguiendo: jugando && alerta,
      // (te busca Don Ernesto; los perros solo cuentan si estás afuera, que es donde te pueden agarrar)
      buscando: jugando && (this.dueno.estado === ESTADO.INVESTIGAR || (afuera && this.perros.some((perro) => perro.estado === ESTADO.INVESTIGAR))),
    });
    this.ambiente.update(dt, {
      jugando,
      posicion: p,
      piso: pisoDeAltura(p.y),
      adentro: this.jugadorAdentro,
      turno: this.turno,
      tormenta: this.tormenta,
      corriente: this.corrienteActual,
      cercania: this.cercania,
      perseguido: jugando && alerta,
      corriendo: jugando && this.player.tipoDePaso === 'pasosCorriendo',
      escondido: this.player.escondido,
    });
  }

  // Probador de sonidos (solo mientras se programa): en la consola del navegador
  //   sonidos()                      -> la lista de efectos
  //   probarSonido('crujido')        -> suena "acá" (con el eco del lugar)
  //   probarSonido('pasoDueno', 'madera', { x: 3, y: 0, z: 0 })  -> suena en ese punto del mundo
  //   probarPasos()                  -> los pasos de Tomi en cada superficie, uno atrás del otro
  //   compararSonido('puerta')       -> el de código y, después, el grabado
  crearProbadorDeSonidos() {
    const audio = this.audio;
    window.sonidos = () => Object.getOwnPropertyNames(Object.getPrototypeOf(audio)).filter((n) => n !== 'constructor');
    window.probarSonido = (efecto, ...args) => {
      audio.iniciar();
      const ultimo = args[args.length - 1];
      if (ultimo && typeof ultimo === 'object' && 'x' in ultimo) {
        audio.desde(new THREE.Vector3(ultimo.x, ultimo.y, ultimo.z), efecto, ...args.slice(0, -1));
      } else {
        audio.enElMundo(efecto, ...args);
      }
    };
    // compararSonido('puerta') o compararSonido('paso', 'pasos', 'madera'): primero el de código, después el grabado
    window.compararSonido = (efecto, ...args) => {
      audio.iniciar();
      const antes = audio.estilo;
      audio.estilo = 'codigo';
      audio.enElMundo(efecto, ...args);
      setTimeout(() => {
        audio.estilo = 'grabado';
        audio.enElMundo(efecto, ...args);
        audio.estilo = antes;
      }, 1200);
      return 'código... y en 1,2 s el grabado';
    };
    window.probarPasos = (tipo = 'pasos') => {
      audio.iniciar();
      const superficies = ['madera', 'escalon', 'alfombra', 'ceramica', 'baldosas', 'chapa', 'pasto', 'piedra'];
      superficies.forEach((s, i) => {
        for (let j = 0; j < 4; j++) setTimeout(() => audio.enElMundo('paso', tipo, s), i * 2000 + j * 400);
      });
      return superficies.join(' → ');
    };
  }

  // De 1 (al lado de la cámara) a 0 (a 15 m o más)
  volumenPorDistancia(posicion) {
    const distancia = this.camera.position.distanceTo(posicion);
    return THREE.MathUtils.clamp(1 - distancia / 15, 0, 1);
  }

  // Genera un ruido. fuente: el enemigo que lo hizo (o null si fue el jugador).
  // (Si alguien lo escucha, no se avisa con texto: se nota en la música y en sus pasos, ver Musica.js)
  hacerRuido(posicion, radio, fuente = null) {
    this.ruido.hacerRuido(posicion, radio, fuente);
  }

  // ------------------------------------------------------------
  //  PANTALLAS Y TECLADO
  // ------------------------------------------------------------
  // Cómo se pasa de una pantalla a otra:
  //  - "¡A jugar!" / "Reiniciar": partida nueva y se bloquea el mouse.
  //    La primera vez, "¡A jugar!" muestra antes la intro (y después la pantalla "¡A recuperarlos!").
  //  - "Ver la historia": la intro, y de vuelta al menú.
  //  - Al bloquearse el mouse se empieza (o se sigue) jugando.
  //  - Esc: el navegador libera el mouse y aparece la pausa.
  //  - "Menú": vuelve al menú principal.
  configurarPantallas() {
    const controls = this.player.controls;

    controls.addEventListener('lock', () => {
      this.estado = PARTIDA.JUGANDO;
      this.ui.mostrarPantalla(null);
      this.ui.mostrarHUD(true);
    });

    controls.addEventListener('unlock', () => {
      // Si se liberó el mouse porque terminó la partida, no mostramos la pausa
      if (this.estado === PARTIDA.JUGANDO) {
        this.estado = PARTIDA.PAUSA;
        this.ui.mostrarPantalla('pausa');
        this.ui.mostrarRuido(0);
      }
    });

    // Desde el menú se juega con el turno que se ve de fondo; desde la pausa o el final ("Reiniciar",
    // "Jugar de nuevo") se vuelve a sortear (si se eligió "al azar")
    const partidaNueva = () => {
      this.audio.iniciar(); // el audio solo puede arrancar después de un click
      if (this.estado === PARTIDA.MENU) this.salirDelMenu();
      else this.ponerTurno(sortearTurno(this.eleccionTurno));
      this.reiniciar();
      controls.lock();
    };

    // La intro termina en la pantalla "¡A recuperarlos!" (con los juguetes de esta partida): el mouse
    // se bloquea recién con el click en "¡Vamos!" (el navegador no deja hacerlo sin un click)
    const conIntro = () => {
      this.audio.iniciar();
      this.salirDelMenu();
      this.reiniciar();
      this.verIntro(() => {
        this.estado = PARTIDA.LISTO;
        this.ui.mostrarListo(this.items.objetivos, this.datosTurno);
      });
    };

    this.ui.conectarBotones({
      jugar: () => (this.vioLaIntro ? partidaNueva() : conIntro()),
      historia: () => {
        this.audio.iniciar();
        this.salirDelMenu();
        this.verIntro(() => this.entrarAlMenu());
      },
      reiniciar: partidaNueva,
      continuar: () => controls.lock(),
      menu: () => {
        this.reiniciar();
        this.ponerTurno(sortearTurno(this.eleccionTurno));
        this.entrarAlMenu();
      },
      ayuda: () => this.ui.mostrarPantalla('ayuda'),
      volverAlMenu: () => this.ui.mostrarPantalla('menu'),
    });

    // Elegir el turno en el menú: el fondo cambia en el momento (y se recuerda para la próxima vez)
    this.ui.conectarTurno((eleccion) => {
      this.eleccionTurno = eleccion;
      guardarEleccionTurno(eleccion);
      this.ui.marcarTurno(eleccion);
      this.ponerTurno(sortearTurno(eleccion));
      if (this.estado === PARTIDA.MENU) this.escenas.prepararMenu(this.turno === 'noche');
    });

    // Sonidos grabados o hechos con código (se recuerda). Para comparar, suenan unos pasos y una puerta
    this.ui.conectarEstiloSonido((estilo) => {
      this.audio.iniciar();
      this.audio.estilo = estilo;
      guardar('estiloSonido', estilo);
      this.ui.marcarEstiloSonido(estilo);
      ['madera', 'madera', 'ceramica', 'ceramica'].forEach((s, i) => setTimeout(() => this.audio.enElMundo('paso', 'pasos', s), i * 380));
      setTimeout(() => this.audio.enElMundo('puerta'), 1700);
    });
  }

  configurarTeclado() {
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'Space' || e.code === 'Enter') && this.estado === PARTIDA.CINE && !e.repeat) this.cinematica.saltear();
      if (e.code === 'KeyE' && this.estado === PARTIDA.JUGANDO) this.interactuar();
      if (e.code === 'KeyT' && this.estado === PARTIDA.JUGANDO) this.pedirPista();
      if (e.code === 'KeyF' && this.estado === PARTIDA.JUGANDO) this.alternarLinterna();
      if (e.code === 'KeyM') this.ui.mostrarSilencio(this.audio.alternarSilencio());
      if (e.code === 'KeyB') this.conBordes = !this.conBordes; // bordes de dibujo animado sí/no
    });
  }

  // Deja todo listo para una partida nueva
  reiniciar() {
    if (this.player.escondido) this.salirDelEscondite();
    this.player.olor = 0;
    this.house.reiniciar();
    this.entradas.reiniciar();
    this.ruido.limpiar();
    this.efectos.limpiar();
    this.player.setPosition(INICIO_JUGADOR.x, INICIO_JUGADOR.y, INICIO_JUGADOR.z);
    this.camera.rotation.set(0, 0, 0); // mirando hacia adentro de la casa
    this.items.sortearObjetivos();
    this.walkie.reiniciar(this.items.objetivos);
    // Las habilidades se reparten donde no haya un juguete
    this.habilidades.reiniciar(this.items.objetivos.map((o) => o.ubicacion));
    this.aplicarHabilidades();
    this.zonaEscape.activar(false);
    this.estabaEnLaZona = false;
    for (const enemigo of this.enemigos) enemigo.reiniciar();

    this.tiempoPartida = 0;
    this.proximoRelampago = 6 + Math.random() * 6;
    this.corte.reiniciar(); // (la luz siempre vuelve al empezar otra partida)
    this.ponerCorriente(1);
    this.esperaDueno = 0;
    this.linterna.prender(false);
    this.ui.mostrarLinterna(false);

    this.ui.ocultarCosasDelJuego();
    this.ui.mostrarBotin(this.items.objetivos, this.walkie);
    this.ui.actualizarHUD(0);
  }

  // ------------------------------------------------------------
  //  CINEMÁTICAS (ver Cinematica.js y Escenas.js)
  // ------------------------------------------------------------
  // Reproduce una cinemática y al terminar (o al saltearla) llama a "despues".
  // Mientras dura, el juego está quieto: los enemigos se esconden (los reemplazan los actores).
  verCinematica(tomas, despues) {
    this.estado = PARTIDA.CINE;
    // El botón que se tocó queda "con foco": sin esto, el Espacio para saltear también lo apretaría
    document.activeElement?.blur();
    this.ui.mostrarPantalla(null);
    this.ui.mostrarHUD(false);
    this.ui.ocultarCosasDelJuego();
    for (const enemigo of this.enemigos) enemigo.modelo.visible = false;
    this.zonaEscape.prepararCinematica();
    this.actualizarLuces(1); // (de golpe: puede venir del sótano)
    this.cinematica.reproducir(tomas, () => {
      this.escenas.limpiar();
      for (const enemigo of this.enemigos) enemigo.modelo.visible = true;
      this.player.teclas = {}; // (Espacio para saltear no tiene que contar como salto)
      despues();
    });
  }

  // La intro: la primera vez que se juega, o con "Ver la historia" (usa los juguetes ya sorteados)
  verIntro(despues) {
    this.vioLaIntro = true;
    this.verCinematica(this.escenas.intro(this.items.objetivos, this.turno), () => {
      // La cámara vuelve a los ojos de Tomi, mirando la casa (se ve detrás de la pantalla que venga)
      this.player.actualizarCamara();
      this.camera.rotation.set(0, 0, 0);
      despues();
    });
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
    this.efectos.update(dt, this.camera);
    this.zonaEscape.update(dt);
    this.decoracion.update(dt, this.camera);
    this.actualizarLuces(dt);

    this.actualizarRelampago(dt);
    this.actualizarLinternas();
    this.atmosfera.update(dt, this.camera, this.linterna);
    this.actualizarPantalla(dt);
    // Los oídos, el eco del lugar y el ambiente (con la alerta del frame anterior, para el corazón)
    this.actualizarSonido(dt, this.alertaAnterior);
    // La lluvia se escucha más sorda adentro (y casi nada en el sótano)
    const enElSotano = this.jugadorAdentro && pisoDeAltura(this.player.position.y) === -1;
    this.audio.lluvia(this.tormenta ? (enElSotano ? 0.4 : 1) : 0, this.jugadorAdentro);
    if (this.estado === PARTIDA.MENU) this.actualizarMenu(dt);

    if (this.estado === PARTIDA.CINE) {
      this.cinematica.update(dt);
      this.house.update(dt); // (la puerta de calle se abre y se cierra en las cinemáticas)
    }

    if (this.estado === PARTIDA.JUGANDO) {
      this.tiempoPartida += dt;
      this.actualizarTormenta(dt);
      this.actualizarCorte(dt);

      this.house.update(dt);
      this.entradas.update(dt);
      this.forzarSiMantieneE(dt);
      for (const tipo of this.habilidades.update(dt, this.camera)) this.alTerminarHabilidad(tipo);
      this.aplicarHabilidades();
      this.actualizarOlor(dt);
      this.walkie.update(dt);
      this.player.update(dt);
      this.actualizarVision();
      for (const enemigo of this.enemigos) enemigo.update(dt);
      this.ruido.update(dt);
    }

    // (Si un enemigo te atrapó en su update, la partida ya terminó: por eso preguntamos de nuevo)
    if (this.estado === PARTIDA.JUGANDO) {
      // Si algún enemigo te está cazando (o Doña Pocha te apunta): música tensa y borde rojo
      const alerta = this.enemigos.some((enemigo) => enemigo.estaAlerta);
      this.alertaAnterior = alerta;
      this.ui.mostrarAlertaPersecucion(alerta);
      this.ui.mostrarApuntado(this.abuela.estado === ESTADO_ABUELA.APUNTAR);
      this.ui.mostrarRed(this.player.enRed);
      this.actualizarAyuda();
      this.ui.mostrarFundido(this.player.oscuridad); // (negro mientras atravesás una pared trepando)
      this.ui.actualizarHUD(this.tiempoPartida);
      this.ui.mostrarHabilidades([...this.habilidades.paraElHUD, ...this.olorParaElHUD()]);
      this.ui.mostrarWalkie(this.walkie.textoVisible);
      this.ui.mostrarEsperaPista(this.walkie.esperaPista);
      this.ui.mostrarOlor(this.player.olor / ESCONDITES.tacho.olor);
      const paso = this.player.tipoDePaso;
      const enConducto = this.house.enConducto(this.player.position);
      const conBotas = this.player.pasosSilenciosos;
      const radio = paso && !conBotas ? RADIO_RUIDO[enConducto ? 'conducto' : paso] : 0;
      this.ui.mostrarRuido(radio, this.player.agachado, enConducto, conBotas);

      // ¿Te atrapó alguien?
      const atrapo = this.enemigos.find((enemigo) => enemigo.atrapoAlJugador());
      if (atrapo) this.perder(atrapo);
      else this.revisarZonaDeEscape();
    }

    // Sombras: se recalculan 20 veces por segundo en vez de 60 (no se nota y ahorra mucho)
    this.numeroDeFrame++;
    if (this.numeroDeFrame % 3 === 0) this.renderer.shadowMap.needsUpdate = true;

    // Dibujamos con bordes (o sin, si se apagaron con B)
    const dibujante = this.conBordes ? this.efectoBordes : this.renderer;
    dibujante.render(this.scene, this.camera);
  }

  // Tomi recuperó uno de sus juguetes: va a la mochila
  agarrarObjeto(objetivo) {
    this.items.agarrar(objetivo);
    this.efectos.agarrar(objetivo.malla, '#ffd23f'); // vuela hacia la mochila con un destello dorado
    this.audio.guardar();
    this.ui.mostrarBotin(this.items.objetivos, this.walkie);
    this.ui.resaltarBotin(); // (se tilda en la lista, que late un instante)
    if (this.items.todosEncontrados) {
      // ¡Los tres! Fanfarria y se prende la zona de escape
      this.zonaEscape.activar(true);
      this.audio.todoListo();
    }
  }

  // ------------------------------------------------------------
  //  WALKIE (ver Walkie.js)
  // ------------------------------------------------------------
  // T: le pedís a Facu una pista más precisa. Si todavía está mirando, avisa cuánto falta.
  // Si habla, el walkie hace "kshhh": un ruidito que escuchan los enemigos que estén muy cerca.
  pedirPista() {
    const respuesta = this.walkie.pedirPista();
    if (respuesta.esperar) {
      this.audio.negar(); // (todavía no: en el HUD se ve cuánto falta)
      return;
    }
    this.hacerRuido(this.player.position.clone(), RADIO_RUIDO_WALKIE);
  }

  // ------------------------------------------------------------
  //  HABILIDADES (ver Habilidades.js)
  // ------------------------------------------------------------
  // Agarraste una: se activa en el momento
  usarHabilidad(habilidad) {
    const { tipo } = habilidad;
    this.habilidades.agarrar(habilidad);
    this.efectos.agarrar(habilidad.malla, HABILIDADES[tipo].color);
    this.audio.habilidad(tipo);

    // (Qué hace cada una se ve en el HUD: su ícono con el tiempo que le queda)
    if (tipo === 'zanahoria') this.habilidades.revelar(this.items.objetivos);
    this.aplicarHabilidades();
  }

  // Se terminó el efecto de una habilidad
  alTerminarHabilidad() {
    this.audio.finHabilidad();
  }

  // Le pasa al jugador los efectos de las habilidades activas
  aplicarHabilidades() {
    this.player.multiplicadorVelocidad = this.habilidades.estaActiva('bebida') ? MULTIPLICADOR_BEBIDA : 1;
    this.player.pasosSilenciosos = this.habilidades.estaActiva('botas');
  }

  // ¿El jugador llegó a la zona de escape (donde lo espera Facu)?
  revisarZonaDeEscape() {
    const adentro = this.zonaEscape.contiene(this.player.position);
    if (adentro && this.items.todosEncontrados) {
      this.ganar();
    } else if (adentro && !this.estabaEnLaZona) {
      // Llegó antes de tiempo: un "no" y la lista de juguetes late (una vez, al entrar)
      this.audio.negar();
      this.ui.resaltarBotin();
    }
    this.estabaEnLaZona = adentro;
  }

  // Tomi volvió con Facu y los tres juguetes: cinemática (se van en bici) y la pantalla de victoria
  ganar() {
    this.estado = PARTIDA.CINE; // primero el estado, así "unlock" no muestra la pausa
    this.player.controls.unlock();
    this.audio.todoListo();
    this.verCinematica(this.escenas.victoria(), () => {
      this.estado = PARTIDA.VICTORIA;
      this.audio.victoria();
      const nombres = this.items.objetivos.map((o) => o.objeto.nombre);
      this.ui.mostrarVictoria(nombres, this.tiempoPartida);
    });
  }

  // Te atrapó un enemigo: cada uno tiene su cinemática y su frase.
  // Don Ernesto te saca de la oreja (y lo que dice depende de cómo te agarró); un perro te deja sin bermuda.
  perder(enemigo) {
    let texto = null; // (null = una frase de Don Ernesto al azar, ver UI.mostrarDerrota)
    let frase = '¡A tu casa, atrevido! ¡Meterse en la casa ajena!'; // (la que dice en la cinemática)
    let escena;
    if (enemigo === this.dueno && this.dueno.encontroAlJugador) {
      texto = '¡Don Ernesto te encontró escondido! "¿Jugando a las escondidas en MI casa?"';
      frase = '¿Jugando a las escondidas en MI casa? ¡Afuera!';
    } else if (enemigo === this.dueno && this.player.enRed > 0) {
      texto = 'Don Ernesto te encontró enredado en la red de Doña Pocha. "¡Qué buena pesca, vieja!"';
      frase = '¡Qué buena pesca, vieja! Y ahora... ¡afuera!';
    }
    if (this.perros.includes(enemigo)) {
      texto = `${enemigo.v.nombre} te mordió el pantalón y no lo suelta. Te fuiste en calzoncillos.`;
      this.audio.ladrido(1);
      escena = this.escenas.derrotaPerro(enemigo.v.nombre);
    } else {
      this.audio.alerta();
      escena = this.escenas.derrotaDueno(frase);
    }
    this.estado = PARTIDA.CINE;
    this.player.controls.unlock();
    this.verCinematica(escena, () => {
      this.estado = PARTIDA.DERROTA;
      this.audio.derrota();
      this.ui.mostrarDerrota(texto, this.tiempoPartida);
    });
  }

  // ------------------------------------------------------------
  //  INTERACCIÓN (tecla E)
  // ------------------------------------------------------------
  // La puerta que el jugador tiene adelante (o null)
  puertaAlFrente() {
    this.camera.getWorldDirection(this.direccionMirada);
    return this.house.puertaCercana(this.player.position, this.direccionMirada);
  }

  // Prioridad: salir del escondite > agarrar un objeto > habilidad > entradas > esconderse > puerta
  interactuar() {
    if (this.player.animacion || this.player.enRed > 0) return; // trepando o enredado no se puede hacer nada

    if (this.player.escondido) {
      this.salirDelEscondite();
      return;
    }

    const objetivo = this.items.objetivoMirado(this.camera);
    if (objetivo) {
      this.agarrarObjeto(objetivo);
      return;
    }

    const habilidad = this.habilidades.mirada(this.camera);
    if (habilidad) {
      this.usarHabilidad(habilidad);
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

    if (this.corte.mirado(this.camera)) {
      this.usarTablero();
      return;
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

    // Abrir o cerrar una puerta suena y hace ruido (una rejilla, menos; el estante secreto rechina)
    if (puerta.alternar()) {
      const chiquita = puerta.estilo === 'rejilla' || puerta.estilo === 'tabla';
      this.audio.enElMundo(chiquita ? 'rejilla' : puerta.secreta ? 'estante' : 'puerta');
      this.hacerRuido(puerta.centro.clone().setY(this.player.position.y), RADIO_RUIDO[chiquita ? 'rejilla' : 'puerta']);
    }
  }

  // Mientras se mantiene E mirando el portón del garaje, se lo va forzando
  forzarSiMantieneE(dt) {
    if (!this.player.teclas['KeyE'] || this.player.escondido || this.player.animacion) return;
    const entrada = this.entradas.mirada(this.camera);
    if (!entrada || !entrada.seMantiene) return;
    for (const resultado of entrada.forzar(dt)) this.aplicarResultado(resultado);
  }

  // Las entradas devuelven "qué pasó"; acá lo convertimos en sonido, ruido y animación
  aplicarResultado({ sonido, ruido, animacion, llave, hollin }) {
    if (sonido) this.audio.enElMundo(sonido);
    if (ruido) this.hacerRuido(ruido.posicion, ruido.radio);
    if (animacion) this.player.moverAnimado(animacion);
    if (llave) this.house.puertaDeCalle.conLlave = false;
    if (hollin) {
      // Caíste por la chimenea: la pantalla se llena de hollín y sale una nube gris del hogar
      this.ui.mostrarHollin();
      this.efectos.destello(this.player.position.clone().setY(this.player.position.y + 0.5), '#3d3d3d');
    }
  }

  // Cada tipo de escondite suena distinto al entrar y al salir (ver Escondites.js)
  esconderse(escondite) {
    this.player.esconderse(escondite);
    this.dueno.alEsconderseElJugador(escondite);
    this.ui.mostrarEscondite(escondite.escondite);
    this.audio.enElMundo(ESCONDITES[escondite.escondite].sonido, 0.4);
  }

  salirDelEscondite() {
    const tipo = ESCONDITES[this.player.escondite.escondite];
    this.player.salirDelEscondite();
    this.ui.mostrarEscondite(null);
    this.audio.enElMundo(tipo.sonido, 0.4);
    if (tipo.olor) {
      // Saliste del tacho de basura: un rato oliendo mal (los perros te huelen de lejos, ver Perro.js)
      this.player.olor = tipo.olor; // (se ve: la pantalla se pone verdosa y aparece en el HUD)
    }
  }

  // El olor a basura se va yendo solo
  actualizarOlor(dt) {
    if (this.player.olor <= 0) return;
    this.player.olor = Math.max(0, this.player.olor - dt);
  }

  // El olor se muestra en el HUD como si fuera una habilidad (una "habilidad" bastante mala)
  olorParaElHUD() {
    if (this.player.olor <= 0) return [];
    const total = ESCONDITES.tacho.olor;
    return [{ tipo: 'olor', icono: '🤢', nombre: 'Olor a basura', color: '#90a955', restante: this.player.olor, fraccion: this.player.olor / total }];
  }

  // Cartel de ayuda abajo de la mira
  actualizarAyuda() {
    if (this.player.animacion) {
      this.ui.mostrarAyuda(null);
      return;
    }

    if (this.player.enRed > 0) {
      this.ui.mostrarAyuda(`🕸️ ¡Enredado! Forcejeando... (${Math.ceil(this.player.enRed)} s)`);
      return;
    }

    if (this.player.escondido) {
      const { donde } = ESCONDITES[this.player.escondite.escondite];
      this.ui.mostrarAyuda(`Escondido ${donde}... [E] Salir`);
      return;
    }

    const objetivo = this.items.objetivoMirado(this.camera);
    if (objetivo) {
      this.ui.mostrarAyuda(`[E] Agarrar ${objetivo.objeto.nombre}`);
      return;
    }

    const habilidad = this.habilidades.mirada(this.camera);
    if (habilidad) {
      this.ui.mostrarAyuda(HABILIDADES[habilidad.tipo].ayuda);
      return;
    }

    const entrada = this.entradas.mirada(this.camera);
    if (entrada) {
      this.ui.mostrarAyuda(entrada.ayuda(this.player));
      return;
    }

    if (this.corte.mirado(this.camera)) {
      if (this.turno !== 'noche') this.ui.mostrarAyuda('Tablero de luz (de día, cortar la luz no cambia nada)');
      else this.ui.mostrarAyuda(this.corte.cortada ? '[E] Volver a subir la llave de la luz' : '[E] Bajar la llave: cortar la luz de toda la casa (hace ruido)');
      return;
    }

    const escondite = this.house.esconditeMirado(this.camera);
    if (escondite) {
      this.ui.mostrarAyuda(ESCONDITES[escondite.escondite].ayuda);
      return;
    }

    const puerta = this.puertaAlFrente();
    if (!puerta) {
      this.ui.mostrarAyuda(null);
    } else if (puerta.conLlave) {
      this.ui.mostrarAyuda('Cerrada con llave. ¿Habrá una llave de repuesto escondida por acá?');
    } else if (puerta.trabada) {
      this.ui.mostrarAyuda(`🔒 Trabada por Don Ernesto (${Math.ceil(puerta.tiempoTrabada)} s)`);
    } else if (puerta.estilo === 'rejilla') {
      this.ui.mostrarAyuda(puerta.abierta ? '[E] Cerrar la rejilla' : '[E] Abrir la rejilla del conducto (entrá agachado)');
    } else if (puerta.estilo === 'tabla') {
      this.ui.mostrarAyuda(puerta.abierta ? '[E] Volver a poner la tabla' : '[E] Correr la tabla floja');
    } else if (puerta.secreta) {
      this.ui.mostrarAyuda(puerta.abierta ? '[E] Cerrar el pasadizo' : '[E] Hay un libro rojo que sobresale... ¿tirar de él?');
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

// Lo que se elige en el menú (el turno, el estilo de los sonidos) se recuerda en el navegador.
// Si no se puede (navegador en modo privado, por ejemplo), se usa el valor de siempre.
function leerGuardado(clave, opciones, siNoHay) {
  try {
    const guardado = localStorage.getItem(clave);
    return opciones.includes(guardado) ? guardado : siNoHay;
  } catch {
    return siNoHay;
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // (sin guardar: la próxima vez arranca con el valor de siempre)
  }
}

function leerEleccionTurno() {
  return leerGuardado('turno', ['azar', 'dia', 'noche'], 'azar');
}

function guardarEleccionTurno(eleccion) {
  guardar('turno', eleccion);
}
