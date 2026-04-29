import type { ChurchProfile, ScheduleItem } from "@4ibib/core";

export interface DisplayLocation {
  primary: string;
  secondary?: string;
}

const HOME_LOCATIONS = new Set(["", "templo principal"]);

export function displayLocation(item: ScheduleItem, profile: ChurchProfile): DisplayLocation {
  const raw = item.location?.trim() ?? "";
  if (HOME_LOCATIONS.has(raw.toLowerCase())) {
    return {
      primary: profile.shortName,
      secondary: profile.name
    };
  }
  return { primary: raw };
}

export interface OccasionStyle {
  label: string;
  background: string;
  color: string;
  border: string;
}

export function occasionStyle(label: string): OccasionStyle | null {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return {
    label: trimmed,
    background: "rgba(200, 162, 78, 0.14)",
    color: "#7a5320",
    border: "rgba(160, 115, 55, 0.45)"
  };
}
