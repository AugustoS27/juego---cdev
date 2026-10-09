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
import { ponerContraste } from './Materials.js';
import { juntarMallasEstaticas } from './Optimizar.js';
import { Decoracion } from './Decoracion.js';
import { ALTURA_PISO, INICIO_JUGADOR, TECHO, PISO_MINIMO, NOMBRES_PISOS, ZONA_PATIO, pisoDeAltura } from './HouseData.js';

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
    this.habilidades = new Habilidades(this.scene, this.house);
    this.efectos = new Efectos(this.scene); // lo que vuela hacia la cámara al agarrar algo
    this.zonaEscape = new ZonaDeEscape(this.scene, this.house);
    this.decoracion = new Decoracion(this.scene, this.house);
    // Etapa 16B: las lámparas que alumbran de verdad y la atmósfera (luz de las ventanas, lluvia, polvo)
    this.lamparas = new Lamparas(this.scene, this.decoracion.lamparas);
    this.atmosfera = new Atmosfera(this.scene);
    // Los enemigos: el dueño (toda la casa), dos perros (el patio) y la abuela (su piso)
    this.dueno = new Dueno(this.scene, this.house, this.player);
    this.perros = PERROS.map((datos) => new Perro(this.scene, this.house, this.player, datos));
    this.abuela = new Abuela(this.scene, this.house, this.player);
    this.enemigos = [this.dueno, ...this.perros, this.abuela];
    this.ruido = new SistemaDeRuido(this.scene, this.enemigos);
    this.audio = new Audio();
    this.ui = new UI();
    this.walkie = new Walkie(); // Facu, por radio (pistas y comentarios)
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
    if (this.turno !== 'noche') {
      this.ui.mostrarAviso('☀️ Es de día: la linterna no hace falta', 1.5);
      return;
    }
    this.linterna.prender(!this.linterna.prendida);
    this.audio.linterna();
    this.ui.mostrarLinterna(this.linterna.prendida);
  }

  // De noche los enemigos ven menos lejos... salvo que tengas la linterna prendida (ven el haz)
  actualizarVision() {
    const { vision } = this.datosTurno;
    for (const enemigo of this.enemigos) {
      if (this.perros.includes(enemigo)) enemigo.multiplicadorVision = vision.perros;
      else enemigo.multiplicadorVision = this.linterna.prendida ? vision.conLinterna : vision.sinLinterna;
    }
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
  //  y acá decidimos qué sonido, ruido o aviso corresponde.
  // ------------------------------------------------------------
  conectarEventos() {
    // Cada paso del jugador suena y hace ruido según cómo se mueve
    // (agachado casi nada, caminando un poco, corriendo mucho: ver RADIO_RUIDO en Noise.js).
    // Adentro de un conducto de ventilación, cualquier paso suena a chapa.
    // Con las botas de lana puestas, los pasos no hacen ruido (ni corriendo, ni en la chapa).
    this.player.alDarPaso = (tipo) => {
      if (this.player.pasosSilenciosos) {
        this.audio.paso('lana');
        return;
      }
      if (this.house.enConducto(this.player.position)) tipo = 'conducto';
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

    // Algunas animaciones de las entradas traen algo que pasa al llegar (ej: el ¡PUF! de la chimenea)
    this.player.alTerminarAnimacion = (resultado) => this.aplicarResultado(resultado);

    // Pasos y puertas del dueño y la abuela: suenan más fuerte cuanto más cerca están
    this.dueno.alDarPaso = () => this.audio.pasoDueno(this.volumenPorDistancia(this.dueno.position));
    this.abuela.alDarPaso = () => this.audio.pasoDueno(0.4 * this.volumenPorDistancia(this.abuela.position));
    for (const enemigo of [this.dueno, this.abuela]) {
      enemigo.alAbrirPuerta = (puerta) => this.audio.puerta(this.volumenPorDistancia(puerta.centro));
    }

    // Goteras del sótano: "plic" (solo si estás en el sótano, y más fuerte cuanto más cerca)
    this.decoracion.alCaerGota = (posicion) => {
      if (this.estado !== PARTIDA.JUGANDO || pisoDeAltura(this.player.position.y) !== -1) return;
      this.audio.gota(this.volumenPorDistancia(posicion));
    };

    // El dueño trabó una puerta
    this.dueno.alTrabarPuerta = (puerta) => {
      this.audio.traba(Math.max(0.3, this.volumenPorDistancia(puerta.centro)));
      const donde = NOMBRES_PISOS[puerta.piso].toLowerCase();
      this.ui.mostrarAviso(`🔒 ¡Don Ernesto trabó una puerta (${donde})! Se destraba en 20 s`, 4);
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
        this.audio.alerta();
        this.ui.mostrarAviso('❗ ¡TE VIO! ¡Corré o escondete!', 2);
        this.walkie.comentar('persecucion', {}, true);
      } else if (nuevo === ESTADO.INVESTIGAR && anterior === ESTADO.PATRULLA) {
        this.audio.duda();
      }
    };

    // Perros: cada ladrido suena y es un ruido que alerta a los demás (sobre todo al dueño)
    for (const perro of this.perros) {
      perro.alLadrar = () => {
        this.audio.ladrido(this.volumenPorDistancia(perro.position));
        this.hacerRuido(perro.position, RADIO_RUIDO.ladrido, perro);
      };
      perro.alCambiarEstado = (nuevo) => {
        if (this.estado === PARTIDA.JUGANDO && nuevo === ESTADO.PERSEGUIR) {
          this.ui.mostrarAviso(`🐕 ¡${perro.v.nombre} te vio! Metete en la casa o subite a algo alto`, 3);
          this.walkie.comentar('perros', {}, true);
        }
      };
      perro.alAburrirse = () => this.ui.mostrarAviso(`🥱 ${perro.v.nombre} se aburrió de ladrarte y vuelve a la cucha`, 3);
    }

    // Doña Pocha: "clic" al apuntar, ¡FUAP! al disparar la red (hace ruido) y ruiditos al recargar
    this.abuela.alApuntar = () => {
      this.audio.clic(Math.max(0.5, this.volumenPorDistancia(this.abuela.position)));
      this.ui.mostrarAviso('🎯 ¡Doña Pocha te apunta con el lanzarredes! ¡Cubrite o corré de costado!', 2);
      this.walkie.comentar('abuela', {}, true);
    };
    this.abuela.alDisparar = () => {
      this.audio.fuap(Math.max(0.4, this.volumenPorDistancia(this.abuela.position)));
      this.ui.mostrarFuap();
      // El ruido sale de donde te vio (a la altura de tus pies): el dueño va a ir a ver ahí
      this.hacerRuido(this.abuela.ultimaPosicionVista, RADIO_RUIDO.red, this.abuela);
    };
    this.abuela.alErrar = () => {
      if (this.player.enRed <= 0) this.ui.mostrarAviso('💨 ¡La red no te agarró! Tarda en recargar: ¡aprovechá!', 2.5);
    };
    // La red te enredó: 3 s sin moverte, y Doña Pocha grita "¡ERNESTOOO!" (un ruido grande donde estás)
    this.abuela.alAtrapar = () => {
      this.player.atraparEnRed();
      this.audio.enredado();
      this.audio.gritoPocha(Math.max(0.5, this.volumenPorDistancia(this.abuela.position)));
      this.ui.mostrarAviso('🕸️ ¡Te enredó la red! Quedás atrapado 3 segundos... ¡y Doña Pocha llama a Don Ernesto!', 3);
      this.walkie.comentar('red', {}, true);
      this.hacerRuido(this.player.position.clone(), RADIO_RUIDO.grito, this.abuela);
    };
    this.player.alSoltarseDeLaRed = () => {
      this.abuela.redes.dejarEnElPiso(this.player.position);
      this.ui.mostrarAviso('💪 ¡Te soltaste! Rajá de ahí', 2);
    };
    this.abuela.alRecargar = () => this.audio.recarga(this.volumenPorDistancia(this.abuela.position));
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
    // Las lámparas: las luces se mudan a las más cercanas (ver Lamparas.js)
    this.lamparas.actualizar(dt, p, piso);
    this.solInterior.intensity += (objetivo.sol - this.solInterior.intensity) * t;
    this.luzRelleno.intensity += (objetivo.relleno - this.luzRelleno.intensity) * t;
    this.luzCielo.intensity += (objetivo.cielo - this.luzCielo.intensity) * t;
    this.luzAmbiente.intensity += (objetivo.ambiente - this.luzAmbiente.intensity) * t;
  }

  // ¿El punto está en el patio de los perros? (con un poco de margen: los perros no llegan al borde)
  enElPatio({ x, z }) {
    return ZONA_PATIO.some(([x1, z1, x2, z2]) => x > x1 - 0.5 && x < x2 + 0.5 && z > z1 - 0.5 && z < z2 + 0.5);
  }

  // De 1 (al lado de la cámara) a 0 (a 15 m o más)
  volumenPorDistancia(posicion) {
    const distancia = this.camera.position.distanceTo(posicion);
    return THREE.MathUtils.clamp(1 - distancia / 15, 0, 1);
  }

  // Genera un ruido. fuente: el enemigo que lo hizo (o null si fue el jugador).
  // Si el dueño o los perros lo escuchan, avisamos (como mucho cada 3 segundos)
  hacerRuido(posicion, radio, fuente = null) {
    const oyeron = this.ruido.hacerRuido(posicion, radio, fuente);
    if (this.tiempoDesdeAvisoRuido <= 3 || this.estado !== PARTIDA.JUGANDO) return;
    let aviso = null;
    if (oyeron.includes(this.dueno)) {
      if (fuente === this.abuela && radio === RADIO_RUIDO.grito) aviso = '📢 "¡ERNESTOOO, LO AGARRÉ!" Don Ernesto viene para acá...';
      else if (fuente === this.abuela) aviso = '🕸️ ¡El FUAP del lanzarredes alertó a Don Ernesto! Viene a ver...';
      else if (fuente) aviso = '🐕 ¡Los ladridos alertaron a Don Ernesto! Viene a ver...';
      else aviso = '👂 Don Ernesto escuchó algo y viene a ver...';
    } else if (!fuente && this.perros.some((perro) => oyeron.includes(perro))) {
      aviso = '🐕 Los perros escucharon algo... ¡andá agachado por el patio!';
    }
    if (aviso) {
      this.ui.mostrarAviso(aviso, 2.5);
      this.tiempoDesdeAvisoRuido = 0;
    }
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
      if (this.tiempoPartida === 0) {
        this.ui.mostrarAviso('🏠 Estás afuera. Buscá una forma de entrar... ¡hay varias!', 4);
        if (this.turno === 'noche') this.ui.mostrarAviso('🌙 Es de noche. [F] prende la linterna... pero con la luz te ven desde más lejos', 6);
      }
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
    this.pasadizoEncontrado = false;
    this.items.sortearObjetivos();
    this.walkie.reiniciar(this.items.objetivos);
    this.yaEntroALaCasa = false; // (para que Facu lo comente una vez)
    // Las habilidades se reparten donde no haya un juguete
    this.habilidades.reiniciar(this.items.objetivos.map((o) => o.ubicacion));
    this.aplicarHabilidades();
    this.zonaEscape.activar(false);
    this.estabaEnLaZona = false;
    for (const enemigo of this.enemigos) enemigo.reiniciar();

    this.tiempoPartida = 0;
    this.nivelEnojo = 0;
    this.tiempoParaEnojo = SEGUNDOS_POR_NIVEL;
    this.proximoRelampago = 6 + Math.random() * 6;
    this.linterna.prender(false);
    this.ui.mostrarLinterna(false);

    this.ui.ocultarCosasDelJuego();
    this.ui.mostrarBotin(this.items.objetivos, this.walkie);
    this.ui.actualizarHUD(0, 0);
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
      this.tiempoDesdeAvisoRuido += dt;
      this.actualizarDificultad(dt);
      this.actualizarTormenta(dt);

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
      this.audio.actualizarMusica(dt, alerta);
      this.ui.mostrarAlertaPersecucion(alerta);
      this.ui.mostrarApuntado(this.abuela.estado === ESTADO_ABUELA.APUNTAR);
      this.ui.mostrarRed(this.player.enRed);
      this.actualizarAyuda();
      this.comentarSiEntro();
      this.ui.mostrarFundido(this.player.oscuridad); // (negro mientras atravesás una pared trepando)
      this.ui.actualizarHUD(this.tiempoPartida, this.nivelEnojo);
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

  // Tensión creciente: cada SEGUNDOS_POR_NIVEL el dueño camina más rápido
  actualizarDificultad(dt) {
    if (this.nivelEnojo >= NIVEL_MAXIMO_ENOJO) return;
    this.tiempoParaEnojo -= dt;
    if (this.tiempoParaEnojo > 0) return;

    this.tiempoParaEnojo = SEGUNDOS_POR_NIVEL;
    this.nivelEnojo++;
    this.dueno.multiplicadorVelocidad = 1 + this.nivelEnojo * AUMENTO_POR_NIVEL;
    this.audio.enojo();
    this.ui.mostrarAviso(`😠 Don Ernesto está cada vez más enojado: ¡ahora camina más rápido! (nivel ${this.nivelEnojo})`, 3);
  }

  // Tomi recuperó uno de sus juguetes: va a la mochila
  agarrarObjeto(objetivo) {
    this.items.agarrar(objetivo);
    this.efectos.agarrar(objetivo.malla, '#ffd23f'); // vuela hacia la mochila con un destello dorado
    this.audio.guardar();
    this.ui.mostrarBotin(this.items.objetivos, this.walkie);
    this.walkie.alRecuperar(objetivo);

    const { nombre, icono } = objetivo.objeto;
    if (this.items.todosEncontrados) {
      // ¡Los tres! Se prende la zona de escape
      this.zonaEscape.activar(true);
      this.audio.todoListo();
      this.ui.mostrarAviso(`${icono} ¡Recuperaste ${nombre}! Ya tenés los tres: volvé a la entrada de autos, Facu te espera con las bicis 🚲`, 5);
    } else {
      const faltan = this.items.objetivos.length - this.items.cantidadEncontrados;
      this.ui.mostrarAviso(`${icono} ¡Recuperaste ${nombre}! Te ${faltan === 1 ? 'falta 1 juguete' : `faltan ${faltan} juguetes`}`, 2.5);
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
      this.ui.mostrarAviso(`📻 Facu está mirando con los binoculares... probá en ${respuesta.esperar} s`, 2);
      return;
    }
    this.hacerRuido(this.player.position.clone(), RADIO_RUIDO_WALKIE);
  }

  // Facu comenta cuando entrás a la casa por primera vez
  comentarSiEntro() {
    if (this.yaEntroALaCasa) return;
    const p = this.player.position;
    if (p.x > -15.5 && p.x < 9 && p.z > -6 && p.z < 6) {
      this.yaEntroALaCasa = true;
      this.walkie.comentar('entrar');
    }
  }

  // ------------------------------------------------------------
  //  HABILIDADES (ver Habilidades.js)
  // ------------------------------------------------------------
  // Agarraste una: se activa en el momento
  usarHabilidad(habilidad) {
    const { tipo } = habilidad;
    const { duracion } = HABILIDADES[tipo];
    this.habilidades.agarrar(habilidad);
    this.efectos.agarrar(habilidad.malla, HABILIDADES[tipo].color);
    this.audio.habilidad(tipo);

    if (tipo === 'zanahoria') {
      const revelado = this.habilidades.revelar(this.items.objetivos);
      this.ui.mostrarAviso(
        revelado
          ? `🥕 ¡Ñam! Durante ${duracion} s ves ${revelado.objeto.nombre} a través de las paredes (buscá el brillo naranja)`
          : '🥕 ¡Ñam! Rica, pero ya tenés todos tus juguetes',
        4,
      );
    } else if (tipo === 'botas') {
      this.ui.mostrarAviso(`🧦 Te pusiste las botas de lana: ${duracion} s de pasos silenciosos (¡hasta corriendo!)`, 3);
    } else if (tipo === 'bebida') {
      this.ui.mostrarAviso(`🥤 ¡Glup glup! Durante ${duracion} s vas un 50% más rápido`, 3);
    }
    this.aplicarHabilidades();
  }

  // Se terminó el efecto de una habilidad
  alTerminarHabilidad(tipo) {
    this.audio.finHabilidad();
    const avisos = {
      zanahoria: '🥕 Se terminó el efecto de la zanahoria',
      botas: '🧦 Se te salieron las botas de lana: ¡tus pasos vuelven a sonar!',
      bebida: '🥤 Se te pasó el efecto de la bebida: volvés a tu velocidad normal',
    };
    this.ui.mostrarAviso(avisos[tipo], 2.5);
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
      // Llegó antes de tiempo: avisamos una vez (al entrar), no en cada frame
      const faltan = this.items.objetivos.length - this.items.cantidadEncontrados;
      this.ui.mostrarAviso(`🚲 Facu: "¡Todavía no! Te ${faltan === 1 ? 'falta 1 juguete' : `faltan ${faltan} juguetes`}"`, 3);
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
      this.ui.mostrarVictoria(nombres, this.tiempoPartida, this.nivelEnojo);
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
      this.ui.mostrarDerrota(texto, this.tiempoPartida, this.nivelEnojo);
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
      if (chiquita) this.audio.rejilla();
      else if (puerta.secreta) this.audio.estante();
      else this.audio.puerta();
      if (puerta.secreta && puerta.abierta && !this.pasadizoEncontrado) {
        this.pasadizoEncontrado = true;
        this.ui.mostrarAviso('📚 ¡El estante giró! Hay un cuarto secreto detrás', 3);
      }
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

  // Las entradas devuelven "qué pasó"; acá lo convertimos en sonido, ruido, aviso y animación
  aplicarResultado({ sonido, aviso, ruido, animacion, llave, hollin }) {
    if (sonido) this.audio[sonido]?.();
    if (aviso) this.ui.mostrarAviso(aviso, 3);
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
    this.audio[ESCONDITES[escondite.escondite].sonido](0.4);
  }

  salirDelEscondite() {
    const tipo = ESCONDITES[this.player.escondite.escondite];
    this.player.salirDelEscondite();
    this.ui.mostrarEscondite(null);
    this.audio[tipo.sonido](0.4);
    if (tipo.olor) {
      // Saliste del tacho de basura: un rato oliendo mal (los perros te huelen de lejos, ver Perro.js)
      this.player.olor = tipo.olor;
      this.ui.mostrarAviso(`🤢 Salís oliendo a basura: durante ${tipo.olor} s los perros te huelen de lejos`, 3);
    }
  }

  // El olor a basura se va yendo solo
  actualizarOlor(dt) {
    if (this.player.olor <= 0) return;
    this.player.olor = Math.max(0, this.player.olor - dt);
    if (this.player.olor === 0) this.ui.mostrarAviso('🧼 Ya no olés a basura (o te acostumbraste)', 2.5);
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

// El turno elegido en el menú se recuerda en el navegador (si no se puede, queda "al azar")
function leerEleccionTurno() {
  try {
    const guardado = localStorage.getItem('turno');
    return ['azar', 'dia', 'noche'].includes(guardado) ? guardado : 'azar';
  } catch {
    return 'azar';
  }
}

function guardarEleccionTurno(eleccion) {
  try {
    localStorage.setItem('turno', eleccion);
  } catch {
    // (sin guardar: la próxima vez arranca "al azar")
  }
}
