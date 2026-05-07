import "@testing-library/jest-dom/vitest";
import type { AdminUser } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAdmins: vi.fn<() => Promise<AdminUser[]>>().mockResolvedValue([]),
  updateAdminRole: vi.fn().mockResolvedValue({}),
  removeAdmin: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      listAdmins: mocks.listAdmins,
      updateAdminRole: mocks.updateAdminRole,
      removeAdmin: mocks.removeAdmin
    }
  }
}));

import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import TeamView from "./TeamView";

function makeAdmin(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    userId: "u1",
    email: "user@igreja.org",
    displayName: "User",
    role: "editor",
    createdAt: "2026-01-01T00:00:00.000Z",
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
        <ConfirmProvider>
          <TeamView state={{ search: "", sort: "roleAsc", page: 1 }} onStateChange={onStateChange} />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

describe("TeamView", () => {
  afterEach(() => {
    cleanup();
    mocks.listAdmins.mockReset().mockResolvedValue([]);
    mocks.updateAdminRole.mockReset().mockResolvedValue({});
    mocks.removeAdmin.mockReset().mockResolvedValue(undefined);
  });

  it("renders empty state when no admins are loaded", async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText("Sem admins ainda.")).toBeInTheDocument();
    });
  });

  it("renders admin cards when data is available", async () => {
    mocks.listAdmins.mockResolvedValueOnce([
      makeAdmin({ userId: "u1", email: "owner@igreja.org", displayName: "Owner Pessoa", role: "owner" }),
      makeAdmin({ userId: "u2", email: "editor@igreja.org", displayName: "Editor Pessoa", role: "editor" })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Owner Pessoa")).toBeInTheDocument();
    });
    expect(screen.getByText("Editor Pessoa")).toBeInTheDocument();
    expect(screen.getByText("owner@igreja.org")).toBeInTheDocument();
    expect(screen.getByText("editor@igreja.org")).toBeInTheDocument();
  });

  it("filters admins by role through chips", async () => {
    mocks.listAdmins.mockResolvedValue([
      makeAdmin({ userId: "u1", email: "owner@igreja.org", displayName: "Owner Pessoa", role: "owner" }),
      makeAdmin({ userId: "u2", email: "editor@igreja.org", displayName: "Editor Pessoa", role: "editor" })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Owner Pessoa")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("radio", { name: /Owners/i }));
    expect(screen.queryByText("Editor Pessoa")).not.toBeInTheDocument();
    expect(screen.getByText("Owner Pessoa")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Editors/i }));
    expect(screen.queryByText("Owner Pessoa")).not.toBeInTheDocument();
    expect(screen.getByText("Editor Pessoa")).toBeInTheDocument();
  });

  it("updates role when select changes", async () => {
    mocks.listAdmins.mockResolvedValue([
      makeAdmin({ userId: "u1", email: "editor@igreja.org", displayName: "Editor Pessoa", role: "editor" })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Editor Pessoa")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Funcao de Editor Pessoa") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "owner" } });

    await waitFor(() => {
      expect(mocks.updateAdminRole).toHaveBeenCalledWith("u1", "owner");
    });
  });

  it("removes admin after confirmation", async () => {
    mocks.listAdmins.mockResolvedValue([
      makeAdmin({ userId: "u1", email: "remover@igreja.org", displayName: "Remover Pessoa" })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Remover Pessoa")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Remover Remover Pessoa/i }));

    const requireInput = await screen.findByLabelText("Digite EXCLUIR para confirmar");
    fireEvent.change(requireInput, { target: { value: "EXCLUIR" } });
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => {
      expect(mocks.removeAdmin).toHaveBeenCalledWith("u1");
    });
    await waitFor(() => {
      expect(screen.getByText("Acesso de Remover Pessoa removido.")).toBeInTheDocument();
    });
  });

  it("does not remove admin when confirmation is denied", async () => {
    mocks.listAdmins.mockResolvedValue([
      makeAdmin({ userId: "u1", email: "manter@igreja.org", displayName: "Manter Pessoa" })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Manter Pessoa")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Remover Manter Pessoa/i }));

    await screen.findByTestId("confirm-dialog-confirm");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mocks.removeAdmin).not.toHaveBeenCalled();
  });

  it("renders error UI when admins query fails", async () => {
    mocks.listAdmins.mockRejectedValueOnce(new Error("Falha ao carregar"));
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Falha ao carregar")).toBeInTheDocument();
    });
  });
});
