# Registro de auditorías de seguridad

Mantenido por el subagente `security-auditor`. Cada invocación añade una entrada
fechada con los hallazgos encontrados, su severidad y su estado. El checklist
base vive en `references/security/security-checklist.md`; el modelo de seguridad
intencionado está en SPEC 14–17.

Severidades: **Crítico** / **Alto** / **Medio** / **Bajo** / **Aceptado**.

## Riesgos aceptados

| Riesgo | Spec que lo acepta |
| ------ | ------------------- |
| `scores` acepta `name` libre y `score` sin validación server-side | SPEC 06 / 14 / 17 |
| Sin Content-Security-Policy | SPEC 17 |
| `/nueva-contrasena` no distingue sesión de recuperación de sesión normal | SPEC 17 |
| Catálogo y juego públicos sin sesión | SPEC 14 |

## Prerequisitos manuales del dashboard (seguimiento)

| Ajuste | Valor recomendado | Estado observado | Fecha |
| ------ | ------------------- | ----------------- | ----- |
| Minimum password length | 8 caracteres | No verificable por advisors (sin API de gestión en MCP); sin cambios reportados desde SPEC 17 | 2026-10-28 |
| Leaked Password Protection | Activado | **Sigue deshabilitado** — advisors reporta `auth_leaked_password_protection` (WARN) | 2026-10-28 |
| Max signup rate por IP | Limitado (anti-bot) | No verificable por advisors (sin API de gestión en MCP); sin cambios reportados desde SPEC 17 | 2026-10-28 |

## Auditorías

<!-- Entrada más reciente primero. -->

### 2026-10-28

**Superficies auditadas:** base de datos + aplicación (énfasis en autenticación: `auth-provider.tsx`, `lib/supabase/middleware.ts`/`proxy.ts`, `/cuenta`, `/nueva-contrasena`, `/recuperar`, `/auth/callback`, login/signup/OAuth, RLS de `profiles`)

**Hallazgos abiertos:** 0 críticos · 0 altos · 0 medios · 3 bajos

| Severidad | Superficie | Objeto | Hallazgo | Estado |
| --------- | ---------- | ------ | -------- | ------ |
| Bajo | BD | `profiles_insert_own` / `profiles_update_own` / `scores_insert_public` | Advisor de performance `auth_rls_initplan`: las 3 políticas re-evalúan `auth.uid()` por fila en vez de `(select auth.uid())`; no es una brecha de acceso, es degradación de performance a escala. | Abierto |
| Bajo | BD | Grants de tabla (`information_schema.role_table_grants`) | `anon`/`authenticated` tienen `INSERT`/`UPDATE`/`DELETE` concedidos a nivel de tabla en `games`, `profiles` y `scores` (patrón estándar de PostgREST/Supabase), sin política RLS equivalente para esos comandos salvo las ya documentadas (`profiles`/`scores` propio dueño). Hoy RLS bloquea todo lo que no tiene política — riesgo solo se activa si alguna vez se deshabilita RLS en una de estas tablas sin querer. | Abierto (latente, defensa en profundidad) |
| Bajo | App | `lib/profiles.ts:getProfileByUsername`/`updateUsername` | La consulta case-insensitive sobre `username` no escapa los wildcards de patrón (`%`/`_`); un username que contenga esos caracteres podría producir falsos positivos/negativos de colisión de unicidad (p. ej. `A_C` coincide con `ABC`). La unicidad real la garantiza el `unique constraint` de Postgres sobre `profiles.username`, así que no permite tomar un username ajeno, pero sí puede bloquear erróneamente un registro legítimo o aceptar temporalmente uno que la DB rechazará después. | Abierto |

**Verificaciones de autenticación realizadas sin hallazgo (líneas base confirmadas):**

- `lib/supabase/middleware.ts` decide la redirección de `/cuenta` y `/nueva-contrasena` con la función de Supabase que valida el JWT contra el servidor de Auth, no con la que solo lee la cookie local. Correcto según el modelo de SPEC 17.
- Todos los usos de la lectura local de sesión encontrados (`components/auth-provider.tsx`, `app/nueva-contrasena/page.tsx`) son de cliente (`"use client"`), legítimos para hidratar estado de UI, no para decidir autorización de servidor.
- `lib/auth.ts:getSessionUser` usa esa misma lectura local pero es código muerto: no tiene ningún consumidor real en el repo (solo se define, nadie lo importa). No representa un hallazgo activo hoy, pero si en el futuro se usa desde un server component o route handler para autorizar, debería migrarse a la variante que valida contra el servidor. Señalado como nota, no como hallazgo abierto.
- `app/auth/callback/route.ts`: el parámetro `next`/`type` se concatena como `${origin}${redirectTo}` — al llevar `origin` fijo delante, valores que empiezan con doble barra o barra invertida no producen un redirect fuera del sitio (el resultado sigue siendo una ruta bajo el propio origin, no una URL absoluta a otro host). No se encontró vector de open redirect explotable.
- Trigger `on_auth_user_created` sobre `auth.users` confirmado **habilitado** (`tgenabled = 'O'`, `AFTER INSERT`) vía `pg_trigger`, y event trigger `ensure_rls` (`rls_auto_enable`) confirmado habilitado vía `pg_event_trigger`. Esto resuelve indirectamente, con evidencia directa de catálogo (no solo el razonamiento teórico de SPEC 17), el criterio de aceptación pendiente de SPEC 17 sobre si `handle_new_user` sigue funcionando tras el `REVOKE EXECUTE`: el trigger está intacto y activo.
- Funciones `SECURITY DEFINER` (`handle_new_user`, `rls_auto_enable`): `search_path` fijado en ambas (`public` y `pg_catalog` respectivamente) y la verificación de privilegios confirma que `anon`/`authenticated` no pueden invocarlas directo. El `REVOKE` de SPEC 17 sigue vigente, advisors ya no reporta esos dos warnings.
- RLS habilitado (`relrowsecurity = true`) en las 3 tablas de `public` (`games`, `profiles`, `scores`); no aparecieron tablas nuevas sin RLS.
- Políticas vigentes coinciden exactamente con el modelo documentado en SPEC 17 (lectura pública en las 3, `profiles_insert_own`/`profiles_update_own` con `auth.uid() = id`, `scores_insert_public` con `user_id IS NULL OR user_id = auth.uid()`).
- No se encontraron vistas ni funciones en `public` que expongan `auth.users` sin filtrar.
- `next.config.ts` mantiene los 3 headers del checklist aplicados a `/(.*)`. Sin CSP — aceptado, SPEC 17.
- `proxy.ts`/`middleware.ts` protege `/cuenta` y `/nueva-contrasena` como documenta SPEC 17; `app/cuenta/page.tsx` ya no tiene el efecto de redirección cliente.
- Secretos: `RESEND_API_KEY` y `CONTACT_TO_EMAIL` solo aparecen en `app/api/contact/route.ts` (servidor); las claves de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) solo en `lib/supabase/*.ts`, todas con prefijo público o usadas exclusivamente en servidor. Ninguna clave de servicio en código de cliente. `.gitignore` mantiene `.env*` con excepción `!.env.template`; sin `.env` en el historial de git.
- Sin consultas directas a Supabase sueltas en `components/` fuera de los casos que solo instancian el cliente para pasarlo a `lib/` (regla de `CLAUDE.md` respetada).
- Sin patrones de inyección de HTML/JS (inyección de marcado sin sanitizar, evaluación dinámica de código) en `app/` ni `components/`.
- `app/api/contact/route.ts`: confirmado el mismo patrón ya conocido — sin límite de longitud de payload, sin rate limit, `name` interpolado directo en el asunto del correo (riesgo de inyección de cabecera si contiene saltos de línea), `CONTACT_TO_EMAIL` casteado a `string` sin verificar que exista. Pendiente de spec propia (ver siguiente paso sugerido).
- `lib/scores.ts:saveScore` sin validación server-side de `score`/`name`: riesgo aceptado vigente (SPEC 06/14/17), no se reabre.

**Sin cambios respecto a la auditoría anterior:** todos los puntos de "verificaciones sin hallazgo" arriba. **Resuelto desde la anterior:** verificación indirecta pero ahora con evidencia de catálogo (`pg_trigger`/`pg_event_trigger`) de que `handle_new_user` y `rls_auto_enable` siguen operativos tras el `REVOKE` de SPEC 17.
