import { createSupabaseBackend } from "@4ibib/supabase";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const prayerEndpoint = import.meta.env.VITE_PRAYER_ENDPOINT ?? "";

if (!url) {
  throw new Error("VITE_SUPABASE_URL nao configurada.");
}

if (!anonKey) {
  throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY nao configurada.");
}

export const backend = createSupabaseBackend({ url, anonKey, prayerEndpoint });
