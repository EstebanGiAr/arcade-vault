"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message || "ALGO SALIÓ MAL. INTENTA DE NUEVO");
      return;
    }

    setSent(true);
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            RECUPERAR CONTRASEÑA
          </div>
        </div>

        {sent ? (
          <div
            className="mono"
            style={{
              color: "var(--green)",
              fontSize: 13,
              textAlign: "center",
              marginTop: 10,
              letterSpacing: "0.04em",
            }}
          >
            REVISA TU CORREO PARA CONTINUAR
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
              />
            </div>

            {error && (
              <div
                className="mono"
                style={{
                  color: "var(--magenta)",
                  fontSize: 12,
                  marginTop: 10,
                  letterSpacing: "0.04em",
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn lg"
              type="submit"
              disabled={loading}
              style={{ width: "100%", marginTop: 8 }}
            >
              {loading ? "UN MOMENTO…" : "ENVIAR ENLACE"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Link href="/login" className="btn ghost" style={{ width: "100%" }}>
            VOLVER A INICIAR SESIÓN
          </Link>
        </div>
      </div>
    </div>
  );
}
