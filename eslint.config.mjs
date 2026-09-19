import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import nextVitals from "eslint-config-next/core-web-vitals.js";

export default defineConfig([
  ...nextVitals,
  {
    files: ["tests/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "public/**",
  ]),
]);
