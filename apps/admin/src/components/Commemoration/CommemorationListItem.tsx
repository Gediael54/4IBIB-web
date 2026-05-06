import { Calendar, CalendarDays, Trash2 } from "lucide-react";
import type { Commemoration } from "@4ibib/core";
import { describeCommemorationWhen } from "../../lib/commemoration";

interface CommemorationListItemProps {
  item: Commemoration;
  isEditing: boolean;
  onEdit: (item: Commemoration) => void;
  onDelete: (item: Commemoration) => void;
}

export default function CommemorationListItem({
  item,
  isEditing,
  onEdit,
  onDelete
}: CommemorationListItemProps) {
  return (
    <article className={`list-item commemoration-item${isEditing ? " editing" : ""}`} aria-label={item.name}>
      <div className="list-item-main">
        <span
          className="commemoration-item-icon"
          style={{ background: item.color, color: "#fff" }}
          aria-hidden="true"
        >
          {item.type === "month" ? <Calendar size={14} /> : <CalendarDays size={14} />}
        </span>
        <div>
          <h3>{item.name}</h3>
          <p className="muted">{describeCommemorationWhen(item)}</p>
          {item.description && <p className="commemoration-item-desc">{item.description}</p>}
        </div>
      </div>
      <div className="list-item-actions">
        <button type="button" className="button ghost" onClick={() => onEdit(item)}>
          Editar
        </button>
        <button
          type="button"
          className="icon-button danger"
          onClick={() => onDelete(item)}
          aria-label={`Excluir ${item.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
