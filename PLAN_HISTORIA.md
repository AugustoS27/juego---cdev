# Plan de acción — Nueva historia (etapa 15)

Este documento es la tercera parte del plan (la segunda, etapas 9 a 14, está en [PLAN.md](PLAN.md) y está
terminada). Acá se detalla el cambio de historia y todo lo que viene con él.

> **Estado actual:** 🔨 en curso. **15A** ✅, **15B** ✅. Próxima: **15C**.

---

## La historia nueva

Ya no sos un ladrón. Sos **Tomi**, un nene del barrio. Cada vez que la pelota (o el autito, o el avión) cae en
el jardín de los vecinos, **Don Ernesto y Doña Pocha** se lo quedan: "¡Lo que cae en mi jardín es mío!".
Ya tienen media juguetería guardada adentro de la casa y no piensan devolver nada.

Hoy Tomi se cansó: se va a meter a recuperar **3 juguetes**. Su amigo **Facu** lo ayuda desde la vereda con un
**walkie-talkie**: desde la ventana de su casa, con los binoculares, vio dónde los guardaron los vecinos.

- **Don Ernesto** (el viejo, antes "el dueño"): recorre toda la casa en pijama y bata. Si te agarra, perdés.
- **Doña Pocha** (la vieja, antes "la abuela"): ya no tiene escopeta, tiene un **lanzarredes**. Si te da, quedás
  **paralizado 3 segundos** (y el ruido atrae a Don Ernesto).
- **Firulais y Manchita**, los perros del patio, siguen igual.
- **Ganás** cuando volvés a la vereda, donde Facu te espera con las bicis, con los 3 juguetes.

---

## Resumen de las etapas

| Etapa | Contenido | Tamaño | Estado |
|---|---|---|---|
| **15A** | Historia y juguetes: 3 juguetes (de 8), textos nuevos en todo el juego, Facu y las bicis en vez de la van | Grande | ✅ Terminada |
| **15B** | Walkie-talkie: Facu da las pistas por radio (cada vez más precisas) y comenta lo que pasa | Mediana | ✅ Terminada |
| **15C** | Doña Pocha y su lanzarredes: la red vuela, te paraliza 3 s y hace ruido | Mediana | ⏳ Próxima |
| **15D** | Diseños nuevos: Don Ernesto y Doña Pocha (más detalle y animaciones); Tomi y Facu para las cinemáticas | Mediana | — |
| **15E** | Cinemáticas: la intro que cuenta la historia, la de victoria y la de derrota | Grande | — |
| **15F** | Música y pasos nuevos + cierre (todas las pruebas, rendimiento, README) | Mediana | — |

Igual que antes: **una etapa por vez**, se prueba, se muestra y se espera la confirmación antes de seguir.
Un commit por etapa (cuando se pida).

### Orden y dependencias

```
15A (historia y juguetes)   ← todo lo demás habla de juguetes, Tomi, Facu y los vecinos
 ├─ 15B (walkie-talkie)      ← las pistas son sobre los juguetes de 15A
 ├─ 15C (lanzarredes)        ← independiente, pero usa los textos nuevos
 └─ 15D (diseños)            ← los personajes que después salen en las cinemáticas
      └─ 15E (cinemáticas)   ← necesita a Tomi, Facu y los vecinos ya diseñados
           └─ 15F (audio y cierre) ← la música de las cinemáticas se arma acá; al final, todas las pruebas
```

---

## Etapa 15A — Historia y juguetes ✅

### Qué se hizo
- **8 juguetes** en `Items.js` (pelota de fútbol, autito a control remoto, robot, oso de peluche, dinosaurio,
  avioncito, cohete y consola), cada uno con 5 o 6 lugares posibles (los mismos lugares que usaban los objetos
  de antes). Se sortean 3 por partida. La "zona para apuntar" ahora va en el centro de cada juguete (los hay
  más altos, como el robot o el cohete).
- **HUD:** "🧸 Juguetes 1/3" con el ícono y el nombre de cada uno; con los tres: "🚲 ¡Los tenés todos! Volvé con Facu".
- **Facu y las bicis** (`Escape.js`) en la entrada de autos, donde estaba la van. Facu sostiene el walkie y,
  cuando tenés los tres, te saluda con el brazo. Si llegás antes: "¡Todavía no! Te faltan 2 juguetes".
- **Textos nuevos:** título "Operación Juguetes", menú (objetivo, consejos, botón "¡A jugar!"), pausa, avisos
  ("Don Ernesto escuchó algo..."), pantallas finales y frases de derrota ("Don Ernesto te agarró de una oreja y
  te llevó hasta tu casa..."). Al ganar suena un timbre de bici en vez del motor de la van.
- Lo de la escopeta de Doña Pocha queda para la 15C.

### Pruebas que se corrieron
- Sorteo: 200 partidas → siempre 3 juguetes distintos en lugares distintos; los 8 salen parecido (67 a 81 veces).
- Los 8 juguetes en sus 42 lugares: todos se pueden mirar y agarrar desde algún punto.
- Recorrido completo: llegar antes de tiempo (aviso de Facu), agarrar los tres (avisos y HUD), volver a la zona
  → pantalla de victoria con el texto nuevo.
- Búsqueda de textos viejos ("robar", "ladrón", "botín", "van", "el dueño", "la abuela") en lo que ve el jugador:
  no queda ninguno (solo los de la escopeta, que cambian en la 15C).
- 6 partidas simuladas con enemigos: sin errores. Build OK.

### Plan original

### Qué se hace
- **Juguetes en vez de objetos** (`Items.js`): se sacan los 18 objetos y entran **8 juguetes** hechos con formas
  básicas (pelota de fútbol, autito a control remoto, robot, oso de peluche, dinosaurio, avioncito, cohete y
  consola). Cada partida se sortean **3**, cada uno en una de sus ubicaciones (se reusan los lugares que ya
  existen: mesas, camas, estantes, bañeras...).
- **Sabés qué buscar:** el HUD muestra "🧸 Juguetes 1/3" y el **nombre y el ícono** de cada juguete (ya no hay
  acertijos; las pistas de dónde están llegan por el walkie en la 15B).
- **Facu y las bicis en vez de la van:** en la entrada de autos, donde estaba la van, quedan las dos bicis y
  Facu esperando (un muñeco simple por ahora; el diseño lindo va en la 15D). La zona de escape es al lado.
- **Textos nuevos en todo el juego:** título, menú (objetivo, consejos, botón), avisos, HUD, pantallas de
  victoria y derrota (frases nuevas: "Don Ernesto te agarró de una oreja y te llevó hasta tu casa...").
  Los perros siguen igual.
- Los archivos `Dueno.js` y `Abuela.js` quedan con su nombre (así no se rompe nada), con el comentario de arriba
  actualizado ("el dueño" = Don Ernesto, "la abuela" = Doña Pocha). Los textos de la escopeta se cambian en la 15C.

### Archivos
`Items.js`, `Escape.js`, `UI.js`, `Game.js`, `index.html`, `style.css`, `Dueno.js`, `Abuela.js` (comentarios),
`Habilidades.js` (textos), README.

### Cómo se prueba
- Sorteo: 200 partidas → siempre 3 juguetes distintos, en lugares distintos, todos alcanzables (que se puedan
  mirar y agarrar desde algún lado).
- HUD y avisos con los textos nuevos; la zona de escape solo se activa con los 3.
- Buscar con el navegador que no quede ningún "robar", "ladrón", "botín" o "van" en lo que ve el jugador.
- Partidas simuladas sin errores.

---

## Etapa 15B — Walkie-talkie y pistas de Facu ✅

### Qué se hizo
- **`Walkie.js` (nuevo):** la cola de mensajes, las frases (como datos) y las pistas. No dibuja nada: Game le
  pregunta qué texto mostrar y se lo pasa a `UI.js`.
- **Pistas en tres niveles**, armadas solas: el piso y el cuarto salen de la posición del juguete (las
  habitaciones de `HouseData.js`); el lugar exacto es el `lugar` de la ubicación, que ahora es una frase
  ("en la mesa con sombrilla del patio"). En el ático, que es una sola habitación, dice de qué lado.
  Afuera dice "el patio de los perros" o "el jardín".
- **Al empezar** (a los 1,5 s) Facu saluda y dice el nivel 1 de los tres juguetes en un solo mensaje.
- **T:** pista más precisa del juguete que falte y del que menos se sepa. Espera de 20 s (se ve abajo de la
  lista: "Facu está mirando... 12 s"; si apretás antes, un aviso te dice cuánto falta) y un ruido de 3 m.
  Cuando ya dijo todo: "Ya te dije todo lo que vi, Tomi. ¡Vos podés!".
- **HUD:** abajo de cada juguete queda anotado lo que sabés ("📻 Primer piso · cuarto de Doña Pocha").
- **Panel del walkie** abajo a la izquierda (carita de Facu, texto letra por letra, "kshhh" al empezar y
  terminar y una vocecita de pitidos mientras escribe).
- **Comentarios:** al entrar a la casa (una vez), cuando te ve Don Ernesto, los perros o te apunta Doña Pocha
  (urgentes: pasan adelante y cortan el mensaje que se estaba mostrando; cada uno como mucho cada 40 s), al
  recuperar un juguete, con los tres ("¡Volvé a la entrada de autos!") y si pasan 90 s sin novedades
  ("¿Estás perdido? Apretá T").
- Las frases están escritas sin "lo/la" ni "tuyo/tuya", para que sirvan para cualquier juguete.
- Menú: la tecla T en los controles y un consejo nuevo.

### Pruebas que se corrieron
- Las tres pistas de los 42 lugares, leídas una por una (se corrigió "la mesa del jardín", que está en el patio).
- T: la primera da pista y hace ruido (3 m); la segunda enseguida avisa "probá en 20 s"; después de esperar,
  sube de nivel el juguete del que menos se sabe; con todo dicho, "Ya te dije todo".
- Un comentario urgente (te vio Don Ernesto) corta el mensaje que se estaba mostrando; repetido a los pocos
  segundos, no se vuelve a decir.
- Entrar a la casa, recuperar un juguete y la ayuda a los 90 s: cada uno una vez.
- Se encontraron y corrigieron dos frases que quedaban mal con juguetes femeninos ("la consola lo tienen").
- 6 partidas simuladas apretando T: sin errores (5 o 6 mensajes de Facu por minuto). Build OK.

### Plan original

### Qué se hace
- **Panel del walkie** abajo a la izquierda: la carita de Facu, el texto que aparece letra por letra y un
  "kshhh" de radio al empezar y terminar cada mensaje.
- **Pistas en tres niveles** para cada juguete, armadas solas con los datos de la ubicación:
  1. el piso ("Me parece que la pelota está en el sótano..."),
  2. el cuarto ("...en el baño de arriba"),
  3. el lugar exacto ("¡Está adentro de la bañera!").
  Al empezar, Facu da la pista 1 de cada juguete. Con **T** le pedís otra más precisa del juguete que te falte.
  **Precio:** después de pedir hay que esperar 20 s, y el walkie hace un ruidito (radio 3 m): no lo uses al
  lado de Don Ernesto.
- **Comentarios automáticos** de Facu (sin abusar, con un tiempo mínimo entre uno y otro): al entrar a la casa,
  al agarrar un juguete, cuando Don Ernesto te persigue, cuando Doña Pocha te apunta, cuando te ladran los
  perros y cuando ya tenés los 3 ("¡Volvé a la vereda, te espero con las bicis!").
- Un archivo nuevo, `Walkie.js`, con las frases como datos.

### Cómo se prueba
- Para cada juguete y cada ubicación se generan las tres pistas y se revisan a mano (que tengan sentido).
- T: la espera de 20 s, el ruido de 3 m, que no repita una pista que ya dio.
- Los comentarios no se pisan entre ellos (cola de mensajes).

---

## Etapa 15C — Doña Pocha y su lanzarredes

### Qué se hace
- **Lanzarredes** en vez de escopeta: mismo aviso de 1 s apuntando (rayito y "clic"), pero al disparar sale
  **una red que vuela** (se ve en el aire, tarda un poquito: se puede esquivar corriendo de costado).
- Si te da: **quedás paralizado 3 s** (no te podés mover ni esconder, la red se ve sobre la pantalla y la cámara
  forcejea). El "¡FUAP!" hace ruido: Don Ernesto viene a ver. Si te agarra mientras estás en la red, perdés.
- Al soltarte, **2 s en los que no te puede volver a enredar** (para que no te deje atrapado para siempre).
- Si erra, la red queda tirada en el piso o colgando del mueble donde pegó (en vez de los agujeros de perdigón).
- Se cambian textos, sonidos ("fuap" en vez de "¡BANG!") y la mira.

### Cómo se prueba
- Dispararle al jugador quieto, corriendo de costado y escondido detrás de un mueble (probabilidades como antes).
- Paralizado: 3 s exactos sin moverse; después 2 s de inmunidad.
- Red + Don Ernesto cerca: llega y te atrapa. Sin Don Ernesto: seguís jugando.

---

## Etapa 15D — Diseños nuevos de los personajes

### Qué se hace
Siguen hechos con formas básicas (estilo dibujito, con bordes), pero con más detalle y mejores proporciones:
- **Don Ernesto:** pelado con pelos blancos a los costados, cejas tupidas, bigote grande, anteojos, orejas,
  nariz de papa, bata a cuadros con bolsillos, pijama a rayas, pantuflas; manos y brazos con codo.
  Animaciones: mueve la cabeza al buscar, brazos al caminar, se enoja (se pone colorado al perseguir).
- **Doña Pocha:** ruleros con pañuelo, anteojos grandes, cachetes, saquito tejido con botones, pollera,
  pantuflas de conejito; el lanzarredes (tubo con la red asomando). Se hamaca y teje sentada.
- **Tomi y Facu** (para las cinemáticas): gorrita, remera, zapatillas; Facu con binoculares y walkie.
- Todos en un archivo nuevo, `Personajes.js`, para usarlos en el juego y en las cinemáticas.

### Cómo se prueba
- Capturas de cada personaje de frente, de costado y animándose.
- Que sus cajas de choque y la altura de los ojos sigan igual (la visión y los caminos no cambian).
- Rendimiento: comparar llamadas de dibujo antes y después.

---

## Etapa 15E — Cinemáticas

### Qué se hace
- **Sistema de cinemáticas** (`Cinematica.js`): una cinemática es una lista de "tomas", cada una con dónde
  arranca y termina la cámara, a dónde mira, cuánto dura, quién habla y qué dice. Barras negras arriba y
  abajo, subtítulos con el nombre del personaje, y **Espacio para saltearla**. Mientras dura, el juego está quieto.
- **Intro** (al tocar "Jugar", una sola vez por sesión; se puede volver a ver desde el menú):
  la pelota cae en el jardín → Don Ernesto la agarra ("¡Lo que cae en mi jardín es mío!") → la cámara muestra
  la casa, los perros y a Doña Pocha con el lanzarredes en la ventana → Tomi y Facu en la vereda arman el plan
  ("Yo te guío por el walkie") → arranca el juego.
- **Victoria:** Tomi llega a la vereda con los juguetes, se suben a las bicis y se van; Don Ernesto grita
  desde la puerta.
- **Derrota:** corta, según quién te agarró (Don Ernesto te lleva de la oreja hasta la vereda; un perro te
  tironea del pantalón).

### Cómo se prueba
- Cada cinemática de punta a punta y salteada en distintos momentos: el juego arranca bien (jugador en su
  lugar, enemigos reiniciados, sin teclas trabadas).
- Que no se vea a través de paredes ni personajes cortados en ninguna toma (capturas).

---

## Etapa 15F — Música, pasos y cierre

### Qué se hace
- **Música nueva** con un secuenciador chiquito (sigue sin archivos de audio: todo Web Audio):
  bajo + melodía + percusión (bombo, redoblante y platillo hechos con ruido filtrado), programados con
  anticipación con el reloj del audio (más prolijo que nota por frame). Temas: **menú/cinemáticas** (aventura
  alegre), **sigilo** (pizzicato de puntillas) y **persecución** (rápido, con batería). Al cambiar de tema, un
  fundido corto en vez de un corte. Un poco de eco (reverb) para que suene más lleno.
- **Pasos nuevos:** cada paso tiene dos capas (el golpe del talón + el roce), con variaciones al azar para que
  no suenen todos iguales, un poquito a la izquierda y a la derecha, y **según el piso**: madera, cerámica o
  baldosas, pasto, alfombra, chapa (conductos) y escalera. Los pasos de Tomi son más livianos que los de
  Don Ernesto (y los de Doña Pocha arrastran las pantuflas).
- **Cierre:** volver a correr todas las pruebas (de todas las etapas), medir el rendimiento, actualizar el README.

### Cómo se prueba
- Escuchar cada tema y cada tipo de paso (se deja un "probador de sonidos" en la consola del navegador).
- Que el ruido que ven los enemigos (el ruidómetro) no cambie: cambia cómo suena, no cuánto se escucha.

---

## Riesgos

| Riesgo | Qué hacemos |
|---|---|
| Cambiar textos rompe algo que dependía de ellos | Los textos están en los datos y en `UI.js`; después de la 15A se buscan restos con el navegador |
| Las cinemáticas atraviesan paredes | Tomas cortas, con puntos elegidos a mano y revisadas con capturas |
| La red de Doña Pocha frustra (te deja trabado) | 3 s, inmunidad de 2 s después, y solo perdés si Don Ernesto llega |
| La música nueva cansa o tapa los efectos | Volumen de música más bajo que los efectos y tecla M para silenciar |
| Más detalle en los personajes = más lento | Medir llamadas de dibujo antes y después de la 15D |

---

## Decisiones (propuestas, se pueden cambiar)

| Decisión | Propuesta |
|---|---|
| Título del juego | **Operación Juguetes** |
| Nombres | Tomi (el nene), Facu (el amigo), Don Ernesto y Doña Pocha (los vecinos). Los perros siguen siendo Firulais y Manchita |
| ¿Juguetes fijos o sorteados? | Se sortean 3 de 8, así cada partida es distinta |
| ¿Dónde termina? | En la vereda, donde Facu espera con las bicis (donde estaba la van) |
| ¿Cómo se piden pistas? | Tecla T, con 20 s de espera y un ruidito |
| ¿La red te hace perder? | No: te paraliza 3 s; perdés solo si Don Ernesto te agarra |
| Habilidades (zanahoria, botas, bebida) | Se quedan igual |
