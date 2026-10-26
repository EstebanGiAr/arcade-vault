# 09 — Juego real de Snake (nueva entrada "snake")

**Estado:** Aprobado
**Depende de:** SPEC 05, SPEC 06, SPEC 07
**Fecha:** 2026-10-25

**Objetivo:** Agregar un cuarto juego real al catálogo con `id: "snake"` (diseño desde cero, sin código de referencia — solo se reutilizan los sprites de frutas de `references/source-assets/snake-assets/`), registrándolo en el `GAME_REGISTRY` ya existente desde SPEC 07 sin tocar `components/game-player.tsx`.

## Alcance

**Incluido:**

- Nuevo componente cliente `components/games/snake-game.tsx` con un tablero lógico de celdas discretas: canvas lógico 800×600 (4:3, igual que `asteroides`/`arkanoid`), `CELL = 40`, `COLS = 20`, `ROWS = 15`. La serpiente es un arreglo de celdas `{ col, row }`, se mueve por _ticks_ (no física continua): cada `tickMs` transcurridos avanza exactamente una celda en la dirección actual.
- Movimiento controlado por flechas (`←→↑↓`) únicamente. Se mantiene una cola de una sola dirección pendiente; si la nueva dirección es exactamente la opuesta a la dirección actual de movimiento, el input se ignora (no se puede revertir sobre el propio cuello).
- Colisión letal contra los bordes del tablero: si la cabeza sale de `[0, COLS)` / `[0, ROWS)`, `gameState = "gameover"`. Colisión letal contra el propio cuerpo: si la cabeza coincide con cualquier celda de la cola, `gameState = "gameover"`. Sin vidas — una sola colisión termina la partida, igual que el Snake clásico.
- Fruta única en el tablero en todo momento, en una celda libre elegida al azar (se reintenta el sorteo si la celda cae sobre el cuerpo de la serpiente). Al comer la fruta: la serpiente crece una celda, se suma el puntaje de esa fruta (tabla `FRUIT_POINTS`, ver modelo de datos) y se sortea una fruta nueva (tipo y celda).
- 22 tipos de fruta portados desde `references/source-assets/snake-assets/sprites.js` (`SPRITE_ATLAS.fruits`) como una constante interna del módulo (`FRUITS: Record<string, { x: number; y: number; w: number; h: number }>`), con las mismas coordenadas de recorte. Se descarta el wrapper `window.SPRITE_ATLAS`/`sources` del archivo original — no hay otro script que dependa de ese global, así que el atlas se declara directamente en `snake-game.tsx`.
- El spritesheet `fruits.png` se carga con un único `new Image()`; el loop de `requestAnimationFrame` no arranca hasta que termine de cargar (`imgLoaded`), mismo patrón de gateo que `loadSpritesheet` en `arkanoid-game.tsx`.
- Puntos variables por tipo de fruta (`FRUIT_POINTS`, 4 niveles: 10/20/30/50) en vez de un valor fijo — ver modelo de datos para la tabla completa. El tipo de fruta que aparece en cada sorteo es independiente de su valor (elección uniforme entre las 22).
- Velocidad progresiva: `tickMs` empieza en 160ms y baja 10ms cada 5 frutas comidas, con un mínimo de 70ms. El nivel (`level`) reportado al HUD es `Math.floor(fruitsEaten / 5) + 1` y sube exactamente cuando baja la velocidad.
- El panel interno (Score/Nivel) se dibuja **en el canvas**, igual que el patrón de `asteroides`/`arkanoid` (no hay HUD en el DOM como en `tetris`).
- No se porta ningún menú de pausa dentro del canvas — la pausa real la controla la prop `paused` del registro, igual que en todos los juegos reales existentes.
- El componente expone `restart()` y `forceGameOver()` vía `useImperativeHandle`, con la misma forma `ArcadeGameHandle` del registro. `restart()` reinicia la serpiente (longitud 3, centrada, moviendo a la derecha), la fruta, el score, el nivel y `tickMs` al estado inicial. `forceGameOver()` fuerza `gameState = "gameover"` directamente.
- El componente acepta `paused: boolean`: cuando es `true`, el loop interno sigue dibujando pero no avanza el acumulador de ticks ni procesa input de dirección, con el mismo patrón `resetTimeRef` que `asteroids-game.tsx`/`arkanoid-game.tsx` para evitar que se acumule un salto de tiempo al despausar.
- El HUD externo de React se sincroniza vía `onStatsChange({ score, level })`, reutilizando los `HudStatKey` ya existentes (`score`, `level`) — no se amplía el tipo compartido del registro ni se usa `lives`.
- El asset binario se mueve a `public/games/snake/fruits.png`, referenciado por ruta absoluta (`/games/snake/fruits.png`).
- Nueva entrada en `GAME_REGISTRY` (`components/games/registry.ts`): `snake` con `hudStats: ["score", "level"]`, `initialStats: { score: 0, level: 1 }`, sin `aspectRatio` (usa el `4/3` por defecto de `.crt-screen`, el tablero 800×600 ya respeta esa proporción).
- Nueva fila en la tabla `games` de Supabase (vía `mcp__supabase__apply_migration`, un `insert`): `id: "snake"`, `title: "SERPIENTE"`, `cat: "ARCADE"`, `color: "green"`, `cover: "cover-snake"`, `short` y `long` propios (ver modelo de datos).
- Reutilización del bloque CSS existente `.cover-snake` en `app/arcade-vault.css` (huérfano desde SPEC 06) como portada de la tarjeta "snake" — no se escribe CSS de portada nuevo.
- El flujo de guardado de puntuación reutiliza `saveScore`/`lib/scores.ts` sin cambios, usando `"snake"` como `gameId`.
- El canvas principal se redimensiona de forma responsiva igual que `asteroides`/`arkanoid`: `ResizeObserver` sobre un contenedor `width: 100%; height: 100%`, ajustando `canvas.width`/`canvas.height` en píxeles reales (`devicePixelRatio`), con la lógica del juego operando siempre en la cuadrícula lógica de 800×600 escalada en `draw()` vía `ctx.setTransform(...)`.

**No incluido (fuera de alcance de este spec):**

- Vidas o reaparición tras colisión — una sola colisión termina la partida, decisión explícita (ver Decisiones).
- Bordes toroidales (atravesar el borde y reaparecer del otro lado) — se descartó a favor del comportamiento clásico de Snake (ver Decisiones).
- Controles WASD o táctiles, o adaptación a pantallas pequeñas más allá del redimensionado responsivo del canvas.
- Audio — no hay efectos de sonido en el alcance de este juego (los sprites aportados son solo visuales).
- Anti-cheat o validación de puntuaciones — la policy de `insert` en `scores` sigue abierta, igual que para `asteroides`/`tetris`/`arkanoid`.
- Cualquier cambio a las entradas `asteroides`/`tetris`/`arkanoid` existentes o a `components/game-player.tsx` — el registro ya existe desde SPEC 07 y no necesita modificarse para agregar un cuarto juego.
- Tests automatizados (el proyecto no tiene suite configurada).
- Rediseño visual de cualquier pantalla existente más allá de lo descrito arriba.

## Modelo de datos

```ts
// components/games/registry.ts — una nueva entrada, sin ampliar los tipos compartidos
export const GAME_REGISTRY: Record<string, ArcadeGameEntry> = {
  asteroides: {/* sin cambios */},
  tetris: {/* sin cambios */},
  arkanoid: {/* sin cambios */},
  snake: {
    component: SnakeGame,
    hudStats: ["score", "level"],
    initialStats: { score: 0, level: 1 },
  },
};
```

```ts
// app/data.ts — nueva fila en games (vía migración, no en este archivo)
{
  id: "snake",
  title: "SERPIENTE",
  short: "Guía a la serpiente, come fruta y evita chocar contigo mismo o con el borde.",
  long: "Controla una serpiente que crece con cada fruta que come. Cada tipo de fruta suma un puntaje distinto y, cada 5 frutas, la serpiente acelera y sube de nivel. Un solo choque contra el borde del tablero o contra tu propia cola termina la partida.",
  cat: "ARCADE",
  cover: "cover-snake",
  color: "green",
}
```

```ts
// components/games/snake-game.tsx
export const SnakeGame: ForwardRefExoticComponent<
  ArcadeGameProps & RefAttributes<ArcadeGameHandle>
>;

type Cell = { col: number; row: number };
type Direction = "up" | "down" | "left" | "right";
type FruitKind =
  | "banana"
  | "orange"
  | "grape"
  | "garlic"
  | "eggplant"
  | "strawberry"
  | "cherry"
  | "carrot"
  | "mushroom"
  | "broccoli"
  | "watermelon"
  | "pepper"
  | "kiwi"
  | "lemon"
  | "peach"
  | "peanut"
  | "apple"
  | "tomato"
  | "berries"
  | "grapes2"
  | "pineapple"
  | "melon";
type Fruit = { cell: Cell; kind: FruitKind };
type GameState = "playing" | "gameover";
```

Constantes de módulo portadas de `references/source-assets/snake-assets/sprites.js` (`FRUITS`, mismas coordenadas `{ x, y, w, h }` que `SPRITE_ATLAS.fruits`) más las propias del tablero: `W = 800`, `H = 600`, `CELL = 40`, `COLS = 20`, `ROWS = 15`, `INITIAL_TICK_MS = 160`, `MIN_TICK_MS = 70`, `TICK_STEP_MS = 10`, `FRUITS_PER_LEVEL = 5`.

Tabla de puntos por fruta (`FRUIT_POINTS: Record<FruitKind, number>`), 4 niveles de valor:

| Puntos | Frutas                                                                                    |
| ------ | ----------------------------------------------------------------------------------------- |
| 10     | `apple`, `banana`, `orange`, `grape`, `cherry`, `lemon`, `peach`, `tomato`, `carrot`      |
| 20     | `garlic`, `eggplant`, `strawberry`, `mushroom`, `broccoli`, `pepper`, `peanut`, `grapes2` |
| 30     | `kiwi`, `berries`                                                                         |
| 50     | `watermelon`, `pineapple`, `melon`                                                        |

No se introducen estructuras de persistencia nuevas: `saveScore`/`lib/scores.ts` se reutiliza tal cual con `"snake"` como `gameId`.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores). El registro (`components/games/registry.ts`) y `components/game-player.tsx` ya existen desde SPEC 07 y no se modifican salvo agregar la entrada del paso 10.

1. Crear `public/games/snake/` y copiar `fruits.png` desde `references/source-assets/snake-assets/`.
2. Crear `components/games/snake-game.tsx` con las constantes de tablero (`W`, `H`, `CELL`, `COLS`, `ROWS`, `INITIAL_TICK_MS`, `MIN_TICK_MS`, `TICK_STEP_MS`, `FRUITS_PER_LEVEL`), el atlas `FRUITS` portado de `sprites.js`, la tabla `FRUIT_POINTS`, y los tipos `Cell`/`Direction`/`FruitKind`/`Fruit`/`GameState`. Sin lógica de React todavía.
3. Dentro de un único `useEffect([])`: narrowing explícito de refs, `ResizeObserver` que ajusta `canvas.width`/`canvas.height` con `devicePixelRatio`, y `ctx.setTransform(...)` al inicio de `draw()` para escalar desde la cuadrícula lógica de 800×600.
4. Agregar dentro del mismo efecto los listeners de teclado (`←→↑↓` sobre `window`, con `preventDefault` vía un `GAME_KEYS` set) que escriben una única dirección "pendiente"; al leerla en `update()` se descarta si es exactamente opuesta a la dirección de movimiento actual. Limpiados en el cleanup.
5. Portar `update(dt)`: acumulador de tiempo que dispara un "tick" cada `tickMs`; en cada tick, aplicar la dirección pendiente (si es válida), mover la cabeza una celda, detectar colisión contra borde o cuerpo (`gameState = "gameover"`), detectar si la cabeza cae sobre la fruta (crecer, sumar `FRUIT_POINTS[fruit.kind]`, sortear fruta nueva en celda libre, y cada `FRUITS_PER_LEVEL` frutas bajar `tickMs` en `TICK_STEP_MS` hasta `MIN_TICK_MS` y subir `level`).
6. Portar `draw()`: fondo negro, cuerpo de la serpiente como celdas (`fillRect` por celda, cabeza con un tono distinto), fruta vía `ctx.drawImage` recortando el atlas `FRUITS[fruit.kind]` escalado a `CELL`, HUD en canvas (`SCORE`/`NIVEL`, mismo estilo tipográfico que `asteroides`/`arkanoid`), y overlay "GAME OVER" cuando `gameState === "gameover"`.
7. Agregar `onStatsChange({ score, level })` y `onGameOver(finalScore)` con una `reportChanges()` que compara contra los valores del frame anterior (mismo patrón que `asteroides`/`tetris`/`arkanoid`); `onGameOver` se invoca una sola vez al pasar de `"playing"` a `"gameover"`.
8. Exponer `restart` y `forceGameOver` vía `useImperativeHandle` sobre un `ref` tipado `ArcadeGameHandle`: `restart` reinicia serpiente/fruta/score/nivel/`tickMs` al estado inicial; `forceGameOver` fuerza `gameState = "gameover"` directamente.
9. Agregar la prop `paused`: el loop sigue llamando a `draw()` cada frame pero omite avanzar el acumulador de ticks y procesar input de dirección cuando `paused === true`, reseteando el acumulador al despausar (mismo patrón `resetTimeRef`). El `requestAnimationFrame` del loop no arranca hasta que `fruits.png` termine de cargar (`imgLoaded`).
10. Registrar la entrada `snake` en `GAME_REGISTRY` (`hudStats: ["score", "level"]`, `initialStats: { score: 0, level: 1 }`, sin `aspectRatio`).
11. Agregar la fila `snake` a la tabla `games` de Supabase vía `mcp__supabase__apply_migration` (ver modelo de datos), reutilizando `.cover-snake` ya existente en `app/arcade-vault.css` sin modificarlo.
12. Probar manualmente en `/juegos/snake/jugar`: mover la serpiente con las flechas, confirmar que la dirección opuesta se ignora, comer varias frutas de distinto tipo y ver sumar los puntos correctos, confirmar que cada 5 frutas la serpiente acelera y el nivel sube, chocar contra el borde y contra el propio cuerpo para ver el fin de partida en ambos casos, guardar la puntuación, probar "PAUSA"/"REANUDAR" y "FIN" a mitad de partida, y redimensionar la ventana para confirmar que el tablero mantiene 4:3 sin deformarse.
13. Confirmar que `/juegos/asteroides/jugar`, `/juegos/tetris/jugar` y `/juegos/arkanoid/jugar` siguen funcionando exactamente igual (el registro solo gana una entrada nueva; `game-player.tsx` no se toca).
14. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `mcp__supabase__execute_sql` (`select id from games`) muestra `asteroides`, `tetris`, `arkanoid` y `snake`.
- [ ] `/juegos` muestra la nueva tarjeta "SERPIENTE" con la portada `.cover-snake`.
- [ ] En `/juegos/snake` (sin partidas aún), "Mejor global" y "Partidas" muestran `0`.
- [ ] En `/juegos/snake/jugar` se ve y juega el Snake real (serpiente, fruta, tablero de celdas), no la UI decorativa falsa.
- [ ] La serpiente se mueve con `←→↑↓`; pulsar la dirección exactamente opuesta a la actual no la hace chocar contra su propio cuello.
- [ ] Comer una fruta suma los puntos correspondientes a su tipo (según `FRUIT_POINTS`), hace crecer la serpiente una celda, y actualiza el HUD externo de React en el mismo frame en que cambia.
- [ ] Cada 5 frutas comidas la serpiente se mueve notablemente más rápido y el stat "Nivel" del HUD sube en 1.
- [ ] Chocar contra el borde del tablero detiene el juego, muestra "GAME OVER" en el overlay de canvas y abre el modal "FIN DEL JUEGO" de React con la puntuación final.
- [ ] Chocar contra el propio cuerpo produce el mismo resultado que chocar contra el borde.
- [ ] Pulsar "PAUSA" congela completamente la partida (la serpiente no avanza, las flechas no cambian su dirección); "REANUDAR" continúa sin saltos de velocidad.
- [ ] Pulsar "FIN" en cualquier momento detiene la partida y muestra el modal "FIN DEL JUEGO" de React con la puntuación actual.
- [ ] Guardar la puntuación desde el modal inserta una fila real en `scores` con `game_id: "snake"`.
- [ ] "JUGAR DE NUEVO" reinicia completamente la partida (serpiente de longitud 3, nivel 1, score en 0) sin desmontar el componente del canvas.
- [ ] Redimensionar la ventana mantiene el área de juego en proporción 4:3 dentro de `.crt-screen`, sin recortar ni deformar.
- [ ] `read_console_messages` no muestra errores durante una partida completa de snake.
- [ ] `/salon-de-la-fama` muestra una pestaña "SERPIENTE" junto a las otras tres, y tras guardar una puntuación esa pestaña refleja la fila real.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar` y `/juegos/arkanoid/jugar` siguen funcionando exactamente igual que antes de este spec.

## Decisiones tomadas y descartadas

- **`id: "snake"`, `cat: "ARCADE"`, `color: "green"`, portada reusando `.cover-snake`.** Razón: decisión explícita del usuario — `ARCADE` porque no es un puzzle de encaje de piezas; `green` es el color temático obvio para una serpiente y no choca con los otros tres juegos (`cyan`=asteroides, `magenta`=tetris, `yellow`=arkanoid); `.cover-snake` ya existe huérfano desde SPEC 06 con el nombre literal correcto, evita CSS nuevo.
- **Sin vidas — una sola colisión termina la partida, en vez de 3 vidas como `asteroides`/`arkanoid`.** Razón: decisión explícita del usuario — fidelidad al Snake clásico, donde no existe el concepto de "vida extra"; el HUD solo necesita `score` y `level`, sin ampliar el tipo compartido del registro con una stat que no aplicaría.
- **Bordes letales en vez de toroidales.** Razón: decisión explícita del usuario — comportamiento clásico de Snake; se descartó la alternativa de atravesar el borde y reaparecer del otro lado (como hace `asteroides` con naves/asteroides) para mantener la dificultad real del borde.
- **Puntos variables por tipo de fruta (4 niveles: 10/20/30/50) en vez de un valor fijo para las 22 frutas.** Razón: decisión explícita del usuario — aprovecha la variedad visual de los sprites aportados (`sprites.js`) para dar también variedad de puntuación, en vez de que las 22 frutas sean solo cosméticas.
- **Velocidad progresiva (acelera cada 5 frutas) en vez de velocidad fija.** Razón: decisión explícita del usuario — alimenta el stat "nivel" del HUD de forma natural, igual que `tetris` sube de nivel por líneas y `arkanoid` por niveles del `LEVELS`.
- **El atlas de sprites se declara como constante TS inline en `snake-game.tsx`, no como script global `window.SPRITE_ATLAS` cargado por separado.** Razón: a diferencia de `arkanoid` (que tiene una dependencia real de orden de scripts entre `spritesheet.js` → `levels.js` → `game.js`), aquí solo hay un archivo de datos (`sprites.js`) sin otro script que dependa de su global; portarlo como constante de módulo es más simple y consistente con el resto del componente.
- **Controles solo con flechas, sin WASD.** Razón: decisión explícita del usuario — consistente con `asteroides`/`tetris`/`arkanoid`, que tampoco ofrecen un esquema alterno de teclado.
- **Sin menú de pausa dibujado en canvas.** Razón: ya establecido como patrón en `arkanoid` — duplicaría la función de "PAUSA"/"REANUDAR" ya controlada por la prop `paused` del registro.
- **Sin audio.** Razón: los assets aportados (`fruits.png`, `sprites.js`) son solo visuales; a diferencia de `arkanoid`, no hay efectos de sonido en el alcance de este spec.
- **Sin anti-cheat ni Auth real.** Razón: decisión ya tomada en SPEC 04/06, no se reabre aquí.

## Riesgos identificados

| Riesgo                                                                                                                                          | Mitigación                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El sorteo de la celda de la nueva fruta podría caer sobre una celda ocupada por el cuerpo de la serpiente, especialmente cuando ya es larga.    | El sorteo se reintenta hasta encontrar una celda libre (filtrando contra el arreglo actual de celdas de la serpiente) antes de colocar la fruta.                                              |
| React Strict Mode duplica montajes de efectos en desarrollo, pudiendo duplicar listeners de teclado o loops de `requestAnimationFrame`.         | El `useEffect` principal limpia explícitamente (`cancelAnimationFrame`, `removeEventListener`) en su función de retorno, mismo patrón ya probado en `asteroids-game.tsx`/`arkanoid-game.tsx`. |
| `ResizeObserver` disparando redimensionados muy frecuentes podría causar parpadeo o costo de CPU.                                               | Redimensionar `canvas.width`/`height` solo cuando el tamaño en píxeles reales cambió respecto al valor cacheado anterior, igual que en `asteroides`/`tetris`/`arkanoid`.                      |
| La policy de `insert` abierta (`with check (true)`) en `scores` permite puntuaciones arbitrarias para `snake`, igual que para los otros juegos. | Aceptado como parte del alcance actual; anti-cheat queda para un spec futuro una vez haya Auth real.                                                                                          |
