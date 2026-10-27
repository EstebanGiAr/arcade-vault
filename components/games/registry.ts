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
  },
  arkanoid: {
    component: ArkanoidGame,
    hudStats: ["score", "lives", "level"],
    initialStats: { score: 0, lives: 3, level: 1 },
  },
  snake: {
    component: SnakeGame,
    hudStats: ["score", "level"],
    initialStats: { score: 0, level: 1 },
  },
};
