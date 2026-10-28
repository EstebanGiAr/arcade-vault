# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: plataforma para jugar juegos arcade online y competir por la mayor cantidad de puntos. La UI está implementada por completo (home, catálogo, detalle, reproductor, salón de la fama, about/contacto, login) y hay cinco juegos jugables: **asteroides**, **tetris**, **arkanoid**, **snake** y **frogger**. El catálogo y las puntuaciones viven en Supabase.

No hay suite de tests configurada todavía: la verificación de cada feature se hace en el navegador (ver `/spec-impl`).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript, con Tailwind CSS v4 vía el loader de `@tailwindcss/turbopack` (configurado en `next.config.ts`).
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`) para catálogo y leaderboard.
- Resend para el formulario de contacto.
- Alias de import `@/*` apunta a la raíz del proyecto (ver `tsconfig.json`).
- `next.config.ts` habilita `cacheComponents`, `partialPrefetching` y `experimental.agentFeedback`, y declara `allowedDevOrigins` para probar el servidor de desarrollo desde un dispositivo móvil real en la misma LAN. Next.js 16 introduce cambios de API respecto a versiones previas — si surgen dudas sobre convenciones o APIs, consultar `node_modules/next/dist/docs/` antes de asumir comportamiento de versiones anteriores (ver nota en `AGENTS.md`, que es regenerada automáticamente por `next dev`, no editar a mano).

Scripts: `npm run dev`, `build`, `start`, `lint`, `format`, `format:check`.

## Arquitectura

### Rutas (`app/`)

- `page.tsx` → home/landing (`components/home-content.tsx`).
- `juegos/page.tsx` → catálogo con filtros (`components/games-browser.tsx`).
- `juegos/[id]/page.tsx` → detalle + top 10 del juego. Usa `generateStaticParams` con `createStaticClient()`.
- `juegos/[id]/jugar/page.tsx` → reproductor (`components/game-player.tsx`).
- `salon-de-la-fama/page.tsx` → ranking global por juego, pestaña inicial vía `?juego=<id>`.
- `about/page.tsx` + `api/contact/route.ts` → formulario de contacto por Resend.
- `login/page.tsx` → "sesión" ligera (solo nombre) persistida en `localStorage`.

Las páginas que leen datos en vivo declaran `export const instant = false`, porque bajo `cacheComponents` no pueden prerenderizarse como shell estático. Mantener ese patrón al añadir páginas con lectura de Supabase.

### Estilos

`app/arcade-vault.css` es un port literal del prototipo en `references/templates/styles.css`: variables CSS (`--cyan`, `--magenta`, `--yellow`, `--green`, `--line`, `--ink-faint`, `--mono`), clases `neon-*`, `.btn`, `.crt-screen`, `.leaderboard`, `.cover-*`, etc. Fidelidad visual al prototipo es un requisito explícito del usuario: preferir estas clases antes que inventar utilidades Tailwind nuevas. Fuentes: Press Start 2P (`--font-pixel`), JetBrains Mono, Courier Prime (`app/layout.tsx`).

`.impeccable/config.json` registra excepciones aceptadas del detector de la skill `impeccable` (`gradient-text`, `side-tab` en `arcade-vault.css`) justificadas por ese port literal. No "corregir" esas reglas.

### Juegos

Todos los juegos viven en `components/games/` y se exponen por el **registry** (`components/games/registry.ts`), que es el único punto de acoplamiento con el reproductor:
consultar `references/implemented-games.md` cuando se necesite saber qué juegos están implementados. `references/game-suggestions.md` es el backlog de candidatos (pendientes/implementados/descartados) mantenido por el agente `game-planner`.

```ts
GAME_REGISTRY: Record<string, ArcadeGameEntry>;
// component: ComponentType<ArcadeGameProps & RefAttributes<ArcadeGameHandle>>
// hudStats: HudStatKey[]  ("score" | "lives" | "level" | "lines")
// initialStats: ArcadeStats
// aspectRatio?: string       (p. ej. "1 / 2" en tetris, "8 / 7" en frogger; por defecto 4/3)
// skinOverrides?: Partial<Record<SkinId, Partial<GameSkin>>>  (paleta por skin, ver más abajo)
```

Módulos compartidos en `components/games/`, además de los juegos:

- `skins.ts` — `SkinId` (`clasico`/`neon`/`retro`), `GameSkin`, `GAME_SKINS`, `resolveSkin`/`applySkinOverride`/`hexToRgba`. Cada juego aplica aquí su `skinOverrides` del registry.
- `canvas.ts` — `setupResponsiveCanvas`, con tope de DPR (SPEC 10/13).
- `touch-controls.tsx` — `TouchControls`, con una entrada por juego en `TOUCH_CONTROLS` (SPEC 11/12); el agente `mobile-porter` la mantiene sincronizada con `GAME_REGISTRY`.

Contrato de cada componente de juego:

- Props: `paused`, `onStatsChange(stats)`, `onGameOver(finalScore)`.
- Ref imperativa (`ArcadeGameHandle`): `restart()`, `forceGameOver()`.
- Canvas con tamaño lógico fijo y redimensionado responsivo; el HUD de React lo pinta `game-player.tsx` a partir de `hudStats`.
- Siempre cancelar el loop con `cancelAnimationFrame` al desmontar y al pausar.

`game-player.tsx` resuelve el juego por `game.id`; si no hay entrada en el registry, cae a un modo decorativo (puntuación simulada) para juegos del catálogo aún sin implementar.

`ArcadeGameProps` incluye `skin: GameSkin` (tipo y paletas en `components/games/skins.ts`). Los juegos leen el color siempre vía `skinRef.current` (ref sincronizada por `useEffect`, nunca dependencia del loop principal) en vez de literales hardcodeados. Los cinco juegos del registry ya tienen sus tres skins (`clasico`/`neon`/`retro`); `references/game-with-themes.md` es el registro que mantiene el agente `skin-designer`.

Los assets de cada juego van en `public/games/<id>/` y se referencian por ruta absoluta.

`app/data.ts` concentra los tipos de UI compartidos (`Game`, `GameCategory`, `ScoreRow`, `CATS`), consumidos por los componentes y por `lib/games.ts`; la metadata real de cada juego sigue viniendo de Supabase, no de este archivo.

### Datos (Supabase)

- Tablas: `games` (catálogo: `id`, `title`, `short`, `long`, `cat`, `color`, `cover`) y `scores` (`game_id`, `name`, `score`, `created_at`).
- `cat` está restringida por un `check` de Postgres a `ARCADE` / `PUZZLE` / `SHOOTER` / `VERSUS`; `color` a `cyan` / `magenta` / `yellow` / `green`.
- Acceso siempre por los helpers de `lib/`: `lib/games.ts` (`getAllGames`, `getRealGames`, `getGameById`) y `lib/scores.ts` (`saveScore`, `getTopScores`, `getBestScoreByName`). No consultar Supabase directamente desde componentes.
- Clientes: `lib/supabase/server.ts` (server components, con cookies), `client.ts` (browser), `static.ts` (sin cookies, para `generateStaticParams`). Tipos generados en `lib/supabase/database.types.ts`.
- La metadata del catálogo vive en la tabla `games`, **no** en el registry. Fue una decisión deliberada (editar textos sin deploy) — no proponer moverla.
- Hay un MCP de Supabase configurado en `.mcp.json` apuntando al proyecto. Útil para `SELECT`s de verificación; migraciones e `INSERT`s solo cuando la spec lo pida explícitamente.
- Variables de entorno en `.env.template`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`.

### Sesión

No hay auth real. `components/auth-provider.tsx` + `lib/storage.ts` guardan solo `{ name }` en `localStorage` (clave `av_user`). La lectura se difiere al montaje en cliente para evitar mismatches de hidratación; mantener ese patrón.

## Herramientas del repo

- **Formateo automático:** un hook `PostToolUse` (`.claude/settings.json` → `.claude/hooks/format-file.mjs`) corre Prettier sobre cualquier archivo formateable y `eslint --fix` sobre código JS/TS tras cada `Write`/`Edit`/`NotebookEdit`. Solo aplica en este repo — no hace falta formatear a mano.
- **`references/`** no es código de producción:
  - `references/templates/` → prototipo HTML/JSX original de la UI.
  - `references/gamepad-assets/` → assets del rediseño de controles táctiles (SPEC 12).
  - `references/implemented-games.md`, `references/game-with-themes.md`, `references/game-performance.md`, `references/game-suggestions.md` → registros vivos que mantienen los agentes de la sección de abajo, cada uno con su propio alcance.

## Skills y agentes

Cada entrada enlaza su definición completa; no duplicar aquí sus reglas internas.

### Subagentes (`.claude/agents/`)

- **game-planner** — decide qué juego añadir a continuación y mantiene el backlog `references/game-suggestions.md`. → `.claude/agents/game-planner.md`
- **game-jam** — convierte un juego ya decidido en un dossier de tres specs secuenciales en `specs/game-jam/<game-id>/`. → `.claude/agents/game-jam.md`
- **skin-designer** — implementa las skins `clasico`/`neon`/`retro` de un solo juego por invocación. → `.claude/agents/skin-designer.md`
- **mobile-porter** — audita y corrige la experiencia móvil de todo el sitio en cada invocación. → `.claude/agents/mobile-porter.md`
- **game-performance-booster** — audita y corrige el performance de render de un solo juego, midiendo FPS en Chrome. → `.claude/agents/game-performance-booster.md`

### Skills (`.claude/skills/`)

- **`/spec`, `/spec-impl`** — flujo spec-driven (instaladas de `Klerith/fernando-skills`; espejo en `.agents/skills/`). → `.claude/skills/spec/`, `.claude/skills/spec-impl/`
- **`/add-game`** — diseña la spec de un juego nuevo con leaderboard; especialización de `/spec`. Local al repo. → `.claude/skills/add-game/`
- **`/spec-impl-game`** — como `/spec-impl`, y al cerrar la spec dispara en secuencia `skin-designer` y luego `mobile-porter`. Local al repo. → `.claude/skills/spec-impl-game/`
- **`/impeccable`** — diseño/revisión de UI, respetando las excepciones de `.impeccable/config.json`. Skill global, instalada fuera del repo.

Pipeline: `game-planner` → `/add-game` → `/spec-impl-game`. `game-jam` y los tres agentes de pulido (`skin-designer`, `mobile-porter`, `game-performance-booster`) quedan fuera de ese pipeline. Ningún agente de esta lista hace commits.

## Flujo de trabajo: Spec Driven Design

El proyecto sigue spec-driven design con `/spec` y `/spec-impl` (skills de Fernando Herrera, instaladas en `.claude/skills/` y espejadas en `.agents/skills/`):

```bash
npx skills@latest add Klerith/fernando-skills
```

Reglas vigentes del flujo:

- Toda feature nueva pasa por una spec en `specs/` antes de tocar código. Numeración secuencial (`NN-slug.md`); van 13 specs, todas cerradas (el estado final aparece como `Implementado` en las primeras once y `Implementada` en las últimas; ambas formas cuentan — usar `Implementada` en specs nuevas).
- Las specs se escriben **en español**, con cabecera de líneas en negrita (`**Estado:**` / `**Depende de:**` / `**Fecha:**` / `**Objetivo:**`), que es la desviación aceptada respecto al `template.md` en inglés. Al escribir una spec nueva, seguir las dos últimas de `specs/` como referencia.
- Nacen en `**Estado:** Borrador`; nunca auto-aprobar. Al terminar la implementación se pasan a `Implementada` y se marcan los criterios de aceptación.
- `specs/.spec-config.yml` tiene `AutoCreateBranch: true`: `/spec-impl` crea y cambia a la rama `spec-NN-slug` sin preguntar. El trabajo se integra a `main` por PR.
- En `/spec-impl`, verificar en Chrome **solo al final**, no tras cada paso intermedio.
- Las specs bajo `specs/game-jam/<game-id>/` (generadas por el subagente `game-jam`) son borradores exploratorios con numeración local a su propia carpeta, fuera de la secuencia `NN-slug.md` de `specs/`; se renumeran e integran a esa secuencia solo cuando un humano las revisa y decide promoverlas.
