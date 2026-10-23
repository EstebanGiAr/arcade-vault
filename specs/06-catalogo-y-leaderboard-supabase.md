# 06 — Catálogo y leaderboard reales en Supabase (solo juegos implementados)

**Estado:** Implementado
**Depende de:** SPEC 04, SPEC 05
**Fecha:** 2026-10-23
**Actualizado:** 2026-10-23 — decisión del usuario durante la implementación: se elimina por completo el catálogo de juegos falsos/decorativos. Ver "Decisiones tomadas y descartadas".

**Objetivo:** Crear en Supabase las tablas `games` y `scores`, y mostrar en el catálogo y el salón de la fama **únicamente** los juegos que ya están realmente implementados (por ahora, solo `asteroides`). Los otros 8 juegos decorativos (`bloque-buster`, `caída`, `serpentina`, `glotón`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) se eliminan del catálogo y de todas las pantallas; dejan de existir como datos hardcodeados en `app/data.ts`.

## Alcance

**Incluido:**

- Tabla `games` en Supabase, poblada por ahora con una sola fila: `asteroides` (el único juego cuya lógica real existe, ver SPEC 05).
- Tabla `scores` en Supabase, append-only (solo `SELECT` e `INSERT` vía RLS), que guarda las puntuaciones reales de los juegos presentes en `games`.
- `best` (mejor puntuación) y `plays` (veces jugado) se calculan en vivo a partir de `scores` (`best = MAX(score)`, `plays = COUNT(*)`).
- `app/data.ts` deja de contener el catálogo hardcodeado de 8 juegos falsos (`GAMES`/`FAKE_GAMES`) y sus datos de ejemplo (`PLAYERS`, `seededScores`). El tipo `Game` ya no necesita distinguir real/falso (`isReal`) porque todo juego mostrado proviene de Supabase.
- `lib/games.ts` y `lib/scores.ts`: funciones de acceso a datos para Supabase, parametrizadas para aceptar tanto el cliente de navegador como el de servidor.
- Todas las pantallas que hoy leen el catálogo (`/`, `/juegos`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon-de-la-fama`) pasan a leer exclusivamente `getAllGames()` (equivalente a los juegos reales de Supabase).
- `components/game-player.tsx`: el botón "GUARDAR PUNTUACIÓN" siempre inserta en la tabla `scores` de Supabase (ya no hay rama de guardado en `localStorage` para juegos falsos).
- En `/juegos/[id]` y `/salon-de-la-fama`: el leaderboard y las estadísticas siempre vienen de Supabase.
- `lib/storage.ts` conserva únicamente `getUser`/`setUser` (sesión fake de usuario, sin relación con juegos); se eliminan `saveScore`/`getScores`/`SavedScore`, que quedan sin consumidores tras retirar el catálogo falso.
- Estados vacíos explícitos para juegos sin puntuaciones todavía: "Mejor global" muestra `0` y "Partidas" muestra `0`; en `/salon-de-la-fama`, el podio/tabla de un juego sin puntuaciones muestra "AÚN NADIE HA JUGADO".
- Diseñado para extenderse sin cambios de código: cuando se implemente un nuevo juego real en el futuro, basta con insertar una fila nueva en `games` — `getAllGames()` ya combina dinámicamente cualquier juego presente en la tabla, sin que su id esté hardcodeado en la lógica.

**No incluido (fuera de alcance de este spec):**

- Cualquier UI de administración para crear, editar o eliminar juegos en la tabla `games`. Se puebla a mano, una sola fila, vía migración/seed.
- Autenticación real contra Supabase — las puntuaciones reales de `asteroides` siguen identificándose solo por nombre/iniciales, sin vincularse a un usuario autenticado. Decisión ya tomada en SPEC 04, no se reabre aquí.
- Edición o borrado de puntuaciones ya guardadas en `scores` (append-only).
- Fallback a `localStorage` para juegos reales si Supabase falla.
- Las secciones `ACTIVITY`/`TOP_PLAYERS` (datos ficticios de "actividad en vivo") de `app/page.tsx`, y las estrellas de "Dificultad" en `/juegos/[id]`: siguen siendo valores fijos, sin relación con datos reales — no forman parte del catálogo de juegos y no se tocan.
- Rediseño visual de cualquiera de las pantallas afectadas.
- Reintroducir un catálogo de juegos decorativos/falsos — si en el futuro se quiere volver a mostrar juegos "próximamente" sin lógica real, eso requiere un spec nuevo que reintroduzca esa distinción.

## Modelo de datos

```sql
-- Tabla games: SOLO juegos con lógica real implementada (hoy, únicamente "asteroides")
create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  created_at timestamptz not null default now()
);

-- Seed inicial: una sola fila, con los mismos datos que hoy tiene "asteroides" en app/data.ts
insert into public.games (id, title, short, long, cat, cover, color) values (
  'asteroides',
  'ASTEROIDES',
  'Pulveriza un campo real de asteroides en gravedad cero.',
  'Pilota tu nave en un espacio toroidal real: rota, propulsa y dispara para fragmentar rocas grandes en medianas y luego pequeñas. Recoge el power-up de disparo triple y sobrevive al mayor número de niveles posible.',
  'SHOOTER',
  'cover-asteroides',
  'cyan'
);

-- Tabla scores: puntuaciones reales de los juegos presentes en games
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  name text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on public.scores (game_id, score desc);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public" on public.games for select using (true);
create policy "scores_select_public" on public.scores for select using (true);
create policy "scores_insert_public" on public.scores for insert with check (true);
-- Sin policy de insert/update/delete en games (se escribe solo vía migración/seed).
-- Sin policy de update/delete en scores (append-only).
```

```ts
// app/data.ts — sin catálogo hardcodeado; el tipo Game ya no distingue real/falso
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
};
```

```ts
// lib/games.ts
export async function getRealGames(
  supabase: SupabaseClient<Database>,
): Promise<Game[]>; // best/plays calculados desde scores

export async function getAllGames(
  supabase: SupabaseClient<Database>,
): Promise<Game[]>; // hoy, equivalente a getRealGames(); conserva el nombre
// para que pantallas y futuros juegos reales no cambien de API

export async function getGameById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Game | null>;

// lib/scores.ts
export async function saveScore(
  supabase: SupabaseClient<Database>,
  entry: { gameId: string; name: string; score: number },
): Promise<void>;

export async function getTopScores(
  supabase: SupabaseClient<Database>,
  gameId: string,
  limit?: number,
): Promise<ScoreRow[]>;

export async function getBestScoreByName(
  supabase: SupabaseClient<Database>,
  gameId: string,
  name: string,
): Promise<ScoreRow | null>;
```

`lib/games.ts`/`lib/scores.ts` reciben el cliente de Supabase como parámetro para poder usarse tanto desde Server Components como desde componentes cliente (ej. cambio de pestaña en `/salon-de-la-fama`).

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. Crear la migración con `mcp__supabase__apply_migration`: tablas `games` y `scores`, índice, RLS y policies (ver arriba), incluyendo el `insert` inicial de la fila `asteroides`. ✅ Implementado.
2. Generar tipos con `mcp__supabase__generate_typescript_types` y guardarlos en `lib/supabase/database.types.ts`; tipar `createClient()` en `lib/supabase/client.ts` y `lib/supabase/server.ts` con `SupabaseClient<Database>`. ✅ Implementado.
3. En `app/data.ts`: eliminar el catálogo hardcodeado (`GAMES`/`FAKE_GAMES`), `PLAYERS` y `seededScores`; el tipo `Game` pierde el campo `isReal` (ya no hace falta distinguir real/falso). Conservar `GameCategory`, `Game`, `CATS` y el tipo `ScoreRow` (fila de leaderboard para UI).
4. En `lib/games.ts`: `getRealGames` sin cambios de fondo (consulta `games` + agregación de `scores`); `getAllGames` pasa a ser un simple alias/wrapper de `getRealGames` (se conserva el nombre por claridad semántica y porque pantallas y futuros juegos reales seguirán llamándolo igual); `getGameById` ya no necesita caer a `FAKE_GAMES`.
5. `lib/scores.ts` sin cambios (`saveScore`, `getTopScores`, `getBestScoreByName`).
6. `app/juegos/page.tsx` / `components/games-browser.tsx`: sin cambios de fondo, ahora listan solo juegos reales.
7. `app/page.tsx` / `components/home-content.tsx`: sin cambios de fondo.
8. `app/juegos/[id]/page.tsx`: eliminar la rama `isReal` falsa y el uso de `seededScores`; siempre usa `getGameById` + `getTopScores`. `generateStaticParams` ya no combina con `FAKE_GAMES`, solo usa `getRealGames`.
9. `app/juegos/[id]/jugar/page.tsx`: igual, `generateStaticParams` solo usa `getRealGames` (ya no hay ids estáticos de juegos falsos que combinar).
10. `components/game-player.tsx`: eliminar la rama `isReal` falsa; el guardado de puntuación siempre llama a `saveRealScore` de `lib/scores.ts`, con el mismo manejo de estado de guardado/error/reintento.
11. `app/salon-de-la-fama/page.tsx` / `components/hall-of-fame-tabs.tsx`: eliminar la rama `isReal` falsa, `seededScores`, y el cálculo fake `youRank`/`youScore`; el leaderboard y "TU MEJOR MARCA" siempre vienen de Supabase vía `getTopScores`/`getBestScoreByName`.
12. `lib/storage.ts`: eliminar `saveScore`, `getScores`, `SavedScore` (sin consumidores tras el paso 10); conservar `getUser`/`setUser`/`SessionUser` para la sesión fake de usuario.
13. Prueba manual: confirmar que `/juegos` muestra solo la tarjeta de `asteroides`, que `/` y `/salon-de-la-fama` reflejan lo mismo, y que el flujo de jugar/guardar/leaderboard sigue funcionando.
14. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `mcp__supabase__list_tables` muestra `games` (1 fila: `asteroides`) y `scores`, ambas con RLS habilitado.
- [ ] `/juegos` muestra únicamente la tarjeta de `asteroides` (ningún juego falso/decorativo).
- [ ] `/` y `/salon-de-la-fama` también reflejan únicamente `asteroides`.
- [ ] Jugar una partida de `asteroides` y pulsar "GUARDAR PUNTUACIÓN" inserta una fila real en la tabla `scores` de Supabase.
- [ ] Si esa inserción falla (ej. sin conexión), se muestra un error inline y se puede reintentar sin perder la puntuación final mostrada en pantalla.
- [ ] `/juegos/asteroides` muestra "Mejor global" y "Partidas" calculados en vivo desde `scores`, y el panel de mejores puntuaciones muestra filas reales.
- [ ] Antes de guardar ninguna puntuación, `/juegos/asteroides` muestra `0` en "Mejor global" y "Partidas", y la pestaña "ASTEROIDES" de `/salon-de-la-fama` muestra "AÚN NADIE HA JUGADO".
- [ ] Con sesión fake iniciada y una puntuación real de `asteroides` guardada con un `name` que coincide (case-insensitive) con el nombre de la sesión, la pestaña "ASTEROIDES" de `/salon-de-la-fama` muestra "TU MEJOR MARCA" con esa puntuación real.
- [ ] `lib/storage.ts` solo exporta `getUser`/`setUser`/`SessionUser`; no quedan referencias a `saveScore`/`getScores`/`SavedScore` de `localStorage` en el código.
- [ ] `app/data.ts` no contiene ningún juego hardcodeado ni `seededScores`/`PLAYERS`.

## Decisiones tomadas y descartadas

- **Se elimina por completo el catálogo de juegos falsos/decorativos.** Razón: decisión explícita del usuario, tomada durante la implementación de este spec (2026-10-23) — ya no tiene sentido mantener 8 juegos de relleno sin lógica real; el catálogo debe mostrar únicamente lo que existe de verdad. Esto reemplaza la decisión original del spec (que mantenía los 8 juegos falsos hardcodeados).
- **Se elimina el campo `isReal` y toda la ramificación real/falso asociada**, en lugar de conservarla "por si vuelven los juegos falsos". Razón: decisión explícita del usuario — con una sola fuente de datos (Supabase), mantener la distinción sería complejidad sin uso actual. Si en el futuro se reintroduce un catálogo decorativo, esa distinción se diseña de nuevo en el spec que la traiga.
- **`getAllGames()`/`getRealGames()` no hardcodean el id `"asteroides"`**: consultan dinámicamente lo que exista en la tabla `games`. Razón: decisión explícita del usuario de que esto debe extenderse sin cambios de código cuando se implemente el siguiente juego real — un spec futuro solo necesita insertar una fila nueva.
- **Sin Auth real; incluso las puntuaciones reales de `asteroides` se identifican solo por nombre/iniciales.** Razón: decisión ya tomada en SPEC 04, no se reabre aquí.
- **Sin fallback entre fuentes de datos.** Razón: decisión explícita del usuario, prioriza simplicidad sobre resiliencia cross-fuente.
- **`lib/games.ts`/`lib/scores.ts` reciben el cliente de Supabase como parámetro** en vez de importarlo internamente, para reutilizar la misma lógica desde Server Components y desde componentes cliente (ej. cambio de pestaña en `/salon-de-la-fama`).

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateStaticParams` depende enteramente de una consulta async a Supabase; si Supabase no es alcanzable durante el build, no se generaría ningún param estático.                                                           | Verificar que `dynamicParams` siga permitiendo renderizado dinámico como respaldo; probar el build con y sin la tabla poblada.                                                                                                          |
| Policy de `insert` abierta (`with check (true)`) en `scores` permite insertar puntuaciones arbitrarias desde el cliente para `asteroides`, igual de "falsificable" que el `localStorage` que usaban antes los juegos falsos. | Aceptado como parte del alcance actual; anti-cheat queda para un spec futuro una vez haya Auth real.                                                                                                                                    |
| Las flags experimentales de `next.config.ts` (`cacheComponents`, `partialPrefetching`) bloquean el prerenderizado estático de páginas que leen `scores`/`games` en vivo mediante el cliente de Supabase con cookies.         | Resuelto durante la implementación: páginas que leen datos en vivo usan `export const instant = false`; `generateStaticParams` usa un cliente de Supabase sin cookies (`lib/supabase/static.ts`), ya que no necesita sesión de usuario. |
