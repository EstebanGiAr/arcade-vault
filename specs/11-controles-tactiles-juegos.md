# 11 — Controles táctiles para los 4 juegos reales en dispositivos móviles

**Estado:** Aprobado
**Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09, SPEC 10
**Fecha:** 2026-10-26

**Objetivo:** Agregar un control táctil tipo arcade (D-pad de 4 direcciones + 2 botones de acción "A"/"B"), visual y estructuralmente idéntico en los 4 juegos reales, ubicado como una fila fija debajo del canvas, y reorganizar el HUD del reproductor en móvil (stats arriba, acciones PAUSA/FIN/SALIR al pie de pantalla) — todo visible solo en dispositivos táctiles, sin afectar el reproductor de escritorio/laptop.

## Alcance

**Incluido:**

- Nuevo componente cliente `components/games/touch-controls.tsx`, que exporta `TouchControls({ gameId }: { gameId: string })`. Renderiza **siempre el mismo control físico** para los 4 juegos: un D-pad de 4 direcciones (arriba/abajo/izquierda/derecha, en cruz, con el mismo estilo visual de referencia que la imagen aportada por el usuario — brazos tipo cápsula redondeada) y 2 botones de acción redondos "A"/"B" a la derecha, imitando un control de arcade genérico. Internamente define una constante de módulo `TOUCH_CONTROLS: Record<string, TouchDirectionsConfig>` que, por juego, asigna a cada una de las 6 posiciones fijas (`up`, `down`, `left`, `right`, `a`, `b`) o bien un mapeo de tecla, o bien `null` cuando ese juego no usa esa posición (ver modelo de datos). Si `gameId` no tiene entrada (juego decorativo sin registro), el componente retorna `null`.
- Las 6 posiciones se renderizan **siempre**, estén o no asignadas a una tecla en ese juego — por decisión explícita del usuario, el control debe verse igual (mismo tamaño, misma disposición) en los 4 juegos, aunque algunas posiciones queden inertes (ej. `arkanoid`/`snake` no usan los botones "A"/"B"; `asteroides` no usa `down`; `arkanoid` no usa `up`/`down`). Una posición inerte (mapeo `null`) no dispara ningún evento al tocarla, pero no lleva ningún estilo distinto (sin opacidad reducida ni `disabled` visual) — se ve exactamente igual que una posición activa.
- Cada posición activa dispara eventos de teclado sintéticos (`window.dispatchEvent(new KeyboardEvent("keydown"/"keyup", { code, key, bubbles: true }))`) en vez de llamar directamente a lógica interna de cada juego. Esto reutiliza sin cambios los listeners de `window`/`e.code`/`e.key` que **ya existen** en `asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx` y `snake-game.tsx` — **ninguno de los 4 componentes de juego ni `components/games/registry.ts` se modifican** en este spec.
- Dos familias de comportamiento por posición activa, según cómo cada juego lee ese código de tecla (campo `repeat` en el mapeo):
  - **Estado continuo** (`repeat: false`, default): el juego lee un flag booleano por frame (ej. `keys["ArrowLeft"]` en `asteroides-game.tsx`/`arkanoid-game.tsx`). El control dispara un solo `keydown` en `touchstart` y un `keyup` en `touchend`/`touchcancel`, replicando "tecla mantenida".
  - **Acción de flanco repetible** (`repeat: true`): el juego ejecuta la acción una vez por cada `keydown` recibido (ej. `current.x--` directo en el `case "ArrowLeft"` de `tetris-game.tsx`, o el patrón `pressed("Space")`/`justPressed` de `asteroids-game.tsx`). El control dispara un `keydown` inmediato en `touchstart` y luego repite el mismo `keydown` cada `TOUCH_REPEAT_INTERVAL_MS` (80ms) tras un retraso inicial `TOUCH_REPEAT_DELAY_MS` (300ms), hasta `touchend`/`touchcancel`, donde se limpia el temporizador y se dispara `keyup`.
- Asignación por juego (ver modelo de datos para la tabla completa): `asteroides` usa `left`/`right` (girar), `up` (impulso) y `a` (disparar); `tetris` usa las 4 direcciones (`up` = rotar) más `a` (caída rápida); `arkanoid` usa solo `left`/`right` (paleta); `snake` usa las 4 direcciones. `down` en asteroides, `up`/`down` en arkanoid, y `b` en los 4 juegos quedan `null` (inertes) en esta primera versión — ningún juego actual necesita un segundo botón de acción.
- `components/game-player.tsx` renderiza `<TouchControls gameId={game.id} />` dentro de `.av-player`, **debajo del bloque `.crt`** (después de `.crt-bottom`, antes del modal de fin de juego) — nunca superpuesto al canvas — y solo cuando `entry` existe (los juegos decorativos sin componente real no reciben controles táctiles, ya que no tienen listeners de teclado que reutilizar).
- Nuevas clases en `app/arcade-vault.css`: `.touch-controls` (contenedor fila, `display: none` por defecto), `.touch-dpad` (cruz de 4 brazos capsulados, vacío en el centro, estilo de referencia de la imagen aportada), `.touch-actions` (los 2 botones "A"/"B" redondos) y `.touch-btn`/`.touch-btn-round` (reutilizando la paleta de `.btn` ya existente — tono neón translúcido sobre fondo oscuro —, con `touch-action: none` para evitar scroll/zoom accidental al tocar). La visibilidad se controla **solo con CSS**, sin detección en JavaScript: `@media (pointer: coarse) { .touch-controls { display: flex; } }`. En un dispositivo con mouse/trackpad fino (`pointer: fine`) el bloque permanece oculto aunque esté montado en el DOM.
- Ajuste del breakpoint móvil existente (`@media (max-width: 720px)` en `app/arcade-vault.css`, bloque de `.av-player`) para hacer espacio vertical a la nueva fila de controles: se reduce el `maxWidth`/altura máxima del `.crt-screen` específicamente bajo `@media (max-width: 720px) and (pointer: coarse)` (de `min(70dvh, 760px)` a `min(52dvh, 620px)`, dejando el resto de la altura de viewport para el HUD superior y la fila de controles), y se reduce el padding/gap de `.player-hud` y `.hud-actions` en ese mismo breakpoint si es necesario para que todo el conjunto (HUD + canvas + controles táctiles) quepa sin scroll vertical en viewports típicos de celular (ej. 390×844, 412×915).
- Verificación en Chrome usando el emulador de dispositivo móvil de DevTools (que reporta `pointer: coarse`) para los 4 juegos reales, simulando toques con clics sobre los botones virtuales.
- Reorganización del HUD (`.player-hud` en `components/game-player.tsx`) **solo en móvil** (misma condición combinada que el resto de este spec: `max-width: 720px` y `pointer: coarse`): el HUD superior se queda únicamente con la información (Jugador/Puntuación/Vidas/Nivel/selector de skin); los 3 botones de acción (PAUSA, FIN, SALIR) se ocultan de su posición actual dentro de `.hud-actions` y se replican en una barra nueva (`.mobile-footer-actions`) al final de todo el reproductor, debajo del control táctil (D-pad/"A"/"B"), en flujo normal del documento (no `position: fixed`). En escritorio/laptop (`pointer: fine`, o `pointer: coarse` con viewport ≥ 720px) el HUD y sus 3 botones quedan exactamente como están hoy, sin cambios.
- Para evitar duplicar lógica de `onClick`, los 3 botones existentes dentro de `.hud-actions` (PAUSA/FIN/SALIR) permanecen en el JSX tal cual están hoy, y se agrega un segundo bloque JSX con los mismos 3 botones (mismos `onClick`) dentro de `.mobile-footer-actions`; la visibilidad de cada bloque se decide **solo con CSS** (mismo patrón que `.touch-controls`): `.hud-actions .hud-buttons` se oculta y `.mobile-footer-actions` se muestra bajo `@media (max-width: 720px) and (pointer: coarse)`, y viceversa por defecto. Esto implica envolver los 3 botones actuales de `.hud-actions` en un nuevo contenedor `.hud-buttons` (el selector de skin queda fuera de ese contenedor, para poder ocultar solo los botones sin ocultar el selector).
- `.mobile-footer-actions` se renderiza siempre (no depende de `entry`), igual que `.hud-actions` hoy — los juegos decorativos sin registro también tienen PAUSA/FIN/SALIR funcionales y deben conservarlos en móvil.

**No incluido (fuera de alcance de este spec):**

- Gestos de swipe o arrastre sobre el canvas — decisión explícita del usuario de usar únicamente botones virtuales, incluyendo para `arkanoid` (que ya soporta `mousemove` para la paleta, pero ese comportamiento no se extiende a `touchmove`).
- Overlay flotante sobre el canvas — decisión explícita del usuario de que los controles vayan en una fila fija debajo del canvas; la imagen de referencia aportada se usa solo como guía del estilo visual del D-pad/botones, no de su ubicación.
- Layouts de control distintos por juego (ej. más de 2 botones de acción en algún juego futuro) — el molde fijo de este spec es D-pad de 4 direcciones + 2 botones "A"/"B", sin excepciones.
- Cambios al comportamiento de teclado existente en los 4 juegos — los listeners actuales no se tocan; los botones táctiles solo agregan una segunda fuente de los mismos eventos sintéticos.
- Diseño responsivo de pantallas fuera del reproductor (`/juegos`, `/`, `/salon-de-la-fama`, `/about`, `/login`) — ya cubiertas o fuera de alcance en specs previos.
- Soporte a dispositivos con `pointer: coarse` pero pantalla muy pequeña en landscape, orientación forzada, o un aviso de "gira tu dispositivo" — no se pide en este spec.
- Vibración háptica (`navigator.vibrate`) al tocar los botones.
- Tests automatizados (el proyecto no tiene suite configurada).
- Anti-cheat o cambios a la policy de `scores` — no se reabre aquí (ya decidido en SPEC 04/06).

## Modelo de datos

No se introduce persistencia nueva. Solo un tipo y una constante de configuración en memoria, locales al nuevo componente:

```ts
// components/games/touch-controls.tsx
type TouchKeyMap = {
  code: string; // KeyboardEvent.code a disparar
  key: string; // KeyboardEvent.key a disparar (arkanoid lee e.key, no e.code)
  repeat?: boolean; // true = repetir keydown mientras se mantiene presionado
} | null; // null = posición inerte: se renderiza igual, pero no dispara nada al tocarla

type TouchDirectionsConfig = {
  up: TouchKeyMap;
  down: TouchKeyMap;
  left: TouchKeyMap;
  right: TouchKeyMap;
  a: TouchKeyMap;
  b: TouchKeyMap;
};

const TOUCH_REPEAT_DELAY_MS = 300;
const TOUCH_REPEAT_INTERVAL_MS = 80;

const TOUCH_CONTROLS: Record<string, TouchDirectionsConfig> = {
  asteroides: {
    up: { code: "ArrowUp", key: "ArrowUp" },
    down: null,
    left: { code: "ArrowLeft", key: "ArrowLeft" },
    right: { code: "ArrowRight", key: "ArrowRight" },
    a: { code: "Space", key: " ", repeat: true },
    b: null,
  },
  tetris: {
    up: { code: "ArrowUp", key: "ArrowUp" },
    down: { code: "ArrowDown", key: "ArrowDown", repeat: true },
    left: { code: "ArrowLeft", key: "ArrowLeft", repeat: true },
    right: { code: "ArrowRight", key: "ArrowRight", repeat: true },
    a: { code: "Space", key: " " },
    b: null,
  },
  arkanoid: {
    up: null,
    down: null,
    left: { code: "ArrowLeft", key: "ArrowLeft" },
    right: { code: "ArrowRight", key: "ArrowRight" },
    a: null,
    b: null,
  },
  snake: {
    up: { code: "ArrowUp", key: "ArrowUp" },
    down: { code: "ArrowDown", key: "ArrowDown" },
    left: { code: "ArrowLeft", key: "ArrowLeft" },
    right: { code: "ArrowRight", key: "ArrowRight" },
    a: null,
    b: null,
  },
};
```

El D-pad siempre tiene sus 4 brazos (`up`/`down`/`left`/`right`) y siempre hay 2 botones redondos "A"/"B" a la derecha, iguales en los 4 juegos; lo único que cambia por juego es cuáles de esas 6 posiciones llevan un `TouchKeyMap` real y cuáles quedan en `null`. `repeat` decide, por posición activa, cuál de las dos familias de comportamiento aplica (ver Alcance): `asteroides.up/left/right`, `arkanoid.left/right` y las 4 direcciones de `snake` quedan en `repeat: false` (estado continuo mantenido); `asteroides.a` y `tetris.down/left/right` quedan en `repeat: true` (acción de flanco repetible); `tetris.up` (rotar) y `tetris.a` (caída rápida) quedan en `repeat: false` deliberadamente — ver Decisiones.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. Crear `components/games/touch-controls.tsx` con los tipos `TouchKeyMap`/`TouchDirectionsConfig`, la constante `TOUCH_CONTROLS` completa (tabla de arriba) y una función interna `dispatchKey(type: "keydown" | "keyup", code: string, key: string)` que hace `window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }))`.
2. Implementar el componente `TouchControls({ gameId })`: busca `TOUCH_CONTROLS[gameId]`, retorna `null` si no existe, y si existe renderiza siempre las 6 posiciones fijas dentro de `.touch-controls` con dos grupos (`.touch-dpad` con los 4 brazos en cruz, `.touch-actions` con los 2 botones redondos "A"/"B"), usando `onTouchStart`/`onTouchEnd`/`onTouchCancel` por posición (con `e.preventDefault()` en `onTouchStart` para evitar el `click` sintético y el scroll/zoom del navegador). Si el mapeo de esa posición es `null`, los handlers no hacen nada (no hay `dispatchKey`), pero el botón se renderiza con el mismo marcado/clases que uno activo.
3. Dentro de cada handler de posición activa: en `onTouchStart`, disparar `dispatchKey("keydown", ...)` inmediatamente; si `repeat` es `true`, programar un `setTimeout` a `TOUCH_REPEAT_DELAY_MS` que arranca un `setInterval` cada `TOUCH_REPEAT_INTERVAL_MS` repitiendo el mismo `keydown`, guardando los ids en un `useRef<Record<string, number>>({})` para poder limpiarlos. En `onTouchEnd`/`onTouchCancel`: limpiar cualquier timeout/interval pendiente para esa posición y disparar `dispatchKey("keyup", ...)`.
4. Agregar las clases `.touch-controls`, `.touch-dpad`, `.touch-actions` y `.touch-btn`/`.touch-btn-round` en `app/arcade-vault.css`, con el estilo visual de referencia de la imagen aportada (cruz de brazos capsulados para el D-pad, dos círculos para "A"/"B"), reusando la paleta neón/translúcida de `.btn` ya existente (sin inventar una paleta de color nueva), con `.touch-controls { display: none; ... }` y la regla `@media (pointer: coarse) { .touch-controls { display: flex; } }`.
5. En `components/game-player.tsx`, importar `TouchControls` y renderizar `{entry && <TouchControls gameId={game.id} />}` justo después del `<div className="crt">...</div>` (debajo del canvas, nunca superpuesto) y antes del bloque `{over && (...)}` del modal.
6. Probar en Chrome DevTools con el emulador de dispositivo (ej. "iPhone 13", que reporta `pointer: coarse`) en `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar`: confirmar que aparece el control completo (D-pad + "A"/"B") debajo del canvas en los 4 juegos con el mismo tamaño/disposición, que cada posición activa mueve/dispara/rota igual que su tecla equivalente, que las posiciones inertes de cada juego (ej. `down` en asteroides, `up`/`down`/"A"/"B" en arkanoid) no producen ningún efecto al tocarlas, y que mantener presionada una posición con `repeat: true` repite la acción mientras que soltar detiene la repetición.
7. Con el emulador de dispositivo **apagado** (pointer fino de escritorio), confirmar que `.touch-controls` no es visible en ninguno de los 4 juegos y que el teclado sigue funcionando exactamente igual que antes de este spec.
8. En `components/game-player.tsx`, envolver los 3 botones existentes (PAUSA, FIN, SALIR) dentro de `.hud-actions` en un nuevo `<div className="hud-buttons">` (el `skin-picker` queda fuera, como hermano de ese div). Agregar, al final del árbol del reproductor (después de `<TouchControls gameId={game.id} />` y antes del modal `{over && (...)}`), un segundo bloque `<div className="mobile-footer-actions">` con los mismos 3 botones y los mismos `onClick` ya existentes (`() => setPaused((p) => !p)`, `endGame`, `() => router.push(\`/juegos/${game.id}\`)`), sin condicionar su renderizado a `entry`.
9. Agregar en `app/arcade-vault.css` las clases `.hud-buttons` (sin estilos nuevos relevantes, solo de agrupación) y `.mobile-footer-actions` (`display: none` por defecto, fila de botones al pie del reproductor), con las reglas `@media (max-width: 720px) and (pointer: coarse) { .hud-buttons { display: none; } .mobile-footer-actions { display: flex; } }`.
10. Ajustar en `app/arcade-vault.css`, dentro de `@media (max-width: 720px) and (pointer: coarse)`, el `maxWidth`/altura máxima de `.crt-screen` (de `min(70dvh, 760px)` a `min(52dvh, 620px)`) y el padding/gap de `.player-hud` si hace falta, hasta que en el emulador de un viewport típico de celular (390×844 o 412×915) el conjunto completo (HUD simplificado + canvas + fila de controles táctiles + barra de acciones al pie) sea visible sin scroll vertical, para los 4 juegos reales.
11. Probar en el emulador de dispositivo móvil: confirmar que en los 4 juegos el HUD superior solo muestra stats + selector de skin (sin PAUSA/FIN/SALIR), que la nueva barra al pie de pantalla tiene PAUSA/FIN/SALIR funcionales (pausar/reanudar, terminar partida, salir al detalle del juego), y que con el emulador apagado el HUD superior vuelve a mostrar sus 3 botones como hoy y la barra al pie no aparece.
12. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] Con el emulador de dispositivo de Chrome DevTools activo (`pointer: coarse`), los 4 juegos (`asteroides`, `tetris`, `arkanoid`, `snake`) muestran, debajo del canvas, el mismo control (D-pad de 4 direcciones + 2 botones redondos "A"/"B"), con el mismo tamaño y disposición en los 4 casos.
- [ ] En `asteroides`, el D-pad gira la nave con izquierda/derecha y aplica impulso con arriba; tocar y mantener "A" dispara más de un proyectil mientras el dedo permanece sobre el botón; tocar `down` del D-pad o "B" no produce ningún efecto.
- [ ] En `tetris`, el D-pad mueve la pieza con izquierda/derecha, hace caída suave con abajo y rota con arriba; mantener presionado izquierda/derecha/abajo mueve/baja la pieza repetidamente mientras el dedo permanece apoyado; tocar arriba (rotar) o "A" (caída rápida) una sola vez ejecuta esa acción una sola vez, sin repetirla aunque el dedo quede apoyado; tocar "B" no produce ningún efecto.
- [ ] En `arkanoid`, el D-pad mueve la paleta con izquierda/derecha de forma continua igual que mantener la tecla de flecha; tocar arriba, abajo, "A" o "B" no produce ningún efecto.
- [ ] En `snake`, las 4 direcciones del D-pad cambian la dirección de la serpiente igual que el teclado (incluyendo que tocar la dirección opuesta a la actual se ignora); tocar "A" o "B" no produce ningún efecto.
- [ ] Con el emulador de dispositivo **apagado** (pointer fino), ninguno de los 4 juegos muestra el control táctil.
- [ ] Con el emulador apagado, el control por teclado (flechas, Espacio, X) sigue funcionando exactamente igual que antes de este spec en los 4 juegos.
- [ ] En un viewport de celular emulado (390×844 o 412×915) con `pointer: coarse`, el HUD superior, el canvas y la fila de controles táctiles son visibles simultáneamente en los 4 juegos reales, sin necesidad de hacer scroll vertical.
- [ ] El canvas de cada juego mantiene su proporción exacta (4:3 o 1:2 según corresponda) también bajo el nuevo tamaño máximo reducido del breakpoint móvil.
- [ ] `read_console_messages` no muestra errores al tocar los controles virtuales durante una partida completa de cada uno de los 4 juegos.
- [ ] Los 4 archivos de juego (`asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx`, `snake-game.tsx`) y `components/games/registry.ts` no tienen cambios de código (diff vacío), ya que los controles táctiles se integran solo disparando los mismos eventos de teclado que ya escuchan.
- [ ] Con el emulador de dispositivo activo y viewport ≤ 720px, el HUD superior de los 4 juegos reales muestra únicamente Jugador/Puntuación/Vidas/Nivel/selector de skin, sin los botones PAUSA/FIN/SALIR en esa posición.
- [ ] En esa misma condición, aparece una barra de acciones al pie de pantalla (debajo del control táctil) con PAUSA, FIN y SALIR; tocar cada uno produce exactamente el mismo efecto que el botón equivalente del HUD de escritorio (pausar/reanudar la partida, forzar fin de partida con el modal correspondiente, volver a `/juegos/<id>`).
- [ ] Con el emulador apagado (pointer fino) o con viewport > 720px, el HUD superior vuelve a mostrar sus 3 botones (PAUSA/FIN/SALIR) como antes de este spec, y la barra al pie de pantalla no es visible.
- [ ] Esta reorganización del HUD también se ve en el juego decorativo (catálogo sin componente real, si existe alguno) — la barra al pie de pantalla no depende de que el juego tenga `entry` en el registro.

## Decisiones tomadas y descartadas

- **Botones virtuales en vez de gestos de swipe, para los 4 juegos.** Razón: decisión explícita del usuario — más predecibles y descubribles que un gesto, y evitan el riesgo de falsos positivos al interpretar un swipe.
- **`arkanoid` usa botones izquierda/derecha en vez de traducir `touchmove` a la lógica de `mousemove` ya existente.** Razón: decisión explícita del usuario — prioriza consistencia visual/de interacción con los otros 3 juegos por sobre la precisión ligeramente mayor de seguir el dedo directamente; el `mousemove` existente no se modifica ni se extiende a eventos táctiles.
- **Control unificado (D-pad de 4 direcciones + 2 botones "A"/"B") igual en los 4 juegos, en vez de un set de botones distinto por juego.** Razón: decisión explícita del usuario, inspirada en la imagen de referencia aportada — que los controles "parezcan controles de arcade" reales, con un molde fijo y reconocible, en vez de una fila de botones con etiquetas de texto distintas por juego.
- **Fila fija debajo del canvas, no overlay flotante sobre el canvas.** Razón: decisión explícita del usuario tras ver la imagen de referencia — la imagen se toma como guía del estilo visual (D-pad capsulado, botones redondos), no de su ubicación; los controles no deben tapar el área de juego.
- **Las posiciones inertes (sin tecla asignada en ese juego) se renderizan igual que las activas, sin ningún estilo distinto (sin atenuar ni deshabilitar visualmente).** Razón: decisión explícita del usuario — mantener el control visualmente idéntico en los 4 juegos es más importante que señalar cuáles botones "no hacen nada" en cada uno; el jugador simplemente no obtiene respuesta al tocar una posición inerte.
- **Solo 2 botones de acción ("A"/"B"), ninguno usado dos veces en el mismo juego por ahora.** Razón: decisión explícita del usuario — la mayoría de los juegos arcade clásicos no necesitan más de 2 botones de acción; de los 4 juegos actuales, ninguno usa "B" (`asteroides`/`tetris` solo necesitan "A"), lo que deja margen para un juego futuro que si lo requiera.
- **Eventos de teclado sintéticos (`window.dispatchEvent(new KeyboardEvent(...))`) en vez de tocar cada componente de juego o ampliar `ArcadeGameHandle`.** Razón: los 4 juegos ya escuchan `keydown`/`keyup` en `window` leyendo `e.code` (3 de 4) o `e.key` (`arkanoid`); redisparar esos mismos eventos permite agregar controles táctiles con cero cambios en los componentes de juego y sin ampliar el contrato del registro, reduciendo drásticamente el riesgo de regresión en la lógica ya probada de cada juego.
- **Visibilidad controlada solo por CSS (`@media (pointer: coarse)`) en vez de detección en JavaScript (`matchMedia` + estado de React).** Razón: evita cualquier riesgo de mismatch de hidratación (el componente siempre renderiza el mismo HTML en servidor y cliente) y es más simple; el costo de montar los botones ocultos en dispositivos de escritorio es despreciable.
- **Dos familias de comportamiento por botón (`repeat: false`/`true`) en vez de un solo patrón universal.** Razón: cada juego ya decidió, antes de este spec, si una tecla se lee como estado continuo por frame o como acción puntual por cada `keydown` recibido; replicar fielmente "mantener presionado" requiere imitar ese mismo patrón (mantener el flag vs. repetir el disparo del evento), si no el control táctil se sentiría distinto al de teclado.
- **`tetris.ArrowUp` (rotar) y `tetris.Space` (caída rápida) quedan en `repeat: false` pese a ser acciones de flanco.** Razón: decisión de UX para evitar un efecto confuso si el dedo queda apoyado por accidente — rotar repetidamente sería errático, y una caída rápida repetida terminaría dejando caer instantáneamente varias piezas futuras apenas aparecen. El resto de las acciones de flanco (movimiento horizontal/caída suave de tetris, disparo de asteroides) sí se benefician de repetirse mientras se mantiene presionado.
- **Ajustar el breakpoint móvil existente en vez de dejarlo intacto y aceptar scroll.** Razón: decisión explícita del usuario — agregar una fila de controles sin garantizar que el conjunto completo quepa en pantalla sería una regresión a medias; se reutiliza el mismo patrón de `min(Xdvh, Ypx)` ya establecido en SPEC 10, solo con valores más chicos y acotado a `pointer: coarse` para no afectar el breakpoint de escritorio/laptop angosto.
- **Sin vibración háptica ni cambios de orientación forzada.** Razón: no fue solicitado; se mantiene el alcance acotado a que los juegos sean jugables por touch.
- **Sin anti-cheat ni cambios a la policy de `scores`.** Razón: decisión ya tomada en SPEC 04/06, no se reabre aquí.
- **PAUSA/FIN/SALIR se mueven a una barra al pie de pantalla en móvil, mientras que el resto del HUD (stats + selector de skin) se queda arriba.** Razón: decisión explícita del usuario — libera el máximo espacio vertical posible en el HUD superior (que es el que compite por espacio con el canvas y los controles nuevos), y ubica las acciones de partida donde el pulgar las alcanza fácilmente durante el juego.
- **Barra nueva al final de todo el reproductor (debajo del D-pad/"A"/"B"), no reutilizar `.crt-bottom`.** Razón: decisión explícita del usuario — `.crt-bottom` es parte de la decoración del propio "televisor" CRT (señal/carga), no un lugar natural para acciones interactivas; una barra propia al final del flujo es más clara y no mezcla ambos propósitos.
- **Los 3 botones se duplican en JSX (uno dentro de `.hud-actions`, otro en `.mobile-footer-actions`) y la visibilidad se decide solo con CSS, en vez de mover el mismo bloque de un lado a otro con JavaScript según el tamaño de pantalla.** Razón: mismo criterio que la visibilidad de `.touch-controls` (ver decisión de arriba) — evita cualquier riesgo de mismatch de hidratación y lógica condicional en JS; el costo de montar un bloque de botones oculto de más es despreciable.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Si `touchstart` no llama `preventDefault()`, el navegador puede disparar además un evento `click` sintético y/o hacer scroll/zoom de la página al tocar un botón.                                            | Cada botón llama `e.preventDefault()` en `onTouchStart`, y las clases `.touch-btn`/`.touch-controls` fijan `touch-action: none`.                                                                                                        |
| Dos dedos tocando dos posiciones de `repeat: true` a la vez (ej. mover izquierda y caída suave en tetris) podrían pisarse si se usa una sola variable de temporizador en vez de un diccionario por posición. | Los ids de `setTimeout`/`setInterval` se guardan en un `useRef<Record<string, number>>` indexado por posición (`up`/`down`/`left`/`right`/`a`/`b`), nunca una sola variable compartida.                                                 |
| Un `touchend` que no llega a dispararse (ej. el usuario arrastra el dedo fuera del botón sin levantarlo) podría dejar una tecla "trabada" en estado presionado.                                              | Se escucha también `onTouchCancel` con la misma limpieza que `onTouchEnd`; es el patrón estándar recomendado para evitar estados de tecla huérfanos en controles táctiles.                                                              |
| El emulador de dispositivo de Chrome DevTools no es un dispositivo táctil real; el comportamiento exacto de `touch-action`/scroll podría diferir levemente en un teléfono físico.                            | Aceptado como limitación de la verificación disponible en este flujo; el criterio de aceptación se verifica con el emulador, consistente con cómo se verificaron los specs anteriores sin acceso a hardware físico.                     |
| Reducir el `maxWidth` del `.crt-screen` en el nuevo breakpoint podría dejar el canvas visualmente muy pequeño en pantallas de celular muy angostas (< 360px de ancho).                                       | Aceptado: el objetivo de este spec es que el conjunto quepa sin scroll, no maximizar el tamaño del canvas; un ajuste fino de legibilidad en pantallas extremadamente chicas queda para un spec futuro si se reporta como problema real. |
