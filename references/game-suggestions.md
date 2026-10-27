# Backlog de juegos sugeridos

Mantenido por el agente `game-planner`. Cada sugerencia entra en `Pendientes`
con su ficha; al implementarse pasa a `Implementados`, y si se rechaza pasa a
`Descartados` con el motivo. Los juegos ya jugables viven en
`references/implemented-games.md`; aquí se replican solo para no re-sugerirlos.

## Pendientes

- `duelo` — VERSUS · cyan — Sugerido: 2026-10-26 — **recomendación principal**. Pong contra IA; ficha completa abajo.
- `invasores` — SHOOTER · magenta — Sugerido: 2026-10-26 — alternativa. Shooter de oleadas en grilla fija (estilo Space Invaders), distinto de la física libre de `asteroides`. Cover huérfano `cover-invaders` ya listo.
- `rana` — ARCADE · green — Sugerido: 2026-10-26 — alternativa. Cruce de carriles con temporización (estilo Frogger), mecánica de esquivar/temporizar no cubierta por `arkanoid` (rebote) ni `snake` (crecimiento). Cover huérfano `cover-rana` ya listo.
- `galaga` — SHOOTER · yellow — Sugerido: 2026-10-26 — oleadas con patrones de vuelo en curva. Riesgo bajo. Sin cover huérfano libre.
- `ciempies` — SHOOTER · green — Sugerido: 2026-10-26 — Centipede-like; ciempié que se fragmenta en segmentos independientes. Riesgo medio. Sin cover libre.
- `comando-misiles` — SHOOTER · cyan — Sugerido: 2026-10-26 — Missile Command-like; apuntar y detonar antes de que los misiles lleguen a las ciudades. Riesgo bajo-medio. Disputa `cover-rocas`.
- `defensor` — SHOOTER · magenta — Sugerido: 2026-10-26 — Defender-like; scroll horizontal libre + rescate de humanoides + minimapa. Riesgo **alto**, el más ambicioso del lote. Disputa `cover-rocas`.
- `galaxian` — SHOOTER · yellow — Sugerido: 2026-10-26 — muy similar a `invasores`; se solapa bastante, candidato débil si `invasores` avanza. Riesgo bajo. Sin cover libre.
- `comecocos` — ARCADE · yellow — Sugerido: 2026-10-26 — Pac-Man-like; laberinto fijo + 4 fantasmas con IA chase/scatter. Riesgo medio de build, **riesgo de marca alto** (IP viva de Namco/Bandai, requiere diseño propio). `cover-glot` es un match casi literal (disputado con `gemas`/`burbujas`).
- `excavador` — ARCADE · cyan — Sugerido: 2026-10-26 — Dig Dug-like; cavar túneles en tilemap destructible y reventar enemigos subterráneos. Riesgo medio-bajo. Disputa `cover-rocas`.
- `minero` — PUZZLE/ARCADE · magenta — Sugerido: 2026-10-26 — Lode Runner-like; cavar huecos temporales en plataformas, guardias perseguidores. Riesgo medio. Sin cover libre.
- `pengo` — ARCADE · cyan — Sugerido: 2026-10-26 — Pengo-like; empujar/romper bloques de hielo contra enemigos en grid. Riesgo bajo-medio, de las mecánicas más simples del lote. Sin cover libre.
- `saltarin` — PUZZLE · yellow — Sugerido: 2026-10-26 — Q*bert-like; pirámide isométrica de cubos. Riesgo **alto** (exige proyección isométrica, se aleja del patrón top-down ya validado). Sin cover libre.
- `hockey-aire` — VERSUS · magenta — Sugerido: 2026-10-26 — Air Hockey contra IA; disco con fricción/rebote en 4 bordes, mazo en 2 ejes. Riesgo bajo-medio. Sin cover libre.
- `boxeo` — VERSUS · yellow — Sugerido: 2026-10-26 — Boxing 1v1 contra IA; state machine de golpe/bloqueo por timing. Riesgo medio. Sin cover libre.
- `esgrima` — VERSUS · cyan — Sugerido: 2026-10-26 — duelo de espadas por ventanas de timing ataque/parada. Riesgo medio. Sin cover libre.
- `tanques` — VERSUS · green — Sugerido: 2026-10-26 — Tank Duel 1v1 contra IA; combina movimiento + disparo de proyectil, reutiliza patrones de `asteroides`. Riesgo medio. Sin cover libre.
- `fusion` — PUZZLE · yellow — Sugerido: 2026-10-26 — estilo 2048; matriz fija, sin loop físico continuo. Riesgo bajo, de los más baratos del lote. Sin cover libre.
- `gemas` — PUZZLE · magenta — Sugerido: 2026-10-26 — match-3 tipo Bejeweled; detección de matches, cascadas y repoblado. Riesgo medio. Disputa `cover-glot`.
- `burbujas` — PUZZLE · cyan — Sugerido: 2026-10-26 — bubble shooter; cañón + grilla hexagonal + flood-fill para grupos. Riesgo medio-alto, sin fuente vanilla que portar. Disputa `cover-glot`.
- `vuelo` — ARCADE · green — Sugerido: 2026-10-26 — estilo Flappy Bird; un sprite con gravedad, colisión AABB contra tubos. Riesgo bajo, el port más simple de todo el backlog. Sin cover libre.
- `torre` — ARCADE · cyan — Sugerido: 2026-10-26 — stacker de bloques apilables; recorte de ancho dinámico + cámara que sube. Riesgo bajo-medio. `cover-rocas` es el mejor match visual del lote (disputado).

## Implementados

- [x] `asteroides` — SHOOTER · cyan — SPEC 05
- [x] `tetris` — PUZZLE · magenta — SPEC 07
- [x] `arkanoid` — ARCADE · yellow — SPEC 08
- [x] `snake` — ARCADE · green — SPEC 09

## Descartados

- (ninguno)

## Fichas

<!-- Una sección `### <id>` por sugerencia pendiente, con la ficha completa (cat, color, mecánica, condición de fin, puntuación, hudStats, aspectRatio, assets, cover art, riesgos). -->

### duelo

- **Título propuesto:** DUELO
- **cat:** `VERSUS` (único hueco del catálogo sin ningún juego todavía; valor válido del check de Postgres)
- **color:** `cyan` (reutilizar color es válido, no hay constraint de unicidad; combina con los acentos cyan/magenta/amarillo ya usados en `cover-duelo`)
- **Mecánica central:** Pong clásico contra una IA. El jugador controla la paleta izquierda con teclado (arriba/abajo); la IA controla la derecha siguiendo la pelota con una velocidad limitada (para que sea vencible). La pelota rebota en paletas y en techo/suelo; acelera levemente en cada rebote.
- **Condición de fin:** si la IA anota 3 puntos antes que el jugador, termina la partida (modela `lives` como "puntos de margen" que se consumen cuando anota la IA, igual que en `arkanoid`/`asteroides`). Si el jugador quiere seguir sumando score indefinidamente mientras no pierda las 3 vidas, el marcador (`score`) sigue acumulando puntos propios.
- **Modelo de puntuación:** `score` = puntos anotados por el jugador (acumulable, apto para el leaderboard). `lives` = puntos de margen restantes antes de que la IA gane (arranca en 3, baja con cada punto de la IA). `level` = dificultad/velocidad de la pelota y de la IA, sube cada N puntos del jugador.
- **hudStats:** `["score", "lives", "level"]` — mismo shape que `asteroides`/`arkanoid`, cero cambios a `HudStatKey`.
- **aspectRatio:** sin override; 4/3 por defecto (cancha de Pong clásica se adapta bien al `.crt-screen` existente).
- **Assets requeridos:** ninguno — paletas, pelota y cancha se dibujan por vector/canvas, igual que `asteroides`.
- **Cover art:** reutilizar `cover-duelo` (huérfano en `app/arcade-vault.css`, líneas 864-878) — ya dibuja literalmente una cancha de Pong con línea discontinua central, paleta cyan a la izquierda, paleta magenta a la derecha y una pelota amarilla. Encaje perfecto, cero trabajo de diseño nuevo.
- **Riesgos de port/build:** no hay fuente vanilla en `references/started-games/` (solo existen `02-asteroids`, `03-tetris`, `04-arkanoid`, todos ya portados) — se construye desde cero siguiendo el scaffolding de `port-recipe.md` (clases puras, refs, `reportChanges`, etc.), pero la física es la más simple de las cuatro ya implementadas (dos paletas + una pelota, sin fragmentación ni grilla). El único diseño nuevo real es ajustar la velocidad/reacción de la IA para que sea un rival creíble pero vencible — decisión de balance para la spec de `/add-game`, no un riesgo técnico.

### invasores (alternativa, sin ficha completa)

- **cat/color:** `SHOOTER` · `magenta`
- **Mecánica:** oleadas de invasores en grilla fija que descienden y disparan, cañón del jugador se mueve en un eje horizontal — mecánica de "disparo en grilla" distinta a la física libre de asteroides/gravedad cero de `asteroides`.
- **Cover:** reutilizar `cover-invaders` (huérfano, ya dibuja una grilla de invasores verde/magenta sobre un cañón cyan).
- **Por qué quedó segunda:** cubre un hueco de variedad dentro de SHOOTER (ya tiene un representante), mientras que VERSUS no tiene ninguno — `duelo` prioriza el hueco más grande del catálogo.

### rana (alternativa, sin ficha completa)

- **cat/color:** `ARCADE` · `green`
- **Mecánica:** cruce de carriles de tráfico/agua con temporización (estilo Frogger) — mecánica de esquivar y sincronizar movimiento, no cubierta por el rebote de `arkanoid` ni el crecimiento de `snake`.
- **Cover:** reutilizar `cover-rana` (huérfano, ya dibuja carriles horizontales cyan con un punto verde central).
- **Por qué quedó tercera:** buen hueco de mecánica, pero ARCADE ya tiene dos representantes (`arkanoid`, `snake`) mientras VERSUS no tiene ninguno.

---

Las siguientes 17 fichas vienen de una ronda de brainstorming en paralelo (4 agentes `game-planner` en simultáneo, uno por bloque de género) pedida explícitamente por el usuario para explorar variedad; no reemplazan la recomendación principal (`duelo`) ni las alternativas ya fichadas arriba. Varios candidatos **disputan el mismo cover huérfano** — solo uno por grupo puede quedárselo sin trabajo de diseño nuevo; el resto necesitaría cover propio.

### galaga

- **cat/color:** `SHOOTER` · `yellow`
- **Mecánica:** oleadas descendentes con patrones de vuelo en curva y ataques en picada; disparo vertical fijo.
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** bajo — canvas 2D simple, sin física de librería; lo único no trivial son las curvas de vuelo.
- **Cover:** ninguno de los huérfanos calza; requeriría diseño nuevo (naves en grilla, amarillo).

### ciempies

- **cat/color:** `SHOOTER` · `green`
- **Mecánica:** Centipede-like; ciempié que se fragmenta en segmentos independientes al dispararle, grid de hongos.
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** medio — la fragmentación en segmentos con estado propio es más lógica que los shooters ya implementados, pero sigue siendo canvas 2D puro.
- **Cover:** ninguno libre; necesitaría diseño nuevo (hongos + insecto segmentado en verde).

### comando-misiles

- **cat/color:** `SHOOTER` · `cyan`
- **Mecánica:** Missile Command-like; apuntar y detonar explosiones circulares crecientes antes de que los misiles lleguen a las ciudades/baterías.
- **hudStats:** `["score", "lives", "level"]` (lives = ciudades restantes)
- **Riesgo:** bajo-medio — trazado de misiles + radio de explosión es la única pieza nueva.
- **Cover:** `cover-rocas` reutilizable con reinterpretación (rocas → cráteres/ciudades), no es un encaje literal. Disputado con `defensor`, `excavador` y `torre`.

### defensor

- **cat/color:** `SHOOTER` · `magenta`
- **Mecánica:** Defender-like; scroll horizontal libre, nave que dispara en ambas direcciones, rescate de humanoides, minimapa.
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** **alto** — exige terreno con scroll + rescate + minimapa; el más ambicioso de todo el backlog.
- **Cover:** `cover-rocas` calza razonablemente (terreno rocoso + nave triángulo cyan sobrevolando). Disputado.

### galaxian

- **cat/color:** `SHOOTER` · `yellow` (o `magenta` para diferenciar de `invasores`)
- **Mecánica:** oleadas descendentes con ataques en picada individual — muy similar en estructura a `invasores`.
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** bajo, pero **se solapa fuertemente con `invasores`** (ya pendiente); candidato débil si `invasores` se implementa.
- **Cover:** ninguno libre.

### comecocos

- **cat/color:** `ARCADE` · `yellow` (o `magenta` para diferenciar de `arkanoid`)
- **Mecánica:** Pac-Man-like; laberinto fijo + 4 fantasmas con IA de persecución/patrulla (modos chase/scatter).
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** medio de build (IA de fantasmas sobre grid es más diseño que `arkanoid`/`snake`, pero sigue siendo lógica discreta). **Riesgo de marca alto**: Pac-Man es IP viva de Namco/Bandai — requiere nombre, laberinto y sprites propios, no un clon nominal; tratar como spec aparte si se avanza.
- **Cover:** `cover-glot` es un match casi literal (ya dibuja un Pac-Man amarillo comiendo puntos cyan). Disputado con `gemas` y `burbujas`.

### excavador

- **cat/color:** `ARCADE` · `cyan`
- **Mecánica:** Dig Dug-like; cavar túneles en tilemap destructible y reventar enemigos subterráneos inflándolos.
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** medio-bajo — tilemap destructible es nuevo respecto a los 4 juegos actuales, pero más simple que el pathfinding de fantasmas.
- **Cover:** `cover-rocas` (rocas grises + puntos cyan, reinterpretable como túnel). Disputado.

### minero

- **cat/color:** `PUZZLE` · `magenta` (o `ARCADE` si se prioriza la persecución de guardias)
- **Mecánica:** Lode Runner-like; cavar huecos temporales en plataformas para recolectar oro, guardias perseguidores que caen en los huecos.
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** medio — IA de guardias (caer en huecos, subir escaleras) es más diseño que `snake`/`arkanoid`.
- **Cover:** ninguno libre (`cover-rocas` quedaría tomado por otro candidato); necesitaría diseño nuevo.

### pengo

- **cat/color:** `ARCADE` · `cyan` (green ya en uso por `snake`)
- **Mecánica:** Pengo-like; empujar/romper bloques de hielo en grid para aplastar enemigos perseguidores.
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** bajo-medio — "empujar bloque hasta que choca" sobre un array 2D es de las mecánicas más simples del lote.
- **Cover:** ninguno libre; necesitaría diseño nuevo (hielo no está representado en ningún huérfano).

### saltarin

- **cat/color:** `PUZZLE` · `yellow`
- **Mecánica:** Q*bert-like; pirámide isométrica de cubos que cambian de color al saltar, enemigos que persiguen por las aristas.
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** **alto** — exige proyección isométrica, alejándose del patrón "canvas 2D top-down" ya validado por los 4 juegos existentes; el más caro del lote.
- **Cover:** ninguno libre; necesitaría diseño y cover nuevos.

### hockey-aire

- **cat/color:** `VERSUS` · `magenta`
- **Mecánica:** Air Hockey contra IA; disco con fricción/rebote en los 4 bordes, mazos que se mueven en 2 ejes (más rico que la paleta 1D de `duelo`).
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** bajo-medio — IA de mazo en 2D es algo más compleja que la de `duelo`, pero sin curva de aprendizaje nueva respecto a la colisión circular ya usada en `asteroides`.
- **Cover:** ninguno de los huérfanos calza (mesa rectangular con disco); requeriría diseño nuevo.

### boxeo

- **cat/color:** `VERSUS` · `yellow`
- **Mecánica:** Boxing 1v1 contra IA; state machine de combate (ventanas de golpe, cooldown, bloqueo) en vez de movimiento continuo.
- **hudStats:** `["score", "lives", "level"]` (score = golpes conectados, lives = resistencia antes del KO)
- **Riesgo:** medio — necesita diseño de state machine de timing; sin spritesheet puede quedar abstracto (figuras geométricas).
- **Cover:** ninguno calza (requiere figuras humanas); diseño nuevo.

### esgrima

- **cat/color:** `VERSUS` · `cyan` (o `magenta` para diferenciar de `duelo`)
- **Mecánica:** duelo de espadas por timing/reacción; ventanas cortas de ataque/parada, IA que varía su patrón.
- **hudStats:** `["score", "lives", "level"]`
- **Riesgo:** medio — punto medio entre `duelo` y `boxeo`; requiere balancear la IA para que no sea trivial ni injusta.
- **Cover:** ninguno calza; diseño nuevo.

### tanques

- **cat/color:** `VERSUS` · `green`
- **Mecánica:** Tank Duel 1v1 contra IA; movimiento + disparo de proyectil en mapa con obstáculos, reutiliza patrones de colisión ya probados en `asteroides`.
- **hudStats:** `["score", "lives", "level"]` (lives = blindaje restante)
- **Riesgo:** medio — la IA de puntería/movimiento con obstáculos es lo único nuevo; el resto (proyectiles, colisiones, HUD) tiene precedente directo.
- **Cover:** ninguno calza (ninguno dibuja tanques/obstáculos); diseño nuevo, aunque la paleta verde combinaría con el estilo "arena" de `cover-rocas`.

### fusion

- **cat/color:** `PUZZLE` · `yellow`
- **Mecánica:** estilo 2048; matriz fija, sin loop físico continuo, fusión de fichas al deslizar.
- **hudStats:** `["score", "level"]`
- **Riesgo:** bajo — lógica de grilla + animación de deslizamiento simple; `restart`/`forceGameOver` triviales (game over = sin movimientos válidos).
- **Cover:** ninguno calza; requeriría diseño nuevo.

### gemas

- **cat/color:** `PUZZLE` · `magenta`
- **Mecánica:** match-3 tipo Bejeweled; swap/caída de gemas animada, detección de matches y cascadas.
- **hudStats:** `["score", "lives", "level"]` (lives = movimientos restantes)
- **Riesgo:** medio — detección de matches, cascadas y repoblado del tablero son más lógica que las piezas de `tetris`, sin física nueva.
- **Cover:** `cover-glot` (puntos radiales magenta/cyan leíbles como gemas). Disputado con `comecocos` y `burbujas`.

### burbujas

- **cat/color:** `PUZZLE` · `cyan`
- **Mecánica:** bubble shooter; cañón que apunta + proyectil + grilla hexagonal de colisión, flood-fill para detectar grupos del mismo color.
- **hudStats:** `["score", "lives", "level"]` (lives = filas de margen antes de que la pila toque el límite inferior)
- **Riesgo:** medio-alto — el flood-fill y las burbujas "flotantes" que caen son la pieza más compleja del lote; sin fuente vanilla que portar, se construye desde cero.
- **Cover:** `cover-glot` (círculos de colores = burbujas). Disputado.

### vuelo

- **cat/color:** `ARCADE` · `green`
- **Mecánica:** estilo Flappy Bird; un sprite con gravedad, input de una tecla, colisión AABB contra tubos generados proceduralmente.
- **hudStats:** `["score", "level"]`
- **Riesgo:** bajo — el candidato más barato de portar de todo el backlog; cualquier colisión termina la partida de inmediato.
- **Cover:** ninguno calza; necesitaría cover nuevo con cielo/tubos.

### torre

- **cat/color:** `ARCADE` · `cyan` (o `yellow`)
- **Mecánica:** stacker de bloques apilables; bloque que se mueve horizontalmente y se recorta si no se alinea con el anterior, cámara que sube con la torre.
- **hudStats:** `["score", "lives", "level"]` (lives = intentos de recorte fallido antes de perder la torre)
- **Riesgo:** bajo-medio — la única lógica no trivial es el recorte de ancho dinámico y la cámara.
- **Cover:** `cover-rocas` — el mejor match visual del lote (formas circulares apiladas tipo piedras sobre fondo oscuro con acento triangular amarillo). Disputado con `comando-misiles`, `defensor` y `excavador`.
