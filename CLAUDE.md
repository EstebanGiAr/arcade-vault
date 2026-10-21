# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos. Actualmente es un scaffold recién generado con `create-next-app`; aún no tiene lógica de juego, rutas API, ni base de datos implementadas.

## Commands

- `npm run dev` — inicia el servidor de desarrollo (Next.js con Turbopack).
- `npm run build` — build de producción.
- `npm run start` — sirve el build de producción.
- `npm run lint` — ejecuta ESLint (`eslint.config.mjs`, basado en `eslint-config-next`).

No hay suite de tests configurada todavía.

## Stack y arquitectura

- Next.js 16 (App Router) + React 19 + TypeScript, con Tailwind CSS v4 vía el loader de `@tailwindcss/turbopack` (configurado en `next.config.ts`).
- `app/layout.tsx` define el layout raíz y las fuentes (Geist Sans/Mono vía `next/font/google`).
- `app/page.tsx` es la página de inicio por defecto de `create-next-app`, pendiente de reemplazar por la UI real de Arcade Vault.
- Alias de import `@/*` apunta a la raíz del proyecto (ver `tsconfig.json`).
- `next.config.ts` tiene habilitados flags experimentales: `cacheComponents`, `partialPrefetching`, y `experimental.agentFeedback`. Next.js 16 introduce cambios de API respecto a versiones previas — si surgen dudas sobre convenciones o APIs, consultar `node_modules/next/dist/docs/` antes de asumir comportamiento de versiones anteriores (ver nota en `AGENTS.md`, que es regenerada automáticamente por `next dev`, no editar a mano).

## Flujo de trabajo: Spec Driven Design

El proyecto sigue un flujo de diseño guiado por especificaciones (spec-driven design) usando los comandos `/spec` y `/spec-impl`, instalados mediante el paquete de skills de Fernando Herrera:

```bash
npx skills@latest add Klerith/fernando-skills
```

Si estos comandos (`/spec`, `/spec-impl`) están disponibles en el entorno, úsalos para planificar e implementar nuevas features en lugar de improvisar directamente sobre el código.
