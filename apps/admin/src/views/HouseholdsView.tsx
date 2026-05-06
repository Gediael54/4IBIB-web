import { type Household, type Member } from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { Crown, Home, Info, MapPin, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import HouseholdAvatarStack from "../components/Households/HouseholdAvatarStack";
import DataCard from "../components/Layout/DataCard";
import DetailSheet from "../components/Layout/DetailSheet";
import ViewHeader from "../components/Layout/ViewHeader";
import { useToast } from "../components/Toast";
import { Field, FormActions, Pagination, SelectField, TextAreaField } from "../components/ui";
import { useArchiveHousehold, useHouseholds, useMembers, useSaveHousehold } from "../hooks";
import { BR_STATES } from "../lib/labels";
import { TEXT_MAX, TEXTAREA_MAX } from "../lib/limits";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  type ListState
} from "../lib/list-state";
import { maskCep, unmaskDigits } from "../lib/format";
import { householdSchema, type HouseholdFormValues } from "../schemas";

interface HouseholdsViewProps {
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type SheetTab = "info" | "address" | "members";

const TAB_LABELS: Record<SheetTab, string> = {
  info: "Informações",
  address: "Endereço",
  members: "Membros"
};

function emptyHouseholdValues(): HouseholdFormValues {
  return {
    name: "",
    headMemberId: null,
    addressZip: "",
    addressStreet: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
    notes: ""
  };
}

function householdToFormValues(item: Household): HouseholdFormValues {
  return {
    id: item.id,
    name: item.name,
    headMemberId: item.headMemberId,
    addressZip: item.address.zip,
    addressStreet: item.address.street,
    addressNumber: item.address.number,
    addressComplement: item.address.complement,
    addressNeighborhood: item.address.neighborhood,
    addressCity: item.address.city,
    addressState: item.address.state,
    notes: item.notes
  };
}

function summarizeAddress(item: Household): string {
  const street = item.address.street?.trim() ?? "";
  const number = item.address.number?.trim() ?? "";
  const city = item.address.city?.trim() ?? "";
  const state = item.address.state?.trim() ?? "";

  const head = [street, number].filter(Boolean).join(", ");
  const tail = [city, state].filter(Boolean).join(" / ");

  if (head && tail) return `${head} — ${tail}`;
  return head || tail || "Endereço não cadastrado";
}

function truncate(value: string, max = 140): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export default function HouseholdsView({ state, onStateChange }: HouseholdsViewProps) {
  const householdsQuery = useHouseholds();
  const membersQuery = useMembers();
  const saveMutation = useSaveHousehold();
  const archiveMutation = useArchiveHousehold();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SheetTab>("info");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<HouseholdFormValues>({
    resolver: valibotResolver(householdSchema),
    defaultValues: emptyHouseholdValues()
  });

  const households = useMemo(() => householdsQuery.data ?? [], [householdsQuery.data]);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  const membersByHousehold = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const member of members) {
      if (!member.householdId) continue;
      const list = map.get(member.householdId) ?? [];
      list.push(member);
      map.set(member.householdId, list);
    }
    for (const list of map.values()) {
      list.sort((left, right) => compareText(left.fullName, right.fullName));
    }
    return map;
  }, [members]);

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = households.filter((item) =>
      matchesSearch(query, [item.name, item.address.city, item.notes])
    );
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "nameDesc") return compareText(right.name, left.name);
      return compareText(left.name, right.name);
    });
    return paginateItems(sorted, state.page);
  }, [households, state]);

  const editingHousehold = editingId ? (households.find((item) => item.id === editingId) ?? null) : null;
  const editingMembers = editingId ? (membersByHousehold.get(editingId) ?? []) : [];

  function openCreate() {
    setEditingId(null);
    setActiveTab("info");
    reset(emptyHouseholdValues());
    setSheetOpen(true);
  }

  function openEdit(item: Household) {
    setEditingId(item.id);
    setActiveTab("info");
    reset(householdToFormValues(item));
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingId(null);
    reset(emptyHouseholdValues());
  }

  async function onSubmit(values: HouseholdFormValues) {
    try {
      await saveMutation.mutateAsync({
        id: values.id,
        name: values.name.trim(),
        headMemberId: values.headMemberId,
        notes: values.notes,
        address: {
          zip: unmaskDigits(values.addressZip),
          street: values.addressStreet,
          number: values.addressNumber,
          complement: values.addressComplement,
          neighborhood: values.addressNeighborhood,
          city: values.addressCity,
          state: values.addressState
        }
      });
      toast(editingId ? "Familia atualizada." : "Familia cadastrada.", { variant: "success" });
      closeSheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui salvar.";
      toast(message, { variant: "danger" });
    }
  }

  async function handleArchive(item: Household) {
    const ok = await confirm({
      title: `Arquivar familia "${item.name}"?`,
      message: "A familia sera arquivada e some da listagem ativa.",
      confirmText: "Arquivar",
      destructive: true
    });
    if (!ok) return;
    try {
      await archiveMutation.mutateAsync(item.id);
      toast(`Familia "${item.name}" arquivada.`, { variant: "success" });
      if (editingId === item.id) closeSheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui arquivar.";
      toast(message, { variant: "danger" });
    }
  }

  const saving = isSubmitting || saveMutation.isPending;

  return (
    <section className="households-view">
      <ViewHeader
        eyebrow="Cadastro"
        title="Famílias"
        lead="Organize famílias da igreja, vincule responsáveis e mantenha o endereço atualizado."
        primaryAction={
          <button type="button" className="button primary" onClick={openCreate}>
            <Plus size={18} aria-hidden="true" /> Nova família
          </button>
        }
      />

      <div className="households-toolbar">
        <div className="search-field">
          <Field
            label="Buscar"
            type="search"
            value={state.search}
            placeholder="Nome, cidade ou nota"
            onChange={(event) => onStateChange({ search: event.currentTarget.value, page: 1 })}
          />
        </div>
        <SelectField
          label="Ordenar"
          value={state.sort}
          onChange={(event) => onStateChange({ sort: event.currentTarget.value, page: 1 })}
        >
          <option value="nameAsc">Nome (A → Z)</option>
          <option value="nameDesc">Nome (Z → A)</option>
        </SelectField>
        <span className="households-count">{list.total} famílias</span>
      </div>

      {list.items.length === 0 ? (
        <EmptyState
          icon={<Home size={32} />}
          title="Sem familias cadastradas."
          description="Cadastre a primeira família para começar a organizar o cadastro pastoral."
          action={
            <button type="button" className="button primary" onClick={openCreate}>
              <Plus size={18} aria-hidden="true" /> Nova família
            </button>
          }
        />
      ) : (
        <div className="data-cards-grid data-cards-grid-2col">
          {list.items.map((item) => {
            const head = members.find((member) => member.id === item.headMemberId) ?? null;
            const householdMembers = membersByHousehold.get(item.id) ?? [];
            const detail = head ? `Responsavel: ${head.fullName}` : "Sem responsavel";
            const description = item.notes.trim() ? truncate(item.notes) : undefined;

            return (
              <div key={item.id}>
                <DataCard
                  icon={<Home size={22} />}
                  title={item.name}
                  subtitle={summarizeAddress(item)}
                  meta={
                    <>
                      <span>
                        <Users size={12} aria-hidden="true" /> {householdMembers.length} membros
                      </span>
                      <span>{detail}</span>
                    </>
                  }
                  description={description}
                  secondaryActions={
                    <>
                      <button type="button" className="button ghost" onClick={() => openEdit(item)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="button ghost"
                        onClick={() => handleArchive(item)}
                        aria-label={`Arquivar familia ${item.name}`}
                        title="Excluir"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </>
                  }
                />
                {householdMembers.length > 0 && (
                  <div className="household-card-footer">
                    <span className="household-card-footer-label">Membros da família</span>
                    <HouseholdAvatarStack members={householdMembers} ariaLabel={`Membros de ${item.name}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination list={list} onPageChange={(page) => onStateChange({ page })} />

      <DetailSheet
        open={sheetOpen}
        title={editingHousehold ? `Editar ${editingHousehold.name}` : "Nova família"}
        subtitle={editingHousehold ? "Atualize os dados da família." : "Cadastre uma nova família."}
        onClose={closeSheet}
      >
        <form
          key={editingId ?? "new-household"}
          className="editor-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="household-form-tabs" role="tablist" aria-label="Seções do formulário">
            {(Object.keys(TAB_LABELS) as SheetTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={`household-form-tab${activeTab === tab ? " selected" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "info" && <Info size={14} aria-hidden="true" />}
                {tab === "address" && <MapPin size={14} aria-hidden="true" />}
                {tab === "members" && <Users size={14} aria-hidden="true" />} {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {activeTab === "info" && (
            <div className="household-form-grid">
              <Field
                label="Nome da familia"
                placeholder="Ex: Familia Silva"
                maxLength={TEXT_MAX}
                error={errors.name?.message}
                {...register("name")}
              />
              <SelectField
                label="Responsavel (opcional)"
                value={watch("headMemberId") ?? ""}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setValue("headMemberId", value || null, { shouldDirty: true });
                }}
              >
                <option value="">Nenhum</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                label="Notas"
                placeholder="Observações"
                maxLength={TEXTAREA_MAX}
                {...register("notes")}
              />
            </div>
          )}

          {activeTab === "address" && (
            <div className="household-form-grid">
              <div className="household-form-grid household-form-grid-2">
                <Field
                  label="CEP"
                  placeholder="00000-000"
                  value={watch("addressZip") ?? ""}
                  onChange={(event) =>
                    setValue("addressZip", maskCep(event.currentTarget.value), {
                      shouldDirty: true,
                      shouldValidate: true
                    })
                  }
                  maxLength={9}
                />
                <Field label="Numero" placeholder="Numero" maxLength={20} {...register("addressNumber")} />
              </div>
              <Field label="Rua" placeholder="Rua" maxLength={TEXT_MAX} {...register("addressStreet")} />
              <Field
                label="Complemento"
                placeholder="Complemento"
                maxLength={TEXT_MAX}
                {...register("addressComplement")}
              />
              <div className="household-form-grid household-form-grid-2">
                <Field
                  label="Bairro"
                  placeholder="Bairro"
                  maxLength={TEXT_MAX}
                  {...register("addressNeighborhood")}
                />
                <Field
                  label="Cidade"
                  placeholder="Cidade"
                  maxLength={TEXT_MAX}
                  {...register("addressCity")}
                />
              </div>
              <SelectField label="UF" {...register("addressState")}>
                <option value="">UF</option>
                {BR_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </SelectField>
            </div>
          )}

          {activeTab === "members" && (
            <div className="household-members-panel">
              {!editingHousehold && (
                <p className="household-members-empty">Salve a família primeiro para vincular membros.</p>
              )}
              {editingHousehold && editingMembers.length === 0 && (
                <p className="household-members-empty">Nenhum membro vinculado a esta família.</p>
              )}
              {editingHousehold && editingMembers.length > 0 && (
                <ul className="household-members-list">
                  {editingMembers.map((member) => {
                    const isHead = member.id === editingHousehold.headMemberId;
                    return (
                      <li key={member.id} className="household-member-row">
                        <HouseholdAvatarStack members={[member]} max={1} />
                        <div className="household-member-row-info">
                          <span className="household-member-row-name">
                            {member.preferredName || member.fullName}
                          </span>
                          <span className="household-member-row-role">{member.churchRole}</span>
                        </div>
                        {isHead && (
                          <span className="household-member-row-badge">
                            <Crown size={12} aria-hidden="true" /> Responsável
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <FormActions saving={saving} onCancel={closeSheet} />
        </form>
      </DetailSheet>
    </section>
  );
}
