# Operación Juguetes

Juego 3D de sigilo en primera persona, cómico y con un poco de miedo (de película para chicos), hecho con
**Three.js** y **Vite** (proyecto universitario).
(Antes se llamaba *El Ladrón Torpe*: en la etapa 15 cambiamos la historia.)

Sos **Tomi**, un nene del barrio. Cada vez que un juguete cae en el jardín de los vecinos, **Don Ernesto y
Doña Pocha** se lo quedan. Hoy te cansaste: te vas a meter en su casa enorme (sótano tenebroso, tres pisos y un
ático) para recuperar **3 juguetes** (sorteados entre 8). Sabés cuáles son, y tu amigo **Facu** te dice por el
**walkie-talkie** dónde los vio con los binoculares (con **T** le pedís una pista más precisa). Él te espera en la
entrada de autos con las bicis. Con los tres en la mochila, volvés con él y ganás. Si Don Ernesto te atrapa, perdés.
Empezás afuera y hay muchas formas de entrar, repartidas por los cuatro costados: romper la ventana de la cocina (atrás), la puerta trasera que quedó abierta, una escalera al balcón,
forzar el portón del garaje, buscar la llave escondida en una maceta, bajar por el pozo del jardín hasta un túnel secreto,
tirarte por la chimenea, colarte por la ventanita del sótano (al costado) o por la gatera, trepar la enredadera o subir al techo del
garaje saltando por los trastos para llegar al tragaluz del ático.
Adentro hay conductos de ventilación, un pasadizo detrás de un estante de la biblioteca, una escalera plegable al ático
y un puente sin baranda.
Y Don Ernesto no es el único: en el patio hay **dos perros** que oyen todo, y en el primer piso vive **Doña Pocha**,
que se hamaca en su mecedora... con un **lanzarredes**: si la red te agarra, quedás quieto 3 segundos mientras ella
le grita a Don Ernesto.
Para ayudarte, hay escondidas una **zanahoria** (te deja ver uno de tus juguetes a través de las paredes), unas
**botas de lana** (pasos silenciosos) y una **bebida energética** (más rápido), que duran unos segundos.
Y para esconderte: placards, camas, mesas, la bañera (detrás de la cortina), cajas grandes, arbustos... o el
tacho de basura, si no te importa salir oliendo mal (los perros te huelen de lejos).

**De día o de noche** (se sortea o se elige en el menú). De noche está todo oscuro: los vecinos ven menos, tenés
una **linterna** (F)... pero con la luz prendida te ven desde más lejos. Algunas noches hay **tormenta**. En el
garaje está el **tablero de luz**: si bajás la llave, la casa queda a oscuras hasta que Don Ernesto va a arreglarla
(y la segunda vez sospecha).

La casa da un poco de miedo: una **sala llena de relojes**, un **vestidor** con ropa que se mueve, **sábanas
colgadas** en el ático, un maniquí que gira cuando no lo mirás, una muñeca que cambia de lugar, un teléfono que
suena solo, tablas que crujen...

**No hay carteles que expliquen lo que pasa:** se entiende por el sonido (los pasos suenan desde donde están y
según el piso), por la **música** (cambia si hay alguien cerca, si te buscan o si te vieron) y por la pantalla.

> 📋 Los planes: etapas 9 a 14 en [PLAN.md](PLAN.md), la nueva historia (etapa 15) en
> [PLAN_HISTORIA.md](PLAN_HISTORIA.md), el miedo (etapa 16: día y noche, luces, sonido, cuartos y sustos) en
> [PLAN_TERROR.md](PLAN_TERROR.md) y las mejoras de la etapa 17 en [PLAN_MEJORAS.md](PLAN_MEJORAS.md).

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173` en Chrome, Edge o Firefox (hace falta Pointer Lock para el mouse).

Para generar la versión final: `npm run build` (queda en `dist/`).

## Controles

| Tecla | Acción |
|---|---|
| WASD | Moverse |
| Mouse | Mirar |
| Shift | Correr (hace ruido) |
| Espacio | Saltar (se puede subir arriba de los muebles) |
| C (mantener) | Agacharse: más lento pero casi sin ruido |
| E | Abrir/cerrar puertas y rejillas, esconderse, agarrar objetos y habilidades, usar las entradas, el tablero de luz y el teléfono |
| T | Pedirle a Facu una pista más precisa por el walkie |
| F | Linterna (de noche) |
| M | Activar/desactivar sonido |
| B | Activar/desactivar los bordes de dibujo animado |
| Esc | Pausa |

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/main.js` | Punto de entrada: crea el juego |
| `src/Game.js` | El "director": crea todo, conecta las partes, loop principal y estados de la partida |
| `src/Player.js` | Movimiento WASD, colisiones AABB, gravedad, ruido al correr, escondites; velocidad y ruido modificables (habilidades) |
| `src/Enemigo.js` | El "esqueleto" de todos los enemigos: máquina de estados, visión, oído, navegación por waypoints y zona |
| `src/Dueno.js` | Don Ernesto ("el dueño" en el código): toda la casa, traba puertas, revisa escondites, va al tablero cuando le cortan la luz |
| `src/Perro.js` | Los dos perros del patio: rapidísimos, ven poco, oyen el doble, ladran y se aburren |
| `src/Abuela.js` | Doña Pocha ("la abuela" en el código): se hamaca, apunta 1 s, lanza una red (con puntería que depende de la distancia) y recarga |
| `src/Personajes.js` | Los personajes con formas básicas y telas dibujadas: Don Ernesto, Doña Pocha, Tomi y Facu |
| `src/Red.js` | Las redes del lanzarredes: vuelan, te enredan si te tocan o quedan tiradas donde pegan |
| `src/House.js` | Construye la casa desde los datos y responde consultas (colisiones, suelo, visión) |
| `src/HouseData.js` | Junta los datos de todos los pisos; escaleras, techo, entradas |
| `src/datos/` | La casa como datos: un archivo por piso (habitaciones, paredes, puertas, muebles, luces, waypoints), el patio de los perros, el catálogo de muebles y lo común |
| `src/Decoracion.js` | Decoración de los interiores: marcos, lámparas, cuadros, telarañas, goteras, polvo y telas colgadas que se hamacan |
| `src/Cuadros.js` | Los cuadros: 16 dibujos hechos con código en una sola imagen (atlas) |
| `src/Optimizar.js` | Junta todo lo que no se mueve en pocas mallas (una por material) para dibujar más rápido |
| `src/Exterior.js` | Jardín, cerca, cerco del patio de los perros, techos, balcón, ventanas de afuera, árboles y barrio |
| `src/Entradas.js` | Las formas de entrar: ventana rompible, escalera, portón y macetas con la llave |
| `src/EntradasNuevas.js` | Chimenea, ventanita del sótano, gatera, enredadera y tragaluz del ático |
| `src/Escondites.js` | Los tipos de escondite en una tabla: textos, altura de los ojos, sonido y reglas (la mesa, el olor del tacho) |
| `src/Especiales.js` | La escalera plegable del ático (trampilla) y el pozo que baja al túnel secreto |
| `src/Door.js` | Puertas con bisagra (abrir, cerrar, trabar); también rejillas, la tabla del túnel y el estante secreto |
| `src/Items.js` | Los 8 juguetes (hechos con formas básicas) y sus ubicaciones; sorteo de los 3 de cada partida |
| `src/Efectos.js` | Lo que vuela hacia la cámara (con un destello) cuando agarrás algo |
| `src/Habilidades.js` | Zanahoria, botas de lana y bebida energética: dónde aparecen, cuánto duran y el brillo de la zanahoria |
| `src/Walkie.js` | Facu por el walkie-talkie: pistas en tres niveles (piso, cuarto, lugar) con la tecla T |
| `src/Escape.js` | Facu con las dos bicis y la zona de escape (se prende con los 3 juguetes) |
| `src/Noise.js` | Sistema de ruido con radio de alcance (lo escuchan todos los enemigos, cada uno con su oído) |
| `src/Audio.js` | Todos los efectos de sonido, armados con la Web Audio API; pueden sonar en un lugar del mundo |
| `src/Sonido.js` | El motor de sonido: de qué lado viene cada cosa, paredes que tapan, eco según el lugar y qué superficie se pisa |
| `src/SonidosGrabados.js` | Sonidos grabados de Kenney (pasos, puertas, golpes), como alternativa a los hechos con código |
| `src/Ambiente.js` | Ruidos de la casa y de afuera (crujidos, relojes, viento, grillos) y el corazón y la respiración de Tomi |
| `src/Musica.js` | Música por capas que entran según lo que pasa (calma, alguien cerca, te buscan, te persiguen) |
| `src/Turno.js` | Día y noche como datos (cielo, luces, cuánto ven los enemigos) y las linternas |
| `src/Lamparas.js` | Las lámparas que alumbran: 6 luces que se mudan a las lámparas más cercanas al jugador |
| `src/Atmosfera.js` | Luz de las ventanas en el piso, vidrios con gotas, lluvia y polvo en el haz de la linterna |
| `src/CorteDeLuz.js` | El tablero de luz del garaje: cortar y devolver la luz, y la vela de Doña Pocha |
| `src/Sustos.js` | Cosas raras de la casa: el maniquí, la muñeca, las tablas flojas, el teléfono, la tele, el cuadro que se cae |
| `src/Cinematica.js`, `src/Escenas.js` | Las cinemáticas (intro, victoria, derrotas) y la escena del menú |
| `src/UI.js` | HUD y pantallas (menú, ayuda, pausa, victoria, derrota) |
| `src/Materials.js` | Materiales toon (look de dibujito) |
| `src/Texturas.js` | Texturas dibujadas con código: pisos, pasto, tejas, empapelados y telarañas |
| `src/Models.js` | Carga de modelos GLTF y encaje en la caja de cada objeto |

## Ideas principales

- **Colisiones AABB:** el jugador y los enemigos son cajas. Se mueve un eje por vez; si choca, se deshace ese eje (así se desliza contra las paredes).
- **Suelo con un rayo:** un rayo hacia abajo encuentra el piso. Las escaleras son rampas invisibles, así no hace falta física de escalones. Los tramos principales van uno encima del otro.
- **Luz que sigue al jugador:** un solo "sol" de adentro, debajo del techo del piso donde estás. El sótano es oscuro y tiene lamparitas que parpadean.
- **Las luces nunca se agregan ni se sacan:** cambiar la cantidad de luces obliga a rearmar todos los materiales y el juego se traba. Por eso las linternas, el relámpago y las lámparas existen siempre y solo se les cambia la intensidad; y para las lámparas hay 6 luces que se "mudan" a las más cercanas (`Lamparas.js`).
- **Día y noche como datos:** cada turno es una tabla (cielo, niebla, luces, cuánto ven los enemigos) en `Turno.js`; cambiar de turno es copiar esos valores.
- **Sonido con lugar:** cada sonido pasa por un "panner" (de qué lado viene y qué tan lejos), un filtro si hay una pared en el medio y un eco distinto según el cuarto (`Sonido.js`).
- **Música por capas:** no hay canciones, hay capas que suben y bajan según el peligro; las notas se programan con el reloj del audio para que el ritmo no dependa de los cuadros por segundo (`Musica.js`).
- **Conductos y túnel:** caños bajos (1,15 m por dentro): solo se pasan agachado y el dueño (1,8 m) no entra. Adentro de la chapa, cada paso hace ruido.
- **Escalera plegable:** todo lo de la escalera cuelga de un grupo que gira sobre su punta de arriba; plegada, su rampa queda horizontal y es la tapa de la trampilla.
- **Empapelados en metros:** las coordenadas de textura de las paredes salen de su posición en el mundo, así el dibujo mide siempre 1 m y un solo material sirve para todas las paredes de un cuarto.
- **Atlas de cuadros:** todos los cuadros usan pedacitos de una misma imagen; el del sótano mueve las pupilas hacia el jugador.
- **Juntar mallas:** cada malla es un "dibujo" para la placa de video; las paredes, pisos, decoración y muebles se juntan en una malla por material (ver `Optimizar.js`).
- **Máquina de estados de los enemigos:** PATRULLA → (te ve) → PERSEGUIR → (te pierde) → INVESTIGAR → PATRULLA. Un ruido también lo manda a INVESTIGAR.
- **Un esqueleto, cuatro enemigos:** `Enemigo.js` tiene todo lo común; el dueño, los perros y la abuela son "el mismo esqueleto con otros números" (velocidad, vista, oído) y cada uno sobrescribe lo suyo. Doña Pocha ("la abuela" en el código), por ejemplo, cambia PERSEGUIR por APUNTAR → lanzar la red → RECARGAR.
- **Zonas:** cada enemigo tiene una zona de la que no sale (la casa, el patio, el piso de la abuela). Si el jugador o un ruido están afuera, va al punto de su zona más cercano.
- **Visión:** distancia + ángulo (cono) + un raycast para ver si hay paredes en el medio.
- **Navegación:** waypoints conectados; el camino con menos saltos se busca con BFS y se recorre en línea recta.
- **Ruido:** cada ruido tiene un radio; los enemigos que estén dentro van a investigar (los perros oyen al doble de distancia, la abuela a la mitad). Los ladridos, el "¡FUAP!" de la red y el grito de Doña Pocha también son ruidos: así un enemigo alerta a los otros.
- **Puntería de Doña Pocha:** probabilidad de apuntar bien = según la distancia (60% a 3 m, 15% a 12 m) × según cómo te movés (corriendo ×0,6); si apunta mal, la red sale de costado. Además la red tarda en llegar (14 m/s), así que corriendo de costado se esquiva. Si te agarra, 3 s enredado y después 2 s en los que no te puede volver a enredar.
- **Escondites:** una tabla de tipos (`Escondites.js`) y un solo sistema para todos. Escondido no te ve, pero si pasa cerca puede sospechar (40%) y revisar. Debajo de una mesa, si te mira de cerca, te ve. La "vista" desde adentro (rendijas, cortina, hojas) es una máscara de CSS encima del juego.
- **Puertas trabadas:** a veces el dueño traba por 20 s una puerta que acaba de cruzar.
- **Entradas con precio:** cada forma de entrar tiene su costo (ruido, distancia, riesgo). Cada entrada devuelve un "resultado" (sonido, ruido, animación) y Game lo aplica.
- **Sin carteles:** el juego no explica con texto lo que pasa; cada situación tiene su sonido, su música o su efecto de pantalla. Solo quedan los carteles de "[E]" al mirar algo que se puede usar.
- **Sustos con reglas:** los de una sola vez tienen un tiempo mínimo entre uno y otro; los que hacen ruido usan el mismo sistema de ruido que los pasos (`Sustos.js`).
- **Habilidades:** `Habilidades.js` solo sabe cuáles están activas y cuánto les queda; Game le pasa el efecto al jugador (`multiplicadorVelocidad`, `pasosSilenciosos`). La zanahoria pone una copia del objeto con un material que se dibuja por encima de todo (`depthTest: false`): por eso "se ve a través" de las paredes.
- **Animaciones con curvas:** las puertas no giran a velocidad fija, siguen una función del tiempo (se pasan un poco y vuelven). El sacudón de la cámara al aterrizar es un resorte: una fuerza la devuelve a su lugar y un freno evita que rebote mucho.
- **Juguetes sorteados:** se mezclan los 8 juguetes, se toman 3 y a cada uno se le elige una ubicación que no esté
  pegada a la de otro. Así cada partida es distinta.

## Gráficos: assets + creaciones propias

**Assets (modelos 3D):** [Kenney](https://kenney.nl) — *Furniture Kit* y *Nature Kit*, licencia CC0
(dominio público). Están en `public/models/muebles` y `public/models/naturaleza`, con su licencia.

**Assets (sonidos):** [Kenney](https://kenney.nl) — *Impact Sounds* y *RPG Audio*, licencia CC0. Solo los 44
que se usan (pasos, puertas, crujidos, golpes), en `public/sonidos` con su licencia. En el menú se puede elegir
entre estos y los mismos sonidos hechos con código. La música y el resto de los efectos son siempre con código.

**Hecho por nosotros (con código):**
- La casa (paredes, techo a dos aguas, balcón, garaje), Don Ernesto, los perros, Doña Pocha y su mecedora, los juguetes, el auto, Facu, las bicis y las entradas.
- Los arbustos (esferas, para poder esconderse adentro), los tachos de basura y la cortina de la bañera.
- Los personajes (`Personajes.js`): cápsulas, esferas y cilindros con telas dibujadas en un canvas (la bata a
  cuadros, el pijama a rayas, la pollera con lunares, el saquito tejido).
- Las texturas de madera, cerámica, baldosas, pasto y tejas, dibujadas en un `<canvas>` (`Texturas.js`).
- El look de dibujo animado: materiales toon de 3 tonos + bordes negros (`OutlineEffect`, tecla **B**).
- El cielo con degradé, las nubes y el barrio de fondo.

**Cómo se combinan:** cada mueble o planta se arma primero con formas básicas (que también son su
caja de colisión). Después se carga el modelo GLTF y se lo encaja en esa misma caja (`Models.js`).
Si el modelo no carga, queda la forma básica y el juego funciona igual. En `src/datos/muebles.js` cada
mueble indica su `modelo` (uno) o sus `modelos` (varios, cada uno en su caja).
