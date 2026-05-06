import "@testing-library/jest-dom/vitest";
import type { ScheduleItem, SiteSnapshot, Volunteer } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveScheduleItem: vi.fn().mockResolvedValue({}),
  archiveScheduleItem: vi.fn().mockResolvedValue(undefined),
  restoreScheduleItem: vi.fn().mockResolvedValue(undefined),
  listMembers: vi.fn().mockResolvedValue([]),
  updateScheduleItemMembers: vi.fn().mockResolvedValue(undefined),
  duplicateScheduleItem: vi.fn().mockResolvedValue({}),
  bulkUpdateScheduleItems: vi.fn().mockResolvedValue([])
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      saveScheduleItem: mocks.saveScheduleItem,
      archiveScheduleItem: mocks.archiveScheduleItem,
      restoreScheduleItem: mocks.restoreScheduleItem,
      listMembers: mocks.listMembers,
      updateScheduleItemMembers: mocks.updateScheduleItemMembers,
      duplicateScheduleItem: mocks.duplicateScheduleItem,
      bulkUpdateScheduleItems: mocks.bulkUpdateScheduleItems
    }
  }
}));

import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import ScheduleView from "./ScheduleView";

function buildSnapshot(volunteers: Volunteer[] = [], schedule: ScheduleItem[] = []): SiteSnapshot {
  return {
    announcements: [],
    schedule,
    volunteers,
    profile: null,
    ministries: [],
    recurringMeetings: []
  };
}

function makeScheduleItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "s1",
    title: "Culto solene",
    ministry: "louvor",
    startsAt: "2030-01-01T19:30:00.000Z",
    endsAt: "2030-01-01T21:00:00.000Z",
    location: "Templo",
    summary: "",
    preacher: "Pastor X",
    director: "Dirigente",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    seriesId: null,
    youtubeUrl: "",
    preacherMemberId: null,
    directorMemberId: null,
    soundMemberId: null,
    ...overrides
  };
}

function renderView(snapshot: SiteSnapshot) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <ScheduleView
            snapshot={snapshot}
            state={{ search: "", sort: "startsAsc", page: 1 }}
            onStateChange={vi.fn()}
          />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("ScheduleView bulk operations", () => {
  afterEach(() => {
    cleanup();
    mocks.bulkUpdateScheduleItems.mockReset().mockResolvedValue([]);
    mocks.archiveScheduleItem.mockReset().mockResolvedValue(undefined);
    mocks.restoreScheduleItem.mockReset().mockResolvedValue(undefined);
  });

  it("does not show bulk action bar when nothing is selected", () => {
    renderView(buildSnapshot([], [makeScheduleItem({ id: "s1", title: "Item 1" })]));
    expect(screen.queryByRole("region", { name: "Acoes em massa" })).not.toBeInTheDocument();
  });

  it("shows the bulk action bar when at least one item is selected", () => {
    renderView(buildSnapshot([], [makeScheduleItem({ id: "s1", title: "Item Selecionar" })]));

    const checkbox = screen.getByLabelText("Selecionar Item Selecionar") as HTMLInputElement;
    fireEvent.click(checkbox);

    expect(screen.getByRole("region", { name: "Acoes em massa" })).toBeInTheDocument();
    expect(screen.getByText("1 selecionados")).toBeInTheDocument();
  });

  it("opens the bulk panel for preacher and applies the patch with objectContaining", async () => {
    renderView(
      buildSnapshot(
        [],
        [makeScheduleItem({ id: "s1", title: "Item A" }), makeScheduleItem({ id: "s2", title: "Item B" })]
      )
    );

    fireEvent.click(screen.getByLabelText("Selecionar Item A"));
    fireEvent.click(screen.getByLabelText("Selecionar Item B"));

    fireEvent.click(screen.getByRole("button", { name: "Mudar pregador" }));

    const preacherInput = screen.getByLabelText(/Novo pregador para/i) as HTMLInputElement;
    fireEvent.change(preacherInput, { target: { value: "Novo Pregador" } });

    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => {
      expect(mocks.bulkUpdateScheduleItems).toHaveBeenCalledTimes(1);
    });
    const [ids, patch] = mocks.bulkUpdateScheduleItems.mock.calls[0];
    expect(ids).toEqual(expect.arrayContaining(["s1", "s2"]));
    expect(patch).toEqual(expect.objectContaining({ preacher: "Novo Pregador" }));
  });

  it("opens the bulk panel for status and applies the patch", async () => {
    renderView(buildSnapshot([], [makeScheduleItem({ id: "s1", title: "Item Status" })]));

    fireEvent.click(screen.getByLabelText("Selecionar Item Status"));

    fireEvent.click(screen.getByRole("button", { name: "Mudar status" }));
    const statusSelect = screen.getByLabelText(/Novo status para/i) as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: "suspended" } });

    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => {
      expect(mocks.bulkUpdateScheduleItems).toHaveBeenCalledTimes(1);
    });
    const [, patch] = mocks.bulkUpdateScheduleItems.mock.calls[0];
    expect(patch).toEqual(expect.objectContaining({ status: "suspended" }));
  });

  it("applies featured = true via bulk panel", async () => {
    renderView(buildSnapshot([], [makeScheduleItem({ id: "s1", title: "Item Destaque" })]));

    fireEvent.click(screen.getByLabelText("Selecionar Item Destaque"));

    fireEvent.click(screen.getByRole("button", { name: "Marcar destacado" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => {
      expect(mocks.bulkUpdateScheduleItems).toHaveBeenCalledTimes(1);
    });
    const [, patch] = mocks.bulkUpdateScheduleItems.mock.calls[0];
    expect(patch).toEqual(expect.objectContaining({ featured: true }));
  });

  it("clears selection and hides bulk bar via 'Limpar selecao'", () => {
    renderView(buildSnapshot([], [makeScheduleItem({ id: "s1", title: "Limpa" })]));

    fireEvent.click(screen.getByLabelText("Selecionar Limpa"));
    expect(screen.getByRole("region", { name: "Acoes em massa" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar selecao" }));

    expect(screen.queryByRole("region", { name: "Acoes em massa" })).not.toBeInTheDocument();
  });

  it("bulk deletes selected items after confirmation with required text", async () => {
    renderView(
      buildSnapshot(
        [],
        [
          makeScheduleItem({ id: "s1", title: "Excluir A" }),
          makeScheduleItem({ id: "s2", title: "Excluir B" })
        ]
      )
    );

    fireEvent.click(screen.getByLabelText("Selecionar Excluir A"));
    fireEvent.click(screen.getByLabelText("Selecionar Excluir B"));

    fireEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));

    expect(screen.getByText(/Excluir 2 itens\?/i)).toBeInTheDocument();

    const confirmButton = screen.getByTestId("confirm-dialog-confirm");
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Digite EXCLUIR para confirmar"), {
      target: { value: "EXCLUIR" }
    });

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mocks.archiveScheduleItem).toHaveBeenCalledTimes(2);
    });
  });

  it("uses the sticky-action-bar class for visual placement", () => {
    renderView(buildSnapshot([], [makeScheduleItem({ id: "s1", title: "Sticky" })]));

    fireEvent.click(screen.getByLabelText("Selecionar Sticky"));

    const region = screen.getByRole("region", { name: "Acoes em massa" });
    expect(region.className).toContain("sticky-action-bar");
  });
});
