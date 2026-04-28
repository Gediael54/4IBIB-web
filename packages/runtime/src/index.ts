import { type ChurchBackend } from "@4ibib/core";
import { createMockBackend, type MockAdminCredentials } from "@4ibib/mock";
import { createSupabaseBackend } from "@4ibib/supabase";

export type BackendEnv = Record<string, string | undefined>;

export function createBackend(env: BackendEnv): ChurchBackend {
  if (env.VITE_BACKEND === "supabase") {
    return createSupabaseBackend({
      url: env.VITE_SUPABASE_URL ?? "",
      anonKey: env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? ""
    });
  }

  return createMockBackend({
    admin: readMockAdminCredentials(env)
  });
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
