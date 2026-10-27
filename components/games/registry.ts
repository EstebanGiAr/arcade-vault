import type { ComponentType, RefAttributes } from "react";

import { ArkanoidGame } from "@/components/games/arkanoid-game";
import { AsteroidsGame } from "@/components/games/asteroids-game";
import { SnakeGame } from "@/components/games/snake-game";
import { TetrisGame } from "@/components/games/tetris-game";
import type { GameSkin, SkinId } from "@/components/games/skins";

export type HudStatKey = "score" | "lives" | "level" | "lines";
export type ArcadeStats = Partial<Record<HudStatKey, number>>;

export type ArcadeGameHandle = {
  restart: () => void;
  forceGameOver: () => void;
};

export type ArcadeGameProps = {
  paused: boolean;
  skin: GameSkin;
  onStatsChange: (stats: ArcadeStats) => void;
  onGameOver: (finalScore: number) => void;
};

export type ArcadeGameEntry = {
  component: ComponentType<ArcadeGameProps & RefAttributes<ArcadeGameHandle>>;
  hudStats: HudStatKey[];
  initialStats: ArcadeStats;
  aspectRatio?: string;
  skinOverrides?: Partial<Record<SkinId, Partial<GameSkin>>>;
};

export const GAME_REGISTRY: Record<string, ArcadeGameEntry> = {
  asteroides: {
    component: AsteroidsGame,
    hudStats: ["score", "lives", "level"],
    initialStats: { score: 0, lives: 3, level: 1 },
    skinOverrides: {
      clasico: {
        accentAlt: "#00ffff",
        danger: "rgba(255, 130, 0, 0.85)",
        entities: ["#ffffff", "#ffffff", "#ffffff"],
      },
      neon: {
        accent: "#00f5ff",
        accentAlt: "#ff006e",
        danger: "#f5ff00",
        entities: ["#00f5ff", "#ff006e", "#00ff88"],
      },
      retro: {
        accent: "#9dff6b",
        accentAlt: "#ffb000",
        danger: "#ff6b3d",
        entities: ["#9dff6b", "#ffb000", "#6bffb0"],
      },
    },
  },
  tetris: {
    component: TetrisGame,
    hudStats: ["score", "lines", "level"],
    initialStats: { score: 0, lines: 0, level: 1 },
    aspectRatio: "1 / 2",
    skinOverrides: {
      clasico: {
        grid: "#22222e",
        inkDim: "#555570",
        accent: "#7aa2f7",
        entities: [
          "#4dd0e1", // I - cyan
          "#ffd54f", // O - yellow
          "#ba68c8", // T - purple
          "#81c784", // S - green
          "#e57373", // Z - red
          "#90caf9", // J - pale blue
          "#ffb74d", // L - orange
          "#9e9e9e", // N - tuerca (gris metálico)
        ],
      },
      neon: {
        entities: [
          "#00f5ff", // I
          "#f5ff00", // O
          "#ff006e", // T
          "#00ff88", // S
          "#ff3b3b", // Z
          "#4da6ff", // J
          "#ff8c00", // L
          "#b388ff", // N
        ],
      },
      retro: {
        entities: [
          "#9dff6b", // I
          "#ffb000", // O
          "#6bffb0", // T
          "#c8ff6b", // S
          "#ff6b3d", // Z
          "#4dba6b", // J
          "#ffd37a", // L
          "#2fd0d0", // N
        ],
      },
    },
  },
  arkanoid: {
    component: ArkanoidGame,
    hudStats: ["score", "lives", "level"],
    initialStats: { score: 0, lives: 3, level: 1 },
    skinOverrides: {
      neon: {
        spriteFilter: "saturate(1.8) brightness(1.15) contrast(1.05)",
      },
      retro: {
        spriteFilter:
          "grayscale(1) sepia(1) hue-rotate(75deg) saturate(5) brightness(0.9) contrast(1.1)",
      },
    },
  },
  snake: {
    component: SnakeGame,
    hudStats: ["score", "level"],
    initialStats: { score: 0, level: 1 },
    skinOverrides: {
      clasico: {
        accent: "#9dff6b",
        accentAlt: "#4caf32",
      },
      neon: {
        spriteFilter: "hue-rotate(150deg) saturate(2) brightness(1.15)",
      },
      retro: {
        spriteFilter: "sepia(1) hue-rotate(70deg) saturate(3) brightness(0.9)",
      },
    },
  },
};
