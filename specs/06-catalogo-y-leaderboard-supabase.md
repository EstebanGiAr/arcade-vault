# 06 — Catálogo y leaderboard reales en Supabase (solo juegos implementados)

**Estado:** Aprobado
**Depende de:** SPEC 04, SPEC 05
**Fecha:** 2026-10-23

**Objetivo:** Crear en Supabase las tablas `games` y `scores`, pero poblar `games` únicamente con los juegos que ya están realmente implementados (por ahora, solo `asteroides`), dejando los otros 8 juegos del catálogo exactamente como están hoy (hardcodeados en `app/data.ts`, con datos falsos y `GamePlayer` decorativo), y combinando ambas fuentes de forma transparente en todas las pantallas.

## Alcance

**Incluido:**

- Tabla `games` en Supabase, poblada por ahora con una sola fila: `asteroides` (el único juego cuya lógica real existe, ver SPEC 05). El resto de los 9 juegos actuales de `GAMES` (`bloque-buster`, `caída`, `serpentina`, `glotón`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) permanece hardcodeado en `app/data.ts`, sin tocar.
- Tabla `scores` en Supabase, append-only (solo `SELECT` e `INSERT` vía RLS), que guarda las puntuaciones reales de los juegos que están en la tabla `games` (hoy, solo `asteroides`). Las puntuaciones de los otros 8 juegos siguen guardándose en `localStorage` exactamente como hoy (`lib/storage.ts`, sin cambios).
- Para los juegos presentes en la tabla `games`: `best` (mejor puntuación) y `plays` (veces jugado) se calculan en vivo a partir de `scores` (`best = MAX(score)`, `plays = COUNT(*)`), en vez de usar un valor fijo.
- `app/data.ts` agrega un campo `isReal: boolean` al tipo `Game`, y una función `getAllGames()` (o equivalente) que combina los juegos reales de Supabase con el array hardcodeado de los 8 juegos falsos restantes, devolviendo una sola lista unificada en el mismo orden visual que hoy.
- `lib/games.ts` y `lib/scores.ts`: funciones de acceso a datos para la parte real (Supabase), parametrizadas para aceptar tanto el cliente de navegador como el de servidor.
- Todas las pantallas que hoy leen el array `GAMES` completo (`/`, `/juegos`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon-de-la-fama`) pasan a leer la lista combinada (`getAllGames()`), sin cambiar su comportamiento visual para los 8 juegos falsos.
- `components/game-player.tsx`: cuando `game.isReal` es `true` (hoy, solo para `asteroides`), el botón "GUARDAR PUNTUACIÓN" inserta en la tabla `scores` de Supabase; cuando `game.isReal` es `false`, sigue llamando a `saveScore` de `lib/storage.ts` exactamente como hoy.
- En `/juegos/[id]` y `/salon-de-la-fama`: cuando el juego es real, el leaderboard y las estadísticas vienen de Supabase; cuando es falso, siguen viniendo de `seededScores` exactamente como hoy (incluyendo la sección "TU MEJOR MARCA" para juegos falsos, sin cambios).
- Estados vacíos explícitos solo para juegos reales sin puntuaciones todavía: "Mejor global" muestra `0` y "Partidas" muestra `0`; en `/salon-de-la-fama`, el podio/tabla de un juego real sin puntuaciones muestra "AÚN NADIE HA JUGADO". Los juegos falsos nunca entran en este caso (siempre tienen datos de ejemplo vía `seededScores`).
- Diseñado para extenderse sin cambios de código: cuando se implemente un nuevo juego real en el futuro, basta con insertar una fila nueva en `games` (vía migración/seed de ese spec futuro) — `getAllGames()` ya combina dinámicamente cualquier juego presente en la tabla, sin que su id esté hardcodeado en la lógica de combinación.

**No incluido (fuera de alcance de este spec):**

- Cualquier UI de administración para crear, editar o eliminar juegos en la tabla `games`. Se puebla a mano, una sola fila, vía migración/seed.
- Migrar cualquiera de los otros 8 juegos a Supabase. Siguen siendo decorativos/falsos hasta que exista un spec que implemente su lógica real (igual que ocurrió con `asteroides` en SPEC 05).
- Autenticación real contra Supabase — las puntuaciones reales de `asteroides` siguen identificándose solo por nombre/iniciales, sin vincularse a un usuario autenticado. Decisión ya tomada en SPEC 04, no se reabre aquí.
- Edición o borrado de puntuaciones ya guardadas en `scores` (append-only).
- Fallback a `localStorage` para juegos reales si Supabase falla, o fallback a Supabase para juegos falsos. Cada juego usa una sola fuente de datos según `isReal`, sin mezclar.
- Las secciones `ACTIVITY`/`TOP_PLAYERS` (datos ficticios de "actividad en vivo") de `app/page.tsx`, y las estrellas de "Dificultad" en `/juegos/[id]`: siguen siendo valores fijos, sin relación con datos reales.
- Rediseño visual de cualquiera de las pantallas afectadas.

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
// app/data.ts — tipo Game con el nuevo campo isReal; FAKE_GAMES reemplaza al GAMES actual
// (mismos 8 juegos de siempre, sin "asteroides", con best/plays fijos como hoy)
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
  isReal: boolean; // true = best/plays/puntuaciones vienen de Supabase
};

export const FAKE_GAMES: Game[] = [
  /* los 8 juegos actuales, sin "asteroides", con isReal: false */
];
```

```ts
// lib/games.ts
export async function getRealGames(
  supabase: SupabaseClient<Database>,
): Promise<Game[]>; // best/plays calculados desde scores, isReal: true

export async function getAllGames(
  supabase: SupabaseClient<Database>,
): Promise<Game[]>; // getRealGames() + FAKE_GAMES, en el orden visual actual del catálogo

export async function getGameById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Game | null>; // busca primero en Supabase; si no está, busca en FAKE_GAMES

// lib/scores.ts (solo para juegos reales)
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

1. Crear la migración con `mcp__supabase__apply_migration`: tablas `games` y `scores`, índice, RLS y policies (ver arriba), incluyendo el `insert` inicial de la fila `asteroides`.
2. Generar tipos con `mcp__supabase__generate_typescript_types` y guardarlos en `lib/supabase/database.types.ts`; tipar `createClient()` en `lib/supabase/client.ts` y `lib/supabase/server.ts` con `SupabaseClient<Database>`.
3. En `app/data.ts`: quitar la entrada `asteroides` del array `GAMES` actual y renombrarlo a `FAKE_GAMES` (mismos 8 juegos, mismos valores de `best`/`plays`, agregando `isReal: false` a cada uno); agregar el campo `isReal` al tipo `Game`.
4. Crear `lib/games.ts` (`getRealGames`, `getAllGames`, `getGameById`): `getRealGames` consulta `games` + agregación de `scores` (`MAX(score)`, `COUNT(*)`) y devuelve objetos `Game` con `isReal: true`; `getAllGames` combina `getRealGames()` con `FAKE_GAMES` y ordena la lista para que `asteroides` quede en la misma posición visual que ocupa hoy en el catálogo (entre `rocas` y `ranaria`).
5. Crear `lib/scores.ts` (`saveScore`, `getTopScores`, `getBestScoreByName`), usando el índice `scores_game_id_score_idx`.
6. Refactorizar `app/juegos/page.tsx` a Server Component async que llama a `getAllGames()` y pasa la lista a un componente cliente `components/games-browser.tsx` con la lógica de filtro actual (`useState`), sin re-consultar Supabase en cada tecleo/clic.
7. Refactorizar `app/page.tsx`: mover el contenido actual a `components/home-content.tsx` (recibe `games: Game[]` como prop para el rail "JUEGOS DISPONIBLES AHORA"); `app/page.tsx` pasa a ser Server Component async que llama a `getAllGames()`.
8. Refactorizar `app/juegos/[id]/page.tsx`: usar `getGameById(id)` en vez de `GAMES.find`; si `game.isReal` es `true`, usar `getTopScores(id, 10)` para el panel "MEJORES PUNTUACIONES" y los valores reales de `best`/`plays`; si es `false`, seguir usando `seededScores` exactamente como hoy.
9. Refactorizar `app/juegos/[id]/jugar/page.tsx`: usar `getGameById(id)`; `generateStaticParams` combina los ids de `FAKE_GAMES` (estático) con los ids reales obtenidos de `getRealGames()` (async).
10. Actualizar `components/game-player.tsx`: al guardar la puntuación, si `game.isReal` es `true` llamar a `saveScore` de `lib/scores.ts` (cliente de navegador) de forma asíncrona, deshabilitando el botón mientras se guarda y mostrando un error inline con opción de reintentar si falla; si `game.isReal` es `false`, seguir llamando a `saveScore` de `lib/storage.ts` exactamente como hoy.
11. Refactorizar `app/salon-de-la-fama/page.tsx`: Server Component async que obtiene `getAllGames()` y las puntuaciones iniciales de la primera pestaña (reales o `seededScores` según `isReal`), pasándolo a un componente cliente (ej. `components/hall-of-fame-tabs.tsx`) que, al cambiar de pestaña, usa `getTopScores` (si `isReal`) o `seededScores` (si no) según corresponda.
12. En ese componente cliente, para pestañas con `isReal: true`, implementar "TU MEJOR MARCA" buscando con `getBestScoreByName` la mejor fila cuyo `name` coincida (case-insensitive) con `user.name`; si no hay coincidencia, no se muestra la sección. Para pestañas con `isReal: false`, mantener el cálculo fake actual (`youRank`/`youScore`) sin cambios.
13. Prueba manual: jugar una partida de `asteroides`, guardar la puntuación y verificar que aparece de inmediato en `/juegos/asteroides` (mejor global/partidas actualizados) y en la pestaña "ASTEROIDES" de `/salon-de-la-fama`; verificar que los 8 juegos falsos siguen funcionando exactamente igual que antes (datos de ejemplo, guardado en `localStorage`); verificar el estado vacío jugando con una base de datos recién migrada (antes de guardar ninguna puntuación real).
14. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `mcp__supabase__list_tables` muestra `games` (1 fila: `asteroides`) y `scores` (vacía al inicio), ambas con RLS habilitado.
- [ ] `/juegos` muestra las 9 tarjetas de siempre (8 falsas + `asteroides`), en el mismo orden visual que antes de este spec.
- [ ] Jugar una partida de `asteroides` y pulsar "GUARDAR PUNTUACIÓN" inserta una fila real en la tabla `scores` de Supabase.
- [ ] Si esa inserción falla (ej. sin conexión), se muestra un error inline y se puede reintentar sin perder la puntuación final mostrada en pantalla.
- [ ] `/juegos/asteroides` muestra "Mejor global" y "Partidas" calculados en vivo desde `scores`, y el panel de mejores puntuaciones muestra filas reales.
- [ ] Antes de guardar ninguna puntuación real, `/juegos/asteroides` muestra `0` en "Mejor global" y "Partidas", y la pestaña "ASTEROIDES" de `/salon-de-la-fama` muestra "AÚN NADIE HA JUGADO" en vez de un podio con errores.
- [ ] Los otros 8 juegos (`bloque-buster`, `caída`, `serpentina`, `glotón`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) siguen mostrando exactamente los mismos datos falsos de siempre (`best`/`plays` fijos, `seededScores` en sus fichas y en `/salon-de-la-fama`, guardado de puntuaciones en `localStorage`), sin ningún cambio de comportamiento.
- [ ] Con sesión fake iniciada y una puntuación real de `asteroides` guardada con un `name` que coincide (case-insensitive) con el nombre de la sesión, la pestaña "ASTEROIDES" de `/salon-de-la-fama` muestra "TU MEJOR MARCA" con esa puntuación real.
- [ ] `lib/storage.ts` sigue exportando `saveScore`/`getScores`/`SavedScore` sin cambios, y sigue siendo usado para los 8 juegos falsos.

## Decisiones tomadas y descartadas

- **La tabla `games` solo incluye juegos con lógica real implementada (hoy, únicamente `asteroides`).** Razón: decisión explícita del usuario — no tiene sentido migrar a Supabase juegos que todavía son decorativos/falsos; cada juego entra a la tabla cuando se implementa de verdad (como ya ocurrió con `asteroides` en SPEC 05).
- **Los otros 8 juegos permanecen hardcodeados en `app/data.ts` (`FAKE_GAMES`), con datos falsos y guardado en `localStorage`, sin ningún cambio.** Razón: decisión explícita del usuario — mezclar dos fuentes de datos (Supabase para lo real, hardcode para lo falso) es preferible a migrar prematuramente juegos sin lógica real solo para "unificar" la fuente de datos.
- **Campo `isReal: boolean` en el tipo `Game`**, usado para decidir en cada pantalla si los datos/acciones vienen de Supabase o del comportamiento fake actual. Razón: evita repetir comparaciones de id como `game.id === "asteroides"` en cada archivo que necesita esta distinción (detalle, salón de la fama, guardado de puntuación); es una bandera mínima, no una abstracción de "motor de juego" genérica.
- **`getAllGames()`/`getRealGames()` no hardcodean el id `"asteroides"`**: consultan dinámicamente lo que exista en la tabla `games`. Razón: decisión explícita del usuario de que esto debe extenderse sin cambios de código cuando se implemente el siguiente juego real — un spec futuro solo necesita insertar una fila nueva.
- **Orden visual del catálogo preservado manualmente** (ej. una lista de ids en el orden actual) al combinar `FAKE_GAMES` con los juegos reales de Supabase. Razón: sin esto, `asteroides` podría aparecer en una posición distinta a la actual simplemente por venir de una fuente de datos separada.
- **Sin Auth real; incluso las puntuaciones reales de `asteroides` se identifican solo por nombre/iniciales.** Razón: decisión ya tomada en SPEC 04, no se reabre aquí.
- **Sin fallback entre fuentes de datos** (un juego real nunca cae a `localStorage`, uno falso nunca intenta leer Supabase). Razón: decisión explícita del usuario, prioriza simplicidad sobre resiliencia cross-fuente.
- **`lib/games.ts`/`lib/scores.ts` reciben el cliente de Supabase como parámetro** en vez de importarlo internamente, para reutilizar la misma lógica desde Server Components y desde componentes cliente (ej. cambio de pestaña en `/salon-de-la-fama`).

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                        | Mitigación                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateStaticParams` de `/juegos/[id]/jugar` y `/juegos/[id]` combina ids estáticos (`FAKE_GAMES`) con una consulta async a Supabase; si Supabase no es alcanzable durante el build, la parte real podría faltar.                           | Verificar que `dynamicParams` siga permitiendo renderizado dinámico como respaldo para `asteroides`; probar el build con y sin la tabla poblada.                                         |
| Olvidar actualizar algún lugar que todavía compare `game.id === "asteroides"` directamente (en vez de `game.isReal`) al extender esta lógica a un futuro segundo juego real.                                                                  | Documentado aquí como recordatorio para el spec que implemente el siguiente juego real: revisar todos los usos de `isReal` antes de asumir que solo hay un juego real.                   |
| Policy de `insert` abierta (`with check (true)`) en `scores` permite insertar puntuaciones arbitrarias desde el cliente para `asteroides`, igual de "falsificable" que el `localStorage` actual de los juegos falsos.                         | Aceptado como parte del alcance actual; anti-cheat queda para un spec futuro una vez haya Auth real.                                                                                     |
| Las flags experimentales de `next.config.ts` (`cacheComponents`, `partialPrefetching`) pueden cachear agresivamente la respuesta de un Server Component que lee `scores`, mostrando una puntuación desactualizada justo después de guardarla. | Revisar `node_modules/next/dist/docs/` para el comportamiento de cacheo en Next 16 y forzar revalidación donde sea necesario (ej. `cache: "no-store"` en las consultas de puntuaciones). |
