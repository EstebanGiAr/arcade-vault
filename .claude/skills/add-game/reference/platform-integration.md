# Platform integration checklist

Every point of contact a new game has with the rest of Arcade Vault, with exact file paths. This feeds the "Plan de implementación" section of every spec `/add-game` writes.

## The registry (introduced by the first game spec this skill generates)

SPEC 05 deliberately kept `components/game-player.tsx` free of a generic "game engine" abstraction — a single `if (game.id === "asteroides")`. That was right for one game. Adding a second and third game the same way means a new `isX` flag, a new `useRef<XGameHandle>`, a new piece of level/stat state, and a new branch in `endGame`/`restart` for every game, forever. The user has confirmed: from the second real game onward, introduce a registry instead — and that refactor belongs **inside the first game spec this skill generates**, not a separate cleanup spec.

Target shape:

```ts
// components/games/registry.ts
export type HudStatKey = "score" | "lives" | "level" | "lines";
export type ArcadeStats = Partial<Record<HudStatKey, number>>;

export type ArcadeGameHandle = {
  restart: () => void;
  forceGameOver: () => void;
};

export type ArcadeGameProps = {
  paused: boolean;
  onStatsChange: (stats: ArcadeStats) => void;
  onGameOver: (finalScore: number) => void;
};

export type ArcadeGameEntry = {
  component: ComponentType<ArcadeGameProps & RefAttributes<ArcadeGameHandle>>;
  hudStats: HudStatKey[]; // which hud-stat tiles GamePlayer renders, in order
  initialStats: ArcadeStats; // reset values ({ score: 0, lives: 3, level: 1 })
  aspectRatio?: string; // only set when it is NOT 4/3 (e.g. "1 / 2" for a Tetris-shaped game)
};

export const GAME_REGISTRY: Record<string, ArcadeGameEntry> = {
  asteroides: {
    component: AsteroidsGame,
    hudStats: ["score", "lives", "level"],
    initialStats: { score: 0, lives: 3, level: 1 },
  },
};
```

A single `onStatsChange(partial)` replaces the four separate callbacks (`onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver` for stats) — that's what lets a Tetris-shaped game report `lines` instead of `lives` without widening the shared interface every time. In `asteroids-game.tsx`, `reportChanges()` changes mechanically: it accumulates a partial object across the frame's diffs and emits one call instead of three. In `game-player.tsx`, the four separate `useState`s for stats collapse into one `stats` object plus a `hudStats.map()` that renders the `.hud-stat` tiles, and the decorative `else` branch (`.game-arena`) becomes a real "no game available" empty state instead of dead code.

**Catalog metadata (`title`, `short`, `long`, `cat`, `color`, `cover`) does NOT move into this registry.** It stays in the `games` Supabase table, exactly as SPEC 06 left it — see the decisions section of `SKILL.md`. The registry only holds what is genuinely code: the component, its HUD stat shape, and layout quirks.

## Integration checklist

| Step         | File                             | Critical detail                                                                                                                                                                                                                                                            |
| ------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog row  | Supabase migration (MCP)         | `games` has **no `insert` policy** → requires `mcp__supabase__apply_migration`, never an insert from the app. `cat` and `color` are constrained by Postgres `check` clauses to the same four/four values as the `Game` type.                                               |
| Types        | `lib/supabase/database.types.ts` | Regenerate only if the schema itself changes — adding a row does not require it.                                                                                                                                                                                           |
| Cover art    | `app/arcade-vault.css`           | `.cover-<id>` = a background gradient, plus an `::after` stacking several `radial-gradient`s with a neon `filter: drop-shadow`, plus an optional `::before` placing a Unicode glyph. Always applied as `className={"cover-bg " + game.cover}`, never the bare class alone. |
| Component    | `components/games/<id>-game.tsx` | Follow `port-recipe.md`.                                                                                                                                                                                                                                                   |
| Registration | `components/games/registry.ts`   | One new entry.                                                                                                                                                                                                                                                             |
| Player       | `components/game-player.tsx`     | No longer edited per game once the registry exists — it reads from `GAME_REGISTRY[game.id]`.                                                                                                                                                                               |
| Assets       | `public/games/<id>/`             | Only if the reference brings sprites/audio.                                                                                                                                                                                                                                |
| Routes       | none                             | `app/juegos/[id]/**` is already fully dynamic; `generateStaticParams` picks up the new game on its own via `getRealGames`.                                                                                                                                                 |

## Invariants that must not break

- Every page that reads `scores` carries `export const instant = false` (required by `cacheComponents` in `next.config.ts`).
- `generateStaticParams` uses `createStaticClient()` from `lib/supabase/static.ts` (no cookies, build-time safe); every other server read uses `await createClient()` from `lib/supabase/server.ts`; client components use `createClient()` from `lib/supabase/client.ts`.
- `params` is a `Promise` in Next 16 route handlers (`const { id } = await params`).
- `.crt-screen` has `aspect-ratio: 4/3` and its `::before`/`::after` pseudo-elements carry `pointer-events: none` — the canvas sits underneath without blocking input.
- A new HUD stat with its own color follows the existing pattern: a modifier class on `.hud-stat` plus a `.v` override, mirroring `.hud-stat.lives` / `.hud-stat.level` in `app/arcade-vault.css`.
- Numbers render via `.toLocaleString("es-ES")`, dates via `.toLocaleDateString("es-ES")`, and code comments are written in Spanish — match the existing files.
- Any `eslint-disable-next-line` is always paired with a comment explaining why (see the pattern in `game-player.tsx` and `auth-provider.tsx`).
- `lib/games.ts` and `lib/scores.ts` are **not touched** — they are already generic (receive the Supabase client as their first parameter) and need no change to support a new game.

## Browser verification script

Each generated spec's acceptance criteria should include this sequence, run with the `mcp__claude-in-chrome__*` tools:

1. Open `/juegos` — the new card appears.
2. Open `/juegos/<id>` — "Mejor global" and "Partidas" both show `0` before any score exists.
3. Open `/juegos/<id>/jugar`, drive it with `computer` — confirm the React HUD tiles move in real time, "PAUSA" freezes the game for real (not just visually), and "FIN" shows both overlays (canvas + modal) with the same score.
4. Save a score from the modal.
5. `read_console_messages` — no errors.
6. `SELECT` against `scores` via MCP — confirm the row landed with the right `game_id`.
7. Reload `/juegos/<id>` — the leaderboard panel shows the real row.
8. Open `/salon-de-la-fama` — the new game's tab exists and shows the same row.

## Known debt — mention, don't fix (unless the user asks)

- The domain→UI `ScoreRow` mapper is duplicated three times: `app/juegos/[id]/page.tsx`, `app/salon-de-la-fama/page.tsx`, `components/hall-of-fame-tabs.tsx`.
- `app/salon-de-la-fama/page.tsx` does `const firstGame = games[0]` with no guard — would throw if `games` were ever empty.
- `components/home-content.tsx` advertises "12+ JUEGOS" and fake live activity while the real catalog has one or two entries — out of scope per SPEC 06, but worth a one-line mention if it would now be even more obviously wrong.
