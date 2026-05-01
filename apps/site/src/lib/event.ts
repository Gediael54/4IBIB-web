import type { ScheduleItem } from "@4ibib/core";
import { CHURCH } from "../config/church";
import { formatMonthShort, getMonthKey } from "./date";

export interface DisplayLocation {
  primary: string;
  secondary?: string;
  isHome: boolean;
}

const HOME_LOCATIONS = new Set(["", "templo principal"]);

export function displayLocation(item: ScheduleItem): DisplayLocation {
  const raw = item.location?.trim() ?? "";
  if (HOME_LOCATIONS.has(raw.toLowerCase())) {
    return {
      primary: CHURCH.shortName,
      secondary: CHURCH.name,
      isHome: true
    };
  }
  return { primary: raw, isHome: false };
}

export interface OccasionStyle {
  label: string;
  background: string;
  color: string;
  border: string;
}

export function isMonthTheme(label: string | undefined | null): boolean {
  const trimmed = (label ?? "").trim();
  if (!trimmed) return false;
  return /^MES\s+D[AEO]\b/i.test(trimmed);
}

export function occasionStyle(label: string): OccasionStyle | null {
  const trimmed = label?.trim() ?? "";
  if (!trimmed || isMonthTheme(trimmed)) {
    return null;
  }
  return {
    label: trimmed,
    background: "rgba(200, 162, 78, 0.14)",
    color: "#7a5320",
    border: "rgba(160, 115, 55, 0.45)"
  };
}

export interface MonthTheme {
  monthKey: string;
  monthLabel: string;
  theme: string;
}

export function monthThemesFor(items: ScheduleItem[]): MonthTheme[] {
  const seen = new Map<string, MonthTheme>();
  for (const item of items) {
    const label = item.occasionLabel?.trim() ?? "";
    if (!isMonthTheme(label)) continue;
    const { key } = getMonthKey(item.startsAt);
    if (seen.has(key)) continue;
    seen.set(key, {
      monthKey: key,
      monthLabel: formatMonthShort(item.startsAt),
      theme: label
    });
  }
  return Array.from(seen.values()).sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1));
}

export function splitNames(value: string | undefined | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function getSoundTeam(item: ScheduleItem): string {
  return item.soundTeam ?? "";
}

export function nameMatches(item: ScheduleItem, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return false;
  }
  const haystack = [item.preacher, item.director, item.soundTeam ?? ""]
    .filter(Boolean)
    .join(" · ")
    .toLowerCase();
  return haystack.includes(trimmed);
}

export type ScheduleCategory = "all" | "cultos" | "estudos" | "especiais";

export function categoryOf(item: ScheduleItem): Exclude<ScheduleCategory, "all"> {
  const ministry = (item.ministry ?? "").toLowerCase();
  if (ministry === "culto" || ministry === "culto-solene") {
    return "cultos";
  }
  if (ministry === "escola-biblica") {
    return "estudos";
  }
  return "especiais";
}
