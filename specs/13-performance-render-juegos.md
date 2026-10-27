# 13 — Performance de render en los juegos del catálogo

**Estado:** Aprobado
**Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
**Fecha:** 2026-10-27

**Objetivo:** Eliminar los patrones de render que generan caídas de FPS en los 5 juegos de `components/games/` (frogger, asteroides, tetris, arkanoid, snake) — `devicePixelRatio` sin tope en el resize del canvas, `ctx.shadowBlur` reconfigurado por cada forma dibujada, y reasignación de arrays por frame en asteroids — sin cambiar el resultado visual ni la jugabilidad de ninguno.

## Alcance

**Incluido:**

- Un helper compartido `components/games/canvas.ts` que centraliza el resize del canvas a su contenedor: mismo cálculo que hoy (`getBoundingClientRect` × DPR), pero con un tope de DPR (`Math.min(window.devicePixelRatio || 1, 2)`) para que una pantalla de densidad 3 no triplique el área real de píxeles a rasterizar en cada frame.
- Migrar los 5 juegos (`frogger-game.tsx`, `asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx`, `snake-game.tsx`) para usar ese helper en vez de su copia local de `resizeCanvasToContainer`.
- En cada juego, revisar los puntos donde `ctx.shadowBlur`/`ctx.shadowColor` se reconfiguran dentro de un loop que dibuja varias formas del mismo color (ej. `drawFrogShape` en frogger llamado hasta 9 veces por frame: rana + vidas + metas ocupadas) y agrupar esas asignaciones para que el shadow se configure una sola vez por color compartido en vez de por forma individual, preservando el `ctx.save()`/`ctx.restore()` donde haga falta para no filtrar el shadow a otros elementos.
- En frogger específicamente, memoizar el resultado de `zoneThemeFor(skin)` una sola vez por `draw()` (hoy se reconstruye el objeto de paleta 3 veces por frame: en `drawZones`, `drawGoals` y `drawEntities`) y pasarlo como parámetro en vez de recalcularlo.
- En `asteroids-game.tsx`, reemplazar el patrón `arr = arr.filter((x) => !x.dead)` (aplicado cada frame a `particles`, `bullets`, `asteroids`, `powerUps`) por una limpieza in-place (recorrido inverso con `splice`, o swap-pop) que no asigne un array nuevo cada frame — más notorio cuando una explosión genera muchas partículas de golpe.
- Verificación final en Chrome DevTools (pestaña Performance): grabar un perfil de ~10s jugando cada uno de los 5 juegos (en frogger y asteroids, forzando el escenario más cargado: skin `neon` con varias metas ocupadas en frogger, una explosión grande en asteroids) y confirmar que no hay caídas sostenidas por debajo de ~55-60fps ni picos de GC visibles asociados a los arrays de asteroids.

**No incluido (fuera de alcance de este spec):**

- Cambiar el aspecto visual de cualquier skin (`clasico`/`neon`/`retro`) — el glow (`shadowBlur`) se preserva exacto, solo se optimiza cómo se aplica, no su valor ni su efecto final.
- Cambiar reglas de juego, puntuación, velocidades, colisiones o cualquier comportamiento funcional de los 5 juegos.
- Tocar `components/games/skins.ts` (paletas) salvo que el refactor de shadowBlur lo requiera sin cambiar ningún valor de paleta.
- Añadir un contador de FPS visible en el HUD de producción — la medición de esta spec es manual, vía DevTools, no queda instrumentación permanente en el juego.
- Optimizaciones de red/Supabase, de la skill `mobile-porter` o de controles táctiles — este spec es exclusivamente sobre el loop de render/update de canvas.
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

No se introduce persistencia ni estructuras nuevas en Supabase. El único artefacto nuevo es el módulo `components/games/canvas.ts`, que exporta una función (p. ej. `setupResponsiveCanvas(container, canvas, onResize?)`) sin estado persistente — encapsula lo que hoy vive duplicado dentro de cada `useEffect` de juego.

## Plan de implementación

Cada paso deja el proyecto funcional (`npm run dev` arranca sin errores).

1. Crear `components/games/canvas.ts` con una función que reciba el contenedor y el canvas, calcule el tamaño en píxeles con el DPR topado en 2, aplique `canvas.width`/`canvas.height` solo cuando cambian, registre el `ResizeObserver` y devuelva una función de limpieza (`disconnect`) — mismo contrato que el bloque que hoy se repite en los 5 juegos.
2. Migrar `frogger-game.tsx` para usar ese helper, eliminando su copia local de `resizeCanvasToContainer`/`pixelWidth`/`pixelHeight`.
3. Migrar `asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx` y `snake-game.tsx` al mismo helper, en ese orden, verificando tras cada archivo que el juego sigue renderizando a tamaño correcto.
4. En frogger: ajustar `draw()` para calcular `zoneThemeFor(skin)` una sola vez y pasarlo a `drawZones`/`drawGoals`/`drawEntities`; agrupar las llamadas a `drawFrogShape` (rana, vidas, metas ocupadas) que comparten color para configurar `shadowBlur`/`shadowColor` una vez por grupo en vez de una vez por ícono.
5. Revisar `asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx` y `snake-game.tsx` en busca del mismo patrón (shadowBlur reconfigurado dentro de un loop de dibujo de varias formas del mismo color) y aplicar el mismo criterio de agrupar, solo donde exista sin cambiar el resultado pixel a pixel.
6. En `asteroids-game.tsx`, sustituir las 4 reasignaciones por frame (`particles`, `bullets`, `asteroids`, `powerUps`) de `.filter(...)` por limpieza in-place (recorrido de atrás hacia adelante con `splice` al encontrar `.dead`), conservando el orden relevante para el resto de la lógica de update/draw.
7. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error antes de continuar.
8. Verificar en Chrome: jugar cada uno de los 5 juegos, confirmando visualmente que no cambió nada (mismas sombras, mismos colores, mismo comportamiento), y grabar un perfil de Performance en frogger (skin neon, varias metas ocupadas) y en asteroids (explosión grande) para confirmar ausencia de caídas sostenidas de FPS.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `components/games/canvas.ts` existe y los 5 juegos lo usan; ninguno conserva su copia local de `resizeCanvasToContainer`.
- [ ] El DPR efectivo usado para dimensionar el canvas nunca supera 2, incluso en una pantalla reportando `devicePixelRatio` mayor.
- [ ] En frogger, `zoneThemeFor(skin)` se invoca una sola vez por `draw()`, no tres.
- [ ] Jugando cada uno de los 5 juegos en Chrome con las 3 skins, el resultado visual (colores, glow, nitidez) es indistinguible del comportamiento previo a este spec.
- [ ] En `asteroids-game.tsx`, ninguno de los arrays `particles`/`bullets`/`asteroids`/`powerUps` se reasigna por frame vía `.filter(...)`; la eliminación de elementos muertos es in-place.
- [ ] Un perfil de Chrome DevTools Performance de ~10s en frogger (skin neon, varias metas ocupadas) no muestra caídas sostenidas por debajo de ~55-60fps.
- [ ] Un perfil de Chrome DevTools Performance de ~10s en asteroids durante una explosión grande no muestra caídas sostenidas por debajo de ~55-60fps ni picos de GC asociados a los arrays migrados.
- [ ] El comportamiento funcional de los 5 juegos (reglas, puntuación, colisiones, velocidades) es idéntico al previo a este spec.

## Decisiones tomadas y descartadas

- **El helper de resize compartido vive en `components/games/canvas.ts`, no en `lib/`.** Razón: decisión explícita del usuario; `lib/` en este proyecto está reservado para Supabase/storage (`lib/games.ts`, `lib/scores.ts`, `lib/storage.ts`), mientras que `components/games/skins.ts` ya es el precedente de infraestructura compartida entre los componentes de juego — este helper sigue ese mismo patrón.
- **Alcance ampliado a los 5 juegos en una sola spec, en vez de limitarlo a frogger.** Razón: decisión explícita del usuario — el patrón de `shadowBlur` por frame y DPR sin tope es idéntico y duplicado en los 5 archivos; corregirlo de una sola vez evita que el próximo juego repita el mismo bug.
- **Se incluye el fix de reasignación de arrays por frame en `asteroids-game.tsx`.** Razón: decisión explícita del usuario — aunque es un patrón distinto (generación de basura/GC, no `shadowBlur`), es el otro causante concreto de caídas de FPS identificado en el código y comparte la misma spec de "performance de render" en vez de abrir una spec aparte.
- **El glow (`shadowBlur`) se preserva exacto; no se reduce ni se quita en ningún elemento.** Razón: decisión explícita del usuario — la optimización es sobre cómo se aplica el shadow (agrupado vs. por forma), nunca sobre el valor ni el resultado visual final.
- **Tope de DPR fijado en 2, no en 1.** Razón: 1 sacrificaría nitidez visible en pantallas retina/alta densidad; 2 ya captura la mayoría del beneficio de nitidez con una cuarta parte de los píxeles que un DPR de 3-4, sin cambiar el aspecto visual percibido.
- **No se agrega un contador de FPS permanente en el HUD.** Razón: decisión explícita del usuario — la medición es puntual con Chrome DevTools al cerrar la spec, no instrumentación de producción.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                             | Mitigación                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topar el DPR en 2 podría verse levemente menos nítido en pantallas de densidad 3+ (algunos móviles de gama alta).                                                                                                  | Pérdida de nitidez marginal frente al beneficio de performance; se verifica visualmente en el paso 8 que no es perceptible a la distancia normal de juego.                                               |
| Agrupar las llamadas a `shadowBlur`/`shadowColor` podría filtrar el shadow a una forma que no debería tenerlo si el agrupamiento no respeta `save`/`restore`.                                                      | Revisar cada grupo con `ctx.save()`/`ctx.restore()` alrededor, y comparar visualmente cada juego/skin antes y después del cambio (paso 8) antes de cerrar el spec.                                       |
| Cambiar la limpieza de arrays en asteroids de `.filter()` a `splice` in-place podría alterar el orden de iteración y afectar lógica que dependa de él (ej. colisiones que recorren el array mientras se modifica). | Recorrer de atrás hacia adelante al hacer `splice` (patrón estándar para evitar saltarse índices) y verificar manualmente que colisiones, explosiones y power-ups siguen funcionando igual en el paso 8. |
