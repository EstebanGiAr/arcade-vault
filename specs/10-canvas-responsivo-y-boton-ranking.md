# 10 — Canvas responsivo sin scroll y botón "ver ranking" en el modal de fin de juego

**Estado:** Implementado
**Depende de:** SPEC 06, SPEC 07, SPEC 08, SPEC 09
**Fecha:** 2026-10-25

**Objetivo:** Ajustar el tamaño del área de juego (`crt-screen`) en `components/game-player.tsx` para que el reproductor completo quepa en pantallas de escritorio/laptop sin scroll vertical, y agregar un botón "VER RANKING" al modal de fin de partida que lleve directo a la pestaña del juego jugado en `/salon-de-la-fama`.

## Alcance

**Incluido:**

- En `components/game-player.tsx`, el estilo inline del `.crt-screen` deja de aplicarse solo cuando `entry.aspectRatio` existe (como hoy, solo para `tetris`) y pasa a aplicarse siempre, para los 4 juegos reales (`asteroides`, `tetris`, `arkanoid`, `snake`) y para la pantalla decorativa placeholder (juegos sin canvas real), ya que todos comparten el mismo `.crt-screen`.
- El nuevo estilo generaliza el patrón que hoy ya usa `tetris` (altura máxima `min(70dvh, 760px)`) pero calcula el `max-width` a partir del aspect ratio real del juego en vez de depender del ancho fijo de `.av-player` (hasta 1100px): se parsea `entry?.aspectRatio ?? "4 / 3"` (string tipo `"W / H"`) a un número `ratio = W / H` en JS, y se aplica `width: "100%"`, `maxWidth: `min(100%, calc(min(70dvh, 760px) * ${ratio}))``, `aspectRatio: <el string original>`, `margin: "0 auto"`. Con esto el contenedor nunca supera esa altura máxima y el ancho se deriva manteniendo la proporción exacta, en vez de estirar el canvas.
- Este cálculo evita deformar el canvas: cada juego escala sus ejes X/Y de forma independiente (`ctx.setTransform(scaleX, scaleY, ...)`), así que si el contenedor no respeta la proporción 4:3 (o 1:2 en tetris) el dibujo se vería estirado — por eso el ancho se deriva matemáticamente de la altura máxima y el ratio, nunca se fuerzan ambos valores por separado.
- No se toca el breakpoint móvil ya existente (`@media` en `app/arcade-vault.css`, alrededor de la línea 1654) ni se audita el comportamiento en pantallas pequeñas — el foco de este spec es el caso actual de laptops/escritorio donde el canvas 4:3 a ancho completo resulta demasiado alto. En pantallas angostas el nuevo `width: 100%` sigue comportándose igual que antes (se ajusta al ancho disponible).
- Nuevo botón **"VER RANKING"** en el modal "FIN DEL JUEGO" (`components/game-player.tsx`), ubicado entre "JUGAR DE NUEVO" y "VOLVER AL VAULT". Al pulsarlo, navega con `router.push` a `/salon-de-la-fama?juego=${game.id}`.
- `app/salon-de-la-fama/page.tsx` pasa a recibir `searchParams` (prop asíncrono, `Promise<{ juego?: string }>`, convención de Next.js 16) y lo resuelve con `await` junto a `params`/datos existentes. El `initialTab` que se pasa a `HallOfFameTabs` es el valor de `juego` si coincide con el `id` de algún juego en `games`; si no viene el query param o no coincide con ningún juego, se mantiene el comportamiento actual (`firstGame.id`).
- `components/hall-of-fame-tabs.tsx` no se modifica: ya acepta `initialTab` como prop genérica: el cambio de quién decide ese valor queda enteramente en la página (Server Component), sin tocar el componente cliente.

**No incluido (fuera de alcance de este spec):**

- Rediseño visual del modal de fin de juego más allá de agregar el botón "VER RANKING".
- Auditoría o rediseño del comportamiento responsivo en pantallas móviles/táctiles — decisión explícita del usuario de enfocar este spec en escritorio/laptop.
- Reflejar en la URL la pestaña que el usuario selecciona manualmente dentro de `/salon-de-la-fama` (los chips `onClick` siguen siendo estado de cliente puro, sin actualizar la URL).
- Cambios a la lógica interna de cada juego (`asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx`, `snake-game.tsx`): cada uno ya escala su canvas según el tamaño real de su contenedor vía `ResizeObserver`; este spec solo cambia el tamaño que el contenedor CSS les asigna.
- Tests automatizados (el proyecto no tiene suite configurada).
- Anti-cheat o cambios a la policy de `scores` — no se reabre aquí (ya decidido en SPEC 04/06).

## Modelo de datos

No se introduce ninguna estructura de persistencia nueva. El único "dato" nuevo es el query param `juego` en la URL de `/salon-de-la-fama`, que es efímero (no se guarda en ningún lado) y solo se usa para calcular el valor inicial de un estado de cliente que ya existía (`initialTab`).

```ts
// app/salon-de-la-fama/page.tsx
export default async function HallOfFamePage({
  searchParams,
}: {
  searchParams: Promise<{ juego?: string }>;
}) {
  // ...
  const { juego } = await searchParams;
  const initialTab = games.some((g) => g.id === juego) ? juego! : firstGame.id;
  // ...
}
```

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. En `components/game-player.tsx`, agregar una pequeña función/constante que parsee `entry?.aspectRatio ?? "4 / 3"` (string `"W / H"`) a un número `ratio = W / H`.
2. Reemplazar el `style={entry?.aspectRatio ? {...} : undefined}` actual del `.crt-screen` por un objeto de estilo que se aplica siempre: `aspectRatio` (el string original), `width: "100%"`, `maxWidth: \`min(100%, calc(min(70dvh, 760px) * ${ratio}))\``, `margin: "0 auto"`.
3. Probar manualmente en el navegador, con la ventana en tamaños típicos de laptop (~1366×768) y de escritorio (~1920×1080): jugar `asteroides`, `tetris`, `arkanoid`, `snake` y abrir la pantalla decorativa placeholder, confirmando en cada caso que el HUD superior y la barra inferior del CRT son visibles junto con el área de juego sin necesidad de scroll vertical, y que el canvas no se ve estirado ni recortado.
4. Agregar el botón `"VER RANKING"` dentro de `.actions` del modal "FIN DEL JUEGO", entre el botón "JUGAR DE NUEVO" y el botón "VOLVER AL VAULT", con `onClick={() => router.push(\`/salon-de-la-fama?juego=${game.id}\`)}`.
5. En `app/salon-de-la-fama/page.tsx`, cambiar la firma de `HallOfFamePage` para recibir `searchParams: Promise<{ juego?: string }>`, resolverlo con `await`, y calcular `initialTab` como se describe en el modelo de datos (usa el `juego` solicitado si existe en `games`, si no cae a `firstGame.id`).
6. Probar manualmente: terminar una partida de cada uno de los 4 juegos reales, pulsar "VER RANKING" y confirmar que `/salon-de-la-fama` abre directamente con la pestaña del juego recién jugado activa (sin tener que hacer clic manualmente en el chip). Confirmar también que entrar a `/salon-de-la-fama` desde el menú de navegación (sin query param) sigue mostrando la pestaña del primer juego, igual que antes.
7. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [x] `npm run build` termina sin errores.
- [x] `npm run lint` no reporta errores.
- [x] En una ventana de navegador de ~1366×768 (laptop típica), jugar `asteroides`, `tetris`, `arkanoid` o `snake` muestra el HUD superior, el área de juego y la barra inferior del CRT simultáneamente, sin scroll vertical.
- [x] Lo mismo se cumple al entrar a un juego aún sin canvas real (pantalla decorativa placeholder), si existe alguno en el catálogo.
- [x] El canvas de cada uno de los 4 juegos reales mantiene su proporción exacta (4:3 para `asteroides`/`arkanoid`/`snake`, 1:2 para `tetris`) sin deformarse, tanto en ventanas angostas como anchas.
- [x] El modal "FIN DEL JUEGO" muestra el botón "VER RANKING" entre "JUGAR DE NUEVO" y "VOLVER AL VAULT" para los 4 juegos reales.
- [x] Terminar una partida de `snake` y pulsar "VER RANKING" navega a `/salon-de-la-fama?juego=snake` con la pestaña "SERPIENTE" activa de inmediato.
- [x] Lo mismo se cumple para `asteroides`, `tetris` y `arkanoid` con sus respectivos ids y pestañas.
- [x] Visitar `/salon-de-la-fama` sin query param (ej. desde el menú de navegación) sigue mostrando la pestaña del primer juego del catálogo, igual que antes de este spec.
- [x] Si el query param `juego` no corresponde a ningún id existente en `games`, `/salon-de-la-fama` no falla y cae de vuelta a la pestaña del primer juego.
- [x] `read_console_messages` no muestra errores al jugar, terminar una partida, pulsar "VER RANKING" y navegar de vuelta.

## Decisiones tomadas y descartadas

- **Generalizar el patrón `min(70dvh, 760px)` que ya usaba solo `tetris`, en vez de inventar un criterio nuevo.** Razón: ya es un patrón probado en producción (SPEC 07); reutilizarlo minimiza riesgo y mantiene consistencia visual entre los 4 juegos.
- **Calcular `max-width` a partir de un ratio numérico derivado de `aspectRatio`, en vez de fijar `width` y `height` por separado (como hacía el estilo inline de `tetris`).** Razón: los juegos escalan sus ejes X/Y de forma independiente (`ctx.setTransform(scaleX, scaleY, ...)`); si el contenedor no respeta exactamente la proporción declarada, el dibujo se estira. Derivar el ancho máximo matemáticamente de la altura máxima y el ratio garantiza que la proporción nunca se rompa.
- **Enfoque solo en escritorio/laptop, sin auditar el breakpoint móvil existente.** Razón: decisión explícita del usuario — el problema reportado (scroll para ver el resto del juego) ocurre en pantallas de escritorio/laptop con el canvas 4:3 a ancho completo; el comportamiento móvil actual no se tocó porque no fue señalado como roto.
- **Query param `?juego=<id>` en español, en vez de `?game=<id>`.** Razón: decisión explícita del usuario — consistencia con el resto de las rutas del proyecto (`/juegos/snake`), aunque los props internos (`gameId`, `initialTab`) sigan en inglés.
- **El botón "VER RANKING" va entre "JUGAR DE NUEVO" y "VOLVER AL VAULT".** Razón: decisión explícita del usuario — queda como una acción secundaria intermedia antes de la opción de salir del todo del reproductor.
- **No se modifica `hall-of-fame-tabs.tsx`.** Razón: ya acepta `initialTab` como prop; resolver qué pestaña inicial corresponde es responsabilidad de la Server Component (`page.tsx`), que es quien tiene acceso directo al query param sin necesitar `useSearchParams` en el cliente.
- **Sin anti-cheat ni cambios a la policy de `scores`.** Razón: decisión ya tomada en SPEC 04/06, no se reabre aquí.

## Riesgos identificados

| Riesgo                                                                                                                                             | Mitigación                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El `calc()` con un ratio no entero (ej. `4/3 ≈ 1.333...`) podría producir redondeos de sub-píxel en el tamaño final del contenedor.                | Aceptable: el canvas interno ya se redimensiona en píxeles reales vía `devicePixelRatio` dentro de cada juego, así que un desajuste de menos de 1px no es perceptible. |
| Si en el futuro se agrega un juego sin `aspectRatio` cuyo canvas lógico no sea realmente 4:3, el nuevo cálculo seguiría asumiendo 4:3 por defecto. | Igual que hoy: el valor por defecto `"4 / 3"` ya es el supuesto implícito de todos los juegos reales existentes sin `aspectRatio` explícito (SPEC 05/08/09).           |
| Si `games` llega vacío desde Supabase, `firstGame` sería `undefined` y el cálculo de `initialTab` fallaría.                                        | Comportamiento ya existente antes de este spec (la página ya asume `games.length > 0`); no se introduce un caso nuevo de fallo.                                        |
