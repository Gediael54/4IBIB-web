import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const ENV_KEYS = [
  "VITE_BACKEND",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY"
];

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, "../..", "VITE_");
  const define: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    define[`import.meta.env.${key}`] = JSON.stringify(process.env[key] ?? fileEnv[key] ?? "");
  }
  return {
    plugins: [react()],
    envDir: "../..",
    base: "/admin/",
    define,
    build: {
      sourcemap: true
    }
  };
});
