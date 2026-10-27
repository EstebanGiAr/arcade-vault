# 01 — RANA: núcleo jugable (nueva entrada "rana")

**Estado:** Borrador
**Depende de:** SPEC 05, SPEC 06, SPEC 07
**Fecha:** 2026-10-26

**Objetivo:** Construir `components/games/rana-game.tsx`, un cruce de carriles al estilo Frogger diseñado desde cero (sin código de referencia que portar, igual que `snake`), con tráfico y río temporizados, canvas lógico, loop con `dt` y controles de teclado, sin tocar aún el registry ni Supabase.

## Alcance

**Incluido:**

- Nuevo componente cliente `components/games/rana-game.tsx` con canvas lógico `W = 800`, `H = 600` (4:3, igual que `asteroides`/`arkanoid`/`snake`), cuadrícula discreta `CELL = 40` → `COLS = 20`, `ROWS = 15`.
- Reparto de filas (de arriba hacia abajo, fila 0 = arriba): fila `0` = meta (5 huecos de "lily pad"), fila `1` = césped de descanso, filas `2`–`6` = río (5 carriles con troncos/tortugas flotantes), fila `7` = mediana de césped, filas `8`–`12` = carretera (5 carriles con autos), fila `13` = césped de descanso, fila `14` = fila de salida (donde reaparece la rana).
- Los 5 huecos de meta ocupan una sola celda cada uno, en las columnas `1, 5, 9, 13, 17` (reparto uniforme de 20 columnas entre 5 huecos — ver Decisiones). Intentar saltar a la fila `0` fuera de esas columnas es un movimiento inválido: la rana no se mueve (como si hubiera un borde), no pierde vida.
- Posición de la rana: `row: number` (entero, `0..14`, cuadrícula) + `x: number` (píxel, continuo) — la fila cambia por saltos discretos de una celda; `x` cambia por saltos discretos de `CELL` px al pulsar `←`/`→`, pero también de forma continua mientras la rana está sobre una plataforma del río (ver más abajo), para poder "viajar" con el tronco/tortuga.
- Controles de teclado únicamente, por flechas, **edge-triggered** (un salto por pulsación, no movimiento continuo al mantener presionada): `↑` salta una fila hacia arriba (hacia la meta), `↓` una fila hacia abajo (sin pasar de la fila `14`), `←`/`→` una celda lateral (sin salir de `0..COLS-1` en píxeles). Se usa el mismo patrón `justPressed`/`pressed(code)` de `port-recipe.md`, con `preventDefault` vía un `GAME_KEYS` set.
- Carriles de carretera (filas `8`–`12`): cada carril tiene una velocidad y dirección fijas (alternando dirección por carril), y una lista de autos (`Car`, rectángulos de 1–2 celdas de ancho) que se mueven de forma continua y envuelven al llegar al borde opuesto del canvas (wrap, no desaparecen). Colisión de la rana (su `x`/`row` actuales) con cualquier auto de su carril = pierde una vida.
- Carriles de río (filas `2`–`6`): cada carril tiene una velocidad y dirección fijas (alternando por carril) y una lista de plataformas (`Platform`, troncos o tortugas, rectángulos de 2–3 celdas de ancho) que también envuelven en los bordes. Mientras la rana está en una fila de río: si su `x` cae dentro de alguna plataforma de ese carril, la rana "viaja" con ella (su `x` se incrementa/decrementa cada frame según la velocidad de la plataforma, igual que la plataforma misma); si no cae en ninguna plataforma, la rana cae al agua y pierde una vida.
- Si la rana (viajando sobre una plataforma) es arrastrada fuera de los límites `0..W` del canvas, también pierde una vida (se "cae" por el borde).
- Temporizador por vida: `LIFE_TIME_SECONDS = 30`. Se reinicia cada vez que la rana reaparece en la fila de salida y cada vez que llega a un hueco de meta. Si llega a `0` antes de que la rana llegue a la meta, pierde una vida (mismo flujo que chocar con un auto o caer al agua).
- Puntuación: `HOP_FORWARD_POINTS = 10` por cada salto que reduce la fila (acercarse a la meta); no se otorgan puntos por saltos laterales o hacia atrás. `HOME_SLOT_POINTS = 50` al ocupar un hueco de meta vacío.
- Al ocupar un hueco de meta: ese hueco queda "lleno" (ya no se puede volver a ocupar) y la rana reaparece en la fila de salida, columna central, para el siguiente intento. Cuando los 5 huecos quedan llenos simultáneamente: sube el nivel (`level++`), se vacían los 5 huecos, aumenta `speedMultiplier` (ver progresión de dificultad) y la rana reaparece en la fila de salida.
- Vidas: `LIVES_INITIAL = 3`. Perder una vida (auto, agua, borde, o tiempo agotado) hace reaparecer la rana en la fila de salida con el temporizador reiniciado, sin perder el progreso de los huecos de meta ya llenos. Si `lives` llega a `0`: `gameState = "gameover"`.
- Progresión de dificultad: `speedMultiplier(level) = Math.min(1 + (level - 1) * 0.15, 2.5)`, aplicado a la velocidad base de cada carril de carretera y de río (`BASE_LANE_SPEED`, una tabla de 5 valores por tipo de carril, con algo de variación entre carriles para que no todos se sientan iguales).
- `draw()`: fondo distinto por zona (meta verde oscuro, césped verde, río azul, carretera gris oscuro), huecos de meta dibujados como círculos verdes (llenos) u oscuros (vacíos), autos como rectángulos de color con un detalle simple (p. ej. franja de "luces"), troncos como rectángulos marrones, tortugas como óvalos verdes, la rana como un rectángulo/círculo verde con "ojos", y un HUD interno simple en canvas (`SCORE`/`VIDAS`/`NIVEL`/barra de tiempo restante de la vida actual), siguiendo el estilo tipográfico ya usado en `asteroides`/`arkanoid`/`snake`.
- `GameState = "playing" | "gameover"`, con overlay "GAME OVER" en canvas cuando corresponde, mismo patrón que `snake`.
- El componente expone `restart()` y `forceGameOver()` vía `useImperativeHandle`, con la forma `ArcadeGameHandle` del registry existente desde SPEC 07 (`restart` reinicia rana, vidas, score, nivel, huecos de meta y temporizador; `forceGameOver` fuerza `gameState = "gameover"` directamente).
- El componente acepta `paused: boolean`: el loop sigue llamando a `draw()` cada frame pero no avanza autos/plataformas, no descuenta el temporizador de vida ni procesa input de salto cuando `paused === true`, con el mismo patrón `resetTimeRef` que `asteroids-game.tsx`/`snake-game.tsx` para evitar saltos de `dt` al despausar.
- El canvas se redimensiona de forma responsiva igual que el resto: `ResizeObserver` sobre un contenedor `width: 100%; height: 100%`, ajustando `canvas.width`/`canvas.height` con `devicePixelRatio`, operando siempre sobre la cuadrícula lógica 800×600 escalada en `draw()` vía `ctx.setTransform(...)`.
- Se sigue la receta completa de `port-recipe.md` aunque no haya un `game.js` de referencia que portar: cero `useState`, un único `useEffect([])` con narrowing explícito de refs, `ResizeObserver`, listeners de teclado dentro del efecto, estado del juego como `let`s de closure con `prev*` para diffing, y limpieza completa en el cleanup (`cancelAnimationFrame`, `resizeObserver.disconnect()`, `removeEventListener` de `keydown`/`keyup`).
- Sin `onStatsChange`/`onGameOver`/registry todavía: este spec deja el componente listo para ser conectado, pero esa conexión (y los callbacks reales) se hace en el spec `02` para mantener este paso enfocado solo en la jugabilidad. Internamente el componente ya calcula `score`/`lives`/`level`, solo que aún no los reporta hacia afuera por props.

**No incluido (fuera de alcance de este spec):**

- El registro en `GAME_REGISTRY`, la fila en la tabla `games` de Supabase, el cover art, y la conexión real de `onStatsChange`/`onGameOver` — spec `02`.
- Sumersión periódica de tortugas (mecánica clásica donde ciertas plataformas desaparecen temporalmente), bonus de tiempo restante al llegar a la meta, efectos de salpicadura/flash al perder una vida, y cualquier otro ajuste fino de balance — spec `03`.
- Controles táctiles o adaptación a pantallas pequeñas más allá del redimensionado responsivo del canvas.
- Audio — no hay assets de sonido para este juego en `references/source-assets/` y este dossier no genera binarios nuevos.
- Anti-cheat o validación de puntuaciones.
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

```ts
// components/games/rana-game.tsx — sin lógica de React todavía en este spec
const W = 800;
const H = 600;
const CELL = 40;
const COLS = 20; // W / CELL
const ROWS = 15; // H / CELL

const HOME_ROW = 0;
const HOME_SLOT_COLS = [1, 5, 9, 13, 17] as const; // 5 huecos de meta, 1 celda cada uno
const RIVER_ROWS = [2, 3, 4, 5, 6] as const;
const MEDIAN_ROW = 7;
const ROAD_ROWS = [8, 9, 10, 11, 12] as const;
const START_ROW = 14;

const LIVES_INITIAL = 3;
const LIFE_TIME_SECONDS = 30;
const HOP_FORWARD_POINTS = 10;
const HOME_SLOT_POINTS = 50;

type LaneDirection = "left" | "right";

type Car = { x: number; width: number }; // px, 1-2 celdas de ancho
type Platform = { x: number; width: number }; // px, 2-3 celdas de ancho (tronco/tortuga)

type Lane<T> = {
  row: number;
  direction: LaneDirection;
  speed: number; // px/s base, antes de aplicar speedMultiplier(level)
  items: T[];
};

type GameState = "playing" | "gameover";

type Frog = {
  row: number; // 0..14, fila discreta
  x: number; // px, continuo dentro de 0..W
  ridingPlatform: Platform | null; // no nulo solo si row ∈ RIVER_ROWS
};

type HomeSlot = { col: number; filled: boolean };
```

No hay persistencia ni assets binarios nuevos: todo el dibujo es `fillRect`/`arc` de canvas puro.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores). El componente aún no se monta en ninguna pantalla real hasta el spec `02` — se verifica manualmente creando una ruta de prueba temporal o un `.stories`-like harness no es necesario: basta con revisar que compila y pasa `lint`/`build`; la verificación jugable completa queda para el spec `02`, una vez esté enganchado al reproductor real.

1. Crear `components/games/rana-game.tsx` con las constantes de cuadrícula (`W`, `H`, `CELL`, `COLS`, `ROWS`, filas por zona, `HOME_SLOT_COLS`) y los tipos (`Car`, `Platform`, `Lane`, `GameState`, `Frog`, `HomeSlot`). Sin lógica de React todavía.
2. Dentro de un único `useEffect([])`: narrowing explícito de refs, `ResizeObserver` que ajusta `canvas.width`/`canvas.height` con `devicePixelRatio`, y `ctx.setTransform(...)` al inicio de `draw()` para escalar desde la cuadrícula lógica 800×600.
3. Agregar dentro del mismo efecto los listeners de teclado (`←→↑↓` sobre `window`, con `preventDefault` vía un `GAME_KEYS` set), usando el patrón `justPressed`/`pressed(code)` edge-triggered de `port-recipe.md` — cada pulsación dispara como máximo un salto.
4. Implementar la inicialización (`initGame`): autos y plataformas por carril (posiciones iniciales espaciadas con huecos, dirección alternada por carril, velocidad base de `BASE_LANE_SPEED`), los 5 `HomeSlot` vacíos, la rana en `START_ROW`, columna central, `lives = LIVES_INITIAL`, `score = 0`, `level = 1`, temporizador de vida en `LIFE_TIME_SECONDS`.
5. Implementar `update(dt)`: mover autos y plataformas (wrap en los bordes), aplicar el salto pendiente de la rana (si lo hay, validando límites de columna/fila y los huecos de meta en `HOME_ROW`), arrastrar la `x` de la rana si está sobre una plataforma de río, detectar colisión con auto (carretera) o caída al agua (río sin plataforma) o salida de los límites `0..W` mientras viaja sobre una plataforma, descontar el temporizador de vida, y manejar la pérdida de vida (reaparición en `START_ROW`) o game over (`lives === 0`).
6. Implementar la lógica de meta: al llegar a `HOME_ROW` sobre una columna de `HOME_SLOT_COLS` cuyo hueco está vacío, marcarlo lleno, sumar `HOME_SLOT_POINTS`, reaparecer la rana en `START_ROW` y reiniciar el temporizador de vida; si los 5 huecos quedan llenos, subir `level`, vaciar los 5 huecos y aumentar la velocidad de todos los carriles vía `speedMultiplier(level)`.
7. Implementar `draw()`: fondos por zona, huecos de meta (llenos/vacíos), autos, troncos/tortugas, la rana, y el HUD interno en canvas (`SCORE`/`VIDAS`/`NIVEL`/barra de tiempo restante), más el overlay "GAME OVER" cuando `gameState === "gameover"`.
8. Agregar la prop `paused` (aunque su consumidor real llega en el spec `02`, se implementa ya en la firma del componente): el loop sigue dibujando cada frame pero omite avanzar autos/plataformas, el temporizador de vida y el procesamiento de saltos cuando `paused === true`, con el patrón `resetTimeRef` para evitar un salto de `dt` al despausar.
9. Exponer `restart` y `forceGameOver` vía `useImperativeHandle` sobre un `ref` tipado `ArcadeGameHandle`: `restart` vuelve a `initGame()`; `forceGameOver` fuerza `gameState = "gameover"` directamente.
10. Correr `npm run lint` y `npm run build` para confirmar que el componente compila de forma aislada (sin estar aún registrado en ninguna pantalla real).

## Criterios de aceptación

- [ ] `npm run build` termina sin errores con `rana-game.tsx` ya presente en el árbol de componentes.
- [ ] `npm run lint` no reporta errores sobre `rana-game.tsx`.
- [ ] El componente compila con la firma `ArcadeGameProps & RefAttributes<ArcadeGameHandle>` del registry existente, sin requerir cambios en `components/games/registry.ts` todavía.
- [ ] Revisando el código: la rana solo puede entrar a la fila `0` si su columna coincide con una de `HOME_SLOT_COLS`; en cualquier otra columna de esa fila el salto se rechaza.
- [ ] Revisando el código: mientras la rana está en una fila de río, su `x` se actualiza cada frame según la plataforma que la porta, y si ninguna plataforma la cubre, se dispara la pérdida de vida en el siguiente `update(dt)`.
- [ ] Revisando el código: el temporizador de vida se reinicia tanto al reaparecer en `START_ROW` como al ocupar un hueco de meta, nunca se acumula entre vidas.
- [ ] Revisando el código: llenar los 5 huecos de meta sube `level`, vacía los huecos y aumenta la velocidad de los carriles vía `speedMultiplier(level)`.
- [ ] Revisando el código: perder la última vida (`lives === 0`) deja `gameState = "gameover"` y detiene el avance de autos/plataformas/temporizador en los frames siguientes.
- [ ] El `useEffect` principal limpia `cancelAnimationFrame`, `resizeObserver.disconnect()` y ambos listeners de teclado en su función de retorno.

## Decisiones tomadas y descartadas

- **Diseño desde cero, sin código de referencia que portar.** Razón: no hay ningún Frogger en `references/started-games/`; se sigue el mismo precedente que `snake` (SPEC 09), que tampoco tuvo `game.js` de origen — la receta de `port-recipe.md` se adapta aun sin archivo a portar.
- **Huecos de meta de 1 celda de ancho en vez de 2 como en el arcade original.** Razón: con `COLS = 20` y 5 huecos, 1 celda por hueco reparte la cuadrícula de forma perfectamente uniforme (columnas `1, 5, 9, 13, 17`) sin dejar remanentes asimétricos; es una simplificación de fidelidad menor, documentada aquí en vez de forzar un ancho de 2 celdas con huecos desiguales.
- **Posición de la rana como `row` discreto + `x` continuo, en vez de todo discreto en cuadrícula.** Razón: es la única forma de que "viajar" sobre un tronco/tortuga se sienta continuo (como en el arcade original) sin reinventar una física de celdas fraccionarias; los saltos (`↑↓←→`) sí siguen siendo discretos por celda.
- **Autos y plataformas envuelven en los bordes del canvas (wrap) en vez de desaparecer y reaparecer con un cooldown.** Razón: simplifica la implementación del spawn sin alterar la sensación de "tráfico/río continuo"; es el mismo criterio de simplicidad que llevó a `asteroides` a envolver naves/asteroides en los bordes.
- **Temporizador de vida fijo en 30s, sin bonus de tiempo restante al llegar a la meta en este spec.** Razón: deja el núcleo jugable completo y verificable sin la complejidad adicional del cálculo de bonus; el bonus de tiempo se documenta explícitamente como parte del spec `03` (pulido), no se descarta, se posterga.
- **Sin sumersión periódica de tortugas en este spec.** Razón: es una mecánica de "extra realismo" del arcade original, no indispensable para que el cruce de carriles con temporización funcione; se posterga a `03` para no inflar el alcance del núcleo jugable.
- **`speedMultiplier(level) = 1 + (level - 1) * 0.15`, con tope en `2.5`.** Razón: decisión de balance propia (el prompt no especificó números) — curva suave que evita que niveles muy altos se vuelvan literalmente imposibles, documentada aquí como hueco rellenado.
- **El componente no reporta aún `onStatsChange`/`onGameOver` por props.** Razón: mantener este spec enfocado solo en la jugabilidad interna, igual que la separación de alcance ya usada entre specs de este dossier; la conexión real llega en `02`, que es donde también se agrega el registro.

## Riesgos identificados

| Riesgo                                                                                                                                           | Mitigación                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React Strict Mode duplica montajes de efectos en desarrollo, pudiendo duplicar listeners de teclado o loops de `requestAnimationFrame`.          | El `useEffect` principal limpia explícitamente (`cancelAnimationFrame`, `removeEventListener`) en su función de retorno, mismo patrón ya probado en `asteroids-game.tsx`/`snake-game.tsx`. |
| `ResizeObserver` disparando redimensionados muy frecuentes podría causar parpadeo o costo de CPU.                                                | Redimensionar `canvas.width`/`height` solo cuando el tamaño en píxeles reales cambió respecto al valor cacheado anterior, igual que en el resto de los juegos.                             |
| La posición continua (`x` en píxeles) de la rana mientras viaja sobre una plataforma puede desincronizarse de la cuadrícula al volver a saltar.  | Al ejecutar cualquier salto discreto (`↑↓←→`), `x` se vuelve a alinear (`snap`) al múltiplo de `CELL` más cercano antes de aplicar el salto, evitando que la rana quede "a medio paso".    |
| Evaluar colisión rana-auto o rana-plataforma con rectángulos mal dimensionados puede producir falsos positivos/negativos en los bordes de celda. | Las cajas de colisión usan el ancho real en píxeles de cada `Car`/`Platform` (no solo su celda), con un margen de tolerancia pequeño documentado en el propio código al implementarlo.     |
| El `dt` sin acotar tras pestañas en segundo plano puede acelerar de golpe autos/plataformas o descontar de más el temporizador de vida.          | Se clampa `dt` (p. ej. a 50ms) antes de usarlo en `update(dt)`, mismo patrón ya usado en `asteroids-game.tsx`.                                                                             |
