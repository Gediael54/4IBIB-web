import { useMemo } from "react";
import { getUpcomingSchedule } from "@4ibib/core";
import type { ScheduleItem } from "@4ibib/core";
import { formatMonthShort, formatWeekdayShort, getZonedParts } from "../lib/date";
import EventCard from "./EventCard";

export interface UpcomingEventsProps {
  schedule: ScheduleItem[];
  limit?: number;
}

function buildDayLabel(iso: string): string {
  const parts = getZonedParts(iso);
  const weekday = formatWeekdayShort(iso);
  const month = formatMonthShort(iso);
  return `${weekday} · ${parts.day} ${month}`;
}

export default function UpcomingEvents({ schedule, limit = 5 }: UpcomingEventsProps) {
  const upcoming = useMemo(() => getUpcomingSchedule(schedule, limit), [schedule, limit]);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <ul className="upcoming-events" aria-label="Proximos eventos">
      {upcoming.map((item) => (
        <li key={item.id}>
          <EventCard item={item} compact showDay dayLabel={buildDayLabel(item.startsAt)} />
        </li>
      ))}
    </ul>
  );
}
