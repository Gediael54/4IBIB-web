import type { ReactNode } from "react";

interface ViewHeaderProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
}

export default function ViewHeader({
  eyebrow,
  title,
  lead,
  primaryAction,
  secondaryActions
}: ViewHeaderProps) {
  return (
    <header className="view-header">
      <div className="view-header-text">
        {eyebrow && <p className="view-header-eyebrow">{eyebrow}</p>}
        <h1 className="view-header-title">{title}</h1>
        {lead && <p className="view-header-lead">{lead}</p>}
      </div>
      {(primaryAction || secondaryActions) && (
        <div className="view-header-actions">
          {secondaryActions}
          {primaryAction}
        </div>
      )}
    </header>
  );
}
