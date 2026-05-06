import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest, onRequestPost } from "./admin-login-verify.js";

function buildRequest(body = {}, headers = {}) {
  return new Request("https://example.test/api/admin-login-verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.7",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

describe("functions/api/admin-login-verify", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retorna 403 quando turnstile reprova", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), {
        headers: { "content-type": "application/json" }
      })
    );
    const env = { TURNSTILE_SECRET_KEY: "secret" };
    const response = await onRequestPost({
      request: buildRequest({ turnstileToken: "bad" }),
      env
    });
    expect(response.status).toBe(403);
  });

  it("retorna 200 quando turnstile aprova com hostname permitido", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          hostname: "4ibib-web.pages.dev",
          action: "admin-login"
        }),
        { headers: { "content-type": "application/json" } }
      )
    );
    const env = { TURNSTILE_SECRET_KEY: "secret" };
    const response = await onRequestPost({
      request: buildRequest({ turnstileToken: "good" }),
      env
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it("retorna 403 quando hostname nao casa", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          hostname: "evil.example.com",
          action: "admin-login"
        }),
        { headers: { "content-type": "application/json" } }
      )
    );
    const env = { TURNSTILE_SECRET_KEY: "secret" };
    const response = await onRequestPost({
      request: buildRequest({ turnstileToken: "good" }),
      env
    });
    expect(response.status).toBe(403);
  });

  it("aceita cliente legado sem campo action", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, hostname: "localhost" }), {
        headers: { "content-type": "application/json" }
      })
    );
    const env = { TURNSTILE_SECRET_KEY: "secret" };
    const response = await onRequestPost({
      request: buildRequest({ turnstileToken: "good" }),
      env
    });
    expect(response.status).toBe(200);
  });

  it("retorna 403 quando action nao casa", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          hostname: "localhost",
          action: "prayer"
        }),
        { headers: { "content-type": "application/json" } }
      )
    );
    const env = { TURNSTILE_SECRET_KEY: "secret" };
    const response = await onRequestPost({
      request: buildRequest({ turnstileToken: "good" }),
      env
    });
    expect(response.status).toBe(403);
  });

  it("retorna 403 quando token ausente", async () => {
    const env = { TURNSTILE_SECRET_KEY: "secret" };
    const response = await onRequestPost({
      request: buildRequest({}),
      env
    });
    expect(response.status).toBe(403);
  });

  it("onRequest retorna 405", async () => {
    const response = await onRequest();
    expect(response.status).toBe(405);
  });
});
