import { formatInputDateTime, inputDateTimeToIso, type Announcement, type SiteSnapshot } from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CrudPanel,
  Field,
  FormActions,
  ItemRow,
  ListToolbar,
  Pagination,
  SelectField,
  TextAreaField
} from "../components/ui";
import { useDeleteAnnouncement, useSaveAnnouncement } from "../hooks";
import { announcementSchema, type AnnouncementFormValues } from "../schemas";
import {
  ANNOUNCEMENT_SORT_OPTIONS,
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  TEXT_MAX,
  TEXTAREA_MAX,
  uniqueSorted,
  URL_MAX,
  type ListState
} from "../utils";

interface AnnouncementsViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

function emptyAnnouncementValues(): AnnouncementFormValues {
  return {
    title: "",
    summary: "",
    category: "geral",
    publishedAt: formatInputDateTime(new Date().toISOString()),
    pinned: false,
    ctaLabel: "",
    ctaUrl: ""
  };
}

function announcementToFormValues(item: Announcement): AnnouncementFormValues {
  return {
    title: item.title,
    summary: item.summary,
    category: item.category,
    publishedAt: formatInputDateTime(item.publishedAt),
    pinned: item.pinned,
    ctaLabel: item.ctaLabel,
    ctaUrl: item.ctaUrl
  };
}

export default function AnnouncementsView({ snapshot, state, onStateChange }: AnnouncementsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveMutation = useSaveAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: emptyAnnouncementValues()
  });

  const announcementCtaLabels = useMemo(
    () => uniqueSorted(snapshot.announcements.map((item) => item.ctaLabel)),
    [snapshot]
  );

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = snapshot.announcements.filter((item) =>
      matchesSearch(query, [item.title, item.summary, item.category])
    );
    const sorted = [...filtered].sort((left, right) => {
      if (state.sort === "publishedAsc") {
        return Date.parse(left.publishedAt) - Date.parse(right.publishedAt);
      }
      if (state.sort === "titleAsc") {
        return compareText(left.title, right.title);
      }
      if (state.sort === "categoryAsc") {
        return compareText(left.category, right.category);
      }
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });
    return paginateItems(sorted, state.page);
  }, [snapshot, state]);

  function startEdit(item: Announcement) {
    setEditingId(item.id);
    reset(announcementToFormValues(item));
  }

  function cancelEdit() {
    setEditingId(null);
    reset(emptyAnnouncementValues());
  }

  async function onSubmit(values: AnnouncementFormValues) {
    await saveMutation.mutateAsync({
      id: editingId ?? undefined,
      title: values.title,
      summary: values.summary,
      category: values.category,
      publishedAt: inputDateTimeToIso(values.publishedAt),
      pinned: values.pinned,
      ctaLabel: values.ctaLabel,
      ctaUrl: values.ctaUrl
    });
    cancelEdit();
  }

  async function handleDelete(item: Announcement) {
    if (!window.confirm(`Excluir o aviso "${item.title}"?`)) {
      return;
    }
    await deleteMutation.mutateAsync(item.id);
    if (editingId === item.id) {
      cancelEdit();
    }
  }

  const saving = isSubmitting || saveMutation.isPending;

  return (
    <CrudPanel
      title="Avisos"
      items={list.items}
      toolbar={
        <ListToolbar
          search={state.search}
          searchLabel="Titulo, resumo ou categoria"
          sort={state.sort}
          sortOptions={ANNOUNCEMENT_SORT_OPTIONS}
          total={list.total}
          onSearch={(search) => onStateChange({ search, page: 1 })}
          onSort={(sort) => onStateChange({ sort, page: 1 })}
        />
      }
      footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
      emptyLabel="Nenhum aviso encontrado."
      renderItem={(item) => (
        <ItemRow key={item.id} title={item.title} detail={item.category}>
          <button onClick={() => startEdit(item)} type="button">
            Editar
          </button>
          <button
            onClick={() => handleDelete(item)}
            type="button"
            aria-label={`Excluir aviso ${item.title}`}
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </ItemRow>
      )}
    >
      <form className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label="Titulo"
          placeholder="Titulo"
          maxLength={TEXT_MAX}
          error={errors.title?.message}
          {...register("title")}
        />
        <TextAreaField
          label="Resumo"
          placeholder="Resumo"
          maxLength={TEXTAREA_MAX}
          error={errors.summary?.message}
          {...register("summary")}
        />
        <div className="form-grid">
          <SelectField label="Categoria" error={errors.category?.message} {...register("category")}>
            <option value="geral">Geral</option>
            <option value="evento">Evento</option>
            <option value="juventude">Juventude</option>
            <option value="oracao">Oracao</option>
          </SelectField>
          <Field
            label="Publicacao"
            type="datetime-local"
            error={errors.publishedAt?.message}
            {...register("publishedAt")}
          />
        </div>
        <div className="form-grid">
          <Field
            label="Texto do botao"
            list="announcement-cta-labels"
            placeholder="Texto do botao"
            maxLength={TEXT_MAX}
            error={errors.ctaLabel?.message}
            {...register("ctaLabel")}
          />
          <Field
            label="URL do botao"
            type="url"
            placeholder="URL do botao (https://...)"
            maxLength={URL_MAX}
            error={errors.ctaUrl?.message}
            {...register("ctaUrl")}
          />
        </div>
        <datalist id="announcement-cta-labels">
          {announcementCtaLabels.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <label className="check-row">
          <input type="checkbox" {...register("pinned")} />
          Destacar aviso
        </label>
        {saveMutation.error && (
          <p className="form-error">
            {saveMutation.error instanceof Error ? saveMutation.error.message : "Falha ao salvar."}
          </p>
        )}
        <FormActions saving={saving} onCancel={cancelEdit} />
      </form>
    </CrudPanel>
  );
}
