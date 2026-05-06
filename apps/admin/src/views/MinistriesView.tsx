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
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import DetailSheet from "../components/Layout/DetailSheet";
import ViewHeader from "../components/Layout/ViewHeader";
import { useToast } from "../components/Toast";
import { useArchiveMinistry, useRestoreMinistry, useSaveMinistry } from "../hooks";
import { ministrySchema, type MinistryFormValues } from "../schemas";
import { type ListState } from "../lib/list-state";
import MinistryCard from "./ministries/MinistryCard";
import MinistryForm from "./ministries/MinistryForm";

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
  void state;
  void onStateChange;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const saveMutation = useSaveMinistry();
  const archiveMutation = useArchiveMinistry();
  const restoreMutation = useRestoreMinistry();
  const { toast } = useToast();
  const confirm = useConfirm();

  const orderedMinistries = useMemo(() => sortMinistries(snapshot.ministries), [snapshot.ministries]);
  const nextSortOrder = useMemo(() => {
    if (snapshot.ministries.length === 0) return 0;
    return snapshot.ministries.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
  }, [snapshot.ministries]);

  const form = useForm<MinistryFormValues>({
    resolver: valibotResolver(ministrySchema),
    defaultValues: emptyMinistryValues(nextSortOrder)
  });
  const { reset, formState } = form;

  function openCreate() {
    setEditingId(null);
    reset(emptyMinistryValues(nextSortOrder));
    setSheetOpen(true);
  }

  function openEdit(item: MinistryRecord) {
    setEditingId(item.id);
    reset(ministryToFormValues(item));
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
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
      closeSheet();
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
    if (!ok) return;
    try {
      await archiveMutation.mutateAsync(item.id);
      toast.undo({
        message: `Ministerio "${item.name}" arquivado.`,
        onUndo: () => restoreMutation.mutate(item.id)
      });
      if (editingId === item.id) closeSheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui excluir — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = orderedMinistries.findIndex((entry) => entry.id === active.id);
    const toIndex = orderedMinistries.findIndex((entry) => entry.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = arrayMove(orderedMinistries, fromIndex, toIndex);
    try {
      for (let position = 0; position < reordered.length; position += 1) {
        const entry = reordered[position];
        const nextSort = position * 10;
        if (entry.sortOrder === nextSort) continue;
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

  const saving = formState.isSubmitting || saveMutation.isPending;
  const reordering = saveMutation.isPending;

  return (
    <section className="apple-view">
      <ViewHeader
        eyebrow="Estrutura"
        title="Ministérios"
        lead="Áreas de serviço da igreja. Arraste para reordenar."
        primaryAction={
          <button type="button" className="button primary" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            <span>Novo ministério</span>
          </button>
        }
      />

      {orderedMinistries.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={32} aria-hidden="true" />}
          title="Sem ministerios ainda."
          description="Crie o primeiro pra organizar voluntarios e horarios."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={orderedMinistries.map((entry) => entry.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="ministries-grid">
              {orderedMinistries.map((item) => (
                <MinistryCard
                  key={item.id}
                  item={item}
                  reordering={reordering}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <DetailSheet
        open={sheetOpen}
        title={editingId ? "Editar ministério" : "Novo ministério"}
        onClose={closeSheet}
      >
        <MinistryForm
          form={form}
          saving={saving}
          isEditing={editingId !== null}
          onSubmit={onSubmit}
          onCancel={closeSheet}
        />
      </DetailSheet>
    </section>
  );
}
