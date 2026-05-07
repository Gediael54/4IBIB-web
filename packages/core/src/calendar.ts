import type { ScheduleItem } from "./index";

export interface CalendarDay {
  date: Date;
  iso: string;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  weekday: number;
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  weeks: CalendarWeek[];
}

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

const WEEKDAY_LABELS_PT_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function getMonthLabel(month: number): string {
  return MONTH_LABELS_PT[month - 1] ?? `Mes ${month}`;
}

export function getWeekdayShortLabels(): readonly string[] {
  return WEEKDAY_LABELS_PT_SHORT;
}

function startOfDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setHours(0, 0, 0, 0);
  return next;
}

function isoFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildMonthCalendar(year: number, month: number, today: Date = new Date()): CalendarMonth {
  // month is 1-indexed (1 = January, 12 = December)
  const todayStart = startOfDay(today);
  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay();
  const calendarStart = new Date(year, month - 1, 1 - startWeekday);

  const weeks: CalendarWeek[] = [];
  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const days: CalendarDay[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(
        calendarStart.getFullYear(),
        calendarStart.getMonth(),
        calendarStart.getDate() + weekIndex * 7 + dayIndex
      );
      const iso = isoFromDate(date);
      const todayIso = isoFromDate(todayStart);
      days.push({
        date,
        iso,
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        isCurrentMonth: date.getMonth() + 1 === month && date.getFullYear() === year,
        isToday: iso === todayIso,
        weekday: date.getDay()
      });
    }
    weeks.push({ days });
  }

  // Drop the trailing all-out-of-month week if present (only when month fits in 5 weeks)
  const lastWeek = weeks[weeks.length - 1];
  const allOut = lastWeek.days.every((day) => !day.isCurrentMonth);
  if (allOut) weeks.pop();

  return { year, month, weeks };
}

export function groupItemsByDay(items: ScheduleItem[]): Map<string, ScheduleItem[]> {
  const map = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const date = new Date(item.startsAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = isoFromDate(date);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  for (const [, list] of map) {
    list.sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  }
  return map;
}
