import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSnapshot: vi.fn(),
  createPrayerRequest: vi.fn(),
  listMembers: vi.fn()
}));

vi.mock("./backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      getSnapshot: mocks.getSnapshot,
      createPrayerRequest: mocks.createPrayerRequest,
      listMembers: mocks.listMembers
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

function setHash(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("public site", () => {
  beforeEach(() => {
    mocks.getSnapshot.mockResolvedValue({
      announcements: [],
      schedule: [],
      profile: null,
      ministries: [],
      recurringMeetings: []
    });
    mocks.createPrayerRequest.mockReset();
    mocks.listMembers.mockResolvedValue([]);
    window.location.hash = "";
  });

  afterEach(() => {
    cleanup();
    window.location.hash = "";
  });

  it("renders the prayer request form after loading content", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: CHURCH.name })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Pedido de oracao" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar pedido/i })).toBeEnabled();
  });

  it("shows footer links to privacy policy and meus dados", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: CHURCH.name })).toBeInTheDocument();
    });

    const footer = screen.getByRole("navigation", { name: /Navegacao do rodape/i });
    expect(within(footer).getByRole("link", { name: /Politica de privacidade/i })).toHaveAttribute(
      "href",
      "#politica-privacidade"
    );
    expect(within(footer).getByRole("link", { name: /Meus dados/i })).toHaveAttribute("href", "#meus-dados");
  });

  it("blocks prayer submission without consent and surfaces inline error", async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: CHURCH.name })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Seu nome/i), { target: { value: "Maria" } });
    fireEvent.change(screen.getByPlaceholderText(/Como podemos orar/i), {
      target: { value: "Por minha familia" }
    });

    const form = screen.getByRole("button", { name: /enviar pedido/i }).closest("form");
    expect(form).not.toBeNull();
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/E necessario autorizar o tratamento dos dados/i)).toBeInTheDocument();
    });
    expect(mocks.createPrayerRequest).not.toHaveBeenCalled();
  });

  it("submits prayer request when consent is checked", async () => {
    mocks.createPrayerRequest.mockResolvedValue({ id: "req-1" });
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: CHURCH.name })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Seu nome/i), { target: { value: "Maria" } });
    fireEvent.change(screen.getByPlaceholderText(/Como podemos orar/i), {
      target: { value: "Por minha familia" }
    });
    fireEvent.click(screen.getByRole("checkbox"));

    const form = screen.getByRole("button", { name: /enviar pedido/i }).closest("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.createPrayerRequest).toHaveBeenCalledTimes(1);
    });
    expect(mocks.createPrayerRequest).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Maria", message: "Por minha familia" })
    );
  });

  it("renders the privacy policy page when hash is #politica-privacidade", async () => {
    setHash("#politica-privacidade");
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Politica de privacidade/i })).toBeInTheDocument();
    });
  });

  it("renders the meus dados page when hash is #meus-dados", async () => {
    setHash("#meus-dados");
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Meus dados/i })).toBeInTheDocument();
    });
  });
});
