const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function sanitize(value, max) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
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

  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const geo = request.cf
    ? [request.cf.city, request.cf.region, request.cf.country].filter(Boolean).join(", ")
    : "";

  const event = {
    user_id: sanitize(payload.user_id, 80),
    email: sanitize(payload.email, 200),
    ip: sanitize(ip, 60),
    user_agent: sanitize(payload.user_agent, 400),
    geo: sanitize(geo, 200),
    timestamp: new Date().toISOString()
  };

  if (!event.user_id || !event.email) {
    return json(400, { error: "user_id e email obrigatorios." });
  }

  console.log("admin-login-alert", JSON.stringify(event));

  const delivery = await sendResendEmail(env, event);

  return json(200, { ok: true, delivery });
}

export async function onRequest() {
  return json(405, { error: "Metodo nao permitido." });
}
