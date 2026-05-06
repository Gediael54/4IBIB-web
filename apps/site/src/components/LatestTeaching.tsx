import { Youtube } from "lucide-react";
import { useMemo } from "react";
import type { ScheduleItem } from "@4ibib/core";
import { formatDateLabel } from "@4ibib/core";
import { extractYouTubeId } from "../lib/youtube";

export interface LatestTeachingProps {
  schedule: ScheduleItem[];
}

interface TeachingEntry {
  item: ScheduleItem;
  videoId: string;
}

function pickLatestTeaching(schedule: ScheduleItem[]): TeachingEntry | null {
  const now = Date.now();
  let best: TeachingEntry | null = null;
  let bestEndsAt = Number.NEGATIVE_INFINITY;

  for (const item of schedule) {
    if (item.status === "free") continue;
    const endsAt = Date.parse(item.endsAt);
    if (!Number.isFinite(endsAt) || endsAt >= now) continue;
    const videoId = extractYouTubeId(item.youtubeUrl);
    if (!videoId) continue;
    if (endsAt > bestEndsAt) {
      bestEndsAt = endsAt;
      best = { item, videoId };
    }
  }

  return best;
}

export default function LatestTeaching({ schedule }: LatestTeachingProps) {
  const latest = useMemo(() => pickLatestTeaching(schedule), [schedule]);

  if (!latest) {
    return null;
  }

  const { item, videoId } = latest;

  return (
    <section className="section latest-teaching" id="ultima-pregacao" aria-label="Ultima pregacao">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ultima pregacao</p>
          <h2>{item.title}</h2>
        </div>
        <Youtube />
      </div>
      <article className="latest-teaching-card">
        <a
          className="latest-teaching-thumb"
          href={item.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Assistir "${item.title}" no YouTube`}
        >
          <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" loading="lazy" />
        </a>
        <div className="latest-teaching-body">
          <p className="latest-teaching-meta">{formatDateLabel(item.startsAt)}</p>
          {item.preacher && <p className="latest-teaching-preacher">{item.preacher}</p>}
          {item.passage && <p className="latest-teaching-passage">{item.passage}</p>}
          <a className="button primary" href={item.youtubeUrl} target="_blank" rel="noopener noreferrer">
            <Youtube size={18} aria-hidden="true" /> Assistir no YouTube
          </a>
        </div>
      </article>
    </section>
  );
}
