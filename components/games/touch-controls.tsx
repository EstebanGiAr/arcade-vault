"use client";

import type { TouchEvent } from "react";

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

type TouchPosition = "up" | "down" | "left" | "right" | "a" | "b";

export function TouchControls({ gameId }: { gameId: string }) {
  const config = TOUCH_CONTROLS[gameId];

  if (!config) {
    return null;
  }

  function handleTouchStart(position: TouchPosition) {
    return (e: TouchEvent) => {
      e.preventDefault();
      const mapping = config[position];
      if (!mapping) return;
      dispatchKey("keydown", mapping.code, mapping.key);
    };
  }

  function handleTouchEnd(position: TouchPosition) {
    return () => {
      const mapping = config[position];
      if (!mapping) return;
      dispatchKey("keyup", mapping.code, mapping.key);
    };
  }

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        <button
          type="button"
          className="touch-btn touch-dpad-up"
          aria-label="Arriba"
          onTouchStart={handleTouchStart("up")}
          onTouchEnd={handleTouchEnd("up")}
          onTouchCancel={handleTouchEnd("up")}
        />
        <button
          type="button"
          className="touch-btn touch-dpad-down"
          aria-label="Abajo"
          onTouchStart={handleTouchStart("down")}
          onTouchEnd={handleTouchEnd("down")}
          onTouchCancel={handleTouchEnd("down")}
        />
        <button
          type="button"
          className="touch-btn touch-dpad-left"
          aria-label="Izquierda"
          onTouchStart={handleTouchStart("left")}
          onTouchEnd={handleTouchEnd("left")}
          onTouchCancel={handleTouchEnd("left")}
        />
        <button
          type="button"
          className="touch-btn touch-dpad-right"
          aria-label="Derecha"
          onTouchStart={handleTouchStart("right")}
          onTouchEnd={handleTouchEnd("right")}
          onTouchCancel={handleTouchEnd("right")}
        />
      </div>
      <div className="touch-actions">
        <button
          type="button"
          className="touch-btn touch-btn-round"
          aria-label="Botón A"
          onTouchStart={handleTouchStart("a")}
          onTouchEnd={handleTouchEnd("a")}
          onTouchCancel={handleTouchEnd("a")}
        >
          A
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-round"
          aria-label="Botón B"
          onTouchStart={handleTouchStart("b")}
          onTouchEnd={handleTouchEnd("b")}
          onTouchCancel={handleTouchEnd("b")}
        >
          B
        </button>
      </div>
    </div>
  );
}
