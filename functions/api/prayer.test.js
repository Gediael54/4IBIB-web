import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest, onRequestPost } from "./prayer.js";

function buildRequest(body) {
  return new Request("https://4ibib-web.pages.dev/api/prayer", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.7"
    },
    body: JSON.stringify(body)
  });
}

function turnstileResponse(payload) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" }
  });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const baseEnv = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  TURNSTILE_SECRET_KEY: "secret",
  PRAYER_IP_HASH_SALT: "salt"
};

describe("functions/api/prayer", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retorna 500 quando env de Supabase falta", async () => {
    const response = await onRequestPost({
      request: buildRequest({ name: "Ana", message: "Por favor", turnstileToken: "t" }),
      env: { TURNSTILE_SECRET_KEY: "secret" }
    });
    expect(response.status).toBe(500);
  });

  it("retorna 400 quando campos obrigatorios ausentes", async () => {
    const response = await onRequestPost({
      request: buildRequest({ name: "", message: "", turnstileToken: "t" }),
      env: baseEnv
    });
    expect(response.status).toBe(400);
  });

  it("retorna 400 quando body nao e JSON valido", async () => {
    const request = new Request("https://4ibib-web.pages.dev/api/prayer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json"
    });
    const response = await onRequestPost({ request, env: baseEnv });
    expect(response.status).toBe(400);
  });

  it("retorna 403 quando Turnstile reprova", async () => {
    globalThis.fetch.mockResolvedValueOnce(turnstileResponse({ success: false }));
    const response = await onRequestPost({
      request: buildRequest({
        name: "Ana Maria",
        message: "Pedido aqui",
        turnstileToken: "bad"
      }),
      env: baseEnv
    });
    expect(response.status).toBe(403);
  });

  it("retorna 403 quando hostname nao confere", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      turnstileResponse({ success: true, hostname: "evil.example.com" })
    );
    const response = await onRequestPost({
      request: buildRequest({
        name: "Ana Maria",
        message: "Pedido aqui",
        turnstileToken: "ok"
      }),
      env: baseEnv
    });
    expect(response.status).toBe(403);
  });

  it("retorna 429 quando rate-limit excedido", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(turnstileResponse({ success: true, hostname: "4ibib-web.pages.dev" }))
      .mockResolvedValueOnce(jsonResponse([{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }]));
    const response = await onRequestPost({
      request: buildRequest({
        name: "Ana Maria",
        message: "Pedido aqui",
        turnstileToken: "ok"
      }),
      env: baseEnv
    });
    expect(response.status).toBe(429);
  });

  it("retorna 500 quando supabase falha ao consultar rate-limit", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(turnstileResponse({ success: true, hostname: "4ibib-web.pages.dev" }))
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500));
    const response = await onRequestPost({
      request: buildRequest({
        name: "Ana Maria",
        message: "Pedido aqui",
        turnstileToken: "ok"
      }),
      env: baseEnv
    });
    expect(response.status).toBe(429);
  });

  it("retorna 500 quando insert do prayer_request falha", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(turnstileResponse({ success: true, hostname: "4ibib-web.pages.dev" }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 201))
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500));
    const response = await onRequestPost({
      request: buildRequest({
        name: "Ana Maria",
        message: "Pedido aqui",
        turnstileToken: "ok"
      }),
      env: baseEnv
    });
    expect(response.status).toBe(500);
  });

  it("happy path retorna 201 com a row inserida", async () => {
    const inserted = { id: "abc", name: "Ana Maria", status: "novo" };
    globalThis.fetch
      .mockResolvedValueOnce(
        turnstileResponse({ success: true, hostname: "4ibib-web.pages.dev", action: "prayer" })
      )
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 201))
      .mockResolvedValueOnce(jsonResponse([inserted], 201));
    const response = await onRequestPost({
      request: buildRequest({
        name: "Ana Maria",
        contact: "ana@example.com",
        message: "Pedido aqui",
        turnstileToken: "ok"
      }),
      env: baseEnv
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data).toEqual(inserted);
  });

  it("usa TURNSTILE_SECRET_KEY como salt fallback quando PRAYER_IP_HASH_SALT ausente", async () => {
    const inserted = { id: "abc" };
    globalThis.fetch
      .mockResolvedValueOnce(turnstileResponse({ success: true, hostname: "4ibib-web.pages.dev" }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 201))
      .mockResolvedValueOnce(jsonResponse([inserted], 201));
    const env = { ...baseEnv, PRAYER_IP_HASH_SALT: undefined };
    const response = await onRequestPost({
      request: buildRequest({
        name: "Ana Maria",
        message: "Pedido aqui",
        turnstileToken: "ok"
      }),
      env
    });
    expect(response.status).toBe(201);
  });

  it("onRequest retorna 405", async () => {
    const response = await onRequest();
    expect(response.status).toBe(405);
  });
});
