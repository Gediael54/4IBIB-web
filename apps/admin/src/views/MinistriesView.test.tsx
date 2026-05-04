import "@testing-library/jest-dom/vitest";
import type { MinistryRecord, SiteSnapshot } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveMinistry: vi.fn().mockResolvedValue({}),
  archiveMinistry: vi.fn().mockResolvedValue(undefined),
  restoreMinistry: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      saveMinistry: mocks.saveMinistry,
      archiveMinistry: mocks.archiveMinistry,
      restoreMinistry: mocks.restoreMinistry
    }
  }
}));

import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
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
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
  const onStateChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <MinistriesView
            snapshot={snapshot}
            state={{ search: "", sort: "orderAsc", page: 1 }}
            onStateChange={onStateChange}
          />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

describe("MinistriesView", () => {
  afterEach(() => {
    cleanup();
    mocks.saveMinistry.mockReset().mockResolvedValue({});
    mocks.archiveMinistry.mockReset().mockResolvedValue(undefined);
    mocks.restoreMinistry.mockReset().mockResolvedValue(undefined);
  });

  it("renders empty state when there are no ministries", () => {
    renderView();
    expect(screen.getByText("Sem ministerios ainda.")).toBeInTheDocument();
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
    await waitFor(() => {
      expect(screen.getByText("Ministerio criado.")).toBeInTheDocument();
    });
  });

  it("shows a danger toast when saving fails", async () => {
    mocks.saveMinistry.mockRejectedValue(new Error("Slug duplicado"));
    renderView();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Repetido" } });
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "repetido" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Slug duplicado")).toBeInTheDocument();
    });
  });

  it("starts editing when 'Editar' is clicked", () => {
    renderView(buildSnapshot([makeMinistry({ name: "Louvor", slug: "louvor" })]));
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const slugField = screen.getByLabelText("Slug") as HTMLInputElement;
    expect(slugField.value).toBe("louvor");
    expect(slugField.readOnly).toBe(true);
  });

  it("opens the confirm dialog and archives a ministry after confirmation", async () => {
    renderView(buildSnapshot([makeMinistry({ name: "Diaconia" })]));

    fireEvent.click(screen.getByRole("button", { name: /Excluir ministerio Diaconia/i }));

    expect(screen.getByText('Excluir o ministerio "Diaconia"?')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() => {
      expect(mocks.archiveMinistry).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Ministerio "Diaconia" arquivado.')).toBeInTheDocument();
    });
  });

  it("does not archive when the confirm dialog is cancelled", async () => {
    renderView(buildSnapshot([makeMinistry({ name: "Diaconia" })]));

    fireEvent.click(screen.getByRole("button", { name: /Excluir ministerio Diaconia/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    });

    expect(mocks.archiveMinistry).not.toHaveBeenCalled();
  });

  it("triggers restore when the undo button is clicked after archive", async () => {
    renderView(buildSnapshot([makeMinistry({ id: "m9", name: "Diaconia" })]));

    fireEvent.click(screen.getByRole("button", { name: /Excluir ministerio Diaconia/i }));
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() => {
      expect(mocks.archiveMinistry).toHaveBeenCalledWith("m9");
    });

    const undoButton = await screen.findByRole("button", { name: "Desfazer" });
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(mocks.restoreMinistry).toHaveBeenCalledWith("m9");
    });
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

  it("renders a drag handle for each ministry row", () => {
    renderView(
      buildSnapshot([
        makeMinistry({ id: "m1", name: "Louvor", sortOrder: 0 }),
        makeMinistry({ id: "m2", slug: "diaconia", name: "Diaconia", sortOrder: 1 })
      ])
    );

    expect(screen.getByRole("button", { name: "Arrastar Louvor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arrastar Diaconia" })).toBeInTheDocument();
  });
});
