# 02 — Home landing page

**Estado:** Aprobado
**Depende de:** SPEC 01
**Fecha:** 2026-10-22

**Objetivo:** Reemplazar la pantalla actual de `/` (Biblioteca) por el landing de marketing `home.jsx` del prototipo de `references/templates/home-about/`, moviendo la Biblioteca a `/juegos` y actualizando navegación y redirects de sesión en consecuencia.

## Alcance

**Incluido:**

- Nueva pantalla Home en `/` con todas las secciones de `home.jsx`: hero (silueta pixel flotantes, eyebrow, título de 3 líneas, subtítulo, CTAs, indicador de scroll), sección "¿Por qué Arcade Vault?" (4 feature cards con iconos pixel), sección "Juegos disponibles ahora" (preview de 6 juegos con mini-cards), sección de estadísticas (3 bloques), sección "Actividad en vivo" (ticker de últimas puntuaciones + top 5 jugadores del día), sección de precios (plan único gratis + FAQ), y CTA final.
- Migración de la Biblioteca actual (contenido hoy en `app/page.tsx`) a una nueva ruta `app/juegos/page.tsx`, sin cambios de comportamiento respecto a lo implementado en SPEC 01.
- Animaciones `reveal` (fade/slide al hacer scroll vía `IntersectionObserver`), igual que el template, reutilizando la clase `.reveal`/`.reveal.in` ya usada en el resto del proyecto si existe, o portándola si no.
- Migración del bloque CSS `HOME PAGE` de `references/templates/home-about/styles.css` (siluetas flotantes, hero, feature-grid, mini-rail, stats, activity ticker, pricing, final CTA) a `app/arcade-vault.css`, ya que SPEC 01 no lo incluyó.
- Actualización de `components/nav.tsx`: agregar link "Inicio" apuntando a `/`, cambiar el link "Biblioteca" para apuntar a `/juegos` (desktop y drawer móvil), y actualizar la detección de ruta activa (`isLibrary`, etc.) en consecuencia.
- Actualización de los redirects de sesión en `app/login/page.tsx` (login y "jugar como invitado") y en `components/nav.tsx` (cerrar sesión) para apuntar a `/juegos` en vez de `/`.
- Nuevo componente `components/mini-game-card.tsx` para las mini-cards de la sección "Juegos disponibles ahora", reutilizando el tipo `Game` de `app/data.ts` y navegando a `/juegos/[id]` igual que `GameCard`.
- Datos de "Actividad en vivo" (ticker de puntuaciones) y "Top jugadores · hoy" hardcodeados como constantes locales dentro de `app/page.tsx`, igual que en `home.jsx` (sin pasar por `app/data.ts` ni `lib/storage.ts`).
- Todos los CTAs del Home navegan a rutas reales existentes: "Explorar juegos" / "Ver todos los juegos" / CTA final → `/juegos`; "Crear cuenta" / "Empezar gratis" → `/login`; "Ver salón" → `/salon-de-la-fama`; cada mini-card → `/juegos/[id]`.

**No incluido (fuera de alcance de este spec):**

- La página "Acerca de" + Contacto (`about.jsx`). Queda para un spec posterior; el link "Acerca de" no se agrega al Nav todavía.
- Cualquier lógica real detrás de "Actividad en vivo" o "Top jugadores" (son datos de ejemplo estáticos, sin conexión a `localStorage` ni a partidas reales).
- Cambios al modelo de datos de `app/data.ts` o a `lib/storage.ts`.
- Cambios a las pantallas de Detalle, Reproductor, Login o Salón de la Fama más allá de actualizar sus redirects/enlaces de navegación.
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

Este spec no introduce estructuras de datos nuevas en `app/data.ts` ni en `lib/storage.ts`. Las únicas "estructuras" nuevas son constantes locales de UI dentro de `app/page.tsx`, equivalentes a los arrays inline de `home.jsx`:

```ts
// dentro de app/page.tsx, solo para la sección "Actividad en vivo"
type ActivityRow = { p: string; g: string; s: number; t: string; c: "magenta" | "yellow" | "green" | "cyan" };
type TopPlayerRow = { r: number; p: string; s: number };
```

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. Crear `app/juegos/page.tsx` con el contenido actual de `app/page.tsx` (Biblioteca: hero, buscador, chips de categoría, grid de `GameCard`), sin modificar su lógica.
2. Actualizar `components/game-card.tsx` si fuera necesario (no debería requerir cambios: ya navega a `/juegos/[id]`, ruta que no cambia).
3. Actualizar `components/nav.tsx`: agregar link "Inicio" (`/`), cambiar "Biblioteca" para apuntar a `/juegos`, ajustar `isLibrary` para que detecte `/juegos` y sus subrutas, y agregar detección de ruta activa para "Inicio" (`pathname === "/"`).
4. Actualizar `app/login/page.tsx`: cambiar `router.push("/")` por `router.push("/juegos")` en `submit` y en `playAsGuest`.
5. Actualizar `handleSignOut` en `components/nav.tsx` para redirigir a `/juegos` en vez de `/`.
6. Portar el bloque CSS `HOME PAGE` (y la utilidad `.reveal`/`.reveal.in` si no existe aún) de `references/templates/home-about/styles.css` a `app/arcade-vault.css`.
7. Crear `components/mini-game-card.tsx` (client component) con la portada (`cover-bg` + clase de `game.cover`), título y categoría, navegando a `/juegos/[id]` al hacer clic.
8. Reescribir `app/page.tsx` como el nuevo Home: hero con siluetas flotantes (SVGs pixel inline, como en `FloatingSilhouettes` de `home.jsx`), sección de features, sección de preview de juegos (`GAMES.slice(0, 6)` con `MiniGameCard`), sección de estadísticas, sección de actividad en vivo (constantes locales), sección de precios + FAQ, y CTA final; aplicar `IntersectionObserver` para las clases `reveal`.
9. Revisar responsive (mini-rail, feature-grid, stats, pricing) contra los breakpoints ya definidos en el CSS portado, y correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `/` muestra el nuevo Home con todas sus secciones (hero, por qué Arcade Vault, juegos disponibles, estadísticas, actividad en vivo, precios, CTA final), visualmente igual al prototipo de `references/templates/home-about/`.
- [ ] `/juegos` muestra la Biblioteca (grid de 8 juegos, buscador, filtro por categoría) con el mismo comportamiento que tenía antes en `/`.
- [ ] El `Nav` muestra "Inicio" activo en `/` y "Biblioteca" activo en `/juegos` y sus subrutas (`/juegos/[id]`, `/juegos/[id]/jugar`), tanto en desktop como en el drawer móvil.
- [ ] En el Home, "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" y "INSERTAR MONEDA →" (CTA final) navegan a `/juegos`.
- [ ] En el Home, "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/login`.
- [ ] En el Home, "VER SALÓN →" navega a `/salon-de-la-fama`.
- [ ] Cada mini-card de la sección "Juegos disponibles ahora" navega a `/juegos/[id]` del juego correspondiente.
- [ ] Tras iniciar sesión, crear cuenta, o entrar como invitado desde `/login`, se redirige a `/juegos`.
- [ ] Al cerrar sesión desde `Nav`, se redirige a `/juegos`.
- [ ] Las secciones del Home con la clase `reveal` aparecen con la animación de fade/slide al hacer scroll hasta ellas.

## Decisiones tomadas y descartadas

- **Ruta del Home:** `/` pasa a ser el landing de marketing y la Biblioteca se mueve a `/juegos`, en vez de crear el Home en una ruta nueva (p. ej. `/inicio`) dejando la Biblioteca en `/`. Razón: decisión explícita del usuario, replicando la estructura de navegación del template (`home` y `biblioteca` como rutas separadas).
- **Página "Acerca de":** queda fuera de este spec. Razón: decisión explícita del usuario para no mezclar dos features distintas (landing vs. about+contacto) en un mismo spec.
- **Datos de actividad/leaderboard del Home:** se hardcodean igual que en el template, como constantes locales en `app/page.tsx`, en vez de reutilizar `seededScores`/`PLAYERS` de `app/data.ts`. Razón: decisión explícita del usuario, manteniendo el enfoque "MVP visual" de SPEC 01 (datos de ejemplo sin lógica real detrás).
- **Redirects de sesión:** login, "jugar como invitado" y logout redirigen a `/juegos` en vez de `/`. Razón: decisión explícita del usuario para mantener el flujo de llevar al jugador directo al catálogo tras autenticarse, ahora que `/` es el landing y no el catálogo.
- **Nav sin link "Acerca de":** no se agrega el link al Nav en este spec, aunque el template lo incluya. Razón: evitar un enlace roto a una ruta que no existe todavía; se agregará en el spec que implemente About.

## Riesgos identificados

- **CSS no portado en SPEC 01:** el bloque `HOME PAGE` de `styles.css` (siluetas flotantes, hero, mini-rail, stats, activity, pricing) no fue migrado en SPEC 01 porque esa pantalla no estaba en su alcance. Mitigación: portarlo completo en el paso 6 de este spec y revisar visualmente cada sección contra el prototipo.
- **Enlaces internos rotos hacia `/`:** cualquier código o componente que hoy asuma que `/` es la Biblioteca (además de `Nav`, login y logout) podría quedar apuntando al lugar equivocado. Mitigación: hacer una búsqueda de `router.push("/")` y `href="/"` en el proyecto antes de cerrar el spec, para confirmar que solo el logo del Nav debe seguir apuntando a `/`.
