# Plan de mejoras (etapa 17)

> **Estado actual:** 🔨 en curso. Plan confirmado por el usuario. **17A** ✅. Próxima: **17B**.
>
> Pedido del usuario: sacar los textos que explican lo que pasa (que se entienda por la pantalla, el sonido y
> la música), repartir las entradas de la casa, mejorar sonidos y música (sobre todo los pasos), sacar el enojo
> de Don Ernesto y mejorar la interfaz.
>
> La etapa 16E (música adaptativa) queda adentro de la 17C. La 16F (cuartos extraños y sustos) y la 16G (cierre)
> siguen pendientes para después.

## Resumen

| Etapa | Qué | Tamaño | Estado |
|---|---|---|---|
| **17A** | Sacar el enojo de Don Ernesto | Chica | ✅ Terminada |
| **17B** | Entradas repartidas: ventana rompible atrás y ventanita del sótano al costado izquierdo | Mediana | ⏳ Próxima |
| **17C** | Sonidos y música que cuenten lo que pasa (pasos más claros, música por capas) | Grande | — |
| **17D** | Sin textos que explican: todo por pantalla, sonido y música | Grande | — |
| **17E** | Interfaz nueva: cómo aparecen los textos que quedan, HUD más limpio | Mediana | — |

El orden importa: la 17D saca los avisos, así que antes (17C) tienen que existir los sonidos y la música que los
reemplazan. La 17E va al final porque trabaja sobre lo poco de texto que quede.

---

## 17A — Sacar el enojo de Don Ernesto ✅

**Hecho:** se sacó de `Game.js`, `UI.js`, `Audio.js`, `index.html` y `style.css`. Probado con una partida
simulada de 4 minutos: Don Ernesto patrulla a 1,6 m/s de principio a fin. Las pantallas de victoria y derrota
ya no muestran el enojo.

- Hoy, cada 30 segundos Don Ernesto camina un 10% más rápido (hasta 60% más). Se saca: camina siempre igual.
- Se van la barra "😠 Enojo" del HUD, el aviso de "cada vez más enojado" y el gruñido que lo acompañaba.
- **Cómo se prueba:** una partida simulada de 4 minutos: la velocidad de Don Ernesto no cambia.

## 17B — Entradas repartidas

Hoy, de 12 formas de entrar, 6 están en el frente (puerta con llave, gatera, ventana rompible, portón, escalera
al balcón, ventanita del sótano). Al costado izquierdo hay 3 (trastos al techo del garaje, chimenea, tragaluz) y
a la derecha/atrás 3 (puerta trasera, enredadera, pozo), todas dentro del patio de los perros. **Atrás, ninguna.**

- **Ventana rompible → atrás.** Se muda de la pared del frente (living) a la pared de atrás. Propuesta: la ventana
  de la cocina, que da al fondo. El frente queda con una ventana común en su lugar.
- **Ventanita del sótano → costado izquierdo** (mirando la casa de frente). Se muda del frente a la pared oeste,
  detrás del garaje, y sigue cayendo en la sala de la caldera.
- Se ajustan las pistas de Facu y los lugares de escondite cercanos, y se agrega un arbusto o algo para cubrirse
  atrás (hoy el fondo está pelado).
- **Cómo se prueba:** entrar por las dos entradas nuevas, que Don Ernesto escuche el vidrio roto y llegue, y que
  en el frente ya no se pueda entrar por los lugares viejos.

## 17C — Sonidos y música que cuenten lo que pasa

- **Pasos más claros:** más fuertes y con más cuerpo los tuyos; los de Don Ernesto se tienen que escuchar desde
  más lejos y distinguirse bien (hoy se pierden contra el ambiente). El ambiente (viento, tele, grillos) baja.
- **Música por capas** (lo que era la 16E), en vez de las dos melodías de hoy:
  - Calma: casi silencio, una nota grave larga.
  - Hay alguien cerca: entra un pulso, cada vez más rápido.
  - Te buscan (escucharon algo): cuerdas tensas que suben.
  - Te persiguen: tema rápido con percusión. Al perderte, se apaga de a poco.
  - Golpes de susto: cuando te ven, cuando se abre una puerta al lado tuyo.
- **Sonidos que reemplazan avisos** (los usa la 17D): puerta trabada, Don Ernesto que escuchó algo, perros que te
  olieron, Doña Pocha apuntando, juguete recuperado, "ya tenés los tres".
- **Cómo se prueba:** con el probador de sonidos, y midiendo que los pasos de Don Ernesto a 10 m se escuchen por
  encima del ambiente.

## 17D — Sin textos que explican

Hoy hay unos 30 avisos de texto ("¡TE VIO!", "Don Ernesto escuchó algo", "trabó una puerta"...). Se sacan todos y
cada situación pasa a contarse sola:

| Situación | Hoy | Después |
|---|---|---|
| Te vio | Texto + borde rojo | Golpe de música, borde rojo, tema de persecución |
| Escuchó algo y viene | Texto | Cuerdas tensas + sus pasos acercándose |
| Trabó una puerta | Texto | Ruido de cerradura desde la puerta + el picaporte no gira al probarla |
| Doña Pocha apunta | Texto + mira | Clic del lanzarredes + la mira roja |
| Te enredó la red | Texto | La red en pantalla + forcejeo + su grito |
| Recuperaste un juguete | Texto | Sonido + se tilda en la lista |
| Tenés los tres | Texto | Fanfarria + la zona de escape brilla |
| Corte de luz | Texto | El clac, el parpadeo, el rezongo de Don Ernesto |
| Olés a basura | Texto | Un borde verdoso en la pantalla |

- **Lo que propongo dejar:** el cartelito de "[E]" al mirar algo que se puede usar (es un control, no una
  explicación), la lista de juguetes y lo que dice Facu **solo cuando le pedís una pista con T**.
- Los comentarios espontáneos de Facu ("¡Te vio Don Ernesto!") se sacan: también explican lo que pasa.
- **Cómo se prueba:** una partida completa sin un solo aviso de texto, revisando que cada situación tenga su señal.

## 17E — Interfaz nueva

- HUD más limpio: sin el recuadro de estado (el piso, el turno y el reloj pasan a ser chiquitos o se van); la
  lista de juguetes como íconos; el ruidómetro como una onda discreta.
- Los textos que quedan (pistas de Facu, "[E]", subtítulos de las cinemáticas) aparecen con una animación suave
  y una tipografía más prolija, en vez de carteles que saltan.
- Menú, pausa y pantallas de final con el mismo estilo.
- **Cómo se prueba:** capturas de cada pantalla en ventana grande y chica.

---

## Decisiones (✅ todas confirmadas por el usuario)

| Decisión | Propuesta |
|---|---|
| ¿Mudar o agregar las entradas? | **Mudar** (la ventana rompible y la ventanita dejan el frente). Si se agregan, el frente sigue igual de cargado |
| ¿Qué es "la rendija"? | La entiendo como la **ventanita del sótano** (la que está al ras del pasto) |
| ¿Qué ventana de atrás se rompe? | La de la **cocina** |
| ¿Facu sigue hablando? | **Solo cuando apretás T**; sus comentarios espontáneos se van |
| ¿El cartelito "[E]" se queda? | **Sí**, chiquito |
