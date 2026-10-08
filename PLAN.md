# Plan de acción — El Ladrón Torpe (segunda parte)

Este documento detalla las etapas para las mejoras nuevas del juego: qué se va a hacer en cada una,
en qué orden, qué archivos se tocan, cómo se prueba y qué decisiones quedan pendientes.

> 👉 **La etapa 15 (nueva historia: Tomi recupera sus juguetes) está en [PLAN_HISTORIA.md](PLAN_HISTORIA.md).**
>
> **Estado actual:** ✅ **todas las etapas terminadas** (1 a 14). La 14 se dividió en tres: **14A** animaciones,
> **14B** entradas nuevas y **14C** escondites nuevos y cierre.

---

## Índice

1. [Principios de trabajo](#principios-de-trabajo)
2. [Resumen de las etapas](#resumen-de-las-etapas)
3. [Orden y dependencias](#orden-y-dependencias)
4. [Etapa 9 — Saltar y agacharse ✅](#etapa-9--saltar-y-agacharse-)
5. [Etapa 10 — Cinco objetos y escapar ✅](#etapa-10--cinco-objetos-y-escapar-)
6. [Etapa 11 — La casa gigante](#etapa-11--la-casa-gigante)
7. [Etapa 12 — Enemigos nuevos: perros y abuela](#etapa-12--enemigos-nuevos-perros-y-abuela)
8. [Etapa 13 — Objetos de habilidad ✅](#etapa-13--objetos-de-habilidad-)
9. [Etapa 14 — Pulido: animaciones, entradas y escondites ✅](#etapa-14--pulido-animaciones-entradas-y-escondites-)
10. [Riesgos y cómo los manejamos](#riesgos-y-cómo-los-manejamos)
11. [Decisiones pendientes](#decisiones-pendientes)
12. [Historial (etapas 1 a 14)](#historial-etapas-1-a-14)

---

## Principios de trabajo

Son los mismos que usamos desde el principio, porque el proyecto tiene que ser fácil de entender y explicar:

- **Código simple y comentado en español.** Nada de librerías de física ni pathfinding avanzado.
- **Todo lo que se pueda, como datos.** La casa, los objetos, los enemigos y las habilidades se describen en
  arreglos (como `HouseData.js`), y el código los lee.
- **Formas básicas + modelos.** Cada cosa se arma primero con formas básicas (que también son su colisión) y
  después se reemplaza por un modelo de Kenney si hay uno. Si el modelo no carga, el juego funciona igual.
- **Una etapa por vez.** Al terminar cada etapa se prueba, se muestra y se espera la confirmación antes de
  pasar a la siguiente.
- **Pruebas en cada etapa.** Simulaciones desde la consola del navegador: recorridos del dueño, que todo sea
  alcanzable, que las puertas funcionen, partidas completas sin errores. Al final de cada etapa se vuelven a
  correr las pruebas de las etapas anteriores.
- **Un commit por etapa** (cuando se confirme la etapa).

---

## Resumen de las etapas

| Etapa | Contenido | Tamaño | Estado |
|---|---|---|---|
| **9** | Saltar y agacharse | Mediana | ✅ Terminada |
| **10** | Cinco objetos para robar + zona de escape | Mediana | ✅ Terminada |
| **11** | Casa gigante: pisos, sótano, ático, puentes, túneles, ventilaciones, decoración | Muy grande (se divide en 11A, 11B y 11C) | ✅ Terminada (11A, 11B y 11C) |
| **12** | Enemigos nuevos: dos perros y la abuela con escopeta | Grande | ✅ Terminada |
| **13** | Objetos de habilidad: zanahoria, botas de lana, bebida energética | Mediana | ✅ Terminada |
| **14** | Pulido: animaciones, más entradas, más escondites | Grande (se divide en 14A, 14B y 14C) | ✅ Terminada (14A, 14B y 14C) |

---

## Orden y dependencias

```
Etapa 9  (saltar / agacharse)
   │   las ventilaciones y túneles necesitan agacharse;
   │   los puentes y algunos atajos necesitan saltar
   ▼
Etapa 10 (5 objetos + escape)
   │   cambia el objetivo del juego: conviene tenerlo antes de agrandar el mapa,
   │   así la casa nueva se diseña pensando en dónde van los objetos y la salida
   ▼
Etapa 11 (casa gigante)
   │   define el mapa final: habitaciones, pisos, waypoints
   ▼
Etapa 12 (perros y abuela)  ← sus recorridos (waypoints) dependen del mapa final
   ▼
Etapa 13 (habilidades)      ← se reparten por la casa y el patio definitivos
   ▼
Etapa 14 (pulido)           ← animaciones, entradas y escondites sobre el mapa terminado
```

---

## Etapa 9 — Saltar y agacharse ✅

**Objetivo:** dos movimientos nuevos que cambian cómo se juega el sigilo.

### Qué se hizo
- **Saltar (Espacio):** salto de unos 85 cm con gravedad. Se puede subir arriba de muebles (mesas, sillón,
  mesa ratona) y quedarse parado ahí. Los placards, paredes y cercas no se pueden saltar.
- **Agacharse (mantener C):** mitad de velocidad, no se puede correr, la cámara baja y la caja de colisión se
  achica (entra por lugares bajos). Si hay algo arriba, no se puede parar hasta salir.
- **Pasos con ruido según el movimiento:**

  | Movimiento | Radio del ruido |
  |---|---|
  | Agachado | 1 m |
  | Caminando | 3 m (antes caminar no hacía ruido) |
  | Corriendo | 7 m |
  | Saltar | 2 m |
  | Aterrizar desde alto | 5 m |

- **Ruidómetro** en el HUD: muestra cuánto ruido hacen tus pasos en este momento.
- **Efecto extra:** agachado detrás de un mueble, el dueño no te ve (su rayo de visión apunta a tus ojos).

### Archivos
`Player.js` (reescrito), `Noise.js`, `Game.js`, `UI.js`, `Audio.js`, `index.html`, `style.css`.

### Cómo funciona (para explicarlo)
- La **velocidad vertical** baja todo el tiempo por la gravedad; saltar es darle un valor positivo.
- La **"base"** es lo más alto que hay debajo de los pies: el piso (rayo hacia abajo) o la tapa de un mueble
  (cajas de colisión). Si estás cerca de la base, te apoyás en ella.
- **Agachado** la caja del jugador mide 1.05 m en vez de 1.7 m; para pararse se prueba la caja alta.

---

## Etapa 10 — Cinco objetos y escapar ✅

### Qué se hizo
- **18 objetos** (los 6 de antes + dentadura postiza, reloj de oro, anteojos, billetera, alcancía chanchito,
  trofeo, mate, peluca, teléfono antiguo, gnomo de porcelana, pava y cepillo de dientes), cada uno con su
  acertijo y 3 o 4 ubicaciones (71 en total, dos afuera: la mesa del jardín y la cucha).
- **Sorteo:** se mezclan los objetos y se toman 5; a cada uno se le elige una ubicación que no esté a menos
  de 80 cm de otro objetivo del mismo piso.
- **Van negra** "NO SOMOS LADRONES S.A." estacionada en la entrada de autos, con las puertas traseras abiertas.
  Atrás tiene la **zona de escape**: un círculo gris que se pone verde, late y muestra una flecha cuando tenés
  los cinco. Si llegás antes, el cómplice te avisa cuántos te faltan.
- **HUD:** lista del botín arriba a la izquierda (cada pista se tilda al encontrar su objeto) y contador 🎒 3/5.
- Sonidos nuevos: guardar en la bolsa, "¡tenés todo!" y el motor de la van al escapar.
- Cada ubicación puede tener `rot` para girar el objeto hacia donde viene el jugador (ej: el disco del teléfono).

### Pruebas que se corrieron
- 2000 sorteos: siempre 5 objetos distintos y en lugares distintos; los 18 salen con frecuencia pareja.
- Las 71 ubicaciones se pueden ver y agarrar parado desde al menos 5 posiciones cercanas (arriba de la heladera
  es la más difícil: conviene saltar para verla).
- Entrar a la zona con 0 y con 4 objetos no gana (un solo aviso al entrar); con 5, caminando, gana.
- Reiniciar vuelve todo a cero; la van y sus puertas tienen colisión; partida de 20 s sin errores; build OK.

### Plan original

**Objetivo:** en vez de un objeto, hay que robar **cinco** y después **escapar** para ganar.

### Mecánica
1. Al empezar la partida se sortean **5 objetos distintos** de una lista mucho más grande.
2. Cada uno tiene su pista (acertijo) y varias ubicaciones posibles; se sortea una por objeto, **sin repetir
   lugar** entre los cinco.
3. Al agarrar un objeto: desaparece de la casa, se tacha su pista en el HUD y suena un sonido.
4. Con los cinco en la bolsa se activa la **zona de escape**. Si llegás ahí con los cinco, ganás.
   Si llegás antes, un aviso te dice cuántos te faltan.

### Lista ampliada de objetos (propuesta, ~18)
Los 6 actuales (llaves, control remoto, cargador, sartén, abrelatas, patito) más, por ejemplo:

| Objeto | Pista (idea) | Dónde puede estar |
|---|---|---|
| Dentadura postiza | "Sonrío de noche dentro de un vaso de agua" | Baño, mesa de luz |
| Reloj de oro | "Tengo agujas pero no coso" | Escritorio, cómoda |
| Anteojos | "Sin mí, el dueño no ve ni el diario" | Mesa de luz, living |
| Billetera | "Gordita de papeles, flaca de billetes" | Mueble de la entrada, campera |
| Alcancía chanchito | "Como monedas y nunca engordo... bueno, un poco" | Cuarto del hijo |
| Trofeo | "Brillo en un estante por algo que pasó hace mucho" | Estudio, biblioteca |
| Mate | "Paso de mano en mano y siempre vuelvo vacío" | Cocina, mesa del comedor |
| Peluca | "Le presto pelo a quien no tiene" | Dormitorio, baño |
| Teléfono antiguo | "Tengo una rueda con números y un cable enrulado" | Living, estudio |
| Gnomo de porcelana | "Soy chiquito, barbudo y vigilo en silencio" | Estantes |
| Pava | "Silbo cuando me calientan" | Cocina |
| Cepillo de dientes | "Trabajo mañana y noche en tu boca" | Baños |

Cada objeto: una función que lo arma con formas básicas (como los actuales) y 3 o 4 ubicaciones lógicas.

### Zona de escape
- **Propuesta:** en la **tranquera del frente** (por donde llegó el ladrón). Un círculo verde en el piso que
  brilla cuando ya tenés los cinco, con un cartel "¡Escapá!".
- Alternativas: la calle, o el auto del garaje (arrancarlo con E, cómico pero más complejo).

### HUD
- Lista de las 5 pistas, cada una con un casillero que se tilda al encontrar el objeto.
- Contador "🎒 3/5".
- Cuando tenés los cinco: aviso grande "¡Tenés todo! Escapá por la tranquera".

### Archivos
| Archivo | Cambio |
|---|---|
| `Items.js` | Lista ampliada; sorteo de 5 objetivos sin repetir lugar; varios objetos en la escena a la vez; detectar cuál estás mirando |
| `Game.js` | Agarrar suma a la bolsa; ganar al entrar a la zona con los 5 |
| `UI.js`, `index.html`, `style.css` | Lista de pistas con casilleros, contador, pantalla de victoria con estadísticas |
| `Exterior.js` | Zona de escape (marca en el piso + cartel) |
| `Audio.js` | Sonido de "objeto guardado" y de "¡tenés todo!" |

### Pruebas
- En muchas partidas sorteadas: siempre 5 objetos distintos y en lugares distintos.
- Todas las ubicaciones de todos los objetos se pueden ver y agarrar (como en la etapa 3).
- Llegar a la zona con menos de 5 no gana; con 5, gana.
- Reiniciar vuelve todo a cero (objetos, HUD, zona apagada).

---

## Etapa 11 — La casa gigante

**Objetivo:** una casa mucho más grande y rara, con varios pisos y zonas especiales.
Por su tamaño se divide en tres partes: **11A** estructura, **11B** zonas especiales y **11C** interiores
refinados y decoración.

### 11A — Estructura ✅

#### Qué se hizo
La planta de la casa (18 × 12 m) no cambió, así que las 5 entradas, el exterior y lo que ya estaba probado
siguen igual. La casa crece para arriba y para abajo: de 2 niveles pasa a **5**.

| Nivel | Habitaciones |
|---|---|
| -1 **Sótano** | Sala de la caldera, depósito (con un maniquí), bodega (barriles y vinos), **cuarto de las muñecas** y pasillo. Oscuro, con lamparitas que parpadean y el resplandor naranja de la caldera. |
| 0 Planta baja | Igual que antes, más la escalera que baja al sótano. |
| 1 Primer piso | Dormitorio, cuarto del hijo, baño y el **cuarto de la abuela** (antes era el estudio): cama, mecedora y tele vieja. |
| 2 Segundo piso | **Biblioteca**, **sala de trofeos** (oso disecado, cabezas de ciervo, vitrina), **cuarto de juegos** (pool, arcade) y **el cuarto al revés** (los muebles cuelgan del techo y una lámpara sale del piso). |
| 3 **Ático** | Adentro del techo a dos aguas: baúles, caballito de madera, muñeca, espejo viejo. En los bordes el techo es tan bajo que hay que agacharse. |

- **Escalera principal apilada:** tres tramos (sótano→PB, PB→1°, 1°→2°) exactamente uno encima del otro;
  entre tramo y tramo siempre quedan 3 m libres. Los escalones son tablones y las rebanadas de colisión miden
  medio metro de alto, así por debajo de un tramo puede pasar otro.
- **Escalera empinada al ático** (3 m de alto en 4 m) en el medio de la sala de trofeos.
- **Datos por piso:** `src/datos/` tiene un archivo por piso (`sotano.js`, `plantaBaja.js`, `primerPiso.js`,
  `segundoPiso.js`, `atico.js`), el catálogo de muebles (`muebles.js`) y lo común (`comun.js`).
  `HouseData.js` los junta y exporta las mismas listas de siempre, así el resto del código casi no cambió.
- **Muebles nuevos** (26 tipos), algunos con formas nuevas: las partes ahora pueden ser `'cilindro'` o `'esfera'`.
  Opciones `alReves` (cuelga del techo) y `patasArriba` (dado vuelta en el piso).
- **Techo del ático:** faldones de madera vistos desde adentro, franjas de colisión que bajan hacia los
  bordes (parado llegás hasta 3,9 m del centro; agachado hasta 4,9 m) y la chimenea que lo atraviesa.
  Ventanas redondas en las puntas del techo.
- **Luz que sigue al jugador:** en vez de un sol por piso hay **uno solo** que se muda al piso donde estás
  (una luz direccional ilumina todos los pisos: con 5 soles todo quedaba quemado). Su sombra llega hasta el
  sótano, así los pisos de abajo quedan a la sombra del tuyo. En el sótano la luz baja de a poco ("se te
  acostumbra la vista") y en el ático un poco.
- **HUD:** muestra dónde estás (📍 Sótano, Planta baja... o Afuera).
- **Dueño:** 72 conexiones de waypoints en los 5 pisos y patrulla por los cuartos nuevos.
- **Objetos:** 82 ubicaciones (se sumaron lugares en el sótano, la biblioteca, el cuarto de la abuela y el ático).
- **Rendimiento** (ver `src/Optimizar.js`): todo lo que no se mueve (paredes, pisos, escalones, decoración,
  y cuando terminan de cargar, los muebles de cada piso y las plantas del jardín) se junta en **una malla por
  material**. Las originales quedan invisibles para los rayos. Los muebles de los pisos lejanos no se dibujan.

#### Cambios respecto de la idea original
- La **sala de música** se cambió por **el cuarto al revés** (más raro y más gracioso).
- El **invernadero** queda para más adelante: no había lugar para pegarlo a la casa sin mover las entradas.
- Los **soles por piso** se cambiaron por un solo sol que sigue al jugador (ver arriba el porqué).
- La **trampilla** del ático va en la 11B: por ahora la escalera llega directo por un hueco con baranda.

#### Pruebas que se corrieron
- Las 72 conexiones de waypoints se pueden caminar en línea recta y el grafo llega a todos los puntos.
- El dueño camina de verdad entre pisos lejanos (bodega → ático, ático → caldera, etc.) y llega.
  Se encontró y arregló un error: dos puntos casi uno encima del otro en pisos distintos "parecían"
  conectados en línea recta (ahora hay un límite de pendiente).
- El jugador sube y baja los 4 tramos de escalera caminando; en el ático no se puede parar bajo el techo bajo.
- Las 26 puertas se pueden cruzar; hay suelo en todo el terreno alrededor de la casa.
- Las 82 ubicaciones de objetos se ven y se agarran (cada una desde 4 posiciones o más).
- Partida simulada de 79 s sin errores (el dueño recorrió 3 pisos y atrapó al jugador); build OK.
- **Rendimiento** (misma compu, placa de video integrada Intel UHD 620): la casa gigante tarda lo mismo que
  la casa de la etapa 10 (de frente ~27-34 ms por frame contra 27-32; adentro ~24 contra ~20) con la mitad
  de llamadas de dibujo (570 contra 1081).

#### Plan original
**Pisos (de abajo hacia arriba):**

| Nivel | Nombre | Idea |
|---|---|---|
| -1 | **Sótano terrorífico** | Oscuro, con una luz que parpadea, caldera, cajas, telarañas, goteo |
| 0 | Planta baja | Living, cocina, comedor, entrada, garaje, invernadero |
| 1 | Primer piso | Dormitorios, baño, estudio, **cuarto de la abuela** |
| 2 | Segundo piso | Biblioteca, sala de trofeos, cuarto de juegos, sala de música |
| 3 | **Ático** | Techo bajo en los bordes (hay que agacharse), baúles, muñecos viejos |

**Habitaciones raras (ideas):** invernadero con plantas enormes, sala de trofeos de caza, cuarto de muñecas,
biblioteca con un estante que es una puerta secreta, "el cuarto al revés" (muebles pegados al techo, solo
decoración), baño con la bañera en el medio.

**Cambios técnicos:**
- `HouseData.js` se divide en varios archivos (uno por piso) para que no sea un archivo gigante.
- **Varias escaleras** (lista `ESCALERAS` en vez de una sola), cada una con su rampa invisible, escalones y
  rebanadas de colisión (el mismo sistema de ahora).
- **Un "sol" por piso** generalizado a N pisos (hoy son 2 fijos).
- El sótano queda debajo del pasto: su techo es el piso de la planta baja.
- **Waypoints** nuevos para todos los pisos, conectados por las escaleras.

### 11B — Zonas especiales ✅

#### Qué se hizo
| Zona | Dónde | Cómo funciona |
|---|---|---|
| **Conductos de ventilación** | Sótano (depósito ↔ bodega), primer piso (baño ↔ cuarto de la abuela) y segundo piso (sala de trofeos ↔ cuarto de juegos) | Caños de chapa a ras del piso que atraviesan una pared, con una rejilla en cada punta (E). Adentro miden 1,15 m: solo se pasa agachado. El dueño no entra (mide 1,8) ni ve adentro, pero cada paso suena a chapa (radio 4 m, aunque vayas agachado). El HUD y el ruidómetro avisan. |
| **Túnel secreto** | Del pozo del jardín (nuevo, en el fondo) a la bodega del sótano | Nueva forma de entrar: E en el pozo y bajás por la escalerita. El túnel, oscuro y con marcos de madera como una mina, se pasa agachado y termina en una tabla floja en la pared de la bodega (E). Silencioso pero largo. |
| **Puente** | Ático, sobre el cuarto de juegos | Encima del cuarto de juegos se sacó el piso del ático (desde abajo se ve un techo altísimo) y lo cruza un puente de tablones sin baranda. Si te caés, aterrizás en el cuarto de juegos con ruido. |
| **Trampilla del ático** | Sala de trofeos | La escalera al ático ahora es **plegable**: arranca plegada contra el techo (desde el ático es la tapa de la trampilla) con una cuerda colgando. E para desplegarla o plegarla (hace ruido). No se pliega con alguien encima. El dueño la despliega solo cuando la necesita. |
| **Pasadizo secreto** | Biblioteca (segundo piso) | Un estante lleno de libros, con un libro rojo que sobresale, es una puerta que gira (E) y lleva a un **cuarto secreto** con una caja fuerte y un cofre del tesoro (dos lugares nuevos para el botín). |

**Cómo está hecho (para explicarlo):**
- Las rejillas, la tabla del túnel y el estante secreto son **puertas** (`Door.js`) con otro estilo y tamaño:
  chocan, se abren con E y se animan igual que las demás. Las marcadas `soloJugador` el dueño no las usa.
- La trampilla y el pozo funcionan como las **entradas**: un objeto que se mira, un texto de ayuda y un
  `usar()` que devuelve qué pasó (`src/Especiales.js`).
- La escalera plegable se arma adentro de un grupo que gira sobre su punta de arriba: girándolo, la
  escalera entera (rampa invisible incluida) se pliega contra el techo. Plegada, su rampa queda horizontal
  y sirve de piso en el ático.
- Los conductos y el túnel se describen como datos (`conductos` en cada piso, `TUNEL` y `POZO` en
  `HouseData.js`); `House.js` arma los caños y hace solo los agujeros en las paredes que atraviesan.
- Para no sumar dibujos por frame, los libros del estante y las varillas de las rejillas están **dibujados
  en un canvas** sobre la hoja (una malla en vez de ~50), y el pozo se junta con lo demás.

**Cambios respecto de la idea original:** el túnel sale de un **pozo** (no de la cucha: la cucha es chica
para meterse) y el puente cruza un **vacío en el ático** sobre el cuarto de juegos.

#### Pruebas que se corrieron
- Los 3 conductos y el túnel: agachado se pasan, parado no; el dueño no puede entrar.
- Pozo: bajar, recorrer el túnel hasta la bodega y volver a subir.
- Trampilla: plegada no se sube y se camina por encima; desplegada se sube; no se pliega con el jugador
  encima; el dueño la despliega al llegar.
- Estante secreto: cerrado no se pasa; abierto se entra al cuarto secreto. Puente: se cruza, y al caerse
  se aterriza abajo con ruido.
- **Recorrido automático** (nuevo): con todo abierto, una "inundación" desde la entrada con la caja del
  jugador agachado marca a dónde se puede llegar. Se llega a los 5 pisos, los 3 conductos, el túnel, el cuarto
  secreto, el puente, los 85 lugares de objetos y los 73 puntos del dueño. (Así se encontró un inodoro que el
  conducto del baño había dejado encerrado: se mudó.)
- Las 78 conexiones de waypoints se caminan; el dueño llega al ático (desplegando la escalera) y al cuarto
  secreto; las 27 puertas se cruzan; partida simulada de 120 s sin errores; build OK.
- Rendimiento: casi las mismas llamadas de dibujo que en la 11A (617 contra 570 de frente).

#### Plan original
| Zona | Cómo funciona |
|---|---|
| **Ventilaciones** | Conductos bajos (solo agachado) que conectan cuartos. El dueño no entra, pero moverse adentro hace ruido metálico. |
| **Túneles** | Pasadizo desde el sótano al jardín (nueva forma de entrar, por ejemplo desde la cucha o un pozo). Solo agachado. |
| **Puentes** | Pasarela sobre un hall de doble altura o entre dos alas de la casa. Si te caés, aterrizás con ruido. |
| **Ático** | Se entra por una trampilla (E) con escalera plegable. |
| **Pasadizo secreto** | Un estante de la biblioteca que gira (E). |

### 11C — Refinar los interiores y aumentar la decoración ✅

#### Qué se hizo
- **Empapelados** en cada cuarto (rayas, flores, azulejos, ladrillos, tablas, rombos, lunares, estrellas),
  dibujados en `Texturas.js` y teñidos con el color del cuarto. Las paredes usan coordenadas de textura
  **en metros** (`House.uvEnMetros`): así un solo material por dibujo sirve para todos los tramos.
- **Zócalos y molduras** en todas las paredes de adentro, y **marcos blancos** en las puertas.
- **Cortinas** en todas las ventanas (la ventana del catálogo ahora las trae).
- **36 cuadros** y 4 manchas de humedad (`Cuadros.js`): retratos del dueño, la abuela y el abuelo, paisajes, el perro, un barco,
  arte "moderno", mapas, dibujos del hijo, relojes, espejos, un mapa del tesoro en el cuarto secreto,
  cuadros cabeza abajo en el cuarto al revés y, en el sótano, **un retrato que te sigue con la mirada**.
  Los 16 dibujos están en una sola imagen (un "atlas"), así todos comparten material.
- **Lámparas de techo** en cada cuarto (colgante, plafón o tubo en el garaje), según los datos.
- **Detalles:** almohadón, velador, estante con frascos en la cocina, alfombras largas en los pasillos y el
  comedor, toalleros y alfombritas en los baños, neumáticos en el garaje, tocador, juguetes, puffs, canasta
  con ovillos, globo terráqueo, pila de libros, trofeos, lingotes de oro.
- **Sótano:** telarañas en las esquinas del techo, manchas de humedad, cadenas colgando y **goteras** (una
  gota cae sobre un charco cada tanto, con su "plic").
- **Ático:** muebles tapados con sábanas (con ojitos: parecen fantasmas), cajas abiertas y polvo flotando.
- Los muebles ahora aceptan `y` (apoyarlos arriba de otro), `escala` (estirar, ej. una alfombra) y colores
  variables (`$tela`, ej. la tela de un almohadón).
- **Rendimiento:** los materiales de los modelos de Kenney ahora se comparten por color, así se juntan más
  mallas. Resultado: la casa decorada dibuja **menos** que antes de la 11C (de frente 583 llamadas contra
  617; en planta baja 404 contra 409).

#### Pruebas que se corrieron
- Ningún detalle nuevo está encima de un lugar del botín; los 85 objetos se siguen viendo y agarrando.
- Las 78 conexiones del dueño se caminan; el recorrido automático llega a todos los objetos y puntos.
- Partida simulada de 73 s sin errores (las goteras suenan solo en el sótano); build OK.
- Se encontró y arregló una raya que "titilaba" en el piso del ático (la cara de arriba de las paredes
  coincidía con el piso de arriba).

#### Plan original
**Objetivo:** que cada cuarto se vea "vivido" y distinto de los demás, con muchos más detalles, sin perder
rendimiento ni romper lo que ya funciona (caminos del dueño, escondites, ubicaciones de objetos).

| Qué | Ideas |
|---|---|
| **Paredes** | Zócalos de madera abajo y molduras arriba. Empapelado o textura distinta por cuarto (rayas, flores, azulejos en los baños y la cocina, ladrillo en el sótano, tablas en el ático), dibujados con código en `Texturas.js`. |
| **Puertas y ventanas** | Marcos por dentro, cortinas y persianas. |
| **Cuadros** | Dibujados en un canvas: retrato del dueño, de la abuela, paisajes, un perro, y en el sótano un cuadro "que te sigue con la mirada". También relojes de pared, espejos y diplomas. |
| **Luces** | Lámparas colgantes o plafones en cada techo y veladores en las mesas de luz (solo decoración: la luz la siguen dando las luces de siempre). |
| **Detalles sobre los muebles** | Libros, floreros, tazas, platos y frascos en la cocina, jabón y toallas en los baños, juguetes en el cuarto del hijo, ovillos de lana en el cuarto de la abuela. |
| **Textiles** | Alfombras distintas por cuarto, almohadones, mantas sobre los sillones y las camas. |
| **Sótano** | Telarañas en las esquinas, gotas que caen del techo (con sonido), manchas de humedad, cadenas, charcos. |
| **Ático** | Sábanas cubriendo muebles (parecen fantasmas), polvo flotando en la luz, cajas abiertas con cosas viejas. |
| **Pasillos y escalera** | Cuadros a lo largo de la escalera, plantas, percheros, una alfombra larga. |

**Cuidados:**
- Todo lo decorativo se marca como estático para que `Optimizar.js` lo junte (si no, cada cosita es un
  dibujo más por frame).
- Las cosas chiquitas no chocan; las que ocupan lugar se revisan contra los caminos del dueño.
- Las superficies donde aparecen objetos del botín no se tapan con decoración.

**Archivos:** `src/datos/*.js` (decoración de cada piso), `src/datos/muebles.js` (piezas de decoración),
`House.js` (zócalos, molduras y marcos), `Texturas.js` (empapelados, ladrillos, cuadros).

**Pruebas:** tiempo por frame igual que en la 11B, conexiones del dueño, objetos visibles y agarrables,
recorridos por todos los cuartos.

### Archivos
`HouseData*.js` (nuevos por piso), `House.js` (varias escaleras, trampillas, conductos), `Game.js` (luces por
piso), `Owner.js` (grafo de waypoints nuevo), `Items.js` (ubicaciones nuevas), `Exterior.js` (casa más
grande, entrada del túnel), `Entradas.js`.

### Pruebas
- Todas las conexiones entre waypoints se pueden caminar en línea recta (como en la etapa 2).
- Todas las ubicaciones de objetos son alcanzables y visibles.
- No hay lugares donde el jugador quede atrapado sin salida (recorrido automático desde cada habitación).
- Ventilaciones y túneles: se pasan agachado y no parado.
- **Rendimiento:** medir el tiempo por frame (ver [Riesgos](#riesgos-y-cómo-los-manejamos)).

---

## Etapa 12 — Enemigos nuevos: perros y abuela ✅

### Qué se hizo
- **`Owner.js` se separó** en `Enemigo.js` (el esqueleto: estados, visión, oído, waypoints, zona) y
  `Dueno.js`, `Perro.js`, `Abuela.js`. Cada enemigo le pasa sus números al esqueleto y sobrescribe lo suyo.
- **Zonas:** cada enemigo tiene una zona de la que no sale. El dueño, la casa; los perros, el patio
  (`datos/patio.js`); la abuela, su cuarto y el pasillo del primer piso.
- **El patio de los perros** quedó cercado, con dos tranqueras abiertas y carteles ("están entrenados": no las
  cruzan). Adentro están la puerta trasera, el pozo, la mesa, la cucha y el tendedero. El HUD avisa cuando entrás.
- **Perros (Firulais y Manchita):** 3 m/s patrullando y **7 m/s** persiguiendo, ven 5 m, **oyen el doble**
  (caminando parado te escuchan a 6 m; agachado, a 2 m). Al verte **ladran** cada 1,4 s: el ladrido es un
  ruido de 14 m que escuchan el dueño, la abuela y el otro perro. No saben saltar: **arriba de la mesa del
  patio** (o del pozo) no te alcanzan; a los 5 s se aburren y vuelven a la cucha (8 s sin hacerte caso).
  Si te alcanzan: "te mordió el pantalón".
- **Abuela:** se hamaca en su propia mecedora (armada con formas básicas) mirando la tele, y cada 18 a 28 s
  da una vuelta lenta por el pasillo (0,8 m/s). Ve 14 m y oye la mitad. Cuando te ve **apunta 1 segundo**
  (rayito rojo, "clic", mira roja en la pantalla), **dispara** (¡BANG!, humo y un agujero donde pega) y tarda
  **2,5 s en recargar**. Puntería: 60% a 3 m quieto, 9% a 12 m corriendo; si justo al disparar no te ve, erra.
  Cada tiro es un ruido de 30 m: el dueño y los perros van a ver.
- **Ruido para todos:** `Noise.js` ahora avisa a todos los enemigos (cada uno con su oído) y sabe quién hizo
  el ruido (un perro no se escucha a sí mismo).
- La música de persecución y el borde rojo se prenden con cualquier enemigo que te esté cazando.

### Pruebas que se corrieron
- Grafos: las 17 conexiones de los perros y las 8 de la abuela se caminan, y están todas unidas. Las 78 del
  dueño siguen bien (la del ático se camina con la escalera desplegada, como antes).
- 2 minutos de patrulla: los perros **nunca** salieron del patio y la abuela **nunca** salió de su zona.
- 1000 disparos por caso (5 casos, con la abuela y el jugador en el pasillo): el porcentaje de aciertos cae
  dentro de lo esperado (ej: 3 m quieto 59,5% esperado → 61,4%; 10 m corriendo 15% → 14,3%).
- Si te escondés detrás de una pared mientras apunta, el tiro erra (probabilidad 0).
- Un ladrido y un disparo mandan al dueño a investigar (y el disparo, también a los perros).
- Arriba de la mesa del patio, los perros no te alcanzan y se aburren a los 5 s.
- Recorrido automático: desde el frente se llega por las tranqueras a la puerta trasera, el pozo y el fondo;
  en el cuarto de la abuela se llega a la tele, la mesa de luz y la rejilla del conducto.
- Simulación de 90 s con el jugador recorriendo patio y casa: sin errores (la IA de los 4 enemigos cuesta
  ~2 ms por frame). Build OK.
- **Rendimiento:** de frente 653 llamadas (antes 583); patio 232; cuarto de la abuela 303.

### Plan original
**Objetivo:** tres enemigos nuevos con comportamientos distintos.

### Cambio de estructura
El dueño hoy está todo en `Owner.js`. Se separa en:
- **`Enemigo.js`** (clase base): moverse por waypoints, girar, visión (distancia + ángulo + raycast),
  oído, máquina de estados (patrulla / investigar / perseguir).
- **`Dueno.js`**, **`Perro.js`**, **`Abuela.js`**: cada uno con sus números y lo que tiene de especial.

Así cada enemigo nuevo es "el mismo esqueleto con otros valores", fácil de explicar.

### Tabla de características

| | Dueño | Perros (x2) | Abuela |
|---|---|---|---|
| Zona | Toda la casa | **Solo el patio** | Su piso (cuarto y pasillo) |
| Velocidad patrulla / persecución | 1.6 / 3.9 m/s | 3 / **7** m/s (más rápido que vos corriendo) | **0.8 / 1.2** m/s |
| Vista | 12 m, cono de 110° | **5 m** (ven poco) | 14 m |
| Oído | normal | **x2** (escuchan al doble de distancia) | x0.5 (un poco sorda) |
| Si te alcanza | Perdés | Perdés ("te mordió el pantalón") | No te persigue: **dispara** |
| Extra | Traba puertas | **Ladran** al detectarte: el ladrido es un ruido que alerta al dueño | Mala puntería, recarga lenta |

### Perros
- Patrullan el patio con su propio grafo de waypoints (el patio no tiene los del dueño).
- No entran a la casa ni pueden saltar: subirse a la mesa del patio o al techo del garaje te salva.
- Tienen cucha; cuando pierden el rastro, vuelven a patrullar.

### Abuela con escopeta
- Se hamaca en su cuarto y camina muy despacio por su piso.
- Cuando te ve: **apunta 1 segundo** (aviso visual y un "clic"), después **dispara**.
- **Puntería:** la probabilidad de acierto baja con la distancia y si te estás moviendo
  (corriendo cuesta más acertarte; agachado detrás de un mueble no te ve). Ejemplo: 60% a 3 m quieto,
  10% a 12 m corriendo. Si te da, perdés.
- **Cada disparo hace muchísimo ruido** (alerta al dueño y a los perros) y deja un agujero en la pared.
- Tarda 2.5 segundos en recargar: es la ventana para escaparse.
- Estilo cómico: escopeta de perdigones de sal, humo y un "¡BANG!" en pantalla.

### Archivos
`Enemigo.js`, `Dueno.js`, `Perro.js`, `Abuela.js` (nuevos; `Owner.js` se reemplaza), `Game.js` (lista de
enemigos, perder por disparo o mordida), `Noise.js` (ruido que escuchan todos, con oído x2 o x0.5),
`HouseData.js` (waypoints del patio y del piso de la abuela), `Audio.js` (ladridos, disparo, recarga).

### Pruebas
- Los perros nunca salen del patio; la abuela nunca sale de su piso.
- Simular 1000 disparos a distintas distancias y velocidades y verificar que la probabilidad de acierto es
  la esperada.
- Un ladrido o un disparo hacen que el dueño vaya a investigar.
- Partidas completas con los cuatro enemigos sin errores y midiendo el rendimiento.

---

## Etapa 13 — Objetos de habilidad ✅

### Qué se hizo
- **`Habilidades.js` (nuevo):** las tres habilidades (cómo se ven, cuánto duran) y 17 lugares posibles entre
  la casa y el patio. En cada partida hay **una de cada una**, en un lugar sorteado que nunca coincide con un
  objeto del botín. Flotan, giran despacito y tienen un aro de su color que brilla debajo.
- Se usan apenas las agarrás con **E** (sin inventario). Al agarrar suena un "power-up" y al terminarse,
  un "uh-oh".
- 🥕 **Zanahoria (20 s):** elige al azar uno de los objetos que te faltan y pone encima una **copia naranja que
  se dibuja por encima de todo** (`depthTest: false`), con un halo y un haz de luz hacia arriba. El halo crece
  con la distancia, así se ve aunque esté lejos o en otro piso. Si agarrás ese objeto, se termina antes.
  La copia no la tocan los rayos: no se puede agarrar el objeto a través de la pared.
- 🧦 **Botas de lana (30 s):** tus pasos no hacen ruido, ni corriendo, ni en la chapa de los conductos (saltar,
  aterrizar o chocar sí). El ruidómetro dice "🧦 Botas de lana".
- 🥤 **Bebida energética (15 s):** caminás, corrés y te movés agachado **un 50% más rápido** (corriendo, 9,75 m/s:
  más que los perros).
- `Player.js` tiene ahora `multiplicadorVelocidad` y `pasosSilenciosos`; Game los cambia según lo que esté activo.
- **HUD:** abajo a la derecha, una fila por habilidad activa con ícono, barrita que se vacía y segundos;
  titila los últimos 3 s.
- La zanahoria quedó hecha con formas básicas (el modelo `crop_carrot` de Kenney no estaba en el proyecto).

### Pruebas que se corrieron
- Duración: zanahoria 20 s, botas 30 s y bebida 15 s; después se apagan (y la zanahoria saca el brillo).
- Zanahoria: en 1000 partidas con objetos ya agarrados al azar, **nunca** señaló uno ya agarrado; con todo el
  botín, no queda activa. Si agarrás el objeto revelado, se termina.
- Botas: con el dueño a 2 m, caminando, corriendo y en el conducto **no escucha nada** (sin botas, sí).
  Firulais a 3 m, tampoco.
- Bebida: caminando 3,5 → 5,25 m/s, corriendo 6,5 → 9,75, agachado 1,8 → 2,7 (x1,5 en los tres).
- 2000 sorteos: ninguna habilidad cayó encima de un objeto del botín ni de otra habilidad.
- Las tres se pueden mirar y agarrar con E en su lugar (también la del conducto, agachado).
- Partida simulada con las tres activas: sin errores; el juego sigue en ~2 ms por frame sin contar el dibujo.
  Build OK.

### Plan original
**Objetivo:** objetos repartidos por la casa y el patio que dan ventajas por un tiempo.

| Objeto | Efecto | Duración | Cómo se ve |
|---|---|---|---|
| 🥕 **Zanahoria** | Revela la ubicación de **uno** de los objetos que te faltan: brilla a través de las paredes | 20 s | Modelo de Kenney (`crop_carrot`) |
| 🧦 **Botas de lana** | Tus pasos **no hacen ruido** (caminando ni corriendo) | 30 s | Hechas con formas básicas |
| 🥤 **Bebida energética** | Caminás y corrés **un 50% más rápido** | 15 s | Lata hecha con formas básicas |

### Mecánica
- En cada partida se sortean sus lugares entre varios puntos posibles (casa y patio).
- Se activan al agarrarlas con E (sin inventario, para que sea simple).
- El HUD muestra las habilidades activas con un ícono y una barra de tiempo que se va vaciando.
- La zanahoria marca el objetivo con un material que se dibuja por encima de las paredes
  (`depthTest: false`), así "se ve a través".

### Archivos
`Habilidades.js` (nuevo), `Player.js` (velocidad y ruido modificables), `Game.js`, `UI.js`, `Audio.js`.

### Pruebas
- Cada habilidad dura lo que tiene que durar y después se apaga.
- Con botas, el dueño no escucha los pasos (ni corriendo).
- Con la bebida, la velocidad sube un 50% (también agachado).
- La zanahoria siempre señala un objeto que todavía no agarraste.

---

## Etapa 14 — Pulido: animaciones, entradas y escondites ✅

Se divide en tres partes, igual que la 11: **14A** animaciones, **14B** entradas nuevas y **14C** escondites
nuevos y cierre (todas las pruebas, rendimiento y commit final).

### 14A — Animaciones ✅

#### Qué se hizo
- **Cámara** (`Player.js`): baja y sube una vez por paso y se mece de lado a lado (3,5 cm caminando, 7 cm
  corriendo, 1,2 cm agachado; con la bebida, al ritmo de los pasos más rápidos). Al aterrizar, **sacudón**: la
  cámara se hunde y vuelve como un resorte (unos 8 cm después de un salto, con un tope para las caídas grandes).
- **Agarrar** (`Efectos.js`, nuevo): el objeto o la habilidad vuela hacia la cámara haciendo un arquito, se
  achica, y donde estaba queda un destello del color de la cosa (dorado para el botín).
- **Puertas** (`Door.js`): en vez de girar a velocidad fija, siguen una "curva". Al abrir arrancan rápido, se
  pasan unos 6° y vuelven (rebote contra el tope); al cerrar aceleran hasta el marco y rebotan un poquito.
- **Dueño** (`Dueno.js`): parpadea cada 2 a 5 s, **pega un salto de sorpresa** con los brazos para arriba
  cuando te ve (se queda duro medio segundo antes de perseguirte: es tu ventaja para arrancar) y **se rasca la
  cabeza** mientras busca.
- **Perros y abuela:** ya tenían sus animaciones desde la etapa 12 (la cola, olfatear, ladrar, hamacarse).
- **Pantallas:** aparecen y desaparecen con un fundido de 0,35 s, y el título entra con un saltito.
- Arreglo de paso: los carteles "!" y "?" tenían un fondo cuadrado celeste por culpa del efecto de bordes
  (no sabe dibujar sprites). Ahora no llevan borde, y suben con el dueño cuando salta.

#### Pruebas que se corrieron
- Puertas (ángulo cada 3 frames): abrir 42° → 70° → 86° → 94° → **96°** → 92° → 90°; cerrar 87° → 64° → 18° →
  4° → **7°** → 0°.
- Cámara: caminando baja 3,5 cm y se mece 1,7 cm a cada lado; corriendo 7 y 3,5; agachado 1,2 y 0,6; quieto,
  nada. Después de un salto se hunde 8,4 cm y en menos de un segundo vuelve a 0.
- Sorpresa: el dueño se queda quieto exactamente 0,5 s (30 frames) y después arranca a perseguir.
- Parpadeo: 5 veces en 20 s simulados.
- Pantallas: la transición existe al abrir y al cerrar (350 ms) y el título tiene su animación.
- 4 partidas simuladas con el jugador corriendo y saltando por la casa: sin errores; el dueño se sorprende y
  se queda quieto mientras salta. Build OK.

### 14B — Entradas nuevas ✅

#### Qué se hizo
Cinco entradas nuevas en `EntradasNuevas.js` (funcionan igual que las de `Entradas.js`: una raíz que se mira,
una ayuda y un `usar()` que devuelve un "resultado"). Cada una con su precio:

| Entrada | Cómo se usa | Precio |
|---|---|---|
| **Chimenea** | Subís al techo del garaje y te tirás por la boca. Caés en el **hogar del living** | ¡PUF! (ruido de 8 m) y la pantalla queda llena de hollín unos segundos |
| **Ventanita del sótano** | Al ras del pasto, en el frente | Silenciosa, pero entrás a la sala de la caldera, oscura y lejos de casi todo |
| **Gatera** | En la puerta de calle, **solo agachado** | Tarda 3,5 s (y es la puerta más a la vista) |
| **Enredadera** | En la pared este, dentro del patio de los perros. Llega al cuarto al revés (segundo piso) | Tarda 5 s, las hojas crujen y mientras trepás **te pueden ver** (los perros te ladran y avisan al dueño) |
| **Tragaluz del ático** | Subís al techo del garaje **saltando por los trastos** (tacho → cajones → aire acondicionado) y trepás la escalerita de la antena | Mucho camino, y el tragaluz rechina un poco |

- **Techo del garaje:** ahora se puede pisar. Los trastos de su pared oeste son escalones de 0,7 a 0,9 m (lo
  que alcanzás saltando); sin ellos no se llega.
- **Animaciones con recorrido:** `moverAnimado` acepta puntos intermedios (`por`, ej: subir la escalerita y
  después meterse por el tragaluz), un **fundido a negro** en la parte donde atravesás una pared o el techo, y
  `alTerminar`, algo que pasa recién al llegar (el ¡PUF! de la chimenea).
- La gatera es parte de la puerta (`Door.js`): gira con ella y su tapita se hamaca cuando pasás.
- Todas se pueden usar de vuelta para salir, menos la chimenea ("por la chimenea se baja, no se sube").
- La ventana del living se corrió para dejarle lugar al hogar; las ventanas falsas de la pared este (donde está
  la enredadera) se sacaron. El "túnel desde la cucha" no hizo falta: ya está el túnel del pozo (etapa 11B).

#### Pruebas que se corrieron
- Las cinco, de ida y de vuelta: se pueden mirar, la ayuda dice lo que corresponde y la animación termina en el
  lugar correcto sin quedar adentro de nada (gatera, chimenea, ventanita, enredadera y tragaluz).
- Gatera parado: no te deja ("agachate"). Chimenea desde el pasto: no se puede ("¿y desde el techo del garaje?").
- Chimenea: ruido de 8 m (el dueño viene a ver) y hollín en pantalla. Tragaluz y enredadera: ruidito de 3 m.
- Subida con física real: pasto → tacho (0,9) → cajones (1,7) → aire (2,5) → techo del garaje (3,2) → al lado de
  la chimenea. Sin los trastos no se llega.
- Enredadera con Firulais a 4 m: escucha las hojas, te persigue y te ladra mientras trepás, pero no te alcanza.
- Grafos: los perros 17/17, la abuela 8/8 y el dueño 77/78 (la del ático necesita la escalera desplegada,
  como siempre): el hogar nuevo no le corta el camino a nadie.
- Rendimiento (medido igual con y sin la 14B, contando las dos pasadas de los bordes): frente 1357 → 1381
  llamadas, patio 1018 → 1072, living 211 → 235. Build OK.

### 14C — Escondites nuevos y cierre ✅

#### Qué se hizo
Los tipos de escondite ahora están en una tabla (`Escondites.js`): texto de ayuda, altura de los ojos, cuánto
se corren del borde, sonido y alguna regla especial. Agregar un tipo nuevo es agregar una fila (y su "vista" en
`style.css`). Todos usan el mismo sistema de antes y la misma regla de sospecha del dueño (40% si pasa cerca).

| Escondite | Dónde | Particularidad |
|---|---|---|
| **Debajo de la mesa** | Mesas de la cocina, el comedor y la bodega | Si el dueño **te mira de cerca** (2,5 m, mismo piso, sin nada en el medio), te ve: va derecho a sacarte, sin moneda |
| **Bañera con cortina** | Las dos bañeras (ahora tienen cortina a rayas) | Clásico de película: espiás por la rendija de la cortina |
| **Caja grande** | Garaje y depósito del sótano | Ves todo marrón salvo el agujerito de la manija |
| **Arbustos** | Los 8 del jardín y 3 nuevos en el patio | Tapan la vista (también de pie, detrás). En el patio son el único escondite: los perros no te encuentran |
| **Tacho de basura** | Dos al lado de la tranquera del patio | Salís **oliendo a basura 25 s**: los perros te huelen a 12 m (aunque no te vean) y van a buscarte |
| **Ropero del ático** | En el ático, al lado del caballito | Como los placards |

- **Partes fijas** (`muebles.js`): la cortina de la bañera no viene en el modelo de Kenney, así que es una lista
  aparte de formas básicas que quedan aunque cargue el modelo.
- **Arbustos redondos:** los modelos de Kenney eran plantas de hojas finitas (no te podías esconder adentro),
  así que ahora son cuatro esferas de 1,2 m de alto. Como son "obstáculos", también tapan la vista de los enemigos.
- **El dueño no sale de la casa:** si va a revisar un escondite de afuera, llega solo hasta la pared de adentro.
  Ahora tiene que estar **al lado** del escondite para encontrarte (antes alcanzaba con "llegar").
- **Olor:** se ve en el HUD como una "habilidad" más (🤢 con su barra) y con nubecitas verdes en los bordes.
- Consejo del menú actualizado con los escondites nuevos.

#### Pruebas que se corrieron (cierre de todo el proyecto)
- **Escondites:** los 29 (8 de antes + 21 nuevos) se pueden mirar desde algún lado, entrar (cada uno con su
  vista y su texto) y salir al mismo lugar sin quedar trabado.
- **Mesa:** dueño a 2,5 m de la mesa, mirándola → te encuentra en 0,4 s; de espaldas → nada (solo la moneda, que con 40%
  también te encuentra); a 3 m o desde la cocina → nada.
- **Arbusto del frente:** el dueño va a revisarlo, llega hasta la pared de adentro y no te encuentra.
- **Tacho:** al salir, olor 25 s (aviso, barra en el HUD). Firulais a 8 m te huele, viene hasta el cerco, te ve y
  te ladra; a los 25 s se te va el olor ("🧼 Ya no olés a basura").
- **Grafos:** perros 17/17, abuela 8/8, dueño 77/78 (igual que antes: la del ático necesita la escalera
  desplegada). El ropero del ático primero le cortaba el camino al dueño: se corrió.
- **Nada encima de nada:** ningún lugar de objetos ni de habilidades (102) cae adentro de un escondite nuevo; los
  patitos de goma siguen en las bañeras y se pueden agarrar.
- **Entradas (todas otra vez):** las 13 responden; gatera agachado (3,5 s), chimenea desde el techo (¡PUF!, ruido
  de 8 m y hollín) y tragaluz (5 s) dan lo mismo que en la 14B.
- **Partidas simuladas:** 6 partidas con enemigos activos y un jugador que corre, salta, se agacha, se esconde y
  aprieta E al azar: sin errores.
- **Rendimiento final** (mismo método antes y después de la 14C, llamadas de dibujo contando sombras y bordes):

  | Vista | Sin 14C | Con 14C |
  |---|---|---|
  | Frente | 2099 | 2128 |
  | Oeste | 2088 | 2137 |
  | Patio | 1989 | 1976 |
  | Living | 1640 | 1728 |
  | Primer piso | 1175 | 1182 |
  | Sótano | 1123 | 1131 |
  | Ático | 1546 | 1572 |

  Entre 0% y 5% más (en el patio, menos: los arbustos de esferas se juntan en una malla y los modelos no).
- Build OK, consola sin errores.

### Plan original

### Animaciones
- **Cámara:** balanceo suave al caminar (más al correr, casi nada agachado) y un "sacudón" al aterrizar.
- **Agarrar un objeto:** vuela hacia la cámara y se achica, con un destello.
- **Puertas:** abren con aceleración suave y un pequeño rebote.
- **Dueño:** parpadea, pega un salto de sorpresa al verte, se rasca la cabeza cuando busca.
- **Perros:** mueven la cola y olfatean el piso; **abuela:** se hamaca en la mecedora.
- **Pantallas:** transiciones con fundido.

### Más formas de entrar
| Entrada | Precio |
|---|---|
| **Chimenea** | Bajás al living, pero caés con ruido y hollín |
| **Ventana del sótano** | Silenciosa, pero entrás al sótano oscuro |
| **Gatera** | Solo agachado, muy lenta |
| **Enredadera** | Trepás al segundo piso (animación larga, te pueden ver) |
| **Tragaluz del ático** | Hay que subir al techo del garaje saltando |
| **Túnel desde la cucha** | Si no quedó en la etapa 11B |

### Más formas de esconderse
| Escondite | Particularidad |
|---|---|
| Debajo de mesas | Agachado; te ven si miran de cerca |
| Bañera con cortina | Clásico de película |
| Cajas del garaje y del sótano | Te metés adentro de una caja grande |
| Arbustos del jardín | Sirven contra los perros |
| Tachos de basura de afuera | Cómico: salís con olor |
| Ropero del ático | Como los placards |

Todos usan el mismo sistema de escondites de ahora (y la misma regla de sospecha).

### Cierre
- Volver a correr **todas** las pruebas de todas las etapas.
- Medición final de rendimiento.
- README actualizado y commit final.

---

## Riesgos y cómo los manejamos

| Riesgo | Por qué | Qué hacemos |
|---|---|---|
| **Rendimiento** con la casa gigante | Hoy hay ~940 mallas y dibujar ya es lo más caro | Juntar lo que no se mueve en menos mallas (por color), dejar de dibujar pisos lejanos cuando estás en otro, limitar sombras a lo grande, seguir actualizando sombras cada 3 frames |
| **Sótano oscuro** | Las luces direccionales iluminan todo por igual (no se pueden "apagar" por piso) | Colores oscuros en el sótano, una luz puntual que parpadea, y evaluar una **linterna** (tecla F) |
| **Enemigos que se traban** | Más pisos, más puertas, más caminos | Mismas pruebas de conexiones que la etapa 2, "se rinde" a los 15 s, y recálculo si se traba |
| **La abuela es injusta** | Un tiro y perdés | Aviso de 1 s antes de disparar, mala puntería de lejos y en movimiento, recarga lenta |
| **Demasiada complejidad para explicar** | Cada etapa suma sistemas | Cada sistema en su archivo, con un comentario arriba que explica la idea, y datos en arreglos |

---

## Decisiones pendientes

| Decisión | Propuesta | Se decide en |
|---|---|---|
| ~~¿Dónde está la zona de escape?~~ | ✅ Decidido: atrás de una van negra en el frente de la casa | Etapa 10 |
| ~~¿Cuántos objetos en total?~~ | ✅ Decidido: 18 tipos, se sortean 5 | Etapa 10 |
| ~~¿Los perros pueden entrar por la puerta trasera?~~ | ✅ Decidido: no, se quedan en el patio (cercado) | Etapa 12 |
| ¿Linterna para el sótano? | Por ahora no hace falta: las lamparitas alcanzan para ver. Se revisa al jugar | Etapa 11 |
| ~~¿Habilidades con inventario o al agarrar?~~ | ✅ Decidido: al agarrar (más simple) | Etapa 13 |

---

## Historial (etapas 1 a 14)

| Etapa | Qué se hizo |
|---|---|
| 1 | Vite + escena + jugador con movimiento y colisiones AABB |
| 2 | Casa de dos pisos con puertas, escalera (rampa invisible) y muebles, definida con datos |
| 3 | Objeto random con pista (acertijo) y victoria |
| 4 | Dueño con máquina de estados: patrulla, visión con raycast y persecución por waypoints |
| 5 | Sistema de ruido, escondites (placards y camas) con sospecha, puertas que traba el dueño |
| 6 | Dificultad creciente, sonido con Web Audio, menú, pausa, HUD y pantallas finales |
| 7 | Exterior (jardín, garaje, balcón, techo) y 5 formas de entrar |
| 8 | Gráficos: modelos de Kenney (CC0) + bordes de dibujo animado + texturas propias |
| 9 | Saltar y agacharse, ruido de pasos según el movimiento, ruidómetro |
| 10 | 18 objetos (se sortean 5), lista del botín en el HUD y escape en la van negra del frente |
| 11A | Casa de 5 niveles (sótano, 3 pisos y ático), escalera apilada, cuartos raros, luz que sigue al jugador, mallas juntadas |
| 11B | Conductos de ventilación, túnel secreto desde un pozo, puente en el ático, escalera plegable (trampilla) y pasadizo secreto en la biblioteca |
| 11C | Empapelados, zócalos, molduras, marcos, cortinas, 36 cuadros (uno te sigue con la mirada), lámparas, detalles, telarañas, goteras, sábanas fantasma y polvo |
| 12 | Enemigos en su propio archivo sobre un esqueleto común (`Enemigo.js`); dos perros en el patio cercado (ladran, se aburren) y la abuela con escopeta (apunta, dispara, recarga) |
| 13 | Habilidades: zanahoria (ves un objeto a través de las paredes), botas de lana (pasos silenciosos) y bebida energética (+50% de velocidad), con barra de tiempo en el HUD |
| 14A | Animaciones: balanceo y sacudón de cámara, objetos que vuelan a la cámara, puertas con rebote, sorpresa y parpadeo del dueño, fundidos de pantalla |
| 14B | Cinco entradas nuevas: chimenea, ventanita del sótano, gatera, enredadera y tragaluz del ático (con trastos para subir al techo del garaje) |
| 14C | Escondites en tabla (`Escondites.js`): mesas, bañeras con cortina, cajas, arbustos, tachos (con olor) y ropero del ático; pruebas de cierre |
