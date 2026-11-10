# Plan de acción — Un juego que da miedo (etapa 16)

Este documento es la cuarta parte del plan (la tercera, la historia nueva, está en
[PLAN_HISTORIA.md](PLAN_HISTORIA.md)). La etapa 15F (música, pasos y cierre) no se hizo por separado: queda
adentro de esta etapa, que cambia el sonido de punta a punta.

> **Estado actual:** 🔨 en curso. Confirmado por el usuario (con cambios, ver "Decisiones"). **16A** ✅ **16B** ✅ **16C** ✅ **16D** ✅. Próxima: **16E**.

---

## La idea

La casa de Don Ernesto y Doña Pocha tiene que dar **miedo de verdad, pero de película para chicos** (estilo
"Escalofríos" o "Monster House"): sombras, crujidos, luces que fallan, cosas raras que se mueven, el corazón que
se acelera cuando Don Ernesto está cerca. Nada de sangre ni de cosas desagradables: los personajes siguen siendo
los mismos y el humor de las cinemáticas se mantiene.

Lo que pidió el usuario y dónde se hace cada cosa:

| Pedido | Etapa |
|---|---|
| Que te pueda tocar entrar de día o de noche | 16A |
| Una iluminación que dé más miedo | 16A y 16B |
| De noche, que se corte la luz cada tanto (después: **solo cuando la corta el jugador**) | 16C |
| Ruidos más reales | 16D |
| Una música más tensa, que te ponga en la piel del personaje | 16E |
| Más habitaciones extrañas y oscuras | 16F |
| Menú con la casa en 3D de fondo (de día o de noche), los perros asomados, Don Ernesto y Doña Pocha mirando y un relámpago cada tanto | 16A |
| "Entre otros cambios" (sustos, objetos raros, efectos de pantalla, linterna, tormenta) | repartidos en 16B a 16F |

---

## Resumen de las etapas

| Etapa | Contenido | Tamaño | Estado |
|---|---|---|---|
| **16A** | Día y noche: se sortea (o se elige) el turno; cielo, sol/luna, niebla, farolas y ventanas encendidas; la linterna de Tomi (de noche); **el menú nuevo con la casa de fondo y relámpagos** | Grande | ✅ Terminada |
| **16B** | Luces y atmósfera: lámparas de verdad en los cuartos, más contraste, viñeta y grano en la pantalla, tormenta con relámpagos (de noche) | Grande | ✅ Terminada |
| **16C** | Cortes de luz (de noche): **solo los provoca el jugador** con el tablero de luz del garaje | Mediana | ✅ Terminada |
| **16D** | Sonido real: eco según el cuarto, sonido que viene de un lado, pasos según el piso, ruidos de la casa (crujidos, reloj, viento, grillos), el corazón y la respiración de Tomi; **comparar sonidos grabados (CC0) contra sintetizados** | Grande | ✅ Terminada |
| **16E** | Música tensa y adaptativa: capas que se suman según lo cerca que esté el peligro, golpes de susto, tema de persecución, caja de música en el menú | Mediana | ⏳ Próxima |
| **16F** | Habitaciones extrañas y oscuras + sustos: cuartos nuevos y objetos que se mueven solos | Grande | — |
| **16G** | Cierre: todas las pruebas, rendimiento, README (lo que iba a ser la 15F) | Chica | — |

Igual que siempre: **una etapa por vez**, se prueba, se muestra y se espera la confirmación antes de seguir.
Un commit por etapa (cuando se pida).

### Orden y dependencias

```
16A (día y noche, linterna)
 └─ 16B (lámparas, atmósfera, tormenta)    ← la noche necesita luces propias en la casa
      └─ 16C (cortes de luz)               ← apaga las lámparas de la 16B
16D (sonido: motor nuevo, pasos, ambiente) ← independiente de las luces
 └─ 16E (música adaptativa)                ← usa el motor de sonido de la 16D
16F (habitaciones y sustos)                ← usa luces (16B) y sonidos (16D)
 └─ 16G (cierre)
```

---

## Etapa 16A — Día y noche ✅

### Qué se hizo
- **`Turno.js` (nuevo):** los dos turnos como datos (cielo, niebla, nubes, luz de ambiente, sol o luna, luces de
  adentro por piso y cuánto ven los enemigos) y la clase `Linterna` (un foco que sigue a quien lo lleva, con el
  haz visible si se quiere). Las luces nunca se agregan ni se sacan: se les cambia la intensidad (cambiar la
  cantidad de luces traba el juego un rato mientras se rearman los materiales).
- **Turno:** en el menú, "🎲 Al azar", "☀️ De día" o "🌙 De noche" (se recuerda en el navegador). Al azar se
  sortea mitad y mitad: al entrar al menú y al volver a jugar desde la pausa o el final; desde el menú se juega
  con el que se ve de fondo. El HUD y la pantalla "¡A recuperarlos!" dicen cuál tocó.
- **De día:** una tarde nublada con tormenta a lo lejos (cielo gris azulado, sol bajo y anaranjado, sombras largas).
- **De noche:** cielo casi negro con estrellas y la luna con su halo, niebla oscura, nubes grises, luz azulada de
  luna, las farolas de la vereda y la luz del porche prendidas, las ventanas de la casa con luz cálida adentro y
  algunas de las casas de enfrente encendidas. Adentro, mucho más oscuro.
- **La linterna de Tomi (F, solo de noche):** sale de la mano, hace sombras de verdad. De noche los vecinos ven
  más cerca (55%), pero con la linterna prendida ven más lejos que de día (120%); los perros ven casi igual (85%).
  Aviso al empezar de noche y "🔦 [F]" en el HUD.
- **Don Ernesto de noche:** lleva una linterna en la mano (la apunta para adelante y la mueve de un lado al otro
  cuando busca) y se ve el haz por los pasillos.
- **Menú nuevo (pedido del usuario):** la casa en 3D de fondo con la luz del turno elegido (al cambiar el turno,
  cambia en el momento), la cámara que se hamaca despacito, Don Ernesto en la puerta abierta bajo la luz del
  porche, Doña Pocha en el balcón (cada tanto apunta con el lanzarredes), los perros asomados detrás de los
  arbustos (de noche les brillan los ojos) y un relámpago cada 6 a 14 s (con trueno, si el sonido ya arrancó).
  Los textos pasan a un panel al costado y las instrucciones a una pantalla aparte ("❓ Cómo se juega").
- **Cinemáticas:** se ven con el turno que tocó ("Una noche cualquiera, en el barrio...").

### Pruebas que se corrieron
- Capturas del menú de día, de noche y con el relámpago; del jardín y del living de noche, con y sin linterna;
  de Don Ernesto con su linterna; de una toma de la intro de noche.
- Se encontraron y corrigieron:
  - La luz del porche y la linterna de Don Ernesto **atravesaban paredes y pisos** (Don Ernesto arriba iluminaba
    el living). El porche pasó a ser un foco que apunta hacia afuera, y la linterna de Don Ernesto solo alumbra
    (y se ve el haz) si está en tu mismo piso.
  - Las sombras de las linternas **se calculaban aunque estuvieran apagadas** (de día también): +7% a +17% de
    dibujos. Ahora solo se calculan cuando alumbran.
  - Una luz con sombra que nunca la dibujó **rompía el efecto de los bordes**: desde algunos ángulos la pantalla
    quedaba toda marrón. Ahora cada sombra se dibuja una vez al arrancar.
  - El panel del walkie quedaba tapado por el recuadro de abajo (que tiene una línea más).
- Visión de Don Ernesto (mismo lugar, distancias de 5 a 10,5 m): de día te ve en todas; de noche sin linterna
  hasta ~6,5 m; con linterna en todas.
- Sorteo: 1000 veces "al azar" → 489 noches. "Día" y "noche" fijos respetan la elección.
- Recorridos: menú → intro de noche → "¡A recuperarlos!" → partida con linterna → derrota → menú (todo vuelve a su
  lugar: actores, Facu, puerta, lente, linternas). 6 partidas simuladas (5 de noche): sin errores.
- Rendimiento (mismas 4 vistas, varias cargas): igual que antes de día y de noche (frente ~2270, Facu ~910,
  living ~1300, patio ~1590); con la linterna prendida, +3% a +17% (su sombra). Build OK.

### Plan original
- **El turno se sortea en cada partida** (mitad y mitad), y en el menú se puede elegir: "🎲 Al azar",
  "☀️ De día" o "🌙 De noche". El HUD y la pantalla "¡A recuperarlos!" dicen cuál tocó.
- **De día:** como ahora, pero una tarde nublada y más apagada (menos saturado, sombras más largas, una luz más
  anaranjada de atardecer). Adentro, las persianas a medio bajar: los cuartos quedan en penumbra.
- **De noche:** cielo azul oscuro con degradé, estrellas y luna (que ilumina con luz azulada y hace sombras),
  niebla oscura, el barrio con alguna ventana prendida, las farolas de la vereda encendidas y las ventanas de la
  casa con luz cálida desde afuera. Los grillos y el viento llegan en la 16D.
- **La linterna de Tomi (solo de noche, tecla F):** un cono de luz que sale de la cámara y se mueve un poquito
  al caminar. **Precio:** si Don Ernesto o Doña Pocha ven el haz, se dan cuenta más rápido (te ven desde más
  lejos), así que hay que apagarla cerca de ellos. Agachado y con la linterna apagada sos casi invisible.
- **Los enemigos de noche:** ven menos lejos en la oscuridad (salvo que tengas la linterna prendida o estés debajo
  de una lámpara); Don Ernesto lleva su propia linterna (se ve venir el haz por los pasillos).
- **Las cinemáticas** se ven con la luz del turno que tocó.
- **Menú nuevo (pedido del usuario):** de fondo, la casa en 3D con la luz del turno elegido (la cámara se mueve
  despacito); los perros asomados en el cerco del patio, Don Ernesto en la puerta y Doña Pocha en el balcón,
  mirando. Cada tanto, un relámpago (y el trueno, si el sonido ya arrancó). Los textos del menú pasan a un panel
  al costado (para que se vea la casa) y las instrucciones a una pantalla aparte ("❓ Cómo se juega").

### Cómo se prueba
- Capturas de los mismos lugares de día y de noche (afuera, el living, el sótano, el ático).
- Sorteo: 100 partidas → más o menos mitad y mitad; el menú respeta lo que elegiste.
- Linterna: con la linterna prendida, Don Ernesto te ve desde más lejos que con la linterna apagada (medido).
- Rendimiento: comparar dibujos y cuadros por segundo de día, de noche y de noche con linterna.

---

## Etapa 16B — Luces y atmósfera ✅

### Qué se hizo
- **`Lamparas.js` (nuevo): las lámparas alumbran de verdad.** Un grupo fijo de 6 focos que apuntan para abajo y se
  mudan a las lámparas más cercanas al jugador, en su piso (las de techo, las de pie y el velador). Cada foco tira un
  círculo de luz cálida en el piso y los rincones quedan oscuros. Para que no se "pase" a otro cuarto (no tienen
  sombra): el círculo no pasa de la pared más cercana y la luz no llega hasta el piso de abajo. Las bombitas y los
  plafones comparten material (para poder apagarlos todos juntos en la 16C).
- **Más contraste:** de día, menos luz pareja adentro (el "sol" de adentro y la luz ambiente bajaron) y las lámparas
  hacen el resto; de noche, las lámparas son la luz principal. El tono de sombra del dibujito es más oscuro (más de
  noche): `Materials.ponerContraste`, sin rearmar materiales.
- **`Atmosfera.js` (nuevo):**
  - La luz que entra por las ventanas: una mancha en el piso con la forma de los cuatro vidrios (cálida de día, azul
    de luna de noche). Las ventanas de los cuartos son de mentira, así que la luz también es "pintada".
  - El vidrio de las ventanas de adentro: celeste de día, azul oscuro de noche y, con tormenta, con gotas que chorrean.
  - Lluvia afuera (rayitas alrededor del jugador, que no caen adentro de la casa ni del garaje).
  - Polvo en el aire que solo se ve en el haz de la linterna.
- **Tormenta:** la mitad de las noches. Relámpagos cada 10 a 25 s en la partida (las ventanas y la mancha del piso se
  prenden de golpe, también desde adentro; en el sótano no se ven), trueno con retraso y la lluvia que se escucha
  (más sorda adentro, casi nada en el sótano). De día, cada tanto, un relámpago lejano (débil, trueno bajito y tarde).
  Las noches sin tormenta, noche clara con luna.
- **Efectos de pantalla (CSS):** viñeta (más fuerte de noche), grano de película suave y, con un enemigo a menos de
  9 m en tu piso, los bordes se cierran. Solo se les cambia la opacidad (lo más barato de animar).

### Pruebas que se corrieron
- Capturas de noche: living (lámpara del techo, de pie y velador), dormitorio del primer piso, pasillo, sótano con y
  sin linterna (con el polvo), el frente con lluvia y relámpago, el living durante un relámpago y el menú con lluvia.
  De día: living y cocina. En todas se ve por dónde ir.
- Se ajustó: de noche las lámparas estaban muy fuertes (todo el cuarto parejo, poco miedo): bajaron a 75%. La mancha de
  las ventanas casi no se notaba: subió. La luz de las lámparas llegaba demasiado abajo (se podía ver en el piso de
  abajo por el hueco de la escalera): ahora llega apenas 1 m más abajo del piso.
- Partidas simuladas: noche con tormenta (2 relámpagos), día (1 lejano), noche clara (ninguno); sin errores.
- Bordes de la pantalla con Don Ernesto a 12 / 7 / 4 / 2 m: 0 / 0,28 / 0,71 / 0,85.
- Rendimiento: con y sin las 6 luces nuevas, el tiempo por cuadro es el mismo (la diferencia queda dentro de lo que
  varía entre una medición y otra). Dibujos: iguales o menos que antes (frente ~2240, Facu ~905, living ~1150,
  patio ~1300). La lluvia y el polvo suman un dibujo cada uno, solo cuando se ven. Build OK.

### Plan original
- **Lámparas de verdad:** hoy los cuartos se iluminan con un "sol" de adentro; las lámparas del techo son de
  adorno. Ahora cada lámpara alumbra de verdad (luz cálida que cae en círculo, con rincones oscuros). Para que
  no se ponga lento, hay un **grupo fijo de luces** (unas 6) que se van mudando a las lámparas más cercanas al
  jugador; las lejanas quedan como "bombita prendida" sin luz real. (Cambiar la cantidad de luces le cuesta mucho
  a la placa de video; moverlas y cambiarles la intensidad, no.)
- **Más contraste:** menos luz ambiente pareja, más diferencia entre lo iluminado y lo oscuro. De día la luz entra
  por las ventanas (un rectángulo de luz en el piso); de noche, la luz azul de la luna por las ventanas.
- **Efectos de pantalla** (en CSS, baratos): viñeta (los bordes más oscuros, más fuerte de noche), grano de
  película muy suave y, cuando un enemigo está cerca, los bordes se cierran un poquito.
- **Tormenta (de noche, a veces):** relámpagos que iluminan todo de golpe por un instante (y se ve la silueta de
  las cosas por la ventana), con el trueno unos segundos después (en la 16D). Lluvia que se ve por las ventanas.
- **Polvo en el aire** con la linterna (las partículas que ya hay en el ático, también en los cuartos oscuros).

### Cómo se prueba
- Capturas de cada piso de día y de noche; que no quede nada negro del todo donde hay que pasar (siempre se tiene
  que poder ver por dónde ir, aunque sea con la linterna).
- Rendimiento: con las 6 luces, cuadros por segundo y dibujos en las vistas de siempre.

---

## Etapa 16C — Cortes de luz (solo de noche, solo cuando el jugador los provoca)

> Cambio pedido por el usuario: la luz **no se corta sola**; se corta solamente cuando el jugador baja la llave.

### Qué se hizo ✅
- **`CorteDeLuz.js` (nuevo):** el tablero de luz en el garaje (en la pared que da al living, al lado de la puerta),
  con su llave roja y una lucecita (verde: hay luz; roja: cortada). Con E se baja la llave (solo de noche; de día
  avisa que no cambia nada) y se puede volver a subir. Al cortar, las lámparas parpadean y se apagan; al volver,
  parpadean y se prenden. Se apagan: las 6 luces de las lámparas, las bombitas y los plafones, las lamparitas del
  sótano y del ático (el fuego de la caldera no), la luz del porche y las ventanas de la casa vistas desde afuera.
  Quedan la luna por las ventanas, las farolas de la calle y tu linterna.
- **Sin luz:** Don Ernesto y Doña Pocha ven al 35% (en vez de 55%); con la linterna prendida, al 150% (se nota
  muchísimo). Los perros, igual. Bajar la llave hace ruido (como una puerta).
- **Don Ernesto (`Dueno.js`):** al segundo y medio rezonga ("¡¿Otra vez la luz?!") y va al tablero con su linterna;
  si te ve en el camino te persigue y el tablero queda para después; si escucha algo, va a ver y después sigue.
  Al llegar sube la llave. Desde la segunda vez sospecha: después de arreglarla revisa el garaje (dos puntos).
  Para eso hay puntos nuevos en el garaje (`plantaBaja.js`): el garaje es su zona solo mientras dura eso.
- **Doña Pocha prende una vela** en su mesa de luz (con una luz que titila, solo si estás en su piso).
- **Facu lo comenta** por el walkie (la primera vez, y otra cosa cuando Don Ernesto ya sospecha).
- **Por las dudas:** si la luz estuvo cortada 75 s (Don Ernesto se trabó en algún lado), vuelve sola; y al empezar
  otra partida siempre vuelve.
- "Cómo se juega" tiene un consejo nuevo sobre el tablero.

### Pruebas que se corrieron
- Tres cortes seguidos con Don Ernesto de verdad (sin frenar a los enemigos): la primera vez va al tablero y la sube
  (~13 s desde el dormitorio); la segunda, la sube y revisa los dos puntos del garaje; la tercera estaba cerca,
  escuchó la llave, fue a ver y después la subió.
- El jugador sube la llave: Don Ernesto deja de ir. Reiniciar a mitad del corte: todo vuelve (luces, ventanas,
  Don Ernesto). Te ve en el camino: te persigue, te pierde y después igual arregla el tablero.
- De día: el tablero avisa y no corta nada. Visión: con luz 0,55 · sin luz 0,35 · sin luz con linterna 1,5.
- Capturas: el tablero, el living a oscuras, la vela de Doña Pocha y la casa desde afuera sin luz.
- Se encontró y corrigió: el aviso de "llegué al tablero" se borraba al reiniciar la partida (Don Ernesto llegaba
  pero la luz no volvía).
- Rendimiento: dibujos iguales que en la 16B (frente ~2250, Facu ~890, living ~1140, patio ~1280). Build OK.

### Plan original
- **El tablero de luz del garaje:** con E bajás la llave. Las lámparas parpadean, hacen "clac" y se apagan: solo
  quedan la luna por las ventanas y tu linterna.
- **Mientras no hay luz:** los enemigos ven mucho menos (pero tu linterna se nota muchísimo); Don Ernesto baja al
  tablero rezongando ("¡Otra vez la luz!") con su linterna y la vuelve a subir (se escucha el "clac" y las
  lámparas vuelven parpadeando). Doña Pocha prende una vela.
- Sirve para sacar a Don Ernesto de donde está y para moverte a oscuras, pero bajar la llave hace ruido y, desde
  la segunda vez, Don Ernesto sospecha: después de arreglarla se queda revisando el garaje.
- Facu lo comenta por el walkie ("¡Cortaste la luz! Aprovechá... pero cuidado").

### Cómo se prueba
- Varios cortes seguidos: la luz vuelve siempre (aunque se interrumpa por perder o pausar).
- Don Ernesto va al tablero y vuelve a su ronda; si te ve en el camino, te persigue (y el tablero queda para después).
- La segunda vez, se queda investigando el garaje.

---

## Etapa 16D — Sonido real ✅

### Qué se hizo
- **`Sonido.js` (nuevo): el motor.** Cada sonido con posición pasa por un "panner" de Web Audio (HRTF): suena del
  lado donde está, más bajo cuanto más lejos (se apaga a los 17 m, como antes) y, si hay una pared en el medio, más
  apagado (sin agudos); si está en otro piso, todavía más. Eco según el lugar (tres ecos armados con código):
  chiquito en los cuartos, corto y brillante en el baño, la cocina y los conductos, largo en el sótano y el ático,
  casi nada afuera. Sabe sobre qué está parado alguien: madera, cerámica, baldosas, alfombra, escalón, chapa
  (conductos y techo del garaje), pasto, piedra (entrada de autos, vereda, túnel).
- **`Audio.js`:** los efectos de siempre ahora pueden sonar en un lugar (`desde(posición, efecto)`) o con el eco
  del lugar (`enElMundo(efecto)`). Pasos según el piso, con dos capas y cada uno un poco distinto; a veces cruje
  una tabla. Don Ernesto pesado y grave, Doña Pocha arrastrando las pantuflas, los perros con las uñas (en el
  pasto, un trotecito). El ruido que escuchan los enemigos no cambió (`Noise.js` igual).
- **`Ambiente.js` (nuevo):** crujidos al azar cerca tuyo, el tic-tac de los relojes de pared, la heladera, la tele
  de Doña Pocha (murmullo de voces), las cañerías del sótano, una puerta que se golpea sola en otro piso cada tanto;
  afuera, el viento (más fuerte de noche y con tormenta, apagado adentro), pájaros de día, grillos de noche, perros
  lejos y algún auto que pasa. Sin luz se callan la heladera y la tele.
- **En la piel de Tomi:** el corazón late más fuerte y más rápido cuanto más cerca está un enemigo (70 a 150 por
  minuto; al máximo si te persiguen); después de correr, la respiración se agita; escondido con alguien cerca, la
  contenés, y cuando se va, un suspiro de alivio.
- **Grabados o hechos con código (decisión del usuario: ver las dos):** se bajaron, con permiso, dos packs CC0 de
  Kenney.nl ("Impact Sounds" y "RPG Audio") y quedaron solo los 44 sonidos que se usan (553 KB, en
  `public/sonidos/` con sus licencias): pasos en cada piso, puertas, crujidos, golpes, vidrio, ropa, traba y el
  tablero. `SonidosGrabados.js` los carga, los empareja de volumen y toca una versión al azar, un poco más aguda o
  más grave. En el menú se elige "🎙️ Grabados" o "🎛️ Hechos con código" (se recuerda; al elegir suenan unos pasos y
  una puerta para comparar). Si un grabado no carga, suena el de código.
- **Probador de sonidos** (en la consola, mientras se programa): `sonidos()`, `probarSonido('crujido')`,
  `probarSonido('pasoDueno', 'madera', {x, y, z})`, `probarPasos()` y `compararSonido('puerta')`.

### Pruebas que se corrieron
- Todos los efectos (77) sonaron sin errores, "acá" y ubicados en un punto.
- De qué lado viene (con un contexto de audio sin parlantes, midiendo cada oído): mirando al frente, un sonido a la
  derecha suena 3,8 veces más fuerte en el oído derecho, y al revés a la izquierda; girando la cámara, el lado
  acompaña. A 12 m suena 7 veces más bajo que a 4 m; desde otro piso, 2,5 veces más bajo y sin agudos.
- Superficies en 16 lugares (living, alfombra, cocina, baño, garaje, escalera, dormitorio, sótano, ático, caminos,
  pasto, vereda, patio, techo del garaje, conducto): todas bien después de corregir dos (la escalera no daba
  "escalón" y arriba del techo del garaje creía que estabas adentro).
- Volúmenes de los grabados medidos contra los de código: quedaron entre 2 y 4,5 veces más energía (un poco más
  presentes; la alfombra más, porque la de código casi no se escuchaba). Antes de ajustarlos eran hasta 300 veces.
- Partidas simuladas (noche, día, noche) y dos cortes de luz con los grabados: sin errores; ~0,3 ms por frame de
  lógica. Los sonidos ubicados que quedan a más de 17 m ni se arman (ahorra trabajo: los perros dan muchos pasos).
- Se encontró y corrigió: el juego no arrancaba (el menú marcaba el estilo de sonido antes de que existiera la UI).
- Build OK (los sonidos se copian al build).

### Plan original
- **Motor de sonido nuevo** (`Sonido.js`, reemplaza de a poco a `Audio.js`):
  - **Sonido que viene de un lado:** cada ruido de un enemigo o de la casa suena desde donde está (a la izquierda,
    a la derecha, adelante, atrás, más lejos o más cerca). Así sabés por dónde viene Don Ernesto sin verlo.
  - **Eco según el lugar:** el baño y la cerámica con eco corto y brillante, el sótano y el ático con eco largo,
    afuera casi sin eco. Las paredes "tapan" un poco el sonido (lo que está en otro piso suena apagado).
- **Pasos según el piso:** madera (y madera que cruje en algunas tablas), cerámica, baldosas, alfombra, pasto,
  chapa de los conductos y escalones; cada paso con dos capas (el golpe y el roce) y un poquito distinto del
  anterior. Los de Don Ernesto pesados, los de Doña Pocha arrastrando las pantuflas, los perros con las uñas.
  El ruidómetro no cambia: cambia cómo suena, no cuánto se escucha.
- **Ruidos de la casa** (ambiente): crujidos de madera al azar, el reloj de pared del living, la heladera, cañerías,
  el viento contra las ventanas, puertas que se golpean solas en otro piso, la tele de Doña Pocha de fondo;
  afuera, pájaros de día y grillos, perros lejanos y algún auto de noche; truenos y lluvia en la tormenta.
- **En la piel de Tomi:** el corazón late más fuerte y más rápido cuanto más cerca está un enemigo (y se dispara
  si te ve); la respiración se agita al correr y se contiene cuando estás escondido con alguien cerca.
- **Sonidos de verdad o sintetizados (el usuario quiere ver las dos alternativas):** primero se hace la versión
  con código; después, con permiso para descargar, se prueban packs CC0 de Kenney.nl para pasos, puertas y golpes.
  El probador de sonidos permite escuchar los dos y se elige cuál queda (o se mezclan).

### Cómo se prueba
- Un "probador de sonidos" en la consola del navegador para escuchar cada uno.
- Con los ojos cerrados (sin mirar), que se sepa de qué lado viene Don Ernesto.
- Que el ruido que escuchan los enemigos sea el mismo que antes (los radios de `Noise.js` no cambian).

---

## Etapa 16E — Música tensa y adaptativa

### Qué se hace
- **Música por capas** que se suman y se van según lo que pasa (programada con el reloj del audio, sin archivos):
  1. **Base** (siempre): un "colchón" grave y oscuro que respira despacio, distinto de día y de noche.
  2. **Pulso** (cuando hay un enemigo a menos de ~12 m, aunque no te vea): un bajo que late como un corazón.
  3. **Tensión** (cuando está muy cerca o te busca con "?"): cuerdas agudas y disonantes que suben.
  4. **Persecución** (te vio): batería, rápido; al perderte, baja de a poco en vez de cortarse.
- **Golpes de susto** (un "¡TAN!" disonante) cuando te ve Don Ernesto, cuando te enreda la red y en los sustos de la 16F.
- **Silencio a propósito:** a veces la música se calla del todo y solo quedan los ruidos de la casa (da más miedo).
- **Menú y cinemáticas:** una caja de música desafinada (en las cinemáticas cómicas, una versión más alegre).

### Cómo se prueba
- Escuchar cada capa sola y la mezcla; la música nunca tapa los pasos de los enemigos (se baja sola cuando suenan).
- Recorrido acercándose a Don Ernesto: las capas entran en orden y salen al alejarse.

---

## Etapa 16F — Habitaciones extrañas y oscuras + sustos

> Se hace en dos partes: **16F-1 cuartos nuevos ✅** y **16F-2 sustos ⏳ (próxima)**.

### 16F-1: qué se hizo ✅
- **Sala de los relojes** (planta baja, al fondo del living): un cuarto de 6 x 2,5 m con 11 relojes de pared de
  distintos tamaños y 3 relojes de pie. Suenan los 3 más cercanos y, cada 35 a 70 s, se paran todos juntos unos
  segundos.
- **Vestidor** (primer piso, al fondo del dormitorio): angosto, sin lámpara, con ropa colgada que se hamaca al
  pasar y el placard del dormitorio (escondite) al fondo.
- **Rincón de las sábanas** (ático, lado del garaje): 7 sábanas colgadas de sogas que se mueven al pasar; detrás
  hay un maniquí.
- **El taller** (garaje): la luz de tubo se cambió por una lamparita que se balancea sobre la mesa de trabajo; su
  círculo de luz se mueve con ella.
- Don Ernesto patrulla la sala de los relojes y el vestidor (puntos de recorrido nuevos). Un lugar de juguete nuevo
  en cada cuarto, y Facu los nombra bien en las pistas.
- **No se hizo el cuarto clausurado** del segundo piso: no hay lugar sin mover la escalera del ático o achicar la
  sala de trofeos. Queda como decisión del usuario.

### 16F-1: pruebas
- Todos los tramos del recorrido de Don Ernesto se pueden caminar; llega a la sala de los relojes, al vestidor y
  al rincón del ático. Los juguetes de los tres lugares nuevos se pueden mirar y agarrar. Las telas se hamacan al
  pasar (hasta 0,5 rad) y se frenan solas. Dos partidas simuladas sin errores. Capturas de los cuatro lugares.

### Plan original
- **Cuartos nuevos** (dividiendo los cuartos más grandes, que hoy miden 6 x 12 m, y aprovechando el ático):
  - **Sala de los relojes** (planta baja, al fondo del living): decenas de relojes que hacen tic-tac... y a veces
    se paran todos juntos.
  - **Vestidor** (primer piso, al fondo del dormitorio): angosto y oscuro, con ropa colgando que se mueve al pasar
    (y es escondite).
  - **El cuarto clausurado** (segundo piso): la puerta tiene tablas clavadas; se entra solo por el conducto. Adentro,
    los muebles tapados con sábanas.
  - **El rincón de las sábanas** (ático): sábanas colgadas de sogas que forman un laberinto; detrás de una hay un
    maniquí.
  - **El taller** (sótano o garaje): herramientas colgadas, un banco de trabajo y una lámpara que se balancea.
  - Los caminos de Don Ernesto, los escondites, los lugares de los juguetes y las pistas de Facu se actualizan.
- **Sustos y cosas raras** (ninguno te hace perder, pero algunos hacen ruido y atraen a Don Ernesto):
  - El maniquí gira la cabeza cuando no lo mirás.
  - La mecedora vacía se hamaca sola; la caja de música se pone a sonar.
  - Un teléfono que suena de golpe (si no lo atendés, Don Ernesto viene).
  - La tele que se prende sola con estática.
  - Un cuadro que se cae; una puerta que se cierra sola de un portazo.
  - Una muñeca que aparece en otro lugar cada vez que volvés.
  - Tablas flojas que crujen fuerte si las pisás corriendo.
  Cada susto pasa como mucho una vez por partida y con tiempo entre uno y otro, para que no canse.

### Cómo se prueba
- Recorridos de Don Ernesto por todos los cuartos nuevos (que no se trabe en las puertas ni en las sábanas).
- Los juguetes en los lugares nuevos: todos se pueden mirar y agarrar; las pistas de Facu nombran bien los cuartos.
- Cada susto disparado a mano y en partidas simuladas (que no se repitan ni se pisen).

---

## Etapa 16G — Cierre

- Volver a correr todas las pruebas de todas las etapas (de día y de noche).
- Rendimiento final en las vistas de siempre, de día, de noche y en un corte de luz.
- Optimización pendiente: el cartel de ayuda de la mira tira un rayo contra toda la escena en cada frame
  (se puede limitar a lo que está cerca).
- README con todo lo nuevo (día y noche, linterna, cortes de luz, cuartos nuevos).

---

## Riesgos

| Riesgo | Qué hacemos |
|---|---|
| Muchas luces = el juego se pone lento | Grupo fijo de 6 luces que se mudan; sombras solo en la luna/sol y la linterna; medir en cada etapa |
| Demasiado oscuro: no se ve por dónde ir | Siempre algo de luz de luna o de lámpara en los lugares de paso; la linterna; probar con capturas |
| Da demasiado miedo para el tono del juego | Miedo "de película para chicos": sustos sin sangre, el humor de las cinemáticas se queda |
| La música tapa los pasos de los enemigos | La música baja sola cuando suena un paso cercano; volumen de música separado |
| Los cuartos nuevos rompen los caminos de Don Ernesto o los lugares de los juguetes | Se prueban todos los recorridos y los 42+ lugares de juguetes otra vez |
| Los cortes de luz frustran | Duran poco, avisan (parpadeo antes), y la linterna siempre funciona |

---

## Decisiones (propuestas, se pueden cambiar)

| Decisión | Propuesta |
|---|---|
| ¿Día o noche? | ✅ Confirmado: 50/50 o elegido en el menú ("🎲 Al azar", "☀️ De día", "🌙 De noche") |
| ¿Linterna? | Sí, solo de noche, con la tecla F; prendida te ven desde más lejos |
| ¿Cada cuánto se corta la luz? | ✅ Cambiado por el usuario: nunca sola, solo cuando el jugador baja la llave del tablero |
| ¿Cuánto miedo? | ✅ Confirmado: de película para chicos, tipo "Escalofríos" (tensión, sombras y sustos, sin sangre); el humor de las cinemáticas se queda |
| Menú | ✅ Pedido del usuario: la casa en 3D de fondo, de día o de noche, con los perros asomados, Don Ernesto y Doña Pocha mirando y relámpagos |
| **¿Sonidos sintetizados o grabados?** (✅ el usuario quiere ver las dos alternativas en la 16D) | **Para que suenen "reales" de verdad, conviene usar sonidos grabados libres (CC0, como los packs de audio de Kenney.nl, que ya usamos para los modelos): pasos sobre distintos pisos, puertas, golpes. La música y el ambiente se siguen haciendo con código. Hay que descargar los packs (se pide permiso antes de bajar cada uno).** Si se prefiere no descargar nada, todo se hace con código (suena más "de videojuego"). |
