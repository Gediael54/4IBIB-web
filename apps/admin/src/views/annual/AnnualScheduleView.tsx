import { type SiteSnapshot } from "@4ibib/core";
import { lazy, Suspense, useEffect, useState } from "react";
import { useToast } from "../../components/Toast";
import { SelectField } from "../../components/ui";
import { AnnualGrid } from "./AnnualGrid";
import RotationGeneratorButton from "./RotationGeneratorButton";
import { useAnnualSchedule } from "./use-annual-schedule";

const AnnualAutoDistribute = lazy(() =>
  import("./AnnualAutoDistribute").then((module) => ({ default: module.AnnualAutoDistribute }))
);
const AnnualGenerator = lazy(() =>
  import("./AnnualGenerator").then((module) => ({ default: module.AnnualGenerator }))
);

function AnnualPanelFallback() {
  return <p className="empty-note">Carregando...</p>;
}

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
  const { toast } = useToast();

  useEffect(() => {
    if (saveError) {
      toast(saveError, { variant: "danger" });
    }
  }, [saveError, toast]);

  const volunteers = snapshot.volunteers ?? [];

  async function onSaveClick() {
    const success = await handleSave();
    if (success) {
      toast(`${pendingCount} ${pendingCount === 1 ? "mudanca salva" : "mudancas salvas"}.`, {
        variant: "success"
      });
    }
  }

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
          onClick={onSaveClick}
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

      <RotationGeneratorButton
        yearItems={yearItems}
        rotationRules={snapshot.rotationRules}
        pending={pending}
        setPendingForCell={setPendingForCell}
      />

      <Suspense fallback={<AnnualPanelFallback />}>
        {autoOpen && (
          <AnnualAutoDistribute
            open={autoOpen}
            onClose={() => setAutoOpen(false)}
            volunteers={volunteers}
            yearItems={yearItems}
            pending={pending}
            setPendingForCell={setPendingForCell}
          />
        )}

        <AnnualGenerator
          volunteers={volunteers}
          yearItems={yearItems}
          schedule={snapshot.schedule}
          pending={pending}
          applyPendingMap={applyPendingMap}
        />
      </Suspense>

      <AnnualGrid
        yearItems={yearItems}
        pending={pending}
        volunteers={volunteers}
        setPendingForCell={setPendingForCell}
        year={year}
        commemorations={snapshot.commemorations}
      />
    </section>
  );
}
