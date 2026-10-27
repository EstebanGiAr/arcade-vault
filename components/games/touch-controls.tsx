"use client";

import { useCallback, useRef, type TouchEvent } from "react";

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
    up: { code: "Space", key: " " },
    down: { code: "ArrowDown", key: "ArrowDown", repeat: true },
    left: { code: "ArrowLeft", key: "ArrowLeft", repeat: true },
    right: { code: "ArrowRight", key: "ArrowRight", repeat: true },
    a: { code: "ArrowUp", key: "ArrowUp" },
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
  const timeoutsRef = useRef<Record<string, number>>({});
  const intervalsRef = useRef<Record<string, number>>({});

  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.classList.add("touch-btn-pressed");
      const position = e.currentTarget.dataset.position as TouchPosition;
      const mapping = config?.[position];
      if (!mapping) return;
      dispatchKey("keydown", mapping.code, mapping.key);
      if (mapping.repeat) {
        timeoutsRef.current[position] = window.setTimeout(() => {
          intervalsRef.current[position] = window.setInterval(() => {
            // keydown + keyup por cada tick (no solo keydown) para que los
            // juegos con lectura por flanco (ej. disparo de asteroides, que
            // solo reacciona a keydown tras un keyup previo) también repitan
            // la acción mientras se mantiene presionado el botón táctil.
            dispatchKey("keydown", mapping.code, mapping.key);
            dispatchKey("keyup", mapping.code, mapping.key);
          }, TOUCH_REPEAT_INTERVAL_MS);
        }, TOUCH_REPEAT_DELAY_MS);
      }
    },
    [config],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent<HTMLButtonElement>) => {
      e.currentTarget.classList.remove("touch-btn-pressed");
      const position = e.currentTarget.dataset.position as TouchPosition;
      const mapping = config?.[position];
      if (!mapping) return;
      const timeoutId = timeoutsRef.current[position];
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        delete timeoutsRef.current[position];
      }
      const intervalId = intervalsRef.current[position];
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        delete intervalsRef.current[position];
      }
      dispatchKey("keyup", mapping.code, mapping.key);
    },
    [config],
  );

  if (!config) {
    return null;
  }

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        <button
          type="button"
          className="touch-btn touch-dpad-up"
          aria-label="Arriba"
          data-position="up"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <svg
            className="touch-dpad-arrow"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 4 L20 16 L4 16 Z" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className="touch-btn touch-dpad-down"
          aria-label="Abajo"
          data-position="down"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <svg
            className="touch-dpad-arrow"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 8 L20 8 L12 20 Z" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className="touch-btn touch-dpad-left"
          aria-label="Izquierda"
          data-position="left"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <svg
            className="touch-dpad-arrow"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M16 4 L16 20 L4 12 Z" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className="touch-btn touch-dpad-right"
          aria-label="Derecha"
          data-position="right"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <svg
            className="touch-dpad-arrow"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8 4 L20 12 L8 20 Z" fill="currentColor" />
          </svg>
        </button>
        <div className="touch-dpad-hub" aria-hidden="true">
          <span className="touch-dpad-gem" />
        </div>
      </div>
      <div className="touch-actions">
        <button
          type="button"
          className="touch-btn touch-btn-round touch-btn-a"
          aria-label="Botón A"
          data-position="a"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          A
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-round touch-btn-b"
          aria-label="Botón B"
          data-position="b"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          B
        </button>
      </div>
    </div>
  );
}
