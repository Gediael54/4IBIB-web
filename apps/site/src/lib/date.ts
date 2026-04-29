export const TIME_ZONE = "America/Recife";

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric"
});

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  timeZone: TIME_ZONE
});

const weekdayShortFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: TIME_ZONE
});

const monthShortFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: TIME_ZONE
});

const partsFormatter = new Intl.DateTimeFormat("pt-BR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE
});

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function getZonedParts(value: string | Date): ZonedParts {
  const date = value instanceof Date ? value : new Date(value);
  const parts = partsFormatter.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute)
  };
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMonthLabel(date: Date): string {
  return capitalize(monthLabelFormatter.format(date));
}

export function formatWeekdayLong(value: string): string {
  const raw = weekdayFormatter.format(new Date(value));
  return capitalize(raw.replace("-feira", ""));
}

export function formatWeekdayShort(value: string): string {
  const raw = weekdayShortFormatter.format(new Date(value));
  return capitalize(raw.replace(".", "").replace("-feira", ""));
}

export function formatMonthShort(value: string): string {
  return monthShortFormatter.format(new Date(value)).replace(".", "");
}

export function formatTime(value: string): string {
  const parts = getZonedParts(value);
  const hour = String(parts.hour);
  const minute = String(parts.minute).padStart(2, "0");
  return `${hour}h${minute}`;
}

export function daysInMonth(year: number, monthNumber: number): number {
  return new Date(year, monthNumber, 0).getDate();
}

export function weekdayOfFirstDay(year: number, monthNumber: number): number {
  return new Date(year, monthNumber - 1, 1).getDay();
}

export function isoForDay(year: number, monthNumber: number, day: number): string {
  const mm = String(monthNumber).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}T12:00:00.000Z`;
}
