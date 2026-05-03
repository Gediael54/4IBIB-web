import { formatDateTime, type AuditAction, type AuditLogEntry, type AuditLogFilter } from "@4ibib/core";
import { History, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "../components/EmptyState";
import { ListView } from "../components/ListView";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { Field, ListToolbar, Pagination, SelectField } from "../components/ui";
import { useAuditLog, useRevertAuditEntry } from "../hooks";
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_OPTIONS, AUDIT_TABLE_OPTIONS } from "../lib/labels";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  type ListState
} from "../lib/list-state";
import { AUDIT_SORT_OPTIONS } from "../lib/sort-options";

interface AuditLogViewProps {
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type ActionFilter = "all" | AuditAction;

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
  tableFilter: string,
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

function snippetForSearch(entry: AuditLogEntry): string {
  const payload = entry.newRow ?? entry.oldRow;
  if (!payload) {
    return "";
  }

  return JSON.stringify(payload).slice(0, 500);
}

export default function AuditLogView({ state, onStateChange }: AuditLogViewProps) {
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { toast } = useToast();

  const hasActiveFilters = tableFilter !== "all" || actionFilter !== "all" || since !== "" || until !== "";

  const filter = useMemo(
    () => buildFilter(tableFilter, actionFilter, since, until),
    [tableFilter, actionFilter, since, until]
  );

  const auditQuery = useAuditLog(filter);
  const revertMutation = useRevertAuditEntry();

  const entries = useMemo<AuditLogEntry[]>(() => auditQuery.data ?? [], [auditQuery.data]);

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = entries.filter((entry) =>
      matchesSearch(query, [entry.tableName, entry.rowId, entry.action, snippetForSearch(entry)])
    );
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "changedAsc") {
        return Date.parse(left.changedAt) - Date.parse(right.changedAt);
      }
      if (state.sort === "tableAsc") {
        const byTable = compareText(left.tableName, right.tableName);
        if (byTable !== 0) {
          return byTable;
        }
        return Date.parse(right.changedAt) - Date.parse(left.changedAt);
      }
      return Date.parse(right.changedAt) - Date.parse(left.changedAt);
    });
    return paginateItems(sorted, state.page);
  }, [entries, state]);

  async function handleRevert(entry: AuditLogEntry) {
    try {
      await revertMutation.mutateAsync(entry.id);
      toast("Mudanca revertida.", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui reverter — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  function resetFilters() {
    setTableFilter("all");
    setActionFilter("all");
    setSince("");
    setUntil("");
    onStateChange({ page: 1 });
  }

  const filterFields: ReactNode = (
    <>
      <SelectField
        label="Tabela"
        value={tableFilter}
        onChange={(event) => {
          setTableFilter(event.currentTarget.value);
          onStateChange({ page: 1 });
        }}
      >
        {AUDIT_TABLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Acao"
        value={actionFilter}
        onChange={(event) => {
          setActionFilter(event.currentTarget.value as ActionFilter);
          onStateChange({ page: 1 });
        }}
      >
        {AUDIT_ACTION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
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

  return (
    <>
      <ListView
        title="Auditoria de mudancas"
        count={list.total}
        primaryAction={
          <button
            type="button"
            className="button ghost audit-filters-trigger"
            onClick={() => setFiltersOpen(true)}
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal size={16} />
            <span>Filtros</span>
            {hasActiveFilters && <span className="audit-filters-dot" aria-hidden="true" />}
          </button>
        }
        toolbar={
          <ListToolbar
            search={state.search}
            searchLabel="Tabela, registro, acao ou conteudo"
            sort={state.sort}
            sortOptions={AUDIT_SORT_OPTIONS}
            total={list.total}
            onSearch={(search) => onStateChange({ search, page: 1 })}
            onSort={(sort) => onStateChange({ sort, page: 1 })}
          >
            <div className="audit-filters-inline">{filterFields}</div>
          </ListToolbar>
        }
        items={list.items}
        loading={auditQuery.isPending}
        error={
          auditQuery.isError
            ? {
                message:
                  auditQuery.error instanceof Error
                    ? auditQuery.error.message
                    : "Nao foi possivel carregar a auditoria."
              }
            : null
        }
        getId={(entry) => entry.id}
        emptyState={
          <EmptyState
            icon={<History size={32} />}
            title="Nada por aqui ainda."
            description="Mexa nos filtros ou espere alguem editar — toda mudanca aparece aqui."
          />
        }
        footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
        renderItem={(entry) => (
          <article className="audit-row">
            <div>
              <strong>
                {entry.tableName} - {AUDIT_ACTION_LABELS[entry.action]}
              </strong>
              <span>{formatDateTime(entry.changedAt)}</span>
              <span>Row {entry.rowId}</span>
              <span>By: {entry.changedBy ?? "sistema"}</span>
              <details>
                <summary>Mudancas</summary>
                {entry.oldRow && (
                  <div>
                    <p className="field-label">Antes:</p>
                    <pre>{JSON.stringify(entry.oldRow, null, 2)}</pre>
                  </div>
                )}
                {entry.newRow && (
                  <div>
                    <p className="field-label">Depois:</p>
                    <pre>{JSON.stringify(entry.newRow, null, 2)}</pre>
                  </div>
                )}
              </details>
            </div>
            <div className="row-actions">
              <button
                className="button ghost"
                type="button"
                disabled={revertMutation.isPending}
                onClick={() => handleRevert(entry)}
              >
                Reverter
              </button>
            </div>
          </article>
        )}
      />
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        size="sm"
        footer={
          <>
            <button type="button" className="button ghost" onClick={resetFilters}>
              Limpar
            </button>
            <button type="button" className="button primary" onClick={() => setFiltersOpen(false)}>
              Aplicar
            </button>
          </>
        }
      >
        <div className="audit-filters-modal">{filterFields}</div>
      </Modal>
    </>
  );
}
