# 16 — Confirmación de correo electrónico al registrarse

**Estado:** Implementado
**Depende de:** SPEC 14, SPEC 15
**Fecha:** 2026-10-27

**Objetivo:** Exigir confirmación de correo electrónico al registrarse con email y contraseña, reemplazando el auto-login inmediato de SPEC 14 por una pantalla de "revisa tu correo" con opción de reenviar el enlace, sin afectar el login por Google/GitHub de SPEC 15.

## Alcance

**Incluido:**

- Habilitar "Confirm email" en la configuración de Auth del proyecto Supabase (prerequisito de infraestructura, documentado como tal, no como paso de código). Esto **supera** la decisión de SPEC 14 de mantenerlo deshabilitado.
- `app/login/page.tsx`: tras un `signUp` exitoso, en vez de redirigir a `/juegos`, la pestaña CREAR CUENTA muestra un estado "revisa tu correo" dentro del propio `.auth-card` (mismo contenedor, sin nueva ruta), con el email usado y un botón para reenviar el correo de confirmación.
- `lib/auth.ts`: nueva función `resendConfirmationEmail(supabase, email)` sobre `supabase.auth.resend({ type: "signup", email })`.
- Botón de reenvío con cooldown de 60 segundos (deshabilitado + contador visible) para evitar reenvíos repetidos por clics accidentales.
- `app/auth/callback/route.ts`: ya maneja `exchangeCodeForSession` para OAuth y `type=recovery`; se extiende para que el caso por defecto (enlace de confirmación de registro, sin `type` o `type=signup`) redirija a `next` (`/juegos` por defecto) con la sesión ya iniciada, igual que hoy.
- `app/login/page.tsx`, pestaña INICIAR SESIÓN: si `signIn` falla porque el correo no está confirmado (`Email not confirmed` de Supabase), mostrar un mensaje específico ("CONFIRMA TU CORREO ANTES DE INICIAR SESIÓN") con el mismo botón/acción de reenviar el correo de confirmación.
- `mapAuthError` en `app/login/page.tsx` gana un caso para ese mensaje específico de Supabase.

**No incluido (fuera de alcance de este spec):**

- Login por Google/GitHub (SPEC 15): esos proveedores validan el email por su cuenta; `signInWithOAuth` sigue dejando sesión iniciada de inmediato, sin pasar por ningún estado de confirmación.
- Bloquear jugar como invitado o cualquier otra acción del sitio mientras un correo está sin confirmar: simplemente no hay sesión iniciada con esa cuenta hasta que se confirme; el resto del sitio sigue funcionando igual que hoy (invitado con nombre libre).
- Reenviar confirmación desde una pantalla distinta a `/login` (por ejemplo, un enlace directo sin pasar por el formulario).
- Expiración/reenvío automático sin interacción del usuario.
- Cambiar el flujo de recuperación de contraseña o de OAuth ya implementados en SPEC 15.
- Migrar cuentas ya existentes y confirmadas antes de este cambio (quedan como están; Supabase no vuelve a pedirles confirmación).
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

Esta spec no introduce estructuras nuevas en Supabase ni cambia `profiles`/`scores`. El cambio es puramente de configuración (flag "Confirm email" del proyecto) y de flujo en el cliente.

## Plan de implementación

Cada paso deja el proyecto funcional (`npm run dev` arranca sin errores).

1. Habilitar "Confirm email" en la configuración de Auth del dashboard de Supabase (prerequisito de infraestructura).
2. Agregar `resendConfirmationEmail` a `lib/auth.ts`.
3. En `app/login/page.tsx`: tras `signUp` exitoso, en vez de `router.push("/juegos")`, pasar a un estado local `pendingConfirmation: { email }` que reemplaza el contenido del `.auth-card` por el mensaje "revisa tu correo" + botón de reenvío con cooldown de 60s.
4. En `app/login/page.tsx`: extender `mapAuthError` para detectar el mensaje de Supabase de correo sin confirmar y mostrar el error específico con el mismo botón de reenvío.
5. Ajustar `app/auth/callback/route.ts` si es necesario para que el caso sin `type` (confirmación de registro) siga redirigiendo a `next` con sesión iniciada (verificar que el comportamiento actual ya lo cubre, dado que solo distingue `type === "recovery"`).
6. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error.
7. Verificar en Chrome, solo al final: registrar una cuenta nueva y confirmar que aparece la pantalla "revisa tu correo" (sin sesión iniciada todavía); confirmar el correo (vía el enlace recibido o, si no es practicable en el entorno de prueba, documentar el bloqueo) y confirmar que la sesión queda iniciada tras el callback; intentar iniciar sesión con una cuenta sin confirmar y ver el mensaje específico; pulsar reenviar y confirmar el cooldown de 60s; iniciar sesión con Google/GitHub y confirmar que sigue entrando de inmediato sin pantalla de confirmación.

## Criterios de aceptación

- [x] `npm run build` termina sin errores.
- [x] `npm run lint` no reporta errores.
- [x] Registrarse con email/contraseña ya no deja sesión iniciada de inmediato: muestra la pantalla "revisa tu correo" dentro de `.auth-card` con el email usado.
- [x] Pulsar el botón de reenviar en esa pantalla llama a `resendConfirmationEmail` y queda deshabilitado con un contador visible durante 60 segundos.
- [x] Confirmar el correo mediante el enlace recibido redirige a `/auth/callback` y deja al jugador con sesión iniciada en `/juegos`.
- [x] Intentar iniciar sesión (pestaña INICIAR SESIÓN) con una cuenta cuyo correo no está confirmado muestra el mensaje "CONFIRMA TU CORREO ANTES DE INICIAR SESIÓN" junto con la opción de reenviar, en vez del error genérico de credenciales inválidas.
- [x] Iniciar sesión con Google o GitHub sigue dejando sesión iniciada de inmediato, sin pasar por ninguna pantalla de confirmación de correo.
- [x] Jugar como invitado sigue funcionando sin cambios mientras una cuenta recién creada no ha confirmado su correo.

## Decisiones tomadas y descartadas

- **Esta spec supera la decisión de SPEC 14 de no confirmar correo.** Razón: decisión explícita del usuario al pedir esta feature; se documenta aquí en vez de editar retroactivamente SPEC 14, que queda como registro histórico de por qué se decidió así en su momento.
- **La pantalla "revisa tu correo" reemplaza el contenido de `.auth-card` en la misma ruta `/login`, en vez de crear una ruta nueva.** Razón: decisión explícita del usuario — consistente con cómo SPEC 14 evitó partir la carcasa `.auth-card` en rutas separadas para INICIAR SESIÓN/CREAR CUENTA.
- **No se bloquea ninguna acción del sitio mientras el correo está sin confirmar.** Razón: decisión explícita del usuario — el modelo de sesión sigue siendo binario (hay sesión confirmada o no hay sesión), sin introducir un estado intermedio "autenticado pero no confirmado" que tocaría `auth-provider.tsx` y los consumidores de `useAuth()`.
- **OAuth (Google/GitHub) no se ve afectado.** Razón: decisión explícita del usuario — esos proveedores ya validan el correo por su cuenta antes de que Supabase cree la sesión; exigir una confirmación adicional sería redundante y rompería la expectativa de "un clic y adentro" de SPEC 15.
- **Cooldown de reenvío de 60 segundos.** Razón: decisión explícita del usuario — estándar común para correos transaccionales, evita que el botón dispare múltiples envíos por clics repetidos.
- **Se reutiliza `app/auth/callback/route.ts` existente en vez de crear una ruta nueva para el enlace de confirmación.** Razón: decisión explícita del usuario — el mismo `exchangeCodeForSession` ya cubre OAuth y recovery; el enlace de confirmación de registro es el mismo mecanismo con un `type` distinto (o sin `type`), así que separar la ruta duplicaría lógica sin beneficio.

## Riesgos identificados

| Riesgo                                                                                                                                                       | Mitigación                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Habilitar "Confirm email" en Supabase puede dejar sin acceso inmediato a cuentas creadas antes de este cambio que aún no habían confirmado (si las hubiera). | Documentar que solo afecta a registros nuevos tras habilitar el flag; Supabase no re-exige confirmación a sesiones ya activas o cuentas ya marcadas como confirmadas.                            |
| El entorno de prueba en Chrome puede no tener acceso a una bandeja de correo real para click-through del enlace de confirmación.                             | El paso 7 de verificación documenta el bloqueo si ocurre y continúa verificando el resto del flujo (pantalla de pendiente, reenvío con cooldown, mensaje de login sin confirmar, OAuth intacto). |
| El texto exacto del error de Supabase para "correo sin confirmar" podría no coincidir con el patrón usado en `mapAuthError`.                                 | Verificar el mensaje real devuelto por `supabase.auth.signInWithPassword` en ese caso durante la implementación y ajustar la expresión regular de detección si es necesario.                     |
