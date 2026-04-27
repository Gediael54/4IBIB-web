import { createMockBackend } from "@4ibib/mock";
import { createSupabaseBackend } from "@4ibib/supabase";

export function createBackend() {
  const backend = import.meta.env.VITE_BACKEND;

  if (backend === "supabase") {
    return createSupabaseBackend({
      url: import.meta.env.VITE_SUPABASE_URL ?? "",
      anonKey:
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
        import.meta.env.VITE_SUPABASE_ANON_KEY ??
        ""
    });
  }

  return createMockBackend();
}
