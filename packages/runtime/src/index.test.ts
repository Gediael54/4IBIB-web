import { expect, it } from "vitest";
import { createBackend } from "./index";

it("returns the supabase backend when VITE_BACKEND=supabase and supabase env is set", () => {
  const backend = createBackend({
    VITE_BACKEND: "supabase",
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test"
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

it("propagates supabase validation when supabase env is empty", () => {
  expect(() => createBackend({ VITE_BACKEND: "supabase" })).toThrow();
  expect(() =>
    createBackend({ VITE_BACKEND: "supabase", VITE_SUPABASE_URL: "https://example.supabase.co" })
  ).toThrow();
});
