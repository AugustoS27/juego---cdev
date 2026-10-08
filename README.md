# El Ladrón Torpe

Juego 3D cómico en primera persona hecho con **Three.js** y **Vite** (proyecto universitario).

Sos un ladrón torpe que tiene que meterse en una casa enorme: sótano tenebroso, tres pisos y un ático.
Empezás afuera y hay muchas formas de entrar: romper una ventana, la puerta trasera que quedó abierta, una escalera al balcón,
forzar el portón del garaje, buscar la llave escondida en una maceta, bajar por el pozo del jardín hasta un túnel secreto,
tirarte por la chimenea, colarte por la ventanita del sótano o por la gatera, trepar la enredadera o subir al techo del
garaje saltando por los trastos para llegar al tragaluz del ático.
Adentro hay conductos de ventilación, un pasadizo detrás de un estante de la biblioteca, una escalera plegable al ático
y un puente sin baranda. Adentro tenés que robar **5 objetos**
(sorteados entre 18): de cada uno solo sabés una pista (un acertijo). Con los cinco en la bolsa, escapás en la
**van negra** de tu cómplice, que te espera en el frente. Si el dueño te atrapa, perdés.
Y no es el único: en el patio hay **dos perros** que oyen todo, y en el primer piso vive **la abuela**,
que se hamaca en su mecedora... con una escopeta de perdigones de sal.
Para ayudarte, hay escondidas una **zanahoria** (te deja ver un objeto a través de las paredes), unas
**botas de lana** (pasos silenciosos) y una **bebida energética** (más rápido), que duran unos segundos.

> 📋 El plan de las próximas mejoras (etapas 9 a 14) está en [PLAN.md](PLAN.md).

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
| E | Abrir/cerrar puertas y rejillas, esconderse, agarrar objetos y habilidades, usar el pozo y la escalera del ático |
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
| `src/Dueno.js` | El dueño: toda la casa, traba puertas, revisa escondites, se enoja con el tiempo |
| `src/Perro.js` | Los dos perros del patio: rapidísimos, ven poco, oyen el doble, ladran y se aburren |
| `src/Abuela.js` | La abuela: se hamaca, apunta 1 s, dispara (con puntería que depende de la distancia) y recarga |
| `src/House.js` | Construye la casa desde los datos y responde consultas (colisiones, suelo, visión) |
| `src/HouseData.js` | Junta los datos de todos los pisos; escaleras, techo, entradas |
| `src/datos/` | La casa como datos: un archivo por piso (habitaciones, paredes, puertas, muebles, luces, waypoints), el patio de los perros, el catálogo de muebles y lo común |
| `src/Decoracion.js` | Decoración de los interiores: marcos, lámparas, cuadros, telarañas, goteras y polvo |
| `src/Cuadros.js` | Los cuadros: 16 dibujos hechos con código en una sola imagen (atlas) |
| `src/Optimizar.js` | Junta todo lo que no se mueve en pocas mallas (una por material) para dibujar más rápido |
| `src/Exterior.js` | Jardín, cerca, cerco del patio de los perros, techos, balcón, ventanas de afuera, árboles y barrio |
| `src/Entradas.js` | Las formas de entrar: ventana rompible, escalera, portón y macetas con la llave |
| `src/EntradasNuevas.js` | Chimenea, ventanita del sótano, gatera, enredadera y tragaluz del ático |
| `src/Especiales.js` | La escalera plegable del ático (trampilla) y el pozo que baja al túnel secreto |
| `src/Door.js` | Puertas con bisagra (abrir, cerrar, trabar); también rejillas, la tabla del túnel y el estante secreto |
| `src/Items.js` | Los 18 objetos, sus pistas y ubicaciones; sorteo de los 5 de cada partida |
| `src/Efectos.js` | Lo que vuela hacia la cámara (con un destello) cuando agarrás algo |
| `src/Habilidades.js` | Zanahoria, botas de lana y bebida energética: dónde aparecen, cuánto duran y el brillo de la zanahoria |
| `src/Escape.js` | La van negra y la zona de escape (se prende con los 5 objetos) |
| `src/Noise.js` | Sistema de ruido con radio de alcance (lo escuchan todos los enemigos, cada uno con su oído) |
| `src/Audio.js` | Sonidos generados con la Web Audio API (sin archivos) |
| `src/UI.js` | HUD, avisos y pantallas (menú, pausa, victoria, derrota) |
| `src/Materials.js` | Materiales toon (look de dibujito) |
| `src/Texturas.js` | Texturas dibujadas con código: pisos, pasto, tejas, empapelados y telarañas |
| `src/Models.js` | Carga de modelos GLTF y encaje en la caja de cada objeto |

## Ideas principales

- **Colisiones AABB:** el jugador y los enemigos son cajas. Se mueve un eje por vez; si choca, se deshace ese eje (así se desliza contra las paredes).
- **Suelo con un rayo:** un rayo hacia abajo encuentra el piso. Las escaleras son rampas invisibles, así no hace falta física de escalones. Los tramos principales van uno encima del otro.
- **Luz que sigue al jugador:** un solo "sol" de adentro, debajo del techo del piso donde estás. El sótano es oscuro y tiene lamparitas que parpadean.
- **Conductos y túnel:** caños bajos (1,15 m por dentro): solo se pasan agachado y el dueño (1,8 m) no entra. Adentro de la chapa, cada paso hace ruido.
- **Escalera plegable:** todo lo de la escalera cuelga de un grupo que gira sobre su punta de arriba; plegada, su rampa queda horizontal y es la tapa de la trampilla.
- **Empapelados en metros:** las coordenadas de textura de las paredes salen de su posición en el mundo, así el dibujo mide siempre 1 m y un solo material sirve para todas las paredes de un cuarto.
- **Atlas de cuadros:** todos los cuadros usan pedacitos de una misma imagen; el del sótano mueve las pupilas hacia el jugador.
- **Juntar mallas:** cada malla es un "dibujo" para la placa de video; las paredes, pisos, decoración y muebles se juntan en una malla por material (ver `Optimizar.js`).
- **Máquina de estados de los enemigos:** PATRULLA → (te ve) → PERSEGUIR → (te pierde) → INVESTIGAR → PATRULLA. Un ruido también lo manda a INVESTIGAR.
- **Un esqueleto, cuatro enemigos:** `Enemigo.js` tiene todo lo común; el dueño, los perros y la abuela son "el mismo esqueleto con otros números" (velocidad, vista, oído) y cada uno sobrescribe lo suyo. La abuela, por ejemplo, cambia PERSEGUIR por APUNTAR → disparar → RECARGAR.
- **Zonas:** cada enemigo tiene una zona de la que no sale (la casa, el patio, el piso de la abuela). Si el jugador o un ruido están afuera, va al punto de su zona más cercano.
- **Visión:** distancia + ángulo (cono) + un raycast para ver si hay paredes en el medio.
- **Navegación:** waypoints conectados; el camino con menos saltos se busca con BFS y se recorre en línea recta.
- **Ruido:** cada ruido tiene un radio; los enemigos que estén dentro van a investigar (los perros oyen al doble de distancia, la abuela a la mitad). Los ladridos y los disparos también son ruidos: así un enemigo alerta a los otros.
- **Puntería de la abuela:** probabilidad de acierto = según la distancia (60% a 3 m, 15% a 12 m) × según cómo te movés (corriendo ×0,6). Si justo cuando dispara no te ve, erra seguro.
- **Escondites:** placards y camas. Escondido no te ve, pero si pasa cerca puede sospechar (40%) y revisar.
- **Tensión creciente:** cada 30 s el dueño camina un 10% más rápido, y a veces traba puertas por 20 s.
- **Entradas con precio:** cada forma de entrar tiene su costo (ruido, distancia, riesgo). Cada entrada devuelve un "resultado" (sonido, ruido, aviso, animación) y Game lo aplica.
- **Habilidades:** `Habilidades.js` solo sabe cuáles están activas y cuánto les queda; Game le pasa el efecto al jugador (`multiplicadorVelocidad`, `pasosSilenciosos`). La zanahoria pone una copia del objeto con un material que se dibuja por encima de todo (`depthTest: false`): por eso "se ve a través" de las paredes.
- **Animaciones con curvas:** las puertas no giran a velocidad fija, siguen una función del tiempo (se pasan un poco y vuelven). El sacudón de la cámara al aterrizar es un resorte: una fuerza la devuelve a su lugar y un freno evita que rebote mucho.
- **Botín sorteado:** se mezclan los 18 objetos, se toman 5 y a cada uno se le elige una ubicación que no esté
  pegada a la de otro. Así cada partida es distinta.

## Gráficos: assets + creaciones propias

**Assets (modelos 3D):** [Kenney](https://kenney.nl) — *Furniture Kit* y *Nature Kit*, licencia CC0
(dominio público). Están en `public/models/muebles` y `public/models/naturaleza`, con su licencia.

**Hecho por nosotros (con código):**
- La casa (paredes, techo a dos aguas, balcón, garaje), el dueño, los perros, la abuela y su mecedora, los objetos, el auto, la van y las entradas.
- Las texturas de madera, cerámica, baldosas, pasto y tejas, dibujadas en un `<canvas>` (`Texturas.js`).
- El look de dibujo animado: materiales toon de 3 tonos + bordes negros (`OutlineEffect`, tecla **B**).
- El cielo con degradé, las nubes y el barrio de fondo.

**Cómo se combinan:** cada mueble o planta se arma primero con formas básicas (que también son su
caja de colisión). Después se carga el modelo GLTF y se lo encaja en esa misma caja (`Models.js`).
Si el modelo no carga, queda la forma básica y el juego funciona igual. En `src/datos/muebles.js` cada
mueble indica su `modelo` (uno) o sus `modelos` (varios, cada uno en su caja).
