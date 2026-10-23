#!/usr/bin/env node
// Hook PostToolUse: corre Prettier (todo lo formateable) y, si aplica, ESLint
// --fix sobre el archivo que Write/Edit/NotebookEdit acaba de tocar.
// Solo vive en este repo (.claude/settings.json versionado).

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");
const IGNORED_DIR_SEGMENTS = ["node_modules", ".next", ".git"];
const ESLINT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

function readStdin() {
  try {
    const raw = readFileSync(0, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Quita espacios/tabs al final de cada línea antes de pasar por Prettier/ESLint,
// para que estas herramientas no se "peleen" con whitespace residual.
function stripTrailingWhitespace(absolutePath) {
  const original = readFileSync(absolutePath, "utf8");
  const cleaned = original.replace(/[ \t]+(?=\r?\n|$)/g, "");
  if (cleaned !== original) writeFileSync(absolutePath, cleaned, "utf8");
}

function main() {
  const input = readStdin();
  const filePath =
    input?.tool_response?.filePath ?? input?.tool_input?.file_path;

  if (!filePath) process.exit(0);

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(PROJECT_ROOT, filePath);

  const relativePath = path.relative(PROJECT_ROOT, absolutePath);

  // Fuera de la raíz del proyecto (incluye "../...").
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    process.exit(0);
  }

  const segments = relativePath.split(path.sep);
  if (segments.some((s) => IGNORED_DIR_SEGMENTS.includes(s))) process.exit(0);

  if (!existsSync(absolutePath)) process.exit(0);

  // 1. Limpieza manual de trailing whitespace (Prettier no siempre lo toca
  //    en archivos que no sabe formatear).
  stripTrailingWhitespace(absolutePath);

  // 2. Prettier sobre cualquier archivo formateable.
  spawnSync("npx", ["prettier", "--write", "--ignore-unknown", absolutePath], {
    cwd: PROJECT_ROOT,
    shell: true,
    encoding: "utf8",
  });

  // 3. ESLint --fix solo si la extensión es de las que ESLint entiende.
  const ext = path.extname(absolutePath);
  if (!ESLINT_EXTENSIONS.has(ext)) process.exit(0);

  const eslintResult = spawnSync(
    "npx",
    ["eslint", "--fix", "--no-warn-ignored", absolutePath],
    { cwd: PROJECT_ROOT, shell: true, encoding: "utf8" },
  );

  const eslintOutput =
    `${eslintResult.stdout ?? ""}${eslintResult.stderr ?? ""}`.trim();

  // ESLint sale con código != 0 si quedan problemas sin arreglar.
  if (eslintResult.status && eslintOutput) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `ESLint encontró problemas que no pudo arreglar automáticamente en ${relativePath}:\n\n${eslintOutput}`,
        },
      }),
    );
  }

  process.exit(0);
}

main();
