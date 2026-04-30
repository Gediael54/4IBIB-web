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
  sortOrder: z.number().int().min(0)
});

export type VolunteerFormValues = z.infer<typeof volunteerSchema>;
