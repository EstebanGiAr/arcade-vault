"use client";

type TouchKeyMap = {
  code: string;
  key: string;
  repeat?: boolean;
} | null;

type TouchDirectionsConfig = {
  up: TouchKeyMap;
  down: TouchKeyMap;
  left: TouchKeyMap;
  right: TouchKeyMap;
  a: TouchKeyMap;
  b: TouchKeyMap;
};

const TOUCH_REPEAT_DELAY_MS = 300;
const TOUCH_REPEAT_INTERVAL_MS = 80;

const TOUCH_CONTROLS: Record<string, TouchDirectionsConfig> = {
  asteroides: {
    up: { code: "ArrowUp", key: "ArrowUp" },
    down: null,
    left: { code: "ArrowLeft", key: "ArrowLeft" },
    right: { code: "ArrowRight", key: "ArrowRight" },
    a: { code: "Space", key: " ", repeat: true },
    b: null,
  },
  tetris: {
    up: { code: "ArrowUp", key: "ArrowUp" },
    down: { code: "ArrowDown", key: "ArrowDown", repeat: true },
    left: { code: "ArrowLeft", key: "ArrowLeft", repeat: true },
    right: { code: "ArrowRight", key: "ArrowRight", repeat: true },
    a: { code: "Space", key: " " },
    b: null,
  },
  arkanoid: {
    up: null,
    down: null,
    left: { code: "ArrowLeft", key: "ArrowLeft" },
    right: { code: "ArrowRight", key: "ArrowRight" },
    a: null,
    b: null,
  },
  snake: {
    up: { code: "ArrowUp", key: "ArrowUp" },
    down: { code: "ArrowDown", key: "ArrowDown" },
    left: { code: "ArrowLeft", key: "ArrowLeft" },
    right: { code: "ArrowRight", key: "ArrowRight" },
    a: null,
    b: null,
  },
};

function dispatchKey(type: "keydown" | "keyup", code: string, key: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
}
