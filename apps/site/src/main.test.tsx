import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPrayerRequest: vi.fn()
}));

vi.mock("./backend", () => ({
  createBackend: () => ({
    mode: "mock",
    content: {
      getSnapshot: vi.fn().mockResolvedValue({
        profile: {
          id: "main",
          name: "4a Igreja Batista Independente Betel",
          shortName: "4a Betel",
          tagline: "Uma igreja local",
          city: "Cidade",
          pastorName: "Pastor",
          address: "Rua",
          email: "contato@example.test",
          whatsapp: "5581999999999",
          instagramUrl: "",
          youtubeUrl: "",
          mapsUrl: "",
          heroVerse: "Versiculo",
          mission: "Missao",
          foundedText: "Historia",
          regularMeetings: [],
          updatedAt: "2030-01-01T00:00:00.000Z"
        },
        announcements: [],
        ministries: [],
        schedule: []
      }),
      createPrayerRequest: mocks.createPrayerRequest
    }
  })
}));

import { App } from "./main";

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
      expect(
        screen.getByRole("heading", { name: "4a Igreja Batista Independente Betel" })
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Pedido de oracao" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar pedido/i })).toBeEnabled();
  });
});
