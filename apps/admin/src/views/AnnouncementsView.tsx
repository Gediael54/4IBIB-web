import {
  formatDateOnly,
  formatInputDateTime,
  inputDateTimeToIso,
  type Announcement,
  type SiteSnapshot
} from "@4ibib/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { clearFormAutosave, useFormAutosave } from "../lib/use-form-autosave";
import { announcementSchema, type AnnouncementFormValues } from "../schemas";
import { ANNOUNCEMENT_STATUS_LABELS, ANNOUNCEMENT_STATUS_OPTIONS } from "../lib/labels";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../lib/limits";
import {
  compareText,
  matchesSearch,
  normalizeSearch,
  paginateItems,
  uniqueSorted,
  type ListState
} from "../lib/list-state";
import { ANNOUNCEMENT_SORT_OPTIONS } from "../lib/sort-options";

interface AnnouncementsViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type StatusFilter = "all" | "draft" | "scheduled" | "published" | "archived";
type StatusValue = "draft" | "scheduled" | "published" | "archived";

const CATEGORY_LABELS: Record<AnnouncementFormValues["category"], string> = {
  geral: "Geral",
  evento: "Evento",
  juventude: "Juventude",
  oracao: "Oracao"
};

function emptyAnnouncementValues(): AnnouncementFormValues {
  return {
    title: "",
    summary: "",
    category: "geral",
    publishedAt: formatInputDateTime(new Date().toISOString()),
    pinned: false,
    ctaLabel: "",
    ctaUrl: "",
    status: "published",
    expiresAt: "",
    imageUrl: ""
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
    ctaUrl: item.ctaUrl,
    status: item.status,
    expiresAt: item.expiresAt ? formatInputDateTime(item.expiresAt) : "",
    imageUrl: item.imageUrl
  };
}

const ANNOUNCEMENT_DRAFT_KEY = "announcement-draft";

export default function AnnouncementsView({ snapshot, state, onStateChange }: AnnouncementsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const saveMutation = useSaveAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: emptyAnnouncementValues()
  });

  useFormAutosave(ANNOUNCEMENT_DRAFT_KEY, control, reset, editingId === null);

  const previewValues = useWatch({ control });

  const announcementCtaLabels = useMemo(
    () => uniqueSorted(snapshot.announcements.map((item) => item.ctaLabel)),
    [snapshot]
  );

  const list = useMemo(() => {
    const query = normalizeSearch(state.search);
    const filtered = snapshot.announcements
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => matchesSearch(query, [item.title, item.summary, item.category]));
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
      if (state.sort === "statusAsc") {
        return compareText(left.status, right.status);
      }
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });
    return paginateItems(sorted, state.page);
  }, [snapshot, state, statusFilter]);

  function startEdit(item: Announcement) {
    setEditingId(item.id);
    reset(announcementToFormValues(item));
  }

  function cancelEdit() {
    if (editingId === null) {
      clearFormAutosave(ANNOUNCEMENT_DRAFT_KEY);
    }
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
      ctaUrl: values.ctaUrl,
      status: values.status,
      expiresAt: values.expiresAt ? inputDateTimeToIso(values.expiresAt) : null,
      imageUrl: values.imageUrl
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

  const previewStatus: StatusValue = previewValues.status ?? "draft";
  const previewCategory = previewValues.category ?? "geral";
  const previewTitle = previewValues.title?.trim() ? previewValues.title : "Titulo do aviso";
  const previewSummary = previewValues.summary?.trim()
    ? previewValues.summary
    : "Resumo aparecera aqui conforme voce digita.";
  const previewImage = previewValues.imageUrl?.trim() ?? "";
  const previewCtaLabel = previewValues.ctaLabel?.trim() ?? "";
  const previewCtaUrl = previewValues.ctaUrl?.trim() ?? "";
  const previewExpiresLabel = formatDateOnly(previewValues.expiresAt ?? "");

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
        >
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.currentTarget.value as StatusFilter);
              onStateChange({ page: 1 });
            }}
          >
            {ANNOUNCEMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </ListToolbar>
      }
      footer={<Pagination list={list} onPageChange={(page) => onStateChange({ page })} />}
      emptyLabel="Nenhum aviso encontrado."
      renderItem={(item) => (
        <ItemRow
          key={item.id}
          title={item.title}
          detail={`${item.category} - ${ANNOUNCEMENT_STATUS_LABELS[item.status]}`}
        >
          <button onClick={() => startEdit(item)} type="button">
            Editar
          </button>
          <a
            href="/#avisos"
            target="_blank"
            rel="noopener noreferrer"
            className="row-action-link"
            aria-label={`Ver aviso ${item.title} no site`}
            title="Ver no site"
          >
            <ExternalLink size={16} />
          </a>
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
      <div className="announcement-editor">
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
            <SelectField label="Status" error={errors.status?.message} {...register("status")}>
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendado</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </SelectField>
          </div>
          <div className="form-grid">
            <Field
              label="Publicacao"
              type="datetime-local"
              error={errors.publishedAt?.message}
              {...register("publishedAt")}
            />
            <Field
              label="Expira em"
              type="datetime-local"
              error={errors.expiresAt?.message}
              {...register("expiresAt")}
            />
          </div>
          <Field
            label="Imagem (URL)"
            type="url"
            placeholder="https://..."
            maxLength={URL_MAX}
            error={errors.imageUrl?.message}
            {...register("imageUrl")}
          />
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
        <aside className="announcement-preview" aria-label="Pre-visualizacao do aviso">
          <p className="announcement-preview-eyebrow">Pre-visualizacao</p>
          <article className="announcement-preview-card">
            {previewImage && <img src={previewImage} alt="" className="announcement-preview-image" />}
            <div className="announcement-preview-meta">
              <span className="announcement-preview-badge">{CATEGORY_LABELS[previewCategory]}</span>
              <span className={`announcement-preview-status announcement-preview-status-${previewStatus}`}>
                {ANNOUNCEMENT_STATUS_LABELS[previewStatus]}
              </span>
              {previewValues.pinned && <span className="announcement-preview-pinned">Fixado</span>}
            </div>
            <h3 className="announcement-preview-title">{previewTitle}</h3>
            <p className="announcement-preview-summary">{previewSummary}</p>
            {previewExpiresLabel && (
              <p className="announcement-preview-expires">Expira em {previewExpiresLabel}</p>
            )}
            {previewCtaLabel && previewCtaUrl && (
              <a
                className="announcement-preview-cta"
                href={previewCtaUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {previewCtaLabel}
              </a>
            )}
          </article>
        </aside>
      </div>
    </CrudPanel>
  );
}
