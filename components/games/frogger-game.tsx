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

const ROAD_LANE_BASE_SPEED = [0.9, 1.2, 1.5, 1.8, 2.1]; // celdas/seg por carril (fila 8→12)
const RIVER_LANE_BASE_SPEED = [0.6, 0.8, 1, 1.2, 1.4, 1.6]; // celdas/seg por carril (fila 1→6)
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
    col += width + 3 + Math.floor(Math.random() * 3); // hueco de 3-5 celdas
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

/** Cada nivel incrementa todas las velocidades un 10%. */
function buildLanes(level: number): Lane[] {
  const speedMultiplier = Math.pow(1.1, level - 1);
  const lanes: Lane[] = [];
  for (let i = 0; i < 5; i++) {
    lanes.push(buildRoadLane(ROW_ROAD_TOP + i, i, speedMultiplier));
  }
  for (let i = 0; i < 6; i++) {
    lanes.push(buildRiverLane(ROW_RIVER_TOP + i, i, speedMultiplier));
  }
  return lanes;
}

const JUMP_DURATION_MS = 120;
const START_COL = 8;
/** 5 bocas destino de 2 columnas cada una, con huecos de 1 columna entre ellas. */
const GOAL_RANGES: Array<[number, number]> = [
  [1, 2],
  [4, 5],
  [7, 8],
  [10, 11],
  [13, 14],
];

/** El temporizador de ronda se reduce 1s por nivel, con un mínimo de 6s. */
function roundTimeForLevel(level: number): number {
  return Math.max(6, ROUND_TIME_BASE - (level - 1));
}

function goalIndexForCol(col: number): number | null {
  const c = Math.round(col);
  for (let i = 0; i < GOAL_RANGES.length; i++) {
    const [a, b] = GOAL_RANGES[i];
    if (c >= a && c <= b) return i;
  }
  return null;
}

function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    if (lane.row < ROW_ROAD_TOP || lane.row > ROW_ROAD_BOT) continue;
    for (const e of lane.entities) {
      if (frog.col >= e.col && frog.col < e.col + e.width) return true;
    }
  }
  return false;
}

/** Devuelve el carril de río que sostiene a la rana, o `null` si no hay soporte (agua). */
function getSupportLane(frog: Frog, lanes: Lane[]): Lane | null {
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    if (lane.row < ROW_RIVER_TOP || lane.row > ROW_RIVER_BOT) continue;
    for (const e of lane.entities) {
      if (frog.col >= e.col && frog.col < e.col + e.width) {
        if (e.type === "turtle" && e.submerged) return null;
        return lane;
      }
    }
  }
  return null;
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

      let lanes: Lane[] = [];
      let goals: boolean[] = [false, false, false, false, false];
      let lives = 3;
      let score = 0;
      let level = 1;
      let roundTime = ROUND_TIME_BASE;
      let bestRow = ROW_START;
      let gameState: "playing" | "gameover" = "playing";
      const frog: Frog = {
        col: START_COL,
        row: ROW_START,
        animating: false,
        animT: 0,
        fromCol: START_COL,
        fromRow: ROW_START,
        targetCol: START_COL,
        targetRow: ROW_START,
      };

      let prevScore = score;
      let prevLives = lives;
      let prevLevel = level;
      let prevState: "playing" | "gameover" = gameState;

      function reportChanges() {
        const delta: ArcadeStats = {};
        if (score !== prevScore) {
          prevScore = score;
          delta.score = score;
        }
        if (lives !== prevLives) {
          prevLives = lives;
          delta.lives = lives;
        }
        if (level !== prevLevel) {
          prevLevel = level;
          delta.level = level;
        }
        if (Object.keys(delta).length > 0) {
          callbacksRef.current.onStatsChange(delta);
        }
        if (gameState === "gameover" && prevState !== "gameover") {
          callbacksRef.current.onGameOver(score);
        }
        prevState = gameState;
      }

      function resetFrogToStart() {
        frog.col = START_COL;
        frog.row = ROW_START;
        frog.animating = false;
        frog.animT = 0;
        bestRow = ROW_START;
      }

      function killFrog() {
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameState = "gameover";
          return;
        }
        resetFrogToStart();
        roundTime = roundTimeForLevel(level);
      }

      function completeRound() {
        score += 200;
        level++;
        goals = [false, false, false, false, false];
        lanes = buildLanes(level);
        roundTime = roundTimeForLevel(level);
        resetFrogToStart();
      }

      function handleGoalLanding() {
        const idx = goalIndexForCol(frog.col);
        if (idx === null || goals[idx]) {
          killFrog();
          return;
        }
        goals[idx] = true;
        score += 50 + Math.round(roundTime) * 10;
        if (goals.every(Boolean)) completeRound();
      }

      function resolveLanding() {
        if (frog.row < bestRow) {
          score += (bestRow - frog.row) * 10;
          bestRow = frog.row;
        }
        if (frog.row === ROW_GOALS) {
          handleGoalLanding();
        } else if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
          if (checkRoadCollision(frog, lanes)) killFrog();
        } else if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
          if (!getSupportLane(frog, lanes)) killFrog();
        }
      }

      function moveLanes(dt: number) {
        for (const lane of lanes) {
          for (const e of lane.entities) {
            e.col += lane.speed * lane.dir * dt;
            if (lane.dir === 1 && e.col > COLS) {
              e.col = -e.width;
            } else if (lane.dir === -1 && e.col + e.width < 0) {
              e.col = COLS;
            }
            if (e.type === "turtle") {
              e.submergeT = (e.submergeT ?? 0) + dt * 1000;
              const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
              e.submerged = e.submergeT % cycle >= TURTLE_VISIBLE_MS;
            }
          }
        }
      }

      function tryJump(dir: Direction) {
        if (gameState !== "playing" || frog.animating) return;
        const colStart = Math.round(frog.col);
        let targetRow = frog.row;
        let targetCol = colStart;
        if (dir === "up") targetRow = frog.row - 1;
        else if (dir === "down") targetRow = frog.row + 1;
        else if (dir === "left") targetCol = colStart - 1;
        else targetCol = colStart + 1;
        if (targetRow < ROW_GOALS || targetRow > ROW_START) return;
        if (targetCol < 0 || targetCol > COLS - 1) return;
        frog.fromCol = colStart;
        frog.fromRow = frog.row;
        frog.targetCol = targetCol;
        frog.targetRow = targetRow;
        frog.animating = true;
        frog.animT = 0;
      }

      function initGame() {
        lives = 3;
        score = 0;
        level = 1;
        goals = [false, false, false, false, false];
        lanes = buildLanes(level);
        roundTime = roundTimeForLevel(level);
        gameState = "playing";
        resetFrogToStart();
      }

      function update(dt: number) {
        if (gameState !== "playing") return;
        moveLanes(dt);

        if (!frog.animating) {
          if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
            if (checkRoadCollision(frog, lanes)) {
              killFrog();
              return;
            }
          } else if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
            const lane = getSupportLane(frog, lanes);
            if (!lane) {
              killFrog();
              return;
            }
            frog.col += lane.speed * lane.dir * dt;
            if (frog.col < -0.6 || frog.col > COLS - 0.4) {
              killFrog();
              return;
            }
          }
        } else {
          frog.animT += dt * 1000;
          if (frog.animT >= JUMP_DURATION_MS) {
            frog.col = frog.targetCol;
            frog.row = frog.targetRow;
            frog.animating = false;
            resolveLanding();
            if (gameState !== "playing") return;
          }
        }

        roundTime -= dt;
        if (roundTime <= 0) {
          roundTime = 0;
          killFrog();
        }
      }

      // Paleta de zonas/entidades que no vive en skins.ts: estos literales son
      // específicos de frogger (fondo de río/carretera/césped, franjas de meta)
      // y no corresponden 1:1 a los campos semánticos genéricos de `GameSkin`.
      // `clasico` reproduce exactamente los literales previos del juego.
      type ZoneTheme = {
        road: string;
        river: string;
        grass: string;
        goalGap: string;
        goalOpen: string;
        goalFilled: string;
        goalBorder: string;
        logStroke: string;
      };

      function zoneThemeFor(skin: GameSkin): ZoneTheme {
        if (skin.id === "neon") {
          return {
            road: "#0a0a12",
            river: "#0d1733",
            grass: "#0a2b1f",
            goalGap: "#082018",
            goalOpen: "#124a33",
            goalFilled: "#0a3524",
            goalBorder: "#00f5ff",
            logStroke: "#b35a1f",
          };
        }
        if (skin.id === "retro") {
          return {
            road: "#07120a",
            river: "#0a2018",
            grass: "#0a2a12",
            goalGap: "#07200f",
            goalOpen: "#164a1f",
            goalFilled: "#0d3614",
            goalBorder: "#ffb000",
            logStroke: "#8a5600",
          };
        }
        return {
          road: "#111111",
          river: "#0a2a4a",
          grass: "#0d3a1a",
          goalGap: "#063a1f",
          goalOpen: "#0d7a35",
          goalFilled: "#0a5c2a",
          goalBorder: "#d4af37",
          logStroke: "#4e3417",
        };
      }

      function zoneColor(row: number, zones: ZoneTheme): string {
        if (row === ROW_GOALS) return zones.goalGap;
        if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return zones.river;
        if (row === ROW_SAFE_MID || row === ROW_START) return zones.grass;
        return zones.road;
      }

      function drawZones(skin: GameSkin) {
        const zones = zoneThemeFor(skin);
        for (let row = 0; row < ROWS; row++) {
          ctx.fillStyle = zoneColor(row, zones);
          ctx.fillRect(0, row * CELL, CANVAS_W, CELL);
        }
      }

      function drawGoals(skin: GameSkin) {
        const zones = zoneThemeFor(skin);
        for (let i = 0; i < GOAL_RANGES.length; i++) {
          const [a, b] = GOAL_RANGES[i];
          const x = a * CELL;
          const w = (b - a + 1) * CELL;
          ctx.fillStyle = goals[i] ? zones.goalFilled : zones.goalOpen;
          ctx.fillRect(x, ROW_GOALS * CELL, w, CELL);
          ctx.strokeStyle = zones.goalBorder;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, ROW_GOALS * CELL + 1, w - 2, CELL - 2);
          if (goals[i]) {
            drawFrogShape(
              x + w / 2,
              ROW_GOALS * CELL + CELL / 2,
              skin.accentAlt,
              skin,
            );
          }
        }
      }

      function drawEntities(skin: GameSkin) {
        const zones = zoneThemeFor(skin);
        const [carColor, truckColor, logColor, turtleColor] = skin.entities;
        for (const lane of lanes) {
          for (const e of lane.entities) {
            const x = e.col * CELL;
            const y = lane.row * CELL;
            if (e.type === "car" || e.type === "truck") {
              ctx.fillStyle = e.type === "truck" ? truckColor : carColor;
              ctx.fillRect(x + 2, y + 6, e.width * CELL - 4, CELL - 16);
              ctx.fillStyle = "#222";
              const wheelY = y + CELL - 10;
              for (let wx = x + 8; wx < x + e.width * CELL - 4; wx += 16) {
                ctx.beginPath();
                ctx.arc(wx, wheelY, 4, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (e.type === "log") {
              ctx.fillStyle = logColor;
              ctx.fillRect(x + 1, y + 8, e.width * CELL - 2, CELL - 16);
              ctx.strokeStyle = zones.logStroke;
              for (let lx = x + 6; lx < x + e.width * CELL; lx += 10) {
                ctx.beginPath();
                ctx.moveTo(lx, y + 8);
                ctx.lineTo(lx, y + CELL - 8);
                ctx.stroke();
              }
            } else {
              ctx.globalAlpha = e.submerged ? 0.25 : 1;
              ctx.fillStyle = turtleColor;
              for (let i = 0; i < e.width; i++) {
                ctx.beginPath();
                ctx.arc(
                  x + i * CELL + CELL / 2,
                  y + CELL / 2,
                  CELL / 2 - 4,
                  0,
                  Math.PI * 2,
                );
                ctx.fill();
              }
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      function drawFrogShape(
        cx: number,
        cy: number,
        color: string,
        skin: GameSkin,
        legsOut = false,
      ) {
        ctx.save();
        ctx.shadowBlur = skin.glow;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        if (legsOut) {
          ctx.fillRect(cx - 18, cy - 4, 6, 4);
          ctx.fillRect(cx + 12, cy - 4, 6, 4);
        }
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 6, 3, 0, Math.PI * 2);
        ctx.arc(cx + 5, cy - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 6, 1.3, 0, Math.PI * 2);
        ctx.arc(cx + 5, cy - 6, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function drawFrog(skin: GameSkin) {
        const t = frog.animating
          ? Math.min(frog.animT / JUMP_DURATION_MS, 1)
          : 1;
        const displayCol = frog.animating
          ? frog.fromCol + (frog.targetCol - frog.fromCol) * t
          : frog.col;
        const displayRow = frog.animating
          ? frog.fromRow + (frog.targetRow - frog.fromRow) * t
          : frog.row;
        const cx = displayCol * CELL + CELL / 2;
        const cy = displayRow * CELL + CELL / 2;
        drawFrogShape(cx, cy, skin.accent, skin, frog.animating);
      }

      function drawHud(skin: GameSkin) {
        ctx.save();
        ctx.shadowBlur = skin.glow;
        ctx.shadowColor = skin.ink;
        ctx.fillStyle = skin.ink;
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Score: " + score, 8, CANVAS_H - 20);
        ctx.textAlign = "center";
        ctx.fillText("Nivel: " + level, CANVAS_W / 2, CANVAS_H - 20);
        ctx.restore();

        const iconSize = 16;
        const spacing = 4;
        for (let i = 0; i < lives; i++) {
          const bx = CANVAS_W - 14 - (lives - i) * (iconSize + spacing);
          drawFrogShape(bx, 8, skin.accent, skin);
        }

        const timeFrac = Math.max(
          0,
          Math.min(1, roundTime / roundTimeForLevel(level)),
        );
        const barColor =
          timeFrac > 0.5 ? "#2ecc71" : timeFrac > 0.25 ? "#f1c40f" : "#e74c3c";
        ctx.fillStyle = hexToRgba(skin.ink, 0.15);
        ctx.fillRect(0, 0, CANVAS_W, 4);
        ctx.fillStyle = barColor;
        ctx.fillRect(0, 0, CANVAS_W * timeFrac, 4);
      }

      function drawOverlay(skin: GameSkin, message: string) {
        ctx.fillStyle = hexToRgba(skin.bg, 0.6);
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.save();
        ctx.shadowBlur = skin.glow;
        ctx.shadowColor = skin.ink;
        ctx.fillStyle = skin.ink;
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(message, CANVAS_W / 2, CANVAS_H / 2);
        ctx.restore();
      }

      function draw() {
        const skin = skinRef.current;
        const scaleX = canvas.width / CANVAS_W;
        const scaleY = canvas.height / CANVAS_H;
        ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
        drawZones(skin);
        drawEntities(skin);
        drawGoals(skin);
        drawFrog(skin);
        drawHud(skin);
        if (gameState === "gameover") drawOverlay(skin, "GAME OVER");
      }

      const onKeyDown = (e: KeyboardEvent) => {
        if (pausedRef.current) return;
        let dir: Direction | null = null;
        if (e.key === "ArrowUp") dir = "up";
        else if (e.key === "ArrowDown") dir = "down";
        else if (e.key === "ArrowLeft") dir = "left";
        else if (e.key === "ArrowRight") dir = "right";
        if (dir) {
          e.preventDefault();
          tryJump(dir);
        }
      };
      window.addEventListener("keydown", onKeyDown);

      actionsRef.current.restart = initGame;
      actionsRef.current.forceGameOver = () => {
        gameState = "gameover";
      };

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

      initGame();
      rafId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
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
