import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSnapshot: vi.fn().mockResolvedValue({
    announcements: [],
    schedule: []
  }),
  createPrayerRequest: vi.fn()
}));

vi.mock("./backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      getSnapshot: mocks.getSnapshot,
      createPrayerRequest: mocks.createPrayerRequest
    }
  }
}));

import { App } from "./main";
import { CHURCH } from "./config/church";

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  );
}

describe("public site", () => {
  it("renders the prayer request form after loading content", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: CHURCH.name })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Pedido de oracao" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar pedido/i })).toBeEnabled();
  });
});
