import type { PrayerRequest } from "@4ibib/core";
import { useMemo } from "react";
import { ListToolbar, Pagination, SelectField } from "../components/ui";
import { useUpdatePrayerStatus } from "../hooks";
import {
  compareText,
  formatDateTimeLabel,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  PRAYER_SORT_OPTIONS,
  PRAYER_STATUS_OPTIONS,
  type ListState
} from "../utils";

interface PrayersViewProps {
  prayers: PrayerRequest[];
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
  statusFilter: PrayerRequest["status"] | "all";
  onStatusFilterChange: (value: PrayerRequest["status"] | "all") => void;
}

export default function PrayersView({
  prayers,
  state,
  onStateChange,
  statusFilter,
  onStatusFilterChange
}: PrayersViewProps) {
  const updateStatusMutation = useUpdatePrayerStatus();

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = prayers.filter((item) => {
      const statusMatches = statusFilter === "all" || item.status === statusFilter;
      return statusMatches && matchesSearch(query, [item.name, item.contact, item.message, item.status]);
    });
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "createdAsc") {
        return Date.parse(left.createdAt) - Date.parse(right.createdAt);
      }
      if (state.sort === "statusAsc") {
        return compareText(left.status, right.status);
      }
      if (state.sort === "nameAsc") {
        return compareText(left.name, right.name);
      }
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
    return paginateItems(sorted, state.page);
  }, [prayers, state, statusFilter]);

  return (
    <section>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Cuidado</p>
          <h1>Pedidos de oracao</h1>
        </div>
      </header>
      <div className="list-panel">
        <ListToolbar
          search={state.search}
          searchLabel="Nome, contato, pedido ou status"
          sort={state.sort}
          sortOptions={PRAYER_SORT_OPTIONS}
          total={list.total}
          onSearch={(search) => onStateChange({ search, page: 1 })}
          onSort={(sort) => onStateChange({ sort, page: 1 })}
        >
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(event) => {
              onStatusFilterChange(event.currentTarget.value as PrayerRequest["status"] | "all");
              onStateChange({ page: 1 });
            }}
          >
            {PRAYER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </ListToolbar>
        {list.items.map((request) => (
          <article className="prayer-row" key={request.id}>
            <div>
              <strong>{request.name}</strong>
              <span>{formatDateTimeLabel(request.createdAt)}</span>
              <span>{request.contact || "Sem contato"}</span>
              <p>{request.message}</p>
            </div>
            <SelectField
              label="Status"
              value={request.status}
              onChange={(event) =>
                updateStatusMutation.mutate({
                  id: request.id,
                  status: event.currentTarget.value as PrayerRequest["status"]
                })
              }
            >
              <option value="novo">Novo</option>
              <option value="em_oracao">Em oracao</option>
              <option value="concluido">Concluido</option>
            </SelectField>
          </article>
        ))}
        {list.items.length === 0 && <p className="empty-note">Nenhum pedido encontrado.</p>}
        <Pagination list={list} onPageChange={(page) => onStateChange({ page })} />
      </div>
    </section>
  );
}
