import { expect, it } from "vitest";
import { createBackend } from "./index";

it("returns the supabase backend when VITE_BACKEND=supabase and supabase env is set", () => {
  const backend = createBackend({
    VITE_BACKEND: "supabase",
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    VITE_PRAYER_ENDPOINT: "/api/prayer"
  });
  expect(backend.mode).toBe("supabase");
});

it("uses the legacy anon key when publishable key is missing", () => {
  const backend = createBackend({
    VITE_BACKEND: "supabase",
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_ANON_KEY: "sb_anon_legacy"
  });
  expect(backend.mode).toBe("supabase");
});

it("falls back to the mock backend when VITE_BACKEND is not supabase", () => {
  expect(createBackend({}).mode).toBe("mock");
  expect(createBackend({ VITE_BACKEND: "mock" }).mode).toBe("mock");
  expect(createBackend({ VITE_BACKEND: "anything-else" }).mode).toBe("mock");
});

it("passes explicit mock admin credentials to the mock backend", async () => {
  const backend = createBackend({
    VITE_BACKEND: "mock",
    VITE_MOCK_ADMIN_EMAIL: "admin.teste@4ibib.local",
    VITE_MOCK_ADMIN_PASSWORD: "senha-teste"
  });

  await expect(backend.auth.signIn("admin.teste@4ibib.local", "senha-teste")).resolves.toMatchObject({
    email: "admin.teste@4ibib.local",
    displayName: "Administrador"
  });
});

it("passes explicit mock admin display name to the mock backend", async () => {
  const backend = createBackend({
    VITE_BACKEND: "mock",
    VITE_MOCK_ADMIN_EMAIL: "admin.teste@4ibib.local",
    VITE_MOCK_ADMIN_PASSWORD: "senha-teste",
    VITE_MOCK_ADMIN_DISPLAY_NAME: "Admin Teste"
  });

  await expect(backend.auth.signIn("admin.teste@4ibib.local", "senha-teste")).resolves.toMatchObject({
    displayName: "Admin Teste"
  });
});

it("leaves mock login disabled without explicit mock admin credentials", async () => {
  const backend = createBackend({ VITE_BACKEND: "mock" });

  await expect(backend.auth.signIn("admin.teste@4ibib.local", "senha-teste")).rejects.toThrow(
    "Login mock nao configurado."
  );
});

it("rejects partial mock admin configuration", () => {
  expect(() =>
    createBackend({
      VITE_BACKEND: "mock",
      VITE_MOCK_ADMIN_PASSWORD: "senha-teste"
    })
  ).toThrow("Email do login mock nao configurado.");

  expect(() =>
    createBackend({
      VITE_BACKEND: "mock",
      VITE_MOCK_ADMIN_EMAIL: "admin.teste@4ibib.local"
    })
  ).toThrow("Senha do login mock nao configurada.");
});

it("propagates supabase validation when supabase env is empty", () => {
  expect(() => createBackend({ VITE_BACKEND: "supabase" })).toThrow("VITE_SUPABASE_URL nao configurada.");
  expect(() =>
    createBackend({ VITE_BACKEND: "supabase", VITE_SUPABASE_URL: "https://example.supabase.co" })
  ).toThrow("VITE_SUPABASE_PUBLISHABLE_KEY nao configurada.");
});

it("validates supabase URL and prayer endpoint formats", () => {
  expect(() =>
    createBackend({
      VITE_BACKEND: "supabase",
      VITE_SUPABASE_URL: "not-a-url",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test"
    })
  ).toThrow("VITE_SUPABASE_URL deve ser uma URL valida do Supabase.");

  expect(() =>
    createBackend({
      VITE_BACKEND: "supabase",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      VITE_PRAYER_ENDPOINT: "api/prayer"
    })
  ).toThrow("VITE_PRAYER_ENDPOINT deve ser um caminho relativo iniciado por /.");
});
