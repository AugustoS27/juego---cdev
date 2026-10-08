// Los tipos de escondite (etapa 5 + etapa 14C). Todos funcionan igual (ver Player.esconderse):
// mirás el mueble, apretás E, la cámara queda en el borde mirando hacia donde estabas parado, y
// el dueño puede sospechar si pasa cerca (40%, ver Dueno.sospecharDelEscondite).
// Cambia, según el tipo:
//   ayuda, donde:   los textos de abajo de la mira
//   ojos:           a qué altura quedan tus ojos (desde la base del escondite)
//   borde:          cuánto se corren los ojos hacia afuera del borde (negativo = hacia adentro)
//   sonido:         qué suena al entrar y al salir (ver Audio.js)
//   seVeDeCerca:    debajo de una mesa, si el dueño te mira de cerca, te ve
//   olor:           segundos que salís oliendo a basura (los perros te huelen de lejos)
// La "vista" desde adentro (rendijas, colchón, hojas...) es una máscara en style.css con el nombre del tipo.
//
// Dónde está cada uno:
//   placard: planta baja, primer piso, sótano y el ropero del ático
//   cama:    las camas de los cuartos
//   mesa:    las mesas de la cocina, el comedor y la bodega (muebles.js)
//   banera:  las dos bañeras, que ahora tienen cortina (muebles.js)
//   caja:    cajas grandes de cartón en el garaje y en el sótano (muebles.js)
//   arbusto: todos los arbustos del jardín y tres nuevos en el patio de los perros (Exterior.js)
//   tacho:   los tachos de basura al lado de la tranquera del patio (Exterior.js)
export const ESCONDITES = {
  placard: { ayuda: '[E] Esconderse en el placard', donde: 'en el placard', ojos: 1.5, borde: 0.05, sonido: 'puerta' },
  cama: { ayuda: '[E] Meterse debajo de la cama', donde: 'debajo de la cama', ojos: 0.2, borde: -0.3, sonido: 'puerta' },
  mesa: {
    ayuda: '[E] Meterse debajo de la mesa (si te miran de cerca, te ven)',
    donde: 'debajo de la mesa',
    ojos: 0.4,
    borde: -0.15,
    sonido: 'arrastrarse',
    seVeDeCerca: true,
  },
  banera: { ayuda: '[E] Meterse en la bañera y correr la cortina', donde: 'en la bañera', ojos: 1.45, borde: 0.08, sonido: 'cortina' },
  caja: { ayuda: '[E] Meterse en la caja', donde: 'adentro de la caja', ojos: 0.8, borde: 0.05, sonido: 'carton' },
  arbusto: { ayuda: '[E] Meterse en el arbusto', donde: 'en el arbusto', ojos: 0.75, borde: -0.1, sonido: 'hojas' },
  tacho: { ayuda: '[E] Meterse en el tacho de basura (puaj)', donde: 'en el tacho de basura', ojos: 1.05, borde: 0.05, sonido: 'tacho', olor: 25 },
};

export const DISTANCIA_VER_DEBAJO_MESA = 2.5; // a esta distancia (o menos) el dueño te ve debajo de la mesa
export const OLFATO_PERROS = 12; // con olor a basura, los perros te huelen hasta acá (aunque no te vean)
