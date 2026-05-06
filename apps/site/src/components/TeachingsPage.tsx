import { useMemo } from "react";
import { Youtube } from "lucide-react";
import type { ScheduleItem } from "@4ibib/core";
import { extractYouTubeId, youtubeThumbnailUrl } from "../lib/youtube";
import { formatDateLabel } from "@4ibib/core";

interface TeachingsPageProps {
  schedule: ScheduleItem[];
}

export default function TeachingsPage({ schedule }: TeachingsPageProps) {
  const teachings = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return schedule
      .filter((item) => {
        if (Date.parse(item.endsAt) >= now) return false;
        return extractYouTubeId(item.youtubeUrl) !== null;
      })
      .sort((left, right) => Date.parse(right.endsAt) - Date.parse(left.endsAt));
  }, [schedule]);

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Arquivo</p>
        <h1>Pregacoes</h1>
        <p className="page-lead">
          Mensagens recentes ja realizadas, com gravacao disponivel no nosso canal do YouTube.
        </p>
      </header>

      <section className="page-section">
        {teachings.length === 0 ? (
          <p className="empty-note">Ainda nao temos pregacoes vinculadas. Em breve.</p>
        ) : (
          <div className="teachings-grid">
            {teachings.map((item) => {
              const thumb = youtubeThumbnailUrl(item.youtubeUrl);
              if (!thumb) return null;
              return (
                <a
                  key={item.id}
                  href={item.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="teaching-card"
                >
                  <div className="teaching-thumb">
                    <img src={thumb} alt="" loading="lazy" />
                    <Youtube size={36} className="teaching-play" aria-hidden="true" />
                  </div>
                  <div className="teaching-body">
                    <p className="teaching-date">{formatDateLabel(item.endsAt)}</p>
                    <h3>{item.title}</h3>
                    {item.preacher && <p className="teaching-preacher">{item.preacher}</p>}
                    {item.passage && <p className="teaching-passage">{item.passage}</p>}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
