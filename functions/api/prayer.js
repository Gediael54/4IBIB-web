const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const LIMIT_WINDOW_MINUTES = 10;
const LIMIT_MAX_REQUESTS = 5;
const ALLOWED_HOSTNAMES = new Set(["4ibib-web.pages.dev", "localhost", "127.0.0.1"]);

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function cleanText(value, limit) {
  return String(value ?? "")
    .trim()
    .slice(0, limit);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function supabaseHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    prefer: "return=representation"
  };
}

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET_KEY || !token) {
    return { ok: false };
  }

  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body
    });
    const payload = await response.json();
    if (!payload?.success) return { ok: false };
    if (payload.hostname && !ALLOWED_HOSTNAMES.has(payload.hostname)) {
      return { ok: false };
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function enforceRateLimit(env, ipHash) {
  const since = new Date(Date.now() - LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const endpoint = new URL(`${env.VITE_SUPABASE_URL}/rest/v1/prayer_request_rate_limits`);
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("ip_hash", `eq.${ipHash}`);
  endpoint.searchParams.set("created_at", `gte.${since}`);

  const response = await fetch(endpoint, { headers: supabaseHeaders(env) });

  if (!response?.ok) {
    return { ok: false, exceeded: true };
  }

  const rows = await response.json();
  if (rows.length >= LIMIT_MAX_REQUESTS) {
    return { ok: false, exceeded: true };
  }

  await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/prayer_request_rate_limits`, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify({ ip_hash: ipHash })
  });

  return { ok: true };
}

async function insertPrayerRequest(env, input) {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/prayer_requests`, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify({
      name: input.name,
      contact: input.contact,
      message: input.message,
      status: "novo"
    })
  });

  if (!response.ok) {
    return { ok: false };
  }

  const [row] = await response.json();
  return { ok: true, row };
}

export async function onRequestPost({ request, env }) {
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Env de Supabase server-side nao configurado." });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return json(400, { error: "Payload invalido." });
  }

  const input = {
    name: cleanText(payload.name, 120),
    contact: cleanText(payload.contact, 180),
    message: cleanText(payload.message, 2000),
    turnstileToken: String(payload.turnstileToken ?? "")
  };

  if (input.name.length < 2 || input.message.length < 5) {
    return json(400, { error: "Informe nome e pedido de oracao." });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const turnstile = await verifyTurnstile(env, input.turnstileToken, ip);
  if (!turnstile.ok) {
    return json(403, { error: "Confirme o desafio anti-spam." });
  }

  const salt = env.PRAYER_IP_HASH_SALT ?? env.TURNSTILE_SECRET_KEY ?? "";
  const ipHash = await sha256(`${ip}:${salt}`);
  const rateLimit = await enforceRateLimit(env, ipHash);
  if (!rateLimit.ok) {
    return json(429, { error: "Muitos pedidos enviados. Tente novamente mais tarde." });
  }

  const result = await insertPrayerRequest(env, input);
  if (!result.ok) {
    return json(500, { error: "Nao foi possivel salvar o pedido." });
  }

  return json(201, { data: result.row });
}

export async function onRequest() {
  return json(405, { error: "Metodo nao permitido." });
}
