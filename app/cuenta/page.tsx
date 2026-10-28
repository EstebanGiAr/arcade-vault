"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { updateUsername } from "@/lib/profiles";
import type { SessionUser } from "@/components/auth-provider";

function CuentaForm({
  user,
  refreshProfile,
}: {
  user: SessionUser;
  refreshProfile: () => Promise<void>;
}) {
  const [username, setUsername] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const normalized = username.toUpperCase().slice(0, 10);
      const supabase = createClient();
      await updateUsername(supabase, user.id, normalized);
      await refreshProfile();
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ALGO SALIÓ MAL. INTENTA DE NUEVO",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Usuario</label>
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setSuccess(false);
          }}
          placeholder="px_kai"
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

      {success && (
        <div
          className="mono"
          style={{
            color: "var(--green)",
            fontSize: 12,
            marginTop: 10,
            letterSpacing: "0.04em",
          }}
        >
          USUARIO ACTUALIZADO
        </div>
      )}

      <button
        className="btn lg"
        type="submit"
        disabled={saving}
        style={{ width: "100%", marginTop: 8 }}
      >
        {saving ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
      </button>
    </form>
  );
}

export default function CuentaPage() {
  const { user, loading, refreshProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user === null) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || user === null) {
    return null;
  }

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
            MI CUENTA
          </div>
        </div>

        <CuentaForm key={user.id} user={user} refreshProfile={refreshProfile} />
      </div>
    </div>
  );
}
