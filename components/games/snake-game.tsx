"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type {
  ArcadeGameHandle,
  ArcadeGameProps,
  ArcadeStats,
} from "@/components/games/registry";
import { setupResponsiveCanvas } from "@/components/games/canvas";
import { hexToRgba, type GameSkin } from "@/components/games/skins";

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

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};
const GAME_KEYS = new Set(Object.keys(DIRECTION_KEYS));
const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export const SnakeGame = forwardRef<ArcadeGameHandle, ArcadeGameProps>(
  function SnakeGame({ paused, skin, onStatsChange, onGameOver }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const skinRef = useRef(skin);
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

      const disconnectResize = setupResponsiveCanvas(container, canvas);

      let direction: Direction = "right";
      let pendingDirection: Direction | null = null;
      let snake: Cell[] = [];
      let fruit: Fruit;
      let gameState: GameState = "playing";
      let score = 0;
      let level = 1;
      let tickMs = INITIAL_TICK_MS;
      let fruitsEaten = 0;
      let tickAccumulator = 0;
      let prevScore = score;
      let prevLevel = level;
      let prevState: GameState = gameState;

      function reportChanges() {
        const statsDelta: ArcadeStats = {};
        if (score !== prevScore) {
          prevScore = score;
          statsDelta.score = score;
        }
        if (level !== prevLevel) {
          prevLevel = level;
          statsDelta.level = level;
        }
        if (Object.keys(statsDelta).length > 0) {
          callbacksRef.current.onStatsChange(statsDelta);
        }
        if (gameState === "gameover" && prevState !== "gameover") {
          callbacksRef.current.onGameOver(score);
        }
        prevState = gameState;
      }

      let cancelled = false;
      let imgLoaded = false;
      const fruitsImg = new Image();
      fruitsImg.onload = () => {
        imgLoaded = true;
      };
      fruitsImg.src = "/games/snake/fruits.png";

      const onKeyDown = (e: KeyboardEvent) => {
        const next = DIRECTION_KEYS[e.key];
        if (!next) return;
        e.preventDefault();
        if (pausedRef.current) return;
        if (GAME_KEYS.has(e.key) && next !== OPPOSITE_DIRECTION[direction]) {
          pendingDirection = next;
        }
      };
      window.addEventListener("keydown", onKeyDown);

      function randomFreeCell(): Cell {
        let cell: Cell;
        do {
          cell = {
            col: Math.floor(Math.random() * COLS),
            row: Math.floor(Math.random() * ROWS),
          };
        } while (snake.some((s) => s.col === cell.col && s.row === cell.row));
        return cell;
      }

      function spawnFruit() {
        const kind =
          FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
        fruit = { cell: randomFreeCell(), kind };
      }

      function initGame() {
        const startCol = Math.floor(COLS / 2);
        const startRow = Math.floor(ROWS / 2);
        snake = [
          { col: startCol, row: startRow },
          { col: startCol - 1, row: startRow },
          { col: startCol - 2, row: startRow },
        ];
        direction = "right";
        pendingDirection = null;
        gameState = "playing";
        score = 0;
        level = 1;
        tickMs = INITIAL_TICK_MS;
        fruitsEaten = 0;
        tickAccumulator = 0;
        spawnFruit();
      }

      function tick() {
        if (
          pendingDirection &&
          pendingDirection !== OPPOSITE_DIRECTION[direction]
        ) {
          direction = pendingDirection;
        }
        pendingDirection = null;

        const head = snake[0];
        let newHead: Cell;
        if (direction === "up") newHead = { col: head.col, row: head.row - 1 };
        else if (direction === "down")
          newHead = { col: head.col, row: head.row + 1 };
        else if (direction === "left")
          newHead = { col: head.col - 1, row: head.row };
        else newHead = { col: head.col + 1, row: head.row };

        if (
          newHead.col < 0 ||
          newHead.col >= COLS ||
          newHead.row < 0 ||
          newHead.row >= ROWS
        ) {
          gameState = "gameover";
          return;
        }
        if (snake.some((s) => s.col === newHead.col && s.row === newHead.row)) {
          gameState = "gameover";
          return;
        }

        const ateFruit =
          newHead.col === fruit.cell.col && newHead.row === fruit.cell.row;

        snake = [newHead, ...snake];
        if (ateFruit) {
          score += FRUIT_POINTS[fruit.kind];
          fruitsEaten++;
          if (fruitsEaten % FRUITS_PER_LEVEL === 0) {
            tickMs = Math.max(MIN_TICK_MS, tickMs - TICK_STEP_MS);
            level++;
          }
          spawnFruit();
        } else {
          snake.pop();
        }
      }

      function update(dt: number) {
        if (gameState !== "playing" || pausedRef.current) return;
        tickAccumulator += dt * 1000;
        while (tickAccumulator >= tickMs && gameState === "playing") {
          tickAccumulator -= tickMs;
          tick();
        }
      }

      function drawOverlay(message: string, skin: GameSkin) {
        ctx.fillStyle = hexToRgba(skin.bg, 0.6);
        ctx.fillRect(0, 0, W, H);
        ctx.shadowBlur = skin.glow;
        ctx.shadowColor = skin.ink;
        ctx.fillStyle = skin.ink;
        ctx.font = "bold 64px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(message, W / 2, H / 2);
        ctx.shadowBlur = 0;
      }

      function draw() {
        const skin = skinRef.current;
        const scaleX = canvas.width / W;
        const scaleY = canvas.height / H;
        ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

        ctx.fillStyle = skin.bg;
        ctx.fillRect(0, 0, W, H);

        // La cabeza y el cuerpo comparten color dentro de su propio grupo:
        // el shadow se configura una sola vez por grupo en vez de por celda.
        if (snake.length > 0) {
          const head = snake[0];
          ctx.save();
          ctx.shadowBlur = skin.glow;
          ctx.shadowColor = skin.accent;
          ctx.fillStyle = skin.accent;
          ctx.fillRect(head.col * CELL, head.row * CELL, CELL - 1, CELL - 1);
          ctx.restore();
        }
        if (snake.length > 1) {
          ctx.save();
          ctx.shadowBlur = skin.glow;
          ctx.shadowColor = skin.accentAlt;
          ctx.fillStyle = skin.accentAlt;
          for (let i = 1; i < snake.length; i++) {
            const cell = snake[i];
            ctx.fillRect(cell.col * CELL, cell.row * CELL, CELL - 1, CELL - 1);
          }
          ctx.restore();
        }

        if (imgLoaded) {
          const frame = FRUITS[fruit.kind];
          ctx.save();
          ctx.filter = skin.spriteFilter ?? "none";
          ctx.drawImage(
            fruitsImg,
            frame.x,
            frame.y,
            frame.w,
            frame.h,
            fruit.cell.col * CELL,
            fruit.cell.row * CELL,
            CELL,
            CELL,
          );
          ctx.restore();
        }

        ctx.fillStyle = skin.ink;
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Score: " + score, 10, 10);
        ctx.textAlign = "center";
        ctx.fillText("Nivel: " + level, W / 2, 10);

        if (gameState === "gameover") drawOverlay("GAME OVER", skin);
      }

      initGame();

      actionsRef.current.restart = initGame;
      actionsRef.current.forceGameOver = () => {
        gameState = "gameover";
      };

      let lastTime: number | null = null;
      let rafId = 0;
      function loop(ts: number) {
        if (cancelled) return;
        if (resetTimeRef.current) {
          lastTime = null;
          resetTimeRef.current = false;
        }
        const dt =
          lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;
        update(dt);
        reportChanges();
        draw();
        rafId = requestAnimationFrame(loop);
      }
      if (imgLoaded) {
        rafId = requestAnimationFrame(loop);
      } else {
        fruitsImg.addEventListener(
          "load",
          () => {
            if (cancelled) return;
            rafId = requestAnimationFrame(loop);
          },
          { once: true },
        );
      }

      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
        disconnectResize();
        window.removeEventListener("keydown", onKeyDown);
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
