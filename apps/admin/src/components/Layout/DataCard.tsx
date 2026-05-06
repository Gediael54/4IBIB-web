import type { ReactNode } from "react";

interface DataCardProps {
  icon?: ReactNode;
  iconBackground?: string;
  iconColor?: string;
  badge?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  status?: "default" | "warning" | "danger" | "success" | "muted";
}

export default function DataCard({
  icon,
  iconBackground,
  iconColor,
  badge,
  title,
  subtitle,
  meta,
  description,
  primaryAction,
  secondaryActions,
  onClick,
  ariaLabel,
  status = "default"
}: DataCardProps) {
  const className = `data-card data-card-${status}`;
  const interactive = typeof onClick === "function";

  return (
    <article
      className={`${className}${interactive ? " data-card-interactive" : ""}`}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-label={ariaLabel}
    >
      {icon && (
        <span
          className="data-card-icon"
          style={{
            background: iconBackground ?? "var(--accent-soft)",
            color: iconColor ?? "var(--accent)"
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="data-card-body">
        <div className="data-card-heading">
          <h3 className="data-card-title">{title}</h3>
          {badge && <span className="data-card-badge">{badge}</span>}
        </div>
        {subtitle && <p className="data-card-subtitle">{subtitle}</p>}
        {meta && <div className="data-card-meta">{meta}</div>}
        {description && <p className="data-card-description">{description}</p>}
      </div>
      {(primaryAction || secondaryActions) && (
        <div className="data-card-actions" onClick={(event) => event.stopPropagation()}>
          {secondaryActions}
          {primaryAction}
        </div>
      )}
    </article>
  );
}
