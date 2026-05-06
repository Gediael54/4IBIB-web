import type { DayHighlight } from "../lib/commemoration";

interface CommemorationBadgeProps {
  highlight: DayHighlight;
}

export default function CommemorationBadge({ highlight }: CommemorationBadgeProps) {
  return (
    <span
      className="commemoration-badge"
      style={{ background: highlight.color, color: "#fff" }}
      title={highlight.description || highlight.label}
    >
      {highlight.label}
    </span>
  );
}
