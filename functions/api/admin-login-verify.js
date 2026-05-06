const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const ALLOWED_HOSTNAMES = new Set(["4ibib-web.pages.dev", "localhost", "127.0.0.1"]);
const EXPECTED_ACTION = "admin-login";

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

async function verifyTurnstile(env, token, ip) {
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  const payload = await response.json();
  return payload;
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  const token = String(payload?.turnstileToken ?? "").trim();
  const ip = request.headers.get("cf-connecting-ip") ?? "";

  if (!env.TURNSTILE_SECRET_KEY || !token) {
    return json(403, { error: "Confirme o desafio anti-spam." });
  }

  let result;
  try {
    result = await verifyTurnstile(env, token, ip);
  } catch {
    return json(403, { error: "Falha ao validar anti-spam." });
  }

  if (!result?.success) {
    return json(403, { error: "Falha na validacao anti-spam." });
  }

  if (result.hostname && !ALLOWED_HOSTNAMES.has(result.hostname)) {
    return json(403, { error: "Origem nao autorizada." });
  }

  if (result.action && result.action !== EXPECTED_ACTION) {
    return json(403, { error: "Acao do token nao corresponde." });
  }

  return json(200, { ok: true });
}

export async function onRequest() {
  return json(405, { error: "Metodo nao permitido." });
}
