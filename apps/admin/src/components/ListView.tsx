import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { SkeletonRows } from "./Skeleton";

export interface ListViewProps<T> {
  title: string;
  count?: number;
  primaryAction?: ReactNode;
  toolbar?: ReactNode;
  items: T[];
  renderItem: (item: T) => ReactNode;
  loading?: boolean;
  error?: { message: string; onRetry?: () => void } | null;
  emptyState?: ReactNode;
  footer?: ReactNode;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: ReactNode;
  getId?: (item: T) => string;
}

export function ListView<T>(props: ListViewProps<T>) {
  const {
    title,
    count,
    primaryAction,
    toolbar,
    items,
    renderItem,
    loading,
    error,
    emptyState,
    footer,
    selectable,
    selectedIds = [],
    onSelectionChange,
    bulkActions,
    getId
  } = props;

  const hasSelection = selectable && selectedIds.length > 0;
  const allIds = selectable && getId ? items.map(getId) : [];
  const allSelected = selectable && allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  function toggleAll() {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : allIds);
  }

  function toggleOne(id: string) {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((current) => current !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  return (
    <section className="listview">
      <header className="listview-header">
        <div className="listview-heading">
          <h1 className="listview-title">{title}</h1>
          {typeof count === "number" && <span className="listview-count">{count}</span>}
        </div>
        {primaryAction && <div className="listview-primary">{primaryAction}</div>}
      </header>

      {toolbar && <div className="listview-toolbar">{toolbar}</div>}

      {hasSelection && bulkActions && (
        <div className="listview-bulk" role="region" aria-label="Acoes em massa">
          <span className="listview-bulk-count">{selectedIds.length} selecionado(s)</span>
          <div className="listview-bulk-actions">{bulkActions}</div>
        </div>
      )}

      <div className="listview-body">
        {loading ? (
          <SkeletonRows count={3} />
        ) : error ? (
          <div className="listview-error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error.message}</span>
            {error.onRetry && (
              <button type="button" className="button ghost" onClick={error.onRetry}>
                <RefreshCw size={14} /> Tentar novamente
              </button>
            )}
          </div>
        ) : items.length === 0 ? (
          (emptyState ?? <p className="empty-note">Nenhum item.</p>)
        ) : (
          <ul className="listview-rows">
            {selectable && getId && (
              <li className="listview-select-all">
                <label>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                  <span>Selecionar todos</span>
                </label>
              </li>
            )}
            {items.map((item, index) => {
              const id = selectable && getId ? getId(item) : undefined;
              const selected = id !== undefined && selectedIds.includes(id);
              return (
                <li key={id ?? `row-${index}`} className={`listview-row${selected ? " selected" : ""}`}>
                  {selectable && id !== undefined && (
                    <input
                      type="checkbox"
                      className="listview-row-check"
                      checked={selected}
                      onChange={() => toggleOne(id)}
                      aria-label="Selecionar item"
                    />
                  )}
                  <div className="listview-row-content">{renderItem(item)}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {footer && <div className="listview-footer">{footer}</div>}
    </section>
  );
}

export default ListView;
