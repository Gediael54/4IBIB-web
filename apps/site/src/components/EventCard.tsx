import { Star } from "lucide-react";
import type { ChurchProfile, ScheduleItem } from "@4ibib/core";
import { formatTime } from "../lib/date";
import { displayLocation, occasionStyle } from "../lib/event";

export interface EventCardProps {
  item: ScheduleItem;
  profile: ChurchProfile;
  compact?: boolean;
  showDay?: boolean;
  dayLabel?: string;
}

function classNames(item: ScheduleItem, compact: boolean): string {
  const classes = ["event-card"];
  if (compact) classes.push("compact");
  if (item.featured) classes.push("featured");
  if (item.status === "suspended") classes.push("suspended");
  if (item.status === "free") classes.push("free");
  return classes.join(" ");
}

function renderTitle(item: ScheduleItem) {
  if (item.status === "free") {
    return <em>Livre</em>;
  }
  if (item.status === "suspended") {
    return (
      <>
        <span className="event-card-title-text">{item.title}</span>{" "}
        <span className="event-card-suspended-tag">(SUSPENSO)</span>
      </>
    );
  }
  return <span className="event-card-title-text">{item.title}</span>;
}

export default function EventCard({
  item,
  profile,
  compact = false,
  showDay = false,
  dayLabel
}: EventCardProps) {
  const occasion = occasionStyle(item.occasionLabel);
  const location = displayLocation(item, profile);
  const time = formatTime(item.startsAt);

  return (
    <article
      className={classNames(item, compact)}
      aria-label={item.status === "free" ? "Sem programacao" : item.title}
    >
      {occasion && (
        <span
          className="event-card-occasion"
          style={{
            background: occasion.background,
            color: occasion.color,
            borderColor: occasion.border
          }}
        >
          {occasion.label}
        </span>
      )}
      <div className="event-card-head">
        <time className="event-card-time" dateTime={item.startsAt}>
          {showDay && dayLabel ? (
            <>
              <span className="event-card-day">{dayLabel}</span>
              <span className="event-card-hour">{time}</span>
            </>
          ) : (
            time
          )}
        </time>
        <p className="event-card-title">
          {item.featured && <Star size={14} aria-hidden="true" className="event-card-star" />}
          {renderTitle(item)}
        </p>
      </div>
      {item.status !== "free" && (
        <dl className="event-card-meta">
          {item.preacher && (
            <div>
              <dt>Pregador</dt>
              <dd>{item.preacher}</dd>
            </div>
          )}
          {item.director && (
            <div>
              <dt>Dirigente</dt>
              <dd>{item.director}</dd>
            </div>
          )}
          {item.passage && (
            <div>
              <dt>Leitura</dt>
              <dd>{item.passage}</dd>
            </div>
          )}
          <div>
            <dt>Local</dt>
            <dd>
              <span>{location.primary}</span>
              {location.secondary && <small>{location.secondary}</small>}
            </dd>
          </div>
        </dl>
      )}
    </article>
  );
}
