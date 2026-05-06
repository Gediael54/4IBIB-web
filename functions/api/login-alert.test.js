import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest, onRequestPost } from "./login-alert.js";

function buildRequest(body, headers = {}) {
  return new Request("https://4ibib-web.pages.dev/api/login-alert", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.7",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const baseEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  TURNSTILE_SECRET_KEY: "secret",
  RESEND_API_KEY: "resend-key",
  LOGIN_ALERT_TO: "ops@example.com",
  LOGIN_ALERT_FROM: "alerts@example.com",
  PRAYER_IP_HASH_SALT: "salt"
};

const validUser = {
  id: "user-123",
  email: "admin@example.com"
};

describe("functions/api/login-alert", () => {
  const originalFetch = globalThis.fetch;
  let consoleSpy;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retorna 400 quando body nao e JSON valido", async () => {
    const request = new Request("https://4ibib-web.pages.dev/api/login-alert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json"
    });
    const response = await onRequestPost({ request, env: baseEnv });
    expect(response.status).toBe(400);
  });

  it("retorna 401 sem header Authorization", async () => {
    const response = await onRequestPost({
      request: buildRequest({
        user_id: validUser.id,
        email: validUser.email,
        turnstileToken: "ok"
      }),
      env: baseEnv
    });
    expect(response.status).toBe(401);
  });

  it("retorna 401 quando Supabase rejeita o JWT", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ error: "bad" }, 401));
    const response = await onRequestPost({
      request: buildRequest(
        {
          user_id: validUser.id,
          email: validUser.email,
          turnstileToken: "ok"
        },
        { authorization: "Bearer fake-jwt" }
      ),
      env: baseEnv
    });
    expect(response.status).toBe(401);
  });

  it("retorna 401 quando email nao confere com o token", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse(validUser));
    const response = await onRequestPost({
      request: buildRequest(
        {
          user_id: validUser.id,
          email: "intruder@example.com",
          turnstileToken: "ok"
        },
        { authorization: "Bearer good-jwt" }
      ),
      env: baseEnv
    });
    expect(response.status).toBe(401);
  });

  it("retorna 401 quando user_id nao confere com o token", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse(validUser));
    const response = await onRequestPost({
      request: buildRequest(
        {
          user_id: "outro-id",
          email: validUser.email,
          turnstileToken: "ok"
        },
        { authorization: "Bearer good-jwt" }
      ),
      env: baseEnv
    });
    expect(response.status).toBe(401);
  });

  it("retorna 400 quando user_id ou email faltam apos JWT valido", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse(validUser));
    const response = await onRequestPost({
      request: buildRequest({ turnstileToken: "ok" }, { authorization: "Bearer good-jwt" }),
      env: baseEnv
    });
    expect(response.status).toBe(400);
  });

  it("retorna 403 quando Turnstile falha", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(jsonResponse(validUser))
      .mockResolvedValueOnce(jsonResponse({ success: false }));
    const response = await onRequestPost({
      request: buildRequest(
        {
          user_id: validUser.id,
          email: validUser.email,
          turnstileToken: "bad"
        },
        { authorization: "Bearer good-jwt" }
      ),
      env: baseEnv
    });
    expect(response.status).toBe(403);
  });

  it("happy path manda email via Resend e nao loga email", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(jsonResponse(validUser))
      .mockResolvedValueOnce(
        jsonResponse({ success: true, hostname: "4ibib-web.pages.dev", action: "admin-login" })
      )
      .mockResolvedValueOnce(jsonResponse({ id: "msg-1" }, 200));

    const response = await onRequestPost({
      request: buildRequest(
        {
          user_id: validUser.id,
          email: validUser.email,
          user_agent: "Mozilla/5.0",
          turnstileToken: "ok"
        },
        { authorization: "Bearer good-jwt" }
      ),
      env: baseEnv
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.delivery.sent).toBe(true);

    expect(consoleSpy).toHaveBeenCalledWith(
      "admin-login-alert",
      expect.objectContaining({
        user_id: validUser.id,
        ip_hash: expect.any(String),
        ua_hash: expect.any(String)
      })
    );
    const logArgs = consoleSpy.mock.calls[0][1];
    expect(logArgs).not.toHaveProperty("email");
    expect(logArgs).not.toHaveProperty("ip");
    expect(logArgs).not.toHaveProperty("user_agent");
    // Garante que nenhum campo logado contem o email cru.
    for (const value of Object.values(logArgs)) {
      expect(String(value)).not.toContain(validUser.email);
    }
  });

  it("delivery degrada silenciosamente quando RESEND_API_KEY ausente", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(jsonResponse(validUser))
      .mockResolvedValueOnce(jsonResponse({ success: true, hostname: "4ibib-web.pages.dev" }));
    const env = { ...baseEnv, RESEND_API_KEY: undefined };
    const response = await onRequestPost({
      request: buildRequest(
        {
          user_id: validUser.id,
          email: validUser.email,
          turnstileToken: "ok"
        },
        { authorization: "Bearer good-jwt" }
      ),
      env
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.delivery.sent).toBe(false);
  });

  it("delivery reporta falha quando Resend lanca erro", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(jsonResponse(validUser))
      .mockResolvedValueOnce(jsonResponse({ success: true, hostname: "4ibib-web.pages.dev" }))
      .mockRejectedValueOnce(new Error("network down"));
    const response = await onRequestPost({
      request: buildRequest(
        {
          user_id: validUser.id,
          email: validUser.email,
          turnstileToken: "ok"
        },
        { authorization: "Bearer good-jwt" }
      ),
      env: baseEnv
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.delivery.sent).toBe(false);
    expect(body.delivery.reason).toContain("network down");
  });

  it("retorna 401 quando env de Supabase auth ausente", async () => {
    const env = { ...baseEnv, SUPABASE_URL: undefined };
    const response = await onRequestPost({
      request: buildRequest(
        {
          user_id: validUser.id,
          email: validUser.email,
          turnstileToken: "ok"
        },
        { authorization: "Bearer good-jwt" }
      ),
      env
    });
    expect(response.status).toBe(401);
  });

  it("retorna 401 quando fetch para Supabase auth lanca", async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error("dns"));
    const response = await onRequestPost({
      request: buildRequest(
        {
          user_id: validUser.id,
          email: validUser.email,
          turnstileToken: "ok"
        },
        { authorization: "Bearer good-jwt" }
      ),
      env: baseEnv
    });
    expect(response.status).toBe(401);
  });

  it("onRequest retorna 405", async () => {
    const response = await onRequest();
    expect(response.status).toBe(405);
  });
});
