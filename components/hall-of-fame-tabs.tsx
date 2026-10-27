"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Game, ScoreRow } from "@/app/data";
import { createClient } from "@/lib/supabase/client";
import { getTopScores, getBestScoreByUser } from "@/lib/scores";
import { useAuth } from "@/components/auth-provider";

function realScoresToRows(
  entries: Awaited<ReturnType<typeof getTopScores>>,
): ScoreRow[] {
  return entries.map((s, i) => ({
    rank: i + 1,
    name: s.name,
    score: s.score,
    date: new Date(s.createdAt).toLocaleDateString("es-ES"),
  }));
}

export function HallOfFameTabs({
  games,
  initialTab,
  initialRows,
}: {
  games: Game[];
  initialTab: string;
  initialRows: ScoreRow[];
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [rows, setRows] = useState<ScoreRow[]>(initialRows);
  const [youBest, setYouBest] = useState<ScoreRow | null>(null);

  const game = games.find((g) => g.id === tab)!;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const scores = await getTopScores(supabase, game.id, 12);
      if (cancelled) return;
      setRows(realScoresToRows(scores));

      if (!user) {
        setYouBest(null);
        return;
      }
      const best = await getBestScoreByUser(supabase, game.id, user.id);
      if (cancelled) return;
      setYouBest(
        best
          ? {
              rank: 0,
              name: best.name,
              score: best.score,
              date: new Date(best.createdAt).toLocaleDateString("es-ES"),
            }
          : null,
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tab, game.id, user]);

  const youBestRank = youBest
    ? rows.findIndex(
        (r) => r.name.toLowerCase() === youBest.name.toLowerCase(),
      ) + 1
    : 0;

  const isEmpty = rows.length === 0;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--ink-faint)",
          }}
        >
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            AÚN NADIE HA JUGADO
          </div>
        </div>
      ) : (
        <>
          <div className="podium">
            {rows[1] && (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{rows[1].name}</div>
                <div className="score">
                  {rows[1].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[1].date}</div>
              </div>
            )}
            {rows[0] && (
              <div className="podium-slot gold">
                <div
                  className="pixel"
                  style={{
                    fontSize: 9,
                    color: "var(--gold)",
                    letterSpacing: "0.18em",
                  }}
                >
                  CAMPEÓN
                </div>
                <div
                  className="rank-num"
                  style={{ fontSize: 36, marginTop: 4 }}
                >
                  01
                </div>
                <div className="name">{rows[0].name}</div>
                <div className="score" style={{ fontSize: 20 }}>
                  {rows[0].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[0].date}</div>
              </div>
            )}
            {rows[2] && (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{rows[2].name}</div>
                <div className="score">
                  {rows[2].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[2].date}</div>
              </div>
            )}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name + i}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {youBest && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    {youBestRank > 0
                      ? `#${String(youBestRank).padStart(2, "0")}`
                      : "—"}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {youBest.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {youBest.score.toLocaleString("es-ES")}
                  </div>
                  <div className="dt">{youBest.date}</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
