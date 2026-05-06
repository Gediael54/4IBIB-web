import "@testing-library/jest-dom/vitest";
import type { Announcement, SiteSnapshot } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveAnnouncement: vi.fn().mockResolvedValue({}),
  archiveAnnouncement: vi.fn().mockResolvedValue(undefined),
  restoreAnnouncement: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      saveAnnouncement: mocks.saveAnnouncement,
      archiveAnnouncement: mocks.archiveAnnouncement,
      restoreAnnouncement: mocks.restoreAnnouncement
    }
  }
}));

import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import AnnouncementsView from "./AnnouncementsView";

function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: "a1",
    title: "Aviso teste",
    summary: "Resumo do aviso",
    category: "geral",
    publishedAt: "2026-05-01T10:00:00.000Z",
    pinned: false,
    ctaLabel: "",
    ctaUrl: "",
    status: "published",
    expiresAt: null,
    imageUrl: "",
    ...overrides
  };
}

function buildSnapshot(announcements: Announcement[] = []): SiteSnapshot {
  return {
    announcements,
    schedule: [],
    volunteers: [],
    profile: null,
    ministries: [],
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
          <AnnouncementsView
            snapshot={snapshot}
            state={{ search: "", sort: "publishedDesc", page: 1 }}
            onStateChange={onStateChange}
          />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

describe("AnnouncementsView", () => {
  afterEach(() => {
    cleanup();
    mocks.saveAnnouncement.mockReset().mockResolvedValue({});
    mocks.archiveAnnouncement.mockReset().mockResolvedValue(undefined);
    mocks.restoreAnnouncement.mockReset().mockResolvedValue(undefined);
  });

  it("renders empty state when there are no announcements", () => {
    renderView();
    expect(screen.getByText("Sem avisos por aqui.")).toBeInTheDocument();
  });

  it("renders announcement rows from the snapshot", () => {
    renderView(buildSnapshot([makeAnnouncement({ id: "a1", title: "Culto especial" })]));
    expect(screen.getByText("Culto especial")).toBeInTheDocument();
  });

  it("submits a new announcement", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Novo aviso CRUD" } });
    fireEvent.change(screen.getByLabelText("Resumo"), { target: { value: "Resumo curto" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.saveAnnouncement).toHaveBeenCalledTimes(1);
    });
    const payload = mocks.saveAnnouncement.mock.calls[0][0];
    expect(payload).toMatchObject({
      title: "Novo aviso CRUD",
      summary: "Resumo curto",
      category: "geral"
    });
  });

  it("shows error badge on conteudo tab when required title is missing", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Resumo"), { target: { value: "" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(screen.getByText("Titulo e obrigatorio.")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
    expect(screen.getByTestId("tab-error-badge-conteudo")).toBeInTheDocument();
    expect(mocks.saveAnnouncement).not.toHaveBeenCalled();
  });

  it("renders eyebrow tag (categoria) in the preview panel", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Evento" } });

    const select = screen.getByLabelText("Categoria") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "evento" } });

    await waitFor(() => {
      const previewBadges = document.querySelectorAll(".announcement-preview-badge");
      expect(previewBadges.length).toBeGreaterThan(0);
      const badge = previewBadges[0];
      expect(badge.textContent).toMatch(/Evento/i);
    });
  });

  it("opens the confirm dialog and archives after confirmation", async () => {
    renderView(buildSnapshot([makeAnnouncement({ id: "a1", title: "Para arquivar" })]));

    fireEvent.click(screen.getByRole("button", { name: /Excluir aviso Para arquivar/i }));

    expect(screen.getByText("Excluir aviso?")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() => {
      expect(mocks.archiveAnnouncement).toHaveBeenCalledWith("a1");
    });
  });

  it("provides a deep link to the public site (#avisos)", () => {
    renderView(buildSnapshot([makeAnnouncement({ id: "a1", title: "Linkado" })]));
    const link = screen.getByRole("link", { name: /Ver aviso Linkado no site/i }) as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/#avisos");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("starts editing when 'Editar' is clicked and pre-fills form", () => {
    renderView(buildSnapshot([makeAnnouncement({ id: "a1", title: "Edit me", summary: "Summary X" })]));
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const titleField = screen.getByLabelText("Titulo") as HTMLInputElement;
    expect(titleField.value).toBe("Edit me");
  });

  it("shows toast on save failure", async () => {
    mocks.saveAnnouncement.mockRejectedValue(new Error("Erro do servidor"));
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Falha" } });
    fireEvent.change(screen.getByLabelText("Resumo"), { target: { value: "Resumo" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Erro do servidor")).toBeInTheDocument();
    });
  });
});
