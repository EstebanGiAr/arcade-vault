"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevaContrasenaPage() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(data.session !== null);
      setChecking(false);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: pass,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message || "ALGO SALIÓ MAL. INTENTA DE NUEVO");
      return;
    }

    router.push("/juegos");
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
            NUEVA CONTRASEÑA
          </div>
        </div>

        {checking ? (
          <div
            className="mono"
            style={{
              fontSize: 12,
              textAlign: "center",
              marginTop: 10,
              color: "var(--ink-faint)",
            }}
          >
            VERIFICANDO ENLACE…
          </div>
        ) : !hasSession ? (
          <div
            className="mono"
            style={{
              color: "var(--magenta)",
              fontSize: 12,
              textAlign: "center",
              marginTop: 10,
              letterSpacing: "0.04em",
            }}
          >
            ESTE ENLACE DE RECUPERACIÓN NO ES VÁLIDO O YA EXPIRÓ
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>Contraseña nueva</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
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
              {loading ? "UN MOMENTO…" : "GUARDAR CONTRASEÑA"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
