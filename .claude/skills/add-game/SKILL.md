---
name: add-game
description: Designs the spec for adding a new playable game (with leaderboard) to Arcade Vault. Ports a game from references/started-games/ or designs one from scratch, asks about catalog metadata and HUD shape, and writes specs/NN-juego-<id>.md following the /spec skill's structure. Does not write game code.
disable-model-invocation: true
argument-hint: "<game-id> | reference folder name | short game description"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(date:*), mcp__supabase__execute_sql
---

# /add-game — Arcade game spec designer

`/add-game` is a **specialization of `/spec` for the domain "arcade game with leaderboard"**. It inherits from `/spec` the philosophy (the spec is the contract that drives execution), the document structure, and the save procedure. What it adds is the domain knowledge `/spec` cannot have on its own: how games get ported into this specific React/canvas/Supabase stack.

**This skill never writes code.** It only writes one file: `specs/NN-juego-<id>.md`. Implementation happens later, via `/spec-impl`.

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "specs/ does not exist yet"`

Reference games available to port from:
!`ls references/started-games/ 2>/dev/null || echo "references/started-games/ does not exist"`

Game components already ported:
!`ls components/games/ 2>/dev/null || echo "components/games/ does not exist"`

---

Your replies must be in the same language as the initial prompt. Since this repo's specs and CLAUDE.md are written in Spanish, that will normally mean Spanish.

## Phase 0 — Resolve the source

Classify `$ARGUMENTS` into one of three cases:

- It names (exactly, or as a recognizable suffix) a folder under `references/started-games/` listed in the session context above (e.g. `tetris` → `03-tetris`) → **port** mode.
- It is a single kebab-case token that does **not** match any reference folder → ask the user whether they mean a port of an unlisted reference or a from-scratch design.
- It reads as a descriptive sentence ("a memory game with colors") → **from-scratch** mode.

## Phase 1 — Read the context

All of the following, **before writing anything**, in this order:

1. **`.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md`.** This is where the document structure, the quality rules (verifiable acceptance criteria, no TODOs, concrete names), and the save procedure (sequential numbering, `Draft` state, never auto-approve, seed `specs/.spec-config.yml` if missing) come from. If either file is missing, fall back to `.agents/skills/spec/` (a byte-identical mirror in this repo). If neither location has them, say so explicitly instead of inventing a format.
2. `reference/game-spec-notes.md` (in this skill's own folder) — the repo's real deviations from that template, plus the recurring scope/risk content for a game spec.
3. `CLAUDE.md`, and the two most recent files in `specs/` — for live conventions and the next sequence number.
4. If in **port** mode: the full `game.js` and `index.html` of the chosen reference (plus `levels.js` and anything under `assets/` if present).
5. `components/games/asteroids-game.tsx` and `components/game-player.tsx` — the one real precedent, read as a living pattern.
6. `reference/port-recipe.md` and `reference/platform-integration.md` (in this skill's own folder).
7. `SELECT id FROM games` via `mcp__supabase__execute_sql` — to detect an `id` collision. **Read-only. Never INSERT, UPDATE, or run migrations from this skill.**

## Phase 2 — Extract the game's profile

Fill in this fact sheet explicitly (it feeds the spec's data model and plan later):

| Field                                | Example (`asteroides`)             | How to get it                           |
| ------------------------------------ | ---------------------------------- | --------------------------------------- |
| Logical canvas size                  | 800×600 (4:3)                      | `W`/`H` constants or `<canvas width>`   |
| Aspect ratio vs. `.crt-screen` (4/3) | matches                            | derived                                 |
| State variables                      | `score`, `lives`, `level`, `state` | top-level `let`s in the original        |
| HUD stats to surface                 | score, lives, level                | from the above                          |
| Internal HUD                         | drawn **on canvas**                | does it draw text, or write to the DOM? |
| Input                                | keyboard (`←→↑`, Space)            | listeners in the original               |
| Game-over condition                  | `state === "gameover"`             | the terminal state                      |
| `cancelAnimationFrame` present?      | no                                 | must be added when porting              |
| External assets                      | none                               | `assets/`, `new Audio`, spritesheets    |
| Script load-order dependencies       | none                               | multiple `<script>` tags in the HTML    |

Four hard cases to actively detect and name in the spec (see `reference/port-recipe.md` and `reference/platform-integration.md` for the full treatment of each):

- **HUD lives in the DOM**, not the canvas (Tetris: writes to `#score`/`#lines`/`#level`, has a `<div id="overlay">`). Ask whether to redraw it on canvas (fidelity with `asteroides`) or delegate it entirely to the React HUD.
- **Stats that don't fit score/lives/level** (Tetris has _lines_, no lives; Arkanoid has _levels_ driven by a `LEVELS` table). Solved by the registry's `hudStats` list — name which stats this game needs.
- **Aspect ratio other than 4:3** (Tetris: 300×600, i.e. 1:2). Ask: letterbox centered inside `.crt-screen`, or a per-game CSS override of `aspect-ratio`?
- **Assets and audio** (Arkanoid: a spritesheet PNG + two `.mp3`s). These move to `public/games/<id>/` and get referenced by absolute path.

## Phase 3 — Ask (blocks of 3–5, via `AskUserQuestion`)

Always propose concrete values — never an open-ended question. The user has said metadata is never derived silently; always confirm it explicitly here.

1. `id` (final), `title` (uppercase), `short` (one sentence), `long` (2–3 sentences) — propose values drawn from the reference code or description, but ask.
2. `cat` (`ARCADE` / `PUZZLE` / `SHOOTER` / `VERSUS` — constrained by a Postgres `check`) and `color` (`cyan` / `magenta` / `yellow` / `green`).
3. **Cover art:** a new `.cover-<id>` block, or reuse one of the orphaned ones left in `app/arcade-vault.css` after SPEC 06 (`cover-bricks`, `cover-tetro`, `cover-snake`, `cover-glot`, `cover-invaders`, `cover-rocas`, `cover-rana`, `cover-duelo`)? Recommend a reuse when the original name's theme matches (`cover-tetro` for a Tetris, `cover-bricks` for an Arkanoid) — saves writing new CSS.
4. HUD stats and their labels; aspect ratio; whether the internal HUD lives on canvas or only in React; what "PAUSA"/"FIN"/"JUGAR DE NUEVO" do for this game.
5. **From-scratch only:** core mechanic, end condition, scoring model, difficulty progression.

## Phase 4 — Write the spec, following `template.md`

Section order, header format, acceptance-criteria rules, and the decisions section all come from the template read in Phase 1 — this skill does not define a competing format. Apply `/spec`'s fast path too: once Phase 3 is closed, write the complete spec and save it, no section-by-section confirmation.

What `/add-game` contributes is the **content**: the Phase 2 fact sheet feeds the data model section; the checklist in `reference/platform-integration.md` feeds the implementation plan; the browser verification script from `reference/platform-integration.md` feeds the acceptance criteria; the decisions and risks catalogued in `reference/game-spec-notes.md` feed the decisions/risks sections.

The implementation plan's first steps must always be, in this order, when `components/games/registry.ts` does not yet exist (check the session context listing of `components/games/`):

1. Introduce `components/games/registry.ts` and the shared `ArcadeGameHandle`/`ArcadeGameProps`/`ArcadeGameEntry` types (see `reference/platform-integration.md` for the exact shape).
2. Adapt `asteroids-game.tsx` to the new shared props (`onStatsChange` instead of four separate callbacks) and register it.
3. Adapt `game-player.tsx` to read from the registry instead of the `if (game.id === "asteroides")` check.
4. Only then: port the new game's logic, register it, add its catalog row and cover art.

If the registry already exists, skip straight to step 4's content for the new game.

## Phase 5 — Save and stop, with `/spec`'s procedure

- Sequential numbering from the `specs/` listing in the session context (today: `07-`), filename `NN-juego-<id>.md`.
- `**Fecha:**` taken from the session context above — never invented.
- `**Estado:** Borrador` — never auto-approve.
- `**Depende de:**` always includes `SPEC 06` (it defined `games`/`scores` and the Supabase-backed catalog); verify every other referenced spec actually exists in `specs/`.
- Seed `specs/.spec-config.yml` only if it is missing (in this repo it already exists — leave it untouched).
- Confirm to the user: the path written, a reminder that it is in `Borrador` state, and that the next step is `/spec-impl NN-juego-<id>`. **Stop there.**

## Hard rules

- **Never write game code**, and never touch `app/`, `components/`, `lib/`, or `app/arcade-vault.css`. The only file this skill writes is the spec's `.md`.
- **Never run a migration or an INSERT in Supabase.** `mcp__supabase__execute_sql` is for the collision-check `SELECT` only.
- **Never propose implementing the spec after saving it.**
- **Never write the spec without first reading `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md`.** The document structure comes from there.
- Where this repo's real specs deviate from that template, the repo wins (and `/spec` itself says to follow the existing specs' conventions): the spec is written in **Spanish**, with a bold-line header (`**Estado:**` / `**Depende de:**` / `**Fecha:**` / `**Objetivo:**`), not the English blockquote from the template. These deviations are catalogued in `reference/game-spec-notes.md`.
- If the chosen `id` already exists in the `games` table, stop and ask before continuing.
- If the reference brings binary assets or uses `localStorage`, name that explicitly in the spec — never leave it implicit.
- Catalog metadata (`title`, `short`, `long`, `cat`, `color`, `cover`) stays in the `games` table, exactly as SPEC 06 left it. Do not propose moving it into the registry — that was considered and explicitly rejected (editing text without a deploy matters more than avoiding one migration per game).
