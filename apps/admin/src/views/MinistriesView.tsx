import { sortMinistries, type MinistryRecord, type SiteSnapshot } from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, LayoutGrid, Trash2 } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ListView } from "../components/ListView";
import { useToast } from "../components/Toast";
import { Field, FormActions, ListToolbar, Pagination, TextAreaField } from "../components/ui";
import { useArchiveMinistry, useRestoreMinistry, useSaveMinistry } from "../hooks";
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
  const archiveMutation = useArchiveMinistry();
  const restoreMutation = useRestoreMinistry();
  const { toast } = useToast();
  const confirm = useConfirm();

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
    resolver: valibotResolver(ministrySchema),
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
    try {
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
      toast(editingId ? "Ministerio atualizado." : "Ministerio criado.", { variant: "success" });
      cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui salvar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleDelete(item: MinistryRecord) {
    const ok = await confirm({
      title: `Excluir o ministerio "${item.name}"?`,
      message: "Esta acao remove o ministerio permanentemente do site.",
      confirmText: "Excluir",
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await archiveMutation.mutateAsync(item.id);
      toast.undo({
        message: `Ministerio "${item.name}" arquivado.`,
        onUndo: () => restoreMutation.mutate(item.id)
      });
      if (editingId === item.id) {
        cancelEdit();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui excluir — tenta de novo?";
      toast(message, { variant: "danger" });
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const fromIndex = orderedMinistries.findIndex((entry) => entry.id === active.id);
    const toIndex = orderedMinistries.findIndex((entry) => entry.id === over.id);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    const reordered = arrayMove(orderedMinistries, fromIndex, toIndex);
    try {
      for (let position = 0; position < reordered.length; position += 1) {
        const entry = reordered[position];
        const nextSort = position * 10;
        if (entry.sortOrder === nextSort) {
          continue;
        }
        await saveMutation.mutateAsync({
          id: entry.id,
          slug: entry.slug,
          name: entry.name,
          summary: entry.summary,
          meetingTime: entry.meetingTime,
          contact: entry.contact,
          color: entry.color,
          sortOrder: nextSort
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui reordenar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const saving = isSubmitting || saveMutation.isPending;
  const reordering = saveMutation.isPending;

  return (
    <div className="crud-layout">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={orderedMinistries.map((entry) => entry.id)}
          strategy={verticalListSortingStrategy}
        >
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
                title="Sem ministerios ainda."
                description="Crie o primeiro pra organizar voluntarios e horarios."
              />
            }
            footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
            renderItem={(item) => {
              const orderedIndex = orderedMinistries.findIndex((other) => other.id === item.id);
              const isFirst = orderedIndex <= 0;
              const isLast = orderedIndex === -1 || orderedIndex >= orderedMinistries.length - 1;
              return (
                <SortableMinistryRow
                  item={item}
                  isFirst={isFirst}
                  isLast={isLast}
                  reordering={reordering}
                  onMoveUp={() => swapSortOrder(item, "up")}
                  onMoveDown={() => swapSortOrder(item, "down")}
                  onEdit={() => startEdit(item)}
                  onDelete={() => handleDelete(item)}
                />
              );
            }}
          />
        </SortableContext>
      </DndContext>
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
          <FormActions saving={saving} onCancel={cancelEdit} />
        </form>
      </div>
    </div>
  );
}

interface SortableMinistryRowProps {
  item: MinistryRecord;
  isFirst: boolean;
  isLast: boolean;
  reordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableMinistryRow({
  item,
  isFirst,
  isLast,
  reordering,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete
}: SortableMinistryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined
  };
  return (
    <article ref={setNodeRef} className="ministry-row" style={style}>
      <div className="row-drag-wrap">
        <button
          type="button"
          className="row-drag-handle"
          aria-label={`Arrastar ${item.name}`}
          title="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
        <div>
          <strong>{item.name}</strong>
          <span>Ordem {item.sortOrder}</span>
        </div>
      </div>
      <div className="row-actions">
        <button
          onClick={onMoveUp}
          type="button"
          aria-label={`Mover ${item.name} para cima`}
          title="Mover para cima"
          disabled={isFirst || reordering}
        >
          <ArrowUp size={16} />
        </button>
        <button
          onClick={onMoveDown}
          type="button"
          aria-label={`Mover ${item.name} para baixo`}
          title="Mover para baixo"
          disabled={isLast || reordering}
        >
          <ArrowDown size={16} />
        </button>
        <button onClick={onEdit} type="button">
          Editar
        </button>
        <button
          onClick={onDelete}
          type="button"
          aria-label={`Excluir ministerio ${item.name}`}
          title="Excluir"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
