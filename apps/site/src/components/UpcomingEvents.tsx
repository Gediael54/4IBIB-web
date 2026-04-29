import { useMemo } from "react";
import { getUpcomingSchedule } from "@4ibib/core";
import type { ChurchProfile, ScheduleItem } from "@4ibib/core";
import { formatMonthShort, formatWeekdayShort, getZonedParts } from "../lib/date";
import EventCard from "./EventCard";

export interface UpcomingEventsProps {
  schedule: ScheduleItem[];
  profile: ChurchProfile;
  limit?: number;
}

function buildDayLabel(iso: string): string {
  const parts = getZonedParts(iso);
  const weekday = formatWeekdayShort(iso);
  const month = formatMonthShort(iso);
  return `${weekday} · ${parts.day} ${month}`;
}

export default function UpcomingEvents({ schedule, profile, limit = 5 }: UpcomingEventsProps) {
  const upcoming = useMemo(() => getUpcomingSchedule(schedule, limit), [schedule, limit]);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <ul className="upcoming-events" aria-label="Proximos eventos">
      {upcoming.map((item) => (
        <li key={item.id}>
          <EventCard item={item} profile={profile} compact showDay dayLabel={buildDayLabel(item.startsAt)} />
        </li>
      ))}
    </ul>
  );
}
