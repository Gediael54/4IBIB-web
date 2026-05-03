import { type Household, type Member } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Home, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { EmptyState } from "../components/EmptyState";
import { ListView } from "../components/ListView";
import { useToast } from "../components/Toast";
import {
  Field,
  FormActions,
  ItemRow,
  ListToolbar,
  Pagination,
  SelectField,
  TextAreaField
} from "../components/ui";
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
import { HOUSEHOLD_SORT_OPTIONS } from "../lib/sort-options";
import { maskCep, unmaskDigits } from "../lib/format";
import { householdSchema, type HouseholdFormValues } from "../schemas";

interface HouseholdsViewProps {
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

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

export default function HouseholdsView({ state, onStateChange }: HouseholdsViewProps) {
  const householdsQuery = useHouseholds();
  const membersQuery = useMembers();
  const saveMutation = useSaveHousehold();
  const archiveMutation = useArchiveHousehold();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdSchema),
    defaultValues: emptyHouseholdValues()
  });

  const households = householdsQuery.data ?? [];
  const members = membersQuery.data ?? [];

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

  function startEdit(item: Household) {
    setEditingId(item.id);
    reset(householdToFormValues(item));
  }

  function cancelEdit() {
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
      cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui salvar.";
      toast(message, { variant: "danger" });
    }
  }

  async function handleArchive(item: Household) {
    if (!window.confirm(`Arquivar familia "${item.name}"?`)) return;
    try {
      await archiveMutation.mutateAsync(item.id);
      toast(`Familia "${item.name}" arquivada.`, { variant: "success" });
      if (editingId === item.id) cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui arquivar.";
      toast(message, { variant: "danger" });
    }
  }

  const saving = isSubmitting || saveMutation.isPending;

  return (
    <div className="crud-layout">
      <ListView
        title="Familias"
        count={list.total}
        toolbar={
          <ListToolbar
            search={state.search}
            searchLabel="Nome ou cidade"
            sort={state.sort}
            sortOptions={HOUSEHOLD_SORT_OPTIONS}
            total={list.total}
            onSearch={(search) => onStateChange({ search, page: 1 })}
            onSort={(sort) => onStateChange({ sort, page: 1 })}
          />
        }
        items={list.items}
        getId={(item) => item.id}
        emptyState={
          <EmptyState
            icon={<Home size={32} />}
            title="Sem familias cadastradas."
            description="Cadastre a primeira familia no formulario ao lado."
          />
        }
        footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
        renderItem={(item) => {
          const head = members.find((m: Member) => m.id === item.headMemberId);
          const detail = head ? `Responsavel: ${head.fullName}` : "Sem responsavel";
          return (
            <ItemRow key={item.id} title={item.name} detail={detail}>
              <button onClick={() => startEdit(item)} type="button">
                Editar
              </button>
              <button
                onClick={() => handleArchive(item)}
                type="button"
                aria-label={`Arquivar familia ${item.name}`}
                title="Arquivar"
              >
                <Trash2 size={16} />
              </button>
            </ItemRow>
          );
        }}
      />
      <div className="editor-panel">
        <form
          key={editingId ?? "new-household"}
          className="editor-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
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
          <div className="form-grid">
            <Field
              label="CEP"
              placeholder="00000-000"
              value={watch("addressZip")}
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
          <div className="form-grid">
            <Field
              label="Bairro"
              placeholder="Bairro"
              maxLength={TEXT_MAX}
              {...register("addressNeighborhood")}
            />
            <Field label="Cidade" placeholder="Cidade" maxLength={TEXT_MAX} {...register("addressCity")} />
          </div>
          <SelectField label="UF" {...register("addressState")}>
            <option value="">UF</option>
            {BR_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            label="Notas"
            placeholder="Observacoes"
            maxLength={TEXTAREA_MAX}
            {...register("notes")}
          />
          <FormActions saving={saving} onCancel={cancelEdit} />
        </form>
      </div>
    </div>
  );
}
