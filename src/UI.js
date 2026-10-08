// UI: todo lo que se muestra "encima" del juego (HUD, avisos y pantallas en HTML).
// Game le dice QUÉ mostrar; UI sabe CÓMO mostrarlo.
import { RADIO_MAXIMO_PASOS } from './Noise.js';

const NIVEL_MAXIMO_ENOJO = 6;

export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);

    // Pantallas (una sola visible a la vez)
    this.pantallas = {
      menu: $('pantalla-menu'),
      pausa: $('pantalla-pausa'),
      victoria: $('pantalla-victoria'),
      derrota: $('pantalla-derrota'),
    };
    this.textoVictoria = $('texto-victoria');
    this.estadisticasVictoria = $('estadisticas-victoria');
    this.textoDerrota = $('texto-derrota');
    this.estadisticasDerrota = $('estadisticas-derrota');

    // HUD
    this.hud = $('hud');
    this.tituloBotin = $('titulo-botin');
    this.listaPistas = $('lista-pistas');
    this.textoTiempo = $('texto-tiempo');
    this.textoPiso = $('texto-piso');
    this.rellenoEnojo = $('relleno-enojo');
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
    this.bang = $('bang');
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
  }

  // Lista del botín: una línea por objeto. Si ya lo agarraste se tilda y muestra su nombre;
  // si no, muestra la pista (el acertijo). Arriba, el contador "🎒 Botín 2/5".
  mostrarBotin(objetivos) {
    const encontrados = objetivos.filter((o) => o.encontrado).length;
    const todos = encontrados === objetivos.length;
    this.tituloBotin.textContent = todos
      ? '🚐 ¡Tenés todo! Escapá en la van negra del frente'
      : `🎒 Botín ${encontrados}/${objetivos.length}`;
    this.tituloBotin.classList.toggle('listo', todos);

    this.listaPistas.innerHTML = '';
    for (const o of objetivos) {
      const linea = document.createElement('li');
      linea.classList.toggle('encontrado', o.encontrado);
      linea.textContent = o.encontrado ? `✅ ${mayuscula(o.objeto.nombre)}` : `⬜ ${o.objeto.pista}`;
      this.listaPistas.appendChild(linea);
    }
  }

  // Tiempo de la partida y barra de enojo del dueño (se llena de 0% a 100%)
  actualizarHUD(segundos, nivelEnojo) {
    this.textoTiempo.textContent = formatearTiempo(segundos);
    this.rellenoEnojo.style.width = `${(nivelEnojo / NIVEL_MAXIMO_ENOJO) * 100}%`;
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

  // "¡BANG!" de historieta. Para repetir la animación de CSS hay que sacar la clase,
  // forzar que el navegador lo note (leer offsetWidth) y volver a ponerla.
  mostrarBang() {
    this.bang.classList.remove('oculto', 'mostrar');
    void this.bang.offsetWidth;
    this.bang.classList.add('mostrar');
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
    this.hollin.classList.add('oculto');
    this.borrarAvisos();
  }

  // ------------------------------------------------------------
  //  PANTALLAS DE FIN DE PARTIDA
  // ------------------------------------------------------------
  // nombres: lo que te llevaste (ej: ['las llaves', 'el mate', ...])
  mostrarVictoria(nombres, segundos, nivelEnojo) {
    const lista = `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
    this.textoVictoria.textContent = `Te escapaste en la van con ${lista}. ¡Qué ladrón tan profesional (y torpe)!`;
    this.estadisticasVictoria.textContent = `⏱ Tiempo: ${formatearTiempo(segundos)} · 😠 Enojo del dueño: ${nivelEnojo}/${NIVEL_MAXIMO_ENOJO}`;
    this.terminarPartida('victoria');
  }

  // Si no se pasa un texto, elige una frase cómica al azar
  mostrarDerrota(texto, segundos, nivelEnojo) {
    const frases = [
      'El dueño te dio un palazo con el palo de amasar. Mañana vas a tener un chichón.',
      'Te agarró en pijama y todo. Qué vergüenza profesional.',
      'Y pensar que solo querías llevarte una cosita...',
      'El dueño llamó a la policía. Y a su mamá. Y a la tuya.',
    ];
    this.textoDerrota.textContent = texto || frases[Math.floor(Math.random() * frases.length)];
    this.estadisticasDerrota.textContent = `⏱ Duraste: ${formatearTiempo(segundos)} · 😠 Enojo del dueño: ${nivelEnojo}/${NIVEL_MAXIMO_ENOJO}`;
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
