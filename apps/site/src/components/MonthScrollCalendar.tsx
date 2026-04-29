import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ChurchProfile, ScheduleItem } from "@4ibib/core";
import {
  addMonths,
  daysInMonth,
  formatMonthLabel,
  formatMonthShort,
  formatWeekdayLong,
  getZonedParts,
  isoForDay,
  startOfMonth,
  weekdayOfFirstDay
} from "../lib/date";
import { occasionStyle } from "../lib/event";
import EventCard from "./EventCard";

const WEEKDAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

interface DayGroup {
  day: number;
  weekday: string;
  isoForLabel: string;
  items: ScheduleItem[];
}

function buildDayGroups(items: ScheduleItem[], year: number, monthNumber: number): DayGroup[] {
  const map = new Map<number, DayGroup>();
  for (const item of items) {
    const parts = getZonedParts(item.startsAt);
    if (parts.year !== year || parts.month !== monthNumber) {
      continue;
    }
    const existing = map.get(parts.day);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(parts.day, {
        day: parts.day,
        weekday: formatWeekdayLong(item.startsAt),
        isoForLabel: item.startsAt,
        items: [item]
      });
    }
  }
  const ordered = Array.from(map.values()).sort((left, right) => left.day - right.day);
  for (const group of ordered) {
    group.items.sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  }
  return ordered;
}

interface GridCell {
  key: string;
  day: number | null;
  hasEvent: boolean;
  isToday: boolean;
}

function buildGrid(year: number, monthNumber: number, dayGroups: DayGroup[], todayKey: string): GridCell[] {
  const total = daysInMonth(year, monthNumber);
  const offset = weekdayOfFirstDay(year, monthNumber);
  const eventDays = new Set(dayGroups.map((group) => group.day));
  const cells: GridCell[] = [];
  for (let i = 0; i < offset; i += 1) {
    cells.push({ key: `pad-start-${i}`, day: null, hasEvent: false, isToday: false });
  }
  for (let day = 1; day <= total; day += 1) {
    const dayKey = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      key: dayKey,
      day,
      hasEvent: eventDays.has(day),
      isToday: dayKey === todayKey
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({
      key: `pad-end-${cells.length}`,
      day: null,
      hasEvent: false,
      isToday: false
    });
  }
  return cells;
}

function cellClassName(cell: GridCell): string {
  const classes = ["month-grid-cell"];
  if (!cell.day) classes.push("empty");
  if (cell.hasEvent) classes.push("has-event");
  if (cell.isToday) classes.push("today");
  return classes.join(" ");
}

export interface MonthScrollCalendarProps {
  schedule: ScheduleItem[];
  profile: ChurchProfile;
  initialMonth?: Date;
}

export default function MonthScrollCalendar({ schedule, profile, initialMonth }: MonthScrollCalendarProps) {
  const [viewedMonth, setViewedMonth] = useState<Date>(() => startOfMonth(initialMonth ?? new Date()));
  const dayRefs = useRef<Map<number, HTMLElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const year = viewedMonth.getFullYear();
  const monthNumber = viewedMonth.getMonth() + 1;

  const todayKey = useMemo(() => {
    const parts = getZonedParts(new Date());
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  }, []);

  const dayGroups = useMemo(() => buildDayGroups(schedule, year, monthNumber), [schedule, year, monthNumber]);

  const grid = useMemo(
    () => buildGrid(year, monthNumber, dayGroups, todayKey),
    [year, monthNumber, dayGroups, todayKey]
  );

  const monthOccasion = useMemo(() => {
    for (const group of dayGroups) {
      for (const item of group.items) {
        if (item.occasionLabel) {
          return item.occasionLabel;
        }
      }
    }
    return null;
  }, [dayGroups]);

  const occasion = monthOccasion ? occasionStyle(monthOccasion) : null;
  const monthLabel = formatMonthLabel(viewedMonth);
  const monthShortFromIso = formatMonthShort(isoForDay(year, monthNumber, 15));

  function handleDayClick(day: number) {
    const target = dayRefs.current.get(day);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="month-scroll" ref={containerRef}>
      <div className="month-scroll-sticky">
        <div className="month-scroll-header">
          <button
            type="button"
            className="month-scroll-nav"
            aria-label="Mes anterior"
            onClick={() => setViewedMonth((current) => addMonths(current, -1))}
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="month-scroll-title" aria-live="polite">
            {monthLabel}
          </h3>
          <button
            type="button"
            className="month-scroll-nav"
            aria-label="Proximo mes"
            onClick={() => setViewedMonth((current) => addMonths(current, 1))}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        {occasion && (
          <p
            className="month-scroll-occasion"
            style={{
              background: occasion.background,
              color: occasion.color,
              borderColor: occasion.border
            }}
          >
            {occasion.label}
          </p>
        )}
        <div className="month-grid" role="grid" aria-label={`Calendario de ${monthLabel}`}>
          <div className="month-grid-weekdays" role="row">
            {WEEKDAY_HEADERS.map((label) => (
              <span key={label} role="columnheader">
                {label}
              </span>
            ))}
          </div>
          <div className="month-grid-days">
            {grid.map((cell) =>
              cell.day === null ? (
                <span key={cell.key} className={cellClassName(cell)} aria-hidden="true" />
              ) : (
                <button
                  key={cell.key}
                  type="button"
                  className={cellClassName(cell)}
                  onClick={() => cell.hasEvent && handleDayClick(cell.day!)}
                  disabled={!cell.hasEvent}
                  aria-label={
                    cell.hasEvent ? `Ir para eventos do dia ${cell.day}` : `Dia ${cell.day} sem eventos`
                  }
                  aria-current={cell.isToday ? "date" : undefined}
                >
                  {cell.day}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="month-scroll-timeline">
        {dayGroups.length === 0 ? (
          <p className="month-scroll-empty">Nenhum evento neste mes.</p>
        ) : (
          dayGroups.map((group) => (
            <section
              key={group.day}
              ref={(el) => {
                dayRefs.current.set(group.day, el);
              }}
              className="timeline-day"
              aria-label={`${group.weekday} ${group.day}`}
            >
              <h4 className="timeline-day-header">
                <span>
                  {group.weekday} · {group.day} {monthShortFromIso}
                </span>
              </h4>
              <ul className="timeline-day-events">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <EventCard item={item} profile={profile} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
