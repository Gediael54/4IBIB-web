const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

interface RelativeUnit {
  threshold: number;
  divisor: number;
  unit: Intl.RelativeTimeFormatUnit;
}

const UNITS: ReadonlyArray<RelativeUnit> = [
  { threshold: MINUTE, divisor: SECOND, unit: "second" },
  { threshold: HOUR, divisor: MINUTE, unit: "minute" },
  { threshold: DAY, divisor: HOUR, unit: "hour" },
  { threshold: WEEK, divisor: DAY, unit: "day" },
  { threshold: MONTH, divisor: WEEK, unit: "week" },
  { threshold: YEAR, divisor: MONTH, unit: "month" }
];

export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
  const target = value instanceof Date ? value : new Date(value);
  const targetMs = target.getTime();
  if (Number.isNaN(targetMs)) {
    return "";
  }

  const diffMs = targetMs - now.getTime();
  const absDiff = Math.abs(diffMs);

  if (absDiff < 30 * SECOND) {
    return "agora mesmo";
  }

  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto", style: "long" });

  for (const { threshold, divisor, unit } of UNITS) {
    if (absDiff < threshold) {
      const value = Math.round(diffMs / divisor);
      return formatter.format(value, unit);
    }
  }

  const years = Math.round(diffMs / YEAR);
  return formatter.format(years, "year");
}
