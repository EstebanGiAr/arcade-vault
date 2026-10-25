"use client";

import { forwardRef, useEffect, useRef } from "react";

import type {
  ArcadeGameHandle,
  ArcadeGameProps,
} from "@/components/games/registry";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

type Board = number[][];
type Piece = { type: number; shape: number[][]; x: number; y: number };

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function collide(
  board: Board,
  shape: number[][],
  ox: number,
  oy: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: number[][] = Array.from({ length: cols }, () =>
    new Array(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export const TetrisGame = forwardRef<ArcadeGameHandle, ArcadeGameProps>(
  function TetrisGame(_props, _ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nextCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const maybeCanvas = canvasRef.current;
      const maybeNextCanvas = nextCanvasRef.current;
      if (!maybeCanvas || !maybeNextCanvas) return;
      const canvas: HTMLCanvasElement = maybeCanvas;
      const nextCanvas: HTMLCanvasElement = maybeNextCanvas;
      const maybeCtx = canvas.getContext("2d");
      const maybeNextCtx = nextCanvas.getContext("2d");
      if (!maybeCtx || !maybeNextCtx) return;
      const ctx: CanvasRenderingContext2D = maybeCtx;
      const nextCtx: CanvasRenderingContext2D = maybeNextCtx;

      const board: Board = createBoard();
      const current: Piece = randomPiece();
      const next: Piece = randomPiece();

      function drawBlock(
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        colorIndex: number,
        size: number,
        alpha = 1,
      ) {
        if (!colorIndex) return;
        const color = COLORS[colorIndex];
        if (!color) return;
        context.globalAlpha = alpha;
        context.fillStyle = color;
        context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        context.fillStyle = "rgba(255,255,255,0.12)";
        context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
        context.globalAlpha = 1;
      }

      function drawGrid() {
        ctx.strokeStyle = "#22222e";
        ctx.lineWidth = 0.5;
        for (let c = 1; c < COLS; c++) {
          ctx.beginPath();
          ctx.moveTo(c * BLOCK, 0);
          ctx.lineTo(c * BLOCK, ROWS * BLOCK);
          ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * BLOCK);
          ctx.lineTo(COLS * BLOCK, r * BLOCK);
          ctx.stroke();
        }
      }

      function ghostY(): number {
        let gy = current.y;
        while (!collide(board, current.shape, current.x, gy + 1)) gy++;
        return gy;
      }

      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();

        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++)
            drawBlock(ctx, c, r, board[r][c], BLOCK);

        const gy = ghostY();
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
              drawBlock(
                ctx,
                current.x + c,
                gy + r,
                current.shape[r][c],
                BLOCK,
                0.2,
              );

        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            drawBlock(
              ctx,
              current.x + c,
              current.y + r,
              current.shape[r][c],
              BLOCK,
            );
      }

      function drawNext() {
        const NB = 30;
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        const shape = next.shape;
        const offX = Math.floor((4 - shape[0].length) / 2);
        const offY = Math.floor((4 - shape.length) / 2);
        for (let r = 0; r < shape.length; r++)
          for (let c = 0; c < shape[r].length; c++)
            drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
      }

      drawNext();

      let rafId = 0;
      function loop() {
        draw();
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafId);
      };
    }, []);

    return (
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        <canvas ref={canvasRef} width={COLS * BLOCK} height={ROWS * BLOCK} />
        <canvas ref={nextCanvasRef} width={120} height={120} />
      </div>
    );
  },
);
