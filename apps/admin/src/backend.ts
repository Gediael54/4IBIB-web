import { createBackend as createRuntimeBackend } from "@4ibib/runtime";

export function createBackend() {
  return createRuntimeBackend({
    VITE_BACKEND: import.meta.env.VITE_BACKEND,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    ...(import.meta.env.DEV
      ? {
          VITE_MOCK_ADMIN_EMAIL: import.meta.env.VITE_MOCK_ADMIN_EMAIL,
          VITE_MOCK_ADMIN_PASSWORD: import.meta.env.VITE_MOCK_ADMIN_PASSWORD,
          VITE_MOCK_ADMIN_DISPLAY_NAME: import.meta.env.VITE_MOCK_ADMIN_DISPLAY_NAME
        }
      : {})
  });
}
