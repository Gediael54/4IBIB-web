export async function onRequestGet({ env }) {
  const checks = { supabase: false, env: false };
  checks.env = Boolean(env.VITE_SUPABASE_URL) && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

  if (checks.env) {
    try {
      const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY }
      });
      checks.supabase = response.ok;
    } catch {
      checks.supabase = false;
    }
  }

  const ok = Object.values(checks).every(Boolean);
  return new Response(JSON.stringify({ ok, checks, timestamp: new Date().toISOString() }), {
    status: ok ? 200 : 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function onRequest() {
  return new Response(JSON.stringify({ error: "Metodo nao permitido." }), {
    status: 405,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
