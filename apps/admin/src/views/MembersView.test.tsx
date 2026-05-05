import "@testing-library/jest-dom/vitest";
import type { Household, Member, MemberDuplicateMatch, MemberRelationship } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listMembers: vi.fn<() => Promise<Member[]>>().mockResolvedValue([]),
  listHouseholds: vi.fn<() => Promise<Household[]>>().mockResolvedValue([]),
  listRelationships: vi.fn<() => Promise<MemberRelationship[]>>().mockResolvedValue([]),
  createMember: vi.fn().mockResolvedValue({}),
  updateMember: vi.fn().mockResolvedValue({}),
  archiveMember: vi.fn().mockResolvedValue(undefined),
  restoreMember: vi.fn().mockResolvedValue(undefined),
  anonymizeMember: vi.fn().mockResolvedValue(undefined),
  findMemberDuplicates: vi.fn<() => Promise<MemberDuplicateMatch[]>>().mockResolvedValue([]),
  createRelationship: vi.fn().mockResolvedValue({}),
  deleteRelationship: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      listMembers: mocks.listMembers,
      listHouseholds: mocks.listHouseholds,
      listRelationships: mocks.listRelationships,
      createMember: mocks.createMember,
      updateMember: mocks.updateMember,
      archiveMember: mocks.archiveMember,
      restoreMember: mocks.restoreMember,
      anonymizeMember: mocks.anonymizeMember,
      findMemberDuplicates: mocks.findMemberDuplicates,
      createRelationship: mocks.createRelationship,
      deleteRelationship: mocks.deleteRelationship
    }
  }
}));

import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import MembersView from "./MembersView";

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
    dataRetentionUntil: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

interface RenderOptions {
  mode?: "default" | "update";
  defaultTab?: string;
  defaultFilter?: { isVolunteer?: boolean; householdId?: string };
  title?: string;
}

function renderView(opts: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
  const onStateChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <MembersView
            state={{ search: "", sort: "nameAsc", page: 1 }}
            onStateChange={onStateChange}
            mode={opts.mode}
            defaultTab={opts.defaultTab}
            defaultFilter={opts.defaultFilter}
            title={opts.title}
          />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { ...utils, onStateChange };
}

describe("MembersView", () => {
  afterEach(() => {
    cleanup();
    mocks.listMembers.mockReset().mockResolvedValue([]);
    mocks.listHouseholds.mockReset().mockResolvedValue([]);
    mocks.listRelationships.mockReset().mockResolvedValue([]);
    mocks.createMember.mockReset().mockResolvedValue({});
    mocks.updateMember.mockReset().mockResolvedValue({});
    mocks.archiveMember.mockReset().mockResolvedValue(undefined);
    mocks.restoreMember.mockReset().mockResolvedValue(undefined);
    mocks.anonymizeMember.mockReset().mockResolvedValue(undefined);
    mocks.findMemberDuplicates.mockReset().mockResolvedValue([]);
    mocks.createRelationship.mockReset().mockResolvedValue({});
    mocks.deleteRelationship.mockReset().mockResolvedValue(undefined);
  });

  it("renders empty state when no members exist", async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText("Sem membros cadastrados.")).toBeInTheDocument();
    });
  });

  it("renders member rows from the list", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m1", fullName: "Joao Silva" }),
      makeMember({ id: "m2", fullName: "Maria Santos" })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
  });

  it("opens the create form by default with empty fields", () => {
    renderView();
    const fullNameField = screen.getByLabelText("Nome completo") as HTMLInputElement;
    expect(fullNameField).toBeInTheDocument();
    expect(fullNameField.value).toBe("");
  });

  it("creates a new member when the form is submitted", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Novo Membro" }
    });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.createMember).toHaveBeenCalledTimes(1);
    });
    const payload = mocks.createMember.mock.calls[0][0];
    expect(payload).toMatchObject({ fullName: "Novo Membro" });
    await waitFor(() => {
      expect(screen.getByText("Membro cadastrado.")).toBeInTheDocument();
    });
  });

  it("shows danger toast when save fails", async () => {
    mocks.createMember.mockRejectedValue(new Error("Falha ao salvar"));
    renderView();

    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Erro Membro" }
    });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Falha ao salvar")).toBeInTheDocument();
    });
  });

  it("starts editing when 'Editar' is clicked and updates on submit", async () => {
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Joao Silva" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const nameField = screen.getByLabelText("Nome completo") as HTMLInputElement;
    expect(nameField.value).toBe("Joao Silva");

    fireEvent.change(nameField, { target: { value: "Joao Silva Atualizado" } });
    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.updateMember).toHaveBeenCalledTimes(1);
    });
    expect(mocks.updateMember.mock.calls[0][0]).toBe("m1");
    expect(mocks.updateMember.mock.calls[0][1]).toMatchObject({ fullName: "Joao Silva Atualizado" });
    await waitFor(() => {
      expect(screen.getByText("Membro atualizado.")).toBeInTheDocument();
    });
  });

  it("archives a member after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Joao Silva" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Arquivar Joao Silva/i }));

    await waitFor(() => {
      expect(mocks.archiveMember).toHaveBeenCalledWith("m1");
    });
    await waitFor(() => {
      expect(screen.getByText('"Joao Silva" arquivado.')).toBeInTheDocument();
    });
    confirmSpy.mockRestore();
  });

  it("does not archive when confirmation is denied", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Joao Silva" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Arquivar Joao Silva/i }));

    expect(mocks.archiveMember).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("shows danger toast when archive fails", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.archiveMember.mockRejectedValue(new Error("Falha arquivar"));
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Joao Erro" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Joao Erro")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Arquivar Joao Erro/i }));

    await waitFor(() => {
      expect(screen.getByText("Falha arquivar")).toBeInTheDocument();
    });
    confirmSpy.mockRestore();
  });

  it("shows inline duplicate warning when matches are below blocking score", async () => {
    mocks.findMemberDuplicates.mockResolvedValue([
      {
        memberId: "m9",
        fullName: "Joao Parecido",
        score: 0.6,
        matchReason: "name_similar"
      }
    ]);
    renderView();

    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Joao Parecido" }
    });

    await waitFor(
      () => {
        expect(screen.getByRole("alert")).toHaveTextContent(/possivel\(is\) registro\(s\) parecido\(s\)/i);
      },
      { timeout: 2000 }
    );

    expect(mocks.findMemberDuplicates).toHaveBeenCalled();
  });

  it("blocks submission with a modal when a high-score duplicate is detected", async () => {
    mocks.findMemberDuplicates.mockResolvedValue([
      {
        memberId: "m9",
        fullName: "Joao Duplicado",
        score: 0.95,
        matchReason: "cpf_match"
      }
    ]);
    renderView();

    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Joao Duplicado" }
    });

    await waitFor(
      () => {
        expect(screen.getByText(/Possivel duplicata: Joao Duplicado/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    expect(screen.getByRole("button", { name: /Atualizar Joao Duplicado/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar criando duplicata/i })).toBeInTheDocument();
  });

  it("shows volunteer extra fields when isVolunteer is checked", async () => {
    renderView();

    fireEvent.click(screen.getByRole("tab", { name: "Voluntariado" }));

    const isVolunteerCheckbox = screen.getByLabelText(/E voluntario/i);
    expect(screen.queryByText("Ministerios")).not.toBeInTheDocument();

    fireEvent.click(isVolunteerCheckbox);

    await waitFor(() => {
      expect(screen.getByText("Ministerios")).toBeInTheDocument();
    });
    expect(screen.getByText("Datas indisponiveis")).toBeInTheDocument();
    expect(screen.getByLabelText("Notas de voluntariado")).toBeInTheDocument();
  });

  it("records consent timestamp when consentMedicalDataChecked is true", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Membro Saude" }
    });

    fireEvent.click(screen.getByRole("tab", { name: "Saude" }));

    fireEvent.change(screen.getByLabelText("Alergias"), {
      target: { value: "Amendoim" }
    });
    fireEvent.click(screen.getByLabelText(/Consinto que dados de saude/i));

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.createMember).toHaveBeenCalledTimes(1);
    });
    const payload = mocks.createMember.mock.calls[0][0];
    expect(payload.allergies).toBe("Amendoim");
    expect(payload.consentMedicalDataAt).not.toBeNull();
    expect(typeof payload.consentMedicalDataAt).toBe("string");
  });

  it("clears medical consent timestamp when consent is unchecked", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Sem Consentimento" }
    });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.createMember).toHaveBeenCalledTimes(1);
    });
    const payload = mocks.createMember.mock.calls[0][0];
    expect(payload.consentMedicalDataAt).toBeNull();
  });

  it("renders 'Atualizando dados de [nome]' hint when mode is update and a member is being edited", async () => {
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Joao Atualizando" })]);
    renderView({ mode: "update" });

    await waitFor(() => {
      expect(screen.getByText("Joao Atualizando")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const hint = await screen.findByText(/Atualizando dados de/i);
    expect(hint).toBeInTheDocument();
    expect(hint.querySelector("strong")?.textContent).toBe("Joao Atualizando");
  });

  it("renders custom title when provided", async () => {
    renderView({ title: "Membros Voluntarios" });
    await waitFor(() => {
      expect(screen.getByText("Membros Voluntarios")).toBeInTheDocument();
    });
  });

  it("invokes onStateChange when the search input changes", async () => {
    const { onStateChange } = renderView();

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "joao" } });
    expect(onStateChange).toHaveBeenCalledWith({ search: "joao", page: 1 });
  });

  it("anonymizes member after typing ANONIMIZAR confirmation", async () => {
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Joao Silva" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("tab", { name: "LGPD" }));

    fireEvent.click(screen.getByRole("button", { name: "Anonimizar dados" }));

    expect(screen.getByText(/Anonimizar dados de Joao Silva\?/i)).toBeInTheDocument();

    const confirmButton = screen.getByTestId("confirm-dialog-confirm");
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Digite ANONIMIZAR para confirmar"), {
      target: { value: "ANONIMIZAR" }
    });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mocks.anonymizeMember).toHaveBeenCalledWith("m1");
    });
    await waitFor(() => {
      expect(screen.getByText("Dados anonimizados.")).toBeInTheDocument();
    });
  });

  it("does not show anonymize button when creating a new member", () => {
    renderView({ defaultTab: "lgpd" });
    expect(screen.queryByRole("button", { name: "Anonimizar dados" })).not.toBeInTheDocument();
  });

  it("blocks submit when health data is filled without consent", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Sem Consent" }
    });

    fireEvent.click(screen.getByRole("tab", { name: "Saude" }));
    fireEvent.change(screen.getByLabelText("Alergias"), {
      target: { value: "Amendoim" }
    });

    expect(
      screen.getByText(/dados de saude sao categoria especial \(LGPD Art\.11\)\. Marque o consentimento/i)
    ).toBeInTheDocument();

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      const matches = screen.getAllByText("Marque o consentimento de saude antes de salvar dados medicos.");
      expect(matches.length).toBeGreaterThan(0);
    });

    expect(mocks.createMember).not.toHaveBeenCalled();
  });

  it("shows retention expired banner when dataRetentionUntil is in the past", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({
        id: "m1",
        fullName: "Joao Expirado",
        dataRetentionUntil: "2024-01-01"
      })
    ]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Joao Expirado")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    await waitFor(() => {
      expect(screen.getByText(/Retencao de dados expirou em/i)).toBeInTheDocument();
    });
  });

  it("persists publicDirectory checkbox state when editing", async () => {
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Joao Pub" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Joao Pub")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("tab", { name: "LGPD" }));

    const checkbox = screen.getByLabelText(/Exibir no diretorio publico/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.updateMember).toHaveBeenCalledTimes(1);
    });
    const payload = mocks.updateMember.mock.calls[0][1];
    expect(payload.publicDirectory).toBe(true);
  });

  it("renders all relationship category titles when editing a member", async () => {
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Joao Familia" })]);
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Joao Familia")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("tab", { name: "Familia" }));

    const titles = [
      "Conjuge",
      "Pai",
      "Mae",
      "Filhos",
      "Irmaos",
      "Avos",
      "Netos",
      "Tios",
      "Sobrinhos",
      "Responsavel"
    ];
    for (const title of titles) {
      expect(screen.getByRole("heading", { level: 4, name: title })).toBeInTheDocument();
    }
  });

  it("shows the chip in the correct category for an incoming pai relationship", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m1", fullName: "Filho X" }),
      makeMember({ id: "m2", fullName: "Pai Y" })
    ]);
    mocks.listRelationships.mockResolvedValue([
      {
        id: "r1",
        fromMemberId: "m2",
        toMemberId: "m1",
        type: "pai",
        startDate: null,
        endDate: null,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);
    renderView();

    const filhoRow = (await screen.findByText("Filho X")).closest("article");
    if (!filhoRow) throw new Error("row not found");
    fireEvent.click(within(filhoRow as HTMLElement).getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("tab", { name: "Familia" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Remover Pai Y de Pai/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Remover Pai Y de Filhos/i })).not.toBeInTheDocument();
  });

  it("creates type=pai when adding a child for a male editing member", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m1", fullName: "Pai X", gender: "masculino" }),
      makeMember({ id: "m2", fullName: "Filho Y" })
    ]);
    renderView();

    const paiRow = (await screen.findByText("Pai X")).closest("article");
    if (!paiRow) throw new Error("row not found");
    fireEvent.click(within(paiRow as HTMLElement).getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("tab", { name: "Familia" }));

    fireEvent.click(screen.getByRole("button", { name: /Adicionar em Filhos/i }));

    const select = await screen.findByLabelText("Membro");
    fireEvent.change(select, { target: { value: "m2" } });

    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

    await waitFor(() => {
      expect(mocks.createRelationship).toHaveBeenCalledTimes(1);
    });
    expect(mocks.createRelationship.mock.calls[0][0]).toMatchObject({
      fromMemberId: "m1",
      toMemberId: "m2",
      type: "pai"
    });
  });

  it("creates type=mae when adding a child for a female editing member", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m1", fullName: "Mae X", gender: "feminino" }),
      makeMember({ id: "m2", fullName: "Filho Y" })
    ]);
    renderView();

    const maeRow = (await screen.findByText("Mae X")).closest("article");
    if (!maeRow) throw new Error("row not found");
    fireEvent.click(within(maeRow as HTMLElement).getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("tab", { name: "Familia" }));

    fireEvent.click(screen.getByRole("button", { name: /Adicionar em Filhos/i }));

    const select = await screen.findByLabelText("Membro");
    fireEvent.change(select, { target: { value: "m2" } });

    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

    await waitFor(() => {
      expect(mocks.createRelationship).toHaveBeenCalledTimes(1);
    });
    expect(mocks.createRelationship.mock.calls[0][0]).toMatchObject({
      fromMemberId: "m1",
      toMemberId: "m2",
      type: "mae"
    });
  });

  it("calls deleteRelationship with the relationship id when chip remove is clicked", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({ id: "m1", fullName: "Filho X" }),
      makeMember({ id: "m2", fullName: "Pai Y" })
    ]);
    mocks.listRelationships.mockResolvedValue([
      {
        id: "r-existing",
        fromMemberId: "m2",
        toMemberId: "m1",
        type: "pai",
        startDate: null,
        endDate: null,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);
    renderView();

    const filhoRow = (await screen.findByText("Filho X")).closest("article");
    if (!filhoRow) throw new Error("row not found");
    fireEvent.click(within(filhoRow as HTMLElement).getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("tab", { name: "Familia" }));

    const removeButton = await screen.findByRole("button", { name: /Remover Pai Y de Pai/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mocks.deleteRelationship).toHaveBeenCalledWith("r-existing");
    });
  });
});
