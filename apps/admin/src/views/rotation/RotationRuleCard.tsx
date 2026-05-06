import { Trash2, UserCheck } from "lucide-react";
import type { RotationRule } from "@4ibib/core";
import DataCard from "../../components/Layout/DataCard";
import { ROTATION_FREQUENCY_LABEL, ROTATION_ROLE_LABEL, weekdayLabel } from "../../lib/rotation-labels";

interface RotationRuleCardProps {
  rule: RotationRule;
  memberName: string;
  onEdit: (rule: RotationRule) => void;
  onDelete: (rule: RotationRule) => void;
}

export default function RotationRuleCard({ rule, memberName, onEdit, onDelete }: RotationRuleCardProps) {
  return (
    <DataCard
      icon={<UserCheck size={20} aria-hidden="true" />}
      iconBackground={rule.active ? "var(--accent-soft)" : "var(--bg-sunken)"}
      iconColor={rule.active ? "var(--accent)" : "var(--text-tertiary)"}
      title={memberName}
      badge={ROTATION_ROLE_LABEL[rule.role]}
      subtitle={`${weekdayLabel(rule.weekday)} · ${ROTATION_FREQUENCY_LABEL[rule.frequency]}`}
      meta={
        <>
          {rule.ministry && <span>📍 {rule.ministry}</span>}
          <span>🎯 Prioridade {rule.priority}</span>
          {!rule.active && <span>⏸️ Pausada</span>}
        </>
      }
      description={rule.notes || undefined}
      status={rule.active ? "default" : "muted"}
      secondaryActions={
        <>
          <button type="button" className="button ghost" onClick={() => onEdit(rule)}>
            Editar
          </button>
          <button
            type="button"
            className="icon-button danger"
            onClick={() => onDelete(rule)}
            aria-label={`Excluir regra de ${memberName}`}
            title="Excluir"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </>
      }
    />
  );
}
