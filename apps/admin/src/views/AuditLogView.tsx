import type { AuditAction, AuditLogEntry, AuditLogFilter } from "@4ibib/core";
import { History, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "../components/EmptyState";
import FilterChips, { type ChipOption } from "../components/Layout/FilterChips";
import ViewHeader from "../components/Layout/ViewHeader";
import { Modal } from "../components/Modal";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { Field, Pagination } from "../components/ui";
import { useAuditLog, useRevertAuditEntry } from "../hooks";
import { AUDIT_ACTION_OPTIONS, AUDIT_TABLE_OPTIONS } from "../lib/labels";
import { paginateItems, type ListState } from "../lib/list-state";
import AuditTimelineItem from "./audit/AuditTimelineItem";

interface AuditLogViewProps {
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type ActionFilter = "all" | AuditAction;
type TableFilter = "all" | string;

const TABLE_CHIP_OPTIONS: ReadonlyArray<ChipOption<string>> = AUDIT_TABLE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.value === "all" ? "Todos" : option.label
}));

const ACTION_CHIP_OPTIONS: ReadonlyArray<ChipOption<ActionFilter>> = AUDIT_ACTION_OPTIONS.map((option) => ({
  value: option.value as ActionFilter,
  label: option.value === "all" ? "Todas" : option.label
}));

function inputDateTimeToIso(value: string): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function buildFilter(
  tableFilter: TableFilter,
  actionFilter: ActionFilter,
  since: string,
  until: string
): AuditLogFilter | undefined {
  const filter: AuditLogFilter = {};

  if (tableFilter !== "all") {
    filter.tableName = tableFilter;
  }

  if (actionFilter !== "all") {
    filter.action = actionFilter;
  }

  const sinceIso = inputDateTimeToIso(since);
  if (sinceIso) {
    filter.since = sinceIso;
  }

  const untilIso = inputDateTimeToIso(until);
  if (untilIso) {
    filter.until = untilIso;
  }

  return Object.keys(filter).length === 0 ? undefined : filter;
}

export default function AuditLogView({ state, onStateChange }: AuditLogViewProps) {
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { toast } = useToast();

  const hasAdvancedFilters = since !== "" || until !== "";

  const filter = useMemo(
    () => buildFilter(tableFilter, actionFilter, since, until),
    [tableFilter, actionFilter, since, until]
  );

  const auditQuery = useAuditLog(filter);
  const revertMutation = useRevertAuditEntry();

  const entries = useMemo<AuditLogEntry[]>(() => auditQuery.data ?? [], [auditQuery.data]);

  const list = useMemo(() => {
    const sorted = [...entries].sort(
      (left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt)
    );
    return paginateItems(sorted, state.page);
  }, [entries, state.page]);

  async function handleRevert(entry: AuditLogEntry) {
    try {
      await revertMutation.mutateAsync(entry.id);
      toast("Mudanca revertida. O registro voltou ao estado anterior.", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui reverter — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  function resetAdvancedFilters() {
    setSince("");
    setUntil("");
    onStateChange({ page: 1 });
  }

  const advancedFields: ReactNode = (
    <>
      <Field
        label="Desde"
        type="datetime-local"
        value={since}
        onChange={(event) => {
          setSince(event.currentTarget.value);
          onStateChange({ page: 1 });
        }}
      />
      <Field
        label="Ate"
        type="datetime-local"
        value={until}
        onChange={(event) => {
          setUntil(event.currentTarget.value);
          onStateChange({ page: 1 });
        }}
      />
    </>
  );

  function renderBody() {
    if (auditQuery.isPending) {
      return <SkeletonRows count={3} />;
    }

    if (auditQuery.isError) {
      const message =
        auditQuery.error instanceof Error
          ? auditQuery.error.message
          : "Nao foi possivel carregar a auditoria.";
      return (
        <p className="empty-note" role="alert">
          {message}
        </p>
      );
    }

    if (list.items.length === 0) {
      return (
        <div className="audit-timeline-empty">
          <EmptyState
            icon={<History size={32} />}
            title="Nada por aqui ainda."
            description="Mexa nos filtros ou espere alguem editar — toda mudanca aparece aqui."
          />
        </div>
      );
    }

    return (
      <ol className="audit-timeline">
        {list.items.map((entry) => (
          <AuditTimelineItem
            key={entry.id}
            entry={entry}
            onRevert={handleRevert}
            reverting={revertMutation.isPending}
          />
        ))}
      </ol>
    );
  }

  return (
    <>
      <ViewHeader
        title="Auditoria"
        lead="Histórico de mudanças no painel"
        primaryAction={
          <button
            type="button"
            className="button ghost audit-timeline-advanced-trigger"
            onClick={() => setFiltersOpen(true)}
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal size={16} />
            <span>Filtros</span>
            {hasAdvancedFilters && <span className="audit-timeline-advanced-dot" aria-hidden="true" />}
          </button>
        }
      />

      <div className="audit-timeline-shell">
        <div className="audit-timeline-controls">
          <div className="audit-timeline-controls-row">
            <p className="audit-timeline-controls-label">Tabela</p>
          </div>
          <FilterChips
            ariaLabel="Tabela"
            value={tableFilter}
            onChange={(value) => {
              setTableFilter(value);
              onStateChange({ page: 1 });
            }}
            options={TABLE_CHIP_OPTIONS}
          />

          <div className="audit-timeline-controls-row">
            <p className="audit-timeline-controls-label">Acao</p>
          </div>
          <FilterChips
            ariaLabel="Acao"
            value={actionFilter}
            onChange={(value) => {
              setActionFilter(value);
              onStateChange({ page: 1 });
            }}
            options={ACTION_CHIP_OPTIONS}
          />
        </div>

        {renderBody()}

        {list.items.length > 0 && <Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros avançados"
        size="sm"
        footer={
          <>
            <button type="button" className="button ghost" onClick={resetAdvancedFilters}>
              Limpar
            </button>
            <button type="button" className="button primary" onClick={() => setFiltersOpen(false)}>
              Aplicar
            </button>
          </>
        }
      >
        <div className="audit-filters-modal">{advancedFields}</div>
      </Modal>
    </>
  );
}
