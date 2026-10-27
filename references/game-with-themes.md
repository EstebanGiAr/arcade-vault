# Juegos con skins

Mantenido por el subagente `skin-designer`. Un juego por invocación.

**Capa compartida:** `components/games/skins.ts` — pendiente

## Con skins

| Juego | ID | clasico | neon | retro | Técnica | Fecha |
| ----- | -- | ------- | ---- | ----- | ------- | ----- |

## Sin skins todavía

| Juego      | ID         | Técnica estimada                                                                           | Coste |
| ---------- | ---------- | -------------------------------------------------------------------------------------------- | ----- |
| Tetris     | tetris     | Sustituir `COLORS` + literales de grid/highlight + inline-styles del panel NEXT               | bajo  |
| Snake      | snake      | Cuerpo/cabeza desde la paleta; la fruta es sprite → tinte vía `spriteFilter`                   | bajo  |
| Asteroides | asteroides | ~10 literales dispersos en los distintos `draw()`                                             | medio |
| Arkanoid   | arkanoid   | Bloques/paleta/pelota son píxeles de un spritesheet PNG → tinte en el canvas offscreen existente | alto  |

## Notas por juego
