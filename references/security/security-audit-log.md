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
| Minimum password length | 8 caracteres | — | — |
| Leaked Password Protection | Activado | — | — |
| Max signup rate por IP | Limitado (anti-bot) | — | — |

## Auditorías

<!-- Entrada más reciente primero. -->
