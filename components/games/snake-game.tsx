"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type {
  ArcadeGameHandle,
  ArcadeGameProps,
  ArcadeStats,
} from "@/components/games/registry";

const W = 800;
const H = 600;
const CELL = 40;
const COLS = 20;
const ROWS = 15;
const INITIAL_TICK_MS = 160;
const MIN_TICK_MS = 70;
const TICK_STEP_MS = 10;
const FRUITS_PER_LEVEL = 5;

type Cell = { col: number; row: number };
type Direction = "up" | "down" | "left" | "right";
type FruitKind =
  | "banana"
  | "orange"
  | "grape"
  | "garlic"
  | "eggplant"
  | "strawberry"
  | "cherry"
  | "carrot"
  | "mushroom"
  | "broccoli"
  | "watermelon"
  | "pepper"
  | "kiwi"
  | "lemon"
  | "peach"
  | "peanut"
  | "apple"
  | "tomato"
  | "berries"
  | "grapes2"
  | "pineapple"
  | "melon";
type Fruit = { cell: Cell; kind: FruitKind };
type GameState = "playing" | "gameover";

type SpriteFrame = { x: number; y: number; w: number; h: number };

const FRUITS: Record<FruitKind, SpriteFrame> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};

const FRUIT_KINDS = Object.keys(FRUITS) as FruitKind[];

const FRUIT_POINTS: Record<FruitKind, number> = {
  apple: 10,
  banana: 10,
  orange: 10,
  grape: 10,
  cherry: 10,
  lemon: 10,
  peach: 10,
  tomato: 10,
  carrot: 10,
  garlic: 20,
  eggplant: 20,
  strawberry: 20,
  mushroom: 20,
  broccoli: 20,
  pepper: 20,
  peanut: 20,
  grapes2: 20,
  kiwi: 30,
  berries: 30,
  watermelon: 50,
  pineapple: 50,
  melon: 50,
};

export const SnakeGame = forwardRef<ArcadeGameHandle, ArcadeGameProps>(
  function SnakeGame({ paused, onStatsChange, onGameOver }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const resetTimeRef = useRef(false);
    const callbacksRef = useRef({
      onStatsChange,
      onGameOver,
    });
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
      callbacksRef.current = {
        onStatsChange,
        onGameOver,
      };
    }, [onStatsChange, onGameOver]);

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
        const scaleX = canvas.width / W;
        const scaleY = canvas.height / H;
        ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
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
