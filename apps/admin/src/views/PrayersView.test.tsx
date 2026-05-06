import "@testing-library/jest-dom/vitest";
import type { AdminUser, PrayerRequest } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAdmins: vi.fn<() => Promise<AdminUser[]>>().mockResolvedValue([]),
  updatePrayerRequestStatus: vi.fn().mockResolvedValue(undefined),
  updatePrayerRequest: vi.fn().mockResolvedValue(undefined),
  archivePrayerRequest: vi.fn().mockResolvedValue(undefined),
  restorePrayerRequest: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      listAdmins: mocks.listAdmins,
      updatePrayerRequestStatus: mocks.updatePrayerRequestStatus,
      updatePrayerRequest: mocks.updatePrayerRequest,
      archivePrayerRequest: mocks.archivePrayerRequest,
      restorePrayerRequest: mocks.restorePrayerRequest
    }
  }
}));

import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import PrayersView from "./PrayersView";

function makePrayer(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: "p1",
    name: "Joao",
    contact: "+55 81 90000-0000",
    message: "Por favor orem por mim",
    createdAt: "2026-04-01T10:00:00.000Z",
    status: "novo",
    pastoralNotes: "",
    assignedTo: null,
    seenAt: null,
    ...overrides
  };
}

function renderView(prayers: PrayerRequest[] = [], statusFilter: PrayerRequest["status"] | "all" = "all") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
  const onStateChange = vi.fn();
  const onStatusFilterChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <PrayersView
            prayers={prayers}
            state={{ search: "", sort: "createdDesc", page: 1 }}
            onStateChange={onStateChange}
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
          />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { ...utils, onStateChange, onStatusFilterChange };
}

describe("PrayersView", () => {
  afterEach(() => {
    cleanup();
    mocks.listAdmins.mockReset().mockResolvedValue([]);
    mocks.updatePrayerRequestStatus.mockReset().mockResolvedValue(undefined);
    mocks.updatePrayerRequest.mockReset().mockResolvedValue(undefined);
    mocks.archivePrayerRequest.mockReset().mockResolvedValue(undefined);
    mocks.restorePrayerRequest.mockReset().mockResolvedValue(undefined);
  });

  it("renders empty state when there are no prayers", () => {
    renderView();
    expect(screen.getByText("Nenhum pedido encontrado.")).toBeInTheDocument();
  });

  it("lists prayers in their kanban column when data is available", () => {
    renderView([makePrayer({ id: "p1", name: "Pedido Joao" })]);
    expect(screen.getByText("Pedido Joao")).toBeInTheDocument();
    expect(screen.getByLabelText("Novos")).toBeInTheDocument();
    expect(screen.getByLabelText("Em oração")).toBeInTheDocument();
    expect(screen.getByLabelText("Concluídos")).toBeInTheDocument();
  });

  it("marks a prayer as visto when 'Marcar como visto' clicked", async () => {
    renderView([makePrayer({ id: "p1", name: "Joao Teste" })]);

    fireEvent.click(screen.getByRole("button", { name: "Marcar como visto" }));

    await waitFor(() => {
      expect(mocks.updatePrayerRequest).toHaveBeenCalledTimes(1);
    });
    const [id, patch] = mocks.updatePrayerRequest.mock.calls[0];
    expect(id).toBe("p1");
    expect(patch).toEqual(expect.objectContaining({ seenAt: expect.any(String) }));
  });

  it("archives a prayer after confirmation and offers undo", async () => {
    renderView([makePrayer({ id: "p1", name: "Joao Arquivar" })]);

    fireEvent.click(screen.getByRole("button", { name: /Arquivar pedido de Joao Arquivar/i }));

    expect(screen.getByText("Arquivar pedido?")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() => {
      expect(mocks.archivePrayerRequest).toHaveBeenCalledWith("p1");
    });

    const undoButton = await screen.findByRole("button", { name: "Desfazer" });
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(mocks.restorePrayerRequest).toHaveBeenCalledWith("p1");
    });
  });

  it("does not archive when the confirm dialog is cancelled", async () => {
    renderView([makePrayer({ id: "p1", name: "Joao Cancelar" })]);

    fireEvent.click(screen.getByRole("button", { name: /Arquivar pedido de Joao Cancelar/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    });

    expect(mocks.archivePrayerRequest).not.toHaveBeenCalled();
  });

  it("changes status when a transition action is clicked", async () => {
    renderView([makePrayer({ id: "p1", name: "Joao Status" })]);

    fireEvent.click(screen.getByRole("button", { name: /Mover pedido de Joao Status para Concluído/i }));

    await waitFor(() => {
      expect(mocks.updatePrayerRequestStatus).toHaveBeenCalledWith("p1", "concluido");
    });
  });

  it("updates pastoral notes through the detail sheet", async () => {
    renderView([makePrayer({ id: "p1", name: "Joao Notas" })]);

    fireEvent.click(screen.getByRole("button", { name: "Abrir pedido de Joao Notas" }));

    const notesField = await screen.findByLabelText("Notas pastorais");
    fireEvent.change(notesField, { target: { value: "Anotei observacao." } });

    fireEvent.click(screen.getByRole("button", { name: /Salvar notas/i }));

    await waitFor(() => {
      expect(mocks.updatePrayerRequest).toHaveBeenCalledTimes(1);
    });
    const [id, patch] = mocks.updatePrayerRequest.mock.calls[0];
    expect(id).toBe("p1");
    expect(patch).toEqual(expect.objectContaining({ pastoralNotes: "Anotei observacao." }));
  });
});
