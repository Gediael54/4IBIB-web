import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestGet, onRequest } from "./health.js";

describe("functions/api/health", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retorna 200 com status ok quando env e supabase respondem", async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const env = {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role"
    };
    const response = await onRequestGet({ env });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.checks.env).toBe(true);
    expect(body.checks.supabase).toBe(true);
    expect(body.timestamp).toBeTruthy();
  });

  it("retorna 503 quando env esta incompleto", async () => {
    const response = await onRequestGet({ env: {} });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.checks.env).toBe(false);
    expect(body.checks.supabase).toBe(false);
  });

  it("retorna 503 quando supabase nao responde", async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error("network"));
    const env = {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role"
    };
    const response = await onRequestGet({ env });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.checks.supabase).toBe(false);
  });

  it("onRequest retorna 405 para metodos nao suportados", async () => {
    const response = await onRequest();
    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body.error).toMatch(/nao permitido/i);
  });
});
