import { type SiteSnapshot } from "@4ibib/core";
import { useState } from "react";
import { SelectField } from "../../components/ui";
import { AnnualAutoDistribute } from "./AnnualAutoDistribute";
import { AnnualGenerator } from "./AnnualGenerator";
import { AnnualGrid } from "./AnnualGrid";
import { useAnnualSchedule } from "./use-annual-schedule";

interface AnnualScheduleViewProps {
  snapshot: SiteSnapshot;
}

export default function AnnualScheduleView({ snapshot }: AnnualScheduleViewProps) {
  const {
    year,
    setYear,
    ministryFilter,
    setMinistryFilter,
    yearOptions,
    ministryOptions,
    yearItems,
    pending,
    pendingCount,
    setPendingForCell,
    applyPendingMap,
    clearPending,
    saveError,
    isSaving,
    handleSave
  } = useAnnualSchedule(snapshot);
  const [autoOpen, setAutoOpen] = useState(false);

  const volunteers = snapshot.volunteers ?? [];

  return (
    <section>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Escalas</p>
          <h1>Escala anual</h1>
        </div>
      </header>

      <div className="annual-controls">
        <SelectField
          label="Ano"
          value={String(year)}
          onChange={(event) => setYear(Number(event.currentTarget.value))}
        >
          {yearOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Ministerio"
          value={ministryFilter}
          onChange={(event) => setMinistryFilter(event.currentTarget.value)}
        >
          <option value="all">Todos</option>
          {ministryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
        <button type="button" className="button ghost" onClick={() => setAutoOpen((value) => !value)}>
          Auto-distribuir voluntario
        </button>
        <button
          type="button"
          className="button primary"
          onClick={handleSave}
          disabled={pendingCount === 0 || isSaving}
        >
          {pendingCount === 0
            ? "Sem mudancas"
            : `Salvar ${pendingCount} ${pendingCount === 1 ? "mudanca" : "mudancas"}`}
        </button>
        {pendingCount > 0 && (
          <button type="button" className="button ghost" onClick={clearPending} disabled={isSaving}>
            Descartar
          </button>
        )}
      </div>

      {saveError && <p className="form-error">{saveError}</p>}

      <AnnualAutoDistribute
        open={autoOpen}
        onClose={() => setAutoOpen(false)}
        volunteers={volunteers}
        yearItems={yearItems}
        pending={pending}
        setPendingForCell={setPendingForCell}
      />

      <AnnualGenerator
        volunteers={volunteers}
        yearItems={yearItems}
        schedule={snapshot.schedule}
        pending={pending}
        applyPendingMap={applyPendingMap}
      />

      <AnnualGrid
        yearItems={yearItems}
        pending={pending}
        volunteers={volunteers}
        setPendingForCell={setPendingForCell}
        year={year}
      />
    </section>
  );
}
