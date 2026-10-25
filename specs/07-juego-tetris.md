# 07 — Juego real de Tetris (nueva entrada "tetris") + registro de juegos

**Estado:** Implementado
**Depende de:** SPEC 05, SPEC 06
**Fecha:** 2026-10-25

**Objetivo:** Agregar un segundo juego real al catálogo con `id: "tetris"` (adaptado de `references/started-games/03-tetris`), introduciendo en el mismo spec el registro genérico `components/games/registry.ts` que reemplaza el `if (game.id === "asteroides")` puntual de `GamePlayer` por una tabla de juegos reales extensible.

## Alcance

**Incluido:**

- Nuevo `components/games/registry.ts` con los tipos compartidos `ArcadeGameHandle`, `ArcadeGameProps`, `ArcadeStats`, `HudStatKey` y `ArcadeGameEntry` (ver modelo de datos), y el mapa `GAME_REGISTRY` con las entradas `asteroides` y `tetris`.
- Adaptación de `components/games/asteroids-game.tsx`: las cuatro props (`onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`) se reemplazan por `onStatsChange(stats: ArcadeStats)` + `onGameOver(finalScore)`; `reportChanges()` acumula un objeto parcial (`{ score }`, `{ lives }`, `{ level }`) por frame y emite una sola llamada a `onStatsChange` cuando algo cambió, en vez de tres callbacks separados.
- Adaptación de `components/game-player.tsx`: elimina el `if (game.id === "asteroides")` y el `isAsteroides` puntual; en su lugar lee `GAME_REGISTRY[game.id]`, renderiza `entry.component` dentro de `.crt-screen` cuando existe una entrada (y el `.game-arena` decorativo cuando no), reemplaza los `useState` sueltos (`score`, `lives`, `asteroidsLevel`) por un único `stats` (`ArcadeStats`) inicializado con `entry.initialStats`, y renderiza los `.hud-stat` dinámicamente iterando `entry.hudStats` (en vez de los cuatro tiles fijos de Jugador/Puntuación/Vidas/Nivel). El tile "Jugador" (nombre) no es un `hudStat` del registro — se mantiene aparte, fuera de la iteración, igual que hoy.
- `.crt-screen` admite un `aspectRatio` por juego: cuando `entry.aspectRatio` está definido, `GamePlayer` aplica `style={{ aspectRatio: entry.aspectRatio }}` sobre `.crt-screen` para ese juego (sobrescribiendo el `4/3` por defecto de `app/arcade-vault.css`); cuando no está definido (caso `asteroides`), no se aplica ningún estilo inline y se conserva el `4/3` del CSS.
- Nuevo componente cliente `components/games/tetris-game.tsx` que porta a TypeScript la lógica de `references/started-games/03-tetris/game.js`: tablero `COLS×ROWS` (10×20), las 8 piezas de `PIECES` (incluida la pieza "N"/tuerca gris, nombrada así en el comentario del original) con sus `COLORS`, `rotateCW`/wall kicks `[0,-1,1,-2,2]`, `collide`, `clearLines`, `LINE_SCORES = [0,100,300,500,800]` multiplicado por nivel, `dropInterval = max(100, 1000 - (nivel-1)*90)`, `level = floor(lines/10) + 1`, hard drop (+2 pts/celda) y soft drop (+1 pt/fila), y la pieza "ghost" (`ghostY()`, dibujada con `globalAlpha` reducido).
- El panel interno original (`SCORE`/`LINES`/`LEVEL` + el preview "NEXT") se conserva **tal cual** dentro de `tetris-game.tsx`, como elementos HTML/DOM reales superpuestos al canvas (no dibujados dentro del `<canvas>`), actualizados por estado interno de React del propio componente — igual estructura visual que el original, sin la lista de `CONTROLS` (se omite, ya que es redundante con lo documentado en esta spec y en la pantalla de juego). El preview "NEXT" se porta como un segundo `<canvas>` interno de tamaño fijo (120×120), tal como en el original.
- El HUD externo de React (`player-hud`) **también** se sincroniza con los mismos valores vía `onStatsChange({ score, lines, level })`, mostrando sus propios tiles `Puntuación`/`Líneas`/`Nivel` iterando `entry.hudStats` del registro — mismo patrón dual (interno + externo) que `asteroides` con su HUD de canvas, salvo que aquí el HUD interno es DOM en vez de dibujo de canvas. `tetris` no reporta `lives` (no existe el concepto); el tile "Vidas" no se renderiza en el HUD externo para este juego porque `entry.hudStats` no incluye `"lives"`.
- El componente expone `restart()` y `forceGameOver()` vía `useImperativeHandle`, con la misma forma que `AsteroidsGameHandle` (ahora `ArcadeGameHandle` del registro). `forceGameOver()` fuerza el flag interno `gameOver = true` sin pasar por ninguna lógica de colisión (no hay vidas que agotar), deteniendo el tablero y dejando la puntuación actual fija para que React la lea.
- El componente acepta `paused: boolean`: cuando es `true`, el loop interno sigue dibujando pero no avanza `dropAccum`/caída automática ni procesa input de movimiento, rotación o drop.
- Input: solo teclado, idéntico al original salvo el atajo eliminado — `←`/`→` mover, `↓` soft drop, `↑` o `X` rotar (con wall kicks), `Espacio` hard drop. El atajo interno `KeyP` (pausa) del original **se elimina**; la única forma de pausar es la prop `paused`, controlada por el botón "PAUSA"/"REANUDAR" de React, igual que en `asteroides`.
- El toggle de tema claro/oscuro del original (botón `#theme-toggle`, persistido en `localStorage` bajo la clave `"tetris-theme"`) **no se porta**: Arcade Vault no tiene modo claro en ninguna otra pantalla y el componente adopta el tema CRT fijo de la plataforma.
- Nueva entrada en la tabla `games` de Supabase (vía `mcp__supabase__apply_migration`, un `insert`): `id: "tetris"`, `title: "TETRIS"`, `cat: "PUZZLE"`, `color: "magenta"`, `cover: "cover-tetro"`, `short` y `long` propios (ver modelo de datos).
- Reutilización del bloque CSS existente `.cover-tetro` en `app/arcade-vault.css` (huérfano desde SPEC 06) como portada de la tarjeta "tetris" — no se escribe CSS de portada nuevo.
- Para `game.id === "tetris"`: "PAUSA"/"REANUDAR" controla la prop `paused` (pausa real); "FIN" llama a `forceGameOver()` del ref además de abrir el modal de React con la puntuación actual; "JUGAR DE NUEVO" llama a `restart()` del ref además de resetear el estado de `GamePlayer`, sin desmontar el componente del canvas.
- El flujo de guardado de puntuación reutiliza `saveScore`/`lib/scores.ts` sin cambios, usando `"tetris"` como `gameId`.
- El canvas principal (tablero) se redimensiona de forma responsiva igual que `asteroides`: `ResizeObserver` sobre un contenedor `width: 100%; height: 100%`, ajustando `canvas.width`/`canvas.height` en píxeles reales (`devicePixelRatio`), con la lógica del juego operando siempre en coordenadas lógicas 300×600 escaladas en `draw()`.

**No incluido (fuera de alcance de este spec):**

- Controles táctiles o adaptación a pantallas pequeñas más allá del redimensionado responsivo del canvas.
- El toggle de tema claro/oscuro y su persistencia en `localStorage` — decisión explícita de no portarlo (ver Decisiones).
- Anti-cheat o validación de puntuaciones — la policy de `insert` en `scores` sigue abierta, igual que para `asteroides`.
- Cualquier cambio a la entrada `asteroides` existente más allá de la adaptación mecánica de sus callbacks al nuevo `onStatsChange` (su jugabilidad, balance y UI no cambian).
- Adaptar `04-arkanoid` u otro juego de `references/started-games/` — este spec cubre únicamente `tetris` y el registro que lo habilita.
- Tests automatizados (el proyecto no tiene suite configurada).
- Rediseño visual de cualquier pantalla existente más allá de lo descrito arriba.

## Modelo de datos

```ts
// components/games/registry.ts
export type HudStatKey = "score" | "lives" | "level" | "lines";
export type ArcadeStats = Partial<Record<HudStatKey, number>>;

export type ArcadeGameHandle = {
  restart: () => void;
  forceGameOver: () => void;
};

export type ArcadeGameProps = {
  paused: boolean;
  onStatsChange: (stats: ArcadeStats) => void;
  onGameOver: (finalScore: number) => void;
};

export type ArcadeGameEntry = {
  component: ComponentType<ArcadeGameProps & RefAttributes<ArcadeGameHandle>>;
  hudStats: HudStatKey[];
  initialStats: ArcadeStats;
  aspectRatio?: string; // ej. "1 / 2" para tetris; ausente = 4/3 por defecto de .crt-screen
};

export const GAME_REGISTRY: Record<string, ArcadeGameEntry> = {
  asteroides: {
    component: AsteroidsGame,
    hudStats: ["score", "lives", "level"],
    initialStats: { score: 0, lives: 3, level: 1 },
  },
  tetris: {
    component: TetrisGame,
    hudStats: ["score", "lines", "level"],
    initialStats: { score: 0, lines: 0, level: 1 },
    aspectRatio: "1 / 2",
  },
};
```

```ts
// app/data.ts — nueva fila en games (vía migración, no en este archivo)
{
  id: "tetris",
  title: "TETRIS",
  short: "Encaja piezas, despeja líneas y sube de nivel antes de que el tablero se desborde.",
  long: "El clásico de bloques que caen: mueve, rota y deja caer cada tetrominó para completar líneas horizontales. La velocidad aumenta con cada nivel —diez líneas despejadas te suben uno— y cada línea completada multiplica tu puntuación según el nivel actual.",
  cat: "PUZZLE",
  cover: "cover-tetro",
  color: "magenta",
}
```

```ts
// components/games/tetris-game.tsx
// Usa los tipos compartidos del registro:
export const TetrisGame: ForwardRefExoticComponent<
  ArcadeGameProps & RefAttributes<ArcadeGameHandle>
>;
```

Las constantes `COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES` y las funciones puras (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `clearLines`, `ghostY`) se portan con los mismos nombres y valores que `references/started-games/03-tetris/game.js`, como variables/funciones internas del módulo (no se exportan). No se introducen estructuras de persistencia nuevas: `saveScore`/`lib/scores.ts` se reutiliza tal cual con `"tetris"` como `gameId`.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. Crear `components/games/registry.ts` con los tipos `ArcadeGameHandle`/`ArcadeGameProps`/`ArcadeStats`/`HudStatKey`/`ArcadeGameEntry` y un `GAME_REGISTRY` que por ahora solo contiene la entrada `asteroides` (apuntando todavía a los callbacks viejos, sin compilar en este paso intermedio no es aceptable — este paso se fusiona con el paso 2 para no dejar el build roto).
2. Adaptar `components/games/asteroids-game.tsx`: reemplazar `onScoreChange`/`onLivesChange`/`onLevelChange` por `onStatsChange(stats: ArcadeStats)` en `AsteroidsGameProps` (ahora `ArcadeGameProps`), y cambiar `reportChanges()` para acumular un objeto parcial y emitir una sola llamada. Registrar la entrada `asteroides` completa en `GAME_REGISTRY` (`hudStats: ["score", "lives", "level"]`, `initialStats: { score: 0, lives: 3, level: 1 }`, sin `aspectRatio`).
3. Adaptar `components/game-player.tsx` para leer `GAME_REGISTRY[game.id]` en vez de `isAsteroides`: un único estado `stats: ArcadeStats` reemplaza `score`/`lives`/`asteroidsLevel`; los `.hud-stat` se renderizan iterando `entry.hudStats` con sus labels (`score` → "Puntuación", `lives` → "Vidas", `level` → "Nivel", `lines` → "Líneas"); cuando no hay entrada en el registro, se mantiene el `.game-arena` decorativo actual como "no hay juego real disponible" (ya no es un `else` muerto, sino el camino real para catálogo futuro sin entrada). Aplicar `style={{ aspectRatio: entry.aspectRatio }}` sobre `.crt-screen` solo cuando `entry.aspectRatio` existe. Verificar en `/juegos/asteroides/jugar` que nada cambió de comportamiento (mismo HUD, misma pausa, mismo fin de juego).
4. Crear `components/games/tetris-game.tsx` portando `board`/`PIECES`/`COLORS`/`collide`/`rotateCW`/`clearLines`/`ghostY` a TypeScript, sin lógica de React todavía: un `canvasRef` para el tablero y otro para el panel "NEXT", loop interno con `requestAnimationFrame` montado en un `useEffect`, con `cancelAnimationFrame` y remoción de listeners en el cleanup. Tablero fijo en 300×600 lógicos en este paso.
5. Agregar el panel interno HTML (`SCORE`/`LINES`/`LEVEL`) tal como en el original, superpuesto al canvas dentro del propio componente: un `useState` interno (`score`, `lines`, `level`) que se actualiza desde el loop (no desde props) y se renderiza como divs con el mismo rótulo/valor que `index.html` original, sin la lista de `CONTROLS`.
6. Agregar los listeners de teclado dentro del mismo `useEffect` (`←`/`→`/`↓`/`↑`/`X`/`Espacio`), sin el atajo `KeyP` del original — la pausa llega solo por la prop `paused`.
7. Agregar la prop `paused`: el loop sigue llamando a `draw()` cada frame pero omite el avance de `dropAccum`/caída automática y el procesamiento de input cuando `paused === true`, reseteando el acumulador de tiempo al despausar (mismo patrón `resetTimeRef` que `asteroids-game.tsx`).
8. Agregar `onStatsChange({ score, lines, level })` y `onGameOver(finalScore)`: se invocan desde dentro del loop comparando contra los valores del frame anterior (mismo patrón `reportChanges()` que asteroides, acumulando un parcial), en paralelo a la actualización del `useState` interno del panel HTML del paso 5; `onGameOver` se invoca una sola vez al pasar `gameOver` de `false` a `true`.
9. Exponer `restart` y `forceGameOver` vía `useImperativeHandle` sobre un `ref` tipado como `ArcadeGameHandle`: `restart` reinicia tablero/pieza/score/lines/level (equivalente a `init()`, incluyendo el `useState` del panel interno); `forceGameOver` fuerza `gameOver = true` directamente, sin pasar por `collide()`.
10. Hacer el tablero responsivo: contenedor `width: 100%; height: 100%`, `ResizeObserver` que actualice `canvas.width`/`canvas.height` según el tamaño real (con `devicePixelRatio`), y `ctx.setTransform(...)` al inicio de cada `draw()` para escalar desde el sistema lógico 300×600. El panel "NEXT" (120×120) se posiciona de forma fija sobre una esquina del contenedor, sin necesitar su propio `ResizeObserver`.
11. Registrar la entrada `tetris` en `GAME_REGISTRY` (`hudStats: ["score", "lines", "level"]`, `initialStats: { score: 0, lines: 0, level: 1 }`, `aspectRatio: "1 / 2"`).
12. Agregar la fila `tetris` a la tabla `games` de Supabase vía `mcp__supabase__apply_migration` (ver modelo de datos), reutilizando `.cover-tetro` ya existente en `app/arcade-vault.css` sin modificarlo.
13. Probar manualmente en `/juegos/tetris/jugar`: mover/rotar/soft-drop/hard-drop piezas, ver la pieza ghost, despejar líneas y confirmar el multiplicador por nivel, ver el panel interno `SCORE`/`LINES`/`LEVEL` y el panel "NEXT" actualizarse, y confirmar que el HUD externo de React muestra los mismos valores en paralelo, perder por apilamiento hasta el tope y ver el modal de fin de juego con la puntuación real, guardar la puntuación, probar "PAUSA"/"REANUDAR" y "FIN" a mitad de partida, y redimensionar la ventana para confirmar que el tablero se ajusta a la proporción 1:2 sin deformarse.
14. Confirmar que `/juegos/asteroides/jugar` sigue funcionando exactamente igual tras la refactorización del registro (paso 2 y 3).
15. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [x] `npm run build` termina sin errores.
- [x] `npm run lint` no reporta errores.
- [x] `mcp__supabase__execute_sql` (`select id from games`) muestra `asteroides` y `tetris`.
- [x] `/juegos` muestra la nueva tarjeta "TETRIS" con la portada `.cover-tetro`.
- [x] En `/juegos/tetris` (sin partidas aún), "Mejor global" y "Partidas" muestran `0`.
- [x] En `/juegos/tetris/jugar` se ve y juega el Tetris real (tablero, piezas, rotación con wall kicks, pieza ghost, panel "NEXT"), no la UI decorativa falsa.
- [x] El panel interno del juego (`SCORE`/`LINES`/`LEVEL`), renderizado como HTML dentro del propio componente de Tetris, se ve tal como en el original (sin la lista de `CONTROLS`).
- [x] El HUD externo de React muestra exactamente tres tiles para tetris: Puntuación, Líneas, Nivel (sin tile de Vidas), con los mismos valores que el panel interno del juego en todo momento.
- [x] Despejar una línea incrementa "Líneas" y "Puntuación" según `LINE_SCORES[cleared] * nivel` en ambos HUDs (interno y externo) simultáneamente; cada 10 líneas sube el nivel y acelera la caída.
- [x] Pulsar "PAUSA" congela completamente el tablero (ninguna pieza cae ni responde a input); "REANUDAR" continúa sin saltos de velocidad de caída.
- [x] Pulsar "FIN" en cualquier momento detiene el tablero y muestra el modal "FIN DEL JUEGO" de React con la puntuación actual.
- [x] Apilar piezas hasta que la nueva pieza no pueda aparecer dispara el mismo flujo: tablero detenido + modal de React con la puntuación final.
- [x] Guardar la puntuación desde el modal inserta una fila real en `scores` con `game_id: "tetris"`.
- [x] "JUGAR DE NUEVO" reinicia completamente el tablero (vacío, pieza nueva, score/líneas/nivel en 0/0/1) sin desmontar el componente del canvas.
- [x] Redimensionar la ventana mantiene el tablero en proporción 1:2 dentro de `.crt-screen`, sin recortar ni deformar.
- [x] `read_console_messages` no muestra errores durante una partida completa de tetris.
- [x] `/salon-de-la-fama` muestra una pestaña "TETRIS" junto a la de "ASTEROIDES", y tras guardar una puntuación esa pestaña refleja la fila real.
- [x] `/juegos/asteroides/jugar` sigue funcionando exactamente igual que antes de este spec (mismo HUD de 3 tiles con Vidas, misma pausa, mismo fin de juego) tras la introducción del registro.
- [x] No queda ninguna referencia a `AsteroidsGameProps`/`AsteroidsGameHandle` con los callbacks viejos (`onScoreChange`/`onLivesChange`/`onLevelChange`) en el código — todo pasa por `ArcadeGameProps`/`ArcadeGameHandle` del registro.

## Decisiones tomadas y descartadas

- **Se introduce `components/games/registry.ts` en este mismo spec, no en uno de limpieza aparte.** Razón: decisión explícita del usuario — con un segundo juego real, el `if (game.id === "asteroides")` puntual deja de ser sostenible; el refactor va junto con el juego que lo motiva.
- **`onStatsChange(stats)` reemplaza los callbacks separados por stat.** Razón: permite que `tetris` reporte `lines` en vez de `lives` sin ensanchar la interfaz compartida cada vez que aparece un stat distinto.
- **Categoría `PUZZLE`, color `magenta`, portada reusando `.cover-tetro`.** Razón: decisión explícita del usuario — `PUZZLE` es la categoría correcta para Tetris (no ARCADE/SHOOTER/VERSUS); `magenta` lo distingue de `asteroides` (cyan) en la grilla; `.cover-tetro` ya existe huérfano desde SPEC 06 con temática exacta, evita CSS nuevo.
- **Proporción 1:2 vía override de `aspect-ratio` por juego, no letterboxing.** Razón: decisión explícita del usuario — un letterbox fijo en 4:3 dejaría franjas muertas notorias en un juego verticalmente angosto; el registro ya necesitaba un campo de layout por juego, así que se usa para esto.
- **HUD doble: el panel interno original (`SCORE`/`LINES`/`LEVEL`, HTML/DOM) se conserva tal cual dentro del componente, y el HUD externo de React también se sincroniza con los mismos valores.** Razón: decisión explícita del usuario — el panel interno del original (nunca fue dibujo de canvas, siempre fue HTML junto al tablero) se porta fiel tal cual, sin convertirlo en dibujo de canvas; el HUD externo de React se adapta en paralelo para seguir el patrón del registro (`hudStats`), aceptando la duplicación visual de los mismos valores en dos lugares, igual que el HUD doble (canvas+React) de `asteroides` aunque aquí el HUD interno es DOM en vez de canvas. La lista de `CONTROLS` del panel original no se porta — es redundante con la documentación de controles de esta spec y de la pantalla de juego.
- **El panel "NEXT" (vista previa) se conserva.** Razón: decisión explícita del usuario — es una mecánica real de planificación de Tetris, no decoración; se mantiene dentro del mismo componente cliente.
- **El toggle de tema claro/oscuro no se porta.** Razón: decisión explícita del usuario — sería la única pantalla de Arcade Vault con tema conmutable y el único uso de `localStorage` para preferencia visual, inconsistente con el resto de la plataforma que usa un tema CRT fijo.
- **Se elimina el atajo de teclado `KeyP` (pausa interna).** Razón: decisión explícita del usuario — mismo criterio que la eliminación del atajo de reinicio en `asteroides` (SPEC 05): evitar que un estado de pausa interno y el botón de React queden desincronizados.
- **`forceGameOver()` fuerza el flag sin lógica de colisión.** Razón: Tetris no tiene vidas que agotar: forzar game over es simplemente fijar `gameOver = true`, sin el equivalente a `killShip()` de asteroides.
- **Sin controles táctiles.** Razón: decisión ya tomada en SPEC 05 para el catálogo real; se mantiene el mismo criterio.

## Riesgos identificados

| Riesgo                                                                                                                                                                             | Mitigación                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El refactor del registro toca `asteroids-game.tsx` y `game-player.tsx`, que ya funcionan en producción — un error ahí rompe el único juego real existente, no solo el nuevo.       | El plan de implementación verifica explícitamente `/juegos/asteroides/jugar` (paso 13 y criterio de aceptación dedicado) antes de cerrar el spec.                                                                                                                                                 |
| React Strict Mode duplica montajes de efectos en desarrollo, pudiendo duplicar listeners de teclado o loops de `requestAnimationFrame` del nuevo componente de Tetris.             | El `useEffect` principal limpia explícitamente (`cancelAnimationFrame`, `removeEventListener`) en su función de retorno, siguiendo el mismo patrón ya probado en `asteroids-game.tsx`.                                                                                                            |
| El HUD doble (panel interno HTML + HUD externo de React) puede desincronizarse si el `useState` interno y la llamada a `onStatsChange` no se actualizan en el mismo paso del loop. | Ambas actualizaciones (el `useState` del panel interno y la llamada a `onStatsChange`) se disparan desde el mismo punto del loop, inmediatamente después de mutar `score`/`lines`/`level`, nunca en un `setTimeout` ni efecto separado — mismo criterio ya aplicado al HUD doble de `asteroides`. |
| `ResizeObserver` disparando redimensionados muy frecuentes podría causar parpadeo o costo de CPU, agravado por tener dos canvas (tablero + "NEXT") en el mismo componente.         | Redimensionar `canvas.width`/`height` solo cuando el tamaño en píxeles reales cambió respecto al valor cacheado anterior, igual que en `asteroides`; el canvas "NEXT" es de tamaño fijo (120×120) y no necesita `ResizeObserver`.                                                                 |
| El `aspect-ratio` inline por juego podría no sobrescribir correctamente el `4/3` de `.crt-screen` si hay otra regla CSS con mayor especificidad.                                   | Verificar visualmente en `/juegos/tetris/jugar` que el tablero efectivamente se ve en proporción 1:2 y no recortado dentro de un marco 4:3; si hace falta, ajustar la especificidad del selector en `app/arcade-vault.css` (sin tocar el valor por defecto usado por `asteroides`).               |
| La policy de `insert` abierta (`with check (true)`) en `scores` permite puntuaciones arbitrarias para `tetris`, igual que para `asteroides`.                                       | Aceptado como parte del alcance actual, igual que en SPEC 05/06; anti-cheat queda para un spec futuro una vez haya Auth real.                                                                                                                                                                     |
