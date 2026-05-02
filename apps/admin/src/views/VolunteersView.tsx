import { splitNames, type ScheduleItem, type SiteSnapshot, type Volunteer } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { EmptyState } from "../components/EmptyState";
import { FieldGroup } from "../components/FieldGroup";
import { ListView } from "../components/ListView";
import {
  Field,
  FormActions,
  ItemRow,
  ListToolbar,
  Pagination,
  SelectField,
  TextAreaField
} from "../components/ui";
import { useDeleteVolunteer, useRenameVolunteer, useSaveVolunteer } from "../hooks";
import { volunteerSchema, type VolunteerFormValues } from "../schemas";
import { VOLUNTEER_ROLE_LABELS, VOLUNTEER_ROLE_OPTIONS } from "../lib/labels";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../lib/limits";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  type ListState,
  type VolunteerRoleFilter
} from "../lib/list-state";
import { VOLUNTEER_SORT_OPTIONS } from "../lib/sort-options";

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
    sortOrder: 0,
    contact: "",
    photoUrl: "",
    ministries: [],
    unavailableDates: [],
    notes: ""
  };
}

function volunteerToFormValues(item: Volunteer): VolunteerFormValues {
  return {
    id: item.id,
    name: item.name,
    role: item.role,
    sortOrder: item.sortOrder,
    contact: item.contact,
    photoUrl: item.photoUrl,
    ministries: item.ministries,
    unavailableDates: item.unavailableDates,
    notes: item.notes
  };
}

function countParticipation(volunteer: Volunteer, schedule: ScheduleItem[]): number {
  const now = Date.now();
  const lower = volunteer.name.trim().toLowerCase();
  if (!lower) {
    return 0;
  }
  return schedule.filter((item) => {
    if (item.status !== "scheduled") return false;
    if (Date.parse(item.startsAt) < now) return false;
    const soundNames = splitNames(item.soundTeam).map((entry) => entry.toLowerCase());
    return (
      item.preacher.trim().toLowerCase() === lower ||
      item.director.trim().toLowerCase() === lower ||
      soundNames.includes(lower)
    );
  }).length;
}

export default function VolunteersView({
  snapshot,
  state,
  onStateChange,
  roleFilter,
  onRoleFilterChange
}: VolunteersViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<string>("");
  const saveMutation = useSaveVolunteer();
  const renameMutation = useRenameVolunteer();
  const deleteMutation = useDeleteVolunteer();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<VolunteerFormValues>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: emptyVolunteerValues()
  });

  const ministries = watch("ministries");
  const unavailableDates = watch("unavailableDates");
  const ministriesText = useMemo(() => ministries.join(", "), [ministries]);

  const volunteersAll = snapshot.volunteers ?? [];
  const editingItem = useMemo(
    () => (editingId ? (volunteersAll.find((item) => item.id === editingId) ?? null) : null),
    [editingId, volunteersAll]
  );

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = volunteersAll.filter((item) => {
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
  }, [volunteersAll, state, roleFilter]);

  function startEdit(item: Volunteer) {
    setEditingId(item.id);
    setNewDate("");
    reset(volunteerToFormValues(item));
  }

  function cancelEdit() {
    setEditingId(null);
    setNewDate("");
    reset(emptyVolunteerValues());
  }

  function handleMinistriesChange(value: string) {
    setValue("ministries", splitNames(value), { shouldDirty: true, shouldValidate: true });
  }

  function handleAddDate() {
    const trimmed = newDate.trim();
    if (!trimmed) return;
    const current = unavailableDates ?? [];
    if (current.includes(trimmed)) {
      setNewDate("");
      return;
    }
    setValue("unavailableDates", [...current, trimmed], { shouldDirty: true, shouldValidate: true });
    setNewDate("");
  }

  function handleRemoveDate(date: string) {
    const current = unavailableDates ?? [];
    setValue(
      "unavailableDates",
      current.filter((entry) => entry !== date),
      { shouldDirty: true, shouldValidate: true }
    );
  }

  async function onSubmit(values: VolunteerFormValues) {
    const trimmedName = values.name.trim();
    const oldName = editingItem?.name.trim() ?? "";
    const isRename = Boolean(editingId) && trimmedName !== oldName && oldName.length > 0;

    let cascadeConfirmed = false;
    if (isRename && editingItem) {
      const affected = countSchedulesReferencingName(oldName, snapshot.schedule);
      if (affected > 0) {
        cascadeConfirmed = window.confirm(
          `Atualizar tambem ${affected} agendamentos onde aparece como pregador/dirigente?`
        );
      }
    }

    if (isRename && cascadeConfirmed && editingId) {
      await renameMutation.mutateAsync({ id: editingId, newName: trimmedName, cascade: true });
    }

    await saveMutation.mutateAsync({
      id: editingId ?? undefined,
      name: trimmedName,
      role: values.role,
      sortOrder: values.sortOrder,
      contact: values.contact,
      photoUrl: values.photoUrl,
      ministries: values.ministries,
      unavailableDates: values.unavailableDates,
      notes: values.notes
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

  const saving = isSubmitting || saveMutation.isPending || renameMutation.isPending;
  const dates = unavailableDates ?? [];

  const identidadePanel = (
    <>
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
    </>
  );

  const contatoPanel = (
    <>
      <Field
        label="Contato"
        placeholder="Telefone ou email"
        maxLength={TEXT_MAX}
        error={errors.contact?.message}
        {...register("contact")}
      />
      <Field
        label="Foto (URL)"
        type="url"
        placeholder="https://..."
        maxLength={URL_MAX}
        error={errors.photoUrl?.message}
        {...register("photoUrl")}
      />
      <Field
        label="Ministerios (separe com virgula)"
        placeholder="Louvor, Diaconia"
        maxLength={TEXT_MAX}
        value={ministriesText}
        onChange={(event) => handleMinistriesChange(event.currentTarget.value)}
        error={errors.ministries?.message}
      />
    </>
  );

  const disponibilidadePanel = (
    <div className="date-chip-section">
      <span className="field-label">Indisponivel em</span>
      {dates.length > 0 && (
        <ul className="date-chip-list">
          {dates.map((date) => (
            <li key={date} className="date-chip">
              <span>{date}</span>
              <button
                type="button"
                className="date-chip-remove"
                aria-label={`Remover data ${date}`}
                onClick={() => handleRemoveDate(date)}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="date-chip-add">
        <input
          type="date"
          value={newDate}
          onChange={(event) => setNewDate(event.currentTarget.value)}
          aria-label="Nova data indisponivel"
        />
        <button type="button" className="button ghost" onClick={handleAddDate} disabled={!newDate}>
          Adicionar data
        </button>
      </div>
      {errors.unavailableDates?.message && (
        <small className="form-error">{errors.unavailableDates.message}</small>
      )}
    </div>
  );

  const notasPanel = (
    <TextAreaField
      label="Notas"
      placeholder="Observacoes pastorais, restricoes, etc."
      maxLength={TEXTAREA_MAX}
      error={errors.notes?.message}
      {...register("notes")}
    />
  );

  return (
    <div className="crud-layout">
      <ListView
        title="Voluntarios"
        count={list.total}
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
        items={list.items}
        getId={(item) => item.id}
        emptyState={
          <EmptyState
            icon={<Users size={32} />}
            title="Nenhum voluntario encontrado."
            description="Cadastre um voluntario no formulario ao lado."
          />
        }
        footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
        renderItem={(item) => {
          const count = countParticipation(item, snapshot.schedule);
          const detail = `${VOLUNTEER_ROLE_LABELS[item.role]} - ${count} proximos`;
          return (
            <ItemRow key={item.id} title={item.name} detail={detail}>
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
          );
        }}
      />
      <div className="editor-panel">
        <form key={editingId ?? "new"} className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup
            groups={[
              { id: "identidade", label: "Identidade", content: identidadePanel },
              { id: "contato", label: "Contato e Foto", content: contatoPanel },
              { id: "disponibilidade", label: "Disponibilidade", content: disponibilidadePanel },
              { id: "notas", label: "Notas", content: notasPanel }
            ]}
          />
          {(saveMutation.error || renameMutation.error) && (
            <p className="form-error">
              {(saveMutation.error ?? renameMutation.error) instanceof Error
                ? (saveMutation.error ?? renameMutation.error)!.message
                : "Falha ao salvar."}
            </p>
          )}
          <FormActions saving={saving} onCancel={cancelEdit} />
        </form>
      </div>
    </div>
  );
}

function countSchedulesReferencingName(name: string, schedule: ScheduleItem[]): number {
  const lower = name.trim().toLowerCase();
  if (!lower) return 0;
  return schedule.filter((item) => {
    const sound = splitNames(item.soundTeam).map((entry) => entry.toLowerCase());
    return (
      item.preacher.trim().toLowerCase() === lower ||
      item.director.trim().toLowerCase() === lower ||
      sound.includes(lower)
    );
  }).length;
}
