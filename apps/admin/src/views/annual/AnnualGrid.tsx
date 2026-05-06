import { type Commemoration, type ScheduleItem, type Volunteer } from "@4ibib/core";
import { Ban, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import SuspendScheduleDialog from "../../components/Schedule/SuspendScheduleDialog";
import { useToast } from "../../components/Toast";
import { useSaveScheduleItem } from "../../hooks";
import { withStatus } from "../../lib/schedule-actions";
import { applyPending, getCurrentValue, ROLE_LABELS, type PendingState, type RoleColumn } from "./cadence";
import { dayHighlightForIso, monthHighlightsForYear } from "./annual-commemoration";

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
  commemorations?: Commemoration[];
}

export function AnnualGrid({
  yearItems,
  pending,
  volunteers,
  setPendingForCell,
  year,
  commemorations = []
}: AnnualGridProps) {
  const monthHighlights = useMemo(() => monthHighlightsForYear(commemorations, year), [commemorations, year]);
  const [activeCell, setActiveCell] = useState<{ id: string; role: RoleColumn } | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ScheduleItem | null>(null);
  const saveMutation = useSaveScheduleItem();
  const { toast } = useToast();

  async function handleConfirmSuspend(reason: string) {
    if (!suspendTarget) return;
    try {
      await saveMutation.mutateAsync(withStatus(suspendTarget, "suspended"));
      toast(`"${suspendTarget.title}" marcado como SUSPENSO.`, { variant: "success" });
      setSuspendTarget(null);
      void reason; // reason is forwarded to the WhatsApp message via the dialog preview
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui suspender — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleRestore(item: ScheduleItem) {
    try {
      await saveMutation.mutateAsync(withStatus(item, "scheduled"));
      toast(`"${item.title}" voltou para programado.`, { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui restaurar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

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
      <td key={role} className={cellClasses.join(" ")} data-label={ROLE_LABELS[role]}>
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
    <>
      {monthHighlights.length > 0 && (
        <aside className="annual-month-highlights" aria-label="Meses tematicos">
          {monthHighlights.map((highlight) => (
            <div key={highlight.monthIndex} className="annual-month-highlight">
              <span className="annual-month-highlight-label">{highlight.monthLabel}</span>
              {highlight.items.map((item) => (
                <span
                  key={item.id}
                  className="annual-month-highlight-tag"
                  style={{ background: item.color, color: "#fff" }}
                  title={item.description || item.name}
                >
                  {item.name}
                </span>
              ))}
            </div>
          ))}
        </aside>
      )}
      <table className="annual-grid">
        <thead>
          <tr>
            <th>Data</th>
            <th>Evento</th>
            <th>Pregador</th>
            <th>Dirigente</th>
            <th>Som</th>
            <th aria-label="Acoes" />
          </tr>
        </thead>
        <tbody>
          {yearItems.map((item) => {
            const startDate = new Date(item.startsAt);
            const dayHighlights = dayHighlightForIso(commemorations, item.startsAt);
            const rowClasses = ["annual-row"];
            if (dayHighlights.length > 0) rowClasses.push("annual-row-with-day");
            if (item.status === "suspended") rowClasses.push("annual-row-suspended");
            if (item.status === "free") rowClasses.push("annual-row-free");
            return (
              <tr key={item.id} className={rowClasses.join(" ")}>
                <td data-label="Data" className="annual-cell-date">
                  <strong>{DATE_FORMATTER.format(startDate)}</strong>
                  <small>{TIME_FORMATTER.format(startDate)}</small>
                </td>
                <td data-label="Evento" className="annual-cell-event">
                  <strong>{item.title}</strong>
                  <small>{item.ministry}</small>
                  {dayHighlights.length > 0 && (
                    <div className="annual-day-tags">
                      {dayHighlights.map((highlight) => (
                        <span
                          key={highlight.id}
                          className="annual-day-tag"
                          style={{ background: highlight.color, color: "#fff" }}
                          title={highlight.description || highlight.name}
                        >
                          {highlight.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.status === "suspended" && <span className="annual-status-suspended">SUSPENSO</span>}
                </td>
                {renderCell(item, "preacher")}
                {renderCell(item, "director")}
                {renderCell(item, "soundTeam")}
                <td className="annual-cell-actions" data-label="Acoes">
                  {item.status === "suspended" ? (
                    <button
                      type="button"
                      className="button ghost annual-action-btn"
                      onClick={() => handleRestore(item)}
                      disabled={saveMutation.isPending}
                      title="Restaurar para programado"
                      aria-label={`Restaurar ${item.title}`}
                    >
                      <RotateCcw size={14} aria-hidden="true" />
                      <span>Restaurar</span>
                    </button>
                  ) : item.status === "scheduled" ? (
                    <button
                      type="button"
                      className="button ghost annual-action-btn"
                      onClick={() => setSuspendTarget(item)}
                      disabled={saveMutation.isPending}
                      title="Suspender e avisar grupo"
                      aria-label={`Suspender ${item.title}`}
                    >
                      <Ban size={14} aria-hidden="true" />
                      <span>Suspender</span>
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <SuspendScheduleDialog
        item={suspendTarget}
        saving={saveMutation.isPending}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleConfirmSuspend}
      />
    </>
  );
}
