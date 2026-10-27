# Juegos con skins

Mantenido por el subagente `skin-designer`. Un juego por invocación.

**Capa compartida:** `components/games/skins.ts` — creada el 2026-10-26

## Con skins

| Juego      | ID         | clasico | neon | retro | Técnica                                            | Fecha      |
| ---------- | ---------- | ------- | ---- | ----- | --------------------------------------------------- | ---------- |
| Asteroides | asteroides | ✅      | ✅   | ✅    | ~10 literales sustituidos en los distintos `draw()` por `skinRef.current` | 2026-10-26 |
| Snake      | snake      | ✅      | ✅   | ✅    | Cuerpo/cabeza desde `skin.accent`/`skin.accentAlt`; fruta (sprite) teñida con `ctx.filter = skin.spriteFilter` | 2026-10-26 |
| Arkanoid   | arkanoid   | ✅      | ✅   | ✅    | Spritesheet completo re-tintado en un canvas offscreen por skin (`ctx.filter`), memoizado en `useEffect([skin])` | 2026-10-26 |
| Tetris     | tetris     | ✅      | ✅   | ✅    | `COLORS` fijo sustituido por `skin.entities` (rampa de 8 colores vía `skinOverrides`); literales de grid/highlight/panel NEXT migrados a `skinRef.current` / prop `skin` | 2026-10-26 |
| Frogger    | frogger    | ✅      | ✅   | ✅    | ~20 literales de zonas/entidades/rana sustituidos por `skin.accent`/`skin.accentAlt`/`skin.entities` (vía `skinOverrides`) + una paleta local `zoneThemeFor(skin)` (fondo de río/carretera/césped, franjas de meta, trazo del tronco) que no vive en `skins.ts` por no mapear 1:1 a los campos genéricos | 2026-10-27 |

## Sin skins todavía

| Juego | ID  | Técnica estimada | Coste |
| ----- | --- | ----------------- | ----- |

## Notas por juego

### Asteroides

- Las clases de entidad (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`) pasaron de `draw(ctx)` a `draw(ctx, skin)`; el `draw()` del componente lee `skinRef.current` una vez por frame y lo propaga a cada `draw()` de entidad — `skin` nunca entra en el array de dependencias del `useEffect([])` principal.
- Mapeo semántico: nave → `accent`; balas, HUD, partículas y overlay → `ink`/`inkDim`; power-up (triple disparo) → `accentAlt`; llama del propulsor → `danger`; rampa de asteroides por tamaño → `entities[size - 1]` (overrides de 3 colores en `skinOverrides.asteroides`, ya que el tamaño va de 1 a 3).
- `clasico` reproduce pixel a pixel el aspecto previo: `skinOverrides.asteroides.clasico` fija `accentAlt: "#00ffff"` (antes `"#0ff"`) y `danger: "rgba(255, 130, 0, 0.85)"` (la llama original), mientras que `accent`/`ink`/`entities` ya coinciden con la paleta base blanca de `skins.ts`.
- Partículas de explosión usan `hexToRgba(skin.ink, alpha)` (helper nuevo en `skins.ts`) para conservar el fundido de alpha que antes estaba hardcodeado en blanco.

### Snake

- `draw()` lee `skinRef.current` una vez por frame (ref sincronizada por `useEffect`, fuera del array de dependencias del `useEffect([])` principal, igual que en asteroides).
- Mapeo semántico: cabeza de la serpiente → `accent`; cuerpo → `accentAlt`; fondo del canvas → `bg`; texto de score/nivel y overlay de game over → `ink`; scrim del overlay → `hexToRgba(skin.bg, 0.6)` (antes `rgba(0,0,0,0.6)` fijo).
- La fruta es un sprite recortado de `public/games/snake/fruits.png` (`ctx.drawImage`), no literales de color: se tiñe aplicando `ctx.filter = skin.spriteFilter ?? "none"` justo antes del `drawImage` y restaurando el contexto después (`ctx.save()`/`ctx.restore()`), siguiendo la técnica de `spriteFilter` prevista para este juego.
- `clasico` reproduce pixel a pixel el aspecto previo: `skinOverrides.snake.clasico` fija `accent: "#9dff6b"` y `accentAlt: "#4caf32"` (los verdes originales de cabeza/cuerpo), sin `spriteFilter` (cae a `"none"` por defecto, fruta sin teñir). `ink`/`bg`/`glow` ya coinciden con la paleta base de `skins.ts`.
- `neon` y `retro` solo necesitan `skinOverrides.snake` para `spriteFilter` (`hue-rotate(150deg) saturate(2) brightness(1.15)` y `sepia(1) hue-rotate(70deg) saturate(3) brightness(0.9)` respectivamente) — sus colores de `accent`/`accentAlt` base ya coinciden con lo que necesita este juego, así que no se sobrescriben.

### Arkanoid

- Bloques, paleta y pelota son píxeles de `public/games/arkanoid/spritesheet-breakout.png`, no literales de color — no hay colores "semánticos" por entidad que mapear 1:1 a `accent`/`accentAlt`/`entities`, así que este juego no usa esos campos; solo consume `skin.bg`, `skin.ink`, `skin.glow` (fondo/HUD/overlay) y `skin.spriteFilter` (sprites).
- Técnica de sprites: `ssImg` sigue siendo el canvas offscreen crudo cacheado a nivel de módulo (sin cambios). Se añadió un segundo nivel de cache por componente, `tintCacheRef` (`Map<SkinId, HTMLCanvasElement>`), poblado en un `useEffect([skin])` que dibuja `ssImg` sobre un canvas nuevo con `ctx.filter = skin.spriteFilter` una sola vez por skin; el resultado se publica en `activeSheetRef` (ref), que es lo que lee `draw()` cada frame vía `drawSprite`/`drawFrame`. `skin` nunca entra en el array de dependencias del `useEffect([])` principal — solo se lee a través de `skinRef.current` (fondo/texto) y `activeSheetRef.current` (sprites).
- `clasico` no define `spriteFilter` (cae a `undefined` → `activeSheetRef.current = ssImg` sin tinte), reproduciendo pixel a pixel el aspecto previo; el fondo (`#000`→`skin.bg`), el overlay (`rgba(0,0,0,0.6)`→`hexToRgba(skin.bg,0.6)`) y el texto HUD/overlay (`#fff`→`skin.ink`) ya coinciden con la paleta base de `skins.ts`.
- `skinOverrides.arkanoid.neon.spriteFilter = "saturate(1.8) brightness(1.15) contrast(1.05)"` intensifica los colores ya existentes del spritesheet (cian/magenta/amarillo/verde, cercanos a los tokens de plataforma) sin cambiar su hue.
- `skinOverrides.arkanoid.retro.spriteFilter = "grayscale(1) sepia(1) hue-rotate(75deg) saturate(5) brightness(0.9) contrast(1.1)"` convierte el spritesheet a monocromía fósforo verde (CRT), preservando la diferencia de luminancia entre bloques (y por tanto su distinguibilidad) aunque comparten familia de hue.
- Validado con script de contraste (WCAG) sobre `ink` vs `bg` (≥4.5:1) y sobre los colores "físicos" de los bloques del spritesheet sin tinte vs `bg` (≥3:1) en las tres skins — todos pasan; los filtros de `neon`/`retro` solo saturan/iluminan o preservan luminancia relativa, por lo que no degradan ese contraste.

### Tetris

- Se eliminó el array `COLORS` (constante de módulo, no reactiva) y se sustituyó por `skin.entities[colorIndex - 1]` leído vía `skinRef.current` dentro de `drawBlock`/`drawGrid`, que son closures internas del `useEffect([])` principal — `skin` nunca entra en su array de dependencias (ref sincronizada por un `useEffect([skin])` dedicado, igual que en asteroides/snake).
- Mapeo semántico: las 8 piezas (I/O/T/S/Z/J/L/N, índices 1-8) usan `skinOverrides.tetris.<skin>.entities` (8 colores, uno por tipo de pieza); el brillo superior del bloque (antes `"rgba(255,255,255,0.12)"` fijo) ahora es `hexToRgba(skin.ink, 0.12)`; la rejilla del tablero (antes `"#22222e"` fijo) ahora es `skin.grid`; cada bloque recibe `shadowBlur = skin.glow` (0 en `clasico`, por lo que no hay regresión).
- Los textos del panel lateral (SCORE/LINES/LEVEL, fuera del canvas, en JSX normal) usan directamente la prop `skin` (no `skinRef`, porque no corren dentro del loop de animación): etiquetas → `skin.inkDim`, valores → `skin.accent`. El fondo/borde del mini-canvas "NEXT" usan `hexToRgba(skin.bg, 0.4)` y un borde calculado localmente (`nextPanelBorder`, no vive en `skins.ts`): `"#2a2a3a"` fijo en `clasico` (literal original, para no introducir una micro-variación de gris respecto al pixel actual) y `skin.grid` en `neon`/`retro`.
- `clasico` reproduce pixel a pixel el aspecto previo: `skinOverrides.tetris.clasico` fija `entities` a los 8 colores originales de `COLORS`, `grid: "#22222e"`, `inkDim: "#555570"` y `accent: "#7aa2f7"` (los literales que tenían los labels/values del panel). El highlight (`hexToRgba(skin.ink,0.12)`) y el fondo del mini-canvas (`hexToRgba(skin.bg,0.4)`) coinciden exactamente con los literales previos porque `ink`/`bg` de `clasico` ya son `#ffffff`/`#000000` en la paleta base — no requirieron override.
- El fondo del canvas principal no se rellena con `skin.bg` (a diferencia de asteroides): Tetris siempre pintó con `ctx.clearRect` dejando ver el fondo oscuro de `.crt-screen` (`var(--bg-2)`, no negro puro) detrás de los bloques; rellenar el canvas habría introducido una regresión sutil en `clasico` (de `#0f0f18` a `#000000`). Se deja como estaba para las tres skins; el contraste de piezas/HUD contra ese fondo oscuro se validó igual.
- `neon` usa 8 colores vivos derivados de los 4 tokens de plataforma (cian/magenta/amarillo/verde) más 4 adicionales (naranja, azul, rojo, violeta) para cubrir las 8 piezas sin repetir hue. `retro` usa una rampa limitada de verdes/ámbar (con dos acentos fríos — teal y cian — para diferenciar S/T/N del resto) sobre fondo fósforo CRT.
- Validado con script de contraste (WCAG) en `C:\Users\esteb\AppData\Local\Temp\claude\...\scratchpad\contrast-tetris.js`: `ink` vs `bg` ≥4.5:1 y cada color de `entities` vs `bg` ≥3:1 en las tres skins — todos pasan (mínimo 5.15:1 en `entities`, 14.37:1 en `ink`). La distinguibilidad entre piezas se apoya además en la forma de cada tetromino, no solo en el color (igual que en el juego original).

### Frogger

- Todos los colores de zonas/entidades/rana estaban hardcodeados como literales dentro de `zoneColor()`, `drawEntities()`, `drawGoals()` y `drawFrogShape()`/`drawFrog()`; el HUD de texto y el overlay de pausa/game-over ya usaban `skinRef.current` (`skin.ink`/`skin.glow`) desde la integración del core y no se tocaron salvo el track del temporizador (ver abajo).
- Mapeo semántico vía `skinOverrides.frogger` en el registry: rana activa → `accent`; rana en meta cumplida → `accentAlt`; coches/camiones/troncos/tortugas → `skin.entities[0..3]`.
- Fondo de zonas (carretera/río/césped), franjas de meta (abierta/ocupada/hueco) y el borde dorado de las bocas de meta **no** corresponden 1:1 a los campos genéricos de `GameSkin` (`bg`/`grid`/etc.), así que viven en un helper local `zoneThemeFor(skin)` dentro de `frogger-game.tsx` (mismo patrón que `nextPanelBorder` en tetris: literal fijo en `clasico`, paleta propia en `neon`/`retro`, nunca en `skins.ts`). También incluye `logStroke` (antes `"#4e3417"` fijo), porque usar `skin.grid` directamente habría cambiado el aspecto de `clasico` (su `grid` base es blanco translúcido, no el marrón original).
- `clasico` reproduce pixel a pixel el aspecto previo: `skinOverrides.frogger.clasico` fija los literales originales (`accent: "#4caf50"`, `accentAlt: "#2e7d32"`, `entities` con los colores exactos de coche/camión/tronco/tortuga) y `zoneThemeFor` devuelve los mismos hex que tenía `zoneColor()`/`drawGoals()` antes del cambio.
- Ruedas (`"#222"`), ojos/pupilas de la rana (`"#fff"`/`"#000"`) y los tres colores de semáforo de la barra de tiempo (`#2ecc71`/`#f1c40f`/`#e74c3c`) se dejaron como literales universales — son detalles funcionales (semántica de estado, no de marca) de bajo impacto visual, igual criterio que otros juegos de esta tabla. El track de fondo de esa barra sí se migró de `"rgba(255,255,255,0.15)"` a `hexToRgba(skin.ink, 0.15)` (coherente con la skin y pixel-idéntico en `clasico`, porque `ink` ahí es blanco).
- Validado con script de contraste (WCAG) en `C:\Users\esteb\AppData\Local\Temp\claude\...\scratchpad\contrast-frogger.js`: en `neon` y `retro`, `ink` vs fondo de césped/carretera ≥4.5:1 y cada entidad (`car`/`truck`/`log`/`turtle`, `accent`) vs su fondo de zona ≥3:1 — todos pasan. En `clasico` dos pares específicos (`log` vs fondo de río, `accentAlt` vs franja de meta cumplida) ya tenían contraste bajo (<2:1) en el aspecto original del juego — es una limitación preexistente del diseño actual, no algo introducido por esta migración; no se puede "arreglar" sin romper el requisito de fidelidad pixel a pixel de `clasico`.
