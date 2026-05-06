import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Sparkles, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import type { MinistryRecord } from "@4ibib/core";
import DataCard from "../../components/Layout/DataCard";

interface MinistryCardProps {
  item: MinistryRecord;
  onEdit: (item: MinistryRecord) => void;
  onDelete: (item: MinistryRecord) => void;
  reordering: boolean;
}

export default function MinistryCard({ item, onEdit, onDelete, reordering }: MinistryCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className="ministry-card-wrapper">
      <button
        type="button"
        className="ministry-card-handle"
        aria-label={`Reordenar ${item.name}`}
        disabled={reordering}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <DataCard
        icon={<Sparkles size={20} aria-hidden="true" />}
        iconBackground={item.color || "var(--accent-soft)"}
        iconColor="#fff"
        title={item.name}
        subtitle={item.summary}
        meta={
          <>
            {item.meetingTime && <span>📅 {item.meetingTime}</span>}
            {item.contact && <span>📞 {item.contact}</span>}
          </>
        }
        secondaryActions={
          <>
            <button type="button" className="button ghost" onClick={() => onEdit(item)}>
              Editar
            </button>
            <button
              type="button"
              className="icon-button danger"
              onClick={() => onDelete(item)}
              aria-label={`Excluir ${item.name}`}
              title="Excluir"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </>
        }
      />
    </div>
  );
}
