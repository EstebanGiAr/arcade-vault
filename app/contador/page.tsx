"use client";

import { useState } from "react";

const MAX_POKEMON_ID = 1025;

export default function ContadorPage() {
  const [count, setCount] = useState(1);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  const pokemonId = ((count - 1) % MAX_POKEMON_ID) + 1;
  const imgLoading = loadedId !== pokemonId;
  const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

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
        {imgLoading && (
          <div
            className="mono"
            style={{ color: "var(--ink-faint)", fontSize: 12 }}
          >
            CARGANDO…
          </div>
        )}
        <img
          key={pokemonId}
          src={imageUrl}
          alt={`Pokémon #${pokemonId}`}
          onLoad={() => setLoadedId(pokemonId)}
          ref={(node) => {
            if (node?.complete) setLoadedId(pokemonId);
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: imgLoading ? "none" : "block",
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
