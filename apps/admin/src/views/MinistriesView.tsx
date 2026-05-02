import { sortMinistries, type MinistryRecord, type SiteSnapshot } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, LayoutGrid, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { EmptyState } from "../components/EmptyState";
import { ListView } from "../components/ListView";
import { Field, FormActions, ListToolbar, Pagination, TextAreaField } from "../components/ui";
import { useDeleteMinistry, useSaveMinistry } from "../hooks";
import { ministrySchema, type MinistryFormValues } from "../schemas";
import { TEXT_MAX, TEXTAREA_MAX } from "../lib/limits";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  type ListState
} from "../lib/list-state";
import { MINISTRY_SORT_OPTIONS } from "../lib/sort-options";

interface MinistriesViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

function emptyMinistryValues(nextSortOrder: number): MinistryFormValues {
  return {
    slug: "",
    name: "",
    summary: "",
    meetingTime: "",
    contact: "",
    color: "#0f766e",
    sortOrder: nextSortOrder
  };
}

function ministryToFormValues(item: MinistryRecord): MinistryFormValues {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    summary: item.summary,
    meetingTime: item.meetingTime,
    contact: item.contact,
    color: item.color,
    sortOrder: item.sortOrder
  };
}

export default function MinistriesView({ snapshot, state, onStateChange }: MinistriesViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveMutation = useSaveMinistry();
  const deleteMutation = useDeleteMinistry();

  const nextSortOrder = useMemo(() => {
    if (snapshot.ministries.length === 0) {
      return 0;
    }
    return snapshot.ministries.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
  }, [snapshot.ministries]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<MinistryFormValues>({
    resolver: zodResolver(ministrySchema),
    defaultValues: emptyMinistryValues(nextSortOrder)
  });

  const orderedMinistries = useMemo(() => sortMinistries(snapshot.ministries), [snapshot.ministries]);

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = snapshot.ministries.filter((item) =>
      matchesSearch(query, [item.name, item.slug, item.summary, item.meetingTime, item.contact])
    );
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "nameAsc") {
        return compareText(left.name, right.name);
      }
      if (state.sort === "nameDesc") {
        return compareText(right.name, left.name);
      }
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return compareText(left.name, right.name);
    });
    return paginateItems(sorted, state.page);
  }, [snapshot, state]);

  function startEdit(item: MinistryRecord) {
    setEditingId(item.id);
    reset(ministryToFormValues(item));
  }

  function cancelEdit() {
    setEditingId(null);
    reset(emptyMinistryValues(nextSortOrder));
  }

  async function onSubmit(values: MinistryFormValues) {
    await saveMutation.mutateAsync({
      id: editingId ?? undefined,
      slug: values.slug,
      name: values.name,
      summary: values.summary,
      meetingTime: values.meetingTime,
      contact: values.contact,
      color: values.color,
      sortOrder: values.sortOrder
    });
    cancelEdit();
  }

  async function handleDelete(item: MinistryRecord) {
    if (!window.confirm(`Excluir o ministerio "${item.name}"?`)) {
      return;
    }
    await deleteMutation.mutateAsync(item.id);
    if (editingId === item.id) {
      cancelEdit();
    }
  }

  async function swapSortOrder(item: MinistryRecord, direction: "up" | "down") {
    const index = orderedMinistries.findIndex((other) => other.id === item.id);
    if (index === -1) {
      return;
    }
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= orderedMinistries.length) {
      return;
    }
    const neighbor = orderedMinistries[neighborIndex];

    await saveMutation.mutateAsync({
      id: item.id,
      slug: item.slug,
      name: item.name,
      summary: item.summary,
      meetingTime: item.meetingTime,
      contact: item.contact,
      color: item.color,
      sortOrder: neighbor.sortOrder
    });
    await saveMutation.mutateAsync({
      id: neighbor.id,
      slug: neighbor.slug,
      name: neighbor.name,
      summary: neighbor.summary,
      meetingTime: neighbor.meetingTime,
      contact: neighbor.contact,
      color: neighbor.color,
      sortOrder: item.sortOrder
    });
  }

  const saving = isSubmitting || saveMutation.isPending;
  const reordering = saveMutation.isPending;

  return (
    <div className="crud-layout">
      <ListView
        title="Ministerios"
        count={list.total}
        toolbar={
          <ListToolbar
            search={state.search}
            searchLabel="Nome, slug ou descricao"
            sort={state.sort}
            sortOptions={MINISTRY_SORT_OPTIONS}
            total={list.total}
            onSearch={(search) => onStateChange({ search, page: 1 })}
            onSort={(sort) => onStateChange({ sort, page: 1 })}
          />
        }
        items={list.items}
        getId={(item) => item.id}
        emptyState={
          <EmptyState
            icon={<LayoutGrid size={32} />}
            title="Nenhum ministerio encontrado."
            description="Cadastre um ministerio no formulario ao lado."
          />
        }
        footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
        renderItem={(item) => {
          const orderedIndex = orderedMinistries.findIndex((other) => other.id === item.id);
          const isFirst = orderedIndex <= 0;
          const isLast = orderedIndex === -1 || orderedIndex >= orderedMinistries.length - 1;
          return (
            <article className="ministry-row">
              <div>
                <strong>{item.name}</strong>
                <span>Ordem {item.sortOrder}</span>
              </div>
              <div className="row-actions">
                <button
                  onClick={() => swapSortOrder(item, "up")}
                  type="button"
                  aria-label={`Mover ${item.name} para cima`}
                  title="Mover para cima"
                  disabled={isFirst || reordering}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => swapSortOrder(item, "down")}
                  type="button"
                  aria-label={`Mover ${item.name} para baixo`}
                  title="Mover para baixo"
                  disabled={isLast || reordering}
                >
                  <ArrowDown size={16} />
                </button>
                <button onClick={() => startEdit(item)} type="button">
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  type="button"
                  aria-label={`Excluir ministerio ${item.name}`}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        }}
      />
      <div className="editor-panel">
        <form className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field
            label="Nome"
            placeholder="Nome"
            maxLength={TEXT_MAX}
            error={errors.name?.message}
            {...register("name")}
          />
          <Field
            label="Slug"
            placeholder="slug-do-ministerio"
            maxLength={80}
            readOnly={editingId !== null}
            error={errors.slug?.message}
            {...register("slug")}
          />
          <TextAreaField
            label="Descricao"
            placeholder="Descricao"
            maxLength={TEXTAREA_MAX}
            error={errors.summary?.message}
            {...register("summary")}
          />
          <div className="form-grid">
            <Field
              label="Horario de encontro"
              placeholder="Ex.: Quintas, 19:30"
              maxLength={TEXT_MAX}
              error={errors.meetingTime?.message}
              {...register("meetingTime")}
            />
            <Field
              label="Contato"
              placeholder="Nome ou WhatsApp"
              maxLength={TEXT_MAX}
              error={errors.contact?.message}
              {...register("contact")}
            />
          </div>
          <div className="form-grid">
            <Field label="Cor" type="color" error={errors.color?.message} {...register("color")} />
            <Field
              label="Ordem"
              type="number"
              min={0}
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
      </div>
    </div>
  );
}
