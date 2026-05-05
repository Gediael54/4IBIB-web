import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    globals: false
  }
});
