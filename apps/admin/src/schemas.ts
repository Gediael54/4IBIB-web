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

export const announcementSchema = z.object({
  title: requiredText(TEXT_MAX, "Titulo"),
  summary: requiredText(TEXTAREA_MAX, "Resumo"),
  category: z.enum(["geral", "evento", "juventude", "oracao"]),
  publishedAt: localDateTime,
  pinned: z.boolean(),
  ctaLabel: z.string().max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
  ctaUrl: optionalHttpUrl
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

export const ministrySchema = z.object({
  name: requiredText(TEXT_MAX, "Nome"),
  summary: requiredText(TEXTAREA_MAX, "Resumo"),
  meetingTime: requiredText(TEXT_MAX, "Horario"),
  contact: requiredText(TEXT_MAX, "Contato"),
  color: z.string().min(1, "Cor e obrigatoria.")
});

export type MinistryFormValues = z.infer<typeof ministrySchema>;

export const profileSchema = z.object({
  name: requiredText(TEXT_MAX, "Nome"),
  shortName: requiredText(TEXT_MAX, "Nome curto"),
  tagline: requiredText(TEXT_MAX, "Chamada"),
  city: requiredText(TEXT_MAX, "Cidade"),
  pastorName: requiredText(TEXT_MAX, "Pastor"),
  address: requiredText(TEXT_MAX, "Endereco"),
  email: z.string().email("Email invalido.").max(TEXT_MAX, `Maximo ${TEXT_MAX} caracteres.`),
  whatsapp: requiredText(TEXT_MAX, "WhatsApp"),
  instagramUrl: optionalHttpUrl,
  youtubeUrl: optionalHttpUrl,
  mapsUrl: optionalHttpUrl,
  heroVerse: requiredText(TEXTAREA_MAX, "Versiculo"),
  mission: requiredText(TEXTAREA_MAX, "Missao"),
  foundedText: requiredText(TEXTAREA_MAX, "Texto historico")
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
