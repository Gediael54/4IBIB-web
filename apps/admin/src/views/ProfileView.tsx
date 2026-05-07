import { sortRecurringMeetings, type RecurringMeetingRecord, type SiteSnapshot } from "@4ibib/core";
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
import { CalendarClock, GripVertical, Save, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import ViewHeader from "../components/Layout/ViewHeader";
import { useToast } from "../components/Toast";
import { Field, FormActions, SelectField, TextAreaField } from "../components/ui";
import { useDeleteRecurringMeeting, useSaveProfile, useSaveRecurringMeeting } from "../hooks";
import { WEEKDAY_LABELS } from "../lib/labels";
import { TEXT_MAX, TEXTAREA_MAX } from "../lib/limits";
import { recurringMeetingSchema, type ProfileFormValues, type RecurringMeetingFormValues } from "../schemas";
import ProfileForm, { type ProfileFormHandle } from "./profile/ProfileForm";

interface ProfileViewProps {
  snapshot: SiteSnapshot;
}

const PROFILE_FORM_ID = "church-profile-form";

function stripSeconds(value: string): string {
  return value.length > 5 ? value.slice(0, 5) : value;
}

function emptyRecurringValues(): RecurringMeetingFormValues {
  return {
    title: "",
    weekday: 0,
    startsAt: "",
    endsAt: "",
    description: "",
    sortOrder: 0
  };
}

function recurringToFormValues(item: RecurringMeetingRecord): RecurringMeetingFormValues {
  return {
    id: item.id,
    title: item.title,
    weekday: item.weekday,
    startsAt: stripSeconds(item.startsAt),
    endsAt: stripSeconds(item.endsAt),
    description: item.description,
    sortOrder: item.sortOrder
  };
}

function formatTimeRange(startsAt: string, endsAt: string): string {
  return `${stripSeconds(startsAt)} - ${stripSeconds(endsAt)}`;
}

export default function ProfileView({ snapshot }: ProfileViewProps) {
  const profileSaveMutation = useSaveProfile();
  const recurringSaveMutation = useSaveRecurringMeeting();
  const recurringDeleteMutation = useDeleteRecurringMeeting();
  const { toast } = useToast();
  const confirm = useConfirm();

  const profileFormHandleRef = useRef<ProfileFormHandle | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  const recurringForm = useForm<RecurringMeetingFormValues>({
    resolver: valibotResolver(recurringMeetingSchema),
    defaultValues: emptyRecurringValues()
  });

  const sortedMeetings = useMemo(
    () => sortRecurringMeetings(snapshot.recurringMeetings),
    [snapshot.recurringMeetings]
  );

  async function handleProfileSubmit(values: ProfileFormValues) {
    try {
      await profileSaveMutation.mutateAsync({
        id: "main",
        name: values.name,
        shortName: values.shortName,
        tagline: values.tagline,
        city: values.city,
        pastorName: values.pastorName,
        address: values.address,
        email: values.email,
        whatsapp: values.whatsapp,
        instagramUrl: values.instagramUrl,
        youtubeUrl: values.youtubeUrl,
        mapsUrl: values.mapsUrl,
        heroVerse: values.heroVerse,
        mission: values.mission
      });
      toast("Perfil atualizado.", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui salvar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  function startEditMeeting(item: RecurringMeetingRecord) {
    setEditingMeetingId(item.id);
    recurringForm.reset(recurringToFormValues(item));
  }

  function cancelEditMeeting() {
    setEditingMeetingId(null);
    recurringForm.reset(emptyRecurringValues());
  }

  async function onRecurringSubmit(values: RecurringMeetingFormValues) {
    try {
      await recurringSaveMutation.mutateAsync({
        id: editingMeetingId ?? undefined,
        title: values.title,
        weekday: values.weekday,
        startsAt: values.startsAt,
        endsAt: values.endsAt,
        description: values.description,
        sortOrder: values.sortOrder
      });
      toast(editingMeetingId ? "Encontro atualizado." : "Encontro cadastrado.", { variant: "success" });
      cancelEditMeeting();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui salvar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleMeetingDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const fromIndex = sortedMeetings.findIndex((entry) => entry.id === active.id);
    const toIndex = sortedMeetings.findIndex((entry) => entry.id === over.id);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    const reordered = arrayMove(sortedMeetings, fromIndex, toIndex);
    try {
      for (let position = 0; position < reordered.length; position += 1) {
        const entry = reordered[position];
        const nextSort = position * 10;
        if (entry.sortOrder === nextSort) {
          continue;
        }
        await recurringSaveMutation.mutateAsync({
          id: entry.id,
          title: entry.title,
          weekday: entry.weekday,
          startsAt: entry.startsAt,
          endsAt: entry.endsAt,
          description: entry.description,
          sortOrder: nextSort
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui reordenar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleDeleteMeeting(item: RecurringMeetingRecord) {
    const ok = await confirm({
      title: "Excluir encontro?",
      message: `"${item.title}" sai da programacao semanal fixa.`,
      confirmText: "Excluir",
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await recurringDeleteMutation.mutateAsync(item.id);
      toast(`Encontro "${item.title}" removido.`, { variant: "success" });
      if (editingMeetingId === item.id) {
        cancelEditMeeting();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui excluir — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const profileSaving = profileSaveMutation.isPending;
  const recurringSaving = recurringForm.formState.isSubmitting || recurringSaveMutation.isPending;

  return (
    <section className="apple-view profile-view">
      <ViewHeader
        eyebrow="Identidade"
        title="Perfil da igreja"
        lead="Informações que aparecem no site público — site title, contatos, missão e redes sociais."
        primaryAction={
          <button type="submit" form={PROFILE_FORM_ID} className="button primary" disabled={profileSaving}>
            <Save size={18} aria-hidden="true" />
            <span>{profileSaving ? "Salvando..." : "Salvar alterações"}</span>
          </button>
        }
        secondaryActions={
          <button
            type="button"
            className="button ghost"
            disabled={profileSaving}
            onClick={() => profileFormHandleRef.current?.reset()}
          >
            Descartar
          </button>
        }
      />

      <ProfileForm
        formId={PROFILE_FORM_ID}
        profile={snapshot.profile}
        onSubmit={handleProfileSubmit}
        handleRef={profileFormHandleRef}
      />

      <header className="workspace-heading profile-meetings-heading">
        <div>
          <p className="eyebrow">Programacao semanal fixa</p>
          <h2>Encontros recorrentes</h2>
        </div>
      </header>

      <div className="crud-layout">
        <div className="list-panel">
          {sortedMeetings.length === 0 ? (
            <EmptyState
              icon={<CalendarClock size={32} />}
              title="Sem encontros fixos cadastrados."
              description="Cadastre culto, escola biblica ou estudo da semana ao lado pra aparecer no site."
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMeetingDragEnd}>
              <SortableContext
                items={sortedMeetings.map((entry) => entry.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedMeetings.map((item) => (
                  <SortableMeetingRow
                    key={item.id}
                    item={item}
                    label={`${WEEKDAY_LABELS[item.weekday]} - ${formatTimeRange(item.startsAt, item.endsAt)}`}
                    onEdit={() => startEditMeeting(item)}
                    onDelete={() => handleDeleteMeeting(item)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        <div className="editor-panel">
          <form
            key={editingMeetingId ?? "new-meeting"}
            className="editor-form"
            onSubmit={recurringForm.handleSubmit(onRecurringSubmit)}
            noValidate
          >
            <Field
              label="Titulo"
              placeholder="Ex.: Culto de louvor"
              maxLength={TEXT_MAX}
              error={recurringForm.formState.errors.title?.message}
              {...recurringForm.register("title")}
            />
            <div className="form-grid">
              <SelectField
                label="Dia da semana"
                error={recurringForm.formState.errors.weekday?.message}
                {...recurringForm.register("weekday", { valueAsNumber: true })}
              >
                {WEEKDAY_LABELS.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Ordem"
                type="number"
                min={0}
                error={recurringForm.formState.errors.sortOrder?.message}
                {...recurringForm.register("sortOrder", { valueAsNumber: true })}
              />
            </div>
            <div className="form-grid">
              <Field
                label="Inicio"
                type="time"
                error={recurringForm.formState.errors.startsAt?.message}
                {...recurringForm.register("startsAt")}
              />
              <Field
                label="Termino"
                type="time"
                error={recurringForm.formState.errors.endsAt?.message}
                {...recurringForm.register("endsAt")}
              />
            </div>
            <TextAreaField
              label="Descricao"
              placeholder="Detalhes opcionais"
              maxLength={TEXTAREA_MAX}
              error={recurringForm.formState.errors.description?.message}
              {...recurringForm.register("description")}
            />
            <FormActions saving={recurringSaving} onCancel={cancelEditMeeting} />
          </form>
        </div>
      </div>
    </section>
  );
}

interface SortableMeetingRowProps {
  item: RecurringMeetingRecord;
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableMeetingRow({ item, label, onEdit, onDelete }: SortableMeetingRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined
  };
  return (
    <article ref={setNodeRef} className="item-row" style={style}>
      <div className="row-drag-wrap">
        <button
          type="button"
          className="row-drag-handle"
          aria-label={`Arrastar ${item.title}`}
          title="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
        <div>
          <strong>{item.title}</strong>
          <span>{label}</span>
        </div>
      </div>
      <div className="row-actions">
        <button onClick={onEdit} type="button">
          Editar
        </button>
        <button
          onClick={onDelete}
          type="button"
          aria-label={`Excluir encontro ${item.title}`}
          title="Excluir"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
