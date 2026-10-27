# 03 — ESCUADRÓN ESTELAR: pulido audiovisual y balance de dificultad

**Estado:** Borrador
**Depende de:** 02-integracion-plataforma.md (este mismo dossier)
**Fecha:** 2026-10-27

**Objetivo:** Agregar el HUD interno en canvas, los overlays de inicio de oleada y fin de juego, un fondo estelar con scroll y efectos de partículas al destruir naves, y cerrar el balance final de las tablas de dificultad por nivel, sin tocar el contrato del registry ni el flujo de guardado ya cerrado en SPEC 02.

## Alcance

**Incluido:**

- HUD interno dibujado dentro del `<canvas>` (mismo patrón que `drawHUD()` en `asteroids-game.tsx`): `SCORE <valor>` arriba a la izquierda, `VIDAS <valor>` arriba a la derecha, `NIVEL <valor>` centrado arriba — mismo estilo tipográfico (`monospace`, mayúsculas) que `asteroides`. Este HUD interno es puramente visual/decorativo respecto al HUD externo de React (que ya muestra los mismos tres valores desde SPEC 02): ambos se actualizan desde el mismo punto del loop, nunca quedan como fuentes de verdad independientes.
- Fondo estelar con scroll vertical continuo (un arreglo fijo de puntos `{x, y, speed, radius}` que se regeneran arriba al salir por abajo), para dar sensación de movimiento sin requerir ningún asset nuevo — pura primitiva de canvas (`fillRect`/`arc`), ambientación consistente con el fondo oscuro ya usado en `asteroides`.
- Sistema de partículas ligero (`Particle`: `pos`, `vel`, `life`, `dead`) que se dispara en una explosión corta al destruir una nave enemiga o al perder una vida el jugador; cantidad acotada por explosión (`PARTICLES_PER_EXPLOSION`) y un tope global de partículas vivas simultáneas (`MAX_PARTICLES`) para no degradar el framerate con varias picadas y derribos simultáneos.
- Banner de transición "OLEADA `<nivel>`" dibujado en el centro del canvas durante `WAVE_BANNER_MS` al iniciar cada nueva oleada (incluida la primera), mismo estilo tipográfico grande que el "GAME OVER"/"3, 2, 1" de `asteroides`.
- Overlay "GAME OVER" en canvas (texto grande centrado + subtítulo con la puntuación final) cuando `gameState === "gameover"`, mismo patrón visual que el overlay equivalente de `asteroides`/`arkanoid`/`snake`, mostrado en paralelo al modal "FIN DEL JUEGO" de React (que ya se abre desde SPEC 02 vía `onGameOver`).
- Parpadeo breve de pantalla completa (un rectángulo semitransparente rojo sobre todo el canvas durante unos pocos frames) al perder una vida, para reforzar visualmente el impacto además del parpadeo de la propia nave ya implementado en SPEC 01.
- Balance final de las tablas de dificultad introducidas como primer borrador en SPEC 01 (`DIVE_INTERVAL_BASE_MS`, `DIVE_INTERVAL_STEP_PER_LEVEL_MS`, `DIVE_SQUAD_MAX`, velocidad de balas enemigas): se ajustan los valores numéricos tras jugar varias oleadas, documentando la tabla final de progresión por nivel (ver modelo de datos) — sin cambiar la lógica ni los estados ya cerrados en SPEC 01.
- Ajuste fino de `ENTRY_STAGGER_MS` y del rango de desplazamiento lateral del punto de control de `buildEntryCurve` para que la entrada en cascada de las 3 tiers se vea como oleadas diferenciadas (primero `comandante`, luego `acosador`, luego `explorador`) en vez de una masa simultánea.

**No incluido (fuera de alcance de este spec):**

- Audio — no hay ningún asset de sonido disponible en `references/source-assets/` para este juego, y el dossier prohíbe generar binarios nuevos; se deja constancia explícita de que esta es la razón, no un descuido.
- Cualquier cambio al registry, a la fila de `games`, a la portada CSS o al flujo de guardado de puntuación — todo eso ya quedó cerrado en SPEC 02.
- Controles táctiles, anti-cheat o tests automatizados.
- Cualquier mecánica nueva de juego (power-ups, captura, armas) — sigue fuera de alcance, como ya se decidió en SPEC 01.
- Rediseño visual de cualquier pantalla existente del sitio más allá del propio canvas de este juego.

## Modelo de datos

```ts
// components/games/escuadron-estelar-game.tsx — tipos/constantes nuevos de este spec
type Particle = {
  pos: Vec2;
  vel: Vec2;
  lifeMs: number;
  maxLifeMs: number;
  color: string;
  dead: boolean;
};

type Star = { pos: Vec2; speed: number; radius: number };
```

```ts
// Partículas
const PARTICLES_PER_EXPLOSION = 14;
const MAX_PARTICLES = 220;
const PARTICLE_LIFE_MS = 420;

// Fondo estelar
const STAR_COUNT = 70;
const STAR_SPEED_MIN = 20; // px/s
const STAR_SPEED_MAX = 90; // px/s

// Banners y overlays
const WAVE_BANNER_MS = 1100;
const HIT_FLASH_MS = 120;
```

Tabla final de dificultad por nivel (reemplaza los valores de borrador fijados en SPEC 01; `level` arranca en `1`):

| Nivel | `diveIntervalMs` (base, antes de los sorteos aleatorios) | Naves por picada simultánea | Velocidad bala enemiga (px/s) |
| ----- | --------------------------------------------------------- | ---------------------------- | ------------------------------- |
| 1     | 2800                                                       | 1                             | 240                              |
| 2     | 2500                                                       | 1–2                           | 260                              |
| 3     | 2200                                                       | 1–2                           | 280                              |
| 4     | 1900                                                       | 1–2                           | 300                              |
| 5+    | `max(900, 2800 - (nivel-1) * 150)`                         | 1–2 (tope fijo)               | `min(340, 240 + (nivel-1) * 15)` |

No se introducen estructuras de persistencia nuevas en este spec.

## Plan de implementación

Cada paso deja el proyecto en estado funcional y jugable (`/juegos/escuadron-estelar/jugar` sigue funcionando entre pasos, ya que el componente está integrado desde SPEC 02).

1. Agregar la clase `Particle` y la función `spawnExplosion(pos, color)` (crea `PARTICLES_PER_EXPLOSION` partículas con velocidad radial aleatoria, respetando el tope `MAX_PARTICLES` descartando las más antiguas si se excede), invocada desde el punto del loop donde ya se resuelve la colisión bala-enemigo y la colisión jugador-impacto (ambas ya existentes desde SPEC 01).
2. Agregar el tipo `Star` y una inicialización de `STAR_COUNT` estrellas en posiciones aleatorias; en `update(dt)`, cada estrella se traslada hacia abajo según su `speed` y se regenera arriba (`y = 0`, nueva `x` aleatoria) al salir por `H`.
3. Dibujar el fondo estelar al inicio de `draw()` (antes de las naves/balas existentes), y las partículas vivas justo después de las entidades de juego (para que se vean "sobre" la acción, no debajo).
4. Agregar `drawHUD(ctx)` (SCORE/VIDAS/NIVEL en canvas, mismo estilo que `asteroides`) invocado al final de `draw()`, en paralelo al `onStatsChange` externo ya conectado desde SPEC 02 (ambos leen las mismas variables `score`/`lives`/`level` del closure, nunca se desincronizan por diseño).
5. Agregar el banner "OLEADA `<nivel>`" controlado por un temporizador (`waveBannerMs`) que se activa al llamar `initWave(level)` (incluida la primera llamada desde `restart()`/montaje inicial) y se dibuja centrado mientras `waveBannerMs > 0`, decrementando con `dt` igual que cualquier otro temporizador del loop.
6. Agregar el overlay "GAME OVER" (texto grande + puntuación final) dibujado cuando `gameState === "gameover"`, mismo patrón visual que `asteroides`/`arkanoid`/`snake`.
7. Agregar el parpadeo de pantalla completa (`hitFlashMs`) que se activa en el mismo punto donde ya se resta una vida (SPEC 01) y se dibuja como un rectángulo semitransparente rojo sobre todo el canvas mientras `hitFlashMs > 0`.
8. Reemplazar los valores de borrador de `DIVE_INTERVAL_BASE_MS`/`DIVE_INTERVAL_STEP_PER_LEVEL_MS`/`DIVE_SQUAD_MAX`/velocidad de bala enemiga por la tabla final de dificultad (ver modelo de datos), parametrizando el cálculo por `level` en vez de usar un único valor base fijo.
9. Ajustar `ENTRY_STAGGER_MS` y el rango de desplazamiento lateral del punto de control de `buildEntryCurve` para que las 3 tiers entren visualmente diferenciadas (jugando varias oleadas y ajustando a ojo, sin cambiar la lógica de estados).
10. Jugar varias partidas completas en `/juegos/escuadron-estelar/jugar` verificando: el HUD interno coincide siempre con el HUD externo, el banner de oleada aparece al iniciar cada nivel, las explosiones de partículas se ven al derribar naves y al perder una vida, el parpadeo de pantalla se ve al perder una vida, y la dificultad escala de forma perceptible entre el nivel 1 y el nivel 5.
11. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] El HUD interno en canvas (SCORE/VIDAS/NIVEL) y el HUD externo de React muestran siempre los mismos tres valores, en todo momento de una partida completa (verificado jugando en `/juegos/escuadron-estelar/jugar`).
- [ ] Al iniciar cada oleada (incluida la primera al cargar la página) se ve el banner "OLEADA `<nivel>`" durante aproximadamente un segundo.
- [ ] Derribar una nave enemiga produce una explosión de partículas visible en su posición.
- [ ] Perder una vida produce una explosión de partículas en la posición del jugador y un parpadeo breve de pantalla completa.
- [ ] El fondo estelar se ve en movimiento continuo durante toda la partida, incluso durante "PAUSA" el movimiento se congela (igual que el resto del juego) y se reanuda sin saltos al "REANUDAR".
- [ ] Al llegar a `gameState === "gameover"` se ve el overlay "GAME OVER" con la puntuación final dentro del canvas, en paralelo al modal "FIN DEL JUEGO" de React ya existente desde SPEC 02, mostrando ambos la misma puntuación.
- [ ] Jugando hasta el nivel 5, la frecuencia de picadas y la velocidad de las balas enemigas son perceptiblemente mayores que en el nivel 1.
- [ ] `read_console_messages` no muestra errores durante una partida completa, incluida la transición entre varias oleadas.
- [ ] El flujo de PAUSA/FIN/JUGAR DE NUEVO y guardado de puntuación verificado en SPEC 02 sigue funcionando exactamente igual tras agregar el HUD interno, los overlays, las partículas y el fondo estelar.

## Decisiones tomadas y descartadas

- **HUD interno duplicado respecto al HUD externo de React, en vez de depender solo del externo.** Razón: mismo patrón ya establecido por `asteroides` (HUD de canvas + HUD de React) y documentado como riesgo recurrente de "dual-HUD desync" en `game-spec-notes.md`; se mantiene la duplicación por consistencia visual con el resto del catálogo, mitigando el riesgo de desincronización actualizando ambos desde el mismo punto del loop.
- **Sin audio.** Razón: no existe ningún asset de sonido para este juego en `references/source-assets/`, y el dossier prohíbe explícitamente generar binarios nuevos (no hay herramienta disponible para crear un `.mp3`); a diferencia de `arkanoid` (que sí trajo sonido desde su fuente vanilla), aquí no hay fuente de la que portarlo.
- **Sistema de partículas con tope fijo (`MAX_PARTICLES`) en vez de ilimitado.** Razón: con hasta ~30 naves por oleada y picadas simultáneas, varias explosiones a la vez podrían acumular cientos de partículas vivas; un tope fijo evita degradar el framerate sin necesitar perfilado adicional, siguiendo el mismo criterio preventivo de "no reasignar/acumular estructuras sin límite por frame" que `game-performance-booster` auditaría después si no se respetara.
- **Fondo estelar con primitivas de canvas, sin sprite de estrellas.** Razón: mantiene la restricción de "ningún asset binario nuevo" del dossier; un campo de puntos simples (`arc`/`fillRect`) ya transmite la sensación de movimiento sin necesitar una imagen.
- **El balance final de dificultad se cierra en este spec, no en SPEC 01.** Razón: decisión explícita de la propia plantilla de este dossier (ver tabla de specs del agente `game-jam`): SPEC 01 fija un primer balance funcional y SPEC 03 es responsable del ajuste fino tras jugar con el HUD/overlays ya visibles, que es cuando la dificultad percibida se puede evaluar con criterio.
- **El parpadeo de pantalla al perder una vida se agrega como refuerzo visual adicional al parpadeo de la propia nave (ya existente desde SPEC 01), no como su reemplazo.** Razón: la nave sola parpadeando puede no notarse en una pantalla con muchas naves/balas en movimiento; el parpadeo de pantalla completa es una señal más legible del impacto.

## Riesgos identificados

| Riesgo                                                                                                                                                 | Mitigación                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El sistema de partículas y el fondo estelar, sumados a hasta ~30 naves y sus balas, podrían degradar el framerate si cada partícula/estrella reasigna objetos por frame. | Las partículas y estrellas se mutan in-place en sus arreglos (filtrado de `dead` una vez por frame, no reasignación por entidad), y las partículas respetan `MAX_PARTICLES`; si el `game-performance-booster` se invoca después sobre este juego, encontrará el patrón ya aplicado, no antipatrones que corregir. |
| El HUD doble (interno en canvas + externo de React) puede desincronizarse si el dibujo del HUD interno o la llamada a `onStatsChange` no leen exactamente las mismas variables del closure. | `drawHUD(ctx)` y `reportChanges()` leen las mismas variables `score`/`lives`/`level` del mismo closure, sin copias intermedias; se verifica explícitamente en los criterios de aceptación jugando una partida completa. |
| React Strict Mode duplica montajes de efectos en desarrollo, lo que podría duplicar también la inicialización del arreglo de estrellas o del banner de oleada si se inicializan fuera del cuerpo del `useEffect([])` ya existente. | Las estrellas y el banner se inicializan dentro del mismo `useEffect([])` que ya maneja el resto del estado del juego desde SPEC 01, nunca en un efecto o `useState` adicional.                                 |
| `ResizeObserver` disparando redimensionados muy frecuentes podría afectar también el posicionamiento del fondo estelar si sus coordenadas dependieran del tamaño en píxeles reales en vez del sistema lógico 800×600. | Las estrellas (igual que el resto de entidades) viven siempre en coordenadas lógicas 800×600 y se escalan junto con todo lo demás vía el único `ctx.setTransform(...)` al inicio de `draw()`; nunca leen `canvas.width`/`canvas.height` directamente. |
| La policy de `insert` abierta (`with check (true)`) en `scores` sigue permitiendo puntuaciones arbitrarias para `escuadron-estelar`.                      | Aceptado como parte del alcance actual, igual que en SPEC 02; anti-cheat queda para un spec futuro una vez haya Auth real.                                                                                      |
