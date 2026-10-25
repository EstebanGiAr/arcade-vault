# Port recipe — from `references/started-games/*/game.js` to a React component

This is the scaffolding recipe distilled from `components/games/asteroids-game.tsx` (697 lines), the one real precedent in this repo. A new spec's implementation plan should describe the same scaffolding, not improvise a different one.

## File order

1. `"use client"`.
2. Module-level constants: logical canvas size (`W`, `H`), balance tables (speeds, radii, points, cooldowns) — same names and values as the original.
3. Pure helpers at module scope (`wrap`, `dist`, `rand`, `randInt` in the asteroids case).
4. Pure ES classes, outside React, one per game entity. Common contract: a `dead = false` flag, an `update(dt)` method, a `draw(ctx)` method. Entities that split or spawn others add their own methods (`Asteroid.split()`, `Ship.tryShoot()`).
5. A `type GameState = "playing" | "dead" | "gameover"` (or whatever the original's terminal states are).
6. Exported types: `type <Name>GameHandle = { restart; forceGameOver }` and `type <Name>GameProps = { paused; onScoreChange; onLivesChange; onLevelChange; onGameOver }` — or, once the registry exists (see `platform-integration.md`), the shared `ArcadeGameHandle`/`ArcadeGameProps`.
7. The component itself.

## Zero `useState`

Every prop and callback that would normally trigger a re-render instead lives in a ref, so the main `useEffect` can declare `[]` as its dependency array and the game loop never restarts. The five refs of the pattern:

- `containerRef`, `canvasRef` — DOM handles.
- `pausedRef` — mirror of the `paused` prop.
- `callbacksRef` — mirror of the callback props.
- `actionsRef` — holds the live `restart`/`forceGameOver` functions, wired at the end of the main effect.

## `useImperativeHandle` via indirection

```tsx
useImperativeHandle(
  ref,
  () => ({
    restart: () => actionsRef.current.restart(),
    forceGameOver: () => actionsRef.current.forceGameOver(),
  }),
  [],
);
```

The handle is stable with `[]` deps because it never calls the real functions directly — it calls through `actionsRef`, which the main effect populates once `initGame`/`killShip`-equivalent logic exists.

## `paused` mirror effect

```tsx
useEffect(() => {
  if (pausedRef.current && !paused) {
    // Al despausar, evita que el próximo frame acumule el tiempo transcurrido en pausa.
    resetTimeRef.current = true;
  }
  pausedRef.current = paused;
}, [paused]);
```

Without `resetTimeRef`, unpausing would feed the loop a huge `dt` (time elapsed while paused) and the physics would jump.

## The single `useEffect([])`

In this exact order:

1. **Explicit ref narrowing** so TypeScript strict mode is happy without `!`:
   ```tsx
   const maybeContainer = containerRef.current;
   const maybeCanvas = canvasRef.current;
   if (!maybeContainer || !maybeCanvas) return;
   const container: HTMLDivElement = maybeContainer;
   const canvas: HTMLCanvasElement = maybeCanvas;
   const maybeCtx = canvas.getContext("2d");
   if (!maybeCtx) return;
   const ctx: CanvasRenderingContext2D = maybeCtx;
   ```
2. **`ResizeObserver`** that caches the last pixel size (including `devicePixelRatio`) and only touches `canvas.width`/`canvas.height` when it actually changed:
   ```tsx
   let pixelWidth = 0;
   let pixelHeight = 0;
   function resizeCanvasToContainer() {
     const dpr = window.devicePixelRatio || 1;
     const rect = container.getBoundingClientRect();
     const newWidth = Math.max(1, Math.round(rect.width * dpr));
     const newHeight = Math.max(1, Math.round(rect.height * dpr));
     if (newWidth !== pixelWidth || newHeight !== pixelHeight) {
       pixelWidth = newWidth;
       pixelHeight = newHeight;
       canvas.width = newWidth;
       canvas.height = newHeight;
     }
   }
   resizeCanvasToContainer();
   const resizeObserver = new ResizeObserver(resizeCanvasToContainer);
   resizeObserver.observe(container);
   ```
3. **Keyboard listeners inside the effect**, on `window`, never as module-level globals: a `keys` map for "held" state, a `justPressed` map plus a consuming `pressed(code)` helper for edge-triggered actions (shoot, rotate-once), and selective `preventDefault` via a `GAME_KEYS` set so the page doesn't scroll on arrow keys.
4. **Game state as `let`s in the closure** — not refs, not React state — with `prev*` shadow variables for diffing: `let score = 0; let prevScore = score; …`.
5. **Closures**: the ported `update(dt)`, `draw()` (plus any internal HUD drawing functions), and a new `reportChanges()` (see below).
6. **`reportChanges()`** — the bridge to the external React HUD. Only call a callback when the value actually changed since the previous frame:
   ```tsx
   function reportChanges() {
     if (score !== prevScore) {
       prevScore = score;
       callbacksRef.current.onScoreChange(score);
     }
     // … same for lives, level …
     if (state === "gameover" && prevState !== "gameover") {
       callbacksRef.current.onGameOver(score);
     }
     prevState = state;
   }
   ```
   Without this diffing there would be a `setState` every single frame.
7. **Scaling inside `draw()`**: `ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0)` at the start of every `draw()` call — never an accumulating `ctx.scale()`. Game physics stays in the original logical coordinate system; constants (speeds, radii) are never re-balanced for different screen sizes.
8. **The loop**: `draw()` runs every frame; `update(dt)` only runs when `!pausedRef.current`; `dt` is clamped (e.g. to 50ms) to avoid a huge jump after a tab was backgrounded.
9. **Wiring `actionsRef`** and starting the loop:
   ```tsx
   actionsRef.current.restart = initGame;
   actionsRef.current.forceGameOver = () => {
     state = "gameover";
   };
   initGame();
   rafId = requestAnimationFrame(loop);
   ```
10. **Cleanup — mandatory, all four**:
    ```tsx
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    ```
    React Strict Mode double-mounts effects in development; without this cleanup, keyboard listeners and `requestAnimationFrame` loops duplicate silently.

## Render

```tsx
return (
  <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  </div>
);
```

## Deliberate removals when porting

- Any keyboard shortcut that restarts the game in the original (`asteroides`' "Space restarts on game over") is removed. Restart only happens via `restart()` called from React, to avoid double restarts racing each other.

## Traps seen in the actual reference files — check for each when porting a new one

- **`02-asteroids`**: starts the loop at module scope, no `cancelAnimationFrame` — both need fixing when porting.
- **`03-tetris`**: HUD lives in the DOM (`#score`/`#lines`/`#level`, a `<div id="overlay">`), not on canvas — ask the user how to handle this (see Phase 2/3 of `SKILL.md`). Persists a theme choice to `localStorage` — call this out explicitly in the spec; it's the only reference that touches storage. Canvas is 300×600 (1:2), not 4:3 — ask about letterboxing vs. a per-game aspect-ratio override. It is the only reference that correctly cancels its `requestAnimationFrame`.
- **`04-arkanoid`**: mixes `canvas.width` with hardcoded literals (`BLOCKS_ORIGIN_X = (800 - BLOCK_COLS * BLOCK_W) / 2`) — port using the literals, not `canvas.width`, to keep the logical coordinate system clean. Adds `mousemove`/`click` listeners on the canvas for in-canvas pause-menu buttons — these need the same "inside the effect, cleaned up on unmount" treatment as the keyboard listeners. Brings external assets: a spritesheet PNG and two `.mp3`s, loaded via `new Audio(...)` and a `loadSpritesheet(callback)` that gates when the loop starts. Has a script load-order dependency: `spritesheet.js` → `levels.js` → `game.js` (globals `drawSprite`, `drawFrame`, `LEVELS`). When porting, these three files' logic merges into one component; assets move to `public/games/<id>/`.
