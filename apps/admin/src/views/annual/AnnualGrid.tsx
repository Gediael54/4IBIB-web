import { type ScheduleItem, type Volunteer } from "@4ibib/core";
import { useState } from "react";
import { applyPending, getCurrentValue, ROLE_LABELS, type PendingState, type RoleColumn } from "./cadence";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit"
});

const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit"
});

export function eligibleVolunteers(volunteers: Volunteer[], role: RoleColumn): Volunteer[] {
  const expectedRole = role === "soundTeam" ? "som" : "geral";
  return volunteers
    .filter((volunteer) => volunteer.role === expectedRole)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

interface AnnualGridProps {
  yearItems: ScheduleItem[];
  pending: Map<string, PendingState>;
  volunteers: Volunteer[];
  setPendingForCell: (itemId: string, role: RoleColumn, value: string) => void;
  year: number;
}

export function AnnualGrid({ yearItems, pending, volunteers, setPendingForCell, year }: AnnualGridProps) {
  const [activeCell, setActiveCell] = useState<{ id: string; role: RoleColumn } | null>(null);

  function renderSoundTeam(value: string) {
    const names = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (names.length === 0) return "(vazio)";
    if (names.length === 1) return names[0];
    return (
      <>
        {names[0]} <span className="annual-cell-badge">+{names.length - 1}</span>
      </>
    );
  }

  function renderCell(item: ScheduleItem, role: RoleColumn) {
    const pendingState = pending.get(item.id);
    const merged = applyPending(item, pendingState);
    const value = getCurrentValue(merged, role);
    const isPending = pendingState?.[role] !== undefined;
    const isEmpty = value.trim() === "";
    const isActive = activeCell?.id === item.id && activeCell.role === role;
    const options = eligibleVolunteers(volunteers, role);

    const cellClasses = ["annual-cell"];
    if (isPending) cellClasses.push("annual-cell-pending");
    if (isEmpty) cellClasses.push("annual-cell-empty");

    const display = isEmpty ? "(vazio)" : role === "soundTeam" ? renderSoundTeam(value) : value;

    return (
      <td key={role} className={cellClasses.join(" ")}>
        {!isActive ? (
          <button
            type="button"
            className="annual-cell-button"
            onClick={() => setActiveCell({ id: item.id, role })}
            aria-label={`Editar ${ROLE_LABELS[role]} de ${item.title}`}
          >
            <span>{display}</span>
          </button>
        ) : role === "soundTeam" ? (
          <div className="annual-cell-editor">
            <input
              autoFocus
              type="text"
              defaultValue={value}
              list={`annual-sound-options-${item.id}`}
              onBlur={(event) => {
                const next = event.currentTarget.value.trim();
                if (next !== value.trim()) {
                  setPendingForCell(item.id, role, next);
                }
                setActiveCell(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.value = value;
                  setActiveCell(null);
                }
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
            <datalist id={`annual-sound-options-${item.id}`}>
              {options.map((volunteer) => (
                <option key={volunteer.id} value={volunteer.name} />
              ))}
            </datalist>
          </div>
        ) : (
          <select
            autoFocus
            className="annual-cell-select"
            defaultValue={value}
            onChange={(event) => {
              setPendingForCell(item.id, role, event.currentTarget.value);
              setActiveCell(null);
            }}
            onBlur={() => setActiveCell(null)}
          >
            <option value="">(vazio)</option>
            {options.map((volunteer) => (
              <option key={volunteer.id} value={volunteer.name}>
                {volunteer.name}
              </option>
            ))}
            {value && !options.some((volunteer) => volunteer.name === value) && (
              <option value={value}>{value}</option>
            )}
          </select>
        )}
      </td>
    );
  }

  if (yearItems.length === 0) {
    return <p className="empty-note">Nenhum item de programacao para {year}.</p>;
  }

  return (
    <table className="annual-grid">
      <thead>
        <tr>
          <th>Data</th>
          <th>Evento</th>
          <th>Pregador</th>
          <th>Dirigente</th>
          <th>Som</th>
        </tr>
      </thead>
      <tbody>
        {yearItems.map((item) => {
          const startDate = new Date(item.startsAt);
          return (
            <tr key={item.id}>
              <td>
                <strong>{DATE_FORMATTER.format(startDate)}</strong>
                <small>{TIME_FORMATTER.format(startDate)}</small>
              </td>
              <td>
                <strong>{item.title}</strong>
                <small>{item.ministry}</small>
              </td>
              {renderCell(item, "preacher")}
              {renderCell(item, "director")}
              {renderCell(item, "soundTeam")}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
