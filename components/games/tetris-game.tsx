"use client";

import { forwardRef, useEffect, useRef, useState } from "react";

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

    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [level, setLevel] = useState(1);

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
      let current: Piece = randomPiece();
      let next: Piece = randomPiece();
      let scoreValue = 0;
      let linesValue = 0;
      let levelValue = 1;
      let dropInterval = 1000;
      let dropAccum = 0;
      let lastTime: number | null = null;
      let gameOver = false;

      function updatePanel() {
        setScore(scoreValue);
        setLines(linesValue);
        setLevel(levelValue);
      }

      function merge() {
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
              board[current.y + r][current.x + c] = current.shape[r][c];
      }

      function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (board[r].every((v) => v !== 0)) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(0));
            cleared++;
            r++;
          }
        }
        if (cleared) {
          linesValue += cleared;
          scoreValue += (LINE_SCORES[cleared] || 0) * levelValue;
          levelValue = Math.floor(linesValue / 10) + 1;
          dropInterval = Math.max(100, 1000 - (levelValue - 1) * 90);
          updatePanel();
        }
      }

      function spawn() {
        current = next;
        next = randomPiece();
        if (collide(board, current.shape, current.x, current.y)) {
          gameOver = true;
        }
        drawNext();
      }

      function lockPiece() {
        merge();
        clearLines();
        spawn();
      }

      function tryRotate() {
        const rotated = rotateCW(current.shape);
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
          if (!collide(board, rotated, current.x + kick, current.y)) {
            current.shape = rotated;
            current.x += kick;
            return;
          }
        }
      }

      function hardDrop() {
        const gy = ghostY();
        scoreValue += (gy - current.y) * 2;
        current.y = gy;
        lockPiece();
      }

      function softDrop() {
        if (!collide(board, current.shape, current.x, current.y + 1)) {
          current.y++;
          scoreValue += 1;
          updatePanel();
        } else {
          lockPiece();
        }
      }

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

      const onKeyDown = (e: KeyboardEvent) => {
        if (gameOver) return;
        switch (e.code) {
          case "ArrowLeft":
            if (!collide(board, current.shape, current.x - 1, current.y))
              current.x--;
            break;
          case "ArrowRight":
            if (!collide(board, current.shape, current.x + 1, current.y))
              current.x++;
            break;
          case "ArrowDown":
            softDrop();
            break;
          case "ArrowUp":
          case "KeyX":
            tryRotate();
            break;
          case "Space":
            e.preventDefault();
            hardDrop();
            break;
        }
        updatePanel();
      };
      window.addEventListener("keydown", onKeyDown);

      let rafId = 0;
      function loop(ts: number) {
        if (lastTime === null) lastTime = ts;
        const dt = ts - lastTime;
        lastTime = ts;

        if (!gameOver) {
          dropAccum += dt;
          if (dropAccum >= dropInterval) {
            dropAccum = 0;
            if (!collide(board, current.shape, current.x, current.y + 1)) {
              current.y++;
            } else {
              lockPiece();
            }
          }
        }

        draw();
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKeyDown);
      };
    }, []);

    const labelStyle = {
      fontSize: 10,
      letterSpacing: "2px",
      color: "#555570",
      fontWeight: 600,
    } as const;
    const valueStyle = {
      fontFamily: "monospace",
      fontSize: 22,
      fontWeight: 700,
      color: "#7aa2f7",
      letterSpacing: "1px",
    } as const;

    return (
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        <canvas ref={canvasRef} width={COLS * BLOCK} height={ROWS * BLOCK} />
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            pointerEvents: "none",
          }}
        >
          <div>
            <div style={labelStyle}>SCORE</div>
            <div style={valueStyle}>{score.toLocaleString()}</div>
          </div>
          <div>
            <div style={labelStyle}>LINES</div>
            <div style={valueStyle}>{lines}</div>
          </div>
          <div>
            <div style={labelStyle}>LEVEL</div>
            <div style={valueStyle}>{level}</div>
          </div>
          <div>
            <div style={labelStyle}>NEXT</div>
            <canvas
              ref={nextCanvasRef}
              width={120}
              height={120}
              style={{
                display: "block",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid #2a2a3a",
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      </div>
    );
  },
);
