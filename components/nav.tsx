"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const isHome = pathname === "/";
  const isLibrary = pathname === "/juegos" || pathname.startsWith("/juegos/");
  const isHallOfFame = pathname === "/salon-de-la-fama";
  const isAbout = pathname === "/about";
  const isAuth = pathname === "/login";
  const isAccount = pathname === "/cuenta";

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/juegos");
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
          <Link
            href="/salon-de-la-fama"
            className={isHallOfFame ? "active" : ""}
          >
            Salón de la Fama
          </Link>
          <Link href="/about" className={isAbout ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <>
            <Link
              href="/cuenta"
              className={"btn ghost auth-btn" + (isAccount ? " active" : "")}
            >
              {user.name} ▾
            </Link>
            <button className="btn ghost" onClick={handleSignOut}>
              Salir
            </button>
          </>
        ) : (
          <Link href="/login" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link href="/" className={isHome ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link
          href="/juegos"
          className={isLibrary ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link
          href="/salon-de-la-fama"
          className={isHallOfFame ? "active" : ""}
          onClick={close}
        >
          Salón de la Fama
        </Link>
        <Link href="/about" className={isAbout ? "active" : ""} onClick={close}>
          Acerca de
        </Link>
        {user ? (
          <Link
            href="/cuenta"
            className={isAccount ? "active" : ""}
            onClick={close}
          >
            Cuenta
          </Link>
        ) : (
          <Link
            href="/login"
            className={isAuth ? "active" : ""}
            onClick={close}
          >
            Iniciar Sesión
          </Link>
        )}
        {user && (
          <button
            className="btn ghost"
            onClick={() => {
              close();
              handleSignOut();
            }}
          >
            Salir
          </button>
        )}
        <div style={{ flex: 1 }} />
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
