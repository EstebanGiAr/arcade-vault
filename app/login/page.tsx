"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { getProfileByUsername } from "@/lib/profiles";

function mapAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";

  if (/already registered|already exists/i.test(message)) {
    return "ESE CORREO YA ESTÁ REGISTRADO";
  }
  if (/invalid login credentials/i.test(message)) {
    return "CREDENCIALES INVÁLIDAS";
  }
  return message || "ALGO SALIÓ MAL. INTENTA DE NUEVO";
}

export default function LoginPage() {
  const [tab, setTab] = useState<"in" | "up">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signIn, signUp, signOut } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "in") {
        await signIn({ email, password: pass });
      } else {
        const username = (user || "PLAYER1").toUpperCase().slice(0, 10);
        const supabase = createClient();
        const taken = await getProfileByUsername(supabase, username);
        if (taken) {
          setError("ESE USUARIO YA ESTÁ EN USO");
          setLoading(false);
          return;
        }

        await signUp({ email, password: pass, username });
      }

      router.push("/juegos");
    } catch (err) {
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  const playAsGuest = async () => {
    await signOut();
    router.push("/juegos");
  };

  const signInWithOAuth = async (provider: "google" | "github") => {
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(mapAuthError(oauthError));
    }
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
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => {
              setTab("in");
              setError(null);
            }}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => {
              setTab("up");
              setError(null);
            }}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={submit}>
          {tab === "in" ? (
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
              />
            </div>
          ) : (
            <>
              <div className="field">
                <label>Usuario</label>
                <input
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="px_kai"
                />
              </div>
              <div className="field slide-in">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jugador@vault.gg"
                />
              </div>
            </>
          )}
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {tab === "in" && (
            <div style={{ textAlign: "right", marginTop: 6 }}>
              <Link
                href="/recuperar"
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.04em",
                }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          )}

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
            {loading
              ? "UN MOMENTO…"
              : tab === "in"
                ? "ENTRAR AL VAULT"
                : "CREAR Y JUGAR"}
          </button>
        </form>

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={playAsGuest}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            onClick={() => signInWithOAuth("google")}
          >
            ◆ GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => signInWithOAuth("github")}
          >
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
