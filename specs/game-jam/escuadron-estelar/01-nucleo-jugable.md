# 01 — ESCUADRÓN ESTELAR: núcleo jugable (nueva entrada "escuadron-estelar")

**Estado:** Borrador
**Depende de:** SPEC 05, SPEC 06, SPEC 07
**Fecha:** 2026-10-27

**Objetivo:** Construir el componente cliente `components/games/escuadron-estelar-game.tsx` con el bucle de juego completo —formación de naves enemigas con curva de entrada, sostenimiento en formación con balanceo, ataques en picada periódicos, disparo fijo del jugador y todas las colisiones— operando en memoria con sus propios tipos y closures, sin tocar todavía `GAME_REGISTRY` ni Supabase.

## Alcance

**Incluido:**

- Nuevo componente cliente `components/games/escuadron-estelar-game.tsx`, diseñado desde cero (no hay código de referencia en `references/started-games/` para este juego; es un diseño propio inspirado en el género "shooter de formación", no un port línea a línea). No se usa ningún asset binario nuevo: todas las naves, balas y fondo se dibujan con primitivas de canvas (`fillRect`/`moveTo`/`lineTo`/`arc`), cumpliendo la restricción de "ningún asset binario nuevo" del dossier.
- Canvas lógico fijo de `W = 800`, `H = 600` (4:3, igual que `asteroides`/`arkanoid`), escalado en `draw()` vía `ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0)`, nunca con `ctx.scale()` acumulado.
- Nave del jugador (`PlayerShip`): se mueve solo en el eje horizontal (`←`/`→`), velocidad `PLAYER_SPEED` px/s, clamp dentro de `[PLAYER_WIDTH / 2, W - PLAYER_WIDTH / 2]`, posición vertical fija en `PLAYER_Y = H - 56`. Dispara un proyectil fijo hacia arriba con `Espacio` (edge-triggered, respetando `BULLET_COOLDOWN_MS` entre disparos — no es automático al mantener presionado).
- Tres "tiers" de naves enemigas (`comandante`, `acosador`, `explorador`), cada una con su propia cantidad de filas/columnas dentro de la formación, color y valor de puntos (ver `TIER_POINTS` en el modelo de datos). La oleada completa (todas las tiers juntas) se arma una sola vez por nivel mediante `buildFormationSlots(level)`.
- Ciclo de vida de cada nave enemiga por estados (`EnemyState`): `"entering"` (sigue una curva de Bézier cuadrática desde un punto fuera de pantalla hasta su casilla de formación, con un retraso escalonado por índice — `ENTRY_STAGGER_MS` — para que entren en cascada y no todas a la vez) → `"formation"` (ancla su casilla y se desplaza lateralmente con un balanceo senoidal compartido por toda la oleada, `SWAY_AMPLITUDE_PX`/`SWAY_PERIOD_MS`) → periódicamente, un temporizador de oleada (`diveTimerMs`, que arranca en `DIVE_INTERVAL_BASE_MS` y se acorta por nivel hasta un piso `DIVE_INTERVAL_MIN_MS`) selecciona entre 1 y 2 naves en `"formation"` al azar y las pasa a `"diving"` (siguen una curva de Bézier hacia una coordenada X cercana a la posición actual del jugador, capturada al iniciar la picada, y continúan de largo hasta salir por el borde inferior) → al salir de pantalla, vuelven a entrar desde abajo con una curva de "retorno" (`"returning"`) hacia su casilla original de formación, reincorporándose a `"formation"`. Una nave destruida pasa a `"dead"` y se elimina del arreglo activo.
- Una nave en `"diving"` dispara exactamente un proyectil enemigo (recto hacia abajo, sin homing) cuando su posición Y cruza una franja intermedia de la pantalla, para que la amenaza de la picada no dependa solo de la colisión por contacto.
- Colisión bala-del-jugador contra enemigo: si impacta, el enemigo pasa a `"dead"`, se suma `TIER_POINTS[tier].formation` si estaba en `"entering"`/`"formation"`/`"returning"`, o `TIER_POINTS[tier].dive` (el doble) si estaba en `"diving"` — recompensa derribar naves en pleno ataque, no solo en formación estática.
- Colisión jugador contra bala enemiga o contra el cuerpo de una nave en `"diving"`: resta una vida (`lives`), activa `invulnerableMs = PLAYER_INVULNERABLE_MS` (la nave parpadea y no puede volver a perder vida durante ese lapso) y recentra al jugador en `x = W / 2`. Si `lives` llega a `0`, `gameState = "gameover"`.
- Fin de oleada: cuando el arreglo de enemigos activos queda vacío, tras un `WAVE_CLEAR_DELAY_MS` se suma un bonus (`WAVE_CLEAR_BONUS_PER_LEVEL * level`), se incrementa `level` y se llama de nuevo a `buildFormationSlots(level)`/`initWave(level)` para la siguiente oleada, más agresiva (menor `diveTimerMs` base, ver tabla de dificultad). El juego no tiene un final "ganable" — es infinito por oleadas crecientes, igual que el campo de asteroides de `asteroides` es infinito por oleadas.
- El componente reutiliza los tipos ya existentes `ArcadeGameProps`/`ArcadeGameHandle` de `components/games/registry.ts` (introducidos en SPEC 07) para sus props y su ref imperativa, aunque en este spec todavía no exista una entrada `escuadron-estelar` en `GAME_REGISTRY` que los conecte a ninguna página real.
- El componente acepta `paused: boolean`: cuando es `true`, el loop sigue llamando a `draw()` cada frame pero no avanza ninguna curva, temporizador de picada, cooldown de disparo ni colisión, con el mismo patrón `resetTimeRef` que `asteroids-game.tsx`/`arkanoid-game.tsx` para evitar un salto de `dt` al despausar.
- `restart()`/`forceGameOver()` expuestos vía `useImperativeHandle` con la indirección por `actionsRef` que documenta `port-recipe.md`. `restart()` reinicia `level = 1`, `lives = PLAYER_LIVES_INITIAL`, `score = 0`, limpia enemigos/balas y vuelve a llamar `initWave(1)`. `forceGameOver()` fuerza `gameState = "gameover"` directamente, sin pasar por la lógica de colisión.
- Redimensionado responsivo igual que `asteroides`: contenedor `width: 100%; height: 100%`, `ResizeObserver` que solo toca `canvas.width`/`canvas.height` cuando el tamaño real en píxeles (con `devicePixelRatio`) cambió respecto al valor cacheado.
- Dibujo en `draw()` de todas las entidades (jugador, enemigos de las 3 tiers con forma/color distintos, balas de jugador y enemigo) sobre fondo negro — sin HUD interno en canvas ni overlays de fin de oleada/fin de juego todavía (eso es contenido explícito de SPEC 03).
- Un `reportChanges()` mínimo que compara `score`/`lives`/`level`/`gameState` contra el frame anterior y llama a `callbacksRef.current.onStatsChange({...})`/`onGameOver(score)` solo cuando cambian — mismo patrón de diffing que `asteroids-game.tsx`, aunque en este spec no hay ninguna página real que consuma esos callbacks todavía.

**No incluido (fuera de alcance de este spec):**

- La entrada en `GAME_REGISTRY`, la fila de la tabla `games` en Supabase, la portada CSS y el flujo de guardado de puntuación — todo eso es SPEC 02.
- El HUD interno dibujado en canvas (SCORE/VIDAS/NIVEL), los overlays de "OLEADA X" y "GAME OVER", los efectos de partículas al destruir una nave, el fondo estelar con scroll, y el ajuste fino final de las tablas de dificultad — todo eso es SPEC 03. Los valores numéricos de dificultad de este spec (`DIVE_INTERVAL_BASE_MS`, etc.) son un primer balance funcional, no el balance final.
- Cualquier mecánica de "captura" de la nave del jugador (como el "capture beam" de ciertos shooters de formación clásicos) — se descarta por completo, ver Decisiones.
- Power-ups, armas secundarias o disparo múltiple — el enunciado pide "disparo fijo", no hay espacio de diseño para power-ups en este spec.
- Controles táctiles, WASD alternativo, o adaptación a pantallas pequeñas más allá del redimensionado responsivo del canvas.
- Audio — no hay ningún asset de sonido disponible en `references/source-assets/` para este juego, y el dossier prohíbe generar binarios nuevos.
- Anti-cheat o validación de puntuaciones — ya es una decisión asumida en SPEC 04/06, no se reabre aquí.
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

```ts
// components/games/escuadron-estelar-game.tsx — tipos internos del módulo
type Vec2 = { x: number; y: number };

type EnemyTier = "comandante" | "acosador" | "explorador";
type EnemyState = "entering" | "formation" | "diving" | "returning" | "dead";
type GameState = "playing" | "gameover";

// Una curva de Bézier cuadrática define cualquier trayectoria no estática
// (entrada, picada o retorno); se evalúa con una única función pura
// quadraticBezier(p0, p1, p2, t) reutilizada por los tres casos.
type Curve = { p0: Vec2; p1: Vec2; p2: Vec2; durationMs: number };
```

Constantes de módulo:

```ts
const W = 800;
const H = 600;

// Jugador
const PLAYER_Y = H - 56;
const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 24;
const PLAYER_SPEED = 320; // px/s
const PLAYER_LIVES_INITIAL = 3;
const PLAYER_INVULNERABLE_MS = 1200;

// Disparo
const BULLET_SPEED_PLAYER = 520; // px/s, hacia arriba
const BULLET_SPEED_ENEMY = 260; // px/s, hacia abajo
const BULLET_COOLDOWN_MS = 260;
const BULLET_RADIUS = 3;

// Formación (3 tiers, filas/columnas y puntuación propias)
const FORMATION_LAYOUT: Record<
  EnemyTier,
  { rows: number; cols: number; rowYs: number[] }
> = {
  comandante: { rows: 1, cols: 4, rowYs: [90] },
  acosador: { rows: 2, cols: 6, rowYs: [130, 170] },
  explorador: { rows: 2, cols: 8, rowYs: [210, 250] },
};
const TIER_POINTS: Record<EnemyTier, { formation: number; dive: number }> = {
  comandante: { formation: 150, dive: 300 },
  acosador: { formation: 80, dive: 160 },
  explorador: { formation: 50, dive: 100 },
};

// Entrada en cascada
const ENTRY_DURATION_MS = 1100;
const ENTRY_STAGGER_MS = 60;

// Balanceo en formación
const SWAY_AMPLITUDE_PX = 14;
const SWAY_PERIOD_MS = 2600;

// Picada (primer balance; se retoca en SPEC 03)
const DIVE_INTERVAL_BASE_MS = 2800;
const DIVE_INTERVAL_MIN_MS = 900;
const DIVE_INTERVAL_STEP_PER_LEVEL_MS = 150;
const DIVE_SQUAD_MIN = 1;
const DIVE_SQUAD_MAX = 2;

// Oleadas
const WAVE_CLEAR_DELAY_MS = 1200;
const WAVE_CLEAR_BONUS_PER_LEVEL = 1000;
```

No se introduce ninguna estructura de persistencia en este spec: `lib/scores.ts` no se toca ni se invoca todavía (eso ocurre en SPEC 02, cuando el componente esté conectado a una página real).

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` sigue arrancando sin errores); como el componente todavía no está importado por ningún registro ni página, "funcional" aquí significa que el archivo compila y pasa `lint`/`build`, no que sea jugable desde el navegador —eso llega en SPEC 02.

1. Crear `components/games/escuadron-estelar-game.tsx` con `"use client"`, las constantes de módulo listadas arriba y los tipos `Vec2`/`EnemyTier`/`EnemyState`/`GameState`/`Curve`. Sin lógica de React todavía.
2. Escribir la función pura `quadraticBezier(p0, p1, p2, t)` y las tres funciones que construyen curvas (`buildEntryCurve(targetSlot, index)`, `buildDiveCurve(from, playerX)`, `buildReturnCurve(from, targetSlot)`), cada una devolviendo un `Curve` con un punto de control intermedio desplazado lateralmente dentro de un rango acotado para que la trayectoria no sea una línea recta.
3. Escribir `buildFormationSlots(level)`: para cada tier de `FORMATION_LAYOUT`, calcula las posiciones ancla `{x, y}` centradas en el ancho lógico `W`, devolviendo un arreglo plano de `{ tier, slot }` para toda la oleada.
4. Definir la clase `Enemy` (campos: `tier`, `state`, `pos`, `slot`, `curve`, `curveT`, `hasFiredDuringDive`, `dead`) con `update(dt)` (interpola `curve` según `curveT` mientras está en `"entering"`/`"diving"`/`"returning"`, o aplica el balanceo senoidal sobre `slot` mientras está en `"formation"`) y `draw(ctx)` (una forma simple —triángulo o rombo— coloreada según `tier`).
5. Definir la clase `Bullet` (campos: `pos`, `vy`, `owner: "player" | "enemy"`, `dead`) con `update(dt)` (traslada en Y según `vy`) y `draw(ctx)` (rectángulo delgado, color según `owner`).
6. Definir la clase `PlayerShip` (campos: `x`, `invulnerableMs`, `cooldownMs`) con `update(dt, moveDir)` (aplica `PLAYER_SPEED * moveDir * dt`, clamp horizontal, decrementa `invulnerableMs`/`cooldownMs`) y `draw(ctx)` (triángulo, parpadeante si `invulnerableMs > 0`).
7. Dentro de un único `useEffect([])`: narrowing explícito de refs (container/canvas/ctx), `ResizeObserver` con caché de tamaño en píxeles reales (`devicePixelRatio`) idéntico al de `asteroids-game.tsx`, y `ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0)` al inicio de `draw()`.
8. Agregar dentro del mismo efecto los listeners de teclado sobre `window`: un mapa `keys` para `ArrowLeft`/`ArrowRight` (estado mantenido), y un `justPressed`/`pressed(code)` para `Space` (disparo edge-triggered); `preventDefault` vía un `GAME_KEYS` set. Limpiados en el cleanup.
9. Portar `initWave(level)`: llama a `buildFormationSlots(level)`, crea un `Enemy` por cada slot en estado `"entering"` con `buildEntryCurve(slot, index)` y un retraso `ENTRY_STAGGER_MS * index` antes de empezar a interpolar su curva, y calcula el `diveTimerMs` inicial de la oleada (`max(DIVE_INTERVAL_MIN_MS, DIVE_INTERVAL_BASE_MS - (level - 1) * DIVE_INTERVAL_STEP_PER_LEVEL_MS)`).
10. Portar `update(dt)`: avanza `PlayerShip` según `keys`, procesa disparo del jugador (`pressed("Space")` + `cooldownMs <= 0` → nuevo `Bullet` `owner: "player"`), avanza cada `Enemy.update(dt)` y cada `Bullet.update(dt)`, dispara `Bullet` `owner: "enemy"` cuando una nave en `"diving"` cruza la franja intermedia de Y (una sola vez por picada, vía `hasFiredDuringDive`), resuelve colisiones bala-jugador↔enemigo (círculo/rect simple) sumando `TIER_POINTS[tier][state === "diving" ? "dive" : "formation"]` y colisiones jugador↔bala-enemiga/nave-en-picada (resta vida, `invulnerableMs`, recentra jugador), decrementa `diveTimerMs` y, al llegar a `0`, selecciona entre `DIVE_SQUAD_MIN` y `DIVE_SQUAD_MAX` naves en `"formation"` al azar, las pasa a `"diving"` con `buildDiveCurve(pos, playerShip.x)`, y reinicia el temporizador. Al vaciarse el arreglo de enemigos, inicia el temporizador `WAVE_CLEAR_DELAY_MS` y, al expirar, suma el bonus de oleada, incrementa `level` y llama de nuevo a `initWave(level)`.
11. Portar `draw()`: fondo negro, cada `Enemy.draw(ctx)`, cada `Bullet.draw(ctx)`, `PlayerShip.draw(ctx)` — sin HUD ni overlays (SPEC 03).
12. Agregar `reportChanges()` que compara `score`/`lives`/`level`/`gameState` contra los valores del frame anterior y llama a `callbacksRef.current.onStatsChange({...})`/`onGameOver(score)` solo cuando cambian, mismo patrón que `asteroids-game.tsx`.
13. Exponer `restart`/`forceGameOver` vía `useImperativeHandle` sobre un `ref` tipado `ArcadeGameHandle`, con la indirección por `actionsRef` (`restart` reinicia `level`/`lives`/`score`/enemigos/balas y llama `initWave(1)`; `forceGameOver` fuerza `gameState = "gameover"` directamente).
14. Agregar la prop `paused`: mismo patrón `pausedRef`/`resetTimeRef` que `asteroids-game.tsx` — el loop sigue dibujando pero no avanza curvas, temporizadores de picada/disparo ni colisiones mientras está en pausa.
15. Cerrar el `useEffect` con las cuatro limpiezas obligatorias: `cancelAnimationFrame`, `resizeObserver.disconnect()`, y la remoción de los listeners `keydown`/`keyup`.
16. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint, para confirmar que el componente nuevo compila de forma aislada aunque todavía no esté importado por ningún registro.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores, incluyendo el nuevo archivo `components/games/escuadron-estelar-game.tsx` aunque todavía no esté importado por ningún registro.
- [ ] `npm run lint` no reporta errores sobre el nuevo archivo.
- [ ] El componente exporta un `ForwardRefExoticComponent` cuyas props extienden `ArcadeGameProps` y cuya ref expone exactamente `restart`/`forceGameOver` con la forma `ArcadeGameHandle`, ambos reutilizados tal cual desde `components/games/registry.ts` (revisión de código).
- [ ] El `useEffect` principal tiene dependencias `[]` y su función de retorno cancela el `requestAnimationFrame`, desconecta el `ResizeObserver` y remueve los listeners `keydown`/`keyup` (revisión de código).
- [ ] `buildEntryCurve`/`buildDiveCurve`/`buildReturnCurve` comparten la misma función `quadraticBezier` y no duplican la lógica de interpolación (revisión de código).
- [ ] Ninguna nave enemiga queda nunca en un estado distinto de los cinco de `EnemyState`; una nave destruida se elimina del arreglo activo en el mismo frame en que colisiona con una bala del jugador (revisión de código/trazas de consola añadidas temporalmente durante el desarrollo).
- [ ] Al vaciarse el arreglo de enemigos activos, se dispara exactamente una vez el bonus de oleada y el incremento de `level`, nunca una vez por cada enemigo restante (revisión de código).
- [ ] `restart()` reinicia `level` a `1`, `lives` a `PLAYER_LIVES_INITIAL`, `score` a `0`, y vacía/reconstruye el arreglo de enemigos y balas (revisión de código).

## Decisiones tomadas y descartadas

- **Diseño propio, sin código de referencia en `references/started-games/`.** Razón: el juego dado no tiene una fuente vanilla en este repo (a diferencia de `tetris`/`arkanoid`, que sí la tienen); se sigue el patrón de `snake` (SPEC 09), "diseño desde cero", documentando la receta de `port-recipe.md` igual que si hubiera un original que portar.
- **Tres tiers de naves (`comandante`/`acosador`/`explorador`) en vez de un solo tipo de enemigo genérico.** Razón: el enunciado pide "oleadas de naves enemigas" con patrones de vuelo; una jerarquía de 3 tiers con puntuación distinta da variedad visual y de puntuación sin requerir sprites nuevos (se diferencian por forma/color dibujados en canvas), y es coherente con el género que el juego dado describe.
- **Las naves en picada salen de pantalla por abajo y vuelven a entrar desde abajo, en vez de hacer un bucle de regreso dentro de la pantalla visible.** Razón: simplifica la curva de picada a dos tramos reutilizables (`buildDiveCurve`/`buildReturnCurve`, ambos evaluados con la misma `quadraticBezier`) en vez de una única curva de ida-y-vuelta más compleja, manteniendo el riesgo "bajo" documentado para este juego; el efecto visual percibido (la nave ataca y luego reaparece) es equivalente.
- **Las naves en picada disparan un único proyectil recto hacia abajo (sin homing) al cruzar una franja intermedia de pantalla.** Razón: añade amenaza real a la picada más allá del contacto directo (que es difícil de lograr si el jugador solo se mueve en 1 eje y puede esquivar lateralmente), sin introducir balas que persigan al jugador, lo que elevaría el riesgo de la curva de picada más allá de lo "bajo" documentado.
- **Puntuación doble por derribar una nave en picada frente a derribarla en formación (`TIER_POINTS[tier].dive = TIER_POINTS[tier].formation * 2`).** Razón: recompensa el riesgo de disparar a un blanco en movimiento rápido e impredecible frente a uno estático en formación, un patrón de diseño estándar en este género de shooter de formación.
- **Sin mecánica de "captura" de la nave del jugador.** Razón: añadiría un estado adicional de juego (nave capturada/rescate) que no está en la descripción del juego dado y elevaría el riesgo documentado de "bajo" a "medio"; se descarta explícitamente para mantener el alcance ajustado al enunciado.
- **Sin power-ups ni disparo múltiple.** Razón: el enunciado especifica "disparo fijo"; cualquier variación de arma es una ampliación de alcance no solicitada.
- **El juego es infinito por oleadas crecientes (no tiene una pantalla de "victoria").** Razón: mismo criterio que `asteroides` (campo de asteroides infinito) — el fin de la partida siempre es por pérdida de las 3 vidas, no por completar un número fijo de niveles.
- **Controles solo con flechas + `Espacio`, sin WASD.** Razón: consistente con `asteroides`/`tetris`/`arkanoid`/`snake`, que tampoco ofrecen un esquema alterno de teclado.

## Riesgos identificados

| Riesgo                                                                                                                                                                       | Mitigación                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las curvas de entrada/picada/retorno son la parte no trivial documentada del riesgo de este juego: un error en `quadraticBezier` o en los puntos de control puede producir trayectorias que atraviesan el borde de pantalla o se congelan a mitad de curva. | Las tres curvas comparten una única función pura `quadraticBezier`, testeada visualmente para los tres casos antes de integrarlas al loop; `curveT` se clampa siempre a `[0, 1]` y la transición de estado solo ocurre cuando `curveT === 1`. |
| Con hasta ~30 naves activas por oleada (4 + 12 + 16) más balas de jugador y enemigo, el loop podría acumular trabajo por frame si cada entidad reasigna arreglos o recalcula estructuras en cada `update()`. | Los arreglos de enemigos/balas se mutan in-place (filtrado de `dead` una vez por frame, no reasignación por entidad); ninguna entidad crea objetos nuevos dentro de su propio `update()`/`draw()`. |
| React Strict Mode duplica montajes de efectos en desarrollo, pudiendo duplicar listeners de teclado o loops de `requestAnimationFrame`.                                      | El `useEffect` principal limpia explícitamente (`cancelAnimationFrame`, `removeEventListener`) en su función de retorno, mismo patrón ya probado en `asteroids-game.tsx`/`arkanoid-game.tsx`.    |
| `ResizeObserver` disparando redimensionados muy frecuentes podría causar parpadeo o costo de CPU.                                                                            | Redimensionar `canvas.width`/`height` solo cuando el tamaño en píxeles reales cambió respecto al valor cacheado anterior, igual que en `asteroides`/`tetris`/`arkanoid`/`snake`.                 |
| El temporizador de picada podría, por mala suerte del sorteo, seleccionar siempre las mismas naves o dejar la formación visualmente "vacía" de un lado si varias picadas consecutivas salen del mismo sector. | Aceptado como parte del primer balance de este spec; el ajuste fino de la selección (por ejemplo, evitar repetir el mismo sector dos veces seguidas) queda para el balance de SPEC 03 si se nota desbalanceado en la verificación manual. |
