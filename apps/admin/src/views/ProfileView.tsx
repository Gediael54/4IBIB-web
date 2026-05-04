import {
  sortRecurringMeetings,
  type ChurchProfile,
  type RecurringMeetingRecord,
  type SiteSnapshot
} from "@4ibib/core";
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
import { CalendarClock, GripVertical, Trash2 } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { FieldGroup } from "../components/FieldGroup";
import { useToast } from "../components/Toast";
import { Field, FormActions, SelectField, TextAreaField } from "../components/ui";
import { useDeleteRecurringMeeting, useSaveProfile, useSaveRecurringMeeting } from "../hooks";
import {
  profileSchema,
  recurringMeetingSchema,
  type ProfileFormValues,
  type RecurringMeetingFormValues
} from "../schemas";
import { WEEKDAY_LABELS } from "../lib/labels";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../lib/limits";

interface ProfileViewProps {
  snapshot: SiteSnapshot;
}

function emptyProfileValues(): ProfileFormValues {
  return {
    name: "",
    shortName: "",
    tagline: "",
    city: "",
    pastorName: "",
    address: "",
    email: "",
    whatsapp: "",
    instagramUrl: "",
    youtubeUrl: "",
    mapsUrl: "",
    heroVerse: "",
    mission: ""
  };
}

function profileToFormValues(profile: ChurchProfile | null): ProfileFormValues {
  if (!profile) {
    return emptyProfileValues();
  }
  return {
    name: profile.name,
    shortName: profile.shortName,
    tagline: profile.tagline,
    city: profile.city,
    pastorName: profile.pastorName,
    address: profile.address,
    email: profile.email,
    whatsapp: profile.whatsapp,
    instagramUrl: profile.instagramUrl,
    youtubeUrl: profile.youtubeUrl,
    mapsUrl: profile.mapsUrl,
    heroVerse: profile.heroVerse,
    mission: profile.mission
  };
}

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

  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: valibotResolver(profileSchema),
    defaultValues: profileToFormValues(snapshot.profile)
  });

  const recurringForm = useForm<RecurringMeetingFormValues>({
    resolver: valibotResolver(recurringMeetingSchema),
    defaultValues: emptyRecurringValues()
  });

  const sortedMeetings = useMemo(
    () => sortRecurringMeetings(snapshot.recurringMeetings),
    [snapshot.recurringMeetings]
  );

  const profileKey = snapshot.profile?.id ?? "new-profile";

  async function onProfileSubmit(values: ProfileFormValues) {
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

  function resetProfile() {
    profileForm.reset(profileToFormValues(snapshot.profile));
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

  const profileSaving = profileForm.formState.isSubmitting || profileSaveMutation.isPending;
  const recurringSaving = recurringForm.formState.isSubmitting || recurringSaveMutation.isPending;

  const identidadePanel = (
    <>
      <div className="form-grid">
        <Field
          label="Nome"
          placeholder="Nome completo"
          maxLength={TEXT_MAX}
          error={profileForm.formState.errors.name?.message}
          {...profileForm.register("name")}
        />
        <Field
          label="Sigla"
          placeholder="Sigla curta"
          maxLength={TEXT_MAX}
          error={profileForm.formState.errors.shortName?.message}
          {...profileForm.register("shortName")}
        />
      </div>
      <TextAreaField
        label="Tagline"
        placeholder="Subtitulo curto"
        maxLength={TEXTAREA_MAX}
        error={profileForm.formState.errors.tagline?.message}
        {...profileForm.register("tagline")}
      />
      <div className="form-grid">
        <Field
          label="Cidade"
          placeholder="Cidade, UF"
          maxLength={TEXT_MAX}
          error={profileForm.formState.errors.city?.message}
          {...profileForm.register("city")}
        />
        <Field
          label="Pastor"
          placeholder="Nome do pastor"
          maxLength={TEXT_MAX}
          error={profileForm.formState.errors.pastorName?.message}
          {...profileForm.register("pastorName")}
        />
      </div>
    </>
  );

  const contatoPanel = (
    <>
      <Field
        label="Endereco"
        placeholder="Rua, numero, bairro"
        maxLength={TEXT_MAX}
        error={profileForm.formState.errors.address?.message}
        {...profileForm.register("address")}
      />
      <div className="form-grid">
        <Field
          label="Email"
          type="email"
          placeholder="contato@exemplo.com"
          maxLength={TEXT_MAX}
          error={profileForm.formState.errors.email?.message}
          {...profileForm.register("email")}
        />
        <Field
          label="WhatsApp"
          placeholder="+55 81 90000-0000"
          maxLength={TEXT_MAX}
          error={profileForm.formState.errors.whatsapp?.message}
          {...profileForm.register("whatsapp")}
        />
      </div>
      <div className="form-grid">
        <Field
          label="Instagram"
          type="url"
          placeholder="https://instagram.com/..."
          maxLength={URL_MAX}
          error={profileForm.formState.errors.instagramUrl?.message}
          {...profileForm.register("instagramUrl")}
        />
        <Field
          label="YouTube"
          type="url"
          placeholder="https://youtube.com/..."
          maxLength={URL_MAX}
          error={profileForm.formState.errors.youtubeUrl?.message}
          {...profileForm.register("youtubeUrl")}
        />
      </div>
      <Field
        label="Google Maps"
        type="url"
        placeholder="https://maps.google.com/..."
        maxLength={URL_MAX}
        error={profileForm.formState.errors.mapsUrl?.message}
        {...profileForm.register("mapsUrl")}
      />
    </>
  );

  const conteudoPanel = (
    <>
      <TextAreaField
        label="Versiculo do hero"
        placeholder="Texto biblico exibido no banner"
        maxLength={TEXTAREA_MAX}
        error={profileForm.formState.errors.heroVerse?.message}
        {...profileForm.register("heroVerse")}
      />
      <TextAreaField
        label="Missao"
        placeholder="Declaracao de missao"
        maxLength={TEXTAREA_MAX}
        error={profileForm.formState.errors.mission?.message}
        {...profileForm.register("mission")}
      />
    </>
  );

  return (
    <section>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Identidade</p>
          <h1>Perfil da igreja</h1>
        </div>
      </header>

      <div className="editor-panel">
        <form
          key={profileKey}
          className="editor-form"
          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
          noValidate
        >
          <FieldGroup
            groups={[
              { id: "identidade", label: "Identidade", content: identidadePanel },
              { id: "contato", label: "Contato", content: contatoPanel },
              { id: "conteudo", label: "Conteudo", content: conteudoPanel }
            ]}
          />
          <FormActions saving={profileSaving} onCancel={resetProfile} />
        </form>
      </div>

      <header className="workspace-heading" style={{ marginTop: "2rem" }}>
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
