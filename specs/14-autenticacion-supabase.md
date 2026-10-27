# 14 — Autenticación real con Supabase (email/contraseña)

**Estado:** Aprobado
**Depende de:** SPEC 01, SPEC 04, SPEC 06
**Fecha:** 2026-10-27

**Objetivo:** Reemplazar la sesión fake de `{ name }` en `localStorage` por autenticación real de Supabase (email + contraseña) con perfiles únicos (`profiles`), vincular los scores a la cuenta que los firma (`scores.user_id`), y conectar `app/login/page.tsx` y el resto de la UI que ya lee `useAuth()` a ese backend.

## Alcance

**Incluido:**

- Tabla `public.profiles` (`id uuid primary key references auth.users on delete cascade`, `username text not null unique` con `check` de formato, `created_at timestamptz default now()`), con RLS activo: `SELECT` público, `INSERT`/`UPDATE` restringidos a `auth.uid() = id`.
- Columna `scores.user_id uuid null references auth.users on delete set null` con índice, y endurecimiento de la política `scores_insert_public` para que un `INSERT` con `user_id` no pueda firmar a nombre de otra cuenta.
- Trigger `handle_new_user` en `auth.users` (`after insert`) que crea la fila de `profiles` leyendo `raw_user_meta_data->>'username'` si viene del registro, o derivándolo del local-part del email (con sufijo numérico si ya existe) cuando no viene.
- `middleware.ts` en la raíz del proyecto + `lib/supabase/middleware.ts`, siguiendo el patrón oficial `updateSession` de `@supabase/ssr`, para refrescar el token de sesión en cada request sin bloquear ninguna ruta.
- `lib/auth.ts` (helpers `signUp`, `signIn`, `signOut`, `getSessionUser`) y `lib/profiles.ts` (`getProfileByUsername` o equivalente) como únicos puntos de acceso a `auth.*`/`profiles` desde componentes, siguiendo la regla ya existente del proyecto de no consultar Supabase directamente desde la UI.
- Reescritura de `components/auth-provider.tsx` sobre `supabase.auth.getSession()` + `onAuthStateChange`, exponiendo `{ user, loading, signIn, signUp, signOut }`. `SessionUser` pasa de `{ name: string }` a `{ id: string; name: string }`, conservando la propiedad `.name` para no romper los consumidores existentes (`components/nav.tsx`, `components/game-player.tsx`, `components/hall-of-fame-tabs.tsx`).
- Conectar las dos pestañas de `app/login/page.tsx` (INICIAR SESIÓN / CREAR CUENTA) al backend real: `signIn`/`signUp`, con estado de carga en el botón de submit y mensaje de error visible dentro de `.auth-card` si falla (credenciales inválidas, username ya tomado, email ya registrado). `JUGAR COMO INVITADO` pasa a llamar `signOut` antes de navegar a `/juegos`.
- Auto-login inmediato tras `signUp` (sin pantalla de "revisa tu correo"); requiere que "Confirm email" esté deshabilitado en la configuración de Auth del proyecto Supabase — documentado como prerequisito, no como paso de código.
- `lib/storage.ts`: eliminar `getUser`, `setUser` y el tipo `SessionUser`, y dejar de escribir la clave `av_user`; conservar `readSkin`/`writeSkin` intactos.
- `lib/scores.ts`: `saveScore` acepta un `userId?: string | null` opcional que se escribe en la columna nueva; nueva función `getBestScoreByUser(supabase, gameId, userId)` equivalente a `getBestScoreByName` pero filtrando por `user_id`.
- `components/game-player.tsx`: cuando hay sesión, el input de nombre del modal de fin de partida sigue editable, precargado con el username actual del perfil como valor por defecto (no forzado), y `saveScore` se llama con ese nombre tal cual quede escrito más `userId: user.id`; sin sesión (invitado), el comportamiento actual (nombre libre, `userId: null`) no cambia.
- `components/hall-of-fame-tabs.tsx`: usar `getBestScoreByUser` en vez de `getBestScoreByName` cuando `user` existe.
- `components/nav.tsx`: `handleSignOut` invoca el `signOut` real del contexto en vez de solo limpiar `localStorage`.
- `lib/supabase/database.types.ts` regenerado con `generate_typescript_types` tras aplicar las migraciones.

**No incluido (fuera de alcance de este spec):**

- Login con Google/GitHub (botones ◆ GOOGLE / ▣ GITHUB) y la ruta de callback OAuth — SPEC 15.
- Recuperación de contraseña — SPEC 15.
- Pantalla `/cuenta` para editar el username tras el registro — SPEC 15.
- Bloquear cualquier ruta por falta de sesión; jugar y ver el catálogo siguen siendo públicos.
- Confirmación de correo por email.
- Migrar o re-firmar los scores ya existentes en la tabla (quedan con `user_id` null, tal como estaban).
- El contador decorativo `CRÉDITOS · 03` del Nav.
- Roles, permisos de administrador o moderación del leaderboard.
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Z0-9_]{3,10}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
-- SELECT público, INSERT/UPDATE solo por el propio dueño (auth.uid() = id).

alter table public.scores
  add column user_id uuid references auth.users(id) on delete set null;
create index scores_user_id_idx on public.scores (user_id);
-- scores_insert_public se reescribe con with_check (user_id is null or user_id = auth.uid())
```

```ts
// lib/storage.ts — SessionUser deja de vivir aquí.
// components/auth-provider.tsx
type SessionUser = { id: string; name: string }; // name = profiles.username
```

Convenciones: `username` siempre en mayúsculas (igual que hoy genera `app/login/page.tsx` con `.toUpperCase().slice(0, 10)`), de 3 a 10 caracteres, `A-Z0-9_`. `scores.user_id` es nullable: `null` significa invitado, igual que antes de este spec.

## Plan de implementación

Cada paso deja el proyecto funcional (`npm run dev` arranca sin errores).

1. Aplicar la migración de `profiles` (tabla + RLS) vía `mcp__supabase__apply_migration`.
2. Aplicar la migración de `scores.user_id` + índice + reescritura de `scores_insert_public` vía `apply_migration`.
3. Aplicar la migración del trigger `handle_new_user` sobre `auth.users`.
4. Regenerar `lib/supabase/database.types.ts` con `generate_typescript_types`.
5. Crear `lib/supabase/middleware.ts` (`updateSession`) y `middleware.ts` en la raíz, con el `matcher` recomendado por `@supabase/ssr` excluyendo assets estáticos.
6. Crear `lib/auth.ts` (`signUp`, `signIn`, `signOut`) y `lib/profiles.ts`.
7. Reescribir `components/auth-provider.tsx` sobre sesión real de Supabase, exponiendo `loading` además de `user`/`login`/`logout` (renombrados a `signIn`/`signUp`/`signOut` si el componente que los consume lo permite, o conservando `login`/`logout` como wrappers si eso evita tocar más archivos).
8. Conectar `app/login/page.tsx`: estados de carga/error, `signUp` con `username` + `email` + `password`, `signIn` con `email`/`password` (ajustar el campo "Usuario" de la pestaña de login para aceptar email si es necesario), `playAsGuest` llamando `signOut`.
9. Limpiar `lib/storage.ts`: quitar `getUser`/`setUser`/`SessionUser`.
10. Actualizar `lib/scores.ts`: `saveScore` con `userId` opcional, nueva `getBestScoreByUser`.
11. Actualizar `components/game-player.tsx`, `components/hall-of-fame-tabs.tsx` y `components/nav.tsx` según el alcance descrito arriba.
12. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error.
13. Verificar en Chrome, solo al final: registrar una cuenta nueva, cerrar sesión, iniciar sesión, jugar y guardar un score autenticado, jugar como invitado y guardar un score sin sesión, recargar la página y confirmar que la sesión persiste.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] Registrarse desde `/login` crea una fila en `auth.users` y una fila correspondiente en `profiles` con el username elegido en mayúsculas.
- [ ] Registrarse deja al jugador con sesión iniciada de inmediato, sin pantalla de confirmación de correo.
- [ ] Intentar registrar un username ya tomado muestra un error visible en `.auth-card` y no crea una segunda fila en `profiles`.
- [ ] Un `INSERT` en `scores` con un `user_id` distinto al de la sesión autenticada es rechazado por RLS.
- [ ] Jugar y guardar score con sesión iniciada escribe `scores.user_id` con el id del usuario; el input de nombre del modal viene precargado con su username pero sigue siendo editable, y `scores.name` guarda el valor final tal cual quedó escrito.
- [ ] Si un usuario autenticado guarda dos scores con nombres distintos (por haber editado el campo), ambas filas comparten el mismo `scores.user_id`, permitiendo identificarlo como el mismo jugador aunque el nombre visible difiera.
- [ ] Jugar como invitado (sin sesión) sigue permitiendo escribir un nombre libre y guarda el score con `user_id` null, igual que antes de este spec.
- [ ] Recargar cualquier página tras iniciar sesión mantiene al usuario autenticado (`middleware.ts` refresca el token).
- [ ] Cerrar sesión desde el botón del Nav invoca el `signOut` real de Supabase y el Nav vuelve a mostrar "Iniciar Sesión".
- [ ] El salón de la fama muestra el mejor score del usuario autenticado vía `getBestScoreByUser`, no por coincidencia de nombre libre.
- [ ] `localStorage` ya no recibe escrituras bajo la clave `av_user`.

## Decisiones tomadas y descartadas

- **Dos specs en vez de una.** Razón: decisión explícita del usuario — el alcance combinado (schema+RLS, Supabase Auth, middleware, pantallas, integración con scores) toca más de tres áreas del sistema; esta spec cubre el núcleo (email/contraseña + perfiles + vínculo con scores) y SPEC 15 cubre OAuth, recuperación de contraseña y la pantalla de cuenta.
- **`scores.user_id` nullable en vez de obligatorio.** Razón: decisión explícita del usuario de mantener el modo invitado; forzar `user_id` habría exigido eliminar `JUGAR COMO INVITADO` o migrar/borrar los scores existentes.
- **No se migran los scores históricos a ninguna cuenta.** Razón: no hay forma confiable de saber qué cuenta nueva corresponde a qué `name` de texto libre firmado antes de que existiera autenticación; se acepta que queden con `user_id` null permanentemente.
- **Sin confirmación de correo.** Razón: decisión explícita del usuario, priorizando que el jugador entre y juegue de inmediato, coherente con el tono arcade del sitio; implica deshabilitar "Confirm email" en el proyecto Supabase como prerequisito de infraestructura, no de código.
- **`/login` conserva sus dos pestañas en una sola ruta, en vez de separarse en `/login` y `/registro`.** Razón: decisión explícita del usuario — evita partir la carcasa `.auth-card` ya portada del prototipo.
- **El nombre del score sigue siendo editable cuando hay sesión, precargado con el username del perfil como sugerencia.** Razón: decisión explícita del usuario — el texto que se guarda en `scores.name` es el que la persona escriba, no un valor forzado; lo que garantiza la identidad del jugador entre partidas con nombres distintos es `scores.user_id`, no el texto del nombre.
- **Username se asigna en el formulario de registro, no se fuerza un onboarding aparte.** Razón: decisión explícita del usuario — el campo "Usuario" ya existe en la pestaña CREAR CUENTA; agregar una pantalla intermedia sería trabajo adicional no pedido.
- **Las migraciones se aplican vía el MCP de Supabase durante `/spec-impl`, no a mano.** Razón: decisión explícita del usuario; `apply_migration` + `generate_typescript_types` ya son el flujo que usa el proyecto para cambios de schema (ver CLAUDE.md).

## Riesgos identificados

| Riesgo                                                                                                                                        | Mitigación                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dos registros concurrentes con el mismo username derivado del email (en el futuro, cuando llegue OAuth) podrían chocar contra el `unique`.    | El `unique constraint` de Postgres rechaza el segundo insert; el trigger atrapa el error y reintenta con sufijo numérico (`jugador`, `jugador2`, `jugador3`...). |
| Endurecer `scores_insert_public` con un `with_check` mal escrito podría bloquear el guardado de invitado (`user_id` null).                    | Probar explícitamente el guardado como invitado en el paso 13 de verificación antes de cerrar la spec; el `with_check` debe aceptar `user_id is null`.           |
| El Nav puede parpadear entre "Iniciar Sesión" y el nombre de usuario mientras `auth-provider.tsx` resuelve `getSession()` de forma asíncrona. | Se acepta como estado de carga transitorio (`loading`); no se bloquea el render del Nav, igual que ya ocurre hoy con la lectura diferida de `localStorage`.      |
