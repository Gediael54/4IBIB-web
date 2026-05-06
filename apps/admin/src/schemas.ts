import * as v from "valibot";
import { isValidOptionalHttpUrl } from "./lib/format";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "./lib/limits";

const optionalHttpUrl = v.pipe(
  v.string(),
  v.maxLength(URL_MAX, `Maximo ${URL_MAX} caracteres.`),
  v.check((value) => isValidOptionalHttpUrl(value), "Informe uma URL http/https valida.")
);

const requiredText = (max: number, label: string) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, `${label} e obrigatorio.`),
    v.maxLength(max, `Maximo ${max} caracteres.`)
  );

const localDateTime = v.pipe(
  v.string(),
  v.minLength(1, "Informe a data."),
  v.check((value) => Number.isFinite(new Date(value).getTime()), "Data invalida.")
);

const optionalLocalDateTime = v.pipe(
  v.string(),
  v.maxLength(40),
  v.check((value) => value === "" || Number.isFinite(new Date(value).getTime()), "Data invalida.")
);

const timeOfDay = v.pipe(v.string(), v.regex(/^([01]\d|2[0-3]):[0-5]\d$/u, "Use o formato HH:MM."));

const slug = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(2, "Slug obrigatorio."),
  v.maxLength(80, "Maximo 80 caracteres."),
  v.regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u, "Use letras minusculas, numeros e tracos.")
);

const hexColor = v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/u, "Use formato hex tipo #0f766e."));

const optionalYoutubeUrl = v.pipe(
  v.string(),
  v.maxLength(URL_MAX, `Maximo ${URL_MAX} caracteres.`),
  v.check((value) => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) {
      return true;
    }
    if (!isValidOptionalHttpUrl(trimmed)) {
      return false;
    }
    try {
      const host = new URL(trimmed).hostname.toLowerCase();
      return (
        host === "youtu.be" ||
        host === "youtube.com" ||
        host === "www.youtube.com" ||
        host === "m.youtube.com"
      );
    } catch {
      return false;
    }
  }, "Use uma URL do YouTube (youtube.com ou youtu.be).")
);

export const announcementSchema = v.object({
  title: requiredText(TEXT_MAX, "Titulo"),
  summary: requiredText(TEXTAREA_MAX, "Resumo"),
  category: v.picklist(["geral", "evento", "juventude", "oracao"]),
  publishedAt: localDateTime,
  pinned: v.boolean(),
  ctaLabel: v.pipe(v.string(), v.maxLength(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`)),
  ctaUrl: optionalHttpUrl,
  status: v.picklist(["draft", "scheduled", "published", "archived"]),
  expiresAt: optionalLocalDateTime,
  imageUrl: optionalHttpUrl
});

export type AnnouncementFormValues = v.InferOutput<typeof announcementSchema>;

export const scheduleSchema = v.pipe(
  v.object({
    title: requiredText(TEXT_MAX, "Titulo"),
    ministry: requiredText(TEXT_MAX, "Ministerio"),
    startsAt: localDateTime,
    endsAt: localDateTime,
    location: requiredText(TEXT_MAX, "Local"),
    summary: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX, `Maximo ${TEXTAREA_MAX} caracteres.`)),
    preacher: v.pipe(v.string(), v.maxLength(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`)),
    director: v.pipe(v.string(), v.maxLength(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`)),
    soundTeam: v.pipe(v.string(), v.maxLength(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`)),
    passage: v.pipe(v.string(), v.maxLength(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`)),
    occasionLabel: v.pipe(v.string(), v.maxLength(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`)),
    status: v.picklist(["scheduled", "suspended", "free"]),
    featured: v.boolean(),
    youtubeUrl: optionalYoutubeUrl
  }),
  v.forward(
    v.partialCheck(
      [["startsAt"], ["endsAt"]],
      (input) => new Date(input.endsAt).getTime() >= new Date(input.startsAt).getTime(),
      "Termino deve ser apos o inicio."
    ),
    ["endsAt"]
  )
);

export type ScheduleFormValues = v.InferOutput<typeof scheduleSchema>;

export const volunteerSchema = v.object({
  id: v.optional(v.string()),
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(2, "Nome obrigatorio"),
    v.maxLength(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`)
  ),
  role: v.picklist(["geral", "som"]),
  sortOrder: v.pipe(v.number(), v.integer(), v.minValue(0)),
  contact: v.pipe(v.string(), v.maxLength(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`)),
  photoUrl: optionalHttpUrl,
  ministries: v.array(v.pipe(v.string(), v.trim(), v.maxLength(TEXT_MAX))),
  unavailableDates: v.array(v.string()),
  notes: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX, `Maximo ${TEXTAREA_MAX} caracteres.`))
});

export type VolunteerFormValues = v.InferOutput<typeof volunteerSchema>;

export const profileSchema = v.object({
  name: requiredText(TEXT_MAX, "Nome"),
  shortName: requiredText(TEXT_MAX, "Sigla"),
  tagline: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX)),
  city: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  pastorName: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  address: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  email: v.pipe(
    v.string(),
    v.maxLength(TEXT_MAX),
    v.check((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value), "Email invalido.")
  ),
  whatsapp: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  instagramUrl: optionalHttpUrl,
  youtubeUrl: optionalHttpUrl,
  mapsUrl: optionalHttpUrl,
  heroVerse: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX)),
  mission: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX))
});

export type ProfileFormValues = v.InferOutput<typeof profileSchema>;

export const ministrySchema = v.object({
  id: v.optional(v.string()),
  slug,
  name: requiredText(TEXT_MAX, "Nome"),
  summary: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX)),
  meetingTime: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  contact: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  color: hexColor,
  sortOrder: v.pipe(v.number(), v.integer(), v.minValue(0))
});

export type MinistryFormValues = v.InferOutput<typeof ministrySchema>;

export const commemorationSchema = v.pipe(
  v.object({
    id: v.optional(v.string()),
    name: requiredText(TEXT_MAX, "Nome"),
    type: v.picklist(["month", "day"]),
    month: v.pipe(v.number(), v.integer(), v.minValue(1, "Mes invalido."), v.maxValue(12, "Mes invalido.")),
    dayOfMonth: v.union([
      v.null(),
      v.pipe(v.number(), v.integer(), v.minValue(1, "Dia invalido."), v.maxValue(31, "Dia invalido."))
    ]),
    description: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX)),
    color: hexColor,
    sortOrder: v.pipe(v.number(), v.integer(), v.minValue(0))
  }),
  v.forward(
    v.partialCheck(
      [["type"], ["dayOfMonth"]],
      (input) => (input.type === "day" ? input.dayOfMonth !== null : true),
      "Informe o dia do mes para datas de tipo dia."
    ),
    ["dayOfMonth"]
  )
);

export type CommemorationFormValues = v.InferOutput<typeof commemorationSchema>;

export const rotationRuleSchema = v.object({
  id: v.optional(v.string()),
  memberId: requiredText(80, "Voluntario"),
  role: v.picklist(["preacher", "director", "sound"]),
  frequency: v.picklist([
    "every_week",
    "every_2_weeks",
    "every_3_weeks",
    "every_4_weeks",
    "monthly_first",
    "monthly_second",
    "monthly_third",
    "monthly_fourth",
    "monthly_last",
    "quarterly"
  ]),
  weekday: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6)),
  ministry: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  priority: v.pipe(v.number(), v.integer(), v.minValue(0)),
  active: v.boolean(),
  notes: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX))
});

export type RotationRuleFormValues = v.InferOutput<typeof rotationRuleSchema>;

export const recurringMeetingSchema = v.pipe(
  v.object({
    id: v.optional(v.string()),
    title: requiredText(TEXT_MAX, "Titulo"),
    weekday: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6)),
    startsAt: timeOfDay,
    endsAt: timeOfDay,
    description: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX)),
    sortOrder: v.pipe(v.number(), v.integer(), v.minValue(0))
  }),
  v.forward(
    v.partialCheck(
      [["startsAt"], ["endsAt"]],
      (input) => input.endsAt > input.startsAt,
      "Termino deve ser apos o inicio."
    ),
    ["endsAt"]
  )
);

export type RecurringMeetingFormValues = v.InferOutput<typeof recurringMeetingSchema>;

const optionalDate = v.pipe(
  v.string(),
  v.maxLength(40),
  v.check((value) => value === "" || Number.isFinite(new Date(value).getTime()), "Data invalida.")
);

export const memberSchema = v.object({
  id: v.optional(v.string()),
  fullName: requiredText(TEXT_MAX, "Nome completo"),
  preferredName: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  birthDate: optionalDate,
  maritalStatus: v.picklist(["solteiro", "casado", "viuvo", "divorciado", "uniao_estavel", ""]),
  gender: v.picklist(["masculino", "feminino", "outro", ""]),
  photoUrl: optionalHttpUrl,
  cpf: v.pipe(
    v.string(),
    v.maxLength(14),
    v.check(
      (value) => value === "" || /^\d{11}$/u.test(value.replace(/\D+/g, "")),
      "CPF deve ter 11 digitos."
    )
  ),
  rg: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  rgIssuer: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  email: v.pipe(
    v.string(),
    v.maxLength(TEXT_MAX),
    v.check((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value), "Email invalido.")
  ),
  phone: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  whatsapp: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  addressZip: v.pipe(v.string(), v.maxLength(20)),
  addressStreet: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  addressNumber: v.pipe(v.string(), v.maxLength(20)),
  addressComplement: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  addressNeighborhood: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  addressCity: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  addressState: v.pipe(v.string(), v.maxLength(2)),
  householdId: v.nullable(v.string()),
  churchRole: v.picklist([
    "membro_comum",
    "presbitero",
    "diacono",
    "conselho_fiscal",
    "tesoureiro",
    "secretario",
    "pastor",
    "pastor_auxiliar"
  ]),
  membershipStatus: v.picklist(["ativo", "inativo", "transferido", "falecido"]),
  joinedAt: optionalDate,
  baptismDate: optionalDate,
  baptismLocation: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  transferredFrom: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  notes: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX)),
  isVolunteer: v.boolean(),
  volunteerMinistries: v.array(v.pipe(v.string(), v.trim(), v.maxLength(TEXT_MAX))),
  volunteerUnavailableDates: v.array(v.string()),
  volunteerNotes: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX)),
  profession: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  emergencyContactName: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  emergencyContactPhone: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  prayerTopics: v.array(v.pipe(v.string(), v.trim(), v.maxLength(TEXT_MAX))),
  spiritualGifts: v.array(v.pipe(v.string(), v.trim(), v.maxLength(TEXT_MAX))),
  allergies: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX)),
  medicalNotes: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX)),
  consentMedicalDataChecked: v.boolean(),
  consentVersion: v.pipe(v.string(), v.maxLength(40)),
  publicDirectory: v.boolean(),
  publicBio: v.pipe(v.string(), v.maxLength(500, "Maximo 500 caracteres.")),
  dataRetentionUntil: optionalDate
});

export type MemberFormValues = v.InferOutput<typeof memberSchema>;

export const householdSchema = v.object({
  id: v.optional(v.string()),
  name: requiredText(TEXT_MAX, "Nome"),
  headMemberId: v.nullable(v.string()),
  addressZip: v.pipe(v.string(), v.maxLength(20)),
  addressStreet: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  addressNumber: v.pipe(v.string(), v.maxLength(20)),
  addressComplement: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  addressNeighborhood: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  addressCity: v.pipe(v.string(), v.maxLength(TEXT_MAX)),
  addressState: v.pipe(v.string(), v.maxLength(2)),
  notes: v.pipe(v.string(), v.maxLength(TEXTAREA_MAX))
});

export type HouseholdFormValues = v.InferOutput<typeof householdSchema>;

export const inviteAdminSchema = v.object({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(3, "Informe um email."),
    v.maxLength(TEXT_MAX),
    v.check((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value), "Email invalido.")
  ),
  role: v.picklist(["owner", "editor"])
});

export type InviteAdminFormValues = v.InferOutput<typeof inviteAdminSchema>;
