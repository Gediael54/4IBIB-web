import "@testing-library/jest-dom/vitest";
import type { AdminUser } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAdmins: vi.fn<() => Promise<AdminUser[]>>().mockResolvedValue([]),
  inviteAdmin: vi.fn().mockResolvedValue({}),
  updateAdminRole: vi.fn().mockResolvedValue({}),
  removeAdmin: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      listAdmins: mocks.listAdmins,
      inviteAdmin: mocks.inviteAdmin,
      updateAdminRole: mocks.updateAdminRole,
      removeAdmin: mocks.removeAdmin
    }
  }
}));

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
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  const onStateChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <TeamView state={{ search: "", sort: "roleAsc", page: 1 }} onStateChange={onStateChange} />
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

describe("TeamView", () => {
  afterEach(() => {
    cleanup();
    mocks.listAdmins.mockReset().mockResolvedValue([]);
    mocks.inviteAdmin.mockReset().mockResolvedValue({});
    mocks.updateAdminRole.mockReset().mockResolvedValue({});
    mocks.removeAdmin.mockReset().mockResolvedValue(undefined);
  });

  it("renders empty state when no admins are loaded", async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText("Nenhum admin cadastrado.")).toBeInTheDocument();
    });
  });

  it("renders admin rows when data is available", async () => {
    mocks.listAdmins.mockResolvedValueOnce([
      makeAdmin({ userId: "u1", email: "owner@igreja.org", role: "owner" }),
      makeAdmin({ userId: "u2", email: "editor@igreja.org", role: "editor" })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("owner@igreja.org")).toBeInTheDocument();
    });
    expect(screen.getByText("editor@igreja.org")).toBeInTheDocument();
  });

  it("invites a new admin when the form is submitted", async () => {
    renderView();

    const inviteButton = screen.getByRole("button", { name: /Convidar/i });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "novo@igreja.org" }
    });

    const form = inviteButton.closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.inviteAdmin).toHaveBeenCalledTimes(1);
    });
    expect(mocks.inviteAdmin.mock.calls[0][0]).toMatchObject({
      email: "novo@igreja.org",
      role: "editor"
    });
  });

  it("renders inline error when invite fails", async () => {
    mocks.inviteAdmin.mockRejectedValueOnce(new Error("Email ja cadastrado"));
    renderView();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "duplicado@igreja.org" }
    });
    const form = screen.getByRole("button", { name: /Convidar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Email ja cadastrado")).toBeInTheDocument();
    });
  });

  it("removes admin after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.listAdmins.mockResolvedValue([makeAdmin({ userId: "u1", email: "remover@igreja.org" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("remover@igreja.org")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Remover remover@igreja.org/i }));

    await waitFor(() => {
      expect(mocks.removeAdmin).toHaveBeenCalledWith("u1");
    });
    confirmSpy.mockRestore();
  });

  it("does not remove admin when confirmation is denied", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    mocks.listAdmins.mockResolvedValue([makeAdmin({ userId: "u1", email: "manter@igreja.org" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("manter@igreja.org")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Remover manter@igreja.org/i }));

    expect(mocks.removeAdmin).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("renders error UI when admins query fails", async () => {
    mocks.listAdmins.mockRejectedValueOnce(new Error("Falha ao carregar"));
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Falha ao carregar")).toBeInTheDocument();
    });
  });
});
