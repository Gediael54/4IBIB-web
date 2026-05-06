import "@testing-library/jest-dom/vitest";
import type { Member, ScheduleItem, SiteSnapshot, Volunteer } from "@4ibib/core";
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
    recurringMeetings: [],
    commemorations: []
  };
}

function makeScheduleItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "s1",
    title: "Culto",
    ministry: "louvor",
    startsAt: "2030-01-01T19:30:00.000Z",
    endsAt: "2030-01-01T21:00:00.000Z",
    location: "Templo",
    summary: "",
    preacher: "Pr. X",
    director: "",
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

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "m1",
    fullName: "Joao Silva",
    preferredName: "",
    birthDate: null,
    maritalStatus: null,
    gender: null,
    photoUrl: "",
    email: "",
    phone: "",
    whatsapp: "",
    cpf: null,
    rg: "",
    rgIssuer: "",
    profession: "",
    address: {
      zip: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: ""
    },
    householdId: null,
    churchRole: "membro_comum",
    membershipStatus: "ativo",
    joinedAt: null,
    baptismDate: null,
    baptismLocation: "",
    transferredFrom: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    prayerTopics: [],
    spiritualGifts: [],
    allergies: "",
    medicalNotes: "",
    consentMedicalDataAt: null,
    isVolunteer: true,
    volunteerMinistries: [],
    volunteerUnavailableDates: [],
    volunteerNotes: "",
    notes: "",
    consentGivenAt: null,
    consentVersion: "1.0",
    publicDirectory: false,
    publicBio: "",
    dataRetentionUntil: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function makeVolunteer(overrides: Partial<Volunteer> = {}): Volunteer {
  return {
    id: "v",
    name: "Voluntario",
    role: "geral",
    sortOrder: 0,
    contact: "",
    photoUrl: "",
    ministries: [],
    unavailableDates: [],
    notes: "",
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

describe("ScheduleView form", () => {
  afterEach(() => {
    cleanup();
    mocks.saveScheduleItem.mockReset().mockResolvedValue({});
    mocks.archiveScheduleItem.mockClear();
    mocks.restoreScheduleItem.mockClear();
    mocks.listMembers.mockReset().mockResolvedValue([]);
    mocks.updateScheduleItemMembers.mockReset().mockResolvedValue(undefined);
  });

  it("renders inline errors when required fields are empty", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Ministerio"), { target: { value: "" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Titulo e obrigatorio.")).toBeInTheDocument();
    });
    expect(screen.getByText("Ministerio e obrigatorio.")).toBeInTheDocument();
    expect(mocks.saveScheduleItem).not.toHaveBeenCalled();
  });

  it("submits the form when all required fields are valid", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Culto solene" } });
    fireEvent.change(screen.getByLabelText("Ministerio"), { target: { value: "Louvor" } });
    fireEvent.change(screen.getByLabelText("Equipe de som"), {
      target: { value: "Miguel, Brainer" }
    });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.saveScheduleItem).toHaveBeenCalledTimes(1);
    });

    const payload = mocks.saveScheduleItem.mock.calls[0][0];
    expect(payload.title).toBe("Culto solene");
    expect(payload.ministry).toBe("Louvor");
    expect(payload.status).toBe("scheduled");
    expect(typeof payload.startsAt).toBe("string");
    expect(payload.soundTeam).toBe("Miguel, Brainer");

    await waitFor(() => {
      expect(screen.getByText("Programacao criada.")).toBeInTheDocument();
    });
  });

  it("shows a danger toast when save fails", async () => {
    mocks.saveScheduleItem.mockRejectedValue(new Error("Conflito de horario"));
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Outro culto" } });
    fireEvent.change(screen.getByLabelText("Ministerio"), { target: { value: "Louvor" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Conflito de horario")).toBeInTheDocument();
    });
  });

  it("renders sound team field with datalist suggestions from volunteers", () => {
    const snapshot = buildSnapshot([
      makeVolunteer({ id: "v1", name: "Miguel", role: "som", sortOrder: 0 }),
      makeVolunteer({ id: "v2", name: "Brainer", role: "som", sortOrder: 1 }),
      makeVolunteer({ id: "v3", name: "Pastor Joao", role: "geral", sortOrder: 0 })
    ]);
    renderView(snapshot);

    const soundField = screen.getByLabelText("Equipe de som") as HTMLInputElement;
    expect(soundField).toBeInTheDocument();
    expect(soundField.getAttribute("list")).toBe("schedule-sound-team");

    const datalist = document.getElementById("schedule-sound-team");
    expect(datalist).not.toBeNull();
    const optionValues = Array.from(datalist?.querySelectorAll("option") ?? []).map(
      (option) => (option as HTMLOptionElement).value
    );
    expect(optionValues).toContain("Miguel");
    expect(optionValues).toContain("Brainer");
    expect(optionValues).not.toContain("Pastor Joao");
  });

  it("archives a schedule item after confirmation and offers undo", async () => {
    const snapshot = buildSnapshot([], [makeScheduleItem({ id: "s1", title: "Culto solene" })]);
    renderView(snapshot);

    fireEvent.click(screen.getByRole("button", { name: /Excluir Culto solene/i }));
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() => {
      expect(mocks.archiveScheduleItem).toHaveBeenCalledWith("s1");
    });

    const undoButton = await screen.findByRole("button", { name: "Desfazer" });
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(mocks.restoreScheduleItem).toHaveBeenCalledWith("s1");
    });
  });

  it("links member id when preacher matches a registered member", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m-pregador", fullName: "Pastor Joao", isVolunteer: true })
    ]);
    mocks.saveScheduleItem.mockResolvedValue({ id: "saved-1" });
    renderView();

    await waitFor(() => {
      expect(mocks.listMembers).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Culto solene" } });
    fireEvent.change(screen.getByLabelText("Ministerio"), { target: { value: "Louvor" } });
    fireEvent.change(screen.getByLabelText("Pregador"), { target: { value: "Pastor Joao" } });

    await waitFor(() => {
      expect(screen.getByTestId("preacher-member-tag")).toBeInTheDocument();
    });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.updateScheduleItemMembers).toHaveBeenCalledTimes(1);
    });

    const [itemId, members] = mocks.updateScheduleItemMembers.mock.calls[0];
    expect(itemId).toBe("saved-1");
    expect(members).toEqual({
      preacherMemberId: "m-pregador",
      directorMemberId: null,
      soundMemberId: null
    });
  });

  it("keeps preacherMemberId null when typed name does not match any member", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m-pregador", fullName: "Pastor Joao", isVolunteer: true })
    ]);
    mocks.saveScheduleItem.mockResolvedValue({ id: "saved-2" });
    renderView();

    await waitFor(() => {
      expect(mocks.listMembers).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Culto" } });
    fireEvent.change(screen.getByLabelText("Ministerio"), { target: { value: "Louvor" } });
    fireEvent.change(screen.getByLabelText("Pregador"), { target: { value: "Convidado externo" } });

    expect(screen.queryByTestId("preacher-member-tag")).not.toBeInTheDocument();

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.saveScheduleItem).toHaveBeenCalledTimes(1);
    });

    const payload = mocks.saveScheduleItem.mock.calls[0][0];
    expect(payload.preacher).toBe("Convidado externo");
    expect(mocks.updateScheduleItemMembers).not.toHaveBeenCalled();
  });

  it("shows badge with text Membro vinculado when typed name matches an existing member", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m-pregador", fullName: "Pastor Joao", isVolunteer: true })
    ]);
    renderView();

    await waitFor(() => {
      expect(mocks.listMembers).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText("Pregador"), { target: { value: "Pastor Joao" } });

    await waitFor(() => {
      expect(screen.getByTestId("preacher-member-tag")).toHaveTextContent("Membro vinculado");
    });
  });

  it("does not show the badge when the typed name does not match any member", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m-pregador", fullName: "Pastor Joao", isVolunteer: true })
    ]);
    renderView();

    await waitFor(() => {
      expect(mocks.listMembers).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText("Pregador"), { target: { value: "Convidado externo" } });

    expect(screen.queryByTestId("preacher-member-tag")).not.toBeInTheDocument();
  });

  it("orders preacher datalist with volunteer members before non-volunteer members, alphabetical within each group", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m1", fullName: "Carlos Souza", isVolunteer: false }),
      makeMember({ id: "m2", fullName: "Ana Lima", isVolunteer: true }),
      makeMember({ id: "m3", fullName: "Bruno Costa", isVolunteer: false }),
      makeMember({ id: "m4", fullName: "Diego Mello", isVolunteer: true })
    ]);
    renderView();

    await waitFor(() => {
      expect(mocks.listMembers).toHaveBeenCalled();
    });

    await waitFor(() => {
      const datalist = document.getElementById("schedule-preachers");
      expect(datalist?.querySelector("option")).not.toBeNull();
    });

    const datalist = document.getElementById("schedule-preachers");
    const optionValues = Array.from(datalist?.querySelectorAll("option") ?? []).map(
      (option) => (option as HTMLOptionElement).value
    );
    const memberPositions = ["Ana Lima", "Diego Mello", "Bruno Costa", "Carlos Souza"].map((name) =>
      optionValues.indexOf(name)
    );
    expect(memberPositions.every((position) => position >= 0)).toBe(true);
    expect(memberPositions[0]).toBeLessThan(memberPositions[1]);
    expect(memberPositions[1]).toBeLessThan(memberPositions[2]);
    expect(memberPositions[2]).toBeLessThan(memberPositions[3]);
  });

  it("shows the membro badge for director and sound team when names match members", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m-dir", fullName: "Maria Souza", isVolunteer: true }),
      makeMember({ id: "m-som", fullName: "Miguel Lima", isVolunteer: true })
    ]);
    renderView();

    await waitFor(() => {
      expect(mocks.listMembers).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText("Dirigente"), { target: { value: "Maria Souza" } });
    fireEvent.change(screen.getByLabelText("Equipe de som"), {
      target: { value: "Miguel Lima, Brainer" }
    });

    await waitFor(() => {
      expect(screen.getByTestId("director-member-tag")).toBeInTheDocument();
    });
    expect(screen.getByTestId("sound-member-tag")).toBeInTheDocument();
    expect(screen.queryByTestId("preacher-member-tag")).not.toBeInTheDocument();
  });
});
