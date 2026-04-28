import type { ChurchProfile, RegularMeeting, SiteSnapshot } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Field, SelectField, TextAreaField } from "../components/ui";
import { useUpdateProfile } from "../hooks";
import {
  profileSchema,
  WEEKDAY_OPTIONS,
  type ProfileFormValues,
  type RegularMeetingFormValues
} from "../schemas";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../utils";

interface ProfileViewProps {
  snapshot: SiteSnapshot;
}

const MEETING_DESCRIPTION_MAX = 500;

function meetingToFormValues(meeting: RegularMeeting): RegularMeetingFormValues {
  const weekday = (WEEKDAY_OPTIONS as readonly string[]).includes(meeting.weekday)
    ? (meeting.weekday as RegularMeetingFormValues["weekday"])
    : "Domingo";

  return {
    id: meeting.id,
    title: meeting.title,
    weekday,
    startsAt: meeting.startsAt || "19:00",
    endsAt: meeting.endsAt || "20:30",
    description: meeting.description ?? ""
  };
}

function emptyMeetingValues(): RegularMeetingFormValues {
  return {
    id: undefined,
    title: "",
    weekday: "Domingo",
    startsAt: "19:00",
    endsAt: "20:30",
    description: ""
  };
}

function profileToFormValues(profile: ChurchProfile): ProfileFormValues {
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
    mission: profile.mission,
    foundedText: profile.foundedText,
    regularMeetings: profile.regularMeetings.map(meetingToFormValues)
  };
}

export default function ProfileView({ snapshot }: ProfileViewProps) {
  const updateMutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileToFormValues(snapshot.profile)
  });

  const meetings = useFieldArray({ control, name: "regularMeetings" });

  useEffect(() => {
    reset(profileToFormValues(snapshot.profile));
  }, [snapshot.profile, reset]);

  async function onSubmit(values: ProfileFormValues) {
    const regularMeetings: RegularMeeting[] = values.regularMeetings.map((meeting, index) => ({
      id: meeting.id ?? "",
      title: meeting.title,
      weekday: meeting.weekday,
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
      time: "",
      description: meeting.description,
      sortOrder: index
    }));

    await updateMutation.mutateAsync({
      ...snapshot.profile,
      ...values,
      regularMeetings
    });
  }

  function handleRemoveMeeting(index: number, title: string) {
    const label = title.trim() || "esta reuniao";
    if (!window.confirm(`Remover "${label}" das reunioes regulares?`)) {
      return;
    }
    meetings.remove(index);
  }

  const saving = isSubmitting || updateMutation.isPending;

  return (
    <section>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Configuracao</p>
          <h1>Dados da igreja</h1>
        </div>
      </header>
      <form className="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid">
          <Field
            label="Nome"
            placeholder="Nome"
            maxLength={TEXT_MAX}
            error={errors.name?.message}
            {...register("name")}
          />
          <Field
            label="Nome curto"
            placeholder="Nome curto"
            maxLength={TEXT_MAX}
            error={errors.shortName?.message}
            {...register("shortName")}
          />
        </div>
        <Field
          label="Chamada"
          placeholder="Chamada"
          maxLength={TEXT_MAX}
          error={errors.tagline?.message}
          {...register("tagline")}
        />
        <TextAreaField
          label="Missao"
          placeholder="Missao"
          maxLength={TEXTAREA_MAX}
          error={errors.mission?.message}
          {...register("mission")}
        />
        <div className="form-grid">
          <Field
            label="Cidade"
            placeholder="Cidade"
            maxLength={TEXT_MAX}
            error={errors.city?.message}
            {...register("city")}
          />
          <Field
            label="Pastor"
            placeholder="Pastor"
            maxLength={TEXT_MAX}
            error={errors.pastorName?.message}
            {...register("pastorName")}
          />
        </div>
        <Field
          label="Endereco"
          placeholder="Endereco"
          maxLength={TEXT_MAX}
          error={errors.address?.message}
          {...register("address")}
        />
        <div className="form-grid">
          <Field
            label="Email"
            type="email"
            placeholder="Email"
            maxLength={TEXT_MAX}
            error={errors.email?.message}
            {...register("email")}
          />
          <Field
            label="WhatsApp"
            placeholder="WhatsApp"
            maxLength={TEXT_MAX}
            error={errors.whatsapp?.message}
            {...register("whatsapp")}
          />
        </div>
        <div className="form-grid">
          <Field
            label="Instagram"
            type="url"
            placeholder="Instagram"
            maxLength={URL_MAX}
            error={errors.instagramUrl?.message}
            {...register("instagramUrl")}
          />
          <Field
            label="YouTube"
            type="url"
            placeholder="YouTube"
            maxLength={URL_MAX}
            error={errors.youtubeUrl?.message}
            {...register("youtubeUrl")}
          />
        </div>
        <Field
          label="Google Maps"
          type="url"
          placeholder="Google Maps"
          maxLength={URL_MAX}
          error={errors.mapsUrl?.message}
          {...register("mapsUrl")}
        />
        <Field
          label="Versiculo"
          placeholder="Versiculo"
          maxLength={TEXTAREA_MAX}
          error={errors.heroVerse?.message}
          {...register("heroVerse")}
        />
        <Field
          label="Texto historico"
          placeholder="Texto historico"
          maxLength={TEXTAREA_MAX}
          error={errors.foundedText?.message}
          {...register("foundedText")}
        />

        <fieldset className="meetings-fieldset">
          <legend>Reunioes regulares</legend>
          {meetings.fields.length === 0 ? (
            <p className="empty-note">Nenhuma reuniao recorrente cadastrada.</p>
          ) : (
            <ul className="meetings-list">
              {meetings.fields.map((field, index) => {
                const meetingErrors = errors.regularMeetings?.[index];
                return (
                  <li className="meeting-row" key={field.id}>
                    <div className="meeting-row-header">
                      <span className="meeting-row-index">Reuniao {index + 1}</span>
                      <div className="meeting-row-actions">
                        <button
                          type="button"
                          aria-label={`Mover reuniao ${index + 1} para cima`}
                          title="Mover para cima"
                          disabled={index === 0}
                          onClick={() => meetings.move(index, index - 1)}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Mover reuniao ${index + 1} para baixo`}
                          title="Mover para baixo"
                          disabled={index === meetings.fields.length - 1}
                          onClick={() => meetings.move(index, index + 1)}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remover reuniao ${index + 1}`}
                          title="Remover"
                          onClick={() => handleRemoveMeeting(index, field.title)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <Field
                      label="Titulo"
                      placeholder="Ex: Culto de louvor"
                      maxLength={TEXT_MAX}
                      error={meetingErrors?.title?.message}
                      {...register(`regularMeetings.${index}.title` as const)}
                    />
                    <div className="form-grid">
                      <SelectField
                        label="Dia da semana"
                        error={meetingErrors?.weekday?.message}
                        {...register(`regularMeetings.${index}.weekday` as const)}
                      >
                        {WEEKDAY_OPTIONS.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </SelectField>
                      <div className="form-grid">
                        <Field
                          label="Inicio"
                          type="time"
                          error={meetingErrors?.startsAt?.message}
                          {...register(`regularMeetings.${index}.startsAt` as const)}
                        />
                        <Field
                          label="Termino"
                          type="time"
                          error={meetingErrors?.endsAt?.message}
                          {...register(`regularMeetings.${index}.endsAt` as const)}
                        />
                      </div>
                    </div>
                    <TextAreaField
                      label="Descricao"
                      placeholder="Descricao opcional"
                      maxLength={MEETING_DESCRIPTION_MAX}
                      error={meetingErrors?.description?.message}
                      {...register(`regularMeetings.${index}.description` as const)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <button
            className="button ghost"
            type="button"
            onClick={() => meetings.append(emptyMeetingValues())}
          >
            <Plus size={18} /> Adicionar reuniao
          </button>
        </fieldset>

        {updateMutation.error && (
          <p className="form-error">
            {updateMutation.error instanceof Error ? updateMutation.error.message : "Falha ao salvar."}
          </p>
        )}
        <button className="button primary" disabled={saving} type="submit">
          <Save size={18} /> Salvar igreja
        </button>
      </form>
    </section>
  );
}
