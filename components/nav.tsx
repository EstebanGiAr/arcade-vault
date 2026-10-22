"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isHome = pathname === "/";
  const isLibrary = pathname === "/juegos" || pathname.startsWith("/juegos/");
  const isHallOfFame = pathname === "/salon-de-la-fama";
  const isAuth = pathname === "/login";

  const close = () => setOpen(false);

  const handleSignOut = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isHome ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/juegos" className={isLibrary ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon-de-la-fama" className={isHallOfFame ? "active" : ""}>
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/login" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close} />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={isHome ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link href="/juegos" className={isLibrary ? "active" : ""} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon-de-la-fama" className={isHallOfFame ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/login" className={isAuth ? "active" : ""} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }} />
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
