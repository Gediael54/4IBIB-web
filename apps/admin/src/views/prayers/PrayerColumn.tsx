import type { PrayerRequest, PrayerStatus } from "@4ibib/core";
import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { PrayerColumnConfig } from "./columns";

interface PrayerColumnProps {
  config: PrayerColumnConfig;
  items: PrayerRequest[];
  isDropTarget: boolean;
  draggingFromStatus: PrayerStatus | null;
  children: ReactNode;
}

export default function PrayerColumn({
  config,
  items,
  isDropTarget,
  draggingFromStatus,
  children
}: PrayerColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `prayer-column-${config.status}`,
    data: { status: config.status }
  });

  const isReceiving = isOver && draggingFromStatus !== config.status;
  const className = [
    "prayer-kanban-column",
    `prayer-kanban-column-${config.tone}`,
    isReceiving ? "prayer-kanban-column-receiving" : "",
    isDropTarget ? "prayer-kanban-column-target" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section ref={setNodeRef} className={className} aria-label={config.label}>
      <header className="prayer-kanban-column-header">
        <span className="prayer-kanban-column-title">
          <span aria-hidden="true">{config.emoji}</span>
          <span>{config.label}</span>
        </span>
        <span className="prayer-kanban-column-count" aria-label={`${items.length} pedidos`}>
          {items.length}
        </span>
      </header>
      <div className="prayer-kanban-column-body">{children}</div>
    </section>
  );
}
