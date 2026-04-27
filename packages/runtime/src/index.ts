import { type ChurchBackend } from "@4ibib/core";
import { createMockBackend } from "@4ibib/mock";
import { createSupabaseBackend } from "@4ibib/supabase";

export type BackendEnv = Record<string, string | undefined>;

export function createBackend(env: BackendEnv): ChurchBackend {
  if (env.VITE_BACKEND === "supabase") {
    return createSupabaseBackend({
      url: env.VITE_SUPABASE_URL ?? "",
      anonKey: env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? ""
    });
  }

  return createMockBackend();
}
