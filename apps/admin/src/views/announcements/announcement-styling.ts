import type { AnnouncementCategory, AnnouncementStatus } from "@4ibib/core";

export const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  geral: "Geral",
  evento: "Evento",
  juventude: "Juventude",
  oracao: "Oração"
};

export const CATEGORY_ICON_STYLES: Record<AnnouncementCategory, { background: string; color: string }> = {
  geral: { background: "var(--accent-soft)", color: "var(--accent)" },
  evento: { background: "var(--info-soft)", color: "var(--info)" },
  juventude: { background: "var(--warning-soft)", color: "var(--warning)" },
  oracao: { background: "var(--success-soft)", color: "var(--success)" }
};

export const STATUS_BADGE_LABELS: Record<AnnouncementStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  published: "Publicado",
  archived: "Arquivado"
};

export function statusToCardStatus(
  status: AnnouncementStatus
): "default" | "success" | "warning" | "danger" | "muted" {
  if (status === "published") return "success";
  if (status === "scheduled") return "warning";
  if (status === "archived") return "muted";
  return "default";
}
