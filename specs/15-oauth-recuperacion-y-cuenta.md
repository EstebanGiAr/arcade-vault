# 15 — OAuth, recuperación de contraseña y pantalla de cuenta

**Estado:** Borrador
**Depende de:** SPEC 14
**Fecha:** 2026-10-27

**Objetivo:** Completar la autenticación de SPEC 14 con login por Google y GitHub, recuperación de contraseña por correo, y una pantalla `/cuenta` donde el jugador autenticado puede cambiar su username.

## Alcance

**Incluido:**

- `app/auth/callback/route.ts`: ruta de callback de Supabase Auth (`exchangeCodeForSession`), usada tanto por el flujo OAuth como por el enlace de recuperación de contraseña (`type=recovery`), con soporte de un parámetro `next` para volver a la página desde la que se inició el login.
- Conectar los botones ◆ GOOGLE y ▣ GITHUB de `app/login/page.tsx` (hoy inertes) a `supabase.auth.signInWithOAuth({ provider: "google" | "github" })`, redirigiendo a `/auth/callback`. El trigger `handle_new_user` de SPEC 14 ya cubre la creación del perfil con username derivado del email cuando no viene de un formulario de registro.
- Enlace "¿Olvidaste tu contraseña?" en la pestaña INICIAR SESIÓN de `/login`, que lleva a una nueva ruta `/recuperar` (`resetPasswordForEmail`, con mensaje de confirmación "revisa tu correo").
- Ruta `/nueva-contrasena`, destino del enlace del correo de recuperación, que llama `supabase.auth.updateUser({ password })` tras validar que llega con una sesión de recuperación válida (vía `/auth/callback?type=recovery`).
- Ruta `/cuenta` (protegida solo por UI, no por middleware, igual que el resto del sitio): muestra el username actual y permite cambiarlo, validando unicidad contra `profiles.username` antes de guardar vía `lib/profiles.ts`.
- Las tres rutas nuevas (`/recuperar`, `/nueva-contrasena`, `/cuenta`) reutilizan la carcasa visual `.auth-card`/`.av-auth-wrap` de `app/arcade-vault.css` ya usada por `/login`, sin inventar clases nuevas.
- Enlace a `/cuenta` desde el menú del Nav (`components/nav.tsx`), reemplazando o acompañando el botón `{user.name} ▾` actual.

**No incluido (fuera de alcance de este spec):**

- Cualquier cambio al esquema de `profiles`/`scores` definido en SPEC 14.
- Otros proveedores OAuth (Discord, Twitter, etc.).
- Configurar las credenciales de Google/GitHub en el dashboard de Supabase — es un prerequisito de infraestructura que corre el usuario, no un paso de código de esta spec.
- Re-firmar los scores ya guardados cuando el jugador cambia su username desde `/cuenta`; los scores antiguos conservan el nombre con el que se guardaron en su momento.
- Eliminar cuenta, cambiar email o cambiar contraseña desde `/cuenta` estando ya autenticado (solo se cubre el flujo de recuperación por "olvidé mi contraseña").
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

Esta spec no introduce estructuras nuevas en Supabase; reutiliza `profiles` y `scores.user_id` de SPEC 14. El único cambio de datos es funcional: `profiles.username` pasa a poder actualizarse desde `/cuenta` además de en el registro, bajo la misma política RLS de `UPDATE` (`auth.uid() = id`) ya creada en SPEC 14.

## Plan de implementación

Cada paso deja el proyecto funcional (`npm run dev` arranca sin errores).

1. Crear `app/auth/callback/route.ts` con `exchangeCodeForSession` y el manejo de `next`/`type=recovery`.
2. Conectar los botones ◆ GOOGLE y ▣ GITHUB de `app/login/page.tsx` a `signInWithOAuth`.
3. Crear `/recuperar` con el formulario de "¿Olvidaste tu contraseña?" y el enlace desde `/login`.
4. Crear `/nueva-contrasena` con el formulario de nueva contraseña, validando la sesión de recuperación.
5. Extender `lib/profiles.ts` con `updateUsername(supabase, userId, username)`, validando unicidad.
6. Crear `/cuenta` con el formulario de cambio de username, usando la función anterior.
7. Enlazar `/cuenta` desde `components/nav.tsx`.
8. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error.
9. Verificar en Chrome, solo al final: login con Google, login con GitHub (si las credenciales ya están configuradas en el proyecto; si no, documentarlo como bloqueado y continuar con el resto), flujo completo de recuperación de contraseña por correo, y cambio de username desde `/cuenta` reflejado en el Nav y en un nuevo score guardado.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] Pulsar ◆ GOOGLE o ▣ GITHUB en `/login` redirige al proveedor y, al volver, deja al jugador con sesión iniciada y un perfil creado en `profiles`.
- [ ] El enlace "¿Olvidaste tu contraseña?" envía el correo de recuperación y la ruta `/nueva-contrasena` permite establecer una contraseña nueva y queda autenticado con ella.
- [ ] Desde `/cuenta`, cambiar el username falla con un error visible si ya está tomado, y tiene éxito en caso contrario, reflejándose de inmediato en el Nav.
- [ ] Los scores guardados antes del cambio de username en `/cuenta` conservan el nombre original en el leaderboard.

## Decisiones tomadas y descartadas

- **Un único `app/auth/callback/route.ts` para OAuth y recuperación de contraseña, en vez de rutas separadas.** Razón: ambos flujos usan el mismo mecanismo de intercambio de código de Supabase (`exchangeCodeForSession`); separarlos duplicaría lógica sin beneficio.
- **`/cuenta` no se protege con middleware, igual que el resto del sitio.** Razón: consistente con la decisión de SPEC 14 de no bloquear rutas por falta de sesión; sin sesión, `/cuenta` simplemente no tiene datos que mostrar y puede redirigir a `/login` desde el propio componente si se detecta `user === null`.
- **Cambiar el username no re-firma los scores ya guardados.** Razón: decisión explícita del usuario — mantiene consistencia con la misma decisión tomada en SPEC 14 de no migrar/re-firmar historial.
- **Configurar las credenciales de Google/GitHub en Supabase queda fuera del alcance de código de esta spec.** Razón: es una acción de configuración en el dashboard del proveedor (OAuth client id/secret), no algo que el agente de implementación pueda hacer por su cuenta; se documenta como prerequisito explícito.

## Riesgos identificados

| Riesgo                                                                                                                      | Mitigación                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las credenciales OAuth de Google/GitHub pueden no estar configuradas aún en el proyecto Supabase al momento de implementar. | El paso 9 documenta el bloqueo si ocurre y continúa verificando el resto de los flujos (recuperación de contraseña, cambio de username) sin depender de OAuth. |
| Un cambio de username concurrente con otro usuario eligiendo el mismo nombre puede chocar contra el `unique` de `profiles`. | El `unique constraint` ya existente de SPEC 14 rechaza el segundo `UPDATE`; `/cuenta` muestra el error de unicidad en vez de fallar silenciosamente.           |
