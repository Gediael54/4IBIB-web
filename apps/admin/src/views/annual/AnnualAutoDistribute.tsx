import { type ScheduleItem, type Volunteer } from "@4ibib/core";
import { useState } from "react";
import { Field, SelectField } from "../../components/ui";
import { applyPending, getCurrentValue, type PendingState, type RoleColumn, startOfWeek } from "./cadence";
import { eligibleVolunteers } from "./AnnualGrid";

interface AnnualAutoDistributeProps {
  open: boolean;
  onClose: () => void;
  volunteers: Volunteer[];
  yearItems: ScheduleItem[];
  pending: Map<string, PendingState>;
  setPendingForCell: (itemId: string, role: RoleColumn, value: string) => void;
}

function nowMs(): number {
  return Date.now();
}

export function AnnualAutoDistribute({
  open,
  onClose,
  volunteers,
  yearItems,
  pending,
  setPendingForCell
}: AnnualAutoDistributeProps) {
  const [autoVolunteer, setAutoVolunteer] = useState("");
  const [autoRole, setAutoRole] = useState<RoleColumn>("preacher");
  const [autoCount, setAutoCount] = useState(4);
  const [autoAvoidConflicts, setAutoAvoidConflicts] = useState(true);

  if (!open) return null;

  const generalOptions = eligibleVolunteers(volunteers, "preacher");
  const soundOptions = eligibleVolunteers(volunteers, "soundTeam");
  const autoOptions = autoRole === "soundTeam" ? soundOptions : generalOptions;

  function handleApply() {
    const trimmed = autoVolunteer.trim();
    if (!trimmed || autoCount <= 0) {
      onClose();
      return;
    }
    const now = nowMs();
    const candidates = yearItems
      .filter((item) => Date.parse(item.startsAt) >= now)
      .filter((item) => {
        const merged = applyPending(item, pending.get(item.id));
        return getCurrentValue(merged, autoRole).trim() === "";
      });

    const usedWeeks = new Set<number>();
    if (autoAvoidConflicts) {
      for (const item of yearItems) {
        const merged = applyPending(item, pending.get(item.id));
        const value = getCurrentValue(merged, autoRole);
        if (
          value
            .split(",")
            .map((part) => part.trim())
            .includes(trimmed)
        ) {
          usedWeeks.add(startOfWeek(item.startsAt));
        }
      }
    }

    let assigned = 0;
    for (const item of candidates) {
      if (assigned >= autoCount) break;
      const week = startOfWeek(item.startsAt);
      if (autoAvoidConflicts && usedWeeks.has(week)) continue;
      setPendingForCell(item.id, autoRole, trimmed);
      usedWeeks.add(week);
      assigned += 1;
    }

    onClose();
  }

  return (
    <div className="annual-auto-panel">
      <SelectField
        label="Voluntario"
        value={autoVolunteer}
        onChange={(event) => setAutoVolunteer(event.currentTarget.value)}
      >
        <option value="">Selecione...</option>
        {autoOptions.map((volunteer) => (
          <option key={volunteer.id} value={volunteer.name}>
            {volunteer.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Funcao"
        value={autoRole}
        onChange={(event) => {
          setAutoRole(event.currentTarget.value as RoleColumn);
          setAutoVolunteer("");
        }}
      >
        <option value="preacher">Pregador</option>
        <option value="director">Dirigente</option>
        <option value="soundTeam">Som</option>
      </SelectField>
      <Field
        label="Quantidade"
        type="number"
        min={1}
        max={52}
        value={autoCount}
        onChange={(event) => setAutoCount(Math.max(1, Number(event.currentTarget.value) || 1))}
      />
      <label className="annual-auto-toggle">
        <input
          type="checkbox"
          checked={autoAvoidConflicts}
          onChange={(event) => setAutoAvoidConflicts(event.currentTarget.checked)}
        />
        Evitar conflitos com mesma semana
      </label>
      <div className="form-actions">
        <button type="button" className="button primary" onClick={handleApply}>
          Aplicar
        </button>
        <button type="button" className="button ghost" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
