import { Calendar, CalendarDays, Trash2 } from "lucide-react";
import type { Commemoration } from "@4ibib/core";
import DataCard from "../../components/Layout/DataCard";
import { describeCommemorationWhen, MONTH_OPTIONS } from "../../lib/commemoration";

interface CommemorationCardProps {
  item: Commemoration;
  onEdit: (item: Commemoration) => void;
  onDelete: (item: Commemoration) => void;
}

function formatDayBadge(item: Commemoration): string {
  if (item.type === "month") return "Mês inteiro";
  const monthLabel = MONTH_OPTIONS.find((option) => option.value === item.month)?.label ?? "";
  const day = String(item.dayOfMonth ?? 0).padStart(2, "0");
  const month = String(item.month).padStart(2, "0");
  return monthLabel ? `Dia ${day}/${month}` : `Dia ${day}/${month}`;
}

export default function CommemorationCard({ item, onEdit, onDelete }: CommemorationCardProps) {
  const Icon = item.type === "month" ? Calendar : CalendarDays;
  return (
    <DataCard
      icon={<Icon size={20} aria-hidden="true" />}
      iconBackground={item.color || "var(--accent-soft)"}
      iconColor="#fff"
      title={item.name}
      badge={formatDayBadge(item)}
      subtitle={describeCommemorationWhen(item)}
      description={item.description || undefined}
      secondaryActions={
        <>
          <button type="button" className="button ghost" onClick={() => onEdit(item)}>
            Editar
          </button>
          <button
            type="button"
            className="icon-button icon-button-danger"
            onClick={() => onDelete(item)}
            aria-label={`Excluir ${item.name}`}
            title="Excluir"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </>
      }
    />
  );
}
