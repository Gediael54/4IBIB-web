import type { SiteSnapshot, Volunteer } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CrudPanel,
  Field,
  FormActions,
  ItemRow,
  ListToolbar,
  Pagination,
  SelectField
} from "../components/ui";
import { useDeleteVolunteer, useSaveVolunteer } from "../hooks";
import { volunteerSchema, type VolunteerFormValues } from "../schemas";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  TEXT_MAX,
  VOLUNTEER_ROLE_LABELS,
  VOLUNTEER_ROLE_OPTIONS,
  VOLUNTEER_SORT_OPTIONS,
  type ListState,
  type VolunteerRoleFilter
} from "../utils";

interface VolunteersViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
  roleFilter: VolunteerRoleFilter;
  onRoleFilterChange: (value: VolunteerRoleFilter) => void;
}

function emptyVolunteerValues(): VolunteerFormValues {
  return {
    name: "",
    role: "geral",
    sortOrder: 0
  };
}

function volunteerToFormValues(item: Volunteer): VolunteerFormValues {
  return {
    id: item.id,
    name: item.name,
    role: item.role,
    sortOrder: item.sortOrder
  };
}

export default function VolunteersView({
  snapshot,
  state,
  onStateChange,
  roleFilter,
  onRoleFilterChange
}: VolunteersViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveMutation = useSaveVolunteer();
  const deleteMutation = useDeleteVolunteer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<VolunteerFormValues>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: emptyVolunteerValues()
  });

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const volunteers = snapshot.volunteers ?? [];
    const filtered = volunteers.filter((item) => {
      const roleMatches = roleFilter === "all" || item.role === roleFilter;
      return roleMatches && matchesSearch(query, [item.name, item.role]);
    });
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "nameDesc") {
        return compareText(right.name, left.name);
      }
      if (state.sort === "roleAsc") {
        return compareText(left.role, right.role) || compareText(left.name, right.name);
      }
      if (state.sort === "sortOrderAsc") {
        return left.sortOrder - right.sortOrder || compareText(left.name, right.name);
      }
      return compareText(left.name, right.name);
    });
    return paginateItems(sorted, state.page);
  }, [snapshot, state, roleFilter]);

  function startEdit(item: Volunteer) {
    setEditingId(item.id);
    reset(volunteerToFormValues(item));
  }

  function cancelEdit() {
    setEditingId(null);
    reset(emptyVolunteerValues());
  }

  async function onSubmit(values: VolunteerFormValues) {
    await saveMutation.mutateAsync({
      id: editingId ?? undefined,
      name: values.name,
      role: values.role,
      sortOrder: values.sortOrder
    });
    cancelEdit();
  }

  async function handleDelete(item: Volunteer) {
    if (!window.confirm(`Excluir o voluntario "${item.name}"?`)) {
      return;
    }
    await deleteMutation.mutateAsync(item.id);
    if (editingId === item.id) {
      cancelEdit();
    }
  }

  const saving = isSubmitting || saveMutation.isPending;

  return (
    <CrudPanel
      title="Voluntarios"
      items={list.items}
      toolbar={
        <ListToolbar
          search={state.search}
          searchLabel="Nome ou funcao"
          sort={state.sort}
          sortOptions={VOLUNTEER_SORT_OPTIONS}
          total={list.total}
          onSearch={(search) => onStateChange({ search, page: 1 })}
          onSort={(sort) => onStateChange({ sort, page: 1 })}
        >
          <SelectField
            label="Funcao"
            value={roleFilter}
            onChange={(event) => {
              onRoleFilterChange(event.currentTarget.value as VolunteerRoleFilter);
              onStateChange({ page: 1 });
            }}
          >
            {VOLUNTEER_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </ListToolbar>
      }
      footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
      emptyLabel="Nenhum voluntario encontrado."
      renderItem={(item) => (
        <ItemRow key={item.id} title={item.name} detail={VOLUNTEER_ROLE_LABELS[item.role]}>
          <button onClick={() => startEdit(item)} type="button">
            Editar
          </button>
          <button
            onClick={() => handleDelete(item)}
            type="button"
            aria-label={`Excluir voluntario ${item.name}`}
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </ItemRow>
      )}
    >
      <form className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label="Nome"
          placeholder="Nome do voluntario"
          maxLength={TEXT_MAX}
          error={errors.name?.message}
          {...register("name")}
        />
        <div className="form-grid">
          <SelectField label="Funcao" error={errors.role?.message} {...register("role")}>
            <option value="geral">Geral</option>
            <option value="som">Som</option>
          </SelectField>
          <Field
            label="Ordem"
            type="number"
            min={0}
            placeholder="0"
            error={errors.sortOrder?.message}
            {...register("sortOrder", { valueAsNumber: true })}
          />
        </div>
        {saveMutation.error && (
          <p className="form-error">
            {saveMutation.error instanceof Error ? saveMutation.error.message : "Falha ao salvar."}
          </p>
        )}
        <FormActions saving={saving} onCancel={cancelEdit} />
      </form>
    </CrudPanel>
  );
}
