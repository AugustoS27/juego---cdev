# El Ladrón Torpe

Juego 3D cómico en primera persona hecho con **Three.js** y **Vite** (proyecto universitario).

Sos un ladrón torpe que tiene que meterse en una casa enorme: sótano tenebroso, tres pisos y un ático.
Empezás afuera y hay varias formas de entrar: romper una ventana, la puerta trasera que quedó abierta, una escalera al balcón,
forzar el portón del garaje, buscar la llave escondida en una maceta o bajar por el pozo del jardín hasta un túnel secreto.
Adentro hay conductos de ventilación, un pasadizo detrás de un estante de la biblioteca, una escalera plegable al ático
y un puente sin baranda. Adentro tenés que robar **5 objetos**
(sorteados entre 18): de cada uno solo sabés una pista (un acertijo). Con los cinco en la bolsa, escapás en la
**van negra** de tu cómplice, que te espera en el frente. Si el dueño te atrapa, perdés.

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
| E | Abrir/cerrar puertas y rejillas, esconderse, agarrar objetos, usar el pozo y la escalera del ático |
| M | Activar/desactivar sonido |
| B | Activar/desactivar los bordes de dibujo animado |
| Esc | Pausa |

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/main.js` | Punto de entrada: crea el juego |
| `src/Game.js` | El "director": crea todo, conecta las partes, loop principal y estados de la partida |
| `src/Player.js` | Movimiento WASD, colisiones AABB, gravedad, ruido al correr, escondites |
| `src/Owner.js` | El dueño: máquina de estados, visión, navegación por waypoints |
| `src/House.js` | Construye la casa desde los datos y responde consultas (colisiones, suelo, visión) |
| `src/HouseData.js` | Junta los datos de todos los pisos; escaleras, techo, entradas |
| `src/datos/` | La casa como datos: un archivo por piso (habitaciones, paredes, puertas, muebles, luces, waypoints), el catálogo de muebles y lo común |
| `src/Optimizar.js` | Junta todo lo que no se mueve en pocas mallas (una por material) para dibujar más rápido |
| `src/Exterior.js` | Jardín, cerca, techos, balcón, ventanas de afuera, árboles y barrio |
| `src/Entradas.js` | Las formas de entrar: ventana rompible, escalera, portón y macetas con la llave |
| `src/Especiales.js` | La escalera plegable del ático (trampilla) y el pozo que baja al túnel secreto |
| `src/Door.js` | Puertas con bisagra (abrir, cerrar, trabar); también rejillas, la tabla del túnel y el estante secreto |
| `src/Items.js` | Los 18 objetos, sus pistas y ubicaciones; sorteo de los 5 de cada partida |
| `src/Escape.js` | La van negra y la zona de escape (se prende con los 5 objetos) |
| `src/Noise.js` | Sistema de ruido con radio de alcance |
| `src/Audio.js` | Sonidos generados con la Web Audio API (sin archivos) |
| `src/UI.js` | HUD, avisos y pantallas (menú, pausa, victoria, derrota) |
| `src/Materials.js` | Materiales toon (look de dibujito) |
| `src/Texturas.js` | Texturas dibujadas con código: madera, cerámica, baldosas, pasto, tejas |
| `src/Models.js` | Carga de modelos GLTF y encaje en la caja de cada objeto |

## Ideas principales

- **Colisiones AABB:** el jugador y el dueño son cajas. Se mueve un eje por vez; si choca, se deshace ese eje (así se desliza contra las paredes).
- **Suelo con un rayo:** un rayo hacia abajo encuentra el piso. Las escaleras son rampas invisibles, así no hace falta física de escalones. Los tramos principales van uno encima del otro.
- **Luz que sigue al jugador:** un solo "sol" de adentro, debajo del techo del piso donde estás. El sótano es oscuro y tiene lamparitas que parpadean.
- **Conductos y túnel:** caños bajos (1,15 m por dentro): solo se pasan agachado y el dueño (1,8 m) no entra. Adentro de la chapa, cada paso hace ruido.
- **Escalera plegable:** todo lo de la escalera cuelga de un grupo que gira sobre su punta de arriba; plegada, su rampa queda horizontal y es la tapa de la trampilla.
- **Juntar mallas:** cada malla es un "dibujo" para la placa de video; las paredes, pisos, decoración y muebles se juntan en una malla por material (ver `Optimizar.js`).
- **Máquina de estados del dueño:** PATRULLA → (te ve) → PERSEGUIR → (te pierde) → INVESTIGAR → PATRULLA. Un ruido también lo manda a INVESTIGAR.
- **Visión:** distancia + ángulo (cono) + un raycast para ver si hay paredes en el medio.
- **Navegación:** waypoints conectados; el camino con menos saltos se busca con BFS y se recorre en línea recta.
- **Ruido:** cada ruido tiene un radio; si el dueño está dentro, va a investigar.
- **Escondites:** placards y camas. Escondido no te ve, pero si pasa cerca puede sospechar (40%) y revisar.
- **Tensión creciente:** cada 30 s el dueño camina un 10% más rápido, y a veces traba puertas por 20 s.
- **Entradas con precio:** cada forma de entrar tiene su costo (ruido, distancia, riesgo). Cada entrada devuelve un "resultado" (sonido, ruido, aviso, animación) y Game lo aplica.
- **El dueño no sale:** si el ruido o el jugador están afuera, va al punto de adentro más cercano.
- **Botín sorteado:** se mezclan los 18 objetos, se toman 5 y a cada uno se le elige una ubicación que no esté
  pegada a la de otro. Así cada partida es distinta.

## Gráficos: assets + creaciones propias

**Assets (modelos 3D):** [Kenney](https://kenney.nl) — *Furniture Kit* y *Nature Kit*, licencia CC0
(dominio público). Están en `public/models/muebles` y `public/models/naturaleza`, con su licencia.

**Hecho por nosotros (con código):**
- La casa (paredes, techo a dos aguas, balcón, garaje), el dueño, los objetos, el auto, la van y las entradas.
- Las texturas de madera, cerámica, baldosas, pasto y tejas, dibujadas en un `<canvas>` (`Texturas.js`).
- El look de dibujo animado: materiales toon de 3 tonos + bordes negros (`OutlineEffect`, tecla **B**).
- El cielo con degradé, las nubes y el barrio de fondo.

**Cómo se combinan:** cada mueble o planta se arma primero con formas básicas (que también son su
caja de colisión). Después se carga el modelo GLTF y se lo encaja en esa misma caja (`Models.js`).
Si el modelo no carga, queda la forma básica y el juego funciona igual. En `src/datos/muebles.js` cada
mueble indica su `modelo` (uno) o sus `modelos` (varios, cada uno en su caja).
