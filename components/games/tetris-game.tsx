"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import type {
  ArcadeGameHandle,
  ArcadeGameProps,
  ArcadeStats,
} from "@/components/games/registry";
import { hexToRgba } from "@/components/games/skins";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

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
  function TetrisGame({ paused, skin, onStatsChange, onGameOver }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nextCanvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const skinRef = useRef(skin);
    const resetTimeRef = useRef(false);
    const callbacksRef = useRef({ onStatsChange, onGameOver });
    const actionsRef = useRef<ArcadeGameHandle>({
      restart: () => {},
      forceGameOver: () => {},
    });

    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [level, setLevel] = useState(1);
    const [panelScale, setPanelScale] = useState(1);

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
        // Al despausar, evita que el próximo frame acumule el tiempo transcurrido en pausa.
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
      const maybeNextCanvas = nextCanvasRef.current;
      if (!maybeContainer || !maybeCanvas || !maybeNextCanvas) return;
      const container: HTMLDivElement = maybeContainer;
      const canvas: HTMLCanvasElement = maybeCanvas;
      const nextCanvas: HTMLCanvasElement = maybeNextCanvas;
      const maybeCtx = canvas.getContext("2d");
      const maybeNextCtx = nextCanvas.getContext("2d");
      if (!maybeCtx || !maybeNextCtx) return;
      const ctx: CanvasRenderingContext2D = maybeCtx;
      const nextCtx: CanvasRenderingContext2D = maybeNextCtx;

      let pixelWidth = 0;
      let pixelHeight = 0;
      let lastPanelScale = 1;
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

        // Encoge el panel superpuesto (texto + "NEXT") en proporción al ancho
        // real del tablero, para que no tape las piezas cuando el contenedor
        // es angosto (p. ej. al limitar la altura para que quepa sin scroll).
        const REFERENCE_WIDTH = 1004;
        const nextScale = Math.min(
          1,
          Math.max(0.35, rect.width / REFERENCE_WIDTH),
        );
        if (Math.abs(nextScale - lastPanelScale) > 0.01) {
          lastPanelScale = nextScale;
          setPanelScale(nextScale);
        }
      }
      resizeCanvasToContainer();
      const resizeObserver = new ResizeObserver(resizeCanvasToContainer);
      resizeObserver.observe(container);

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
      let prevScore = scoreValue;
      let prevLines = linesValue;
      let prevLevel = levelValue;
      let prevGameOver = gameOver;

      function reportChanges() {
        const statsDelta: ArcadeStats = {};
        if (scoreValue !== prevScore) {
          prevScore = scoreValue;
          statsDelta.score = scoreValue;
        }
        if (linesValue !== prevLines) {
          prevLines = linesValue;
          statsDelta.lines = linesValue;
        }
        if (levelValue !== prevLevel) {
          prevLevel = levelValue;
          statsDelta.level = levelValue;
        }
        if (Object.keys(statsDelta).length > 0) {
          setScore(scoreValue);
          setLines(linesValue);
          setLevel(levelValue);
          callbacksRef.current.onStatsChange(statsDelta);
        }
        if (gameOver && !prevGameOver) {
          callbacksRef.current.onGameOver(scoreValue);
        }
        prevGameOver = gameOver;
      }

      function initGame() {
        board.splice(0, board.length, ...createBoard());
        current = randomPiece();
        next = randomPiece();
        scoreValue = 0;
        linesValue = 0;
        levelValue = 1;
        dropInterval = 1000;
        dropAccum = 0;
        gameOver = false;
        prevScore = scoreValue;
        prevLines = linesValue;
        prevLevel = levelValue;
        prevGameOver = gameOver;
        setScore(scoreValue);
        setLines(linesValue);
        setLevel(levelValue);
        drawNext();
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
        const skin = skinRef.current;
        const color = skin.entities[colorIndex - 1];
        if (!color) return;
        context.save();
        context.globalAlpha = alpha;
        context.shadowBlur = skin.glow;
        context.shadowColor = color;
        context.fillStyle = color;
        context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        context.shadowBlur = 0;
        context.fillStyle = hexToRgba(skin.ink, 0.12);
        context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
        context.restore();
      }

      function drawGrid() {
        ctx.strokeStyle = skinRef.current.grid;
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
        const scaleX = canvas.width / (COLS * BLOCK);
        const scaleY = canvas.height / (ROWS * BLOCK);
        ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
        ctx.clearRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
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

      const GAME_KEYS = new Set([
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "ArrowUp",
        "Space",
      ]);

      const onKeyDown = (e: KeyboardEvent) => {
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (gameOver || pausedRef.current) return;
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
            hardDrop();
            break;
        }
      };
      window.addEventListener("keydown", onKeyDown);

      let rafId = 0;
      function loop(ts: number) {
        if (resetTimeRef.current) {
          lastTime = null;
          resetTimeRef.current = false;
        }
        if (lastTime === null) lastTime = ts;
        const dt = ts - lastTime;
        lastTime = ts;

        if (!pausedRef.current && !gameOver) {
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

        reportChanges();
        draw();
        rafId = requestAnimationFrame(loop);
      }

      actionsRef.current.restart = initGame;
      actionsRef.current.forceGameOver = () => {
        gameOver = true;
      };

      rafId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        window.removeEventListener("keydown", onKeyDown);
      };
    }, []);

    const labelStyle = {
      fontSize: Math.max(7, 10 * panelScale),
      letterSpacing: "2px",
      color: skin.inkDim,
      fontWeight: 600,
    } as const;
    const valueStyle = {
      fontFamily: "monospace",
      fontSize: Math.max(11, 22 * panelScale),
      fontWeight: 700,
      color: skin.accent,
      letterSpacing: "1px",
    } as const;
    const nextDisplaySize = Math.max(40, 120 * panelScale);
    // El borde del panel NEXT reutiliza el color de rejilla del skin; en
    // clasico mantiene el literal original para fidelidad pixel a pixel.
    const nextPanelBorder = skin.id === "clasico" ? "#2a2a3a" : skin.grid;

    return (
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        <div
          style={{
            position: "absolute",
            top: 10 * panelScale,
            right: 10 * panelScale,
            display: "flex",
            flexDirection: "column",
            gap: 14 * panelScale,
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
                width: nextDisplaySize,
                height: nextDisplaySize,
                background: hexToRgba(skin.bg, 0.4),
                border: `1px solid ${nextPanelBorder}`,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      </div>
    );
  },
);
