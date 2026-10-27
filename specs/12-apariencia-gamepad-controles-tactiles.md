# 12 — Apariencia de gamepad para los controles táctiles

**Estado:** Implementada
**Depende de:** SPEC 11
**Fecha:** 2026-10-26

**Objetivo:** Rediseñar visualmente los controles táctiles (`components/games/touch-controls.tsx` + clases `.touch-*` de `app/arcade-vault.css`) introducidos en SPEC 11 para que luzcan como el componente de referencia "Arcade Vault — Gamepad MK-II" (`references/gamepad-assets/`), sin cambiar su comportamiento funcional (teclas disparadas, repetición, posiciones inertes) ni sus dimensiones ya verificadas.

## Alcance

**Incluido:**

- Envolver el D-pad y los botones "A"/"B" en un panel tipo carcasa de gamepad: fondo degradado oscuro, borde con el color de línea de la plataforma, esquinas redondeadas, sombra exterior con resplandor cian, borde interior decorativo y textura sutil de puntos — réplica del contenedor `.gp` de `references/gamepad-assets/gamepad.html`, adaptada a los tokens ya existentes en `app/arcade-vault.css` (`--bg`, `--line`, `--cyan`). El panel sigue siendo parte del flujo normal del documento, fijo debajo del `.crt`, nunca superpuesto al canvas — no reabre la decisión de SPEC 11 de no usar overlay flotante.
- Réplica completa de la fidelidad visual de la referencia:
  - Cada brazo del D-pad (arriba/abajo/izquierda/derecha) muestra un ícono de flecha SVG en vez de un botón vacío, con color por defecto apagado (`--ink-dim`/`--ink-faint`) que pasa a cian con resplandor al presionarse.
  - El centro del D-pad gana un **hub decorativo** (nuevo elemento, no interactivo, `aria-hidden`) con una gema rómbica que pulsa en bucle (animación CSS), igual que `.dp-hub`/`.dp-hub-gem` de la referencia.
  - El botón "A" se pinta en magenta (`--magenta`) y el botón "B" en cian (`--cyan`), ambos con degradado radial, halo de resplandor y un anillo punteado que aparece al presionar — igual en los 4 juegos, estén o no activos en cada uno (posición inerte = mismo estilo, sin atenuar, consistente con la decisión ya tomada en SPEC 11).
  - Efecto de profundidad al presionar: `translateY` + cambio de `box-shadow` tanto en los brazos del D-pad como en "A"/"B", igual que `.dp.on`/`.ab.on` de la referencia.
- El estado "presionado" deja de depender solo de `:active` de CSS: `touch-controls.tsx` aplica y retira una clase (`touch-btn-pressed`) directamente sobre el botón tocado en `onTouchStart`/`onTouchEnd`/`onTouchCancel`, manipulando `classList` vía la referencia del propio elemento (`e.currentTarget`) — sin `useState` ni re-render del componente en cada toque, para no introducir trabajo de React en el camino caliente de interacción (mismo criterio de rendimiento que ya aplican los loops de juego).
- Tamaño del D-pad (132×132px, brazos de 44px) y de los botones "A"/"B" (58px) se mantiene exactamente igual al de SPEC 11 — este spec es un cambio de apariencia, no de layout ni de las dimensiones ya verificadas sin scroll en 390×844/412×915.
- Verificación en Chrome usando el emulador de dispositivo móvil de DevTools (solo al final, como manda el estándar del proyecto), para los 4 juegos reales.

**No incluido (fuera de alcance de este spec):**

- Cualquier cambio de comportamiento: qué tecla dispara cada posición, la lógica de repetición (`repeat`), o qué posiciones quedan inertes por juego — `TOUCH_CONTROLS` en `touch-controls.tsx` no se modifica.
- Cambios en `asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx`, `snake-game.tsx` o `components/games/registry.ts` — siguen sin tocarse, igual que en SPEC 11.
- Cambios al HUD superior, a `.mobile-footer-actions` (PAUSA/FIN/SALIR) o al breakpoint `.crt-screen`/`.player-hud` ya resuelto en SPEC 10/11.
- Crecer el tamaño del D-pad/botones al de la referencia (156×156/50px) — se descarta explícitamente para no arriesgar el ajuste sin scroll ya verificado.
- Vibración háptica, sonido, u otros canales de feedback — solo visual, igual que SPEC 11.
- Skins (`clasico`/`neon`/`retro`) aplicadas al gamepad — los controles táctiles no participan hoy del sistema de skins de `components/games/skins.ts` y este spec no lo introduce.
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

No se introduce persistencia ni estructuras de datos nuevas. Es un cambio puramente visual sobre un componente ya existente; `TouchKeyMap`/`TouchDirectionsConfig`/`TOUCH_CONTROLS` de SPEC 11 no cambian de forma.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. En `components/games/touch-controls.tsx`, agregar los íconos SVG de flecha (arriba/abajo/izquierda/derecha) dentro de cada botón del D-pad, usando `fill="currentColor"` para heredar el color por CSS, con los mismos paths de triángulo de `references/gamepad-assets/gamepad.html` (adaptados si hace falta al tamaño de 44px de SPEC 11).
2. Agregar un `<div className="touch-dpad-hub" aria-hidden="true"><span className="touch-dpad-gem" /></div>` dentro de `.touch-dpad`, centrado entre los 4 brazos, sin handlers de touch.
3. Modificar `handleTouchStart`/`handleTouchEnd` en `touch-controls.tsx` para además agregar/quitar la clase `touch-btn-pressed` sobre `e.currentTarget.classList`, independientemente de si la posición tiene mapeo (`null` o no) — el feedback visual de presionado ocurre siempre, igual que el resto del molde fijo de SPEC 11.
4. Agregar las clases `touch-btn-a` y `touch-btn-b` a los botones redondos existentes (además de `touch-btn`/`touch-btn-round`), para poder diferenciar color por CSS sin tocar la lógica de `data-position`.
5. En `app/arcade-vault.css`, reemplazar la regla base de `.touch-controls` (línea ~1258) por el panel tipo carcasa: fondo con degradado lineal oscuro, `border: 1px solid var(--line)`, `border-radius`, `box-shadow` exterior con resplandor cian, y un `::before`/`::after` para el borde interior decorativo y la textura de puntos — manteniendo `display: none` por defecto y `display: flex` solo bajo `@media (pointer: coarse)`, como ya existe.
6. Ajustar `.touch-dpad .touch-btn` para el color por defecto apagado (`var(--ink-faint)` o similar ya tokenizado) que cambia a cian al presionarse vía `.touch-btn-pressed`, agregando `box-shadow`/`transform: translateY(...)` para el efecto de profundidad, replicando `.dp`/`.dp.on` de la referencia con los tamaños ya fijados en SPEC 11 (44px).
7. Agregar `.touch-dpad-hub`/`.touch-dpad-gem` con la gema rómbica (`clip-path: polygon(...)`, igual que `.dp-hub-gem` de la referencia) y su animación de pulso (`@keyframes`), centrada en el hueco del D-pad.
8. Diferenciar `.touch-btn-a` (magenta: degradado radial, halo, anillo punteado) y `.touch-btn-b` (cian: mismo tratamiento) en `app/arcade-vault.css`, con el estado `.touch-btn-pressed` aplicando el efecto de profundidad + intensificación del halo + aparición del anillo punteado, replicando `.ab`/`.ab.a`/`.ab.b`/`.ab.on` de la referencia.
9. Confirmar que el tamaño final del panel completo (carcasa + D-pad + botones) sigue cabiendo sin scroll vertical en los viewports 390×844 y 412×915 junto al resto del reproductor (HUD superior + canvas + barra de acciones al pie); si el padding de la nueva carcasa lo rompe, reducir el padding del panel (no el tamaño del D-pad/botones) hasta que vuelva a caber.
10. Probar en Chrome DevTools con el emulador de dispositivo, en `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar`: confirmar la apariencia de carcasa, flechas, hub con gema pulsante, colores de A/B, efecto de presionado al tocar cada posición (activa e inerte), y que el comportamiento funcional sigue siendo idéntico al de SPEC 11.
11. Con el emulador apagado, confirmar que `.touch-controls` sigue sin ser visible, igual que antes de este spec.
12. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error antes de cerrar el spec.

## Criterios de aceptación

- [x] `npm run build` termina sin errores.
- [x] `npm run lint` no reporta errores.
- [x] Con el emulador de dispositivo activo, el D-pad y los botones "A"/"B" de los 4 juegos están envueltos en un panel con fondo degradado, borde y sombra con resplandor, visible solo bajo `pointer: coarse`.
- [x] Cada brazo del D-pad (arriba/abajo/izquierda/derecha) muestra un ícono de flecha SVG, en los 4 juegos, con el mismo tamaño/disposición que ya tenían en SPEC 11.
- [x] El centro del D-pad muestra un hub decorativo con una gema que pulsa en bucle, sin reaccionar a toques.
- [x] El botón "A" se ve en magenta y el botón "B" en cian, con halo y anillo punteado al presionar, igual en los 4 juegos, incluidas las posiciones inertes de cada uno (sin atenuar).
- [x] Al tocar (`touchstart`) cualquier posición del D-pad o "A"/"B", se aplica un efecto visual de profundidad (depresión + intensificación de resplandor) que se retira en `touchend`/`touchcancel`, gestionado por una clase aplicada directamente sobre el elemento tocado (sin pasar por `useState`).
- [x] El tamaño del D-pad (132×132px, brazos de 44px) y de los botones redondos (58px) no cambió respecto a SPEC 11.
- [x] El conjunto completo (HUD superior + canvas + panel de controles táctiles + barra de acciones al pie) sigue cabiendo sin scroll vertical en 390×844 y 412×915, en los 4 juegos.
- [x] Con el emulador de dispositivo apagado (`pointer: fine`), `.touch-controls` no es visible, igual que antes de este spec.
- [x] El comportamiento funcional no cambió: `asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx`, `snake-game.tsx` y `components/games/registry.ts` siguen con diff vacío; qué tecla dispara cada posición y cuáles quedan inertes es idéntico a SPEC 11.
- [x] `read_console_messages` no muestra errores al tocar los controles virtuales durante una partida de cada uno de los 4 juegos.

## Decisiones tomadas y descartadas

- **Envolver el D-pad y los botones en una carcasa tipo panel, en vez de dejarlos flotando directo bajo el canvas.** Razón: decisión explícita del usuario para esta spec, priorizando la fidelidad visual a la imagen de referencia sobre la minimalidad del layout de SPEC 11. El panel sigue en flujo normal, fijo debajo del `.crt` — no reabre la decisión de SPEC 11 de no usar overlay flotante sobre el canvas, solo agrega un fondo/borde al bloque que ya existía ahí.
- **Réplica visual completa de la referencia (flechas SVG, hub con gema animada, halos de color, anillo punteado, profundidad al presionar) en vez de una versión simplificada.** Razón: decisión explícita del usuario — prioriza fidelidad visual sobre minimizar superficie de cambio en el CSS.
- **Estado "presionado" gestionado con una clase aplicada directamente al elemento vía `classList` en los handlers de touch, no con `useState` de React.** Razón: decisión explícita del usuario de usar un mecanismo más robusto que `:active` en dispositivos táctiles reales, combinada con el criterio ya establecido en el proyecto de evitar trabajo de React en el camino caliente de interacción (mismo patrón que los `useRef` de SPEC 11 para los temporizadores de repetición).
- **Mantener el tamaño actual del D-pad (132px) y los botones (58px) en vez de crecer a las dimensiones de la referencia (156px/50-74px).** Razón: decisión explícita del usuario — no arriesgar el ajuste sin scroll vertical ya verificado en SPEC 11 para 390×844/412×915; este spec cambia apariencia, no layout.
- **El botón "B" recibe el mismo color distintivo (cian, con halo) que tendría si estuviera activo, pese a quedar inerte en los 4 juegos actuales.** Razón: decisión explícita del usuario, consistente con la decisión ya tomada en SPEC 11 de que las posiciones inertes se ven exactamente igual que las activas, sin atenuar ni deshabilitar visualmente.
- **Reusar los tokens de color ya existentes en `app/arcade-vault.css` (`--cyan`, `--magenta`, `--line`, `--ink-faint`, `--pixel`) en vez de copiar los valores hexadecimales sueltos de `gamepad.html`.** Razón: el prototipo de referencia ya comparte casi uno a uno la paleta de la plataforma (`--cyan: #00f5ff`, `--magenta: #ff006e`, `--pixel: "Press Start 2P"`), así que no hace falta introducir tokens nuevos ni duplicar valores — mantiene la regla general del proyecto de preferir las clases/tokens existentes antes que inventar.
- **No se extiende el sistema de skins (`components/games/skins.ts`) a los controles táctiles en este spec.** Razón: fuera del pedido original; los controles táctiles no leían la skin activa antes de este spec y agregarlo ahora mezclaría dos cambios distintos. Queda disponible como trabajo futuro si se pide explícitamente.

## Riesgos identificados

| Riesgo                                                                                                                                                                    | Mitigación                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El padding/sombra de la nueva carcasa podría romper el ajuste sin scroll vertical ya verificado en SPEC 11 para 390×844/412×915.                                          | Paso 9 del plan: si no cabe, se reduce el padding del panel, nunca el tamaño del D-pad/botones ya fijado; se re-verifica en los mismos dos viewports antes de cerrar el spec.                                                                                                  |
| Manipular `classList` directamente vía `e.currentTarget` en vez de `useState` podría dejar una clase "pegada" si el componente se desmonta a mitad de un toque.           | El mismo patrón de limpieza ya usado en SPEC 11 para los `setTimeout`/`setInterval` (limpieza en `onTouchEnd`/`onTouchCancel`) cubre este caso; no se requiere lógica adicional de desmontaje porque no hay temporizador pendiente de la clase en sí, solo el toggle síncrono. |
| El emulador de dispositivo de Chrome DevTools no es un dispositivo táctil real; el efecto de profundidad al presionar podría verse levemente distinto en hardware físico. | Aceptado como limitación de la verificación disponible, consistente con cómo se verificó SPEC 11.                                                                                                                                                                              |
