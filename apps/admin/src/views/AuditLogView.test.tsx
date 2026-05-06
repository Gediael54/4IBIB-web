import "@testing-library/jest-dom/vitest";
import type { AuditLogEntry } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("renders timeline entries when data is available", async () => {
    mocks.listAuditLog.mockResolvedValue([
      makeAuditEntry({
        id: "a1",
        tableName: "announcements",
        rowId: "row-aviso",
        newRow: { title: "Reuniao de oracao" }
      }),
      makeAuditEntry({
        id: "a2",
        tableName: "schedule_items",
        rowId: "row-schedule",
        newRow: { title: "Culto Solene" }
      })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Aviso foi criado/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Item de programacao foi criado/)).toBeInTheDocument();
    expect(screen.getByText('"Reuniao de oracao"')).toBeInTheDocument();
    expect(screen.getByText("row-aviso")).toBeInTheDocument();
  });

  it("filters by table when chip is clicked", async () => {
    renderView();

    await waitFor(() => {
      expect(mocks.listAuditLog).toHaveBeenCalled();
    });

    mocks.listAuditLog.mockClear();
    const tableGroup = screen.getByRole("radiogroup", { name: "Tabela" });
    fireEvent.click(within(tableGroup).getByRole("radio", { name: "Avisos" }));

    await waitFor(() => {
      expect(mocks.listAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ tableName: "announcements" })
      );
    });
  });

  it("filters by action when chip is clicked", async () => {
    renderView();

    await waitFor(() => {
      expect(mocks.listAuditLog).toHaveBeenCalled();
    });

    mocks.listAuditLog.mockClear();
    const actionGroup = screen.getByRole("radiogroup", { name: "Acao" });
    fireEvent.click(within(actionGroup).getByRole("radio", { name: "Exclusao" }));

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
      expect(screen.getByText("row-0")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Proxima" }));
    expect(onStateChange).toHaveBeenCalledWith({ page: 2 });
  });

  it("reverts an audit entry when 'Reverter' clicked", async () => {
    mocks.listAuditLog.mockResolvedValue([makeAuditEntry({ id: "a1" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("row-1")).toBeInTheDocument();
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
