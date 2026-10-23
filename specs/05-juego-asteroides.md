# 05 — Juego real de Asteroides (nueva entrada "asteroides")

**Estado:** Implementado
**Depende de:** —
**Fecha:** 2026-10-23

**Objetivo:** Agregar un juego nuevo al catálogo con `id: "asteroides"` que reemplaza, solo para ese id, la UI decorativa falsa de `GamePlayer` por el juego real de Asteroids (adaptado de `references/started-games/02-asteroids`), sincronizando su estado (puntuación, vidas, nivel, fin de partida) con el HUD externo de React sin eliminar el HUD propio que el juego dibuja en su canvas.

## Alcance

**Incluido:**

- Nueva entrada en `GAMES` (`app/data.ts`) con `id: "asteroides"`: `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-asteroides"`, `short`, `long`, `best` y `plays` con valores propios (no reutiliza ningún campo de la entrada `rocas` existente).
- Nuevo bloque CSS `.cover-asteroides` en `app/arcade-vault.css` (siguiendo el patrón de los demás `.cover-*`: gradiente + pseudo-elementos decorativos) para que la portada de "asteroides" en la grilla del catálogo no sea visualmente idéntica a la de `rocas`.
- Nuevo componente cliente `components/games/asteroids-game.tsx` que porta a TypeScript la lógica de `references/started-games/02-asteroids/game.js` (clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, loop de `update`/`draw`, wrap toroidal, power-up de disparo triple), manteniendo las mismas constantes de jugabilidad (velocidades, radios, puntos, cooldowns, duración de power-up) y el sistema de coordenadas lógico 800×600 (igual relación 4:3 que `.crt-screen`).
- El canvas sigue dibujando su propio HUD interno (SCORE/NIVEL/vidas/overlay `GAME OVER`) exactamente igual que el original, sin quitarlo.
- El componente expone su estado hacia React vía callbacks de props: `onScoreChange(score)`, `onLivesChange(lives)`, `onLevelChange(level)`, `onGameOver(finalScore)`, invocados cuando cada valor cambia.
- El componente expone dos acciones imperativas a través de un `ref` (`useImperativeHandle`): `restart()` (reinicia el juego interno, equivalente a `initGame()`) y `forceGameOver()` (fuerza el estado interno a `'gameover'` sin pasar por la lógica de vidas, mostrando el overlay propio del canvas con la puntuación actual).
- El componente acepta una prop `paused: boolean`: cuando es `true`, el `requestAnimationFrame` interno deja de llamar a `update()` (sigue llamando `draw()` para no congelar el frame a medias, pero no avanza física ni procesa disparo/input).
- `components/game-player.tsx` se modifica para, cuando `game.id === "asteroides"`, renderizar `AsteroidsGame` dentro de `.crt-screen` en vez de los divs decorativos `.game-arena` actuales, y sincronizar su HUD externo (`hud-stat` de Puntuación/Vidas/Nivel) con los callbacks del juego real en lugar del `setInterval` de puntuación aleatoria y los valores fijos de vidas/nivel.
- Para `game.id === "asteroides"`: el botón "PAUSA"/"REANUDAR" controla la prop `paused` del canvas (pausa real, el juego se congela). El botón "FIN" llama a `forceGameOver()` del ref además de poner `over = true` en React, mostrando ambos overlays (el del canvas y el modal) de forma consistente con la misma puntuación. "JUGAR DE NUEVO" llama a `restart()` del ref además de resetear el estado React (`setSaved(false)`, `setOver(false)`), sin desmontar el componente del canvas.
- El atajo original de `game.js` ("Espacio reinicia en game over") se desactiva en la versión portada — el reinicio solo ocurre vía `restart()` invocado desde React, para evitar reinicios duplicados.
- El canvas se redimensiona de forma responsiva para llenar `.crt-screen` (que mantiene `aspect-ratio: 4/3`, igual que 800×600): el elemento `<canvas>` usa CSS `width: 100%; height: 100%`, y un `ResizeObserver` ajusta `canvas.width`/`canvas.height` en píxeles reales (incluyendo `devicePixelRatio`) mientras la lógica del juego sigue operando en el sistema de coordenadas lógico 800×600 escalado con `ctx.scale(...)`.
- Para el resto del catálogo (los 8 juegos existentes, incluyendo `rocas`), `GamePlayer` sigue funcionando exactamente igual que hoy (HUD falso con `setInterval`, `.game-arena` decorativo). No se introduce ninguna abstracción de "motor de juego" genérico — la condición es un `if (game.id === "asteroides")` explícito y puntual dentro de `GamePlayer`.
- Controles: solo teclado, idénticos al original (`←` `→` rotar, `↑` propulsar, `Espacio` disparar). Sin controles táctiles.
- Al terminar la partida (por vidas agotadas o por "FIN"), se mantiene el flujo existente del modal (`FIN DEL JUEGO`, input de iniciales, botón "GUARDAR PUNTUACIÓN" que llama a `saveScore` de `lib/storage.ts`) sin cambios, usando la puntuación real reportada por `onGameOver` y `game: "asteroides"` como clave.

**No incluido (fuera de alcance de este spec):**

- Cualquier cambio a la entrada `rocas` existente en `app/data.ts` o a su `GamePlayer` falso. Es pura coincidencia temática con "asteroides" (ambos tratan de romper rocas espaciales); `rocas` sigue siendo un juego decorativo distinto, sin tocar.
- Adaptar cualquier otro juego real de `references/started-games/` — este spec cubre únicamente la nueva entrada `asteroides`.
- Un patrón o abstracción genérica para "juegos reales vs. decorativos" dentro de `GamePlayer` — decisión explícita del usuario de mantenerlo puntual con un `if` por ahora.
- Controles táctiles o adaptación a pantallas pequeñas más allá del redimensionado responsivo del canvas.
- Persistencia de puntuaciones en Supabase — `saveScore` sigue escribiendo en `localStorage` vía `lib/storage.ts`, sin cambios respecto al comportamiento actual de los demás juegos.
- Leaderboard con datos reales en `app/juegos/asteroides/page.tsx` — sigue usando `seededScores` como el resto de las fichas de detalle, igual que hoy para todos los juegos.
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

```ts
// app/data.ts — nueva entrada en GAMES
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Pulveriza un campo real de asteroides en gravedad cero.",
  long: "Pilota tu nave en un espacio toroidal real: rota, propulsa y dispara para fragmentar rocas grandes en medianas y luego pequeñas. Recoge el power-up de disparo triple y sobrevive al mayor número de niveles posible.",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 36500,
  plays: "1.2K",
}
```

```ts
// components/games/asteroids-game.tsx
export type AsteroidsGameHandle = {
  restart: () => void;
  forceGameOver: () => void;
};

export type AsteroidsGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};
```

Las clases internas (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) y las constantes (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`) se portan con los mismos nombres y valores que `references/started-games/02-asteroids/game.js`, como variables internas del módulo o del componente (no se exportan). No se introducen estructuras de persistencia nuevas: `saveScore`/`SavedScore` de `lib/storage.ts` se reutilizan tal cual, usando `"asteroides"` como valor de `game`.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. Agregar la nueva entrada `asteroides` a `GAMES` en `app/data.ts` (ver modelo de datos arriba), y agregar `.cover-asteroides` a `app/arcade-vault.css` siguiendo el patrón de los demás `.cover-*`. Verificar que la tarjeta aparece en `/juegos` y su ficha en `/juegos/asteroides` (con el `GamePlayer` falso todavía, ya que el componente real no existe aún).
2. Crear `components/games/asteroids-game.tsx` portando las clases y constantes de `game.js` a TypeScript, sin lógica de React todavía: un `canvasRef`, un loop interno con `requestAnimationFrame` montado en `useEffect`, y limpieza (`cancelAnimationFrame`, remover listeners de teclado) en el `return` del efecto. El canvas sigue fijo en 800×600 lógicos en este paso.
3. Adaptar el manejo de input: los listeners de `keydown`/`keyup` se agregan/quitan dentro del mismo `useEffect` (en vez de globals de `window` fuera de React), evitando fugas si el componente se desmonta.
4. Agregar la prop `paused`: el loop interno sigue llamando a `draw()` cada frame pero omite la llamada a `update(dt)` cuando `paused === true`, y no acumula `dt` (usa `lastTime = null` al despausar para evitar un salto de tiempo).
5. Agregar los callbacks `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`: se invocan desde dentro del loop cuando el valor correspondiente cambia respecto al frame anterior (comparando con un `useRef` del valor previo), y `onGameOver` se invoca una sola vez al entrar a `state === 'gameover'`.
6. Exponer `restart` y `forceGameOver` vía `useImperativeHandle` sobre un `ref` tipado como `AsteroidsGameHandle`; `restart` llama internamente a la misma lógica que `initGame()`, `forceGameOver` fuerza `state = 'gameover'` sin pasar por `killShip()`.
7. Quitar el atajo de "Espacio reinicia en game over" del loop portado (ya que el reinicio ahora lo dispara React vía `restart()`).
8. Hacer el canvas responsivo: envolver el `<canvas>` en un contenedor con `width: 100%; height: 100%` dentro de `.crt-screen`, agregar un `ResizeObserver` que actualice `canvas.width`/`canvas.height` según el tamaño real del contenedor (multiplicado por `devicePixelRatio`), y aplicar `ctx.scale(...)` al inicio de cada `draw()` para que la lógica del juego siga operando en coordenadas lógicas 800×600.
9. Modificar `components/game-player.tsx`: agregar un `AsteroidsGameHandle` ref, renderizar condicionalmente `<AsteroidsGame .../>` dentro de `.crt-screen` cuando `game.id === "asteroides"` (en vez de `.game-arena`), y conectar sus callbacks a `setScore`, `setLives`, `setLevel` (nuevo estado, reemplazando el cálculo `Math.floor(score / 2500) + 1` solo para este juego) y a `endGame`.
10. Conectar los botones existentes para `game.id === "asteroides"`: "PAUSA"/"REANUDAR" alternan la prop `paused`; "FIN" llama a `asteroidsRef.current?.forceGameOver()` además de `endGame()`; "JUGAR DE NUEVO" llama a `asteroidsRef.current?.restart()` además del `restart()` de React existente.
11. Probar manualmente en `/juegos/asteroides/jugar`: mover la nave, disparar, romper asteroides grandes/medianos/pequeños, recoger el power-up de disparo triple, perder las 3 vidas y ver el modal de fin de juego con la puntuación real, guardar la puntuación y confirmar que aparece en `localStorage` (`av_scores`) con `game: "asteroides"`, probar "PAUSA"/"REANUDAR" y "FIN" a mitad de partida, y redimensionar la ventana del navegador para confirmar que el canvas se ajusta a `.crt-screen` sin deformarse.
12. Confirmar que los demás 8 juegos del catálogo (incluyendo `rocas`) siguen mostrando el `GamePlayer` falso sin ningún cambio de comportamiento.
13. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `/juegos` muestra la nueva tarjeta "ASTEROIDES" con su propia portada (`.cover-asteroides`), distinta visualmente de la de `rocas`.
- [ ] En `/juegos/asteroides/jugar` se ve y juega el Asteroids real (nave, asteroides, disparo, power-up de triple disparo, partículas de explosión), no la UI decorativa falsa.
- [ ] El HUD externo de React (Puntuación, Vidas, Nivel en `player-hud`) refleja en tiempo real los valores reales del juego (no valores aleatorios ni fijos).
- [ ] El canvas sigue mostrando su propio HUD interno (SCORE/NIVEL/vidas) dibujado como en el original.
- [ ] Pulsar "PAUSA" congela completamente el juego (la nave y los asteroides dejan de moverse); "REANUDAR" lo continúa sin saltos de física.
- [ ] Pulsar "FIN" en cualquier momento muestra tanto el overlay `GAME OVER` del canvas como el modal `FIN DEL JUEGO` de React, ambos con la misma puntuación.
- [ ] Al agotar las 3 vidas sin pulsar "FIN", ocurre lo mismo: overlay del canvas + modal de React con la misma puntuación.
- [ ] Guardar la puntuación desde el modal agrega una entrada a `localStorage` (`av_scores`) con `game: "asteroides"`, la puntuación real y el nombre ingresado.
- [ ] "JUGAR DE NUEVO" reinicia completamente el juego real (nueva nave al centro, 3 vidas, nivel 1, puntuación 0) sin desmontar el componente del canvas.
- [ ] Redimensionar la ventana del navegador mantiene el canvas ajustado a `.crt-screen` sin recortar ni deformar la proporción 4:3.
- [ ] `/juegos/rocas` y su `jugar` siguen mostrando exactamente el mismo `GamePlayer` decorativo falso que antes de este spec.
- [ ] Los demás 7 juegos del catálogo (sin contar `rocas` ni `asteroides`) siguen mostrando el `GamePlayer` decorativo falso exactamente igual que antes.

## Decisiones tomadas y descartadas

- **Juego nuevo con `id: "asteroides"`, independiente de `rocas`.** Aunque `rocas` ya describe temáticamente un juego de asteroides, es una entrada falsa/decorativa preexistente y no se reutiliza ni se fusiona. Razón: decisión explícita del usuario — "asteroides" es un juego nuevo y distinto en el catálogo, la similitud con `rocas` es coincidencia.
- **Metadatos de catálogo:** `cat: "SHOOTER"`, `color: "cyan"`, portada propia `.cover-asteroides`. Razón: decisión explícita del usuario, buscando que la nueva tarjeta se distinga visualmente de `rocas` (que usa `color: "yellow"`) en la grilla.
- **Alcance limitado a `asteroides`, sin patrón genérico.** Se usa un `if (game.id === "asteroides")` puntual en `GamePlayer` en vez de diseñar una abstracción de "motor de juego" reutilizable. Razón: decisión explícita del usuario — no se sabe todavía si/cuándo se adaptará otro juego real, y una abstracción prematura con un solo caso real sería especulativa.
- **HUD doble (canvas + React), sincronizado por callbacks.** El canvas conserva su propio HUD dibujado (fiel al original) y el HUD externo de React también se sincroniza con el estado real vía callbacks. Razón: decisión explícita del usuario, priorizando fidelidad visual al juego original sobre una única fuente de verdad de UI.
- **Pausa real (congela el loop) en vez de pausa solo visual.** Razón: decisión explícita del usuario — una pausa que no detiene la física permitiría perder vidas detrás del overlay, lo cual sería confuso.
- **"FIN" fuerza game-over interno sincronizado.** En vez de que el canvas quede "congelado a medias" detrás del modal, se fuerza su propio estado `'gameover'`. Razón: decisión explícita del usuario para mantener ambos HUDs consistentes en todo momento.
- **Reinicio vía función expuesta (`restart()` por ref) en vez de remount por `key`.** Razón: decisión explícita del usuario — evita recrear canvas y listeners en cada reinicio, más eficiente que un remount completo.
- **Sin controles táctiles.** Se replican únicamente los controles de teclado del original. Razón: decisión explícita del usuario; el soporte táctil, si se decide, queda para un spec futuro.
- **Canvas responsivo con coordenadas lógicas fijas 800×600 escaladas.** En vez de recalcular constantes de jugabilidad (velocidades, radios) según el tamaño real del contenedor, se mantiene la física en el sistema lógico original y solo se escala el `ctx` al dibujar. Razón: conserva la fidelidad de jugabilidad del original (velocidades, timings) sin tener que re-balancear el juego para cada resolución.

## Riesgos identificados

| Riesgo                                                                                                                                                            | Mitigación                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode en desarrollo monta/desmonta efectos dos veces, pudiendo duplicar listeners de teclado o loops de `requestAnimationFrame`.                      | El `useEffect` que arranca el loop y agrega los listeners debe limpiar explícitamente (`cancelAnimationFrame`, `removeEventListener`) en su función de retorno antes de portar la lógica. |
| Doble HUD (canvas + React) puede desincronizarse si los callbacks no se invocan en el mismo frame en que cambia el estado interno.                                | Los callbacks se llaman dentro del mismo loop de `update()`, inmediatamente después de mutar `score`/`lives`/`level`/`state`, nunca en un `setTimeout` ni efecto separado.                |
| `ResizeObserver` disparando redimensionados muy frecuentes (ej. durante animaciones de layout) podría causar parpadeo o costo de CPU.                             | Redimensionar el `canvas.width`/`height` solo cuando el tamaño en píxeles reales cambia respecto al anterior, no en cada callback del observer.                                           |
| La nueva tarjeta "ASTEROIDES" y la existente "ROCAS" conviven en el mismo catálogo con temática casi idéntica, lo cual puede confundir a quien navegue `/juegos`. | Fuera de alcance de este spec (ver "No incluido"); si se decide más adelante, un spec futuro puede renombrar, fusionar o eliminar `rocas`.                                                |
