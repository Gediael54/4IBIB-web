const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_HOSTNAMES = new Set(["4ibib-web.pages.dev", "localhost", "127.0.0.1"]);

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function sanitize(value, max) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyAccessToken(env, token) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }
  try {
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY
      }
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (!user || typeof user.id !== "string" || typeof user.email !== "string") {
      return null;
    }
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

async function verifyTurnstileToken(env, token, ip) {
  if (!env.TURNSTILE_SECRET_KEY) return { ok: true };
  try {
    const body = new FormData();
    body.append("secret", env.TURNSTILE_SECRET_KEY);
    body.append("response", token);
    if (ip) body.append("remoteip", ip);
    const response = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body });
    const payload = await response.json();
    if (!payload?.success) return { ok: false };
    if (payload.hostname && !TURNSTILE_HOSTNAMES.has(payload.hostname)) {
      return { ok: false };
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function sendResendEmail(env, payload) {
  if (!env.RESEND_API_KEY || !env.LOGIN_ALERT_TO) {
    return { sent: false, reason: "RESEND_API_KEY or LOGIN_ALERT_TO not configured" };
  }
  const body = {
    from: env.LOGIN_ALERT_FROM ?? "alerts@4ibib.local",
    to: [env.LOGIN_ALERT_TO],
    subject: `Login no painel admin: ${payload.email}`,
    text: [
      `Email: ${payload.email}`,
      `User ID: ${payload.user_id}`,
      `IP: ${payload.ip}`,
      `User-Agent: ${payload.user_agent}`,
      `Geo: ${payload.geo}`,
      `Hora: ${payload.timestamp}`
    ].join("\n")
  };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
    return { sent: response.ok };
  } catch (error) {
    return { sent: false, reason: String(error) };
  }
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return json(400, { error: "Payload invalido." });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return json(401, { error: "Sem token." });
  }

  const verifiedUser = await verifyAccessToken(env, token);
  if (!verifiedUser) {
    return json(401, { error: "Token invalido." });
  }

  const claimedUserId = sanitize(payload.user_id, 80);
  const claimedEmail = sanitize(payload.email, 200);

  if (!claimedUserId || !claimedEmail) {
    return json(400, { error: "user_id e email obrigatorios." });
  }

  if (verifiedUser.id !== claimedUserId || verifiedUser.email !== claimedEmail) {
    return json(401, { error: "Token nao confere com o usuario." });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const turnstileToken = sanitize(payload.turnstileToken, 4096);
  if (turnstileToken) {
    const turnstileResult = await verifyTurnstileToken(env, turnstileToken, ip);
    if (!turnstileResult.ok) {
      return json(403, { error: "Validacao anti-spam falhou." });
    }
  }

  const userAgent = sanitize(payload.user_agent, 400);
  const geo = request.cf
    ? [request.cf.city, request.cf.region, request.cf.country].filter(Boolean).join(", ")
    : "";

  const event = {
    user_id: verifiedUser.id,
    email: verifiedUser.email,
    ip,
    user_agent: userAgent,
    geo,
    timestamp: new Date().toISOString()
  };

  const salt = env.PRAYER_IP_HASH_SALT ?? "";
  const ipHash = ip ? await sha256Hex(`${salt}:${ip}`) : "";
  const uaHash = userAgent ? await sha256Hex(`${salt}:${userAgent}`) : "";

  console.log("admin-login-alert", {
    user_id: verifiedUser.id,
    ip_hash: ipHash,
    ua_hash: uaHash,
    geo,
    timestamp: event.timestamp
  });

  const delivery = await sendResendEmail(env, event);

  return json(200, { ok: true, delivery });
}

export async function onRequest() {
  return json(405, { error: "Metodo nao permitido." });
}
