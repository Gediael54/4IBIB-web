import { type ChurchBackend } from "@4ibib/core";
import { createMockBackend, type MockAdminCredentials } from "@4ibib/mock";
import { createSupabaseBackend } from "@4ibib/supabase";

export type BackendEnv = Record<string, string | undefined>;

export function createBackend(env: BackendEnv): ChurchBackend {
  if (env.VITE_BACKEND === "supabase") {
    const supabaseEnv = readSupabaseEnv(env);
    return createSupabaseBackend({
      url: supabaseEnv.url,
      anonKey: supabaseEnv.anonKey,
      prayerEndpoint: supabaseEnv.prayerEndpoint
    });
  }

  return createMockBackend({
    admin: readMockAdminCredentials(env)
  });
}

function readSupabaseEnv(env: BackendEnv): { url: string; anonKey: string; prayerEndpoint: string } {
  const url = env.VITE_SUPABASE_URL ?? "";
  const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? "";
  const prayerEndpoint = env.VITE_PRAYER_ENDPOINT ?? "";

  if (!url) {
    throw new Error("VITE_SUPABASE_URL nao configurada.");
  }

  if (!URL.canParse(url) || !url.endsWith(".supabase.co")) {
    throw new Error("VITE_SUPABASE_URL deve ser uma URL valida do Supabase.");
  }

  if (!anonKey) {
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY nao configurada.");
  }

  if (prayerEndpoint && !prayerEndpoint.startsWith("/")) {
    throw new Error("VITE_PRAYER_ENDPOINT deve ser um caminho relativo iniciado por /.");
  }

  return { url, anonKey, prayerEndpoint };
}

function readMockAdminCredentials(env: BackendEnv): MockAdminCredentials | undefined {
  const email = env.VITE_MOCK_ADMIN_EMAIL ?? "";
  const password = env.VITE_MOCK_ADMIN_PASSWORD ?? "";
  const displayName = env.VITE_MOCK_ADMIN_DISPLAY_NAME ?? "";

  if (!email && !password && !displayName) {
    return undefined;
  }

  if (!email) {
    throw new Error("Email do login mock nao configurado.");
  }

  if (!password) {
    throw new Error("Senha do login mock nao configurada.");
  }

  if (displayName) {
    return { email, password, displayName };
  }

  return { email, password };
}
