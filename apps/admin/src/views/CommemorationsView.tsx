import { sortCommemorations, type Commemoration, type SiteSnapshot } from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ListView } from "../components/ListView";
import { useToast } from "../components/Toast";
import { ListToolbar, Pagination } from "../components/ui";
import CommemorationForm from "../components/Commemoration/CommemorationForm";
import CommemorationListItem from "../components/Commemoration/CommemorationListItem";
import { useArchiveCommemoration, useRestoreCommemoration, useSaveCommemoration } from "../hooks";
import {
  commemorationToFormValues,
  describeCommemorationWhen,
  emptyCommemorationValues
} from "../lib/commemoration";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  type ListState
} from "../lib/list-state";
import { COMMEMORATION_SORT_OPTIONS } from "../lib/sort-options";
import { commemorationSchema, type CommemorationFormValues } from "../schemas";

interface CommemorationsViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

export default function CommemorationsView({ snapshot, state, onStateChange }: CommemorationsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveMutation = useSaveCommemoration();
  const archiveMutation = useArchiveCommemoration();
  const restoreMutation = useRestoreCommemoration();
  const { toast } = useToast();
  const confirm = useConfirm();

  const nextSortOrder = useMemo(() => {
    if (snapshot.commemorations.length === 0) return 0;
    return snapshot.commemorations.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
  }, [snapshot.commemorations]);

  const form = useForm<CommemorationFormValues>({
    resolver: valibotResolver(commemorationSchema),
    defaultValues: emptyCommemorationValues(nextSortOrder)
  });
  const { reset, formState } = form;

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = snapshot.commemorations.filter((item) =>
      matchesSearch(query, [item.name, item.description, describeCommemorationWhen(item)])
    );
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "nameAsc") return compareText(left.name, right.name);
      if (state.sort === "nameDesc") return compareText(right.name, left.name);
      if (left.month !== right.month) return left.month - right.month;
      const leftDay = left.dayOfMonth ?? 0;
      const rightDay = right.dayOfMonth ?? 0;
      if (leftDay !== rightDay) return leftDay - rightDay;
      return compareText(left.name, right.name);
    });
    return paginateItems(sorted, state.page);
  }, [snapshot.commemorations, state]);

  function startEdit(item: Commemoration) {
    setEditingId(item.id);
    reset(commemorationToFormValues(item));
  }

  function cancelEdit() {
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
      cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui salvar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleDelete(item: Commemoration) {
    const ok = await confirm({
      title: `Excluir "${item.name}"?`,
      message: "A data deixara de aparecer no site. Voce pode restaurar depois pelo audit log.",
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
      if (editingId === item.id) cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui excluir — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const ordered = useMemo(() => sortCommemorations(snapshot.commemorations), [snapshot.commemorations]);
  const saving = formState.isSubmitting || saveMutation.isPending;

  return (
    <div className="crud-layout">
      <ListView
        title="Datas comemorativas"
        count={list.total}
        toolbar={
          <ListToolbar
            search={state.search}
            searchLabel="Nome ou descricao"
            sort={state.sort}
            sortOptions={COMMEMORATION_SORT_OPTIONS}
            total={list.total}
            onSearch={(search) => onStateChange({ search, page: 1 })}
            onSort={(sort) => onStateChange({ sort, page: 1 })}
          />
        }
        items={list.items}
        getId={(item) => item.id}
        renderItem={(item) => (
          <CommemorationListItem
            key={item.id}
            item={item}
            isEditing={editingId === item.id}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        )}
        emptyState={
          <EmptyState
            icon={<Calendar size={32} aria-hidden="true" />}
            title="Sem datas comemorativas"
            description="Crie datas para destacar meses tematicos ou dias especiais no site."
          />
        }
        footer={list.total > 0 && <Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
      />

      <div className="editor-card">
        <h2>{editingId ? "Editar data comemorativa" : "Nova data comemorativa"}</h2>
        <p className="muted">
          Use <strong>Mes inteiro</strong> para temas anuais (ex.: Mes de Missoes em julho) ou{" "}
          <strong>Dia especifico</strong> para datas pontuais (ex.: Dia das Maes em 10/05).
        </p>
        <CommemorationForm form={form} saving={saving} onSubmit={onSubmit} onCancel={cancelEdit} />
        {ordered.length > 0 && (
          <p className="muted form-help">{ordered.length} data(s) cadastradas no calendario.</p>
        )}
      </div>
    </div>
  );
}
