# 01 — Pantallas MVP visual de Arcade Vault

**Estado:** Implementado
**Depende de:** —
**Fecha:** 2026-10-21

**Objetivo:** Portar al stack Next.js 16 / React 19 / TypeScript / Tailwind v4 del proyecto las cinco pantallas visuales del prototipo estático en `references/templates/` (Biblioteca, Detalle, Reproductor, Login y Salón de la Fama), con rutas reales, datos mock y persistencia solo en `localStorage`, sin implementar lógica de juego real ni backend.

## Alcance

**Incluido:**

- Migración de `references/templates/styles.css` a una hoja de estilos global del proyecto, conservando el tema retro-neón (variables CSS, animaciones, scanlines, grid de fondo, CRT) tal como está en el template.
- Migración de fuentes del template (`Press Start 2P`, `JetBrains Mono`, `Courier Prime`) a `next/font/google` en `app/layout.tsx`, reemplazando las fuentes Geist actuales.
- Rutas reales de App Router:
  - `/` → Biblioteca (grid de juegos, búsqueda, filtro por categoría).
  - `/juegos/[id]` → Detalle del juego (info, tags, leaderboard, botón jugar).
  - `/juegos/[id]/jugar` → Reproductor (HUD simulado, pantalla CRT, modal de fin de juego, guardado de puntuación).
  - `/login` → Auth (login/registro mock, invitado, botones sociales decorativos).
  - `/salon-de-la-fama` → Hall of Fame (tabs por juego, podio, tabla de puntuaciones, fila del usuario).
- Navegación (`Nav`) con logo, enlaces activos, contador de créditos estático, botón de sesión y menú hamburguesa responsive, igual que `nav.jsx`.
- Datos mock tipados en `app/data.ts` (`GAMES`, `CATS`, `PLAYERS`, `seededScores`), equivalentes a `data.jsx`. Este archivo es un stand-in temporal: cuando exista una base de datos real, su contenido se reemplazará por llamadas a esa fuente sin cambiar la forma de los tipos exportados.
- Persistencia solo en `localStorage` vía helpers en `lib/storage.ts`: usuario de sesión (`av_user`) y puntuaciones guardadas (`av_scores`).
- Estado de sesión compartido entre rutas mediante un `AuthProvider` cliente (React Context) que envuelve el layout raíz, para que `Nav`, Reproductor y Salón de la Fama lean/actualicen el mismo usuario sin prop-drilling manual entre páginas.
- Todas las animaciones e interacciones del template: tilt 3D en las tarjetas de juego, flicker del título, scanlines, grid animado, pulse de botones, transiciones `fade-in`/`slide-in`.
- Simulación del Reproductor idéntica al template: puntaje que sube solo mediante `setInterval` aleatorio, subida de nivel cada 2500 puntos, pausa, fin de juego y modal para guardar la puntuación con iniciales.
- Responsive básico (menú móvil tipo drawer), igual que el template.

**No incluido (fuera de alcance de este spec):**

- Cualquier lógica de juego real jugable (los 8 juegos del catálogo siguen siendo solo mock/portada).
- Backend, API routes o base de datos. No hay autenticación real ni validación de credenciales.
- Botones de login social (Google/GitHub) funcionales — quedan como decorativos, igual que en el template.
- Sistema de créditos/monedas funcional — el contador "CRÉDITOS · 03" queda estático.
- Tests automatizados (el proyecto no tiene suite configurada).
- Cualquier feature de multijugador, sonido, o guardado en servidor.
- Optimización SEO/metadata más allá de lo que ya trae el scaffold de `create-next-app`.

## Modelo de datos

Todo vive en `app/data.ts` y `lib/storage.ts`, sin base de datos.

```ts
// app/data.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;       // nombre de clase CSS de portada (cover-bricks, cover-tetro, ...)
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;        // ya formateado, ej. "12.4K"
};

export const GAMES: Game[];
export const CATS: Array<"TODOS" | GameCategory>;
export const PLAYERS: string[];

export type ScoreRow = { rank: number; name: string; score: number; date: string };
export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// lib/storage.ts
export type SessionUser = { name: string };
export type SavedScore = { game: string; score: number; name: string; at: number };

export function getUser(): SessionUser | null;
export function setUser(user: SessionUser | null): void; // null = invitado/logout
export function saveScore(entry: Omit<SavedScore, "at">): void;
export function getScores(): SavedScore[];
```

El `AuthProvider` (`components/auth-provider.tsx`) envuelve estos helpers en un Context de React (`user`, `login(user)`, `logout()`), inicializando el estado desde `getUser()` en el cliente.

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. Migrar fuentes y tema base: reemplazar las fuentes Geist en `app/layout.tsx` por `Press_Start_2P`, `JetBrains_Mono` y `Courier_Prime` vía `next/font/google`; crear `app/arcade-vault.css` portando `references/templates/styles.css` (variables, fondo `av-bg`/`av-noise`, animaciones) e importarlo desde `app/layout.tsx` junto a `globals.css`.
2. Crear `app/data.ts` con los tipos y los datos mock (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) traducidos desde `data.jsx`.
3. Crear `lib/storage.ts` con los helpers de `localStorage` para usuario (`av_user`) y puntuaciones (`av_scores`).
4. Crear `components/auth-provider.tsx` (Context cliente) y envolver `{children}` en `app/layout.tsx` con `<AuthProvider>`.
5. Crear `components/nav.tsx` (client component), adaptando `nav.jsx`: usa `usePathname`/`next/link` para resaltar la ruta activa, consume `AuthProvider` para mostrar "Iniciar Sesión" o el nombre del usuario, y mantiene el drawer móvil.
6. Actualizar `app/layout.tsx` para renderizar `<div className="av-bg" />`, `<div className="av-noise" />`, `<Nav />`, `{children}` dentro de `<main className="av-main">` y el footer, reemplazando el contenido boilerplate actual.
7. Crear `components/game-card.tsx` con el tilt 3D al mouse (`onMouseMove`/`onMouseLeave`), igual que `biblioteca.jsx`.
8. Reemplazar `app/page.tsx` con la pantalla Biblioteca: hero, buscador, chips de categoría y grid de `GameCard`, enlazando cada tarjeta a `/juegos/[id]`.
9. Crear `app/juegos/[id]/page.tsx` (Detalle): portada, tags, descripción, stat-strip, leaderboard (`seededScores`) y botones "Jugar ahora"/"Volver al vault"; si el `id` no existe en `GAMES`, usar `notFound()`.
10. Crear `app/juegos/[id]/jugar/page.tsx` (Reproductor): HUD, pantalla CRT simulada, pausa, fin de juego, modal de guardado de puntuación usando `saveScore` de `lib/storage.ts` y el usuario del `AuthProvider`.
11. Crear `app/login/page.tsx` (Auth): tabs "Iniciar sesión"/"Crear cuenta", formulario mock que llama a `login()` del `AuthProvider` y redirige a `/`, botón de invitado, botones sociales decorativos.
12. Crear `app/salon-de-la-fama/page.tsx` (Hall of Fame): tabs por juego, podio (top 3), tabla completa y fila "tu mejor marca" cuando hay usuario en sesión.
13. Revisar el comportamiento responsive (drawer móvil, grid de tarjetas) y correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [x] `/` muestra el grid de los 8 juegos de `GAMES`, con buscador funcional y filtro por categoría (`TODOS`, `ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`).
- [x] Al hacer clic en una tarjeta o en "JUGAR", se navega a `/juegos/[id]` con la info correcta del juego (portada, descripción, leaderboard, stats).
- [x] Desde el Detalle, "▶ JUGAR AHORA" navega a `/juegos/[id]/jugar` y muestra el HUD con puntaje que sube solo, vidas, nivel, pausa y botón de fin.
- [x] Al finalizar la partida, se puede guardar la puntuación con iniciales; tras guardar, aparece el mensaje de confirmación y la puntuación queda en `localStorage` (`av_scores`).
- [x] `/login` permite "iniciar sesión" con cualquier usuario/contraseña (mock), "crear cuenta", o entrar como invitado; tras cualquiera de las tres acciones, `Nav` refleja el estado de sesión (nombre de usuario o botón "Iniciar Sesión") en todas las rutas sin recargar manualmente.
- [x] Cerrar sesión desde `Nav` borra el usuario de `localStorage` y vuelve a mostrar "Iniciar Sesión".
- [x] `/salon-de-la-fama` muestra tabs por juego, podio top 3, tabla completa, y —si hay usuario en sesión— la fila "tu mejor marca".
- [x] El menú hamburguesa móvil abre/cierra el drawer y permite navegar a las mismas rutas que el menú de escritorio.
- [x] El tema visual (colores, tipografías Press Start 2P/JetBrains Mono, scanlines, grid animado, tilt 3D de tarjetas) se ve igual al prototipo de `references/templates/`.

## Decisiones tomadas y descartadas

- **CSS:** se porta `styles.css` casi literal como hoja global (`app/arcade-vault.css`), en vez de reescribir todo en utilidades Tailwind. Razón: el tema retro-neón depende de animaciones y selectores muy específicos; reescribirlo en Tailwind arriesga a que el look deje de coincidir con el prototipo sin aportar valor al MVP.
- **Routing:** se usan rutas reales de App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/login`, `/salon-de-la-fama`) en vez de mantener el router por hash de una sola página del template. Razón: aprovechar el modelo de Next.js (URLs compartibles, code-splitting por ruta) en vez de replicar una limitación del prototipo estático.
- **Reproductor:** se mantiene exactamente la simulación de puntaje por `setInterval` aleatorio del template, sin introducir ningún juego jugable. Razón: coincide explícitamente con el pedido del usuario ("no hay que implementar ningún juego").
- **Persistencia:** solo `localStorage`, sin preparar una capa de abstracción pensada para un backend futuro. Razón: elegido explícitamente por el usuario para no añadir complejidad no pedida en un MVP visual.
- **Fuentes:** se migran a `next/font/google` en vez de mantener los `<link>` de Google Fonts del HTML original. Razón: es la convención que ya usa el proyecto para Geist y evita una carga de fuentes fuera del pipeline de Next.js.
- **Datos mock:** viven en `app/data.ts` como módulo TypeScript tipado (no JSON + helpers separados), en vez de `lib/data.ts`. Razón: elegido explícitamente por el usuario, pensando en que este archivo se reemplace más adelante por una fuente de base de datos real sin mover su ubicación ni cambiar los tipos que consumen las páginas.
- **Estado de sesión entre rutas:** se introduce un `AuthProvider` (Context de React) en el layout raíz, en vez de que cada página lea `localStorage` por su cuenta. Razón: el template original mantenía el usuario en el estado de un único componente `App`; al pasar a rutas reales de App Router, cada página se monta por separado, así que se necesita un punto compartido para que `Nav`, el Reproductor y el Salón de la Fama vean el mismo usuario sin recargar la página.
- **Fidelidad visual:** se replican todas las animaciones e interacciones del template (tilt 3D, flicker, scanlines, pulse), sin recortar ninguna para simplificar. Razón: elegido explícitamente por el usuario para un MVP "solo visual".

## Riesgos identificados

- **Hidratación:** leer `localStorage` (usuario, puntuaciones) durante el render inicial puede causar mismatches de hidratación en Next.js. Mitigación: inicializar el estado del `AuthProvider` en `useEffect` del lado cliente y marcar los componentes que lo usan con `"use client"`.
- **Conflicto Tailwind Preflight vs. CSS portado:** el `preflight` de Tailwind v4 normaliza estilos base que podrían chocar con las reglas de `styles.css` (botones, inputs, `box-sizing`). Mitigación: revisar visualmente cada pantalla tras portar el CSS y ajustar especificidad si algo se ve distinto al prototipo.
