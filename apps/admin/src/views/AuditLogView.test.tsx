import "@testing-library/jest-dom/vitest";
import type { AuditLogEntry } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAuditLog: vi.fn<() => Promise<AuditLogEntry[]>>().mockResolvedValue([]),
  revertAuditEntry: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      listAuditLog: mocks.listAuditLog,
      revertAuditEntry: mocks.revertAuditEntry
    }
  }
}));

import { ToastProvider } from "../components/Toast";
import AuditLogView from "./AuditLogView";

function makeAuditEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: "a1",
    tableName: "announcements",
    rowId: "row-1",
    action: "INSERT",
    changedAt: "2026-04-01T10:00:00.000Z",
    changedBy: "user@test.com",
    oldRow: null,
    newRow: { title: "Aviso teste" },
    ...overrides
  };
}

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
  const onStateChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuditLogView state={{ search: "", sort: "changedDesc", page: 1 }} onStateChange={onStateChange} />
      </ToastProvider>
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

describe("AuditLogView", () => {
  afterEach(() => {
    cleanup();
    mocks.listAuditLog.mockReset().mockResolvedValue([]);
    mocks.revertAuditEntry.mockReset().mockResolvedValue(undefined);
  });

  it("renders empty state when there are no audit entries", async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText("Nada por aqui ainda.")).toBeInTheDocument();
    });
  });

  it("renders audit rows when data is available", async () => {
    mocks.listAuditLog.mockResolvedValue([
      makeAuditEntry({ id: "a1", tableName: "announcements", rowId: "row-aviso" }),
      makeAuditEntry({ id: "a2", tableName: "schedule_items", rowId: "row-schedule" })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/announcements/)).toBeInTheDocument();
    });
    expect(screen.getByText(/schedule_items/)).toBeInTheDocument();
    expect(screen.getByText("Row row-aviso")).toBeInTheDocument();
  });

  it("filters by table when select is changed", async () => {
    renderView();

    await waitFor(() => {
      expect(mocks.listAuditLog).toHaveBeenCalled();
    });

    mocks.listAuditLog.mockClear();
    const tableSelect = screen.getAllByLabelText("Tabela")[0] as HTMLSelectElement;
    fireEvent.change(tableSelect, { target: { value: "announcements" } });

    await waitFor(() => {
      expect(mocks.listAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ tableName: "announcements" })
      );
    });
  });

  it("filters by action when select is changed", async () => {
    renderView();

    await waitFor(() => {
      expect(mocks.listAuditLog).toHaveBeenCalled();
    });

    mocks.listAuditLog.mockClear();
    const actionSelect = screen.getAllByLabelText("Acao")[0] as HTMLSelectElement;
    fireEvent.change(actionSelect, { target: { value: "DELETE" } });

    await waitFor(() => {
      expect(mocks.listAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "DELETE" }));
    });
  });

  it("paginates entries when there are more than one page", async () => {
    const items: AuditLogEntry[] = [];
    for (let i = 0; i < 25; i += 1) {
      items.push(makeAuditEntry({ id: `a${i}`, rowId: `row-${i}` }));
    }
    mocks.listAuditLog.mockResolvedValue(items);
    const { onStateChange } = renderView();

    await waitFor(() => {
      expect(screen.getByText("Row row-0")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Proxima" }));
    expect(onStateChange).toHaveBeenCalledWith({ page: 2 });
  });

  it("reverts an audit entry when 'Reverter' clicked", async () => {
    mocks.listAuditLog.mockResolvedValue([makeAuditEntry({ id: "a1" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Row row-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reverter" }));

    await waitFor(() => {
      expect(mocks.revertAuditEntry).toHaveBeenCalledWith("a1");
    });
  });

  it("opens the filters modal", async () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Abrir filtros" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
