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

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function occasionStyle(label: string): OccasionStyle | null {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  const key = normalize(trimmed);
  if (key.includes("PASCOA")) {
    return {
      label: trimmed,
      background: "#ede9fe",
      color: "#5b21b6",
      border: "#c4b5fd"
    };
  }
  if (key.includes("MISSO")) {
    return {
      label: trimmed,
      background: "#ccfbf1",
      color: "#0f766e",
      border: "#5eead4"
    };
  }
  if (key.includes("NATAL")) {
    return {
      label: trimmed,
      background: "#ffe4e6",
      color: "#9f1239",
      border: "#fda4af"
    };
  }
  if (key.includes("CARNAVAL")) {
    return {
      label: trimmed,
      background: "#fef3c7",
      color: "#92400e",
      border: "#fcd34d"
    };
  }
  return {
    label: trimmed,
    background: "#fde68a",
    color: "#78350f",
    border: "#fcd34d"
  };
}
