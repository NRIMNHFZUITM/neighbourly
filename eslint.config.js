import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const hooks = reactHooks.configs.flat.recommended;

export default defineConfig(
  globalIgnores([
    "**/dist/**",
    "**/node_modules/**",
    "apps/web/public/mockServiceWorker.js",
    "packages/shared/src/kb/kb.generated.ts",
    "screenshots/**",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js}"],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { ...hooks.plugins, "react-refresh": reactRefresh },
    rules: {
      // Classic hook rules stay strict; the React Compiler checks are advisory for now.
      ...Object.fromEntries(Object.keys(hooks.rules).map((rule) => [rule, "warn"])),
      "react-hooks/rules-of-hooks": "error",
      "react-refresh/only-export-components": "off",
    },
  },
);
