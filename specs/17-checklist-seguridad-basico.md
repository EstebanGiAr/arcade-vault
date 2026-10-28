# 17 — Checklist de seguridad básico

**Estado:** Implementada
**Depende de:** SPEC 04, SPEC 14, SPEC 15
**Fecha:** 2026-10-27

**Objetivo:** Cerrar los ítems de código pendientes del checklist de seguridad básico (`references/security/security-checklist.md`): agregar headers de seguridad en Next.js, revocar el acceso RPC directo a las dos funciones `SECURITY DEFINER` que el panel de advisors de Supabase marca como ejecutables por `anon`/`authenticated`, auditar que RLS esté correctamente habilitado en `games`/`scores`/`profiles`, y proteger `/cuenta` y `/nueva-contrasena` en `proxy.ts` (el proxy de Next.js 16 de este proyecto, equivalente al antiguo `middleware.ts`) en vez de solo en el cliente; los ajustes de configuración de Auth que no son código (longitud mínima de contraseña, leaked password protection, límite de signups) quedan documentados como prerequisito de infraestructura.

> Reabierta a `Borrador` tras la aprobación inicial para incorporar la protección de rutas por proxy, pedida explícitamente por el usuario después de aprobar la primera versión.

## Alcance

**Incluido:**

- `next.config.ts`: agregar un arreglo `securityHeaders` con los 3 headers del checklist (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`) aplicados a todas las rutas vía la función `headers()` de Next.js.
- Auditoría de RLS en `games`, `scores` y `profiles`: confirmar que está habilitado y que las políticas existentes (`games_select_public`, `scores_select_public`, `scores_insert_public`, `profiles_select_public`, `profiles_insert_own`, `profiles_update_own`) son coherentes con el modelo de acceso del sitio (lectura pública, escritura solo del propio dueño o `service_role`). Si la auditoría no encuentra brechas, se documenta el resultado en esta spec sin generar cambios de código.
- Migración de Supabase: `REVOKE EXECUTE` sobre `public.handle_new_user()` y `public.rls_auto_enable()` para los roles que hoy pueden invocarlas vía `/rest/v1/rpc/...` (`anon`, `authenticated`), resolviendo los warnings `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` del panel de advisors. Ambas funciones seguirán operando como triggers (una sobre `auth.users`, la otra como event trigger de DDL), que no requieren ese grant para ejecutarse internamente.
- Documentar en esta spec, como prerequisito manual de infraestructura (igual que las credenciales OAuth en SPEC 15), los 3 ajustes del dashboard de Auth de Supabase que no tienen API de gestión expuesta en el MCP: longitud mínima de contraseña (8 caracteres), Leaked Password Protection (activar), y límite de signups por IP (anti-bot).
- Re-correr `get_advisors(security)` al final para confirmar que los 2 warnings de `SECURITY DEFINER` desaparecen, y registrar el estado observado del warning de leaked password protection.
- `proxy.ts` (proxy de Next.js 16 de este proyecto, hoy solo refresca el token de sesión vía `updateSession`): extenderlo para que, usando el usuario que `updateSession` ya resuelve con `supabase.auth.getUser()`, redirija sin renderizar la ruta cuando no hay sesión:
  - `/cuenta` → redirige a `/login?next=/cuenta` si no hay sesión.
  - `/nueva-contrasena` → redirige a `/recuperar` si no hay sesión (una sesión de recuperación es una sesión normal desde la perspectiva del proxy; no hay forma de distinguir "sesión de recuperación" de "sesión normal" a ese nivel, así que el chequeo es el mismo: ¿hay alguna sesión o no?).
- `app/cuenta/page.tsx`: eliminar el `useEffect` que hoy redirige a `/login` del lado del cliente si `user === null` — queda redundante una vez que el proxy garantiza que nadie sin sesión llega a renderizar la página.

**No incluido (fuera de alcance de este spec):**

- Content-Security-Policy u otros headers distintos a los 3 listados en el checklist. Razón: evitar romper integraciones existentes (Supabase, Resend, fuentes) con una política mal calibrada.
- Cambiar la validación inline de `/nueva-contrasena` para el caso en que el proxy ya deja pasar (con sesión) pero la sesión no es realmente una de recuperación — ese matiz (sesión normal coincidiendo con la visita a `/nueva-contrasena`) ya existía antes de esta spec y no se resuelve aquí: sigue siendo un caso borde aceptado, no introducido por el proxy.
- Cambiar las políticas RLS existentes de `games`/`scores`/`profiles`. La auditoría de esta spec es de verificación, no de rediseño; si no se encuentran brechas no hay migración de políticas.
- El riesgo de que `scores` acepte un `name` de texto libre no atado a `user_id` y sin validación server-side del valor de `score` — es un riesgo ya aceptado desde SPEC 06/14, no se reabre aquí.
- Aplicar los 3 ajustes del dashboard de Auth desde código — no hay API de gestión de Auth expuesta en el MCP de Supabase disponible; quedan como pasos manuales documentados.
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

Esta spec no introduce estructuras nuevas. El único cambio en Supabase es una migración de permisos (`REVOKE EXECUTE`) sobre dos funciones ya existentes; no se tocan tablas, columnas ni políticas.

## Plan de implementación

Cada paso deja el proyecto funcional (`npm run dev` arranca sin errores).

1. Agregar `securityHeaders` y la función `headers()` a `next.config.ts` con los 3 headers del checklist aplicados a `/(.*)`.
2. Aplicar una migración en Supabase (`REVOKE EXECUTE ON FUNCTION public.handle_new_user(), public.rls_auto_enable() FROM PUBLIC`) para quitar la ejecución vía RPC a `anon`/`authenticated`.
3. Re-correr `get_advisors(security)` y confirmar que los 2 warnings de `SECURITY DEFINER` para esas funciones ya no aparecen.
4. Revisar las políticas actuales de `games`, `scores` y `profiles` (ya listadas arriba) y documentar en la sección de decisiones de esta spec que la auditoría no encontró brechas (o, si encuentra alguna, describirla y resolverla en este mismo paso).
5. Extender `proxy.ts`/`lib/supabase/middleware.ts` (archivo auxiliar que conserva ese nombre; el proxy en sí es `proxy.ts`) para redirigir a `/login?next=/cuenta` cuando `/cuenta` se visita sin sesión, y a `/recuperar` cuando `/nueva-contrasena` se visita sin sesión, reutilizando el `supabase.auth.getUser()` que `updateSession` ya resuelve en cada request.
6. Eliminar el `useEffect` de redirección por falta de sesión en `app/cuenta/page.tsx`, ya redundante con el proxy.
7. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error.
8. Verificar, solo al final: que una respuesta HTTP del sitio (p. ej. `/`) incluye los 3 headers nuevos; que registrar una cuenta nueva con email/contraseña sigue creando su fila en `profiles` (el trigger `handle_new_user` sigue funcionando tras el `REVOKE`); que `get_advisors(security)` refleja el estado esperado; que visitar `/cuenta` sin sesión redirige a `/login?next=/cuenta` sin llegar a renderizar el formulario; que visitar `/nueva-contrasena` sin sesión redirige a `/recuperar`; y que el flujo normal de recuperación de contraseña (SPEC 15) sigue llegando a `/nueva-contrasena` con sesión y funcionando igual que antes.

## Criterios de aceptación

- [x] `npm run build` termina sin errores.
- [x] `npm run lint` no reporta errores.
- [x] Las respuestas HTTP de cualquier ruta del sitio incluyen `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: strict-origin-when-cross-origin`.
- [x] `get_advisors(security)` ya no reporta los warnings `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable` para `handle_new_user`/`rls_auto_enable`.
- [ ] Registrar una cuenta nueva con email/contraseña sigue creando su fila correspondiente en `profiles` después de aplicar el `REVOKE`. **(Pendiente — bloqueado por `email rate limit exceeded` de Supabase durante la verificación; ver "Verificación final (resultado)". Reintentar cuando el límite se reinicie.)**
- [x] RLS sigue habilitado en `games`, `scores` y `profiles`, confirmado por la auditoría de esta spec.
- [x] La spec deja documentados, como prerequisito manual pendiente del usuario, los 3 ajustes de Auth (longitud mínima de contraseña, leaked password protection, límite de signups por IP) con el estado observado en advisors al cierre.
- [x] Visitar `/cuenta` sin sesión iniciada redirige a `/login?next=/cuenta` sin renderizar el formulario de cuenta.
- [x] Visitar `/nueva-contrasena` sin sesión redirige a `/recuperar`.
- [ ] El flujo completo de recuperación de contraseña de SPEC 15 (correo → `/auth/callback?type=recovery` → `/nueva-contrasena` con sesión → `updateUser`) sigue funcionando igual que antes de este cambio. **(Pendiente — mismo bloqueo de `email rate limit exceeded`; ver "Verificación final (resultado)". Reintentar cuando el límite se reinicie.)**
- [x] `app/cuenta/page.tsx` ya no contiene el `useEffect` de redirección client-side por falta de sesión.

## Auditoría de RLS (resultado)

Ejecutada el 2026-10-27 sobre el proyecto de Supabase. Resultado: **sin brechas, sin cambios de código.**

- RLS habilitado (`rowsecurity = true`) en `games`, `profiles` y `scores`.
- Políticas vigentes (6, todas `roles = {public}`):
  - `games_select_public` — `SELECT`, `qual: true` (lectura pública; sin política de escritura pública, consistente con metadata gestionada por `service_role`).
  - `profiles_select_public` — `SELECT`, `qual: true`.
  - `profiles_insert_own` — `INSERT`, `with_check: auth.uid() = id`.
  - `profiles_update_own` — `UPDATE`, `qual`/`with_check: auth.uid() = id`.
  - `scores_select_public` — `SELECT`, `qual: true`.
  - `scores_insert_public` — `INSERT`, `with_check: user_id IS NULL OR user_id = auth.uid()`.
- Modelo observado coincide con el esperado: lectura pública en las 3 tablas, escritura limitada al propio dueño (`profiles`, `scores`) o a `service_role` (que bypassea RLS; aplica a altas/ediciones de `games`).

## Verificación final (resultado)

Ejecutada el 2026-10-27 contra `npm run dev` en local.

- ✅ `npm run build` y `npm run lint` sin errores (2 warnings preexistentes en `arkanoid-game.tsx`, ajenos a esta spec).
- ✅ Respuesta HTTP de `/` incluye los 3 headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`), confirmado por `curl -D -`.
- ✅ `get_advisors(security)` ya no reporta `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable` (ver sección de migración del paso 3). Persiste `auth_leaked_password_protection` (WARN), uno de los 3 ajustes manuales documentados abajo, pendiente de activación en el dashboard.
- ✅ Visitar `/cuenta` sin sesión responde `307` a `/login?next=/cuenta`; `/login?next=/cuenta` carga con `200` (sin ciclo de redirección).
- ✅ Visitar `/nueva-contrasena` sin sesión responde `307` a `/recuperar`; `/recuperar` carga con `200`.
- ⏸️ **Pendiente de verificación manual:** registrar una cuenta nueva (confirmar que `profiles` se sigue poblando vía `handle_new_user` tras el `REVOKE`) y el flujo completo de recuperación de contraseña de SPEC 15. Ambos requieren que Supabase envíe un correo real (confirmación / recuperación) y el proyecto devolvió `email rate limit exceeded` en los dos intentos realizados durante esta verificación — límite de envíos del proyecto, acumulado por las pruebas de SPEC 16 el mismo día, no causado por el `REVOKE` de esta spec. Evidencia indirecta a favor de que el trigger sigue funcionando: en Postgres, un trigger (de tabla o de evento) se ejecuta con los privilegios de su dueño al dispararse por el evento (`INSERT` en `auth.users`), sin requerir que el rol causante del evento tenga `EXECUTE` sobre la función — ese grant solo es necesario para invocación directa (`SELECT fn()` / `/rest/v1/rpc/...`), que es exactamente lo que se revocó. Queda como acción de seguimiento del usuario: reintentar el registro de una cuenta y el flujo de recuperación cuando el rate limit de correo se reinicie, y confirmar ambos criterios antes de dar la spec por cerrada.

## Decisiones tomadas y descartadas

- **La auditoría de RLS es de verificación, no de rediseño.** Razón: decisión explícita del usuario tras confirmar que RLS ya está habilitado con políticas razonables en las 3 tablas; solo se documenta el resultado salvo que aparezca una brecha real.
- **Se revoca `EXECUTE` de `handle_new_user()` y `rls_auto_enable()` para `anon`/`authenticated`.** Razón: decisión explícita del usuario — son funciones de trigger (una sobre `auth.users`, otra event trigger de DDL) que no necesitan ser invocables directamente vía `/rest/v1/rpc/...`; los triggers se siguen ejecutando con los privilegios del dueño de la función sin depender de ese grant.
- **Los 3 ajustes de Auth del dashboard quedan fuera del alcance de código.** Razón: decisión explícita del usuario — no hay API de gestión de Auth expuesta en el MCP de Supabase disponible en este entorno; se documentan como prerequisito manual, igual que SPEC 15 documentó las credenciales OAuth.
- **Solo los 3 headers del checklist, sin CSP ni headers adicionales.** Razón: decisión explícita del usuario para no arriesgar romper integraciones (Supabase, Resend, fuentes) con una política más agresiva.
- **Esta spec supera la decisión de SPEC 14 ("proxy sin bloquear ninguna ruta") y de SPEC 15 ("`/cuenta` protegida solo por UI, no por middleware").** Razón: decisión explícita del usuario al pedir esta protección; se documenta aquí en vez de editar retroactivamente esas specs, que quedan como registro histórico de por qué se decidió así en su momento.
- **`/nueva-contrasena` sin sesión redirige a `/recuperar`, no a `/login`.** Razón: decisión explícita del usuario — un enlace de recuperación inválido o expirado se resuelve pidiendo un nuevo correo de recuperación, no ofreciendo iniciar sesión.
- **El `useEffect` de `/cuenta` que redirigía por falta de sesión se elimina en vez de dejarse como defensa en profundidad.** Razón: decisión explícita del usuario — una vez que el proxy garantiza la protección, el chequeo cliente queda muerto y no aporta valor.
- **No se toca el riesgo de spoofing de `score`/`name` en `scores`.** Razón: es un riesgo de diseño ya aceptado desde SPEC 06/14 (nombre libre, sin anti-cheat), distinto en naturaleza al checklist de seguridad básico de infraestructura que cubre esta spec.

## Riesgos identificados

| Riesgo                                                                                                                                                                             | Mitigación                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revocar `EXECUTE` sobre `handle_new_user()` podría romper la creación de perfiles si Postgres requiriera ese grant para la invocación interna del trigger.                         | Los triggers (de tabla o de evento) se ejecutan con los privilegios del dueño de la función, sin necesidad de `EXECUTE` para el rol que dispara el evento; el paso 8 lo verifica registrando una cuenta nueva tras aplicar la migración. |
| Los 3 ajustes de Auth del dashboard quedan pendientes de que el usuario los aplique manualmente tras cerrar esta spec.                                                             | Se documentan explícitamente con sus valores recomendados (8 caracteres mínimo, leaked password protection activado, límite de signups por IP) para que queden como acción de seguimiento clara.                                         |
| El proxy no puede distinguir una "sesión de recuperación" de una sesión normal: si alguien con sesión normal visita `/nueva-contrasena` directamente, lo deja pasar igual que hoy. | Ese caso borde ya existía antes de esta spec (la página valida con `getSession` del mismo modo); no se introduce un riesgo nuevo, solo se mueve el mismo chequeo de cliente a proxy.                                                     |
| Mover la protección de `/cuenta` al proxy podría introducir un ciclo de redirección si `/login` también quedara protegida por error.                                               | `/login` no se incluye en las rutas protegidas de este spec; el paso 8 de verificación confirma que `/login?next=/cuenta` carga normalmente sin sesión.                                                                                  |
