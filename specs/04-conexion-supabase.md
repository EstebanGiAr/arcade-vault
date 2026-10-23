# 04 — Conexión de Supabase con el proyecto

**Estado:** Implementado
**Depende de:** —
**Fecha:** 2026-10-23

**Objetivo:** Establecer la conexión del proyecto Next.js con Supabase (cliente para navegador y para servidor, variables de entorno), sin crear ninguna tabla, trigger ni política RLS — eso queda para un spec futuro una vez que se definan los datos reales a persistir.

## Alcance

**Incluido:**

- Instalación de `@supabase/supabase-js` y `@supabase/ssr` en `package.json`.
- Cliente de Supabase para navegador: `lib/supabase/client.ts` (usa `createBrowserClient` de `@supabase/ssr` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Cliente de Supabase para servidor: `lib/supabase/server.ts` (usa `createServerClient` de `@supabase/ssr`, maneja cookies vía `next/headers` para Server Components / Route Handlers).
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` agregadas a `.env.template` (vacías) y documentadas para `.env.local`.
- Verificación de que la conexión al proyecto remoto (`rqfoygveebbovhyhmapj`) funciona de extremo a extremo: una llamada simple desde el cliente (ej. `supabase.auth.getSession()`) no lanza error de configuración/URL/key inválida.

**No incluido (fuera de alcance de este spec):**

- Crear cualquier tabla, función, trigger, índice o política RLS en la base de datos. El proyecto Supabase permanece sin esquema propio (`mcp__supabase__list_tables` sigue devolviendo vacío al cerrar este spec).
- Esquema de `profiles`, `scores`, o cualquier otra tabla — se definirán en un spec futuro cuando se decida qué datos persistir.
- Conectar `app/login/page.tsx` a `supabase.auth.signUp` / `signInWithPassword`. El formulario sigue funcionando exactamente igual que hoy (fake, solo guarda el nombre en `localStorage` vía `auth-provider.tsx`).
- Migrar `auth-provider.tsx` de `localStorage` a sesión real de Supabase.
- Rediseño visual de `/login`.
- Conectar `/salon-de-la-fama` o `components/game-player.tsx` a datos reales — siguen usando `seededScores` y `saveScore` de `localStorage`.
- Habilitar o configurar providers de Auth (email/contraseña, OAuth) en el dashboard de Supabase — no aplica porque no se usa Auth todavía en este spec.
- Realtime y Edge Functions — quedan explícitamente para specs futuros.

## Modelo de datos

Este spec no introduce ninguna estructura de base de datos ni tipos nuevos en el código más allá de los clientes de Supabase (que no tienen esquema propio). Solo agrega variables de entorno:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

(`.env.template`, valores vacíos; el usuario pega los reales en `.env.local`, no versionado).

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. Instalar dependencias: `npm install @supabase/supabase-js @supabase/ssr`.
2. Crear `lib/supabase/client.ts`: exporta `createClient()` usando `createBrowserClient` de `@supabase/ssr` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Crear `lib/supabase/server.ts`: exporta una función (async, usa `cookies()` de `next/headers`) que crea el cliente con `createServerClient` de `@supabase/ssr` para Server Components y Route Handlers.
4. Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `.env.template`.
5. Obtener los valores reales del proyecto con `mcp__supabase__get_project_url` y `mcp__supabase__get_publishable_keys`, y pegarlos en `.env.local`.
6. Prueba manual mínima de conectividad: desde un Server Component, Route Handler o script temporal, llamar `supabase.auth.getSession()` (o una llamada equivalente que no requiera ninguna tabla) usando ambos clientes y confirmar que responde sin error de URL/key inválida.
7. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` existen y exportan clientes de Supabase correctamente tipados.
- [ ] `.env.template` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` vacías, y `.env.local` tiene los valores reales del proyecto.
- [ ] Una llamada de prueba (ej. `supabase.auth.getSession()`) usando el cliente de navegador y el de servidor responde sin error de conexión/configuración.
- [ ] `mcp__supabase__list_tables` sigue devolviendo el esquema `public` vacío — este spec no crea ninguna tabla.
- [ ] `/login`, `/salon-de-la-fama` y `components/game-player.tsx` siguen funcionando exactamente igual que antes de este spec (sin cambios de comportamiento ni de UI).

## Decisiones tomadas y descartadas

- **Alcance limitado a la conexión, sin esquema de base de datos.** Este spec no crea tablas, triggers ni políticas RLS. Razón: decisión explícita del usuario — quiere establecer primero la conexión Supabase-proyecto de forma aislada, y definir el modelo de datos (`profiles`, `scores`, etc.) en un spec futuro separado.
- **Paquetes: `@supabase/supabase-js` + `@supabase/ssr`.** Es el stack oficial actual para Next.js App Router: `ssr` maneja cookies/sesión en Server Components y Route Handlers, `supabase-js` es el cliente base. Razón: decisión explícita del usuario, pensando en que Auth y SSR se necesitarán en specs futuros.
- **Nombres de variables de entorno:** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, siguiendo la convención oficial de Supabase + Next.js. Razón: decisión explícita del usuario.
- **Sin verificación de providers de Auth en el dashboard.** Al no usarse Auth todavía, no se valida ni configura el provider de email/contraseña en este spec. Razón: consecuencia directa de acotar el alcance solo a la conexión.

## Riesgos identificados

- **Clave anónima (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) expuesta al cliente sin ninguna tabla ni política RLS todavía definida:** no representa un riesgo de datos en este spec porque no existe esquema que proteger, pero es importante no usar este cliente para crear tablas o datos sensibles antes de que el spec de modelo de datos defina RLS. Mitigación: documentado aquí como recordatorio para el spec futuro de esquema.
- **Valores reales de Supabase en `.env.local`:** si no se completan correctamente (URL o key copiada mal), la prueba de conectividad del paso 6 fallará de forma confusa. Mitigación: el paso 5 obtiene los valores directamente vía las herramientas MCP de Supabase en vez de que el usuario los copie manualmente del dashboard.
