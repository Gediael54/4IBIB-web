import { type ScheduleItem, type SiteSnapshot, type Volunteer } from "@4ibib/core";
import { useState } from "react";
import { SelectField } from "../../components/ui";
import {
  FREQUENCY_LABELS,
  type Frequency,
  generateAssignments,
  type GeneratorRule,
  makeRuleId,
  type PendingState,
  type RoleColumn,
  WEEKDAY_OPTIONS,
  type WeekdayFilter
} from "./cadence";
import { eligibleVolunteers } from "./AnnualGrid";

interface AnnualGeneratorProps {
  volunteers: Volunteer[];
  yearItems: ScheduleItem[];
  schedule: SiteSnapshot["schedule"];
  pending: Map<string, PendingState>;
  applyPendingMap: (next: Map<string, PendingState>) => void;
}

export function AnnualGenerator({
  volunteers,
  yearItems,
  schedule,
  pending,
  applyPendingMap
}: AnnualGeneratorProps) {
  const [generatorRules, setGeneratorRules] = useState<GeneratorRule[]>([]);
  const [generatorOverwrite, setGeneratorOverwrite] = useState(false);
  const [generatorMessage, setGeneratorMessage] = useState<string | null>(null);

  function addGeneratorRule() {
    setGeneratorRules((current) => [
      ...current,
      {
        id: makeRuleId(),
        volunteerName: "",
        role: "preacher",
        frequency: "monthly_1x",
        weekday: "any"
      }
    ]);
    setGeneratorMessage(null);
  }

  function updateGeneratorRule(id: string, patch: Partial<Omit<GeneratorRule, "id">>) {
    setGeneratorRules((current) =>
      current.map((rule) => {
        if (rule.id !== id) return rule;
        const next = { ...rule, ...patch };
        if (patch.role !== undefined && patch.role !== rule.role) {
          next.volunteerName = "";
        }
        return next;
      })
    );
    setGeneratorMessage(null);
  }

  function removeGeneratorRule(id: string) {
    setGeneratorRules((current) => current.filter((rule) => rule.id !== id));
    setGeneratorMessage(null);
  }

  function clearGeneratorRules() {
    setGeneratorRules([]);
    setGeneratorMessage(null);
  }

  function handleGenerate() {
    const validRules = generatorRules.filter((rule) => rule.volunteerName.trim() !== "");
    if (validRules.length === 0) {
      setGeneratorMessage("Adicione ao menos uma regra com voluntario selecionado.");
      return;
    }
    const { next, assignments } = generateAssignments(
      validRules,
      yearItems,
      pending,
      schedule,
      generatorOverwrite
    );
    applyPendingMap(next);
    if (assignments === 0) {
      setGeneratorMessage("Nenhuma celula elegivel encontrada para as regras informadas.");
    } else {
      setGeneratorMessage(
        `Geradas ${assignments} ${assignments === 1 ? "atribuicao" : "atribuicoes"}. Revise o grid antes de salvar.`
      );
    }
  }

  return (
    <details className="annual-generator">
      <summary>Gerador de escalas (cadencia por voluntario)</summary>
      <p className="annual-generator-help">
        Defina regras tipo "1x por mes", "2x por mes", "a cada 2 meses" por voluntario e gere a escala
        automaticamente.
      </p>

      {generatorRules.length === 0 ? (
        <p className="empty-note">Nenhuma regra adicionada ainda.</p>
      ) : (
        <div className="annual-generator-rules">
          {generatorRules.map((rule) => {
            const ruleVolunteerOptions = eligibleVolunteers(volunteers, rule.role);
            return (
              <div key={rule.id} className="annual-generator-rule">
                <SelectField
                  label="Voluntario"
                  value={rule.volunteerName}
                  onChange={(event) =>
                    updateGeneratorRule(rule.id, { volunteerName: event.currentTarget.value })
                  }
                >
                  <option value="">Selecione...</option>
                  {ruleVolunteerOptions.map((volunteer) => (
                    <option key={volunteer.id} value={volunteer.name}>
                      {volunteer.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Funcao"
                  value={rule.role}
                  onChange={(event) =>
                    updateGeneratorRule(rule.id, {
                      role: event.currentTarget.value as RoleColumn
                    })
                  }
                >
                  <option value="preacher">Pregador</option>
                  <option value="director">Dirigente</option>
                  <option value="soundTeam">Som</option>
                </SelectField>
                <SelectField
                  label="Cadencia"
                  value={rule.frequency}
                  onChange={(event) =>
                    updateGeneratorRule(rule.id, {
                      frequency: event.currentTarget.value as Frequency
                    })
                  }
                >
                  {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {FREQUENCY_LABELS[frequency]}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Dia da semana"
                  value={String(rule.weekday)}
                  onChange={(event) => {
                    const raw = event.currentTarget.value;
                    const next: WeekdayFilter = raw === "any" ? "any" : (Number(raw) as WeekdayFilter);
                    updateGeneratorRule(rule.id, { weekday: next });
                  }}
                >
                  {WEEKDAY_OPTIONS.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <button type="button" className="button ghost" onClick={() => removeGeneratorRule(rule.id)}>
                  Remover
                </button>
              </div>
            );
          })}
        </div>
      )}

      <label className="annual-auto-toggle">
        <input
          type="checkbox"
          checked={generatorOverwrite}
          onChange={(event) => setGeneratorOverwrite(event.currentTarget.checked)}
        />
        Sobrescrever celulas ja preenchidas
      </label>

      <div className="annual-generator-actions">
        <button type="button" className="button ghost" onClick={addGeneratorRule}>
          Adicionar regra
        </button>
        <button
          type="button"
          className="button primary"
          onClick={handleGenerate}
          disabled={generatorRules.length === 0}
        >
          Gerar
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={clearGeneratorRules}
          disabled={generatorRules.length === 0}
        >
          Limpar regras
        </button>
      </div>

      {generatorMessage && <p className="annual-generator-message">{generatorMessage}</p>}
    </details>
  );
}
