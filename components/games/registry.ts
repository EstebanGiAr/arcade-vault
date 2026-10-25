import type { ComponentType, RefAttributes } from "react";

import { AsteroidsGame } from "@/components/games/asteroids-game";

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
};
