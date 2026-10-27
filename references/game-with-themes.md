# Juegos con skins

Mantenido por el subagente `skin-designer`. Un juego por invocación.

**Capa compartida:** `components/games/skins.ts` — creada el 2026-10-26

## Con skins

| Juego      | ID         | clasico | neon | retro | Técnica                                            | Fecha      |
| ---------- | ---------- | ------- | ---- | ----- | --------------------------------------------------- | ---------- |
| Asteroides | asteroides | ✅      | ✅   | ✅    | ~10 literales sustituidos en los distintos `draw()` por `skinRef.current` | 2026-10-26 |

## Sin skins todavía

| Juego    | ID       | Técnica estimada                                                                           | Coste |
| -------- | -------- | -------------------------------------------------------------------------------------------- | ----- |
| Tetris   | tetris   | Sustituir `COLORS` + literales de grid/highlight + inline-styles del panel NEXT               | bajo  |
| Snake    | snake    | Cuerpo/cabeza desde la paleta; la fruta es sprite → tinte vía `spriteFilter`                   | bajo  |
| Arkanoid | arkanoid | Bloques/paleta/pelota son píxeles de un spritesheet PNG → tinte en el canvas offscreen existente | alto  |

## Notas por juego

### Asteroides

- Las clases de entidad (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`) pasaron de `draw(ctx)` a `draw(ctx, skin)`; el `draw()` del componente lee `skinRef.current` una vez por frame y lo propaga a cada `draw()` de entidad — `skin` nunca entra en el array de dependencias del `useEffect([])` principal.
- Mapeo semántico: nave → `accent`; balas, HUD, partículas y overlay → `ink`/`inkDim`; power-up (triple disparo) → `accentAlt`; llama del propulsor → `danger`; rampa de asteroides por tamaño → `entities[size - 1]` (overrides de 3 colores en `skinOverrides.asteroides`, ya que el tamaño va de 1 a 3).
- `clasico` reproduce pixel a pixel el aspecto previo: `skinOverrides.asteroides.clasico` fija `accentAlt: "#00ffff"` (antes `"#0ff"`) y `danger: "rgba(255, 130, 0, 0.85)"` (la llama original), mientras que `accent`/`ink`/`entities` ya coinciden con la paleta base blanca de `skins.ts`.
- Partículas de explosión usan `hexToRgba(skin.ink, alpha)` (helper nuevo en `skins.ts`) para conservar el fundido de alpha que antes estaba hardcodeado en blanco.
