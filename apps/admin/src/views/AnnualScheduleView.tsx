import { type ScheduleBulkPatch, type ScheduleItem, type SiteSnapshot, type Volunteer } from "@4ibib/core";
import { useMemo, useState } from "react";
import { Field, SelectField } from "../components/ui";
import { useBulkUpdateScheduleItems } from "../hooks";

type RoleColumn = "preacher" | "director" | "soundTeam";

interface AnnualScheduleViewProps {
  snapshot: SiteSnapshot;
}

interface PendingState {
  preacher?: string;
  director?: string;
  soundTeam?: string;
}

type Frequency = "weekly" | "biweekly" | "monthly_1x" | "monthly_2x" | "every_2_months" | "every_3_months";

type WeekdayFilter = "any" | 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface GeneratorRule {
  id: string;
  volunteerName: string;
  role: RoleColumn;
  frequency: Frequency;
  weekday: WeekdayFilter;
}

const ROLE_LABELS: Record<RoleColumn, string> = {
  preacher: "Pregador",
  director: "Dirigente",
  soundTeam: "Som"
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: "Toda semana",
  biweekly: "Dia sim, dia nao (a cada 2 semanas)",
  monthly_1x: "1x por mes",
  monthly_2x: "2x por mes",
  every_2_months: "1x a cada 2 meses",
  every_3_months: "1x por trimestre"
};

const WEEKDAY_OPTIONS: Array<{ value: WeekdayFilter; label: string }> = [
  { value: "any", label: "Qualquer" },
  { value: 0, label: "Domingo" },
  { value: 4, label: "Quinta" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terca" },
  { value: 3, label: "Quarta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sabado" }
];

function makeRuleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rule-${Math.random().toString(36).slice(2, 10)}`;
}

function pickByCadence(eligible: ScheduleItem[], frequency: Frequency): ScheduleItem[] {
  if (eligible.length === 0) return [];
  if (frequency === "weekly") return eligible;
  if (frequency === "biweekly") return eligible.filter((_, index) => index % 2 === 0);

  const groups = new Map<string, ScheduleItem[]>();
  const order: string[] = [];
  for (const item of eligible) {
    const date = new Date(item.startsAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }

  const picks: ScheduleItem[] = [];
  if (frequency === "monthly_1x") {
    for (const key of order) {
      picks.push(groups.get(key)![0]);
    }
    return picks;
  }
  if (frequency === "monthly_2x") {
    for (const key of order) {
      picks.push(...groups.get(key)!.slice(0, 2));
    }
    return picks;
  }
  if (frequency === "every_2_months") {
    for (const key of order) {
      const month = Number(key.split("-")[1]);
      if (month % 2 === 0) {
        picks.push(groups.get(key)![0]);
      }
    }
    return picks;
  }
  if (frequency === "every_3_months") {
    for (const key of order) {
      const month = Number(key.split("-")[1]);
      if (month % 3 === 0) {
        picks.push(groups.get(key)![0]);
      }
    }
    return picks;
  }
  return picks;
}

function generateAssignments(
  rules: GeneratorRule[],
  items: ScheduleItem[],
  current: Map<string, PendingState>,
  schedule: ScheduleItem[],
  overwrite: boolean
): { next: Map<string, PendingState>; assignments: number } {
  const next = new Map<string, PendingState>();
  current.forEach((value, key) => {
    next.set(key, { ...value });
  });

  let assignments = 0;
  const itemById = new Map<string, ScheduleItem>();
  for (const item of schedule) {
    itemById.set(item.id, item);
  }

  for (const rule of rules) {
    const trimmed = rule.volunteerName.trim();
    if (!trimmed) continue;

    const eligible = items.filter((item) => {
      if (item.status !== "scheduled") return false;
      const date = new Date(item.startsAt);
      if (rule.weekday !== "any" && date.getDay() !== rule.weekday) return false;
      const merged = applyPending(item, next.get(item.id));
      const currentValue = getCurrentValue(merged, rule.role).trim();
      return overwrite || currentValue === "";
    });

    const picks = pickByCadence(eligible, rule.frequency);

    for (const item of picks) {
      const original = itemById.get(item.id);
      if (!original) continue;
      const existing = next.get(item.id) ?? {};
      const updated: PendingState = { ...existing, [rule.role]: trimmed };
      const cleaned: PendingState = {};
      (Object.keys(updated) as RoleColumn[]).forEach((key) => {
        const candidate = updated[key];
        if (candidate !== undefined && candidate !== getCurrentValue(original, key)) {
          cleaned[key] = candidate;
        }
      });
      if (Object.keys(cleaned).length === 0) {
        next.delete(item.id);
      } else {
        next.set(item.id, cleaned);
      }
      assignments += 1;
    }
  }

  return { next, assignments };
}

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit"
});

const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit"
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit"
});

function getCurrentValue(item: ScheduleItem, role: RoleColumn): string {
  if (role === "preacher") return item.preacher;
  if (role === "director") return item.director;
  return item.soundTeam;
}

function applyPending(item: ScheduleItem, pending: PendingState | undefined): ScheduleItem {
  if (!pending) return item;
  return {
    ...item,
    preacher: pending.preacher ?? item.preacher,
    director: pending.director ?? item.director,
    soundTeam: pending.soundTeam ?? item.soundTeam
  };
}

function startOfWeek(value: string): number {
  const date = new Date(value);
  const day = date.getDay();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

function eligibleVolunteers(volunteers: Volunteer[], role: RoleColumn): Volunteer[] {
  const expectedRole = role === "soundTeam" ? "som" : "geral";
  return volunteers
    .filter((volunteer) => volunteer.role === expectedRole)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export default function AnnualScheduleView({ snapshot }: AnnualScheduleViewProps) {
  const bulkMutation = useBulkUpdateScheduleItems();

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const item of snapshot.schedule) {
      const parsed = new Date(item.startsAt);
      if (Number.isFinite(parsed.getTime())) {
        years.add(parsed.getFullYear());
      }
    }
    return Array.from(years).sort((left, right) => left - right);
  }, [snapshot.schedule, currentYear]);

  const [year, setYear] = useState<number>(currentYear);
  const [ministryFilter, setMinistryFilter] = useState<string>("all");
  const [pending, setPending] = useState<Map<string, PendingState>>(new Map());
  const [activeCell, setActiveCell] = useState<{ id: string; role: RoleColumn } | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoVolunteer, setAutoVolunteer] = useState("");
  const [autoRole, setAutoRole] = useState<RoleColumn>("preacher");
  const [autoCount, setAutoCount] = useState(4);
  const [autoAvoidConflicts, setAutoAvoidConflicts] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generatorRules, setGeneratorRules] = useState<GeneratorRule[]>([]);
  const [generatorOverwrite, setGeneratorOverwrite] = useState(false);
  const [generatorMessage, setGeneratorMessage] = useState<string | null>(null);

  const ministryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of snapshot.schedule) {
      if (item.ministry.trim()) {
        set.add(item.ministry);
      }
    }
    return Array.from(set).sort((left, right) => left.localeCompare(right, "pt-BR"));
  }, [snapshot.schedule]);

  const yearItems = useMemo(() => {
    return snapshot.schedule
      .filter((item) => {
        const parsed = new Date(item.startsAt);
        if (!Number.isFinite(parsed.getTime())) return false;
        if (parsed.getFullYear() !== year) return false;
        if (ministryFilter !== "all" && item.ministry !== ministryFilter) return false;
        return true;
      })
      .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  }, [snapshot.schedule, year, ministryFilter]);

  const volunteers = snapshot.volunteers ?? [];

  function setPendingForCell(itemId: string, role: RoleColumn, value: string) {
    setPending((current) => {
      const next = new Map(current);
      const existing = next.get(itemId) ?? {};
      const updated: PendingState = { ...existing, [role]: value };
      const original = snapshot.schedule.find((entry) => entry.id === itemId);
      if (original) {
        const stillDifferent = (Object.keys(updated) as RoleColumn[]).some(
          (key) => updated[key] !== undefined && updated[key] !== getCurrentValue(original, key)
        );
        const cleaned: PendingState = {};
        (Object.keys(updated) as RoleColumn[]).forEach((key) => {
          const candidate = updated[key];
          if (candidate !== undefined && candidate !== getCurrentValue(original, key)) {
            cleaned[key] = candidate;
          }
        });
        if (!stillDifferent || Object.keys(cleaned).length === 0) {
          next.delete(itemId);
          return next;
        }
        next.set(itemId, cleaned);
        return next;
      }
      next.set(itemId, updated);
      return next;
    });
  }

  function clearPending() {
    setPending(new Map());
  }

  function handleAutoDistribute() {
    const trimmed = autoVolunteer.trim();
    if (!trimmed || autoCount <= 0) {
      setAutoOpen(false);
      return;
    }
    const now = Date.now();
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

    setAutoOpen(false);
  }

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
      snapshot.schedule,
      generatorOverwrite
    );
    setPending(next);
    if (assignments === 0) {
      setGeneratorMessage("Nenhuma celula elegivel encontrada para as regras informadas.");
    } else {
      setGeneratorMessage(
        `Geradas ${assignments} ${assignments === 1 ? "atribuicao" : "atribuicoes"}. Revise o grid antes de salvar.`
      );
    }
  }

  function buildBatch(): Array<{ id: string; patch: ScheduleBulkPatch }> {
    const batch: Array<{ id: string; patch: ScheduleBulkPatch }> = [];
    pending.forEach((state, id) => {
      const patch: ScheduleBulkPatch = {};
      if (state.preacher !== undefined) patch.preacher = state.preacher;
      if (state.director !== undefined) patch.director = state.director;
      if (state.soundTeam !== undefined) patch.soundTeam = state.soundTeam;
      if (Object.keys(patch).length > 0) {
        batch.push({ id, patch });
      }
    });
    return batch;
  }

  function detectConflicts(): string[] {
    const warnings: string[] = [];
    const byRoleVolunteerWeek = new Map<string, ScheduleItem[]>();
    for (const item of yearItems) {
      const merged = applyPending(item, pending.get(item.id));
      const week = startOfWeek(item.startsAt);
      (Object.keys(ROLE_LABELS) as RoleColumn[]).forEach((role) => {
        const value = getCurrentValue(merged, role);
        if (!value.trim()) return;
        const names =
          role === "soundTeam"
            ? value
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean)
            : [value.trim()];
        for (const name of names) {
          const key = `${role}::${name}::${week}`;
          const list = byRoleVolunteerWeek.get(key) ?? [];
          list.push(item);
          byRoleVolunteerWeek.set(key, list);
        }
      });
    }
    byRoleVolunteerWeek.forEach((items, key) => {
      if (items.length < 2) return;
      const [role, name] = key.split("::");
      const dates = items.map((entry) => FULL_DATE_FORMATTER.format(new Date(entry.startsAt))).join(" e ");
      warnings.push(
        `${ROLE_LABELS[role as RoleColumn]} ${name} ${items.length}x na mesma semana (${dates}).`
      );
    });
    return warnings;
  }

  async function handleSave() {
    const batch = buildBatch();
    if (batch.length === 0) return;
    const conflicts = detectConflicts();
    if (conflicts.length > 0) {
      const message = `Atencao:\n${conflicts.join("\n")}\nContinuar?`;
      if (!window.confirm(message)) {
        return;
      }
    }
    setSaveError(null);
    try {
      const grouped = new Map<string, string[]>();
      for (const entry of batch) {
        const key = JSON.stringify(entry.patch);
        const list = grouped.get(key) ?? [];
        list.push(entry.id);
        grouped.set(key, list);
      }
      for (const [key, ids] of grouped.entries()) {
        const patch = JSON.parse(key) as ScheduleBulkPatch;
        await bulkMutation.mutateAsync({ ids, patch });
      }
      clearPending();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Falha ao salvar mudancas.");
    }
  }

  const pendingCount = useMemo(() => buildBatch().length, [pending, snapshot.schedule]);

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

  const generalOptions = eligibleVolunteers(volunteers, "preacher");
  const soundOptions = eligibleVolunteers(volunteers, "soundTeam");
  const autoOptions = autoRole === "soundTeam" ? soundOptions : generalOptions;

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
          disabled={pendingCount === 0 || bulkMutation.isPending}
        >
          {pendingCount === 0
            ? "Sem mudancas"
            : `Salvar ${pendingCount} ${pendingCount === 1 ? "mudanca" : "mudancas"}`}
        </button>
        {pendingCount > 0 && (
          <button
            type="button"
            className="button ghost"
            onClick={clearPending}
            disabled={bulkMutation.isPending}
          >
            Descartar
          </button>
        )}
      </div>

      {saveError && <p className="form-error">{saveError}</p>}

      {autoOpen && (
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
            <button type="button" className="button primary" onClick={handleAutoDistribute}>
              Aplicar
            </button>
            <button type="button" className="button ghost" onClick={() => setAutoOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

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

      {yearItems.length === 0 ? (
        <p className="empty-note">Nenhum item de programacao para {year}.</p>
      ) : (
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
      )}
    </section>
  );
}
