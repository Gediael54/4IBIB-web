import "@testing-library/jest-dom/vitest";
import type { SiteSnapshot } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveScheduleItem: vi.fn().mockResolvedValue({}),
  deleteScheduleItem: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  createBackend: () => ({
    mode: "mock",
    content: {
      saveScheduleItem: mocks.saveScheduleItem,
      deleteScheduleItem: mocks.deleteScheduleItem
    }
  })
}));

import ScheduleView from "./ScheduleView";

function buildSnapshot(): SiteSnapshot {
  return {
    profile: {
      id: "main",
      name: "Igreja",
      shortName: "Igreja",
      tagline: "Tagline",
      city: "Cidade",
      pastorName: "Pastor",
      address: "Rua",
      email: "contato@example.test",
      whatsapp: "5581900000000",
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
  };
}

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ScheduleView
        snapshot={buildSnapshot()}
        state={{ search: "", sort: "startsAsc", page: 1 }}
        onStateChange={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe("ScheduleView form", () => {
  afterEach(() => {
    cleanup();
    mocks.saveScheduleItem.mockClear();
    mocks.deleteScheduleItem.mockClear();
  });

  it("renders inline errors when required fields are empty", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Ministerio"), { target: { value: "" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Titulo e obrigatorio.")).toBeInTheDocument();
    });
    expect(screen.getByText("Ministerio e obrigatorio.")).toBeInTheDocument();
    expect(mocks.saveScheduleItem).not.toHaveBeenCalled();
  });

  it("submits the form when all required fields are valid", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Culto solene" } });
    fireEvent.change(screen.getByLabelText("Ministerio"), { target: { value: "Louvor" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.saveScheduleItem).toHaveBeenCalledTimes(1);
    });

    const payload = mocks.saveScheduleItem.mock.calls[0][0];
    expect(payload.title).toBe("Culto solene");
    expect(payload.ministry).toBe("Louvor");
    expect(payload.status).toBe("scheduled");
    expect(typeof payload.startsAt).toBe("string");
  });
});
