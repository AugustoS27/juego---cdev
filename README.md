# El Ladrón Torpe

Juego 3D cómico en primera persona hecho con **Three.js** y **Vite** (proyecto universitario).

Sos un ladrón torpe que tiene que meterse en una casa de dos pisos. Empezás afuera y hay varias
formas de entrar: romper una ventana, la puerta trasera que quedó abierta, una escalera al balcón,
forzar el portón del garaje o buscar la llave escondida en una maceta. Adentro, una pista (un acertijo)
te dice qué objeto tenés que encontrar. Si lo agarrás, ganás. Si el dueño te atrapa, perdés.

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
| E | Abrir/cerrar puertas, esconderse, agarrar el objeto |
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
| `src/HouseData.js` | La casa como datos: habitaciones, paredes, puertas, muebles, entradas, waypoints |
| `src/Exterior.js` | Jardín, cerca, techos, balcón, ventanas de afuera, árboles y barrio |
| `src/Entradas.js` | Las formas de entrar: ventana rompible, escalera, portón y macetas con la llave |
| `src/Door.js` | Puertas con bisagra (abrir, cerrar, trabar) |
| `src/Items.js` | Los objetos a encontrar, sus pistas y ubicaciones posibles |
| `src/Noise.js` | Sistema de ruido con radio de alcance |
| `src/Audio.js` | Sonidos generados con la Web Audio API (sin archivos) |
| `src/UI.js` | HUD, avisos y pantallas (menú, pausa, victoria, derrota) |
| `src/Materials.js` | Materiales toon (look de dibujito) |
| `src/Texturas.js` | Texturas dibujadas con código: madera, cerámica, baldosas, pasto, tejas |
| `src/Models.js` | Carga de modelos GLTF y encaje en la caja de cada objeto |

## Ideas principales

- **Colisiones AABB:** el jugador y el dueño son cajas. Se mueve un eje por vez; si choca, se deshace ese eje (así se desliza contra las paredes).
- **Suelo con un rayo:** un rayo hacia abajo encuentra el piso. La escalera es una rampa invisible, así no hace falta física de escalones.
- **Máquina de estados del dueño:** PATRULLA → (te ve) → PERSEGUIR → (te pierde) → INVESTIGAR → PATRULLA. Un ruido también lo manda a INVESTIGAR.
- **Visión:** distancia + ángulo (cono) + un raycast para ver si hay paredes en el medio.
- **Navegación:** waypoints conectados; el camino con menos saltos se busca con BFS y se recorre en línea recta.
- **Ruido:** cada ruido tiene un radio; si el dueño está dentro, va a investigar.
- **Escondites:** placards y camas. Escondido no te ve, pero si pasa cerca puede sospechar (40%) y revisar.
- **Tensión creciente:** cada 30 s el dueño camina un 10% más rápido, y a veces traba puertas por 20 s.
- **Entradas con precio:** cada forma de entrar tiene su costo (ruido, distancia, riesgo). Cada entrada devuelve un "resultado" (sonido, ruido, aviso, animación) y Game lo aplica.
- **El dueño no sale:** si el ruido o el jugador están afuera, va al punto de adentro más cercano.

## Gráficos: assets + creaciones propias

**Assets (modelos 3D):** [Kenney](https://kenney.nl) — *Furniture Kit* y *Nature Kit*, licencia CC0
(dominio público). Están en `public/models/muebles` y `public/models/naturaleza`, con su licencia.

**Hecho por nosotros (con código):**
- La casa (paredes, techo a dos aguas, balcón, garaje), el dueño, los objetos, el auto y las entradas.
- Las texturas de madera, cerámica, baldosas, pasto y tejas, dibujadas en un `<canvas>` (`Texturas.js`).
- El look de dibujo animado: materiales toon de 3 tonos + bordes negros (`OutlineEffect`, tecla **B**).
- El cielo con degradé, las nubes y el barrio de fondo.

**Cómo se combinan:** cada mueble o planta se arma primero con formas básicas (que también son su
caja de colisión). Después se carga el modelo GLTF y se lo encaja en esa misma caja (`Models.js`).
Si el modelo no carga, queda la forma básica y el juego funciona igual. En `HouseData.js` cada
mueble indica su `modelo` (uno) o sus `modelos` (varios, cada uno en su caja).
