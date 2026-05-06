import type { MonthHighlight } from "../lib/commemoration";

interface MonthBannerProps {
  highlights: MonthHighlight[];
  monthLabel?: string;
}

export default function MonthBanner({ highlights, monthLabel }: MonthBannerProps) {
  if (highlights.length === 0) return null;

  return (
    <aside className="commemoration-banner" aria-label="Tema do mês">
      {highlights.map((highlight) => (
        <article
          key={highlight.key}
          className="commemoration-banner-card"
          style={{ borderLeftColor: highlight.color }}
        >
          {monthLabel && <p className="commemoration-banner-month">{monthLabel}</p>}
          <p className="commemoration-banner-label">{highlight.label}</p>
          {highlight.description && (
            <p className="commemoration-banner-description">{highlight.description}</p>
          )}
        </article>
      ))}
    </aside>
  );
}
