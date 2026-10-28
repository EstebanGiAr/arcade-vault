"use client";

import { useState } from "react";

const POKEMON_COUNT = 1025;

function spriteUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

export default function ContadorPage() {
  const [count, setCount] = useState(1);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  const pokemonId = ((count - 1) % POKEMON_COUNT) + 1;
  // Derivado en vez de un boolean con useEffect: hacer setState del flag al
  // cambiar `count` dispara react-hooks/set-state-in-effect.
  const isLoading = loadedId !== pokemonId;

  return (
    <div
      className="fade-in"
      style={{ padding: "48px 16px", textAlign: "center" }}
    >
      <h2 className="neon-cyan" style={{ marginBottom: 24 }}>
        CONTADOR POKÉMON
      </h2>

      <div
        className="crt-screen"
        style={{
          width: 260,
          height: 260,
          margin: "0 auto 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isLoading && (
          <div
            className="mono"
            style={{ color: "var(--ink-faint)", fontSize: 12 }}
          >
            CARGANDO…
          </div>
        )}
        <img
          key={pokemonId}
          src={spriteUrl(pokemonId)}
          alt={`Pokémon #${pokemonId}`}
          onLoad={() => setLoadedId(pokemonId)}
          ref={(node) => {
            // Si la imagen viene de caché, el navegador ya disparó `load`
            // antes de que React enganchara onLoad: sin esto queda en CARGANDO…
            if (node?.complete) setLoadedId(pokemonId);
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: isLoading ? "none" : "block",
            imageRendering: "pixelated",
          }}
        />
      </div>

      <div
        className="mono neon-yellow"
        style={{ fontSize: 32, marginBottom: 4 }}
      >
        {count}
      </div>
      <div
        className="mono"
        style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 24 }}
      >
        POKÉMON #{pokemonId}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button
          className="btn ghost"
          onClick={() => setCount((c) => Math.max(1, c - 1))}
        >
          − DECREMENTAR
        </button>
        <button className="btn lg" onClick={() => setCount((c) => c + 1)}>
          + INCREMENTAR
        </button>
      </div>
    </div>
  );
}
