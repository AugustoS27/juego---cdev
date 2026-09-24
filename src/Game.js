// Game: arma la escena, las luces y el loop principal. Es el "director" del juego:
// crea todas las partes, las conecta entre sí y decide en qué estado está la partida.
import * as THREE from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { House } from './House.js';
import { Player } from './Player.js';
import { UI } from './UI.js';
import { Items } from './Items.js';
import { Dueno } from './Dueno.js';
import { Perro, PERROS } from './Perro.js';
import { Abuela, ESTADO_ABUELA } from './Abuela.js';
import { ESTADO } from './Enemigo.js';
import { SistemaDeRuido, RADIO_RUIDO } from './Noise.js';
import { Audio } from './Audio.js';
import { Exterior } from './Exterior.js';
import { Entradas } from './Entradas.js';
import { ZonaDeEscape } from './Escape.js';
import { juntarMallasEstaticas } from './Optimizar.js';
import { Decoracion } from './Decoracion.js';
import { ALTURA_PISO, INICIO_JUGADOR, TECHO, PISO_MINIMO, NOMBRES_PISOS, ZONA_PATIO, pisoDeAltura } from './HouseData.js';

// Estados posibles de la partida
const PARTIDA = {
  MENU: 'menu', // menú principal
  JUGANDO: 'jugando',
  PAUSA: 'pausa', // se apretó Esc
  VICTORIA: 'victoria',
  DERROTA: 'derrota',
};

// Cuánta luz hay según el piso donde está el jugador (el sótano es oscuro, el ático un poco)
const LUZ_NORMAL = { sol: 1.9, relleno: 0.7, cielo: 0.9, ambiente: 0.3 };
const LUZ_POR_PISO = {
  [-1]: { sol: 0.45, relleno: 0.15, cielo: 0.35, ambiente: 0.12 },
  3: { sol: 1.3, relleno: 0.45, cielo: 0.75, ambiente: 0.25 },
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
    this.decoracion = new Decoracion(this.scene, this.house);
    // Los enemigos: el dueño (toda la casa), dos perros (el patio) y la abuela (su piso)
    this.dueno = new Dueno(this.scene, this.house, this.player);
    this.perros = PERROS.map((datos) => new Perro(this.scene, this.house, this.player, datos));
    this.abuela = new Abuela(this.scene, this.house, this.player);
    this.enemigos = [this.dueno, ...this.perros, this.abuela];
    this.ruido = new SistemaDeRuido(this.scene, this.enemigos);
    this.audio = new Audio();
    this.ui = new UI();

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

    this.reiniciar(); // deja lista la primera partida (se ve de fondo detrás del menú)
    this.ui.mostrarPantalla('menu');
  }

  crearLuces() {
    // Luz ambiente de dos colores (cielo / suelo): da un look suave de dibujito
    this.luzCielo = new THREE.HemisphereLight('#ffffff', '#fff1e0', LUZ_NORMAL.cielo);
    this.luzAmbiente = new THREE.AmbientLight('#ffffff', LUZ_NORMAL.ambiente);
    this.scene.add(this.luzCielo, this.luzAmbiente);

    // "Sol" de adentro: está justo debajo del techo del piso donde está el jugador y apunta
    // derecho hacia abajo. Hay UNO solo y se muda de piso con el jugador (ver actualizarLuces).
    // ¿Por qué no uno por piso? Porque una luz direccional ilumina TODO, esté donde esté:
    // con 5 soles, cada piso recibiría la luz de los 5 y quedaría todo quemado.
    // Su cámara de sombras llega hasta el fondo del sótano: los pisos de abajo quedan a la
    // sombra del piso donde estás (como si la luz entrara desde arriba).
    this.solInterior = new THREE.DirectionalLight('#fff4d6', LUZ_NORMAL.sol);
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
    this.luzRelleno = new THREE.DirectionalLight('#fff4d6', LUZ_NORMAL.relleno);
    this.luzRelleno.position.set(0, 20, 0);
    this.scene.add(this.luzRelleno);

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
    // (agachado casi nada, caminando un poco, corriendo mucho: ver RADIO_RUIDO en Noise.js).
    // Adentro de un conducto de ventilación, cualquier paso suena a chapa.
    this.player.alDarPaso = (tipo) => {
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
      this.ui.mostrarAviso(`🔒 ¡El dueño trabó una puerta (${donde})! Se destraba en 20 s`, 4);
    };

    // El dueño cambió de estado: alerta si te vio, "¿?" si escuchó algo
    this.dueno.alCambiarEstado = (nuevo, anterior) => {
      if (this.estado !== PARTIDA.JUGANDO) return;
      if (nuevo === ESTADO.PERSEGUIR) {
        this.audio.alerta();
        this.ui.mostrarAviso('❗ ¡TE VIO! ¡Corré o escondete!', 2);
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
        }
      };
      perro.alAburrirse = () => this.ui.mostrarAviso(`🥱 ${perro.v.nombre} se aburrió de ladrarte y vuelve a la cucha`, 3);
    }

    // Abuela: "clic" al apuntar, ¡BANG! al disparar (ruido enorme) y ruiditos al recargar
    this.abuela.alApuntar = () => {
      this.audio.clic(Math.max(0.5, this.volumenPorDistancia(this.abuela.position)));
      this.ui.mostrarAviso('🎯 ¡La abuela te está apuntando con la escopeta! ¡Cubrite!', 2);
    };
    this.abuela.alDisparar = ({ acerto }) => {
      this.audio.disparo(Math.max(0.4, this.volumenPorDistancia(this.abuela.position)));
      this.ui.mostrarBang();
      // El ruido sale de donde te vio (a la altura de tus pies): el dueño va a ir a ver ahí
      this.hacerRuido(this.abuela.ultimaPosicionVista, RADIO_RUIDO.disparo, this.abuela);
      if (acerto) this.perder(this.abuela);
      else this.ui.mostrarAviso('💨 ¡Le erró! Tarda en recargar: ¡aprovechá!', 2.5);
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
  actualizarLuces(dt) {
    const piso = pisoDeAltura(this.player.position.y);
    this.moverSolInterior(piso);
    this.house.mostrarPisosCercanos(piso);
    const p = this.player.position;
    const enLaCasa = p.x > -15.5 && p.x < 9 && p.z > -6 && p.z < 6; // (casa + garaje)
    let donde = enLaCasa ? NOMBRES_PISOS[piso] : 'Afuera';
    if (!enLaCasa && this.enElPatio(p)) donde = '🐕 Patio de los perros';
    if (this.house.enTunel(p)) donde = 'Túnel secreto';
    else if (this.house.enConducto(p)) donde = 'Conducto de ventilación';
    this.ui.mostrarPiso(donde);

    const objetivo = LUZ_POR_PISO[piso] || LUZ_NORMAL;
    const t = Math.min(1, dt * 3);
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
      if (fuente === this.abuela) aviso = '💥 ¡El escopetazo despertó a todos! El dueño viene a ver...';
      else if (fuente) aviso = '🐕 ¡Los ladridos alertaron al dueño! Viene a ver...';
      else aviso = '👂 El dueño escuchó algo y viene a ver...';
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
  //  - "¡A robar!" / "Reiniciar": partida nueva y se bloquea el mouse.
  //  - Al bloquearse el mouse se empieza (o se sigue) jugando.
  //  - Esc: el navegador libera el mouse y aparece la pausa.
  //  - "Menú": vuelve al menú principal.
  configurarPantallas() {
    const controls = this.player.controls;

    controls.addEventListener('lock', () => {
      this.estado = PARTIDA.JUGANDO;
      this.ui.mostrarPantalla(null);
      this.ui.mostrarHUD(true);
      if (this.tiempoPartida === 0) this.ui.mostrarAviso('🏠 Estás afuera. Buscá una forma de entrar... ¡hay varias!', 4);
    });

    controls.addEventListener('unlock', () => {
      // Si se liberó el mouse porque terminó la partida, no mostramos la pausa
      if (this.estado === PARTIDA.JUGANDO) {
        this.estado = PARTIDA.PAUSA;
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
        this.estado = PARTIDA.MENU;
        this.ui.mostrarHUD(false);
        this.ui.mostrarPantalla('menu');
      },
    });
  }

  configurarTeclado() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && this.estado === PARTIDA.JUGANDO) this.interactuar();
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
    this.pasadizoEncontrado = false;
    this.items.sortearObjetivos();
    this.zonaEscape.activar(false);
    this.estabaEnLaZona = false;
    for (const enemigo of this.enemigos) enemigo.reiniciar();

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
    this.decoracion.update(dt, this.camera);
    this.actualizarLuces(dt);

    if (this.estado === PARTIDA.JUGANDO) {
      this.tiempoPartida += dt;
      this.tiempoDesdeAvisoRuido += dt;
      this.actualizarDificultad(dt);

      this.house.update(dt);
      this.entradas.update(dt);
      this.forzarSiMantieneE(dt);
      this.player.update(dt);
      for (const enemigo of this.enemigos) enemigo.update(dt);
      this.ruido.update(dt);
    }

    // (Si la abuela te dio en su update, la partida ya terminó: por eso preguntamos de nuevo)
    if (this.estado === PARTIDA.JUGANDO) {
      // Si algún enemigo te está cazando (o la abuela te apunta): música tensa y borde rojo
      const alerta = this.enemigos.some((enemigo) => enemigo.estaAlerta);
      this.audio.actualizarMusica(dt, alerta);
      this.ui.mostrarAlertaPersecucion(alerta);
      this.ui.mostrarApuntado(this.abuela.estado === ESTADO_ABUELA.APUNTAR);
      this.actualizarAyuda();
      this.ui.actualizarHUD(this.tiempoPartida, this.nivelEnojo);
      const paso = this.player.tipoDePaso;
      const enConducto = this.house.enConducto(this.player.position);
      const radio = paso ? RADIO_RUIDO[enConducto ? 'conducto' : paso] : 0;
      this.ui.mostrarRuido(radio, this.player.agachado, enConducto);

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
    this.estado = PARTIDA.VICTORIA; // primero el estado, así "unlock" no muestra la pausa
    this.player.controls.unlock();
    this.audio.motor();
    this.audio.victoria();
    const nombres = this.items.objetivos.map((o) => o.objeto.nombre);
    this.ui.mostrarVictoria(nombres, this.tiempoPartida, this.nivelEnojo);
  }

  // Te atrapó un enemigo (o la abuela te dio): cada uno tiene su frase
  perder(enemigo) {
    let texto = null; // (null = una frase del dueño al azar, ver UI.mostrarDerrota)
    if (enemigo === this.dueno && this.dueno.encontroAlJugador) {
      texto = '¡Te encontró escondido! Resulta que no eras tan invisible...';
    } else if (enemigo === this.abuela) {
      texto = '¡PUM! La abuela te dio con un perdigón de sal. Arde, pero más arde el orgullo.';
    } else if (this.perros.includes(enemigo)) {
      texto = `${enemigo.v.nombre} te mordió el pantalón y no lo suelta. Te fuiste en calzoncillos.`;
      this.audio.ladrido(1);
    }
    this.estado = PARTIDA.DERROTA;
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
  aplicarResultado({ sonido, aviso, ruido, animacion, llave }) {
    if (sonido) this.audio[sonido]?.();
    if (aviso) this.ui.mostrarAviso(aviso, 3);
    if (ruido) this.hacerRuido(ruido.posicion, ruido.radio);
    if (animacion) this.player.moverAnimado(animacion);
    if (llave) this.house.puertaDeCalle.conLlave = false;
  }

  esconderse(escondite) {
    this.player.esconderse(escondite);
    this.dueno.alEsconderseElJugador(escondite);
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
