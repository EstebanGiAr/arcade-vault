"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type {
  ArcadeGameHandle,
  ArcadeGameProps,
  ArcadeStats,
} from "@/components/games/registry";

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCK_COLORS = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
] as const;
const BLOCKS_ORIGIN_X = (800 - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

type Paddle = { x: number; y: number; w: number; h: number };
type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};
type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
};
type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
};
type GameState = "playing" | "gameover" | "win";

type LevelBlock = { col: number; row: number; color: string };
type Level = { speed: number; blocks: LevelBlock[] };

const LEVELS: Level[] = (() => {
  const rowColors1 = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
  const rowColors2 = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4 = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlock[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

type SpriteFrame = { sx: number; sy: number; sw: number; sh: number };

const EXPLOSION_FRAMES: Record<string, SpriteFrame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const EXPLOSION_DURATION = 150;

const SPRITES: {
  paddle: SpriteFrame;
  ball: SpriteFrame;
  blocks: Record<string, SpriteFrame>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

let ssImg: HTMLCanvasElement | null = null;
let ssLoaded = false;
const ssCallbacks: Array<() => void> = [];

function loadSpritesheet(cb: () => void) {
  if (ssLoaded) {
    cb();
    return;
  }
  ssCallbacks.push(cb);
  if (ssImg) return;

  const rawImg = new Image();
  rawImg.onload = () => {
    const oc = document.createElement("canvas");
    oc.width = rawImg.width;
    oc.height = rawImg.height;
    const octx = oc.getContext("2d");
    octx?.drawImage(rawImg, 0, 0);
    ssImg = oc;
    ssLoaded = true;
    ssCallbacks.forEach((f) => f());
  };
  rawImg.onerror = () => console.error("Failed to load spritesheet");
  rawImg.src = "/games/arkanoid/spritesheet-breakout.png";
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!ssLoaded || !ssImg) return;
  ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!ssLoaded || !ssImg) return;
  let sp: SpriteFrame | undefined;
  if (name.startsWith("block_")) {
    sp = SPRITES.blocks[name.slice(6)];
  } else if (name === "paddle" || name === "ball") {
    sp = SPRITES[name];
  }
  if (!sp) return;
  ctx.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}

export const ArkanoidGame = forwardRef<ArcadeGameHandle, ArcadeGameProps>(
  function ArkanoidGame({ paused, onStatsChange, onGameOver }, ref) {
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

      const paddle: Paddle = { x: (W - 81) / 2, y: 560, w: 81, h: 14 };
      const ball: Ball = {
        x: 0,
        y: 0,
        w: 16,
        h: 16,
        vx: BASE_BALL_VX,
        vy: BASE_BALL_VY,
      };
      let blocks: Block[] = [];
      let explosions: Explosion[] = [];
      let lives = 3;
      let score = 0;
      let gameState: GameState = "playing";
      let currentLevel = 1;
      let prevScore = score;
      let prevLives = lives;
      let prevLevel = currentLevel;
      let prevState: GameState = gameState;

      function reportChanges() {
        const statsDelta: ArcadeStats = {};
        if (score !== prevScore) {
          prevScore = score;
          statsDelta.score = score;
        }
        if (lives !== prevLives) {
          prevLives = lives;
          statsDelta.lives = lives;
        }
        if (currentLevel !== prevLevel) {
          prevLevel = currentLevel;
          statsDelta.level = currentLevel;
        }
        if (Object.keys(statsDelta).length > 0) {
          callbacksRef.current.onStatsChange(statsDelta);
        }
        if (
          (gameState === "gameover" || gameState === "win") &&
          prevState !== "gameover" &&
          prevState !== "win"
        ) {
          callbacksRef.current.onGameOver(score);
        }
        prevState = gameState;
      }

      const bounceSound = new Audio("/games/arkanoid/sounds/ball-bounce.mp3");
      const breakSound = new Audio("/games/arkanoid/sounds/break-sound.mp3");
      function playSound(audio: HTMLAudioElement) {
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.play().catch(() => {});
      }

      function initBall() {
        const speed = LEVELS[currentLevel - 1].speed;
        ball.x = paddle.x + (paddle.w - ball.w) / 2;
        ball.y = paddle.y - ball.h;
        ball.vx = BASE_BALL_VX * speed;
        ball.vy = BASE_BALL_VY * speed;
      }

      function loadLevel(n: number) {
        currentLevel = n;
        const level = LEVELS[n - 1];
        blocks = level.blocks.map((b) => ({
          x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
          y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
          w: BLOCK_W,
          h: BLOCK_H,
          color: b.color,
          alive: true,
        }));
        explosions = [];
        initBall();
      }

      function collideAABB(block: Block) {
        return (
          ball.x < block.x + block.w &&
          ball.x + ball.w > block.x &&
          ball.y < block.y + block.h &&
          ball.y + ball.h > block.y
        );
      }

      const keys = { ArrowLeft: false, ArrowRight: false };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          keys[e.key] = true;
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          keys[e.key] = false;
        }
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      const onMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const scaleX = W / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;
        paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
      };
      container.addEventListener("mousemove", onMouseMove);

      function update(dt: number) {
        if (gameState !== "playing") return;

        if (keys.ArrowLeft)
          paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
        if (keys.ArrowRight)
          paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x <= 0) {
          ball.x = 0;
          ball.vx = Math.abs(ball.vx);
          playSound(bounceSound);
        }
        if (ball.x + ball.w >= W) {
          ball.x = W - ball.w;
          ball.vx = -Math.abs(ball.vx);
          playSound(bounceSound);
        }
        if (ball.y <= 0) {
          ball.y = 0;
          ball.vy = Math.abs(ball.vy);
          playSound(bounceSound);
        }

        if (
          ball.vy > 0 &&
          ball.x + ball.w > paddle.x &&
          ball.x < paddle.x + paddle.w &&
          ball.y + ball.h >= paddle.y &&
          ball.y + ball.h <= paddle.y + paddle.h + 8
        ) {
          ball.y = paddle.y - ball.h;
          ball.vy = -Math.abs(ball.vy);
          playSound(bounceSound);
        }

        for (const block of blocks) {
          if (!block.alive) continue;
          if (collideAABB(block)) {
            block.alive = false;
            explosions.push({
              x: block.x,
              y: block.y,
              w: block.w,
              h: block.h,
              color: block.color,
              elapsed: 0,
            });
            score += 10;
            ball.vy = -ball.vy;
            playSound(breakSound);
            if (blocks.every((b) => !b.alive)) {
              if (currentLevel < 5) loadLevel(currentLevel + 1);
              else gameState = "win";
            }
            break;
          }
        }

        for (const exp of explosions) exp.elapsed += dt * 1000;
        explosions = explosions.filter(
          (exp) => exp.elapsed < EXPLOSION_DURATION,
        );

        if (ball.y > H) {
          lives--;
          if (lives <= 0) {
            lives = 0;
            gameState = "gameover";
          } else {
            initBall();
          }
        }
      }

      function drawOverlay(message: string) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 64px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(message, W / 2, H / 2);
      }

      function draw() {
        const scaleX = canvas.width / W;
        const scaleY = canvas.height / H;
        ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        for (const block of blocks) {
          if (block.alive)
            drawSprite(
              ctx,
              "block_" + block.color,
              block.x,
              block.y,
              block.w,
              block.h,
            );
        }

        for (const exp of explosions) {
          const frameIndex = Math.min(
            Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
            3,
          );
          const frames = EXPLOSION_FRAMES[exp.color];
          if (frames)
            drawFrame(ctx, frames[frameIndex], exp.x, exp.y, exp.w, exp.h);
        }

        drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
        drawSprite(ctx, "ball", ball.x, ball.y, ball.w, ball.h);

        if (gameState === "playing") {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 18px monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText("Score: " + score, 10, 10);
          ctx.textAlign = "center";
          ctx.fillText("Nivel: " + currentLevel, W / 2, 10);
          const ballSize = 16;
          const ballSpacing = 4;
          for (let i = 0; i < lives; i++) {
            const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
            drawSprite(ctx, "ball", bx, 10, ballSize, ballSize);
          }
        }

        if (gameState === "gameover") drawOverlay("GAME OVER");
        if (gameState === "win") drawOverlay("¡COMPLETASTE EL JUEGO!");
      }

      loadLevel(1);

      let lastTime: number | null = null;
      let rafId = 0;
      function loop(ts: number) {
        if (resetTimeRef.current) {
          lastTime = null;
          resetTimeRef.current = false;
        }
        const dt =
          lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;
        if (!pausedRef.current) update(dt);
        reportChanges();
        draw();
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        container.removeEventListener("mousemove", onMouseMove);
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
