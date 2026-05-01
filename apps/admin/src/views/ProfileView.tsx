import {
  sortRecurringMeetings,
  type ChurchProfile,
  type RecurringMeetingRecord,
  type SiteSnapshot
} from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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

  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileToFormValues(snapshot.profile)
  });

  const recurringForm = useForm<RecurringMeetingFormValues>({
    resolver: zodResolver(recurringMeetingSchema),
    defaultValues: emptyRecurringValues()
  });

  const sortedMeetings = useMemo(
    () => sortRecurringMeetings(snapshot.recurringMeetings),
    [snapshot.recurringMeetings]
  );

  const profileKey = snapshot.profile?.id ?? "new-profile";

  async function onProfileSubmit(values: ProfileFormValues) {
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
    await recurringSaveMutation.mutateAsync({
      id: editingMeetingId ?? undefined,
      title: values.title,
      weekday: values.weekday,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      description: values.description,
      sortOrder: values.sortOrder
    });
    cancelEditMeeting();
  }

  async function handleDeleteMeeting(item: RecurringMeetingRecord) {
    if (!window.confirm(`Excluir encontro "${item.title}"?`)) {
      return;
    }
    await recurringDeleteMutation.mutateAsync(item.id);
    if (editingMeetingId === item.id) {
      cancelEditMeeting();
    }
  }

  const profileSaving = profileForm.formState.isSubmitting || profileSaveMutation.isPending;
  const recurringSaving = recurringForm.formState.isSubmitting || recurringSaveMutation.isPending;

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
          {profileSaveMutation.error && (
            <p className="form-error">
              {profileSaveMutation.error instanceof Error
                ? profileSaveMutation.error.message
                : "Falha ao salvar."}
            </p>
          )}
          <FormActions saving={profileSaving} onCancel={resetProfile} />
        </form>
      </div>

      <header className="workspace-heading" style={{ marginTop: "2rem" }}>
        <div>
          <p className="eyebrow">Programacao semanal fixa</p>
          <h2>Encontros regulares</h2>
        </div>
      </header>

      <div className="crud-layout">
        <div className="list-panel">
          {sortedMeetings.map((item) => (
            <article key={item.id} className="item-row">
              <div>
                <strong>{item.title}</strong>
                <span>
                  {WEEKDAY_LABELS[item.weekday]} - {formatTimeRange(item.startsAt, item.endsAt)}
                </span>
              </div>
              <div className="row-actions">
                <button onClick={() => startEditMeeting(item)} type="button">
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteMeeting(item)}
                  type="button"
                  aria-label={`Excluir encontro ${item.title}`}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {sortedMeetings.length === 0 && <p className="empty-note">Nenhum encontro regular cadastrado.</p>}
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
            {recurringSaveMutation.error && (
              <p className="form-error">
                {recurringSaveMutation.error instanceof Error
                  ? recurringSaveMutation.error.message
                  : "Falha ao salvar."}
              </p>
            )}
            <FormActions saving={recurringSaving} onCancel={cancelEditMeeting} />
          </form>
        </div>
      </div>
    </section>
  );
}
