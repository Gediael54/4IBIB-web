import "@testing-library/jest-dom/vitest";
import type { ScheduleItem, SiteSnapshot } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bulkUpdateScheduleItems: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      bulkUpdateScheduleItems: mocks.bulkUpdateScheduleItems
    }
  }
}));

import { ToastProvider } from "../components/Toast";
import AnnualScheduleView from "./AnnualScheduleView";

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

function makeScheduleItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: overrides.id ?? "s1",
    title: "Culto solene",
    ministry: "Louvor",
    startsAt: "2026-01-04T17:00:00.000Z",
    endsAt: "2026-01-04T19:00:00.000Z",
    location: "Templo",
    summary: "",
    preacher: "",
    director: "",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    seriesId: null,
    youtubeUrl: "",
    ...overrides
  };
}

function buildSnapshot(overrides: Partial<SiteSnapshot> = {}): SiteSnapshot {
  return {
    announcements: [],
    schedule: [],
    volunteers: [],
    profile: null,
    ministries: [],
    recurringMeetings: [],
    ...overrides
  };
}

function renderView(snapshot: SiteSnapshot = buildSnapshot()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AnnualScheduleView snapshot={snapshot} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("AnnualScheduleView", () => {
  afterEach(() => {
    cleanup();
    mocks.bulkUpdateScheduleItems.mockClear();
  });

  it("renders the heading and main controls", () => {
    renderView();

    expect(screen.getByText("Escala anual")).toBeInTheDocument();
    expect(screen.getByLabelText("Ano")).toBeInTheDocument();
    expect(screen.getByLabelText("Ministerio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Auto-distribuir voluntario" })).toBeInTheDocument();
  });

  it("disables save button when there are no pending changes", () => {
    renderView();
    const saveButton = screen.getByRole("button", { name: "Sem mudancas" });
    expect(saveButton).toBeDisabled();
  });

  it("populates ministry filter from snapshot.schedule entries", () => {
    renderView(
      buildSnapshot({
        schedule: [
          makeScheduleItem({ id: "1", ministry: "Louvor" }),
          makeScheduleItem({ id: "2", ministry: "Diaconia" })
        ]
      })
    );

    const ministrySelect = screen.getByLabelText("Ministerio") as HTMLSelectElement;
    const ministryValues = Array.from(ministrySelect.options).map((option) => option.value);
    expect(ministryValues).toContain("Louvor");
    expect(ministryValues).toContain("Diaconia");
    expect(ministryValues[0]).toBe("all");
  });

  it("toggles the auto-distribute panel", () => {
    renderView();
    const button = screen.getByRole("button", { name: "Auto-distribuir voluntario" });

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).not.toBe("true");
  });

  it("lazy-loads the generator panel and shows its summary", async () => {
    renderView();

    const summary = await screen.findByText("Gerador de escalas (cadencia por voluntario)");
    expect(summary).toBeInTheDocument();
  });

  it("mounts the auto-distribute panel only after clicking the toggle", async () => {
    renderView();

    expect(screen.queryByRole("button", { name: "Aplicar" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Auto-distribuir voluntario" }));

    expect(await screen.findByRole("button", { name: "Aplicar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });
});
