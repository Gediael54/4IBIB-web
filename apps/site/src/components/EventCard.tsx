import { Star, Youtube } from "lucide-react";
import type { ReactNode } from "react";
import type { ScheduleItem } from "@4ibib/core";
import { useChurchProfile } from "../lib/church-context";
import { formatTime } from "../lib/date";
import { displayLocation, getSoundTeam, occasionStyle, splitNames } from "../lib/event";
import { useNow } from "../lib/use-now";
import { extractYouTubeId } from "../lib/youtube";

export interface EventCardProps {
  item: ScheduleItem;
  compact?: boolean;
  showDay?: boolean;
  dayLabel?: string;
  highlight?: string;
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

function renderHighlighted(value: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) {
    return value;
  }
  const lowerValue = value.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerValue.indexOf(lowerQuery);
  if (index === -1) {
    return value;
  }
  return (
    <>
      {value.slice(0, index)}
      <mark className="match">{value.slice(index, index + trimmed.length)}</mark>
      {value.slice(index + trimmed.length)}
    </>
  );
}

function renderNameList(value: string, query: string): ReactNode {
  const names = splitNames(value);
  if (names.length === 0) {
    return renderHighlighted(value, query);
  }
  return names.map((name, i) => (
    <span key={`${name}-${i}`}>
      {renderHighlighted(name, query)}
      {i < names.length - 1 ? " · " : ""}
    </span>
  ));
}

export default function EventCard({
  item,
  compact = false,
  showDay = false,
  dayLabel,
  highlight = ""
}: EventCardProps) {
  const church = useChurchProfile();
  const occasion = occasionStyle(item.occasionLabel);
  const location = displayLocation(item, church);
  const time = formatTime(item.startsAt);
  const soundTeam = getSoundTeam(item);
  const youtubeId = extractYouTubeId(item.youtubeUrl);
  const now = useNow();
  const showYoutubeCta = item.status !== "free" && Date.parse(item.endsAt) < now && youtubeId !== null;

  return (
    <article
      className={classNames(item, compact)}
      aria-label={item.status === "free" ? "Sem programação" : item.title}
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
              <dd>{renderHighlighted(item.preacher, highlight)}</dd>
            </div>
          )}
          {item.director && (
            <div>
              <dt>Dirigente</dt>
              <dd>{renderHighlighted(item.director, highlight)}</dd>
            </div>
          )}
          {soundTeam && (
            <div>
              <dt>Som</dt>
              <dd>{renderNameList(soundTeam, highlight)}</dd>
            </div>
          )}
          {item.passage && (
            <div>
              <dt>Leitura</dt>
              <dd>{item.passage}</dd>
            </div>
          )}
          {!location.isHome && (
            <div>
              <dt>Local</dt>
              <dd>
                <span>{location.primary}</span>
                {location.secondary && <small>{location.secondary}</small>}
              </dd>
            </div>
          )}
        </dl>
      )}
      {showYoutubeCta && youtubeId && (
        <a
          className="event-card-youtube"
          href={item.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver pregacao "${item.title}" no YouTube`}
        >
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="event-card-youtube-thumb"
          />
          <span className="event-card-youtube-cta">
            <Youtube size={16} aria-hidden="true" />
            Ver no YouTube
          </span>
        </a>
      )}
    </article>
  );
}
