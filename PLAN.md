# Plan de acción — El Ladrón Torpe (segunda parte)

Este documento detalla las etapas para las mejoras nuevas del juego: qué se va a hacer en cada una,
en qué orden, qué archivos se tocan, cómo se prueba y qué decisiones quedan pendientes.

> **Estado actual:** etapas 1 a 8 terminadas (juego base + exterior + gráficos) y **etapa 9 terminada**.
> Próxima: **etapa 10**.

---

## Índice

1. [Principios de trabajo](#principios-de-trabajo)
2. [Resumen de las etapas](#resumen-de-las-etapas)
3. [Orden y dependencias](#orden-y-dependencias)
4. [Etapa 9 — Saltar y agacharse ✅](#etapa-9--saltar-y-agacharse-)
5. [Etapa 10 — Cinco objetos y escapar](#etapa-10--cinco-objetos-y-escapar)
6. [Etapa 11 — La casa gigante](#etapa-11--la-casa-gigante)
7. [Etapa 12 — Enemigos nuevos: perros y abuela](#etapa-12--enemigos-nuevos-perros-y-abuela)
8. [Etapa 13 — Objetos de habilidad](#etapa-13--objetos-de-habilidad)
9. [Etapa 14 — Pulido: animaciones, entradas y escondites](#etapa-14--pulido-animaciones-entradas-y-escondites)
10. [Riesgos y cómo los manejamos](#riesgos-y-cómo-los-manejamos)
11. [Decisiones pendientes](#decisiones-pendientes)
12. [Historial (etapas 1 a 8)](#historial-etapas-1-a-8)

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
| **10** | Cinco objetos para robar + zona de escape | Mediana | ⏳ Próxima |
| **11** | Casa gigante: pisos, sótano, ático, puentes, túneles, ventilaciones | Muy grande (se divide en 11A y 11B) | Pendiente |
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

## Etapa 10 — Cinco objetos y escapar

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
Por su tamaño se divide en dos partes.

### 11A — Estructura

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

### 11B — Zonas especiales

| Zona | Cómo funciona |
|---|---|
| **Ventilaciones** | Conductos bajos (solo agachado) que conectan cuartos. El dueño no entra, pero moverse adentro hace ruido metálico. |
| **Túneles** | Pasadizo desde el sótano al jardín (nueva forma de entrar, por ejemplo desde la cucha o un pozo). Solo agachado. |
| **Puentes** | Pasarela sobre un hall de doble altura o entre dos alas de la casa. Si te caés, aterrizás con ruido. |
| **Ático** | Se entra por una trampilla (E) con escalera plegable. |
| **Pasadizo secreto** | Un estante de la biblioteca que gira (E). |

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
| ¿Dónde está la zona de escape? | La tranquera del frente | Etapa 10 |
| ¿Cuántos objetos en total? | ~18 tipos, se sortean 5 | Etapa 10 |
| ¿Los perros pueden entrar por la puerta trasera? | No, se quedan en el patio | Etapa 12 |
| ¿Linterna para el sótano? | Sí, si el sótano queda muy oscuro | Etapa 11 |
| ¿Habilidades con inventario o al agarrar? | Al agarrar (más simple) | Etapa 13 |

---

## Historial (etapas 1 a 8)

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
