import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["packages/**/*.test.ts", "apps/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "packages/core/src/**/*.ts",
        "packages/mock/src/**/*.ts",
        "packages/runtime/src/**/*.ts",
        "packages/supabase/src/**/*.ts"
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      }
    }
  }
});
