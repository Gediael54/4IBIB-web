import "@testing-library/jest-dom/vitest";
import type { ChurchProfile, RecurringMeetingRecord, SiteSnapshot } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveProfile: vi.fn().mockResolvedValue({}),
  saveRecurringMeeting: vi.fn().mockResolvedValue({}),
  deleteRecurringMeeting: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      saveProfile: mocks.saveProfile,
      saveRecurringMeeting: mocks.saveRecurringMeeting,
      deleteRecurringMeeting: mocks.deleteRecurringMeeting
    }
  }
}));

import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import ProfileView from "./ProfileView";

function makeProfile(overrides: Partial<ChurchProfile> = {}): ChurchProfile {
  return {
    id: "main",
    name: "4 IBI Betel",
    shortName: "4IBIB",
    tagline: "",
    city: "Recife, PE",
    pastorName: "Pastor",
    address: "Rua Jose Victor",
    email: "4ibibetel@gmail.com",
    whatsapp: "+55 81 98122-0651",
    instagramUrl: "",
    youtubeUrl: "",
    mapsUrl: "",
    heroVerse: "",
    mission: "",
    ...overrides
  };
}

function makeRecurring(overrides: Partial<RecurringMeetingRecord> = {}): RecurringMeetingRecord {
  return {
    id: "r1",
    title: "Culto solene",
    weekday: 0,
    startsAt: "17:00",
    endsAt: "19:00",
    description: "",
    sortOrder: 0,
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
    commemorations: [],

    rotationRules: [],
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
        <ConfirmProvider>
          <ProfileView snapshot={snapshot} />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("ProfileView", () => {
  afterEach(() => {
    cleanup();
    mocks.saveProfile.mockClear();
    mocks.saveRecurringMeeting.mockClear();
    mocks.deleteRecurringMeeting.mockClear();
  });

  it("renders the FieldGroup tabs (Identidade, Contato, Conteudo)", () => {
    renderView();
    expect(screen.getByRole("tab", { name: "Identidade" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Contato" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Conteudo" })).toBeInTheDocument();
  });

  it("shows Identidade panel by default", () => {
    renderView();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Sigla")).toBeInTheDocument();
    expect(screen.queryByLabelText("Endereco")).not.toBeInTheDocument();
  });

  it("switches to Contato tab when clicked", () => {
    renderView();
    fireEvent.click(screen.getByRole("tab", { name: "Contato" }));
    expect(screen.getByLabelText("Endereco")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
  });

  it("switches to Conteudo tab when clicked", () => {
    renderView();
    fireEvent.click(screen.getByRole("tab", { name: "Conteudo" }));
    expect(screen.getByLabelText("Versiculo do hero")).toBeInTheDocument();
    expect(screen.getByLabelText("Missao")).toBeInTheDocument();
  });

  it("hydrates the form with the provided profile", () => {
    const profile = makeProfile();
    renderView(buildSnapshot({ profile }));
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("4 IBI Betel");
    expect((screen.getByLabelText("Sigla") as HTMLInputElement).value).toBe("4IBIB");
  });

  it("submits profile form with required fields", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Igreja" } });
    fireEvent.change(screen.getByLabelText("Sigla"), { target: { value: "IGR" } });

    const buttons = screen.getAllByRole("button", { name: /salvar/i });
    const form = buttons[0].closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.saveProfile).toHaveBeenCalledTimes(1);
    });
    expect(mocks.saveProfile.mock.calls[0][0]).toMatchObject({
      id: "main",
      name: "Igreja",
      shortName: "IGR"
    });
    await waitFor(() => {
      expect(screen.getByText("Perfil atualizado.")).toBeInTheDocument();
    });
  });

  it("shows a danger toast when profile save fails", async () => {
    mocks.saveProfile.mockRejectedValueOnce(new Error("Falha ao salvar perfil"));
    renderView();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Igreja" } });
    fireEvent.change(screen.getByLabelText("Sigla"), { target: { value: "IGR" } });

    const buttons = screen.getAllByRole("button", { name: /salvar/i });
    const form = buttons[0].closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Falha ao salvar perfil")).toBeInTheDocument();
    });
  });

  it("renders the recurring meetings empty state when there are none", () => {
    renderView();
    expect(screen.getByText("Sem encontros fixos cadastrados.")).toBeInTheDocument();
  });

  it("renders recurring meeting rows", () => {
    renderView(
      buildSnapshot({
        recurringMeetings: [
          makeRecurring({ id: "r1", title: "Culto solene", weekday: 0 }),
          makeRecurring({
            id: "r2",
            title: "Culto de louvor",
            weekday: 4,
            startsAt: "19:30",
            endsAt: "21:00"
          })
        ]
      })
    );
    expect(screen.getByText("Culto solene")).toBeInTheDocument();
    expect(screen.getByText("Culto de louvor")).toBeInTheDocument();
  });

  it("submits a new recurring meeting", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Culto de louvor" } });
    fireEvent.change(screen.getByLabelText("Dia da semana"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Inicio"), { target: { value: "19:30" } });
    fireEvent.change(screen.getByLabelText("Termino"), { target: { value: "21:00" } });

    const allSaveButtons = screen.getAllByRole("button", { name: /salvar/i });
    const form = allSaveButtons[allSaveButtons.length - 1].closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.saveRecurringMeeting).toHaveBeenCalledTimes(1);
    });
    expect(mocks.saveRecurringMeeting.mock.calls[0][0]).toMatchObject({
      title: "Culto de louvor",
      weekday: 4,
      startsAt: "19:30",
      endsAt: "21:00"
    });
  });

  it("deletes a recurring meeting after confirmation", async () => {
    renderView(
      buildSnapshot({
        recurringMeetings: [makeRecurring({ id: "r1", title: "Culto solene" })]
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /Excluir encontro Culto solene/i }));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-dialog-confirm")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => {
      expect(mocks.deleteRecurringMeeting).toHaveBeenCalledWith("r1");
    });
  });

  it("populates form when editing a recurring meeting", () => {
    renderView(
      buildSnapshot({
        recurringMeetings: [
          makeRecurring({
            id: "r1",
            title: "Estudo biblico",
            weekday: 3,
            startsAt: "20:00",
            endsAt: "21:30"
          })
        ]
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect((screen.getByLabelText("Titulo") as HTMLInputElement).value).toBe("Estudo biblico");
    expect((screen.getByLabelText("Inicio") as HTMLInputElement).value).toBe("20:00");
    expect((screen.getByLabelText("Termino") as HTMLInputElement).value).toBe("21:30");
  });

  it("renders a drag handle for each recurring meeting row", () => {
    renderView(
      buildSnapshot({
        recurringMeetings: [
          makeRecurring({ id: "r1", title: "Culto solene", weekday: 0 }),
          makeRecurring({
            id: "r2",
            title: "Culto de louvor",
            weekday: 4,
            startsAt: "19:30",
            endsAt: "21:00"
          })
        ]
      })
    );

    expect(screen.getByRole("button", { name: "Arrastar Culto solene" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arrastar Culto de louvor" })).toBeInTheDocument();
  });
});
