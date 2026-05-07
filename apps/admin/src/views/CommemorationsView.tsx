import { sortCommemorations, type Commemoration, type SiteSnapshot } from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { CalendarHeart, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import DetailSheet from "../components/Layout/DetailSheet";
import FilterChips, { type ChipOption } from "../components/Layout/FilterChips";
import ViewHeader from "../components/Layout/ViewHeader";
import { useToast } from "../components/Toast";
import { useArchiveCommemoration, useRestoreCommemoration, useSaveCommemoration } from "../hooks";
import { commemorationToFormValues, emptyCommemorationValues } from "../lib/commemoration";
import { type ListState } from "../lib/list-state";
import { commemorationSchema, type CommemorationFormValues } from "../schemas";
import CommemorationCard from "./commemorations/CommemorationCard";
import CommemorationForm from "./commemorations/CommemorationForm";

interface CommemorationsViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type TypeFilter = "all" | "month" | "day";

export default function CommemorationsView({ snapshot, state, onStateChange }: CommemorationsViewProps) {
  void state;
  void onStateChange;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const saveMutation = useSaveCommemoration();
  const archiveMutation = useArchiveCommemoration();
  const restoreMutation = useRestoreCommemoration();
  const { toast } = useToast();
  const confirm = useConfirm();

  const orderedCommemorations = useMemo(
    () => sortCommemorations(snapshot.commemorations),
    [snapshot.commemorations]
  );

  const nextSortOrder = useMemo(() => {
    if (snapshot.commemorations.length === 0) return 0;
    return snapshot.commemorations.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
  }, [snapshot.commemorations]);

  const form = useForm<CommemorationFormValues>({
    resolver: valibotResolver(commemorationSchema),
    defaultValues: emptyCommemorationValues(nextSortOrder)
  });
  const { reset, formState } = form;

  const typeCounts = useMemo(() => {
    const counts = { all: 0, month: 0, day: 0 };
    for (const item of snapshot.commemorations) {
      counts.all += 1;
      counts[item.type] += 1;
    }
    return counts;
  }, [snapshot.commemorations]);

  const visibleCommemorations = useMemo(() => {
    if (typeFilter === "all") return orderedCommemorations;
    return orderedCommemorations.filter((item) => item.type === typeFilter);
  }, [orderedCommemorations, typeFilter]);

  const filterOptions: ReadonlyArray<ChipOption<TypeFilter>> = [
    { value: "all", label: "Todos", count: typeCounts.all },
    { value: "month", label: "Mês inteiro", count: typeCounts.month },
    { value: "day", label: "Dia específico", count: typeCounts.day }
  ];

  function openCreate() {
    setEditingId(null);
    reset(emptyCommemorationValues(nextSortOrder));
    setSheetOpen(true);
  }

  function openEdit(item: Commemoration) {
    setEditingId(item.id);
    reset(commemorationToFormValues(item));
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingId(null);
    reset(emptyCommemorationValues(nextSortOrder));
  }

  async function onSubmit(values: CommemorationFormValues) {
    try {
      await saveMutation.mutateAsync({
        id: editingId ?? undefined,
        name: values.name,
        type: values.type,
        month: values.month,
        dayOfMonth: values.type === "day" ? values.dayOfMonth : null,
        description: values.description,
        color: values.color,
        sortOrder: values.sortOrder
      });
      toast(editingId ? "Data comemorativa atualizada." : "Data comemorativa criada.", {
        variant: "success"
      });
      closeSheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não consegui salvar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleDelete(item: Commemoration) {
    const ok = await confirm({
      title: `Excluir "${item.name}"?`,
      message: "A data deixará de aparecer no site. Você pode restaurar depois pelo audit log.",
      confirmText: "Excluir",
      destructive: true
    });
    if (!ok) return;
    try {
      await archiveMutation.mutateAsync(item.id);
      toast.undo({
        message: `"${item.name}" arquivada.`,
        onUndo: () => restoreMutation.mutate(item.id)
      });
      if (editingId === item.id) closeSheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não consegui excluir — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const saving = formState.isSubmitting || saveMutation.isPending;

  return (
    <section className="apple-view">
      <ViewHeader
        eyebrow="Calendário"
        title="Datas comemorativas"
        lead="Destaque meses temáticos e dias especiais que aparecem no calendário do site."
        primaryAction={
          <button type="button" className="button primary" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            <span>Nova data</span>
          </button>
        }
      />

      <FilterChips<TypeFilter>
        ariaLabel="Filtrar datas comemorativas por tipo"
        value={typeFilter}
        onChange={setTypeFilter}
        options={filterOptions}
      />

      {visibleCommemorations.length === 0 ? (
        <EmptyState
          icon={<CalendarHeart size={32} aria-hidden="true" />}
          title="Sem datas comemorativas"
          description="Crie datas para destacar meses temáticos ou dias especiais no site."
        />
      ) : (
        <div className="data-cards-grid">
          {visibleCommemorations.map((item) => (
            <CommemorationCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <DetailSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingId ? "Editar data comemorativa" : "Nova data comemorativa"}
        subtitle="Use mês inteiro para temas anuais ou dia específico para datas pontuais."
      >
        <CommemorationForm form={form} saving={saving} onSubmit={onSubmit} onCancel={closeSheet} />
      </DetailSheet>
    </section>
  );
}
