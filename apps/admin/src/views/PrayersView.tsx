import { buildWhatsAppForContact, formatDateTime, type AdminUser, type PrayerRequest } from "@4ibib/core";
import { HeartHandshake } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "../components/EmptyState";
import { ListView } from "../components/ListView";
import { ListToolbar, Pagination, SelectField, TextAreaField } from "../components/ui";
import { useAdmins, useUpdatePrayer, useUpdatePrayerStatus } from "../hooks";
import { PRAYER_STATUS_OPTIONS } from "../lib/labels";
import { TEXTAREA_MAX } from "../lib/limits";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  type ListState
} from "../lib/list-state";
import { PRAYER_SORT_OPTIONS } from "../lib/sort-options";

const PRAYER_STATUS_CSV_LABELS: Record<PrayerRequest["status"], string> = {
  novo: "novo",
  em_oracao: "em oracao",
  concluido: "concluido"
};

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildPrayersCsv(items: PrayerRequest[]): string {
  const header = ["Nome", "Contato", "Mensagem", "Status", "Criado em", "Visto em", "Notas pastorais"]
    .map(escapeCsvField)
    .join(",");
  const rows = items.map((item) =>
    [
      item.name,
      item.contact,
      item.message,
      PRAYER_STATUS_CSV_LABELS[item.status],
      formatDateTime(item.createdAt),
      item.seenAt ? formatDateTime(item.seenAt) : "",
      item.pastoralNotes
    ]
      .map(escapeCsvField)
      .join(",")
  );
  return [header, ...rows].join("\r\n");
}

function csvDateStamp(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

interface PrayersViewProps {
  prayers: PrayerRequest[];
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
  statusFilter: PrayerRequest["status"] | "all";
  onStatusFilterChange: (value: PrayerRequest["status"] | "all") => void;
}

const WHATSAPP_DEFAULT_MESSAGE = "Ola, recebemos seu pedido de oracao na 4a Betel. Estamos orando por voce.";

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

  const filteredSorted = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = prayers.filter((item) => {
      const statusMatches = statusFilter === "all" || item.status === statusFilter;
      return statusMatches && matchesSearch(query, [item.name, item.contact, item.message, item.status]);
    });
    return [...filtered].sort((left, right) => {
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
  }, [prayers, state.search, state.sort, statusFilter]);

  const list = useMemo(() => paginateItems(filteredSorted, state.page), [filteredSorted, state.page]);

  function handleExportCsv() {
    if (filteredSorted.length === 0) return;
    const csv = buildPrayersCsv(filteredSorted);
    downloadCsv(`pedidos-oracao-${csvDateStamp(new Date())}.csv`, csv);
  }

  return (
    <ListView
      title="Pedidos de oracao"
      count={list.total}
      toolbar={
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
          <button
            type="button"
            className="button ghost"
            onClick={handleExportCsv}
            disabled={filteredSorted.length === 0}
          >
            Exportar CSV
          </button>
        </ListToolbar>
      }
      items={list.items}
      getId={(item) => item.id}
      emptyState={
        <EmptyState
          icon={<HeartHandshake size={32} />}
          title="Nenhum pedido encontrado."
          description="Quando alguem enviar um pedido de oracao, ele aparece aqui."
        />
      }
      footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
      renderItem={(request) => {
        const whatsappUrl = request.contact
          ? buildWhatsAppForContact(request.contact, WHATSAPP_DEFAULT_MESSAGE)
          : null;
        return (
          <article className="prayer-row">
            <div className="prayer-main">
              <strong>{request.name}</strong>
              <span>{formatDateTime(request.createdAt)}</span>
              <span>{request.contact || "Sem contato"}</span>
              <p>{request.message}</p>
              <div className="prayer-meta">
                {request.seenAt ? (
                  <span className="prayer-seen">Visto em {formatDateTime(request.seenAt)}</span>
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
      }}
    />
  );
}
