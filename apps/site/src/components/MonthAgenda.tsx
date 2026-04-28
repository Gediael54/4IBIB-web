import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { ScheduleItem } from "@4ibib/core";

const TIME_ZONE = "America/Recife";

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric"
});

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
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

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function getZonedParts(value: string): ZonedParts {
  const parts = partsFormatter.formatToParts(new Date(value));
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

function formatMonthLabel(date: Date): string {
  return capitalize(monthLabelFormatter.format(date));
}

function formatWeekdayLabel(value: string): string {
  const raw = weekdayFormatter.format(new Date(value));
  return capitalize(raw.replace("-feira", ""));
}

function formatTime(value: string): string {
  const parts = getZonedParts(value);
  const hour = String(parts.hour);
  const minute = String(parts.minute).padStart(2, "0");
  return `${hour}h${minute}`;
}

interface DayGroup {
  key: string;
  day: number;
  weekday: string;
  isoForLabel: string;
  items: ScheduleItem[];
}

function buildDayGroups(items: ScheduleItem[], year: number, month: number): DayGroup[] {
  const groups = new Map<number, DayGroup>();

  for (const item of items) {
    const parts = getZonedParts(item.startsAt);
    if (parts.year !== year || parts.month !== month) {
      continue;
    }
    const existing = groups.get(parts.day);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(parts.day, {
        key: `${parts.year}-${parts.month}-${parts.day}`,
        day: parts.day,
        weekday: formatWeekdayLabel(item.startsAt),
        isoForLabel: item.startsAt,
        items: [item]
      });
    }
  }

  const ordered = Array.from(groups.values()).sort((left, right) => left.day - right.day);
  for (const group of ordered) {
    group.items.sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  }
  return ordered;
}

function classNamesForItem(item: ScheduleItem): string {
  const classes = ["agenda-event"];
  if (item.status === "suspended") {
    classes.push("suspended");
  }
  if (item.status === "free") {
    classes.push("free");
  }
  if (item.featured) {
    classes.push("featured");
  }
  return classes.join(" ");
}

export interface MonthAgendaProps {
  schedule: ScheduleItem[];
  initialMonth?: Date;
}

export default function MonthAgenda({ schedule, initialMonth }: MonthAgendaProps) {
  const [viewedMonth, setViewedMonth] = useState<Date>(() => startOfMonth(initialMonth ?? new Date()));

  const year = viewedMonth.getFullYear();
  const monthNumber = viewedMonth.getMonth() + 1;

  const dayGroups = useMemo(() => buildDayGroups(schedule, year, monthNumber), [schedule, year, monthNumber]);

  const monthLabel = formatMonthLabel(viewedMonth);

  return (
    <div className="month-agenda">
      <div className="month-agenda-header">
        <button
          type="button"
          className="month-agenda-nav"
          aria-label="Mes anterior"
          onClick={() => setViewedMonth((current) => addMonths(current, -1))}
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="month-agenda-title" aria-live="polite">
          {monthLabel}
        </h3>
        <button
          type="button"
          className="month-agenda-nav"
          aria-label="Proximo mes"
          onClick={() => setViewedMonth((current) => addMonths(current, 1))}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {dayGroups.length === 0 ? (
        <p className="empty">Nenhum evento neste mes.</p>
      ) : (
        <ol className="month-agenda-days">
          {dayGroups.map((group) => (
            <li key={group.key} className="agenda-day">
              <h4 className="agenda-day-title">
                {group.weekday} <span aria-hidden="true">·</span>{" "}
                <span className="agenda-day-number">{group.day}</span>
              </h4>
              <ul className="agenda-day-events">
                {group.items.map((item) => (
                  <li key={item.id} className={classNamesForItem(item)}>
                    <time className="agenda-event-time" dateTime={item.startsAt}>
                      {formatTime(item.startsAt)}
                    </time>
                    <div className="agenda-event-body">
                      <p className="agenda-event-title">{item.title}</p>
                      {(item.preacher || item.location) && (
                        <p className="agenda-event-meta">
                          {[item.preacher, item.location].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {item.occasionLabel && <p className="agenda-event-occasion">{item.occasionLabel}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
