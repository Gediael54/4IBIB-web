import { z } from "zod";
import { isValidOptionalHttpUrl, TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "./utils";

const optionalHttpUrl = z
  .string()
  .max(URL_MAX, `Maximo ${URL_MAX} caracteres.`)
  .refine((value) => isValidOptionalHttpUrl(value), "Informe uma URL http/https valida.");

const requiredText = (max: number, label: string) =>
  z.string().trim().min(1, `${label} e obrigatorio.`).max(max, `Maximo ${max} caracteres.`);

const localDateTime = z
  .string()
  .min(1, "Informe a data.")
  .refine((value) => Number.isFinite(new Date(value).getTime()), "Data invalida.");

const optionalLocalDateTime = z
  .string()
  .max(40)
  .refine((value) => value === "" || Number.isFinite(new Date(value).getTime()), "Data invalida.");

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u, "Use o formato HH:MM.");

const slug = z
  .string()
  .trim()
  .min(2, "Slug obrigatorio.")
  .max(80, "Maximo 80 caracteres.")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u, "Use letras minusculas, numeros e tracos.");

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/u, "Use formato hex tipo #0f766e.");

export const announcementSchema = z.object({
  title: requiredText(TEXT_MAX, "Titulo"),
  summary: requiredText(TEXTAREA_MAX, "Resumo"),
  category: z.enum(["geral", "evento", "juventude", "oracao"]),
  publishedAt: localDateTime,
  pinned: z.boolean(),
  ctaLabel: z.string().max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
  ctaUrl: optionalHttpUrl,
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  expiresAt: optionalLocalDateTime,
  imageUrl: optionalHttpUrl
});

export type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export const scheduleSchema = z
  .object({
    title: requiredText(TEXT_MAX, "Titulo"),
    ministry: requiredText(TEXT_MAX, "Ministerio"),
    startsAt: localDateTime,
    endsAt: localDateTime,
    location: requiredText(TEXT_MAX, "Local"),
    summary: z.string().max(TEXTAREA_MAX, `Maximo ${TEXTAREA_MAX} caracteres.`),
    preacher: z.string().max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
    director: z.string().max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
    soundTeam: z.string().max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
    passage: z.string().max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
    occasionLabel: z.string().max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
    status: z.enum(["scheduled", "suspended", "free"]),
    featured: z.boolean()
  })
  .refine((value) => new Date(value.endsAt).getTime() >= new Date(value.startsAt).getTime(), {
    message: "Termino deve ser apos o inicio.",
    path: ["endsAt"]
  });

export type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export const volunteerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nome obrigatorio").max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
  role: z.enum(["geral", "som"]),
  sortOrder: z.number().int().min(0),
  contact: z.string().max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
  photoUrl: optionalHttpUrl,
  ministries: z.array(z.string().trim().max(TEXT_MAX)),
  unavailableDates: z.array(z.string()),
  notes: z.string().max(TEXTAREA_MAX, `Maximo ${TEXTAREA_MAX} caracteres.`)
});

export type VolunteerFormValues = z.infer<typeof volunteerSchema>;

export const profileSchema = z.object({
  name: requiredText(TEXT_MAX, "Nome"),
  shortName: requiredText(TEXT_MAX, "Sigla"),
  tagline: z.string().max(TEXTAREA_MAX),
  city: z.string().max(TEXT_MAX),
  pastorName: z.string().max(TEXT_MAX),
  address: z.string().max(TEXT_MAX),
  email: z
    .string()
    .max(TEXT_MAX)
    .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value), "Email invalido."),
  whatsapp: z.string().max(TEXT_MAX),
  instagramUrl: optionalHttpUrl,
  youtubeUrl: optionalHttpUrl,
  mapsUrl: optionalHttpUrl,
  heroVerse: z.string().max(TEXTAREA_MAX),
  mission: z.string().max(TEXTAREA_MAX)
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const ministrySchema = z.object({
  id: z.string().optional(),
  slug,
  name: requiredText(TEXT_MAX, "Nome"),
  summary: z.string().max(TEXTAREA_MAX),
  meetingTime: z.string().max(TEXT_MAX),
  contact: z.string().max(TEXT_MAX),
  color: hexColor,
  sortOrder: z.number().int().min(0)
});

export type MinistryFormValues = z.infer<typeof ministrySchema>;

export const recurringMeetingSchema = z
  .object({
    id: z.string().optional(),
    title: requiredText(TEXT_MAX, "Titulo"),
    weekday: z.number().int().min(0).max(6),
    startsAt: timeOfDay,
    endsAt: timeOfDay,
    description: z.string().max(TEXTAREA_MAX),
    sortOrder: z.number().int().min(0)
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "Termino deve ser apos o inicio.",
    path: ["endsAt"]
  });

export type RecurringMeetingFormValues = z.infer<typeof recurringMeetingSchema>;

export const inviteAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, "Informe um email.")
    .max(TEXT_MAX)
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value), "Email invalido."),
  role: z.enum(["owner", "editor"])
});

export type InviteAdminFormValues = z.infer<typeof inviteAdminSchema>;
