import type { AdminRole, AnnouncementStatus, AuditAction, PrayerStatus, VolunteerRole } from "@4ibib/core";
import type { VolunteerRoleFilter } from "./list-state";

export const ANNOUNCEMENT_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "scheduled", label: "Agendado" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" }
] as const satisfies ReadonlyArray<{ value: "all" | AnnouncementStatus; label: string }>;

export const PRAYER_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "em_oracao", label: "Em oracao" },
  { value: "concluido", label: "Concluido" }
] as const satisfies ReadonlyArray<{ value: "all" | PrayerStatus; label: string }>;

export const VOLUNTEER_ROLE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "geral", label: "Geral" },
  { value: "som", label: "Som" }
] as const satisfies ReadonlyArray<{ value: VolunteerRoleFilter; label: string }>;

export const AUDIT_TABLE_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "announcements", label: "Avisos" },
  { value: "schedule_items", label: "Programacao" },
  { value: "volunteers", label: "Voluntarios" },
  { value: "prayer_requests", label: "Oracao" },
  { value: "church_profile", label: "Perfil" },
  { value: "ministries", label: "Ministerios" },
  { value: "recurring_meetings", label: "Encontros regulares" }
] as const;

export const AUDIT_ACTION_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "INSERT", label: "Criacao" },
  { value: "UPDATE", label: "Edicao" },
  { value: "DELETE", label: "Exclusao" }
] as const satisfies ReadonlyArray<{ value: "all" | AuditAction; label: string }>;

export const ADMIN_ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" }
] as const satisfies ReadonlyArray<{ value: AdminRole; label: string }>;

export const WEEKDAY_LABELS: readonly string[] = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado"
];

function labelsFromOptions<TValue extends string, TExclude extends TValue = never>(
  options: ReadonlyArray<{ value: TValue; label: string }>,
  exclude?: TExclude
): Record<Exclude<TValue, TExclude>, string> {
  const result = {} as Record<Exclude<TValue, TExclude>, string>;
  for (const option of options) {
    if (option.value === exclude) continue;
    result[option.value as Exclude<TValue, TExclude>] = option.label;
  }
  return result;
}

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = labelsFromOptions(
  ANNOUNCEMENT_STATUS_OPTIONS,
  "all"
);
export const PRAYER_STATUS_LABELS: Record<PrayerStatus, string> = labelsFromOptions(
  PRAYER_STATUS_OPTIONS,
  "all"
);
export const VOLUNTEER_ROLE_LABELS: Record<VolunteerRole, string> = labelsFromOptions(
  VOLUNTEER_ROLE_OPTIONS,
  "all"
);
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = labelsFromOptions(ADMIN_ROLE_OPTIONS);
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = labelsFromOptions(
  AUDIT_ACTION_OPTIONS,
  "all"
);
