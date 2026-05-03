const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return { ok: false, message: "Turnstile nao configurado." };
  }

  if (!token) {
    return { ok: false, message: "Confirme o desafio anti-spam." };
  }

  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  if (ip) {
    body.append("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  const payload = await response.json();

  return payload.success ? { ok: true } : { ok: false, message: "Falha na validacao anti-spam." };
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  const token = String(payload?.turnstileToken ?? "");
  const ip = request.headers.get("cf-connecting-ip") ?? "";

  const result = await verifyTurnstile(env, token, ip);
  if (!result.ok) {
    return json(400, { error: result.message });
  }
  return json(200, { ok: true });
}

export async function onRequest() {
  return json(405, { error: "Metodo nao permitido." });
}
