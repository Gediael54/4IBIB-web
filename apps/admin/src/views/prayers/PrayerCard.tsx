import { formatDateLabel, type PrayerRequest, type PrayerStatus } from "@4ibib/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Archive, ArrowRight, Eye, HeartHandshake } from "lucide-react";
import type { CSSProperties } from "react";
import DataCard from "../../components/Layout/DataCard";
import { nextStatusOptions, PRAYER_STATUS_SHORT_LABEL } from "./columns";

interface PrayerCardProps {
  request: PrayerRequest;
  onOpen: () => void;
  onMarkSeen: () => void;
  onMoveStatus: (status: PrayerStatus) => void;
  onArchive: () => void;
}

function describeName(request: PrayerRequest): string {
  const trimmed = request.name?.trim();
  return trimmed ? trimmed : "Anônimo";
}

function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export default function PrayerCard({
  request,
  onOpen,
  onMarkSeen,
  onMoveStatus,
  onArchive
}: PrayerCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: request.id,
    data: { status: request.status }
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 2 : undefined
  };

  const displayName = describeName(request);
  const transitions = nextStatusOptions(request.status);

  return (
    <div ref={setNodeRef} style={style} className="prayer-kanban-card-wrap" {...attributes} {...listeners}>
      <DataCard
        icon={<HeartHandshake size={20} />}
        title={displayName}
        subtitle={formatDateLabel(request.createdAt)}
        description={truncate(request.message)}
        meta={
          <>
            <span>Por: {displayName}</span>
            <span>Status: {PRAYER_STATUS_SHORT_LABEL[request.status]}</span>
          </>
        }
        onClick={onOpen}
        ariaLabel={`Abrir pedido de ${displayName}`}
        status={request.seenAt ? "muted" : "default"}
        secondaryActions={
          <div className="prayer-kanban-card-actions">
            {!request.seenAt && (
              <button type="button" className="button ghost" onClick={onMarkSeen} title="Marcar como visto">
                <Eye size={16} aria-hidden="true" />
                <span>Marcar como visto</span>
              </button>
            )}
            {transitions.map((target) => (
              <button
                key={target}
                type="button"
                className="button ghost"
                onClick={() => onMoveStatus(target)}
                aria-label={`Mover pedido de ${displayName} para ${PRAYER_STATUS_SHORT_LABEL[target]}`}
                title={`Mover para ${PRAYER_STATUS_SHORT_LABEL[target]}`}
              >
                <ArrowRight size={14} />
                <span>{PRAYER_STATUS_SHORT_LABEL[target]}</span>
              </button>
            ))}
            <button
              type="button"
              className="button ghost"
              onClick={onArchive}
              aria-label={`Arquivar pedido de ${displayName}`}
              title="Arquivar"
            >
              <Archive size={16} />
            </button>
          </div>
        }
      />
    </div>
  );
}
