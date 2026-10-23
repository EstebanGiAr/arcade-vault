import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prototipo estático de referencia (JSX con globales de script-tag,
    // no es código de la app ni se importa en ninguna parte).
    "references/**",
  ]),
  // Desactiva reglas de estilo que choquen con Prettier (debe ir último).
  eslintConfigPrettier,
]);

export default eslintConfig;
