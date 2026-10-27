# 02 — ESCUADRÓN ESTELAR: integración de plataforma (registry, catálogo y leaderboard)

**Estado:** Borrador
**Depende de:** 01-nucleo-jugable.md (este mismo dossier)
**Fecha:** 2026-10-27

**Objetivo:** Conectar el componente ya construido en SPEC 01 a `GAME_REGISTRY`, describir su fila nueva en la tabla `games` de Supabase y su portada CSS, y verificar de punta a punta el flujo real de PAUSA/FIN/JUGAR DE NUEVO y guardado de puntuación para el juego dado por el usuario como "galaga", rebautizado "ESCUADRÓN ESTELAR" (ver Decisiones).

## Alcance

**Incluido:**

- Nueva entrada `"escuadron-estelar"` en `GAME_REGISTRY` (`components/games/registry.ts`): `component: EscuadronEstelarGame`, `hudStats: ["score", "lives", "level"]` (mismo shape que `asteroides`/`arkanoid`, sin ampliar `HudStatKey`), `initialStats: { score: 0, lives: 3, level: 1 }`, sin `aspectRatio` (usa el `4/3` por defecto de `.crt-screen`, el canvas lógico 800×600 de SPEC 01 ya respeta esa proporción).
- Confirmación explícita de que `components/game-player.tsx` **no se modifica**: desde SPEC 07 ya es genérico vía `GAME_REGISTRY[game.id]`, así que agregar un quinto juego real solo requiere la entrada del registry, nada más.
- Nuevo bloque de CSS `.cover-escuadron` en `app/arcade-vault.css` (diseño nuevo, no un huérfano reutilizado — ver Decisiones), siguiendo el mismo patrón que los bloques `.cover-*` existentes: un fondo degradado, un `::after` con varios `radial-gradient` apilados y `filter: drop-shadow`, y un `::before` opcional con un glifo Unicode.
- Nueva fila en la tabla `games` de Supabase (descrita aquí, **no aplicada** — se aplicaría con `mcp__supabase__apply_migration` solo cuando un humano promueva este dossier): `id: "escuadron-estelar"`, `title: "ESCUADRÓN ESTELAR"`, `cat: "SHOOTER"`, `color: "yellow"`, `cover: "cover-escuadron"`, `short`/`long` propios (ver modelo de datos).
- Verificación de que el flujo "PAUSA"/"REANUDAR" (prop `paused`), "FIN" (`forceGameOver()` + modal de React) y "JUGAR DE NUEVO" (`restart()` + reseteo de `GamePlayer`) funcionan para este juego exactamente igual que para `asteroides`/`arkanoid`, sin ningún caso especial nuevo en `game-player.tsx`.
- Reutilización de `saveScore`/`lib/scores.ts` sin cambios, usando `"escuadron-estelar"` como `gameId`.
- Verificación de que `/salon-de-la-fama` muestra una pestaña nueva para "ESCUADRÓN ESTELAR" junto a las cinco existentes (`asteroides`/`tetris`/`arkanoid`/`frogger`/`snake`), reutilizando `components/hall-of-fame-tabs.tsx` sin cambios (ya es genérico sobre la lista de juegos reales de `getRealGames`).

**No incluido (fuera de alcance de este spec):**

- El bucle de juego, las curvas de vuelo, las colisiones y el modelo de datos interno del componente — todo eso ya quedó cerrado en SPEC 01; aquí solo se conecta.
- El HUD interno en canvas, los overlays de "OLEADA X"/"GAME OVER", los efectos de partículas y el balance final de dificultad — SPEC 03.
- Aplicar de hecho la migración de Supabase o escribir de hecho el CSS en `app/arcade-vault.css` — este dossier es un borrador exploratorio fuera de la secuencia `specs/NN-slug.md`; la migración y el CSS se describen aquí pero se ejecutan solo si un humano promueve este dossier a través de `/spec-impl-game`.
- Ampliar `HudStatKey` o cualquier tipo compartido del registry — `score`/`lives`/`level` ya cubren el HUD de este juego sin necesidad de una stat nueva (por ejemplo, no se añade una stat "oleada" separada: se reutiliza `level` con ese significado).
- Controles táctiles, anti-cheat, tests automatizados o rediseño visual de cualquier pantalla existente más allá de la portada nueva descrita arriba.
- Cualquier cambio a las entradas `asteroides`/`tetris`/`arkanoid`/`frogger`/`snake` existentes.

## Modelo de datos

```ts
// components/games/registry.ts — una nueva entrada, sin ampliar los tipos compartidos
export const GAME_REGISTRY: Record<string, ArcadeGameEntry> = {
  asteroides: {
    /* sin cambios */
  },
  tetris: {
    /* sin cambios */
  },
  arkanoid: {
    /* sin cambios */
  },
  frogger: {
    /* sin cambios */
  },
  snake: {
    /* sin cambios */
  },
  "escuadron-estelar": {
    component: EscuadronEstelarGame,
    hudStats: ["score", "lives", "level"],
    initialStats: { score: 0, lives: 3, level: 1 },
  },
};
```

```ts
// app/data.ts — nueva fila en games (vía migración, no en este archivo, no aplicada por este dossier)
{
  id: "escuadron-estelar",
  title: "ESCUADRÓN ESTELAR",
  short: "Repele oleadas de naves que entran en formación y rompen filas para atacarte en picada.",
  long: "Controla una nave que se desplaza en un solo eje y dispara en línea recta hacia arriba. Las naves enemigas entran describiendo curvas, se acomodan en formación y, cada pocos segundos, un grupo rompe filas para lanzarse en picada contra ti disparando a su paso. Derribar una nave en plena picada vale el doble que derribarla en formación. Pierdes una vida por cada impacto recibido; cuando se agotan las tres, termina la partida.",
  cat: "SHOOTER",
  cover: "cover-escuadron",
  color: "yellow",
}
```

```css
/* app/arcade-vault.css — nuevo bloque de portada, descrito aquí, no aplicado por este dossier */
.cover-escuadron {
  background: linear-gradient(180deg, #2a1f00, #0a0a18);
}
.cover-escuadron::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 25% 25%, var(--yellow) 0 6px, transparent 7px),
    radial-gradient(circle at 45% 25%, var(--yellow) 0 6px, transparent 7px),
    radial-gradient(circle at 65% 25%, var(--yellow) 0 6px, transparent 7px),
    radial-gradient(circle at 85% 25%, var(--yellow) 0 6px, transparent 7px),
    radial-gradient(circle at 35% 42%, var(--magenta) 0 5px, transparent 6px),
    radial-gradient(circle at 55% 42%, var(--magenta) 0 5px, transparent 6px),
    radial-gradient(circle at 75% 42%, var(--magenta) 0 5px, transparent 6px);
  filter: drop-shadow(0 0 6px rgba(245, 255, 0, 0.6));
}
.cover-escuadron::before {
  content: "▲";
  position: absolute;
  left: 46%;
  top: 78%;
  color: var(--cyan);
  font-size: 18px;
  text-shadow: 0 0 8px var(--cyan);
}
```

No se introducen estructuras de persistencia nuevas: `saveScore`/`lib/scores.ts` se reutiliza tal cual con `"escuadron-estelar"` como `gameId`.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores). `components/game-player.tsx` no se toca en ningún paso.

1. Registrar la entrada `"escuadron-estelar"` en `GAME_REGISTRY` (`hudStats: ["score", "lives", "level"]`, `initialStats: { score: 0, lives: 3, level: 1 }`, sin `aspectRatio`), importando `EscuadronEstelarGame` desde `components/games/escuadron-estelar-game.tsx` (ya construido en SPEC 01).
2. Verificar en `/juegos/escuadron-estelar/jugar` (aunque todavía no exista la fila en `games`, la ruta sigue siendo dinámica — ver `platform-integration.md`) que `GamePlayer` monta el componente real en vez de la UI decorativa simulada, confirmando que la sola entrada del registry basta.
3. Escribir el bloque `.cover-escuadron` en `app/arcade-vault.css` (ver modelo de datos), sin modificar ningún otro bloque `.cover-*` existente.
4. Insertar la fila `"escuadron-estelar"` en la tabla `games` vía `mcp__supabase__apply_migration`, con los campos descritos en el modelo de datos.
5. Verificar que `/juegos` muestra la tarjeta "ESCUADRÓN ESTELAR" con la portada `.cover-escuadron` junto a las cinco tarjetas existentes.
6. Verificar que `/juegos/escuadron-estelar` (sin partidas aún) muestra "Mejor global" y "Partidas" en `0`.
7. Jugar una partida completa en `/juegos/escuadron-estelar/jugar`: mover la nave, disparar, derribar naves en formación y en picada, perder las 3 vidas, y ver el modal "FIN DEL JUEGO" de React con la puntuación final.
8. Guardar la puntuación desde el modal y confirmar, vía `mcp__supabase__execute_sql`, que la fila insertada en `scores` tiene `game_id: "escuadron-estelar"` y el puntaje correcto.
9. Verificar que `/salon-de-la-fama` muestra la pestaña "ESCUADRÓN ESTELAR" y que, tras guardar la puntuación del paso 8, esa pestaña refleja la fila real.
10. Probar "PAUSA"/"REANUDAR" y "FIN" a mitad de partida, confirmando que la pausa congela el juego por completo (naves/balas no avanzan) y que "REANUDAR" continúa sin saltos de velocidad.
11. Confirmar que `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar`, `/juegos/frogger/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual que antes de este spec.
12. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `mcp__supabase__execute_sql` (`select id from games`) muestra `asteroides`, `tetris`, `arkanoid`, `frogger`, `snake` y `escuadron-estelar`.
- [ ] `/juegos` muestra la nueva tarjeta "ESCUADRÓN ESTELAR" con la portada `.cover-escuadron`.
- [ ] En `/juegos/escuadron-estelar` (sin partidas aún), "Mejor global" y "Partidas" muestran `0`.
- [ ] En `/juegos/escuadron-estelar/jugar` se ve y juega el shooter de formación real (nave, formación de enemigos, picadas, disparo), no la UI decorativa falsa.
- [ ] El HUD externo de React muestra exactamente tres tiles para este juego: Puntuación, Vidas, Nivel.
- [ ] Derribar una nave en formación suma los puntos de `TIER_POINTS[tier].formation`; derribar una nave en plena picada suma el doble (`TIER_POINTS[tier].dive`), y el HUD externo refleja el cambio en el mismo frame.
- [ ] Recibir un impacto (bala enemiga o contacto con una nave en picada) resta exactamente una vida y activa la invulnerabilidad temporal del jugador.
- [ ] Perder las 3 vidas detiene la partida y abre el modal "FIN DEL JUEGO" de React con la puntuación final.
- [ ] Pulsar "PAUSA" congela completamente la partida (ninguna nave ni bala avanza); "REANUDAR" continúa sin saltos de velocidad.
- [ ] Pulsar "FIN" en cualquier momento detiene la partida y muestra el modal "FIN DEL JUEGO" de React con la puntuación actual.
- [ ] Guardar la puntuación desde el modal inserta una fila real en `scores` con `game_id: "escuadron-estelar"`.
- [ ] "JUGAR DE NUEVO" reinicia completamente la partida (nivel 1, 3 vidas, score en 0, formación nueva) sin desmontar el componente del canvas.
- [ ] `read_console_messages` no muestra errores durante una partida completa.
- [ ] `/salon-de-la-fama` muestra una pestaña "ESCUADRÓN ESTELAR" junto a las otras cinco, y tras guardar una puntuación esa pestaña refleja la fila real.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar`, `/juegos/frogger/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual que antes de este spec.

## Decisiones tomadas y descartadas

- **Título mostrado "ESCUADRÓN ESTELAR" e id interno `escuadron-estelar`, en vez de "GALAGA"/`galaga`.** Razón: "Galaga" es una IP viva de Namco/Bandai (mismo riesgo de marca ya señalado para `comecocos`/Pac-Man en `references/game-suggestions.md`); a diferencia de ese caso, aquí se decide cambiar también el **id interno** (no solo el título), porque el id de este juego sí es visible públicamente en la URL del reproductor (`/juegos/<id>/jugar`), mientras que el id de un juego nunca se muestra como texto de marca en pantalla salvo en esa ruta — mantener literalmente `galaga` en la URL sería una exposición de marca mayor que mantener `comecocos` (que es una palabra genérica en español, no el nombre de la IP). Se eligió un nombre descriptivo de la mecánica ("escuadrón" = formación de naves, "estelar" = ambientación espacial) sin referencia a ninguna IP.
- **`cat: "SHOOTER"`.** Razón: dado explícitamente en el encargo; es también la categoría correcta por mecánica (disparo del jugador contra oleadas de enemigos), y le da a `SHOOTER` un segundo representante junto a `asteroides`, cubriendo variedad dentro de esa categoría (mismo hueco que `references/game-suggestions.md` señala para su candidato `invasores`).
- **`color: "yellow"`, reutilizando el mismo color que `arkanoid`.** Razón: dado explícitamente en el encargo. Se documenta la reutilización porque `color` no tiene una restricción de unicidad en el `check` de Postgres (solo restringe a los 4 valores posibles) — mismo criterio ya aceptado implícitamente en el catálogo actual; la confusión visual en la grilla de `/juegos` se mitiga porque `arkanoid` es `ARCADE` y este juego es `SHOOTER`, y cada uno tiene una portada visualmente distinta (`.cover-bricks` vs. `.cover-escuadron`).
- **Portada `.cover-escuadron` nueva, en vez de reutilizar el huérfano `.cover-invaders`.** Razón: aunque `.cover-invaders` (filas de puntos verde/magenta sobre fondo azul oscuro, con un acento cian abajo) se asemeja superficialmente a una formación de naves, está explícitamente reservado en `references/game-suggestions.md` para el candidato `invasores` del backlog de `game-planner` ("Cover huérfano `cover-invaders` ya listo"); tomarlo aquí crearía una colisión de recursos entre este dossier y ese backlog. El encargo también señala explícitamente que ningún huérfano calza bien y habilita proponer un diseño nuevo, así que se diseñó `.cover-escuadron` siguiendo el mismo patrón visual (gradiente + `radial-gradient`s apilados + `drop-shadow` + glifo `::before`) con paleta amarilla dominante (filas de naves amarillas/magenta) y un glifo cian (`▲`) representando la nave del jugador.
- **`hudStats: ["score", "lives", "level"]`, sin ampliar `HudStatKey`.** Razón: dado explícitamente en el encargo; el "nivel" del HUD representa el número de oleada, que ya es un concepto natural de progresión sin necesitar una stat nueva tipo `"oleada"` — se reutiliza `level` con ese significado, igual que `tetris`/`arkanoid` reutilizan `level` para sus propios conceptos de progresión.
- **Sin `aspectRatio` en la entrada del registry (4:3 por defecto).** Razón: el canvas lógico de SPEC 01 ya es 800×600 (4:3), igual que `asteroides`/`arkanoid`; no hace falta un override como el `"1 / 2"` de `tetris`.
- **`components/game-player.tsx` no se modifica.** Razón: ya es genérico sobre `GAME_REGISTRY[game.id]` desde SPEC 07; agregar un quinto/sexto juego real es exactamente el caso que ese refactor existía para habilitar sin tocarlo de nuevo.
- **La migración de Supabase y la escritura real del CSS se describen pero no se ejecutan en este dossier.** Razón: regla explícita de `game-jam` — es un generador de borradores fuera del pipeline `game-planner` → `/add-game` → `/spec-impl`; la aplicación real queda para cuando un humano revise y promueva este dossier.

## Riesgos identificados

| Riesgo                                                                                                                                              | Mitigación                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode duplica montajes de efectos en desarrollo, pudiendo duplicar listeners de teclado o loops de `requestAnimationFrame` del componente ya construido en SPEC 01, ahora montado por primera vez dentro de `GamePlayer`. | El `useEffect` principal ya limpia explícitamente (`cancelAnimationFrame`, `removeEventListener`) desde SPEC 01; este spec solo verifica en la práctica, dentro de `game-player.tsx`, que esa limpieza sigue siendo correcta al montar/desmontar vía navegación real. |
| `ResizeObserver` disparando redimensionados muy frecuentes podría causar parpadeo o costo de CPU al quedar embebido dentro de `.crt-screen`.         | Redimensionar `canvas.width`/`height` solo cuando el tamaño en píxeles reales cambió respecto al valor cacheado anterior, ya implementado en SPEC 01; se verifica aquí redimensionando la ventana real. |
| El HUD doble (interno en canvas, que llega en SPEC 03, y externo de React, conectado en este spec) puede desincronizarse si `onStatsChange` no se invoca en el mismo frame en que cambia el estado interno. | `reportChanges()` ya dispara desde dentro del mismo paso del loop que muta `score`/`lives`/`level` (SPEC 01); este spec verifica en el navegador que el HUD externo cambia en el mismo frame que la acción in-game (derribo, impacto, fin de oleada). |
| La policy de `insert` abierta (`with check (true)`) en `scores` permite puntuaciones arbitrarias para `escuadron-estelar`, igual que para los otros cinco juegos. | Aceptado como parte del alcance actual; anti-cheat queda para un spec futuro una vez haya Auth real, igual que para el resto del catálogo. |
| Reutilizar `color: "yellow"` con `arkanoid` podría confundir visualmente la grilla de `/juegos` si en el futuro se agregan más filtros por color.    | Mitigado porque la portada (`.cover-escuadron` vs. `.cover-bricks`) y la categoría (`SHOOTER` vs. `ARCADE`) ya distinguen ambas tarjetas sin ambigüedad; si se agrega un filtro por color en el futuro, ese spec deberá decidir si la reutilización sigue siendo aceptable. |
