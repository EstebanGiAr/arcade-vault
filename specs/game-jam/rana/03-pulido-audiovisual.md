# 03 — RANA: pulido audiovisual y balance fino

**Estado:** Borrador
**Depende de:** `02-integracion-plataforma.md` (este mismo dossier)
**Fecha:** 2026-10-26

**Objetivo:** Añadir la mecánica de sumersión periódica de tortugas, el bonus de tiempo restante al llegar a la meta, retroalimentación visual de muerte/éxito en canvas, y ajustar el balance de dificultad de `rana-game.tsx` sin tocar el registry ni Supabase.

## Alcance

**Incluido:**

- Sumersión periódica de tortugas: un subconjunto de las plataformas de río (las marcadas como `kind: "turtle"`) alternan entre un estado "a flote" (segura) y "sumergida" (letal, igual que no estar sobre ninguna plataforma) siguiendo un ciclo temporizado (`TURTLE_SUBMERGE_CYCLE_MS`, con una fase "a flote" más larga que la fase "sumergida"), con un parpadeo visual (`globalAlpha` reducido) en los últimos ~500ms antes de sumergirse, para dar tiempo de reacción.
- Bonus de tiempo restante al llegar a la meta: `TIME_BONUS_PER_SECOND = 20` puntos por cada segundo restante del temporizador de vida en el momento exacto de ocupar un hueco de meta, sumado además de los `HOME_SLOT_POINTS` ya existentes del spec `01`.
- Efecto de "salpicadura"/"atropello" al perder una vida: una animación corta en canvas (expansión de un círculo semitransparente con `globalAlpha` decreciente durante unos cuantos frames, sin requerir ningún asset) en la posición donde la rana murió, antes de que reaparezca en la fila de salida.
- Efecto de "chapoteo" (ligero cambio de color/brillo) al ocupar un hueco de meta, para reforzar visualmente el éxito.
- Barra de tiempo restante del HUD interno en canvas (ya dibujada desde el spec `01` como parte del panel `SCORE`/`VIDAS`/`NIVEL`) gana un cambio de color (verde → amarillo → rojo) según el porcentaje de tiempo restante, para hacer el apuro más legible.
- Ajuste fino de `BASE_LANE_SPEED` por carril (dentro de carretera y dentro de río) para que no todos los carriles se sientan idénticos: al menos un carril "rápido" y uno "lento" dentro de cada zona, documentado explícitamente en el modelo de datos de este spec.
- Revisión del tope de `speedMultiplier` (`2.5`, fijado en el spec `01`) contra partidas de prueba manuales; si durante la verificación de este spec resulta injugable antes de llegar a ese tope, se documenta el nuevo valor en la sección de Decisiones de este mismo spec (no silenciosamente).

**No incluido (fuera de alcance de este spec):**

- Cualquier cambio al registry, a la fila de Supabase, al cover art o a los callbacks de integración — ya cerrados en el spec `02`.
- Audio — sigue sin haber assets de sonido disponibles para este juego.
- Vidas extra, power-ups, u otras mecánicas no mencionadas en el prompt original ni en los specs `01`/`02`.
- Rediseño visual de cualquier pantalla existente fuera de `rana-game.tsx`.
- Tests automatizados.

## Modelo de datos

```ts
// components/games/rana-game.tsx — nuevas constantes y campos sobre lo ya definido en 01/02
const TURTLE_SUBMERGE_CYCLE_MS = 6000; // ciclo completo: a flote + sumergida
const TURTLE_FLOAT_RATIO = 0.7; // 70% del ciclo a flote, 30% sumergida
const TURTLE_WARNING_MS = 500; // parpadeo antes de sumergirse

const TIME_BONUS_PER_SECOND = 20;

const DEATH_SPLASH_DURATION_MS = 400;
const HOME_SPLASH_DURATION_MS = 300;

// Platform gana un discriminante de tipo (solo relevante para el river)
type PlatformKind = "log" | "turtle";
type Platform = {
  x: number;
  width: number;
  kind: PlatformKind;
  submergedCycleOffsetMs: number; // desfasa el ciclo entre tortugas del mismo carril
};

// BASE_LANE_SPEED ya existía en 01 como tabla plana; este spec documenta valores concretos
const BASE_ROAD_LANE_SPEED = [90, 140, 110, 160, 120]; // px/s, 5 carriles de carretera
const BASE_RIVER_LANE_SPEED = [60, 50, 70, 55, 65]; // px/s, 5 carriles de río

// Efecto visual transitorio, sin persistencia
type SplashEffect = {
  x: number;
  row: number;
  kind: "death" | "home";
  startedAtMs: number;
};
```

No se introducen estructuras de persistencia nuevas ni se toca `saveScore`/`lib/scores.ts`.

## Plan de implementación

1. Agregar el campo `kind: PlatformKind` a las plataformas de río generadas en `initGame()` (mezcla de `"log"` y `"turtle"` por carril, con un desfase `submergedCycleOffsetMs` distinto por tortuga para que no se sumerjan todas a la vez), y las constantes `TURTLE_SUBMERGE_CYCLE_MS`/`TURTLE_FLOAT_RATIO`/`TURTLE_WARNING_MS`.
2. En `update(dt)`: calcular por cada tortuga si está "a flote" o "sumergida" según `(tiempoTranscurrido + submergedCycleOffsetMs) % TURTLE_SUBMERGE_CYCLE_MS`; cuando una tortuga sumergida es la que "porta" a la rana (o la rana cae sobre ella estando sumergida), se trata igual que caer al agua (pérdida de vida), reutilizando la lógica ya existente del spec `01`.
3. En `draw()`: dibujar las tortugas con `globalAlpha` reducido durante los últimos `TURTLE_WARNING_MS` antes de sumergirse, y no dibujarlas (o dibujarlas muy tenues, apenas visibles bajo el agua) mientras están sumergidas.
4. Calcular y sumar `TIME_BONUS_PER_SECOND * segundosRestantes` en el mismo punto donde ya se suma `HOME_SLOT_POINTS` (lógica de meta del spec `01`), incluyendo el total en el mismo `reportChanges()` del spec `02` (ya diffea `score` en general, no requiere cambios ahí).
5. Agregar un arreglo interno `activeSplashes: SplashEffect[]`: se empuja un `SplashEffect` al perder una vida (`kind: "death"`, en la posición de la rana justo antes de reaparecer) y al ocupar un hueco de meta (`kind: "home"`, en la columna del hueco); en `draw()`, cada splash activo se dibuja como un círculo semitransparente con `globalAlpha` decreciente según su antigüedad, y se elimina del arreglo cuando supera `DEATH_SPLASH_DURATION_MS`/`HOME_SPLASH_DURATION_MS`.
6. Cambiar el color de la barra de tiempo del HUD interno (ya existente desde el spec `01`) según el porcentaje de tiempo restante: verde por encima de 50%, amarillo entre 20% y 50%, rojo por debajo de 20%.
7. Ajustar `BASE_ROAD_LANE_SPEED`/`BASE_RIVER_LANE_SPEED` a los valores documentados en el modelo de datos de este spec (reemplazando la tabla genérica del spec `01`), y jugar varias partidas manuales para confirmar que la dificultad escala de forma razonable hasta nivel 4–5 antes de volverse extrema.
8. Si el tope `speedMultiplier` de `2.5` (fijado en el spec `01`) resulta injugable o trivial durante la verificación manual, ajustarlo aquí y documentar el nuevo valor en la sección de Decisiones de este spec con la razón observada.
9. Probar manualmente en `/juegos/rana/jugar`: confirmar que las tortugas se sumergen y emergen de forma visible con el parpadeo de aviso, que caer sobre una tortuga sumergida resta vida igual que caer al agua sin plataforma, que llegar a la meta con tiempo restante alto suma notablemente más puntos que llegar con poco tiempo, que aparece el efecto de salpicadura tanto al perder una vida como al llegar a la meta, y que la barra de tiempo cambia de color según corresponda.
10. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] Las tortugas de los carriles de río alternan visiblemente entre "a flote" y "sumergidas", con un parpadeo de aviso antes de sumergirse.
- [ ] Estar sobre una tortuga en el instante en que se sumerge resta una vida, igual que caer al agua sin ninguna plataforma.
- [ ] Llegar a un hueco de meta con más tiempo restante del temporizador de vida otorga más puntos que llegar con poco tiempo restante, de forma consistente con `TIME_BONUS_PER_SECOND`.
- [ ] Perder una vida muestra un efecto de salpicadura/atropello breve en canvas antes de que la rana reaparezca en la fila de salida.
- [ ] Ocupar un hueco de meta muestra un efecto visual de éxito breve en canvas.
- [ ] La barra de tiempo del HUD interno cambia de color (verde/amarillo/rojo) según el porcentaje de tiempo restante de la vida actual.
- [ ] Los carriles de carretera y de río ya no tienen todos la misma velocidad — al menos uno perceptiblemente más rápido y uno más lento dentro de cada zona.
- [ ] `read_console_messages` no muestra errores durante una partida completa de rana que incluya al menos una sumersión de tortuga y una llegada a la meta.
- [ ] `/juegos/rana/jugar` conserva todo el comportamiento ya verificado en el spec `02` (pausa real, fin de juego, guardado de puntuación, reinicio, HUD externo de React) sin regresiones.

## Decisiones tomadas y descartadas

- **Sumersión de tortugas con ciclo temporizado y desfase por tortuga, en vez de un patrón sincronizado para todas.** Razón: un desfase distinto por tortuga (`submergedCycleOffsetMs`) evita que todas las plataformas de un carril se sumerjan exactamente al mismo tiempo, lo que sería trivialmente injusto (sin ninguna plataforma segura en ese carril durante la fase sumergida); es la misma lógica que el arcade original.
- **Bonus de tiempo lineal (`TIME_BONUS_PER_SECOND * segundosRestantes`) en vez de una tabla de umbrales.** Razón: más simple de calcular y de comunicar visualmente (más tiempo restante = más puntos, sin saltos abruptos entre umbrales); el prompt no especificó el modelo exacto, así que se documenta aquí como hueco rellenado.
- **Efectos visuales puramente de canvas (círculos con `globalAlpha`), sin ningún asset nuevo.** Razón: restricción dura de la skill `game-jam` — no se pueden generar binarios nuevos, y no existe ningún asset de Frogger en `references/source-assets/`; un efecto de partículas simple con primitivas de canvas cubre la necesidad de retroalimentación visual sin violar esa restricción.
- **Ajuste de velocidades por carril documentado como valores concretos en este spec, no delegado a "ajustar durante el playtesting" sin registro.** Razón: evita que el balance final quede sin rastro escrito; si el playtesting manual (paso 7/8 del plan) obliga a cambiar el tope de `speedMultiplier`, ese cambio también se documenta aquí, no se pierde en una sesión de prueba no registrada.
- **Sin audio en los efectos de muerte/éxito.** Razón: misma restricción de assets ya aplicada en los specs `01`/`02` — no hay ningún `.mp3`/`.wav` disponible para este juego en el repo.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                      | Mitigación                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La sumersión de tortugas añade un estado temporal más a la detección de colisión del río, aumentando el riesgo de un falso negativo (la rana muere sobre una tortuga que en realidad estaba a flote).                                                       | El estado "a flote"/"sumergida" se calcula una sola vez por frame dentro de `update(dt)` y se reutiliza tanto para `draw()` como para la detección de colisión, evitando dos cálculos que puedan divergir. |
| Los efectos visuales transitorios (`activeSplashes`) podrían acumularse sin límite si no se limpian correctamente, degradando el rendimiento en partidas largas.                                                                                            | El arreglo se filtra en cada frame eliminando cualquier splash cuya antigüedad supere su duración (`DEATH_SPLASH_DURATION_MS`/`HOME_SPLASH_DURATION_MS`), nunca crece sin cota.                            |
| Ajustar `BASE_ROAD_LANE_SPEED`/`BASE_RIVER_LANE_SPEED` o el tope de `speedMultiplier` podría hacer el juego notablemente más difícil o más fácil que lo verificado en el spec `02`, afectando la percepción de "funciona" de los criterios ya cerrados ahí. | El paso 9 del plan de implementación repite explícitamente la verificación manual completa de pausa/fin/guardado/reinicio además de las nuevas mecánicas, antes de cerrar este spec.                       |
