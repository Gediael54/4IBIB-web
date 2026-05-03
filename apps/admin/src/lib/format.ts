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

export function maskCpf(value: string): string {
  const digits = value.replace(/\D+/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function unmaskDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

export function maskCep(value: string): string {
  const digits = value.replace(/\D+/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
