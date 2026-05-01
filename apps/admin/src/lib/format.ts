import { formatDateLabel, formatTimeRange, type ScheduleItem } from "@4ibib/core";

export function formatScheduleDetail(item: ScheduleItem): string {
  const base = `${formatDateLabel(item.startsAt)} - ${formatTimeRange(item.startsAt, item.endsAt)} - ${item.ministry}`;
  if (item.status === "suspended") return `${base} (SUSPENSO)`;
  if (item.status === "free") return `${base} (LIVRE)`;
  return base;
}

export function normalizeOptionalHttpUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const url = new URL(trimmed);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("invalid protocol");
  }
  return url.toString();
}

export function isValidOptionalHttpUrl(value: string): boolean {
  if (!value || !value.trim()) {
    return true;
  }

  try {
    normalizeOptionalHttpUrl(value);
    return true;
  } catch {
    return false;
  }
}
