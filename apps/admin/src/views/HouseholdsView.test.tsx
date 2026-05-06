import "@testing-library/jest-dom/vitest";
import type { Household, Member } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listHouseholds: vi.fn<() => Promise<Household[]>>().mockResolvedValue([]),
  listMembers: vi.fn<() => Promise<Member[]>>().mockResolvedValue([]),
  createHousehold: vi.fn().mockResolvedValue({}),
  updateHousehold: vi.fn().mockResolvedValue({}),
  archiveHousehold: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      listHouseholds: mocks.listHouseholds,
      listMembers: mocks.listMembers,
      createHousehold: mocks.createHousehold,
      updateHousehold: mocks.updateHousehold,
      archiveHousehold: mocks.archiveHousehold
    }
  }
}));

import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import HouseholdsView from "./HouseholdsView";

function makeHousehold(overrides: Partial<Household> = {}): Household {
  return {
    id: "h1",
    name: "Familia Silva",
    headMemberId: null,
    address: {
      zip: "50000000",
      street: "Rua Teste",
      number: "100",
      complement: "",
      neighborhood: "Centro",
      city: "Recife",
      state: "PE"
    },
    notes: "",
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
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
    isVolunteer: false,
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

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
  const onStateChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <HouseholdsView state={{ search: "", sort: "nameAsc", page: 1 }} onStateChange={onStateChange} />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

describe("HouseholdsView", () => {
  afterEach(() => {
    cleanup();
    mocks.listHouseholds.mockReset().mockResolvedValue([]);
    mocks.listMembers.mockReset().mockResolvedValue([]);
    mocks.createHousehold.mockReset().mockResolvedValue({});
    mocks.updateHousehold.mockReset().mockResolvedValue({});
    mocks.archiveHousehold.mockReset().mockResolvedValue(undefined);
  });

  it("renders empty state when there are no households", async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText("Sem familias cadastradas.")).toBeInTheDocument();
    });
  });

  it("renders household rows when data is available", async () => {
    mocks.listHouseholds.mockResolvedValue([
      makeHousehold({ id: "h1", name: "Familia Silva" }),
      makeHousehold({ id: "h2", name: "Familia Souza" })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Familia Silva")).toBeInTheDocument();
    });
    expect(screen.getByText("Familia Souza")).toBeInTheDocument();
  });

  it("shows the head member name when household has one", async () => {
    mocks.listHouseholds.mockResolvedValue([makeHousehold({ headMemberId: "m1" })]);
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Joao Silva" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Responsavel: Joao Silva")).toBeInTheDocument();
    });
  });

  it("creates a new household when the form is submitted", async () => {
    renderView();

    const novaButtons = screen.getAllByRole("button", { name: /Nova fam.lia/i });
    fireEvent.click(novaButtons[0]!);

    fireEvent.change(screen.getByLabelText("Nome da familia"), {
      target: { value: "Familia Nova" }
    });

    fireEvent.click(screen.getByRole("tab", { name: /endere/i }));

    fireEvent.change(screen.getByLabelText("Rua"), {
      target: { value: "Rua das Flores" }
    });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.createHousehold).toHaveBeenCalledTimes(1);
    });
    const payload = mocks.createHousehold.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: "Familia Nova",
      address: expect.objectContaining({ street: "Rua das Flores" })
    });
    await waitFor(() => {
      expect(screen.getByText("Familia cadastrada.")).toBeInTheDocument();
    });
  });

  it("shows a danger toast when save fails", async () => {
    mocks.createHousehold.mockRejectedValue(new Error("Falha rede"));
    renderView();

    const novaButtons = screen.getAllByRole("button", { name: /Nova fam.lia/i });
    fireEvent.click(novaButtons[0]!);

    fireEvent.change(screen.getByLabelText("Nome da familia"), {
      target: { value: "Familia Erro" }
    });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Falha rede")).toBeInTheDocument();
    });
  });

  it("starts editing when 'Editar' is clicked and updates on submit", async () => {
    mocks.listHouseholds.mockResolvedValue([makeHousehold({ id: "h1", name: "Familia Antiga" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Familia Antiga")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const nameField = screen.getByLabelText("Nome da familia") as HTMLInputElement;
    expect(nameField.value).toBe("Familia Antiga");

    fireEvent.change(nameField, { target: { value: "Familia Renomeada" } });
    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.updateHousehold).toHaveBeenCalledTimes(1);
    });
    expect(mocks.updateHousehold.mock.calls[0][0]).toBe("h1");
    expect(mocks.updateHousehold.mock.calls[0][1]).toMatchObject({ name: "Familia Renomeada" });
    await waitFor(() => {
      expect(screen.getByText("Familia atualizada.")).toBeInTheDocument();
    });
  });

  it("archives a household after confirmation", async () => {
    mocks.listHouseholds.mockResolvedValue([makeHousehold({ id: "h1", name: "Familia Removida" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Familia Removida")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Arquivar familia Familia Removida/i }));

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() => {
      expect(mocks.archiveHousehold).toHaveBeenCalledWith("h1");
    });
    await waitFor(() => {
      expect(screen.getByText('Familia "Familia Removida" arquivada.')).toBeInTheDocument();
    });
  });

  it("does not archive when confirmation is denied", async () => {
    mocks.listHouseholds.mockResolvedValue([makeHousehold({ id: "h1", name: "Familia Mantida" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Familia Mantida")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Arquivar familia Familia Mantida/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    });

    expect(mocks.archiveHousehold).not.toHaveBeenCalled();
  });

  it("shows a danger toast when archive fails", async () => {
    mocks.archiveHousehold.mockRejectedValue(new Error("Falha arquivar"));
    mocks.listHouseholds.mockResolvedValue([makeHousehold({ id: "h1", name: "Familia ComErro" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Familia ComErro")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Arquivar familia Familia ComErro/i }));

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() => {
      expect(screen.getByText("Falha arquivar")).toBeInTheDocument();
    });
  });
});
