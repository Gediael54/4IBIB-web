import { buildWhatsAppUrl, type AdminUser, type PrayerRequest } from "@4ibib/core";
import { useMemo } from "react";
import { ListToolbar, Pagination, SelectField, TextAreaField } from "../components/ui";
import { useAdmins, useUpdatePrayer, useUpdatePrayerStatus } from "../hooks";
import {
  compareText,
  formatDateTimeLabel,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  PRAYER_SORT_OPTIONS,
  PRAYER_STATUS_OPTIONS,
  TEXTAREA_MAX,
  type ListState
} from "../utils";

interface PrayersViewProps {
  prayers: PrayerRequest[];
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
  statusFilter: PrayerRequest["status"] | "all";
  onStatusFilterChange: (value: PrayerRequest["status"] | "all") => void;
}

const WHATSAPP_DEFAULT_MESSAGE = "Ola, recebemos seu pedido de oracao na 4a Betel. Estamos orando por voce.";

function buildWhatsAppForPrayer(contact: string): string | null {
  const digits = contact.replace(/\D+/g, "");
  if (digits.length < 10) return null;
  return buildWhatsAppUrl(digits, WHATSAPP_DEFAULT_MESSAGE);
}

function formatAdminLabel(admin: AdminUser): string {
  if (admin.email) return admin.email;
  return `(sem email) - ${admin.userId.slice(0, 6)}`;
}

export default function PrayersView({
  prayers,
  state,
  onStateChange,
  statusFilter,
  onStatusFilterChange
}: PrayersViewProps) {
  const updateStatusMutation = useUpdatePrayerStatus();
  const updatePrayerMutation = useUpdatePrayer();
  const adminsQuery = useAdmins();
  const admins = adminsQuery.data ?? [];

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
        {list.items.map((request) => {
          const whatsappUrl = request.contact ? buildWhatsAppForPrayer(request.contact) : null;
          return (
            <article className="prayer-row" key={request.id}>
              <div className="prayer-main">
                <strong>{request.name}</strong>
                <span>{formatDateTimeLabel(request.createdAt)}</span>
                <span>{request.contact || "Sem contato"}</span>
                <p>{request.message}</p>
                <div className="prayer-meta">
                  {request.seenAt ? (
                    <span className="prayer-seen">Visto em {formatDateTimeLabel(request.seenAt)}</span>
                  ) : (
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() =>
                        updatePrayerMutation.mutate({
                          id: request.id,
                          patch: { seenAt: new Date().toISOString() }
                        })
                      }
                    >
                      Marcar como visto
                    </button>
                  )}
                  {whatsappUrl ? (
                    <a className="button ghost" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      Enviar mensagem
                    </a>
                  ) : (
                    <button className="button ghost" type="button" disabled title="Contato sem telefone">
                      Enviar mensagem
                    </button>
                  )}
                </div>
                <details className="prayer-notes">
                  <summary>Notas pastorais (admin)</summary>
                  <TextAreaField
                    label="Notas pastorais"
                    defaultValue={request.pastoralNotes}
                    maxLength={TEXTAREA_MAX}
                    key={request.pastoralNotes}
                    onBlur={(event) => {
                      const value = event.currentTarget.value;
                      if (value !== request.pastoralNotes) {
                        updatePrayerMutation.mutate({
                          id: request.id,
                          patch: { pastoralNotes: value }
                        });
                      }
                    }}
                  />
                </details>
              </div>
              <div className="prayer-controls">
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
                <SelectField
                  label="Atribuido"
                  value={request.assignedTo ?? ""}
                  onChange={(event) =>
                    updatePrayerMutation.mutate({
                      id: request.id,
                      patch: { assignedTo: event.currentTarget.value || null }
                    })
                  }
                >
                  <option value="">(nao atribuido)</option>
                  {admins.map((admin) => (
                    <option key={admin.userId} value={admin.userId}>
                      {formatAdminLabel(admin)}
                    </option>
                  ))}
                </SelectField>
              </div>
            </article>
          );
        })}
        {list.items.length === 0 && <p className="empty-note">Nenhum pedido encontrado.</p>}
        <Pagination list={list} onPageChange={(page) => onStateChange({ page })} />
      </div>
    </section>
  );
}
