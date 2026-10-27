# 02 — RANA: integración con la plataforma (registry, catálogo y leaderboard)

**Estado:** Borrador
**Depende de:** `01-nucleo-jugable.md` (este mismo dossier)
**Fecha:** 2026-10-26

**Objetivo:** Conectar `rana-game.tsx` al resto de Arcade Vault: nueva entrada en `GAME_REGISTRY`, fila descrita para la tabla `games` de Supabase, reutilización del cover huérfano `.cover-rana`, callbacks reales (`onStatsChange`/`onGameOver`), control real de pausa/fin/reinicio desde `game-player.tsx`, y guardado de puntuación.

## Alcance

**Incluido:**

- Adaptar `components/games/rana-game.tsx` (del spec `01`) para aceptar `paused`, `onStatsChange`, `onGameOver` como las props reales de `ArcadeGameProps` (ya definidas en `components/games/registry.ts` desde SPEC 07): se agrega `callbacksRef` y una función `reportChanges()` que acumula un objeto parcial `{ score, lives, level }` por frame y lo emite en una sola llamada a `onStatsChange` cuando algo cambió, y llama a `onGameOver(score)` exactamente una vez al pasar de `"playing"` a `"gameover"` — mismo patrón ya usado en `asteroides`/`tetris`/`arkanoid`/`snake`.
- Nueva entrada `rana` en `GAME_REGISTRY` (`components/games/registry.ts`): `hudStats: ["score", "lives", "level"]`, `initialStats: { score: 0, lives: 3, level: 1 }`, sin `aspectRatio` (usa el `4/3` por defecto de `.crt-screen`, igual que `asteroides`/`arkanoid`/`snake`; el canvas lógico 800×600 ya respeta esa proporción). No se amplía ningún tipo compartido del registry — `score`/`lives`/`level` ya existen como `HudStatKey`.
- Nueva fila descrita para la tabla `games` de Supabase (a aplicar con `mcp__supabase__apply_migration` cuando un humano apruebe este dossier — **no se ejecuta en este spec**): `id: "rana"`, `title: "RANA"`, `cat: "ARCADE"`, `color: "green"`, `cover: "cover-rana"`, `short`/`long` propios (ver modelo de datos).
- Reutilización del bloque CSS existente `.cover-rana` en `app/arcade-vault.css` (huérfano, confirmado en la auditoría de este dossier) como portada de la tarjeta "rana" — no se escribe CSS de portada nuevo.
- Sin cambios en `components/game-player.tsx`: el registry ya existe desde SPEC 07 y ya itera `entry.hudStats` genéricamente; agregar `rana` es solo una entrada nueva en el mapa.
- "PAUSA"/"REANUDAR" controla la prop `paused` (pausa real, ya implementada en el núcleo del spec `01`); "FIN" llama a `forceGameOver()` del ref además de abrir el modal de React con la puntuación actual; "JUGAR DE NUEVO" llama a `restart()` del ref además de resetear el estado de `GamePlayer`, sin desmontar el componente del canvas — mismo contrato que el resto de juegos reales.
- El flujo de guardado de puntuación reutiliza `saveScore`/`lib/scores.ts` sin cambios, usando `"rana"` como `gameId`.
- Verificación manual completa en `/juegos/rana/jugar` (ver criterios de aceptación) una vez la migración y el registro estén en el árbol.

**No incluido (fuera de alcance de este spec):**

- Cualquier cambio a la jugabilidad interna ya definida en `01` (reglas de salto, colisiones, puntuación, niveles) — este spec es puramente de conexión.
- Sumersión de tortugas, bonus de tiempo, efectos visuales adicionales — spec `03`.
- Aplicar la migración de Supabase — se describe aquí, se aplica solo cuando un humano revise y apruebe el dossier (ver nota de la skill `game-jam` y `CLAUDE.md` sobre specs de este directorio).
- Tests automatizados.

## Modelo de datos

```ts
// components/games/registry.ts — una nueva entrada, sin ampliar los tipos compartidos
export const GAME_REGISTRY: Record<string, ArcadeGameEntry> = {
  asteroides: {/* sin cambios */},
  tetris: {/* sin cambios */},
  arkanoid: {/* sin cambios */},
  snake: {/* sin cambios */},
  rana: {
    component: RanaGame,
    hudStats: ["score", "lives", "level"],
    initialStats: { score: 0, lives: 3, level: 1 },
  },
};
```

```ts
// app/data.ts — nueva fila en games (vía migración, no en este archivo; descrita, no aplicada en este spec)
{
  id: "rana",
  title: "RANA",
  short: "Cruza el tráfico y el río a tiempo sin que te atropellen ni te ahogues.",
  long: "Guía a la rana desde la orilla hasta los cinco huecos de la meta: esquiva el tráfico de cinco carriles, luego crúzate al otro lado saltando sobre troncos y tortugas sin caer al agua, todo antes de que se acabe el tiempo de cada vida. Llenar los cinco huecos sube de nivel y acelera todo el tablero.",
  cat: "ARCADE",
  cover: "cover-rana",
  color: "green",
}
```

```ts
// components/games/rana-game.tsx — cambia la firma de props respecto al spec 01
export const RanaGame: ForwardRefExoticComponent<
  ArcadeGameProps & RefAttributes<ArcadeGameHandle>
>;
```

No se introducen estructuras de persistencia nuevas: `saveScore`/`lib/scores.ts` se reutiliza tal cual con `"rana"` como `gameId`.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores). `components/game-player.tsx` no se modifica en ningún paso — ya lee genéricamente de `GAME_REGISTRY` desde SPEC 07.

1. Adaptar `rana-game.tsx`: agregar `callbacksRef` (mirror de `onStatsChange`/`onGameOver`) y `reportChanges()`, invocada al final de cada `update(dt)` (no en un `setTimeout` ni efecto separado), comparando `score`/`lives`/`level` contra los valores del frame anterior y emitiendo un solo `onStatsChange` parcial cuando algo cambió; `onGameOver(score)` se invoca una sola vez al pasar `gameState` de `"playing"` a `"gameover"`.
2. Confirmar que `paused` (ya soportado desde el spec `01`) sigue respetando el mismo contrato que el resto de juegos: loop dibuja siempre, pero no avanza autos/plataformas/temporizador ni procesa saltos mientras `paused === true`.
3. Registrar la entrada `rana` en `GAME_REGISTRY` (`hudStats: ["score", "lives", "level"]`, `initialStats: { score: 0, lives: 3, level: 1 }`, sin `aspectRatio`).
4. Describir (sin aplicar) la migración de la fila `rana` en la tabla `games` de Supabase (ver modelo de datos), reutilizando `.cover-rana` ya existente en `app/arcade-vault.css` sin modificarlo.
5. Una vez un humano apruebe el dossier y aplique la migración: probar manualmente en `/juegos/rana/jugar` — saltar en las cuatro direcciones, cruzar la carretera sin ser atropellado, cruzar el río sobre troncos/tortugas sin caer al agua, llegar a un hueco de meta vacío y ver sumar los puntos, llenar los 5 huecos y ver subir el nivel con el tablero más rápido, dejar que el temporizador de una vida llegue a 0 y perder una vida, perder las 3 vidas y ver el fin de partida, guardar la puntuación, probar "PAUSA"/"REANUDAR" y "FIN" a mitad de partida, y redimensionar la ventana para confirmar que el tablero mantiene 4:3 sin deformarse.
6. Confirmar que `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual (el registry solo gana una entrada nueva; `game-player.tsx` no se toca).
7. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `mcp__supabase__execute_sql` (`select id from games`) muestra `asteroides`, `tetris`, `arkanoid`, `snake` y `rana` (una vez aplicada la migración descrita).
- [ ] `/juegos` muestra la nueva tarjeta "RANA" con la portada `.cover-rana`.
- [ ] En `/juegos/rana` (sin partidas aún), "Mejor global" y "Partidas" muestran `0`.
- [ ] En `/juegos/rana/jugar` se ve y juega la Rana real (tráfico, río, meta), no la UI decorativa falsa.
- [ ] Saltar sobre un auto en una fila de carretera resta una vida; cruzar sin tocar ningún auto no la resta.
- [ ] Quedar en una fila de río sin estar sobre un tronco/tortuga resta una vida; viajar sobre una plataforma mantiene a la rana con vida y la desplaza con ella.
- [ ] Llegar a un hueco de meta vacío suma `50` puntos y reaparece la rana en la fila de salida con el temporizador de vida reiniciado; llegar a un hueco ya lleno no es posible (el salto se rechaza).
- [ ] Llenar los 5 huecos de meta sube el stat "Nivel" del HUD en 1 y hace notablemente más rápido el tráfico y el río.
- [ ] Dejar que el temporizador de una vida llegue a `0` resta una vida igual que un choque.
- [ ] Perder la tercera vida detiene el juego, muestra "GAME OVER" en el overlay de canvas y abre el modal "FIN DEL JUEGO" de React con la puntuación final.
- [ ] Pulsar "PAUSA" congela completamente la partida (autos/plataformas no avanzan, el temporizador no descuenta, las flechas no mueven a la rana); "REANUDAR" continúa sin saltos de velocidad.
- [ ] Pulsar "FIN" en cualquier momento detiene la partida y muestra el modal "FIN DEL JUEGO" de React con la puntuación actual.
- [ ] Guardar la puntuación desde el modal inserta una fila real en `scores` con `game_id: "rana"`.
- [ ] "JUGAR DE NUEVO" reinicia completamente la partida (rana en la fila de salida, 3 vidas, nivel 1, score en 0, huecos de meta vacíos) sin desmontar el componente del canvas.
- [ ] Redimensionar la ventana mantiene el área de juego en proporción 4:3 dentro de `.crt-screen`, sin recortar ni deformar.
- [ ] `read_console_messages` no muestra errores durante una partida completa de rana.
- [ ] `/salon-de-la-fama` muestra una pestaña "RANA" junto a las otras cuatro, y tras guardar una puntuación esa pestaña refleja la fila real.
- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando exactamente igual que antes de este spec.

## Decisiones tomadas y descartadas

- **`id: "rana"`, `cat: "ARCADE"`, `color: "green"`, portada reusando `.cover-rana`.** Razón: estos cuatro valores vienen dados por el backlog de `game-planner` (`references/game-suggestions.md` línea 12) — no son una elección de este dossier, se confirman tal cual. `.cover-rana` ya existe huérfano en `app/arcade-vault.css` con temática exacta (carriles horizontales + punto verde), evita CSS nuevo.
- **Color `green` se reutiliza de `snake`.** Razón: justificado explícitamente por el backlog y por la temática obvia (rana = verde); el check de Postgres solo permite 4 colores y ya hay 4 juegos reales, así que alguna reutilización es inevitable a partir del quinto juego — se documenta en vez de forzar un color menos natural para el tema.
- **`hudStats: ["score", "lives", "level"]`, igual forma que `asteroides`/`arkanoid`.** Razón: la Rana sí tiene el concepto de "vidas" (a diferencia de `snake`), y sí tiene progresión de nivel al llenar los huecos de meta; no se necesita ningún `HudStatKey` nuevo.
- **Sin `aspectRatio` en el registry — se usa el `4/3` por defecto.** Razón: el canvas lógico 800×600 definido en el spec `01` ya es 4:3, igual que `asteroides`/`arkanoid`/`snake`; solo `tetris` necesitó el override por su tablero vertical angosto.
- **La migración de Supabase se describe pero no se aplica en este spec.** Razón: regla fija de la skill `game-jam` — las specs de este directorio son borradores exploratorios sin acceso a herramientas de Supabase; la migración real se aplica cuando un humano revise y promueva el dossier.
- **Sin controles táctiles.** Razón: mismo criterio ya establecido en SPEC 05 y mantenido por todos los juegos reales posteriores.

## Riesgos identificados

| Riesgo                                                                                                                                                                           | Mitigación                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El HUD dual (canvas interno + React externo) puede desincronizarse si `reportChanges()` no se dispara en el mismo frame en que cambia el estado interno.                         | `reportChanges()` se llama al final de cada `update(dt)`, inmediatamente después de mutar `score`/`lives`/`level`, nunca en un `setTimeout` ni efecto separado — mismo criterio que el resto de juegos. |
| Agregar una quinta entrada al registry podría, por error humano al escribir el código, alterar accidentalmente una entrada existente (`asteroides`/`tetris`/`arkanoid`/`snake`). | El plan de implementación verifica explícitamente las cuatro rutas de juego existentes (paso 6 y criterio de aceptación dedicado) antes de cerrar el spec.                                              |
| La policy de `insert` abierta (`with check (true)`) en `scores` permite puntuaciones arbitrarias para `rana`, igual que para los otros cuatro juegos.                            | Aceptado como parte del alcance actual; anti-cheat queda para un spec futuro una vez haya Auth real — mismo riesgo ya catalogado en `game-spec-notes.md`.                                               |
| `ResizeObserver` firing muy frecuente durante animaciones de layout podría causar parpadeo o costo de CPU en el tablero de rana.                                                 | Solo se ajusta `canvas.width`/`height` cuando el tamaño en píxeles reales cambió respecto al valor cacheado, igual que en el resto de juegos (ya implementado en el spec `01`).                         |
