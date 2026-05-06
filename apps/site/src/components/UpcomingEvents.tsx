import { useMemo } from "react";
import { getUpcomingSchedule } from "@4ibib/core";
import type { Commemoration, ScheduleItem } from "@4ibib/core";
import { formatMonthShort, formatWeekdayShort, getZonedParts } from "../lib/date";
import { monthThemesFor } from "../lib/event";
import { getCurrentMonthCommemorations } from "../lib/commemoration";
import EventCard from "./EventCard";
import MonthBanner from "./MonthBanner";

export interface UpcomingEventsProps {
  schedule: ScheduleItem[];
  commemorations?: Commemoration[];
  limit?: number;
}

function buildDayLabel(iso: string): string {
  const parts = getZonedParts(iso);
  const weekday = formatWeekdayShort(iso);
  const month = formatMonthShort(iso);
  return `${weekday} · ${parts.day} ${month}`;
}

export default function UpcomingEvents({ schedule, commemorations = [], limit = 5 }: UpcomingEventsProps) {
  const upcoming = useMemo(() => getUpcomingSchedule(schedule, limit), [schedule, limit]);
  const themes = useMemo(() => monthThemesFor(upcoming), [upcoming]);
  const monthHighlights = useMemo(() => getCurrentMonthCommemorations(commemorations), [commemorations]);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <>
      {themes.length > 0 && (
        <aside className="month-theme-banner" aria-label="Tema do mês">
          {themes.map((theme) => (
            <p key={theme.monthKey}>
              <span className="month-theme-banner-month">{theme.monthLabel}</span>
              <span className="month-theme-banner-sep" aria-hidden="true">
                ·
              </span>
              <span className="month-theme-banner-label">{theme.theme}</span>
            </p>
          ))}
        </aside>
      )}
      <MonthBanner highlights={monthHighlights} />
      <ul className="upcoming-events" aria-label="Próximos eventos">
        {upcoming.map((item) => (
          <li key={item.id}>
            <EventCard
              item={item}
              compact
              showDay
              dayLabel={buildDayLabel(item.startsAt)}
              commemorations={commemorations}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
