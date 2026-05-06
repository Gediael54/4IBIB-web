import { useMemo } from "react";
import { Youtube } from "lucide-react";
import type { ScheduleItem } from "@4ibib/core";
import { extractYouTubeId, youtubeThumbnailUrl } from "../lib/youtube";
import { safeUrl } from "../lib/safe-url";
import { useNow } from "../lib/use-now";
import { formatDateLabel } from "@4ibib/core";
import PageShell from "./PageShell";

interface TeachingsPageProps {
  schedule: ScheduleItem[];
}

export default function TeachingsPage({ schedule }: TeachingsPageProps) {
  const now = useNow();
  const teachings = useMemo(() => {
    return schedule
      .filter((item) => {
        if (Date.parse(item.endsAt) >= now) return false;
        return extractYouTubeId(item.youtubeUrl) !== null;
      })
      .sort((left, right) => Date.parse(right.endsAt) - Date.parse(left.endsAt));
  }, [schedule, now]);

  return (
    <PageShell
      eyebrow="Arquivo"
      title="Pregações"
      lead="Mensagens recentes já realizadas, com gravação disponível no nosso canal do YouTube."
      breadcrumb={[
        { href: "#inicio", label: "Início" },
        { href: "#pregacoes", label: "Pregações" }
      ]}
    >
      <section className="page-section">
        {teachings.length === 0 ? (
          <p className="empty-note">Ainda não temos pregações vinculadas. Em breve.</p>
        ) : (
          <div className="teachings-grid">
            {teachings.map((item) => {
              const thumb = youtubeThumbnailUrl(item.youtubeUrl);
              if (!thumb) return null;
              return (
                <a
                  key={item.id}
                  href={safeUrl(item.youtubeUrl)}
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
    </PageShell>
  );
}
