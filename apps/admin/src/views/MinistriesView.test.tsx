import "@testing-library/jest-dom/vitest";
import type { MinistryRecord, SiteSnapshot } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveMinistry: vi.fn().mockResolvedValue({}),
  deleteMinistry: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      saveMinistry: mocks.saveMinistry,
      deleteMinistry: mocks.deleteMinistry
    }
  }
}));

import MinistriesView from "./MinistriesView";

function makeMinistry(overrides: Partial<MinistryRecord> = {}): MinistryRecord {
  return {
    id: "m1",
    slug: "louvor",
    name: "Louvor",
    summary: "Equipe musical",
    meetingTime: "Quinta 19:30",
    contact: "+55 81 90000-0000",
    color: "#0f766e",
    sortOrder: 0,
    ...overrides
  };
}

function buildSnapshot(ministries: MinistryRecord[] = []): SiteSnapshot {
  return {
    announcements: [],
    schedule: [],
    volunteers: [],
    profile: null,
    ministries,
    recurringMeetings: []
  };
}

function renderView(snapshot: SiteSnapshot = buildSnapshot()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  const onStateChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MinistriesView
        snapshot={snapshot}
        state={{ search: "", sort: "orderAsc", page: 1 }}
        onStateChange={onStateChange}
      />
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

describe("MinistriesView", () => {
  afterEach(() => {
    cleanup();
    mocks.saveMinistry.mockClear();
    mocks.deleteMinistry.mockClear();
  });

  it("renders empty state when there are no ministries", () => {
    renderView();
    expect(screen.getByText("Nenhum ministerio encontrado.")).toBeInTheDocument();
  });

  it("renders ministry rows from the snapshot", () => {
    renderView(
      buildSnapshot([
        makeMinistry({ id: "m1", name: "Louvor", sortOrder: 0 }),
        makeMinistry({ id: "m2", slug: "diaconia", name: "Diaconia", sortOrder: 1 })
      ])
    );

    expect(screen.getByText("Louvor")).toBeInTheDocument();
    expect(screen.getByText("Diaconia")).toBeInTheDocument();
  });

  it("creates a new ministry when the form is submitted", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Juventude" } });
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "juventude" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.saveMinistry).toHaveBeenCalledTimes(1);
    });
    const payload = mocks.saveMinistry.mock.calls[0][0];
    expect(payload).toMatchObject({
      slug: "juventude",
      name: "Juventude",
      color: "#0f766e"
    });
  });

  it("starts editing when 'Editar' is clicked", () => {
    renderView(buildSnapshot([makeMinistry({ name: "Louvor", slug: "louvor" })]));
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const slugField = screen.getByLabelText("Slug") as HTMLInputElement;
    expect(slugField.value).toBe("louvor");
    expect(slugField.readOnly).toBe(true);
  });

  it("deletes a ministry after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderView(buildSnapshot([makeMinistry({ name: "Diaconia" })]));

    fireEvent.click(screen.getByRole("button", { name: /Excluir ministerio Diaconia/i }));

    await waitFor(() => {
      expect(mocks.deleteMinistry).toHaveBeenCalledTimes(1);
    });
    confirmSpy.mockRestore();
  });

  it("does not delete when confirmation is denied", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderView(buildSnapshot([makeMinistry({ name: "Diaconia" })]));

    fireEvent.click(screen.getByRole("button", { name: /Excluir ministerio Diaconia/i }));

    expect(mocks.deleteMinistry).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("disables the up button on the first ministry", () => {
    renderView(
      buildSnapshot([
        makeMinistry({ id: "m1", name: "Louvor", sortOrder: 0 }),
        makeMinistry({ id: "m2", slug: "diaconia", name: "Diaconia", sortOrder: 1 })
      ])
    );

    const upLouvor = screen.getByRole("button", { name: "Mover Louvor para cima" });
    expect(upLouvor).toBeDisabled();

    const downLouvor = screen.getByRole("button", { name: "Mover Louvor para baixo" });
    expect(downLouvor).not.toBeDisabled();
  });

  it("swaps sort order when moving a ministry down", async () => {
    renderView(
      buildSnapshot([
        makeMinistry({ id: "m1", name: "Louvor", sortOrder: 0 }),
        makeMinistry({ id: "m2", slug: "diaconia", name: "Diaconia", sortOrder: 1 })
      ])
    );

    fireEvent.click(screen.getByRole("button", { name: "Mover Louvor para baixo" }));

    await waitFor(() => {
      expect(mocks.saveMinistry).toHaveBeenCalledTimes(2);
    });
    expect(mocks.saveMinistry.mock.calls[0][0].sortOrder).toBe(1);
    expect(mocks.saveMinistry.mock.calls[1][0].sortOrder).toBe(0);
  });
});
