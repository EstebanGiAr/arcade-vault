# 03 — About page y envío de correo de contacto

**Estado:** Implementado
**Depende de:** SPEC 01, SPEC 02
**Fecha:** 2026-10-22

**Objetivo:** Implementar la pantalla "Acerca de" (`/about`) replicando `about.jsx` del template (hero de misión, highlights y formulario de contacto), con el formulario enviando correos reales a través de Resend desde una API route de Next.js.

## Alcance

**Incluido:**

- Nueva ruta `app/about/page.tsx` con las dos secciones de `about.jsx`: hero "ACERCA DE ARCADE VAULT" (kicker, título, misión, fila de 3 highlights con iconos pixel), divisor animado, y sección de contacto (intro + tips + formulario).
- Animaciones `reveal` (fade/slide al hacer scroll vía `IntersectionObserver`), reutilizando la clase `.reveal`/`.reveal.in` ya portada en SPEC 02.
- Migración del bloque CSS `ABOUT PAGE` de `references/templates/home-about/styles.css` (líneas ~1071–1146: `.about-hero`, `.highlight-row`, `.about-divider`, `.about-contact`, `.contact-form`, `.terminal-success`, `@keyframes shake`) a `app/arcade-vault.css`, ya que no fue portado en SPECs anteriores.
- Formulario de contacto (nombre, correo electrónico, mensaje) con validación en cliente idéntica al template (si algún campo está vacío, `shake` de 400ms y no se envía).
- Nueva API route `app/api/contact/route.ts` que recibe `{ name, email, message }`, valida en servidor (campos no vacíos + regex simple de email) y usa el SDK de `resend` para enviar el correo.
- Envío de correo vía Resend usando el dominio sandbox (`from: "onboarding@resend.dev"`, sin requerir dominio propio verificado) hacia `estebangiraldo445@gmail.com`, configurado vía variables de entorno (ver sección de datos/env).
- Estado de éxito igual al template: tras un envío exitoso, el formulario se reemplaza por el bloque `terminal-success` (animación de terminal con el nombre del usuario) y un botón "ENVIAR OTRO MENSAJE" que resetea el formulario.
- Nuevo estado de error (no existe en el template original): si la API route responde con error (API key inválida, fallo de Resend, red, validación de servidor), se muestra un mensaje de error estilo terminal (texto en rojo/variante de `.term-body`) dentro del mismo formulario, sin perder los datos ingresados, permitiendo reintentar.
- Actualización de `components/nav.tsx`: agregar el link "Acerca de" apuntando a `/about` (desktop y drawer móvil), con detección de ruta activa (`isAbout`), siguiendo el mismo patrón que los demás links de `Nav`.
- Agregar la dependencia `resend` a `package.json`.
- Documentar en este spec (no commitear) las variables de entorno necesarias en `.env.local`: `RESEND_API_KEY` y `CONTACT_TO_EMAIL`.

**No incluido (fuera de alcance de este spec):**

- Dominio propio verificado en Resend — se usa el dominio sandbox (`onboarding@resend.dev`) como remitente. Migrar a un dominio propio queda para un spec futuro cuando exista uno verificado.
- Persistencia de los mensajes de contacto (no se guardan en `localStorage` ni en ninguna base de datos; solo se envían por correo).
- Rate limiting, captcha o cualquier protección anti-spam del formulario.
- Librerías de validación como `zod` — la validación de servidor es manual (checks de campos no vacíos + regex simple de email).
- Botones sociales decorativos u otro contenido del template que no esté en `about.jsx`.
- Tests automatizados (el proyecto no tiene suite configurada).

## Modelo de datos

Este spec no introduce estructuras en `app/data.ts` ni en `lib/storage.ts`. Las únicas estructuras nuevas son locales a la UI y a la API route, equivalentes al `form`/`sent` de `about.jsx`:

```ts
// dentro de app/about/page.tsx (client component)
type ContactForm = { name: string; email: string; msg: string };
// sent: string | null (nombre del usuario cuando el envío fue exitoso)
// error: string | null (mensaje de error cuando el envío falló)
```

```ts
// app/api/contact/route.ts
type ContactPayload = { name: string; email: string; message: string };
// POST -> { ok: true } | { ok: false; error: string }
```

Variables de entorno nuevas (en `.env.local`, no versionado — ya cubierto por `.env*` en `.gitignore`):

```
RESEND_API_KEY=       # API key de Resend; el usuario la pega localmente tras implementar
CONTACT_TO_EMAIL=estebangiraldo445@gmail.com
```

## Plan de implementación

Cada paso deja el proyecto en estado funcional (`npm run dev` arranca sin errores).

1. Instalar la dependencia `resend` (`npm install resend`).
2. Portar el bloque CSS `ABOUT PAGE` de `references/templates/home-about/styles.css` (`.about-hero`, `.highlight-row`, `.highlight`, `.about-divider`, `.div-bar`, `.div-pixels`, `.about-contact`, `.contact-grid`, `.contact-intro`, `.contact-tips`, `.contact-form`, `.terminal-success`, `.term-bar`, `.term-body`, `@keyframes shake`) a `app/arcade-vault.css`.
3. Crear `app/api/contact/route.ts`: handler `POST` que parsea el body JSON, valida `name`/`email`/`message` no vacíos y `email` con regex simple; si falla, responde `400` con `{ ok: false, error }`; si pasa, llama a `new Resend(process.env.RESEND_API_KEY).emails.send(...)` con `from: "Arcade Vault <onboarding@resend.dev>"`, `to: process.env.CONTACT_TO_EMAIL`, asunto y cuerpo armados desde el payload; responde `200` con `{ ok: true }` en éxito o `500` con `{ ok: false, error }` si Resend falla.
4. Crear `app/about/page.tsx` (client component) con el hero (kicker, título, misión, `highlight-row` con los 3 iconos pixel de `HighlightIcon` portados tal cual de `about.jsx`), el divisor `reveal`, y la sección de contacto con el formulario controlado (`name`, `email`, `msg`).
5. Implementar el `onSubmit` del formulario: validar campos no vacíos en cliente (shake si falla, igual que el template); si pasan, hacer `fetch("/api/contact", { method: "POST", body: JSON.stringify({ name, email, message: msg }) })`; en éxito, setear `sent` con el nombre y mostrar `terminal-success`; en error (respuesta `ok: false` o fetch fallido), setear `error` con el mensaje y mostrar el bloque de error dentro del formulario sin borrar los campos.
6. Aplicar el `IntersectionObserver` para las clases `reveal` en `app/about/page.tsx`, igual que en `home.jsx`/SPEC 02.
7. Actualizar `components/nav.tsx`: agregar `Link href="/about"` con label "Acerca de" en `links` (desktop) y en el panel móvil, junto con `isAbout = pathname === "/about"` para resaltar la ruta activa.
8. Agregar `RESEND_API_KEY` y `CONTACT_TO_EMAIL` a un `.env.local` local (no commiteado) — el usuario pega su API key de Resend tras este paso.
9. Probar manualmente el envío: completar el formulario en `/about`, confirmar que llega el correo a `estebangiraldo445@gmail.com`, y verificar el estado de error simulando una `RESEND_API_KEY` inválida.
10. Correr `npm run lint` y `npm run build`, corrigiendo cualquier error de tipado o de ESLint antes de dar por cerrado el spec.

## Criterios de aceptación

- [x] `npm run build` termina sin errores.
- [x] `npm run lint` no reporta errores.
- [x] `/about` muestra el hero "ACERCA DE ARCADE VAULT", la fila de 3 highlights, el divisor animado y la sección de contacto, visualmente igual al prototipo de `references/templates/home-about/about.jsx`.
- [x] El `Nav` muestra el link "Acerca de" apuntando a `/about`, activo cuando `pathname === "/about"`, tanto en desktop como en el drawer móvil.
- [x] Si se intenta enviar el formulario con algún campo vacío, el formulario hace `shake` y no se envía la petición a `/api/contact`.
- [x] Al enviar el formulario completo correctamente, se recibe un correo real en `estebangiraldo445@gmail.com` con los datos ingresados.
- [x] Tras un envío exitoso, el formulario se reemplaza por el bloque `terminal-success` con el nombre ingresado, y "ENVIAR OTRO MENSAJE" vuelve a mostrar el formulario vacío.
- [x] Si `/api/contact` responde con error (ej. `RESEND_API_KEY` inválida), se muestra un mensaje de error dentro del formulario y los datos ingresados no se pierden.
- [x] Las secciones con la clase `reveal` en `/about` aparecen con la animación de fade/slide al hacer scroll hasta ellas.

## Decisiones tomadas y descartadas

- **Ruta:** `/about` en vez de `/acerca-de`. Razón: decisión explícita del usuario, priorizando la correspondencia directa con el nombre del archivo del template (`about.jsx`) sobre la convención en español de otras rutas del proyecto.
- **Link en Nav:** se agrega "Acerca de" a `Nav` en este mismo spec, revirtiendo la decisión de SPEC 02 de dejarlo fuera. Razón: decisión explícita del usuario — ya existe la ruta `/about`, por lo que el link deja de estar roto.
- **Remitente de Resend:** se usa el dominio sandbox (`onboarding@resend.dev`) en vez de un dominio propio verificado. Razón: el usuario no tiene un dominio verificado en Resend al momento de este spec; usar el sandbox permite implementar y probar el envío real sin bloquear el spec en un paso externo (verificación DNS).
- **API key de Resend:** no se documenta ni se pega en el spec ni en el chat. Razón: es un secreto; el usuario la coloca directamente en `.env.local` (ya cubierto por `.env*` en `.gitignore`) después de la implementación, en vez de compartirla en texto plano.
- **Validación de servidor:** checks manuales (no vacío + regex simple de email) en vez de una librería como `zod`. Razón: decisión explícita del usuario para no añadir una dependencia nueva fuera del stack ya definido, dado que es un MVP.
- **Estado de error en el formulario:** se agrega un estado de error que no existe en el template original (`about.jsx` solo maneja éxito). Razón: decisión explícita del usuario — al conectar un servicio real (Resend) que puede fallar, el usuario necesita saber si su mensaje no se envió.
- **Persistencia del mensaje de contacto:** no se guarda en ningún lado, solo se envía por correo. Razón: decisión explícita del usuario para mantener el alcance acotado a "page + envío de correo", sin introducir una tabla o archivo de mensajes.

## Riesgos identificados

- **Dominio sandbox de Resend:** `onboarding@resend.dev` tiene límites de uso y puede marcarse como spam en algunos proveedores de correo. Mitigación: documentado como decisión temporal; migrar a un dominio propio verificado en un spec futuro no bloquea el MVP actual.
- **`RESEND_API_KEY` ausente o inválida en desarrollo:** si el usuario no ha pegado la key en `.env.local` antes de probar, la API route fallará en cada intento. Mitigación: el paso 8 del plan es explícito sobre configurar la variable antes del paso de prueba manual (paso 9), y el estado de error del formulario hace visible el fallo en vez de fallar en silencio.
