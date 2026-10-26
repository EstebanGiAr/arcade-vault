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
