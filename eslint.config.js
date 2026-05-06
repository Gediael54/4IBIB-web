import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const browserGlobals = {
  console: "readonly",
  crypto: "readonly",
  document: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  HTMLFormElement: "readonly",
  localStorage: "readonly",
  Response: "readonly",
  Storage: "readonly",
  URL: "readonly",
  window: "readonly"
};

const workerGlobals = {
  console: "readonly",
  crypto: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  Request: "readonly",
  Response: "readonly",
  TextEncoder: "readonly",
  URL: "readonly"
};

const nodeGlobals = {
  console: "readonly",
  process: "readonly",
  fetch: "readonly",
  URL: "readonly"
};

export default tseslint.config(
  {
    ignores: ["coverage", "dist", "node_modules", "apps/*/dist"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    languageOptions: {
      globals: browserGlobals
    },
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  },
  {
    files: ["functions/**/*.js"],
    languageOptions: {
      globals: workerGlobals
    }
  },
  {
    files: ["scripts/**/*.mjs", "vite*.ts", "vitest*.ts", "playwright.config.ts", "eslint.config.js"],
    languageOptions: {
      globals: nodeGlobals
    }
  },
  {
    files: ["e2e/**/*.ts"],
    languageOptions: {
      globals: { ...nodeGlobals, ...browserGlobals }
    }
  }
);
