# Game spec notes

This file does **not** repeat `.claude/skills/spec/template.md` — it complements it. Read the template first; use this for what's specific to this repo and to the "arcade game" domain.

## (a) How this repo's real specs deviate from `template.md`

Verified against `specs/05-juego-asteroides.md` and `specs/06-catalogo-y-leaderboard-supabase.md`. Follow the repo, not the template, on these points:

| `template.md` says                                    | This repo actually does                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Header as a blockquote (`> **Status:**`)              | Bare bold lines (`**Estado:**`, one per line, no blockquote)                           |
| Title `# SPEC NN — Title`                             | `# NN — Title`                                                                         |
| English states (`Draft`/`Approved`/`Implemented`)     | Spanish (`Borrador`/`En revisión`/`Aprobado`/`Implementado`/`Obsoleto`)                |
| `## Scope` with `**In:**` / `**Out of scope**`        | `## Alcance` with `**Incluido:**` / `**No incluido (fuera de alcance de este spec):**` |
| A final reinforcement section repeating what's NOT in | Omitted — the "No incluido" block in Alcance already does this job                     |
| `## Risks` optional                                   | Always present in the two existing game specs, as a table                              |

One extra field the template doesn't mention: `**Actualizado:**`, used by `specs/06` when a decision changes mid-implementation. Add it only if that actually happens during this spec's own lifecycle — don't pre-emptively add it to a fresh `Borrador`.

## (b) Recurring scope content for a game spec

Adapt these, don't copy them verbatim — they're the checklist of things a "new game" spec in this repo tends to need, drawn from what SPEC 05 covered:

**Incluido, typically:**

- The catalog row's shape (even though it's written via migration, not in this spec's code).
- The new component under `components/games/` and what it ports.
- The registry entry (and, if this is the first non-`asteroides` game, the registry's own introduction — see `platform-integration.md`).
- Cover art: new block or reused orphan.
- Assets, if any, and where they move to.
- Controls: keyboard only, matching the original, unless the user says otherwise.
- What "PAUSA"/"REANUDAR", "FIN", and "JUGAR DE NUEVO" do for this specific game.
- The save-score flow, reusing `saveScore`/`lib/scores.ts` unchanged.

**No incluido, typically** (unless the user explicitly asks for one of these):

- Touch controls or small-screen adaptation beyond responsive canvas resizing.
- Anti-cheat / score validation (scores are insertable from the client with no auth — accepted risk, deferred).
- Real Supabase Auth (scores are still identified by free-text name).
- Automated tests (the project has no test suite configured).
- Visual redesign of any existing screen.
- Any change to the `rocas` decorative entry or other already-decided-dead code, unless this spec is specifically about removing it.

## (c) Known risks catalog — reuse, don't re-derive

| Risk                                                                                                                                                | Mitigation                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode double-mounts effects in development, which can duplicate keyboard listeners or `requestAnimationFrame` loops.                    | The main `useEffect` must clean up explicitly (`cancelAnimationFrame`, `removeEventListener`) in its return function.                             |
| The dual HUD (canvas + React) can drift out of sync if callbacks aren't invoked in the same frame the internal state actually changed.              | Callbacks fire inside the same `update()`/`reportChanges()` pass, right after mutating state — never in a `setTimeout` or a separate effect.      |
| `ResizeObserver` firing very frequently (e.g. during layout animations) can cause flicker or CPU cost.                                              | Only touch `canvas.width`/`canvas.height` when the real pixel size actually changed from the cached value, not on every observer callback.        |
| `generateStaticParams` depends entirely on an async Supabase query; if Supabase is unreachable at build time, no static params get generated.       | Confirm dynamic rendering still works as a fallback; this is already handled platform-wide, just verify it isn't broken for the new game's route. |
| The `scores` insert policy is wide open (`with check (true)`) — scores for any game are as forgeable as the old localStorage-based fake games were. | Accepted as part of current scope; anti-cheat is deferred to a future spec once real Auth exists. Don't try to solve it per-game.                 |
