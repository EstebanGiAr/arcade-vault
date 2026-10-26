# 08 — Juego real de Arkanoid (nueva entrada "arkanoid")

**Estado:** Aprobado
**Depende de:** SPEC 05, SPEC 06, SPEC 07
**Fecha:** 2026-10-25

**Objetivo:** Agregar un tercer juego real al catálogo con `id: "arkanoid"` (adaptado de `references/started-games/04-arkanoid`), registrándolo en el `GAME_REGISTRY` ya existente desde SPEC 07 sin tocar `components/game-player.tsx`.

## Alcance

**Incluido:**

- Nuevo componente cliente `components/games/arkanoid-game.tsx` que porta a TypeScript, fusionados en un único archivo, la lógica de `references/started-games/04-arkanoid/game.js`, `levels.js` y `assets/spritesheet.js`: canvas lógico 800×600 (4:3, igual que `asteroides`), paleta (`paddle`), pelota (`ball`), bloques (`blocks[]`) generados a partir de `LEVELS` (5 niveles, mismo algoritmo de patrones que el original: muro completo, pirámide, tablero, muro con huecos, marco+cruz), colisiones AABB pelota-bloque, rebotes en paredes y paleta, animaciones de explosión (`EXPLOSION_FRAMES`, `EXPLOSION_DURATION`) y las 3 vidas iniciales.
- El spritesheet (`assets/spritesheet-breakout.png`) y sus helpers de dibujo (`loadSpritesheet`, `drawSprite`, `drawFrame`, `SPRITES`) se portan como funciones/constantes de módulo dentro del mismo archivo; el loop con `requestAnimationFrame` no arranca hasta que el spritesheet termina de cargar (`ssLoaded`), igual que el original.
- Los dos efectos de sonido (`assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3`) se portan vía `new Audio(...)`, reproducidos con `.cloneNode().play()` en cada rebote/rotura de bloque — **primer juego real de la plataforma con audio**. La promesa de `.play()` se captura (`.catch(() => {})`) para no romper el juego si el navegador bloquea autoplay antes de interacción del usuario.
- Control de la paleta con **teclado (`←`/`→`, velocidad fija `PADDLE_SPEED`) y mouse (posición directa vía `mousemove` sobre el contenedor)**, ambos activos simultáneamente, igual que el original — fidelidad total en vez del criterio "solo teclado" usado hasta ahora (ver Decisiones).
- El panel interno (`Score`/`Nivel`/vidas como sprites de pelota) se conserva dibujado **en el canvas**, igual que el patrón de `asteroides` (no hay HUD en el DOM como en `tetris`).
- El menú de pausa dibujado en canvas del original (5 botones clicables para saltar de nivel) **no se porta** — la pausa real la controla la prop `paused` del registro, igual que en todos los juegos reales existentes (ver Decisiones).
- El estado `'win'` del original (completar los 5 niveles) se trata como un fin de partida más: dispara `onGameOver(finalScore)` igual que `'gameover'`, mostrando un overlay de canvas con el mensaje distinto "¡COMPLETASTE EL JUEGO!" en vez de "GAME OVER", pero abriendo el mismo modal de React para guardar puntuación.
- El componente expone `restart()` y `forceGameOver()` vía `useImperativeHandle`, con la misma forma `ArcadeGameHandle` del registro. `restart()` reinicia paleta, pelota, bloques, score, vidas y nivel al estado inicial (nivel 1); `forceGameOver()` fuerza `gameState = "gameover"` directamente, sin pasar por la lógica de pérdida de vidas.
- El componente acepta `paused: boolean`: cuando es `true`, el loop interno sigue dibujando pero no avanza `update(dt)` (ni movimiento de paleta por teclado/mouse, ni física de la pelota), con el mismo patrón `resetTimeRef` que `asteroids-game.tsx`/`tetris-game.tsx` para evitar un salto de `dt` al despausar.
- El HUD externo de React se sincroniza vía `onStatsChange({ score, lives, level })`, reutilizando los `HudStatKey` ya existentes (`score`, `lives`, `level`) — no se amplía el tipo compartido del registro.
- Los assets binarios se mueven a `public/games/arkanoid/spritesheet-breakout.png` y `public/games/arkanoid/sounds/{ball-bounce,break-sound}.mp3`, referenciados por ruta absoluta (`/games/arkanoid/...`).
- Nueva entrada en `GAME_REGISTRY` (`components/games/registry.ts`): `arkanoid` con `hudStats: ["score", "lives", "level"]`, `initialStats: { score: 0, lives: 3, level: 1 }`, sin `aspectRatio` (usa el `4/3` por defecto de `.crt-screen`, igual que `asteroides`).
- Nueva fila en la tabla `games` de Supabase (vía `mcp__supabase__apply_migration`, un `insert`): `id: "arkanoid"`, `title: "ARKANOID"`, `cat: "ARCADE"`, `color: "yellow"`, `cover: "cover-bricks"`, `short` y `long` propios (ver modelo de datos).
- Reutilización del bloque CSS existente `.cover-bricks` en `app/arcade-vault.css` (huérfano desde SPEC 06) como portada de la tarjeta "arkanoid" — no se escribe CSS de portada nuevo.
- El flujo de guardado de puntuación reutiliza `saveScore`/`lib/scores.ts` sin cambios, usando `"arkanoid"` como `gameId`.
- El canvas principal se redimensiona de forma responsiva igual que `asteroides`: `ResizeObserver` sobre un contenedor `width: 100%; height: 100%`, ajustando `canvas.width`/`canvas.height` en píxeles reales (`devicePixelRatio`), con la física operando siempre en coordenadas lógicas 800×600 escaladas en `draw()` vía `ctx.setTransform(...)`.

**No incluido (fuera de alcance de este spec):**

- El menú de pausa en canvas para saltar de nivel con clic de mouse (5 botones) — decisión explícita de no portarlo (ver Decisiones).
- Controles táctiles o adaptación a pantallas pequeñas más allá del redimensionado responsivo del canvas.
- Anti-cheat o validación de puntuaciones — la policy de `insert` en `scores` sigue abierta, igual que para `asteroides`/`tetris`.
- Cualquier cambio a las entradas `asteroides`/`tetris` existentes o a `components/game-player.tsx` — el registro ya existe desde SPEC 07 y no necesita modificarse para agregar un tercer juego.
- Tests automatizados (el proyecto no tiene suite configurada).
- Rediseño visual de cualquier pantalla existente más allá de lo descrito arriba.
- Música de fondo o cualquier otro sonido del original más allá de los dos efectos (`ball-bounce`, `break-sound`) — el original no trae más audio.

## Modelo de datos

```ts
// components/games/registry.ts — una nueva entrada, sin ampliar los tipos compartidos
export const GAME_REGISTRY: Record<string, ArcadeGameEntry> = {
  asteroides: {/* sin cambios */},
  tetris: {/* sin cambios */},
  arkanoid: {
    component: ArkanoidGame,
    hudStats: ["score", "lives", "level"],
    initialStats: { score: 0, lives: 3, level: 1 },
  },
};
```

```ts
// app/data.ts — nueva fila en games (vía migración, no en este archivo)
{
  id: "arkanoid",
  title: "ARKANOID",
  short: "Destruye cinco muros de bloques a pura rebotada antes de perder tus tres vidas.",
  long: "Controla la paleta para devolver la pelota y pulverizar bloques de color. Cada bloque roto suma puntos y dispara una pequeña explosión animada; al limpiar un muro avanzas al siguiente de los cinco niveles, cada uno más rápido que el anterior.",
  cat: "ARCADE",
  cover: "cover-bricks",
  color: "yellow",
}
```

```ts
// components/games/arkanoid-game.tsx
export const ArkanoidGame: ForwardRefExoticComponent<
  ArcadeGameProps & RefAttributes<ArcadeGameHandle>
>;

type Paddle = { x: number; y: number; w: number; h: number };
type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};
type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
};
type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
};
type GameState = "playing" | "gameover" | "win";
```

Las constantes `PADDLE_SPEED`, `BLOCK_COLS`, `BLOCK_ROWS`, `BLOCK_W`, `BLOCK_H`, `BLOCK_COLORS`, `BLOCKS_ORIGIN_X`, `BLOCKS_ORIGIN_Y`, `BASE_BALL_VX`, `BASE_BALL_VY`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, y la función `LEVELS` (5 niveles con sus patrones de bloques y `speed`) se portan con los mismos nombres y valores que `references/started-games/04-arkanoid/{game.js,levels.js,assets/spritesheet.js}`, como constantes/funciones internas del módulo (no se exportan). `BLOCKS_ORIGIN_X` se calcula con el literal `800` (no `canvas.width`), igual que el original, para mantener limpio el sistema de coordenadas lógico. No se introducen estructuras de persistencia nuevas: `saveScore`/`lib/scores.ts` se reutiliza tal cual con `"arkanoid"` como `gameId`.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores). El registro (`components/games/registry.ts`) y `components/game-player.tsx` ya existen desde SPEC 07 y no se modifican salvo agregar la entrada del paso 10.

1. Crear `public/games/arkanoid/` y copiar `spritesheet-breakout.png` y `sounds/{ball-bounce,break-sound}.mp3` desde `references/started-games/04-arkanoid/assets/`.
2. Crear `components/games/arkanoid-game.tsx` con las constantes de balance, los tipos `Paddle`/`Ball`/`Block`/`Explosion`, `SPRITES`/`EXPLOSION_FRAMES`/`EXPLOSION_DURATION` y las funciones `loadSpritesheet`/`drawSprite`/`drawFrame` portadas de `spritesheet.js`, y la función `LEVELS` portada de `levels.js` (misma lógica de generación de los 5 patrones). Sin lógica de React todavía.
3. Dentro de un único `useEffect([])`: narrowing explícito de refs, `ResizeObserver` que ajusta `canvas.width`/`canvas.height` con `devicePixelRatio` y `ctx.setTransform(...)` al inicio de `draw()` para escalar desde 800×600 lógicos, igual patrón que `asteroids-game.tsx`.
4. Agregar dentro del mismo efecto los listeners de teclado (`←`/`→` sobre `window`, con `preventDefault`) y un listener `mousemove` sobre el contenedor que traduce `clientX` a coordenadas lógicas (`scaleX = 800 / rect.width`) y fija `paddle.x` directamente, clamped a `[0, 800 - paddle.w]`. Todos limpiados en el cleanup.
5. Portar `update(dt)`: movimiento de paleta por teclado (`PADDLE_SPEED`), rebotes en paredes y paleta, colisión AABB pelota-bloque con `+10` puntos y animación de explosión, avance de nivel (`loadLevel`) al limpiar todos los bloques o `gameState = "win"` tras el nivel 5, y pérdida de vida (`ball.y` fuera del canvas lógico) con `gameState = "gameover"` al llegar a 0 vidas. Los sonidos de rebote/rotura se reproducen con `.cloneNode().play().catch(() => {})`.
6. Portar `draw()`: fondo negro, bloques vivos vía `drawSprite`, explosiones vía `drawFrame`, paleta y pelota vía `drawSprite`, HUD en canvas (Score/Nivel/vidas como sprites de pelota, igual que el original), y overlay final — "GAME OVER" si `gameState === "gameover"`, "¡COMPLETASTE EL JUEGO!" si `gameState === "win"`.
7. Agregar `onStatsChange({ score, lives, level })` y `onGameOver(finalScore)` con una `reportChanges()` que compara contra los valores del frame anterior (mismo patrón que `asteroides`/`tetris`); `onGameOver` se invoca una sola vez al pasar de `"playing"` a `"gameover"` o a `"win"`.
8. Exponer `restart` y `forceGameOver` vía `useImperativeHandle` sobre un `ref` tipado `ArcadeGameHandle`: `restart` reinicia paleta/pelota/bloques/score/vidas/nivel a nivel 1; `forceGameOver` fuerza `gameState = "gameover"` directamente.
9. Agregar la prop `paused`: el loop sigue llamando a `draw()` cada frame pero omite `update(dt)` (incluyendo el procesamiento de teclado/mouse) cuando `paused === true`, reseteando el acumulador de tiempo al despausar (mismo patrón `resetTimeRef`). El `requestAnimationFrame` del loop no arranca hasta que `loadSpritesheet` complete la carga.
10. Registrar la entrada `arkanoid` en `GAME_REGISTRY` (`hudStats: ["score", "lives", "level"]`, `initialStats: { score: 0, lives: 3, level: 1 }`, sin `aspectRatio`).
11. Agregar la fila `arkanoid` a la tabla `games` de Supabase vía `mcp__supabase__apply_migration` (ver modelo de datos), reutilizando `.cover-bricks` ya existente en `app/arcade-vault.css` sin modificarlo.
12. Probar manualmente en `/juegos/arkanoid/jugar`: mover la paleta con teclado y con mouse, rebotar la pelota contra bloques y paredes, escuchar los sonidos de rebote/rotura, ver la animación de explosión al romper un bloque, perder las 3 vidas y ver el modal de fin de juego, limpiar los 5 niveles y confirmar que también abre el modal con el mensaje de victoria en el overlay de canvas, guardar la puntuación, probar "PAUSA"/"REANUDAR" y "FIN" a mitad de partida, y redimensionar la ventana para confirmar que el tablero mantiene 4:3 sin deformarse.
13. Confirmar que `/juegos/asteroides/jugar` y `/juegos/tetris/jugar` siguen funcionando exactamente igual (el registro solo gana una entrada nueva; `game-player.tsx` no se toca).
14. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `mcp__supabase__execute_sql` (`select id from games`) muestra `asteroides`, `tetris` y `arkanoid`.
- [ ] `/juegos` muestra la nueva tarjeta "ARKANOID" con la portada `.cover-bricks`.
- [ ] En `/juegos/arkanoid` (sin partidas aún), "Mejor global" y "Partidas" muestran `0`.
- [ ] En `/juegos/arkanoid/jugar` se ve y juega el Arkanoid real (bloques, paleta, pelota, explosiones animadas), no la UI decorativa falsa.
- [ ] La paleta responde tanto a `←`/`→` como al movimiento del mouse sobre el área de juego.
- [ ] Al romper un bloque se escucha el sonido de rotura (si el navegador permite audio) y se ve la animación de explosión; sumar 10 puntos y actualizar el HUD externo de React en el mismo frame.
- [ ] Limpiar todos los bloques de un nivel carga el siguiente nivel (bloques nuevos, pelota reiniciada, misma paleta); al limpiar el nivel 5 se dispara el fin de partida con el mensaje "¡COMPLETASTE EL JUEGO!" en el overlay de canvas y abre el modal de React con la puntuación final.
- [ ] Perder las 3 vidas (pelota cae fuera del canvas 3 veces) detiene el juego, muestra "GAME OVER" en el overlay de canvas y abre el modal "FIN DEL JUEGO" de React con la puntuación final.
- [ ] Pulsar "PAUSA" congela completamente la partida (la pelota no se mueve, la paleta no responde a teclado ni mouse); "REANUDAR" continúa sin saltos de velocidad.
- [ ] Pulsar "FIN" en cualquier momento detiene la partida y muestra el modal "FIN DEL JUEGO" de React con la puntuación actual.
- [ ] Guardar la puntuación desde el modal inserta una fila real en `scores` con `game_id: "arkanoid"`.
- [ ] "JUGAR DE NUEVO" reinicia completamente la partida (nivel 1, 3 vidas, score en 0) sin desmontar el componente del canvas.
- [ ] Redimensionar la ventana mantiene el área de juego en proporción 4:3 dentro de `.crt-screen`, sin recortar ni deformar.
- [ ] `read_console_messages` no muestra errores durante una partida completa de arkanoid (incluyendo el caso de que el navegador bloquee el autoplay de audio).
- [ ] `/salon-de-la-fama` muestra una pestaña "ARKANOID" junto a "ASTEROIDES" y "TETRIS", y tras guardar una puntuación esa pestaña refleja la fila real.
- [ ] `/juegos/asteroides/jugar` y `/juegos/tetris/jugar` siguen funcionando exactamente igual que antes de este spec.

## Decisiones tomadas y descartadas

- **`id: "arkanoid"`, `cat: "ARCADE"`, `color: "yellow"`, portada reusando `.cover-bricks`.** Razón: decisión explícita del usuario — `ARCADE` es la categoría correcta (no es shooter ni puzzle de encaje ni versus); `yellow` queda libre tras `asteroides` (cyan) y `tetris` (magenta); `.cover-bricks` ya existe huérfano desde SPEC 06 con temática de franjas de colores, evita CSS nuevo.
- **Control de paleta con teclado Y mouse simultáneamente, en vez de solo teclado.** Razón: decisión explícita del usuario — en el original el mouse es el control principal (posición directa), no un añadido secundario como en los menús de pausa; se prioriza fidelidad al original sobre el criterio "solo teclado" usado hasta ahora en `asteroides`/`tetris`.
- **Se portan el spritesheet y los dos efectos de sonido.** Razón: decisión explícita del usuario — primer juego real de la plataforma con audio; se acepta esa deuda (ningún otro juego tiene sonido todavía) a cambio de fidelidad visual y sonora completa al original.
- **El menú de pausa en canvas (selección de nivel con clic) no se porta.** Razón: decisión explícita del usuario — duplicaría la función de "PAUSA"/"REANUDAR" ya controlada por la prop `paused` del registro, y agregaría listeners de `click` sobre el canvas sin aportar valor dentro de la plataforma.
- **El estado `'win'` se trata igual que `'gameover'` para `onGameOver`, con mensaje distinto solo en el overlay de canvas.** Razón: decisión explícita del usuario — mantiene un único camino hacia el modal de React de guardar puntuación, igual que `asteroides`/`tetris`, en vez de introducir un tercer flujo de fin de partida.
- **Sin `aspectRatio` en la entrada del registry (4:3 por defecto).** Razón: decisión explícita del usuario — el canvas lógico es 800×600, igual que `asteroides`; no necesita el override que sí usa `tetris` (1:2).
- **HUD stats `score`/`lives`/`level` reutilizando los `HudStatKey` existentes, sin agregar una stat de "bloques restantes".** Razón: decisión explícita del usuario — mantiene el tipo compartido del registro sin ampliar, igual forma que `asteroides`.
- **Assets movidos a `public/games/arkanoid/`.** Razón: convención ya establecida en `platform-integration.md` para juegos que traen binarios (spritesheet/audio).
- **Sin anti-cheat ni Auth real.** Razón: decisión ya tomada en SPEC 04/06, no se reabre aquí.

## Riesgos identificados

| Riesgo                                                                                                                                                   | Mitigación                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las políticas de autoplay de audio del navegador pueden bloquear `.play()` en los efectos de sonido antes de la primera interacción del usuario.         | Cada llamada a `.play()` captura la promesa rechazada (`.catch(() => {})`); el juego sigue funcionando visualmente igual aunque el sonido no se reproduzca.                                                                         |
| Combinar control de paleta por teclado y por mouse simultáneamente puede producir "peleas" visuales si ambos intentan mover la paleta en el mismo frame. | Se replica el comportamiento exacto del original: el mouse fija `paddle.x` de forma inmediata en cada evento `mousemove`, el teclado la desplaza dentro de `update(dt)`; el último evento procesado gana, igual que en el original. |
| React Strict Mode duplica montajes de efectos en desarrollo, pudiendo duplicar listeners de teclado/mouse o loops de `requestAnimationFrame`.            | El `useEffect` principal limpia explícitamente (`cancelAnimationFrame`, `removeEventListener` para teclado y mouse) en su función de retorno, mismo patrón ya probado en `asteroids-game.tsx`/`tetris-game.tsx`.                    |
| `ResizeObserver` disparando redimensionados muy frecuentes podría causar parpadeo o costo de CPU.                                                        | Redimensionar `canvas.width`/`height` solo cuando el tamaño en píxeles reales cambió respecto al valor cacheado anterior, igual que en `asteroides`/`tetris`.                                                                       |
| La policy de `insert` abierta (`with check (true)`) en `scores` permite puntuaciones arbitrarias para `arkanoid`, igual que para `asteroides`/`tetris`.  | Aceptado como parte del alcance actual; anti-cheat queda para un spec futuro una vez haya Auth real.                                                                                                                                |
