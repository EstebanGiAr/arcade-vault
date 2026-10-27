"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type {
  ArcadeGameHandle,
  ArcadeGameProps,
  ArcadeStats,
} from "@/components/games/registry";
import { hexToRgba, type GameSkin } from "@/components/games/skins";

const COLS = 16;
const ROWS = 14;
const CELL = 40; // px
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const ROUND_TIME_BASE = 15; // segundos

type Direction = "up" | "down" | "left" | "right";

type Entity = {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  submergeT?: number; // ms acumulados en el ciclo de inmersión (solo turtle)
};

type Lane = {
  row: number;
  speed: number; // celdas/seg (positivo, la dirección la da `dir`)
  dir: 1 | -1;
  entities: Entity[];
};

type Frog = {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms transcurridos de la animación de salto
  fromCol: number;
  fromRow: number;
  targetCol: number;
  targetRow: number;
};

const ROAD_LANE_BASE_SPEED = [1.5, 2.2, 3, 3.6, 4]; // celdas/seg por carril (fila 8→12)
const RIVER_LANE_BASE_SPEED = [1, 1.4, 1.8, 2.2, 2.6, 3]; // celdas/seg por carril (fila 1→6)
const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGED_MS = 1500;

function buildRoadLane(
  row: number,
  laneIndex: number,
  speedMultiplier: number,
): Lane {
  const dir: 1 | -1 = laneIndex % 2 === 0 ? 1 : -1;
  const speed = ROAD_LANE_BASE_SPEED[laneIndex] * speedMultiplier;
  const type: "car" | "truck" = laneIndex % 3 === 2 ? "truck" : "car";
  const width = type === "truck" ? 3 : 1 + Math.floor(Math.random() * 2);
  const entities: Entity[] = [];
  let col = Math.floor(Math.random() * 4) - width;
  while (col < COLS + width) {
    entities.push({ col, width, type });
    col += width + 2 + Math.floor(Math.random() * 2); // hueco de 2-3 celdas
  }
  return { row, speed, dir, entities };
}

function buildRiverLane(
  row: number,
  laneIndex: number,
  speedMultiplier: number,
): Lane {
  const dir: 1 | -1 = laneIndex % 2 === 0 ? -1 : 1;
  const speed = RIVER_LANE_BASE_SPEED[laneIndex] * speedMultiplier;
  const isTurtleLane = laneIndex % 2 === 1;
  const entities: Entity[] = [];
  let col = Math.floor(Math.random() * 4) - 4;
  while (col < COLS + 4) {
    if (isTurtleLane) {
      const width = 2 + Math.floor(Math.random() * 2); // grupo de 2-3
      entities.push({
        col,
        width,
        type: "turtle",
        submerged: false,
        submergeT: Math.random() * TURTLE_VISIBLE_MS,
      });
      col += width + 1 + Math.floor(Math.random() * 2); // hueco de al menos 1 celda
    } else {
      const width = 2 + Math.floor(Math.random() * 3); // tronco de 2-4 celdas
      entities.push({ col, width, type: "log" });
      col += width + 1 + Math.floor(Math.random() * 2);
    }
  }
  return { row, speed, dir, entities };
}

/** Cada nivel incrementa todas las velocidades un 15%. */
function buildLanes(level: number): Lane[] {
  const speedMultiplier = Math.pow(1.15, level - 1);
  const lanes: Lane[] = [];
  for (let i = 0; i < 5; i++) {
    lanes.push(buildRoadLane(ROW_ROAD_TOP + i, i, speedMultiplier));
  }
  for (let i = 0; i < 6; i++) {
    lanes.push(buildRiverLane(ROW_RIVER_TOP + i, i, speedMultiplier));
  }
  return lanes;
}

export const FroggerGame = forwardRef<ArcadeGameHandle, ArcadeGameProps>(
  function FroggerGame({ paused, skin, onStatsChange, onGameOver }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const skinRef = useRef(skin);
    const resetTimeRef = useRef(false);
    const callbacksRef = useRef({ onStatsChange, onGameOver });
    const actionsRef = useRef<ArcadeGameHandle>({
      restart: () => {},
      forceGameOver: () => {},
    });

    useImperativeHandle(
      ref,
      () => ({
        restart: () => actionsRef.current.restart(),
        forceGameOver: () => actionsRef.current.forceGameOver(),
      }),
      [],
    );

    useEffect(() => {
      if (pausedRef.current && !paused) {
        resetTimeRef.current = true;
      }
      pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
      callbacksRef.current = { onStatsChange, onGameOver };
    }, [onStatsChange, onGameOver]);

    useEffect(() => {
      skinRef.current = skin;
    }, [skin]);

    useEffect(() => {
      const maybeContainer = containerRef.current;
      const maybeCanvas = canvasRef.current;
      if (!maybeContainer || !maybeCanvas) return;
      const container: HTMLDivElement = maybeContainer;
      const canvas: HTMLCanvasElement = maybeCanvas;
      const maybeCtx = canvas.getContext("2d");
      if (!maybeCtx) return;
      const ctx: CanvasRenderingContext2D = maybeCtx;

      let pixelWidth = 0;
      let pixelHeight = 0;
      function resizeCanvasToContainer() {
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        const newWidth = Math.max(1, Math.round(rect.width * dpr));
        const newHeight = Math.max(1, Math.round(rect.height * dpr));
        if (newWidth !== pixelWidth || newHeight !== pixelHeight) {
          pixelWidth = newWidth;
          pixelHeight = newHeight;
          canvas.width = newWidth;
          canvas.height = newHeight;
        }
      }
      resizeCanvasToContainer();
      const resizeObserver = new ResizeObserver(resizeCanvasToContainer);
      resizeObserver.observe(container);

      function draw() {
        const skin = skinRef.current;
        const scaleX = canvas.width / CANVAS_W;
        const scaleY = canvas.height / CANVAS_H;
        ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
        ctx.fillStyle = skin.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      let rafId = 0;
      function loop() {
        draw();
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
    );
  },
);
