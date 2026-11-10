// El walkie-talkie de Facu (etapa 15B). Facu mira la casa con los binoculares desde la vereda y le
// pasa a Tomi lo que ve. Dos cosas:
//
//  1. PISTAS de dónde está cada juguete, en tres niveles (cada vez más precisas):
//       nivel 1: el piso          "la pelota la vi en el sótano"
//       nivel 2: el cuarto        "...en la bodega"
//       nivel 3: el lugar exacto  "...en la mesa de la bodega"
//     Se arman solas con los datos: el piso y el cuarto salen de la posición del juguete (las
//     habitaciones de HouseData.js) y el lugar exacto es el "lugar" de su ubicación (Items.js).
//     Al empezar, el nivel 1 de los tres queda anotado en la lista de juguetes (sin que Facu hable).
//     Con T le pedís una más precisa (ver pedirPista): hay que esperar ESPERA_PISTA segundos entre una
//     y otra, y el walkie hace un ruidito.
//
//  Facu habla SOLO cuando le pedís una pista (etapa 17D): antes también comentaba lo que pasaba
//  ("¡Te vio Don Ernesto!"), pero eso ahora lo cuentan la música, los sonidos y la pantalla.
//
// Los mensajes van a una cola y se muestran de a uno, con el texto apareciendo letra por letra.
// Este archivo no dibuja nada: Game le pregunta qué mostrar (textoVisible) y se lo pasa a UI.
import { NOMBRES_PISOS, ZONA_PATIO, HABITACIONES } from './HouseData.js';

export const ESPERA_PISTA = 20; // segundos entre una pista pedida y la siguiente
export const RADIO_RUIDO_WALKIE = 3; // metros: el "kshhh" del walkie se escucha
const LETRAS_POR_SEGUNDO = 45;
const MAXIMO_EN_COLA = 3; // si hay más mensajes esperando, los nuevos se descartan

// Cómo dice Facu cada piso y cada cuarto
const PISOS_DICHOS = { '-1': 'en el sótano', 0: 'en la planta baja', 1: 'en el primer piso', 2: 'en el segundo piso', 3: 'en el ático' };
const CUARTOS_DICHOS = {
  'living': 'en el living',
  'cocina': 'en la cocina',
  'comedor': 'en el comedor',
  'baño': 'en el baño de abajo',
  'entrada': 'en la entrada',
  'garaje': 'en el garaje',
  'sala de los relojes': 'en la sala de los relojes, al fondo del living',
  'vestidor': 'en el vestidor, al fondo del dormitorio',
  'dormitorio': 'en el dormitorio de los viejos',
  'cuarto del hijo': 'en el cuarto que era del hijo',
  'cuarto de Doña Pocha': 'en el cuarto de Doña Pocha (¡ojo con ella!)',
  'baño de arriba': 'en el baño de arriba',
  'biblioteca': 'en la biblioteca',
  'cuarto secreto': 'en un cuarto secreto detrás de la biblioteca (¿algún libro raro?)',
  'sala de trofeos': 'en la sala de trofeos',
  'cuarto al revés': 'en el cuarto al revés',
  'cuarto de juegos': 'en el cuarto de juegos',
  'sala de la caldera': 'en la sala de la caldera',
  'depósito': 'en el depósito',
  'bodega': 'en la bodega',
  'cuarto de las muñecas': 'en el cuarto de las muñecas (¡qué miedo!)',
};

// Frases (se elige una al azar). {juguete}, {Juguete} (con mayúscula), {donde}, {faltan}.
// (Escritas sin "lo"/"la" ni "tuyo"/"tuya": así sirven para juguetes masculinos y femeninos.)
const FRASES = {
  nivel2: ['Dejame mirar bien... ¡Sí! {Juguete} está {donde}.', 'Ahora se ve mejor: {juguete} está {donde}. Cambio.'],
  nivel3: ['¡Lo veo clarito! {Juguete} está {donde}.', 'Ajusté los binoculares: {juguete} está {donde}. ¡Andá!'],
  nadaMas: ['Ya te dije todo lo que vi, Tomi. ¡Vos podés!'],
};

const alAzar = (lista) => (Array.isArray(lista) ? lista[Math.floor(Math.random() * lista.length)] : lista);
const mayuscula = (texto) => texto[0].toUpperCase() + texto.slice(1);

// Reemplaza {clave} por su valor ({Clave} = con mayúscula)
function completar(frase, valores) {
  return frase.replace(/\{(\w+)\}/g, (_, clave) => {
    const valor = valores[clave.toLowerCase()] ?? '';
    return clave[0] === clave[0].toUpperCase() ? mayuscula(valor) : valor;
  });
}

// ¿El punto (x, z) está en el patio de los perros?
function enElPatio(x, z) {
  return ZONA_PATIO.some(([x1, z1, x2, z2]) => x >= x1 - 0.5 && x <= x2 + 0.5 && z >= z1 - 0.5 && z <= z2 + 0.5);
}

// ------------------------------------------------------------
//  PISTAS: las tres frases de "dónde" para una ubicación
// ------------------------------------------------------------
// Devuelve { piso, cuarto, lugar } (cómo lo dice Facu) y la versión corta para el HUD.
export function dondeEsta(ubicacion) {
  const { piso, x, z, lugar } = ubicacion;
  const habitacion = HABITACIONES.find(
    (hab) => hab.piso === piso && hab.rects.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2),
  );
  if (!habitacion) {
    // Afuera de la casa
    const patio = enElPatio(x, z);
    const pisoDicho = patio ? 'afuera, en el patio de los perros' : 'afuera, en el jardín';
    const cuarto = patio ? (z > -3 ? 'en el patio, cerca de la puerta de atrás' : 'en el fondo del patio, por la cucha') : pisoDicho;
    return { piso: pisoDicho, cuarto, lugar, corto: [patio ? 'Patio' : 'Jardín', patio ? (z > -3 ? 'cerca de la puerta de atrás' : 'por la cucha') : ''] };
  }
  let cuarto = CUARTOS_DICHOS[habitacion.nombre] ?? `en el ${habitacion.nombre}`;
  // En el ático hay una sola "habitación": decimos de qué lado
  if (habitacion.nombre === 'ático') cuarto = x < 0 ? 'en el ático, del lado del garaje' : 'en el ático, del lado del patio';
  return { piso: PISOS_DICHOS[piso], cuarto, lugar, corto: [NOMBRES_PISOS[piso], habitacion.nombre === 'ático' ? (x < 0 ? 'lado del garaje' : 'lado del patio') : habitacion.nombre] };
}

// ------------------------------------------------------------
//  EL WALKIE
// ------------------------------------------------------------
export class Walkie {
  constructor() {
    // Funciones que conecta Game (sonidos)
    this.alEmpezarMensaje = null; // el "kshhh" de cuando aprieta el botón
    this.alEscribirLetra = null; // la "vocecita" mientras aparece el texto
    this.alTerminarMensaje = null;
    this.alCambiarPistas = null; // para que Game actualice las pistas del HUD
    this.reiniciar([]);
  }

  // objetivos: los juguetes de la partida (de Items). Cada uno arranca sin pistas (nivel 0).
  reiniciar(objetivos) {
    this.objetivos = objetivos;
    this.niveles = new Map(objetivos.map((o) => [o, 0]));
    this.cola = [];
    this.actual = null; // { texto, letras (cuántas se ven), tiempo (cuánto le queda en pantalla) }
    this.esperaPista = 0;
    if (objetivos.length > 0) this.anotarPisos();
  }

  // ¿Qué tanto sabe el jugador de este juguete? (0 = nada, 3 = el lugar exacto)
  nivelDe(objetivo) {
    return this.niveles.get(objetivo) ?? 0;
  }

  // Lo que se anota en el HUD debajo del juguete (o null si todavía no hay pista)
  pistaCorta(objetivo) {
    const nivel = this.nivelDe(objetivo);
    if (nivel === 0) return null;
    const { corto, lugar } = dondeEsta(objetivo.ubicacion);
    if (nivel === 1) return corto[0];
    if (nivel === 2) return corto.filter(Boolean).join(' · ');
    return `${corto[0]}: ${lugar}`;
  }

  // Agrega un mensaje a la cola. urgente: pasa adelante de todo (y corta el que se está mostrando)
  decir(texto, urgente = false) {
    if (urgente) {
      this.cola.unshift(texto);
      if (this.actual) this.actual.tiempo = Math.min(this.actual.tiempo, 0.3);
    } else if (this.cola.length < MAXIMO_EN_COLA) {
      this.cola.push(texto);
    }
  }

  // ------------------------------------------------------------
  //  PISTAS
  // ------------------------------------------------------------
  // Al empezar: el nivel 1 (el piso) de los tres juguetes queda anotado en la lista, sin decir nada
  anotarPisos() {
    for (const o of this.objetivos) this.niveles.set(o, 1);
    this.alCambiarPistas?.();
  }

  // El jugador apretó T. Facu le da una pista más precisa del juguete (que falte) del que menos se sabe.
  // Devuelve: { esperar: segundos } si todavía no puede, o { hablo: true } si habló (Game hace el ruido).
  pedirPista() {
    if (this.esperaPista > 0) return { esperar: Math.ceil(this.esperaPista) };
    const candidatos = this.objetivos.filter((o) => !o.encontrado && this.nivelDe(o) < 3);
    this.esperaPista = ESPERA_PISTA;
    if (candidatos.length === 0) {
      this.decir(alAzar(FRASES.nadaMas), true);
      return { hablo: true };
    }
    const objetivo = candidatos.reduce((menos, o) => (this.nivelDe(o) < this.nivelDe(menos) ? o : menos));
    const nivel = this.nivelDe(objetivo) + 1;
    this.niveles.set(objetivo, nivel);
    const { piso, cuarto, lugar } = dondeEsta(objetivo.ubicacion);
    const donde = [null, piso, cuarto, lugar][nivel];
    this.decir(completar(alAzar(nivel === 3 ? FRASES.nivel3 : FRASES.nivel2), { juguete: objetivo.objeto.nombre, donde }), true);
    this.alCambiarPistas?.();
    return { hablo: true, objetivo };
  }

  // ------------------------------------------------------------
  //  LOOP
  // ------------------------------------------------------------
  update(dt) {
    this.esperaPista = Math.max(0, this.esperaPista - dt);

    // El mensaje actual: van apareciendo las letras y después se queda un rato en pantalla
    if (this.actual) {
      const antes = Math.floor(this.actual.letras);
      this.actual.letras = Math.min(this.actual.texto.length, this.actual.letras + dt * LETRAS_POR_SEGUNDO);
      if (Math.floor(this.actual.letras) > antes && antes % 3 === 0) this.alEscribirLetra?.();
      this.actual.tiempo -= dt;
      if (this.actual.tiempo <= 0) {
        this.actual = null;
        this.alTerminarMensaje?.();
      }
    }
    if (!this.actual && this.cola.length > 0) {
      const texto = this.cola.shift();
      // Tiempo en pantalla: lo que tarda en escribirse + un rato para leerlo
      this.actual = { texto, letras: 0, tiempo: texto.length / LETRAS_POR_SEGUNDO + 2.5 + texto.length / 30 };
      this.alEmpezarMensaje?.();
    }
  }

  // Lo que hay que mostrar ahora (o null si Facu no está hablando)
  get textoVisible() {
    return this.actual ? this.actual.texto.slice(0, Math.floor(this.actual.letras)) : null;
  }
}
