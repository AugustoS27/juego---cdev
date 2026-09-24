# Plan de acción — El Ladrón Torpe (segunda parte)

Este documento detalla las etapas para las mejoras nuevas del juego: qué se va a hacer en cada una,
en qué orden, qué archivos se tocan, cómo se prueba y qué decisiones quedan pendientes.

> **Estado actual:** etapas 1 a 10 terminadas, **11A y 11B terminadas** (estructura y zonas especiales).
> Próxima: **etapa 11C** (interiores refinados y más decoración).

---

## Índice

1. [Principios de trabajo](#principios-de-trabajo)
2. [Resumen de las etapas](#resumen-de-las-etapas)
3. [Orden y dependencias](#orden-y-dependencias)
4. [Etapa 9 — Saltar y agacharse ✅](#etapa-9--saltar-y-agacharse-)
5. [Etapa 10 — Cinco objetos y escapar ✅](#etapa-10--cinco-objetos-y-escapar-)
6. [Etapa 11 — La casa gigante](#etapa-11--la-casa-gigante)
7. [Etapa 12 — Enemigos nuevos: perros y abuela](#etapa-12--enemigos-nuevos-perros-y-abuela)
8. [Etapa 13 — Objetos de habilidad](#etapa-13--objetos-de-habilidad)
9. [Etapa 14 — Pulido: animaciones, entradas y escondites](#etapa-14--pulido-animaciones-entradas-y-escondites)
10. [Riesgos y cómo los manejamos](#riesgos-y-cómo-los-manejamos)
11. [Decisiones pendientes](#decisiones-pendientes)
12. [Historial (etapas 1 a 11B)](#historial-etapas-1-a-11b)

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
| **11** | Casa gigante: pisos, sótano, ático, puentes, túneles, ventilaciones, decoración | Muy grande (se divide en 11A, 11B y 11C) | 🟡 11A y 11B terminadas · 11C próxima |
| **12** | Enemigos nuevos: dos perros y la abuela con escopeta | Grande | Pendiente |
| **13** | Objetos de habilidad: zanahoria, botas de lana, bebida energética | Mediana | Pendiente |
| **14** | Pulido: animaciones, más entradas, más escondites | Grande | Pendiente |

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

### 11C — Refinar los interiores y aumentar la decoración

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

## Etapa 12 — Enemigos nuevos: perros y abuela

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

## Etapa 13 — Objetos de habilidad

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

## Etapa 14 — Pulido: animaciones, entradas y escondites

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
| ¿Los perros pueden entrar por la puerta trasera? | No, se quedan en el patio | Etapa 12 |
| ¿Linterna para el sótano? | Por ahora no hace falta: las lamparitas alcanzan para ver. Se revisa al jugar | Etapa 11 |
| ¿Habilidades con inventario o al agarrar? | Al agarrar (más simple) | Etapa 13 |

---

## Historial (etapas 1 a 11B)

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
