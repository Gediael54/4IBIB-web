import { formatDateTime, type PrayerRequest, type PrayerStatus } from "@4ibib/core";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { HeartHandshake } from "lucide-react";
import { useMemo, useState } from "react";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import ViewHeader from "../components/Layout/ViewHeader";
import { useToast } from "../components/Toast";
import { ListToolbar, SelectField } from "../components/ui";
import {
  useArchivePrayerRequest,
  useRestorePrayerRequest,
  useUpdatePrayer,
  useUpdatePrayerStatus
} from "../hooks";
import { PRAYER_STATUS_OPTIONS } from "../lib/labels";
import { matchesSearch, normalizeSearch, type ListState } from "../lib/list-state";
import { PRAYER_SORT_OPTIONS } from "../lib/sort-options";
import { PRAYER_COLUMNS } from "./prayers/columns";
import PrayerCard from "./prayers/PrayerCard";
import PrayerColumn from "./prayers/PrayerColumn";
import PrayerDetailSheet from "./prayers/PrayerDetailSheet";

const PRAYER_STATUS_CSV_LABELS: Record<PrayerStatus, string> = {
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
  statusFilter: PrayerStatus | "all";
  onStatusFilterChange: (value: PrayerStatus | "all") => void;
}

function sortPrayers(items: PrayerRequest[], sort: ListState["sort"]): PrayerRequest[] {
  return [...items].sort((left, right) => {
    if (sort === "createdAsc") {
      return Date.parse(left.createdAt) - Date.parse(right.createdAt);
    }
    if (sort === "nameAsc") {
      return left.name.localeCompare(right.name, "pt-BR");
    }
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
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
  const archiveMutation = useArchivePrayerRequest();
  const restoreMutation = useRestorePrayerRequest();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [draggingFromStatus, setDraggingFromStatus] = useState<PrayerStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const filteredSorted = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = prayers.filter((item) => {
      const statusMatches = statusFilter === "all" || item.status === statusFilter;
      return statusMatches && matchesSearch(query, [item.name, item.contact, item.message, item.status]);
    });
    return sortPrayers(filtered, state.sort);
  }, [prayers, state.search, state.sort, statusFilter]);

  const itemsByStatus = useMemo(() => {
    const buckets: Record<PrayerStatus, PrayerRequest[]> = {
      novo: [],
      em_oracao: [],
      concluido: []
    };
    for (const request of filteredSorted) {
      buckets[request.status].push(request);
    }
    return buckets;
  }, [filteredSorted]);

  const activeRequest = useMemo(
    () => prayers.find((item) => item.id === activeRequestId) ?? null,
    [prayers, activeRequestId]
  );

  async function handleArchive(request: PrayerRequest) {
    const ok = await confirm({
      title: "Arquivar pedido?",
      message: `O pedido de ${request.name || "Anonimo"} sera arquivado e some da lista. Voce pode desfazer.`,
      confirmText: "Arquivar",
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await archiveMutation.mutateAsync(request.id);
      toast.undo({
        message: `Pedido de ${request.name || "Anonimo"} arquivado.`,
        onUndo: () => restoreMutation.mutate(request.id)
      });
      if (activeRequestId === request.id) {
        setActiveRequestId(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui arquivar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  function handleMarkSeen(request: PrayerRequest) {
    updatePrayerMutation.mutate({
      id: request.id,
      patch: { seenAt: new Date().toISOString() }
    });
  }

  function handleMoveStatus(request: PrayerRequest, status: PrayerStatus) {
    if (request.status === status) return;
    updateStatusMutation.mutate({ id: request.id, status });
  }

  function handleSaveNotes(id: string, pastoralNotes: string) {
    updatePrayerMutation.mutate(
      { id, patch: { pastoralNotes } },
      {
        onSuccess: () => toast("Notas pastorais salvas.", { variant: "success" }),
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : "Nao consegui salvar as notas — tenta de novo?";
          toast(message, { variant: "danger" });
        }
      }
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const status = event.active.data.current?.status as PrayerStatus | undefined;
    setDraggingFromStatus(status ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingFromStatus(null);
    const { active, over } = event;
    if (!over) return;
    const targetStatus = over.data.current?.status as PrayerStatus | undefined;
    const sourceStatus = active.data.current?.status as PrayerStatus | undefined;
    if (!targetStatus || !sourceStatus || targetStatus === sourceStatus) return;
    updateStatusMutation.mutate({ id: String(active.id), status: targetStatus });
  }

  function handleExportCsv() {
    if (filteredSorted.length === 0) return;
    const csv = buildPrayersCsv(filteredSorted);
    downloadCsv(`pedidos-oracao-${csvDateStamp(new Date())}.csv`, csv);
  }

  const totalVisible = filteredSorted.length;

  return (
    <section className="prayers-kanban-view">
      <ViewHeader
        title="Pedidos de oração"
        lead="Acompanhe quem pediu oração, mova entre etapas e registre o cuidado pastoral."
        secondaryActions={
          <button
            type="button"
            className="button ghost"
            onClick={handleExportCsv}
            disabled={filteredSorted.length === 0}
          >
            Exportar CSV
          </button>
        }
      />

      <ListToolbar
        search={state.search}
        searchLabel="Nome, contato, pedido ou status"
        sort={state.sort}
        sortOptions={PRAYER_SORT_OPTIONS}
        total={totalVisible}
        onSearch={(search) => onStateChange({ search, page: 1 })}
        onSort={(sort) => onStateChange({ sort, page: 1 })}
      >
        <SelectField
          label="Status"
          value={statusFilter}
          onChange={(event) => {
            onStatusFilterChange(event.currentTarget.value as PrayerStatus | "all");
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

      {totalVisible === 0 ? (
        <EmptyState
          icon={<HeartHandshake size={32} />}
          title="Nenhum pedido encontrado."
          description="Quando alguem enviar um pedido de oracao, ele aparece aqui."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggingFromStatus(null)}
        >
          <div className="prayers-kanban-board">
            {PRAYER_COLUMNS.map((column) => {
              const columnItems = itemsByStatus[column.status];
              return (
                <PrayerColumn
                  key={column.status}
                  config={column}
                  items={columnItems}
                  isDropTarget={draggingFromStatus !== null && draggingFromStatus !== column.status}
                  draggingFromStatus={draggingFromStatus}
                >
                  {columnItems.length === 0 ? (
                    <p className="prayer-kanban-empty">Sem pedidos nesta coluna.</p>
                  ) : (
                    columnItems.map((request) => (
                      <PrayerCard
                        key={request.id}
                        request={request}
                        onOpen={() => setActiveRequestId(request.id)}
                        onMarkSeen={() => handleMarkSeen(request)}
                        onMoveStatus={(status) => handleMoveStatus(request, status)}
                        onArchive={() => handleArchive(request)}
                      />
                    ))
                  )}
                </PrayerColumn>
              );
            })}
          </div>
        </DndContext>
      )}

      <PrayerDetailSheet
        request={activeRequest}
        onClose={() => setActiveRequestId(null)}
        onSaveNotes={handleSaveNotes}
        saving={updatePrayerMutation.isPending}
      />
    </section>
  );
}
