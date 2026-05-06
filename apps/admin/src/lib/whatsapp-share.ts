import {
  formatDateLabel,
  formatDateTime,
  type Announcement,
  type Commemoration,
  type ScheduleItem
} from "@4ibib/core";

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "https://4ibib-web.pages.dev").replace(/\/$/, "");

const MONTH_LABELS_PT = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

export function buildAnnouncementMessage(announcement: Announcement): string {
  const lines = [
    `*${announcement.title}*`,
    "",
    announcement.summary,
    "",
    `Mais detalhes: ${SITE_URL}/#avisos`
  ];
  if (announcement.ctaUrl) {
    lines.push("", announcement.ctaLabel || "Saiba mais", announcement.ctaUrl);
  }
  return lines.filter((line) => line !== undefined).join("\n");
}

export function buildScheduleMessage(item: ScheduleItem): string {
  const lines = [`*${item.title}*`, formatDateTime(item.startsAt)];
  if (item.preacher) lines.push(`Pregador: ${item.preacher}`);
  if (item.passage) lines.push(`Leitura: ${item.passage}`);
  if (item.location) lines.push(`Local: ${item.location}`);
  lines.push("", `Programacao completa: ${SITE_URL}/#programacao`);
  if (item.youtubeUrl) lines.push("", `Transmissao: ${item.youtubeUrl}`);
  return lines.join("\n");
}

export function buildScheduleSuspendedMessage(item: ScheduleItem, reason: string = ""): string {
  const lines = [`⚠️ *${item.title} — SUSPENSO*`, formatDateTime(item.startsAt)];
  if (reason.trim()) {
    lines.push("", `Motivo: ${reason.trim()}`);
  }
  lines.push("", `Programacao completa: ${SITE_URL}/#programacao`);
  return lines.join("\n");
}

export function buildScheduleRescheduledMessage(
  item: ScheduleItem,
  previousStartsAt: string,
  reason: string = ""
): string {
  const lines = [
    `⏰ *${item.title} — REMARCADO*`,
    `Era: ${formatDateTime(previousStartsAt)}`,
    `Agora: ${formatDateTime(item.startsAt)}`
  ];
  if (reason.trim()) {
    lines.push("", `Motivo: ${reason.trim()}`);
  }
  lines.push("", `Programacao completa: ${SITE_URL}/#programacao`);
  return lines.join("\n");
}

export function buildCommemorationMessage(item: Commemoration): string {
  const monthLabel = MONTH_LABELS_PT[item.month - 1] ?? `Mes ${item.month}`;
  const heading =
    item.type === "month"
      ? `*${item.name}* — ${monthLabel}`
      : `*${item.name}* — ${item.dayOfMonth} de ${monthLabel}`;
  const lines = [heading];
  if (item.description) {
    lines.push("", item.description);
  }
  lines.push("", `Mais sobre a igreja: ${SITE_URL}`);
  return lines.join("\n");
}

export function buildPrayerInviteMessage(): string {
  return [
    "Pedido de oracao recebido na 4a IBIB",
    "",
    "Continue orando junto com a igreja:",
    `${SITE_URL}/#contato`
  ].join("\n");
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copyMessageToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const __test__ = {
  SITE_URL,
  formatDateLabel
};
