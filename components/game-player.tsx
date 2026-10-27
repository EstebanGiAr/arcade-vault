"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/app/data";
import { saveScore } from "@/lib/scores";
import { createClient } from "@/lib/supabase/client";
import { readSkin, writeSkin } from "@/lib/storage";
import { useAuth } from "@/components/auth-provider";
import { TouchControls } from "@/components/games/touch-controls";
import {
  GAME_REGISTRY,
  type ArcadeGameHandle,
  type ArcadeStats,
  type HudStatKey,
} from "@/components/games/registry";
import {
  DEFAULT_SKIN_ID,
  GAME_SKINS,
  resolveSkin,
  type SkinId,
} from "@/components/games/skins";

const SKIN_IDS: SkinId[] = ["clasico", "neon", "retro"];

const HUD_LABELS: Record<HudStatKey, string> = {
  score: "Puntuación",
  lives: "Vidas",
  level: "Nivel",
  lines: "Líneas",
};

const DECORATIVE_HUD_STATS: HudStatKey[] = ["score", "lives", "level"];
const DECORATIVE_INITIAL_STATS: ArcadeStats = { score: 0, lives: 3, level: 1 };

function parseAspectRatio(aspectRatio: string): number {
  const [w, h] = aspectRatio.split("/").map((part) => Number(part.trim()));
  return w / h;
}

export function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { user } = useAuth();
  const entry = GAME_REGISTRY[game.id];
  const gameRef = useRef<ArcadeGameHandle>(null);

  const [stats, setStats] = useState<ArcadeStats>(
    entry?.initialStats ?? DECORATIVE_INITIAL_STATS,
  );
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const score = stats.score ?? 0;
  const level = entry ? (stats.level ?? 1) : Math.floor(score / 2500) + 1;
  const hudStats = entry?.hudStats ?? DECORATIVE_HUD_STATS;

  const [skinId, setSkinId] = useState<SkinId>(DEFAULT_SKIN_ID);

  useEffect(() => {
    // Lectura diferida al montaje en cliente para evitar mismatches de hidratación.
    const stored = readSkin();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "neon" || stored === "retro") setSkinId(stored);
  }, []);

  const skin = useMemo(() => {
    const base = resolveSkin(skinId);
    const override = entry?.skinOverrides?.[base.id];
    return override ? { ...base, ...override } : base;
  }, [skinId, entry]);

  const handleSkinChange = (id: SkinId) => {
    setSkinId(id);
    writeSkin(id);
  };

  useEffect(() => {
    // Sincroniza el nombre con la sesión (login/logout) manteniéndolo editable
    // en el modal de fin de juego, donde el jugador puede escribir sus iniciales.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    if (over || paused || entry) return;
    const t = setInterval(
      () =>
        setStats((s) => ({
          ...s,
          score: (s.score ?? 0) + Math.floor(10 + Math.random() * 90),
        })),
      220,
    );
    return () => clearInterval(t);
  }, [over, paused, entry]);

  const handleStatsChange = (delta: ArcadeStats) => {
    setStats((s) => ({ ...s, ...delta }));
  };

  const endGame = () => {
    if (entry) gameRef.current?.forceGameOver();
    setOver(true);
  };
  const restart = () => {
    if (entry) gameRef.current?.restart();
    setStats(entry?.initialStats ?? DECORATIVE_INITIAL_STATS);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      await saveScore(supabase, { gameId: game.id, name, score });
      setSaved(true);
    } catch {
      setSaveError("No se pudo guardar la puntuación. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          {hudStats.map((key) => (
            <div key={key} className={`hud-stat ${key}`}>
              <div className="l">{HUD_LABELS[key]}</div>
              <div className="v">
                {key === "lives"
                  ? "♥ ".repeat(stats.lives ?? 0).trim() || "—"
                  : key === "level"
                    ? String(level).padStart(2, "0")
                    : key === "score"
                      ? score.toLocaleString("es-ES")
                      : (stats[key] ?? 0).toLocaleString("es-ES")}
              </div>
            </div>
          ))}
        </div>
        <div className="hud-actions">
          {entry && (
            <label
              className={`skin-picker ${skinId}`}
              style={
                {
                  "--skin-swatch": GAME_SKINS[skinId].swatch,
                } as CSSProperties
              }
            >
              <span className="dot" />
              <select
                className="skin-select"
                value={skinId}
                onChange={(e) => handleSkinChange(e.target.value as SkinId)}
              >
                {SKIN_IDS.map((id) => (
                  <option key={id} value={id}>
                    {GAME_SKINS[id].label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="hud-buttons">
            <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
              {paused ? "REANUDAR" : "PAUSA"}
            </button>
            <button className="btn magenta" onClick={endGame}>
              FIN
            </button>
            <button
              className="btn ghost"
              onClick={() => router.push(`/juegos/${game.id}`)}
            >
              SALIR
            </button>
          </div>
        </div>
      </div>

      <div className="crt">
        <div
          className="crt-screen"
          style={{
            aspectRatio: entry?.aspectRatio ?? "4 / 3",
            width: "100%",
            maxWidth: `min(100%, calc(min(70dvh, 760px) * ${parseAspectRatio(entry?.aspectRatio ?? "4 / 3")}))`,
            margin: "0 auto",
          }}
        >
          {entry ? (
            <entry.component
              ref={gameRef}
              paused={paused}
              skin={skin}
              onStatsChange={handleStatsChange}
              onGameOver={endGame}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
              <div className="player-ship" />
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {entry && <TouchControls gameId={game.id} />}

      <div className="mobile-footer-actions">
        <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
          {paused ? "REANUDAR" : "PAUSA"}
        </button>
        <button className="btn magenta" onClick={endGame}>
          FIN
        </button>
        <button
          className="btn ghost"
          onClick={() => router.push(`/juegos/${game.id}`)}
        >
          SALIR
        </button>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  disabled={saving}
                />
                <button
                  className="btn yellow"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
                {saveError && (
                  <div
                    className="mono"
                    style={{
                      width: "100%",
                      color: "var(--magenta)",
                      fontSize: 11,
                      marginTop: 8,
                    }}
                  >
                    {saveError}{" "}
                    <button
                      className="btn ghost"
                      style={{ marginLeft: 8 }}
                      onClick={handleSave}
                    >
                      REINTENTAR
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn"
                onClick={() =>
                  router.push(`/salon-de-la-fama?juego=${game.id}`)
                }
              >
                VER RANKING
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/juegos")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
