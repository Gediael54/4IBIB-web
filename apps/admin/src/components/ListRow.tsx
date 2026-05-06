import type { ReactNode } from "react";

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}

export function ListRow({ leading, title, meta, badges, actions, onClick, selected }: ListRowProps) {
  const className = `list-row${selected ? " selected" : ""}${onClick ? " clickable" : ""}`;
  return (
    <article
      className={className}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {leading && <div className="list-row-leading">{leading}</div>}
      <div className="list-row-main">
        <strong className="list-row-title">{title}</strong>
        {meta && <span className="list-row-meta">{meta}</span>}
        {badges && <div className="list-row-badges">{badges}</div>}
      </div>
      {actions && <div className="list-row-actions">{actions}</div>}
    </article>
  );
}

export default ListRow;
