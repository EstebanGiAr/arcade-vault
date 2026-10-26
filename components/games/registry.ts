import type { ComponentType, RefAttributes } from "react";

import { ArkanoidGame } from "@/components/games/arkanoid-game";
import { AsteroidsGame } from "@/components/games/asteroids-game";
import { SnakeGame } from "@/components/games/snake-game";
import { TetrisGame } from "@/components/games/tetris-game";

export type HudStatKey = "score" | "lives" | "level" | "lines";
export type ArcadeStats = Partial<Record<HudStatKey, number>>;

export type ArcadeGameHandle = {
  restart: () => void;
  forceGameOver: () => void;
};

export type ArcadeGameProps = {
  paused: boolean;
  onStatsChange: (stats: ArcadeStats) => void;
  onGameOver: (finalScore: number) => void;
};

export type ArcadeGameEntry = {
  component: ComponentType<ArcadeGameProps & RefAttributes<ArcadeGameHandle>>;
  hudStats: HudStatKey[];
  initialStats: ArcadeStats;
  aspectRatio?: string;
};

export const GAME_REGISTRY: Record<string, ArcadeGameEntry> = {
  asteroides: {
    component: AsteroidsGame,
    hudStats: ["score", "lives", "level"],
    initialStats: { score: 0, lives: 3, level: 1 },
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
