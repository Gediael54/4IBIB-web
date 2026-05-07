import {
  buildMonthCalendar,
  getMonthLabel,
  getWeekdayShortLabels,
  groupItemsByDay,
  type ScheduleItem
} from "@4ibib/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { dayHighlightForIso } from "./annual-commemoration";
import type { Commemoration } from "@4ibib/core";

interface CalendarMonthViewProps {
  yearItems: ScheduleItem[];
  year: number;
  commemorations?: Commemoration[];
  onSelectItem?: (item: ScheduleItem) => void;
}

const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit"
});

export function CalendarMonthView({
  yearItems,
  year,
  commemorations = [],
  onSelectItem
}: CalendarMonthViewProps) {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

  const itemsByDay = useMemo(() => groupItemsByDay(yearItems), [yearItems]);
  const calendar = useMemo(() => buildMonthCalendar(year, month), [year, month]);
  const weekdayLabels = getWeekdayShortLabels();

  function goPrev() {
    setMonth((current) => (current === 1 ? 12 : current - 1));
  }

  function goNext() {
    setMonth((current) => (current === 12 ? 1 : current + 1));
  }

  return (
    <div className="calendar-month">
      <div className="calendar-month-header">
        <button type="button" className="calendar-nav-btn" onClick={goPrev} aria-label="Mês anterior">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h2 className="calendar-month-title">
          {getMonthLabel(month)} <span className="calendar-month-year">{year}</span>
        </h2>
        <button type="button" className="calendar-nav-btn" onClick={goNext} aria-label="Próximo mês">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="calendar-weekday-row" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label} className="calendar-weekday-label">
            {label}
          </span>
        ))}
      </div>

      <div className="calendar-grid">
        {calendar.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="calendar-week">
            {week.days.map((day) => {
              const items = itemsByDay.get(day.iso) ?? [];
              const highlights = dayHighlightForIso(commemorations, day.date.toISOString());
              const cellClasses = ["calendar-day"];
              if (!day.isCurrentMonth) cellClasses.push("calendar-day-outside");
              if (day.isToday) cellClasses.push("calendar-day-today");
              if (highlights.length > 0) cellClasses.push("calendar-day-highlight");
              return (
                <div key={day.iso} className={cellClasses.join(" ")}>
                  <div className="calendar-day-header">
                    <span className="calendar-day-number">{day.day}</span>
                    {highlights.length > 0 && (
                      <span
                        className="calendar-day-tag"
                        style={{ background: highlights[0].color, color: "#fff" }}
                        title={highlights[0].name}
                      >
                        {highlights[0].name}
                      </span>
                    )}
                  </div>
                  <div className="calendar-day-events">
                    {items.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`calendar-event-pill calendar-event-${item.status}`}
                        onClick={() => onSelectItem?.(item)}
                        title={`${item.title} — ${TIME_FORMATTER.format(new Date(item.startsAt))}`}
                      >
                        <span className="calendar-event-time">
                          {TIME_FORMATTER.format(new Date(item.startsAt))}
                        </span>
                        <span className="calendar-event-title">{item.title}</span>
                      </button>
                    ))}
                    {items.length > 3 && (
                      <span className="calendar-event-more">+{items.length - 3} eventos</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
