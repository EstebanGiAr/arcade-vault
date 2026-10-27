# Performance de render por juego

Mantenido por el subagente `game-performance-booster`. Un juego por invocación.
Catálogo de antipatrones de referencia: `specs/13-performance-render-juegos.md`.

## Auditados

| Juego   | ID        | Fecha      | Antipatrones encontrados                                                                                    | Corregidos                                                     | FPS medio / mín (escenario)                                                      |
| ------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Frogger | `frogger` | 2026-10-27 | Antipatrón #4 (objeto derivado `ZoneTheme` reconstruido cada frame en `zoneThemeFor`, aunque ya invocado 1x/frame desde SPEC 13); el resto de antipatrones (1, 2, 3, 5-9) ausentes, sin regresión. | 1 de 1 (cache de `ZoneTheme` por `SkinId`)                      | Antes: 142.4 / 69.9 fps · Después: 142.3 / 24.0\* fps (gameplay normal, skin neon, ~10s, monitor ~144Hz). \*outlier puntual no sostenido (p5 idéntico: 137.0 fps en ambas corridas). |

## Sin auditar todavía

| Juego      | ID           | Notas                                                                                                                                                                                                      |
| ---------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asteroides | `asteroides` | Ya recibió los tres fixes de SPEC 13 (DPR topado, shadow agrupado, `removeDead` in-place sobre `particles`/`bullets`/`asteroids`/`powerUps`). Una auditoría aquí sirve para confirmar ausencia de regresión, no para volver a encontrar los mismos antipatrones. |
| Tetris     | `tetris`     | Mismo caso: ya pasó por SPEC 13 (DPR topado, shadow agrupado). Auditoría pendiente = chequeo de no regresión.                                                                                              |
| Arkanoid   | `arkanoid`   | Mismo caso: ya pasó por SPEC 13 (DPR topado, shadow agrupado, cache offscreen `tintCacheRef` ya existente). Auditoría pendiente = chequeo de no regresión.                                                 |
| Snake      | `snake`      | Mismo caso: ya pasó por SPEC 13 (DPR topado, shadow de segmentos agrupado). Auditoría pendiente = chequeo de no regresión.                                                                                 |

## Notas por juego

### Frogger (2026-10-27)

- Lectura previa confirmada contra el código actual (no asumida ciega): `setupResponsiveCanvas` ya en uso, shadow ya agrupado en `drawGoals`/`drawHud` (lives) con `ctx.save()`/`ctx.restore()`, `zoneThemeFor(skin)` ya hoisteado a una sola invocación por `draw()` desde SPEC 13. Sin reasignación de arrays por frame (`lanes`/`entities` se mutan in-place en `moveLanes`; `goals` solo se reinicia en `completeRound()`/`initGame()`, no por frame). Sin `createLinearGradient`/`createPattern`/`new Image`/`drawImage` ni `measureText` en el archivo. `skin` nunca en deps del `useEffect` principal (se lee vía `skinRef.current`). `cancelAnimationFrame` presente en el cleanup.
- Único hallazgo: antipatrón #4 (objeto derivado reconstruido por frame). `zoneThemeFor` seguía creando un objeto literal `ZoneTheme` nuevo en cada `draw()` aunque ya se invocaba una sola vez (el fix de SPEC 13 resolvió la cantidad de invocaciones, no la reasignación del objeto en sí).
- Fix aplicado: `zoneThemeFor` ahora consulta un `Map<GameSkin["id"], ZoneTheme>` (`zoneThemeCache`) declarado una sola vez en el closure del `useEffect` principal (mismo ciclo de vida que el resto del estado del juego, sin necesidad de `useRef` porque el closure ya vive una sola vez por montaje) y delega la construcción real a `buildZoneTheme(skinId)`, invocada solo la primera vez que se ve cada `SkinId`. Ningún valor de paleta cambió; `clasico`/`neon`/`retro` producen exactamente los mismos hex que antes.
- Medición de FPS (script temporal de `requestAnimationFrame`, retirado al terminar, gameplay activo con entidades moviéndose, skin neon, ~10s cada corrida, en un monitor de ~144Hz): baseline (pre-fix, vía `git stash`) 142.4 fps medio / 69.9 fps mínimo / 137.0 fps percentil 5 / 0% frames >16.7ms; post-fix 142.3 fps medio / 24.0 fps mínimo (outlier puntual aislado, no sostenido) / 137.0 fps percentil 5 (idéntico) / 0.2% frames >16.7ms. Conclusión: el fix no introduce regresión, y su beneficio de performance es marginal (como se esperaba: el objeto `ZoneTheme` son ~8 campos string sin cómputo costoso, muy distinto del caso `tintCacheRef` de arkanoid que sí evita un re-tinte de bitmap). Se implementó de todos modos por ser de bajo riesgo, cero impacto visual y alineado con el patrón de cache-por-`SkinId` ya establecido en el repo.
- Verificación visual en Chrome: las tres skins (`clasico`, `neon`, `retro`) se revisaron en `/juegos/frogger/jugar`, confirmando que colores de carretera/río/césped/metas, glow y comportamiento son indistinguibles del estado previo al fix.
- Pendiente: ninguno. No se encontraron otros antipatrones ni se identificó necesidad de abrir una spec nueva.
