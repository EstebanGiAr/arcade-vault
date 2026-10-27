---
name: spec-impl-game
description: Implementa una spec de juego aprobada con el mismo flujo que /spec-impl y, al cerrarla, dispara en secuencia los subagentes skin-designer y mobile-porter.
disable-model-invocation: true
argument-hint: "<NN-juego-id> | game-jam/<game-id>/NN-slug"
allowed-tools: Agent, Read, Glob, Grep, Edit, Write, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(npm run lint), Bash(npm run build), mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__read_console_messages, mcp__claude-in-chrome__tabs_close_mcp
---

# /spec-impl-game — Implementador de specs de juego

`/spec-impl-game` **es `/spec-impl`** con un post-proceso pegado al final. Toda la mecánica de identificar la spec, validar su estado, crear la rama e implementar paso a paso con pausas vive en `/spec-impl` y **no se redefine aquí**: se ejecuta tal cual, con dos desviaciones mínimas y explícitas (búsqueda de la spec ampliada a `specs/game-jam/`, y el cierre reemplazado por las Fases 5–7 de este documento). Al terminar de implementar, este comando cierra la spec y dispara en secuencia los subagentes `skin-designer` y `mobile-porter` — nunca en paralelo, nunca invirtiendo el orden.

## Fase 0 — Cargar el flujo base

Lee `.claude/skills/spec-impl/SKILL.md` completo. Si no existe, usa el espejo byte-idéntico en `.agents/skills/spec-impl/SKILL.md`.

Ejecuta sus **Fases 1 a 4 tal cual están escritas**, pasando `$ARGUMENTS` como el argumento de esa skill. Esto incluye, sin excepción:

- Bloquear si el estado de la spec no significa "Aprobado" (mostrando el mensaje de error estándar de esa skill, sin ofrecer alternativas).
- El chequeo del working tree antes de tocar ramas, y no stashear/commitear por cuenta propia.
- Leer `AutoCreateBranch` de `specs/.spec-config.yml` para decidir si crear la rama sin preguntar o pedir `[y/N]`.
- Mostrar el resumen de la spec (objetivo, alcance, plan, criterios) antes de empezar a implementar.
- Implementar un paso del plan a la vez, mostrar el diff y esperar confirmación antes de seguir con el siguiente.
- **Nunca commitear automáticamente.** Ni por paso, ni al final.
- Si algo en la spec es ambiguo: detenerse, describir la ambigüedad, presentar opciones, esperar la decisión. No improvisar.

Si en algún punto este documento y `/spec-impl` entran en conflicto, **gana `/spec-impl`**, salvo en las dos desviaciones declaradas abajo.

### Desviación 1 — Dónde buscar la spec

Al "Fase 1 — Identificar la spec" de `/spec-impl`, amplía la búsqueda: además de `specs/`, busca también bajo `specs/game-jam/<game-id>/`. El argumento puede venir como `frogger/01-frogger-core` o solo `01-frogger-core` si el id del juego es inambiguo entre las carpetas existentes.

Si la spec encontrada vive bajo `specs/game-jam/`, antes de seguir recuerda al usuario: estas specs son borradores exploratorios fuera de la secuencia `NN-slug.md` de `specs/`, y lo normal es que un humano las revise y las promueva a esa secuencia antes de implementarlas (ver `CLAUDE.md`). Pregunta si continuar así de todos modos o detenerse para promoverla primero. Si decide continuar, el nombre de rama derivado en la Fase 3 de `/spec-impl` usa `spec-game-<game-id>-NN-slug` en vez de `spec-NN-slug` (para no chocar con la numeración de `specs/`).

### Desviación 2 — El cierre

Donde `/spec-impl` termina su Fase 4 solo _recordando_ verificar los criterios de aceptación y actualizar el estado, este comando lo hace de verdad y continúa con el post-proceso: sigue con las Fases 5, 6 y 7 de abajo en vez de detenerse ahí.

---

## Fase 5 — Cerrar la spec

1. Verifica los criterios de aceptación **una sola vez, al final** (no reabrir Chrome tras cada paso intermedio): `npm run lint`, `npm run build`, y una pasada en Chrome sobre `/juegos/<id>/jugar` más cualquier otra ruta que la spec toque.
2. Marca en el archivo de la spec los criterios cumplidos y cambia `**Estado:**` a `Implementada`.
3. Si algún criterio falla: **detente**, reporta exactamente qué falló y **no lances ningún agente**. `skin-designer` y `mobile-porter` asumen un juego que ya funciona.
4. No commitees nada en esta fase.

## Fase 6 — `skin-designer` (primero, solo)

1. Deriva `<game-id>` del nombre de la spec (slug final del archivo o nombre de la carpeta bajo `game-jam/`) y valídalo contra las claves de `GAME_REGISTRY` en `components/games/registry.ts`. Si no coincide ninguna clave, detente y pregunta el id correcto — sin entrada en el registry no hay canvas que retematizar.
2. Lee `references/game-with-themes.md`. Si `<game-id>` **ya** aparece en la tabla "Con skins" (caso de un re-run sobre un juego existente), `skin-designer` se detendrá a preguntar si es un retoque; antes de invocarlo, pregúntale tú mismo al usuario qué ajustar y prepara el encargo declarando explícitamente que es un retoque intencional, no una primera pasada.
3. Invoca **una sola vez** el tool `Agent` con `subagent_type: "skin-designer"`, en español, nombrando exactamente ese juego por su id de registry, pidiendo mantener la skin `clasico` pixel-idéntica, validar contraste WCAG, correr lint/build, verificar en Chrome y dejar actualizado `references/game-with-themes.md`.
4. **Espera la notificación de que terminó** antes de seguir. No incluyas la invocación de `mobile-porter` en el mismo bloque de herramientas que esta.

## Fase 7 — `mobile-porter` (después, nunca a la vez)

1. Solo arranca cuando llegó la notificación de que `skin-designer` terminó. Está prohibido emitir ambas llamadas a `Agent` en el mismo turno, y prohibido predecir o inventar el resultado de `skin-designer` mientras se espera.
2. Si `skin-designer` falló o quedó a medias, repórtalo y pregunta antes de continuar — no lances `mobile-porter` sobre un sitio a medio modificar.
3. Invoca el tool `Agent` con `subagent_type: "mobile-porter"` autorizando la pasada completa del sitio (home, catálogo, detalle, salón de la fama, about/contacto, login), recordando que el reproductor y sus controles táctiles quedan fuera de alcance (ya resueltos por SPEC 11), y pidiendo verificación en 390×844 y 412×915.
4. Cuando termine, da al usuario un resumen único: spec implementada y su estado final, rama activa, qué hizo `skin-designer`, qué hizo `mobile-porter`, hallazgos corregidos vs. pendientes, y que el commit sigue siendo su decisión.

---

## Reglas duras

- Las Fases 1–4 son las de `/spec-impl`, ejecutadas sin reinterpretarlas. Ante cualquier conflicto con este documento, gana `/spec-impl` salvo en las dos desviaciones declaradas en la Fase 0.
- Nunca commitear, nunca hacer push, nunca abrir PR.
- `skin-designer` y `mobile-porter` van **en serie**, en ese orden, una sola invocación cada uno. Jamás en paralelo.
- Si no se puede derivar `<game-id>` ni hay entrada en `GAME_REGISTRY` (la spec no era de un juego nuevo con canvas propio), ejecuta solo las Fases 1–5 y avisa explícitamente que se omiten los agentes y por qué.
- No tocar `references/game-suggestions.md` — es territorio de `game-planner`.
