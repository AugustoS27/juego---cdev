// UI: todo lo que se muestra "encima" del juego (HUD, avisos y pantallas en HTML).
// Game le dice QUÉ mostrar; UI sabe CÓMO mostrarlo.
import { RADIO_MAXIMO_PASOS } from './Noise.js';


export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);

    // Pantallas (una sola visible a la vez)
    this.pantallas = {
      menu: $('pantalla-menu'),
      listo: $('pantalla-listo'),
      ayuda: $('pantalla-ayuda'),
      pausa: $('pantalla-pausa'),
      victoria: $('pantalla-victoria'),
      derrota: $('pantalla-derrota'),
    };
    this.listaListo = $('lista-listo');
    this.turnoListo = $('turno-listo');
    this.textoTurno = $('texto-turno');
    this.lineaLinterna = $('linea-linterna');
    this.estadoLinterna = $('estado-linterna');
    this.relampago = $('relampago');
    this.vineta = $('vineta');
    this.vinetaCerca = $('vineta-cerca');
    this.grano = $('grano');
    this.grano.style.setProperty('--ruido', `url(${imagenDeRuido()})`);
    this.atmosfera = {}; // (los últimos valores puestos: para no tocar el estilo si no cambió)
    this.botonesTurno = [...document.querySelectorAll('[data-turno]')];
    this.botonesEstiloSonido = [...document.querySelectorAll('[data-estilo-sonido]')];
    this.textoVictoria = $('texto-victoria');
    this.estadisticasVictoria = $('estadisticas-victoria');
    this.textoDerrota = $('texto-derrota');
    this.estadisticasDerrota = $('estadisticas-derrota');

    // HUD
    this.hud = $('hud');
    this.tituloBotin = $('titulo-botin');
    this.listaPistas = $('lista-pistas');
    this.pieWalkie = $('pie-walkie');
    this.walkie = $('walkie');
    this.textoWalkie = $('texto-walkie');
    this.textoTiempo = $('texto-tiempo');
    this.textoPiso = $('texto-piso');
    this.hudSonido = $('hud-sonido');
    this.hudHabilidades = $('hud-habilidades');
    this.filasHabilidad = new Map(); // tipo -> { elemento, relleno, segundos } (una fila por habilidad activa)

    // Cosas que aparecen encima del juego
    this.mira = $('mira');
    this.ayuda = $('ayuda');
    this.avisos = $('avisos');
    this.textoRuido = $('texto-ruido');
    this.rellenoRuido = $('relleno-ruido');
    this.vistaEscondite = $('vista-escondite');
    this.alertaPersecucion = $('alerta-persecucion');
    this.apuntado = $('apuntado');
    this.fuap = $('fuap');
    this.red = $('red');
    this.fundido = $('fundido');
    this.olor = $('olor');
    this.hollin = $('hollin');

    this.textoAyuda = null; // lo guardamos para no tocar el HTML si no cambió
  }

  // Conecta cada botón con data-accion="..." a una función: acciones = { jugar: fn, menu: fn, ... }
  conectarBotones(acciones) {
    for (const boton of document.querySelectorAll('[data-accion]')) {
      boton.addEventListener('click', () => acciones[boton.dataset.accion]?.());
    }
  }

  // Muestra una pantalla ('menu', 'pausa', 'victoria', 'derrota') o ninguna (null).
  // Aparecen y desaparecen con un fundido (ver .pantalla.escondida en style.css)
  mostrarPantalla(nombre) {
    for (const [clave, pantalla] of Object.entries(this.pantallas)) {
      pantalla.classList.toggle('escondida', clave !== nombre);
    }
  }

  // ------------------------------------------------------------
  //  HUD
  // ------------------------------------------------------------
  mostrarHUD(visible) {
    this.hud.classList.toggle('oculto', !visible);
    this.mira.style.visibility = visible ? '' : 'hidden'; // (en el menú y las pantallas, sin mira)
  }

  // Lista de juguetes: una línea por juguete, con su ícono y su nombre (se tilda cuando lo recuperás).
  // Abajo de cada uno, lo que te dijo Facu de dónde está (walkie.pistaCorta). Arriba, "🧸 Juguetes 2/3".
  mostrarBotin(objetivos, walkie = null) {
    const encontrados = objetivos.filter((o) => o.encontrado).length;
    const todos = encontrados === objetivos.length;
    this.tituloBotin.textContent = todos
      ? '🚲 ¡Los tenés todos! Volvé con Facu (entrada de autos)'
      : `🧸 Juguetes ${encontrados}/${objetivos.length}`;
    this.tituloBotin.classList.toggle('listo', todos);

    this.listaPistas.innerHTML = '';
    for (const o of objetivos) {
      const linea = document.createElement('li');
      linea.classList.toggle('encontrado', o.encontrado);
      linea.textContent = `${o.encontrado ? '✅' : '⬜'} ${o.objeto.icono} ${mayuscula(o.objeto.nombre)}`;
      const pista = !o.encontrado && walkie?.pistaCorta(o);
      if (pista) {
        const detalle = document.createElement('div');
        detalle.className = 'pista';
        detalle.textContent = `📻 ${pista}`;
        linea.appendChild(detalle);
      }
      this.listaPistas.appendChild(linea);
    }
  }

  // El mensaje de Facu por el walkie (null = no está hablando). Solo tocamos el DOM si cambió.
  mostrarWalkie(texto) {
    if (texto === this.textoWalkieActual) return;
    this.textoWalkieActual = texto;
    this.walkie.classList.toggle('oculto', texto === null);
    if (texto !== null) this.textoWalkie.textContent = texto;
  }

  // Abajo de la lista de juguetes: si ya se puede pedir otra pista o cuánto falta
  mostrarEsperaPista(segundos) {
    const texto = segundos > 0 ? `📻 Facu está mirando... (${Math.ceil(segundos)} s)` : '📻 [T] Pedirle una pista a Facu';
    if (texto !== this.pieWalkie.textContent) this.pieWalkie.textContent = texto;
    this.pieWalkie.classList.toggle('esperando', segundos > 0);
  }

  // Tiempo de la partida
  actualizarHUD(segundos) {
    this.textoTiempo.textContent = formatearTiempo(segundos);
  }

  // Dónde está el jugador: 'Sótano', 'Planta baja'... o 'Afuera'
  mostrarPiso(nombre) {
    if (nombre !== this.textoPiso.textContent) this.textoPiso.textContent = nombre;
  }

  // Habilidades activas (abajo a la derecha): ícono, barrita que se vacía y segundos que quedan.
  // lista: [{ tipo, icono, nombre, color, restante, fraccion }] (ver Habilidades.paraElHUD)
  // Las filas se crean una sola vez y después solo se actualizan (tocar el HTML en cada frame es caro).
  mostrarHabilidades(lista) {
    for (const h of lista) {
      let fila = this.filasHabilidad.get(h.tipo);
      if (!fila) {
        fila = crearFilaHabilidad(h);
        this.filasHabilidad.set(h.tipo, fila);
        this.hudHabilidades.appendChild(fila.elemento);
      }
      fila.relleno.style.width = `${h.fraccion * 100}%`;
      const segundos = `${Math.ceil(h.restante)} s`;
      if (fila.segundos.textContent !== segundos) fila.segundos.textContent = segundos;
      fila.elemento.classList.toggle('por-terminar', h.restante < 3); // titila cuando se está por acabar
    }
    // Las que ya no están activas, se borran
    for (const [tipo, fila] of this.filasHabilidad) {
      if (lista.some((h) => h.tipo === tipo)) continue;
      fila.elemento.remove();
      this.filasHabilidad.delete(tipo);
    }
  }

  mostrarSilencio(silenciado) {
    this.hudSonido.textContent = silenciado ? '🔇 [M] Sonido' : '🔊 [M] Sonido';
  }

  // Muestra un texto abajo de la mira (ej: "[E] Abrir puerta"). Con null se oculta.
  mostrarAyuda(texto) {
    if (texto === this.textoAyuda) return;
    this.textoAyuda = texto;
    this.ayuda.textContent = texto || '';
    this.ayuda.classList.toggle('oculto', !texto);
  }

  // Aviso que aparece unos segundos y desaparece solo
  mostrarAviso(texto, segundos = 3) {
    const aviso = document.createElement('div');
    aviso.className = 'aviso';
    aviso.textContent = texto;
    this.avisos.appendChild(aviso);
    setTimeout(() => aviso.remove(), segundos * 1000);
  }

  borrarAvisos() {
    this.avisos.innerHTML = '';
  }

  // Ruidómetro: "radio" es el alcance del ruido de tus pasos ahora mismo (0 = quieto).
  // enConducto: adentro de un conducto de chapa todo suena más (aunque vayas agachado)
  // conBotas: con las botas de lana no hacés ruido (radio 0) y lo aclaramos
  mostrarRuido(radio, agachado = false, enConducto = false, conBotas = false) {
    const porcentaje = (radio / RADIO_MAXIMO_PASOS) * 100;
    let texto = agachado ? '🦶 Agachado' : '🤫 Silencio';
    let color = '#52b788'; // verde
    if (radio > 0 && radio <= 1) texto = '🦶 Casi nada';
    if (radio > 1 && radio <= 3) {
      texto = '👣 Pasos';
      color = '#ffd23f'; // amarillo
    }
    if (radio > 3) {
      texto = '📢 ¡Mucho ruido!';
      color = '#e63946'; // rojo
    }
    if (enConducto && radio > 0) {
      texto = '🔩 ¡La chapa suena!';
      color = '#f4a261'; // naranja
    }
    if (conBotas) texto = '🧦 Botas de lana';
    if (texto !== this.textoRuidoActual) {
      this.textoRuidoActual = texto;
      this.textoRuido.textContent = texto;
    }
    this.rellenoRuido.style.width = `${porcentaje}%`;
    this.rellenoRuido.style.background = color;
  }

  mostrarAlertaPersecucion(visible) {
    this.alertaPersecucion.classList.toggle('oculto', !visible);
  }

  // Mira roja en el medio de la pantalla mientras la abuela te apunta
  mostrarApuntado(visible) {
    this.apuntado.classList.toggle('oculto', !visible);
  }

  // "¡FUAP!" de historieta (el lanzarredes). Para repetir la animación de CSS hay que sacar la clase,
  // forzar que el navegador lo note (leer offsetWidth) y volver a ponerla.
  mostrarFuap() {
    this.fuap.classList.remove('oculto', 'mostrar');
    void this.fuap.offsetWidth;
    this.fuap.classList.add('mostrar');
  }

  // La red sobre la pantalla mientras estás enredado (segundos que faltan; 0 = no se ve).
  // En el último ratito se va desvaneciendo.
  mostrarRed(segundos) {
    const valor = Math.min(1, segundos / 0.3).toFixed(2);
    if (valor !== this.redActual) {
      this.redActual = valor;
      this.red.style.opacity = valor;
      this.red.classList.toggle('activa', segundos > 0); // (tiembla solo mientras se ve)
    }
  }

  // Pantalla negra (0 = no se ve, 1 = todo negro): la usan las entradas para "cortar" la imagen
  // mientras atravesás una pared o un techo
  mostrarFundido(oscuridad) {
    const valor = oscuridad.toFixed(2);
    if (valor !== this.oscuridadActual) {
      this.oscuridadActual = valor;
      this.fundido.style.opacity = valor;
    }
  }

  // Manchas de hollín que se van borrando solas (después de caer por la chimenea).
  // Mismo truco que el ¡BANG! para poder repetir la animación.
  mostrarHollin() {
    this.hollin.classList.remove('oculto', 'mostrar');
    void this.hollin.offsetWidth;
    this.hollin.classList.add('mostrar');
  }

  // Nubecitas verdes en los bordes de la pantalla mientras olés a basura (1 = recién salido del tacho)
  mostrarOlor(fraccion) {
    const valor = (fraccion * 0.8).toFixed(2);
    if (valor !== this.olorActual) {
      this.olorActual = valor;
      this.olor.style.opacity = valor;
    }
  }

  // tipo: el tipo de escondite (ver Escondites.js) o null (no está escondido)
  mostrarEscondite(tipo) {
    this.vistaEscondite.className = tipo || 'oculto';
    this.mira.classList.toggle('oculto', !!tipo);
  }

  // Saca todo lo que se muestra encima del juego (al pausar o terminar la partida)
  ocultarCosasDelJuego() {
    this.mostrarAyuda(null);
    this.mostrarEscondite(null);
    this.mostrarRuido(0);
    this.mostrarAlertaPersecucion(false);
    this.mostrarApuntado(false);
    this.mostrarHabilidades([]);
    this.mostrarFundido(0);
    this.mostrarOlor(0);
    this.mostrarWalkie(null);
    this.mostrarRed(0);
    this.hollin.classList.add('oculto');
    this.borrarAvisos();
  }

  // ------------------------------------------------------------
  //  DÍA Y NOCHE
  // ------------------------------------------------------------
  // Los botones del menú para elegir el turno: alElegir('azar' | 'dia' | 'noche')
  conectarTurno(alElegir) {
    for (const boton of this.botonesTurno) boton.addEventListener('click', () => alElegir(boton.dataset.turno));
  }

  // Marca el botón elegido
  marcarTurno(eleccion) {
    for (const boton of this.botonesTurno) boton.classList.toggle('elegido', boton.dataset.turno === eleccion);
  }

  // Sonidos grabados o hechos con código (etapa 16D): alElegir('grabado' | 'codigo')
  conectarEstiloSonido(alElegir) {
    for (const boton of this.botonesEstiloSonido) boton.addEventListener('click', () => alElegir(boton.dataset.estiloSonido));
  }

  marcarEstiloSonido(estilo) {
    for (const boton of this.botonesEstiloSonido) boton.classList.toggle('elegido', boton.dataset.estiloSonido === estilo);
  }

  // En el HUD: "🌙 De noche" (y, de noche, la línea de la linterna)
  mostrarTurno({ icono, nombre }) {
    this.textoTurno.textContent = `${icono} ${nombre}`;
    this.lineaLinterna.classList.toggle('oculto', nombre !== 'De noche');
  }

  mostrarLinterna(prendida) {
    this.estadoLinterna.textContent = prendida ? 'prendida' : 'apagada';
  }

  // El destello del relámpago (0 = nada, 1 = todo blanco)
  // Atmósfera: bordes oscuros (vineta), cuánto se cierran por un enemigo cerca (cerca) y grano (de 0 a 1)
  mostrarAtmosfera({ vineta, cerca, grano }) {
    this.ponerOpacidad(this.vineta, 'vineta', vineta);
    this.ponerOpacidad(this.vinetaCerca, 'cerca', cerca);
    this.ponerOpacidad(this.grano, 'grano', grano);
  }

  ponerOpacidad(elemento, clave, valor) {
    const texto = valor.toFixed(2);
    if (this.atmosfera[clave] === texto) return;
    this.atmosfera[clave] = texto;
    elemento.style.opacity = texto;
  }

  mostrarRelampago(fuerza) {
    const valor = (fuerza * 0.55).toFixed(2);
    if (valor !== this.relampagoActual) {
      this.relampagoActual = valor;
      this.relampago.style.opacity = valor;
    }
  }

  // Después de la intro: los juguetes de esta partida (ícono y nombre), el turno y el botón "¡Vamos!"
  mostrarListo(objetivos, turno = null) {
    this.listaListo.replaceChildren(
      ...objetivos.map(({ objeto }) => {
        const li = document.createElement('li');
        li.textContent = `${objeto.icono} ${mayuscula(objeto.nombre)}`;
        return li;
      }),
    );
    this.turnoListo.textContent = turno ? `${turno.icono} Te toca entrar ${turno.nombre.toLowerCase()}.` : '';
    this.mostrarPantalla('listo');
  }

  // ------------------------------------------------------------
  //  PANTALLAS DE FIN DE PARTIDA
  // ------------------------------------------------------------
  // nombres: los juguetes que recuperaste (ej: ['la pelota de fútbol', 'el robot', ...])
  mostrarVictoria(nombres, segundos) {
    const lista = `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
    this.textoVictoria.textContent = `Recuperaste ${lista}. Facu y vos se fueron en bici mientras Don Ernesto gritaba desde la puerta. ¡Misión cumplida!`;
    this.estadisticasVictoria.textContent = `⏱ Tiempo: ${formatearTiempo(segundos)}`;
    this.terminarPartida('victoria');
  }

  // Si no se pasa un texto, elige una frase cómica al azar
  mostrarDerrota(texto, segundos) {
    const frases = [
      'Don Ernesto te agarró de una oreja y te llevó hasta tu casa. Tu mamá ya está enterada.',
      '"¡Y no vuelvas más!" Y encima ahora también se quedó con tu gorrita.',
      'Don Ernesto llamó a tu mamá. Estás castigado sin tele hasta el año que viene.',
      '"¡Lo que entra en mi casa es mío!" Por suerte, a vos te devolvió... de una oreja.',
    ];
    this.textoDerrota.textContent = texto || frases[Math.floor(Math.random() * frases.length)];
    this.estadisticasDerrota.textContent = `⏱ Duraste: ${formatearTiempo(segundos)}`;
    this.terminarPartida('derrota');
  }

  terminarPartida(pantalla) {
    this.ocultarCosasDelJuego();
    this.mostrarHUD(false);
    this.mostrarPantalla(pantalla);
  }
}

// Arma la fila del HUD de una habilidad:  🥕 Zanahoria [=====   ] 12 s
function crearFilaHabilidad({ icono, nombre, color }) {
  const elemento = document.createElement('div');
  elemento.className = 'habilidad';
  elemento.innerHTML = `<span class="icono"></span><span class="nombre"></span>
    <span class="barra"><span class="relleno"></span></span><span class="segundos"></span>`;
  elemento.querySelector('.icono').textContent = icono;
  elemento.querySelector('.nombre').textContent = nombre;
  const relleno = elemento.querySelector('.relleno');
  relleno.style.background = color;
  return { elemento, relleno, segundos: elemento.querySelector('.segundos') };
}

// "el mate" -> "El mate"
function mayuscula(texto) {
  return texto[0].toUpperCase() + texto.slice(1);
}

// 83.4 segundos -> "1:23"
function formatearTiempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = String(Math.floor(segundos % 60)).padStart(2, '0');
  return `${min}:${seg}`;
}

// El grano de película: una imagen de 128 x 128 con puntitos claros y oscuros al azar
function imagenDeRuido() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 128;
  lienzo.height = 128;
  const ctx = lienzo.getContext('2d');
  const imagen = ctx.createImageData(128, 128);
  for (let i = 0; i < imagen.data.length; i += 4) {
    const v = Math.random() < 0.5 ? 0 : 255;
    imagen.data[i] = imagen.data[i + 1] = imagen.data[i + 2] = v;
    imagen.data[i + 3] = Math.random() * 255;
  }
  ctx.putImageData(imagen, 0, 0);
  return lienzo.toDataURL();
}
