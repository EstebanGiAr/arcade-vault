# 18 — Endurecimiento del formulario de contacto

**Estado:** Aprobado
**Depende de:** SPEC 03
**Fecha:** 2026-10-28

**Objetivo:** Endurecer `app/api/contact/route.ts` contra abuso y entrada maliciosa agregando límites de longitud por campo, rate limiting en memoria por IP, saneo del nombre antes de interpolarlo en el subject del correo, y validación de que `CONTACT_TO_EMAIL` esté configurado antes de intentar el envío.

> Contexto: hallazgo de la auditoría de seguridad registrada en `references/security/security-audit-log.md` (entrada 2026-10-28), que señaló esta ruta sin límite de payload, sin rate limiting, con posible inyección en el subject vía `name`, y sin verificar `CONTACT_TO_EMAIL` antes de enviar.

## Alcance

**Incluido:**

- Límites de longitud por campo en `app/api/contact/route.ts`: `name` máx. 100 caracteres, `email` máx. 254 caracteres (máximo técnico de un email, RFC 5321), `message` máx. 2000 caracteres. Un campo que exceda su límite responde `400` con un mensaje de validación, igual que el chequeo de campos vacíos existente.
- Rate limiting en memoria por IP: máximo 3 envíos exitosos por hora por IP. Al superarse, la ruta responde `429` con un mensaje indicando que se intente más tarde. El estado vive en un `Map` en memoria del proceso (se reinicia si el proceso se reinicia; aceptado dado el bajo tráfico esperado de este formulario).
- La IP del cliente se obtiene del header `x-forwarded-for` (primer valor de la lista); si no está presente (p. ej. en desarrollo local), se usa un bucket único `"unknown"` compartido por todas las requests sin ese header.
- Saneo de `name`: antes de interpolarlo en el `subject` del correo, se eliminan saltos de línea y caracteres de control (`\r`, `\n`, y el resto del rango de control ASCII). El envío continúa normalmente con el valor saneado; no se rechaza la request por esto.
- Validación de `CONTACT_TO_EMAIL`: al inicio del handler, si la variable de entorno no está definida o es una cadena vacía, la ruta responde `500` con un mensaje de error genérico sin intentar llamar a Resend.
- Mantener el contrato de respuesta actual (`{ ok: boolean, error?: string }`) para que `components/contact-form.tsx` (o el componente que consuma esta ruta) no necesite cambios.

**No incluido (fuera de alcance de este spec):**

- Rate limiting persistente entre instancias o reinicios (Redis, tabla en Supabase). Razón: decisión explícita del usuario — en memoria es suficiente para el volumen de tráfico actual de este formulario.
- CAPTCHA u otro mecanismo anti-bot adicional al rate limiting. No se pidió y añadiría una dependencia nueva.
- Cambios en `components/contact-form.tsx` o en la UI del formulario, salvo que sean estrictamente necesarios para propagar los nuevos mensajes de error (`400` de longitud, `429` de rate limit) — si el componente ya muestra `error` genérico del JSON de respuesta, no se toca.
- Validar o sanear el campo `message` más allá del límite de longitud (p. ej. HTML, links). El mensaje se envía como texto plano (`text:` en Resend), no se renderiza como HTML en ningún lado.
- Content-Security-Policy u otros headers de seguridad generales — ya cubiertos o descartados en SPEC 17.
- Revisar o endurecer otras rutas de la API distintas a `/api/contact`.

## Modelo de datos

Esta spec no introduce estructuras nuevas en Supabase. El único "estado" nuevo es el `Map` en memoria del proceso para el rate limiting (clave: IP, valor: timestamps de envíos recientes), que vive solo en el runtime de Next.js y no se persiste.

## Plan de implementación

Cada paso deja el proyecto funcional (`npm run dev` arranca sin errores).

1. Agregar las constantes de límites (`MAX_NAME_LENGTH`, `MAX_EMAIL_LENGTH`, `MAX_MESSAGE_LENGTH`) y el chequeo de longitud por campo en `app/api/contact/route.ts`, devolviendo `400` con mensaje de validación si alguno se excede.
2. Implementar la función de saneo de `name` (eliminar `\r`, `\n` y caracteres de control) y aplicarla antes de construir el `subject` del correo.
3. Agregar el chequeo de `CONTACT_TO_EMAIL`: si no está definida o es vacía, responder `500` con un error genérico antes de instanciar `Resend` o llamar a `resend.emails.send`.
4. Implementar el rate limiter en memoria: un `Map<string, number[]>` a nivel de módulo (persiste entre requests dentro del mismo proceso) que registra timestamps de envíos exitosos por IP, purga entradas de más de una hora, y rechaza con `429` si ya hay 3 o más en la ventana vigente. Obtener la IP desde `request.headers.get("x-forwarded-for")` con el fallback `"unknown"` descrito arriba.
5. Verificar que `components/contact-form.tsx` (o el componente que haga el `fetch` a `/api/contact`) ya maneja genéricamente los nuevos casos (`400`/`429`/`500` con `{ ok: false, error }`); si no lo hace, ajustar solo lo mínimo para mostrar el mensaje de error devuelto.
6. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error.
7. Verificar, solo al final, en el navegador: un envío válido funciona igual que antes; un campo que excede su longitud máxima responde `400` y se muestra en el formulario; un `name` con salto de línea se envía igual pero el correo recibido (o el payload enviado a Resend, verificable en logs/consola si no se puede inspeccionar el correo real) tiene el subject saneado; 4 envíos seguidos desde la misma sesión de navegador disparan `429` en el cuarto; y, simulando `CONTACT_TO_EMAIL` vacío en `.env.local`, la ruta responde `500` sin llamar a Resend.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores.
- [ ] Un envío con `name`/`email`/`message` dentro de los límites funciona igual que antes de esta spec.
- [ ] Un envío con `name` > 100, `email` > 254 o `message` > 2000 caracteres responde `400` con un mensaje de validación y no llama a Resend.
- [ ] Un `name` con saltos de línea o caracteres de control se envía con el subject saneado (sin esos caracteres), sin rechazar la request.
- [ ] El cuarto envío exitoso desde la misma IP dentro de una hora responde `429`.
- [ ] Con `CONTACT_TO_EMAIL` no definido o vacío, la ruta responde `500` sin invocar `resend.emails.send`.
- [ ] El contrato de respuesta (`{ ok, error? }`) se mantiene sin romper el consumo actual del formulario en el cliente.

## Decisiones tomadas y descartadas

- **Rate limiting en memoria (`Map` por IP), no en Supabase ni Redis.** Razón: decisión explícita del usuario — simplicidad sin infraestructura nueva; aceptable que se reinicie en cold start dado el bajo tráfico del formulario de contacto.
- **Límite de 3 envíos por hora por IP.** Razón: decisión explícita del usuario — suficiente margen para un usuario legítimo que reintenta tras un error, bajo para un bot.
- **Límites de longitud: `name` 100, `email` 254, `message` 2000.** Razón: decisión explícita del usuario — 254 es el máximo técnico real de un email (RFC 5321); 100 y 2000 son holgados para uso legítimo sin permitir payloads abusivos.
- **El saneo de `name` es silencioso (se limpia, no se rechaza).** Razón: decisión explícita del usuario — un salto de línea accidental no debería bloquear a un usuario legítimo; el riesgo real (inyección en el subject) se neutraliza igual limpiando el valor.
- **La IP se obtiene de `x-forwarded-for`, con fallback a un bucket `"unknown"`.** Razón: Next.js no expone `request.ip` en route handlers en la mayoría de hosts (incluido Vercel); es el enfoque estándar para este runtime.
- **No se agrega CAPTCHA ni otro anti-bot adicional.** Razón: no solicitado; el rate limiting por IP ya cubre el caso de abuso identificado por la auditoría.
- **No se cambia el envío de `message` a HTML ni se agrega sanitización HTML.** Razón: el correo se envía como texto plano (`text:`), no hay superficie de XSS en el envío actual.

## Riesgos identificados

| Riesgo                                                                                                                                                                           | Mitigación                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El rate limiter en memoria no comparte estado entre instancias si el hosting escala horizontalmente (varias instancias del proceso Next.js).                                     | Aceptado explícitamente por el usuario; el volumen de tráfico esperado de este formulario no justifica una solución distribuida todavía.                                   |
| El fallback de IP `"unknown"` agrupa a todos los clientes sin `x-forwarded-for` (típicamente solo en desarrollo local) bajo el mismo límite.                                     | No afecta producción (donde el proxy/hosting siempre agrega `x-forwarded-for`); en desarrollo local el límite compartido es una molestia menor, no un riesgo de seguridad. |
| Si `components/contact-form.tsx` no maneja hoy el código `429` de forma específica, el usuario vería un mensaje de error genérico en vez de uno claro sobre el límite de envíos. | El paso 5 del plan verifica esto explícitamente y ajusta el mensaje mostrado solo si es necesario, sin rediseñar el componente.                                            |
