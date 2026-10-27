/**
 * Capa compartida de skins para los juegos del Arcade Vault.
 *
 * Tres paletas fijas (clasico / neon / retro), pensadas para fondo oscuro.
 * `clasico` es el default y debe reproducir pixel a pixel el aspecto actual
 * de cada juego: por eso su paleta base es blanco/negro puro y `glow: 0`.
 *
 * Cada juego puede afinar el detalle específico (ej. colores de piezas de
 * tetris, rampa de tamaños de asteroides) vía `skinOverrides` en su entrada
 * del registry — nunca editando las paletas base de este archivo.
 */

export type SkinId = "clasico" | "neon" | "retro";

export type GameSkin = {
  id: SkinId;
  label: string; // "CLÁSICO" | "NEÓN" | "RETRO"
  swatch: string; // color del dot en el chip selector
  bg: string; // fondo del canvas
  grid: string; // rejilla / líneas auxiliares
  ink: string; // texto y overlays sobre canvas
  inkDim: string;
  accent: string; // entidad del jugador
  accentAlt: string; // entidad secundaria / powerups
  danger: string; // enemigos, fuego, pérdida
  entities: string[]; // rampa para piezas/bloques/enemigos múltiples
  glow: number; // shadowBlur del canvas (0 en clasico)
  spriteFilter?: string; // CSS filter para teñir sprites (arkanoid, fruta de snake)
};

export const DEFAULT_SKIN_ID: SkinId = "clasico";

export const GAME_SKINS: Record<SkinId, GameSkin> = {
  clasico: {
    id: "clasico",
    label: "CLÁSICO",
    swatch: "#ffffff",
    bg: "#000000",
    grid: "rgba(255, 255, 255, 0.12)",
    ink: "#ffffff",
    inkDim: "rgba(255, 255, 255, 0.65)",
    accent: "#ffffff",
    accentAlt: "#ffffff",
    danger: "#ffffff",
    entities: ["#ffffff", "#ffffff", "#ffffff", "#ffffff"],
    glow: 0,
  },
  neon: {
    id: "neon",
    label: "NEÓN",
    swatch: "#00f5ff",
    bg: "#0a0a0f",
    grid: "rgba(0, 245, 255, 0.18)",
    ink: "#e6e9ff",
    inkDim: "#8a8fb5",
    accent: "#00f5ff",
    accentAlt: "#ff006e",
    danger: "#f5ff00",
    entities: ["#00f5ff", "#ff006e", "#f5ff00", "#00ff88"],
    glow: 12,
  },
  retro: {
    id: "retro",
    label: "RETRO",
    swatch: "#9dff6b",
    bg: "#0d1b0d",
    grid: "rgba(157, 255, 107, 0.15)",
    ink: "#9dff6b",
    inkDim: "rgba(157, 255, 107, 0.6)",
    accent: "#9dff6b",
    accentAlt: "#ffb000",
    danger: "#ff6b3d",
    entities: ["#9dff6b", "#ffb000", "#6bffb0", "#c8ff6b"],
    glow: 4,
  },
};

export function resolveSkin(id: string | null | undefined): GameSkin {
  if (id === "neon" || id === "retro") return GAME_SKINS[id];
  return GAME_SKINS[DEFAULT_SKIN_ID];
}

/** Aplica un `Partial<GameSkin>` de `skinOverrides` sobre la paleta base resuelta. */
export function applySkinOverride(
  base: GameSkin,
  override?: Partial<GameSkin>,
): GameSkin {
  return override ? { ...base, ...override } : base;
}

/** Convierte un color hex (#rgb o #rrggbb) a `rgba(r,g,b,alpha)`. */
export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
