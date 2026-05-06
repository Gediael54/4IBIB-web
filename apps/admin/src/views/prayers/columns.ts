import type { PrayerStatus } from "@4ibib/core";

export interface PrayerColumnConfig {
  status: PrayerStatus;
  label: string;
  emoji: string;
  tone: "accent" | "warning" | "success";
}

export const PRAYER_COLUMNS: ReadonlyArray<PrayerColumnConfig> = [
  { status: "novo", label: "Novos", emoji: "🆕", tone: "accent" },
  { status: "em_oracao", label: "Em oração", emoji: "🙏", tone: "warning" },
  { status: "concluido", label: "Concluídos", emoji: "✅", tone: "success" }
];

export function nextStatusOptions(current: PrayerStatus): PrayerStatus[] {
  return (["novo", "em_oracao", "concluido"] as const).filter((status) => status !== current);
}

export const PRAYER_STATUS_SHORT_LABEL: Record<PrayerStatus, string> = {
  novo: "Novo",
  em_oracao: "Em oração",
  concluido: "Concluído"
};
