import {
  formatDateOnly,
  formatInputDateTime,
  inputDateTimeToIso,
  type Announcement,
  type SiteSnapshot
} from "@4ibib/core";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { ExternalLink, Megaphone, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import DataCard from "../components/Layout/DataCard";
import DetailSheet from "../components/Layout/DetailSheet";
import FilterChips, { type ChipOption } from "../components/Layout/FilterChips";
import ViewHeader from "../components/Layout/ViewHeader";
import { useToast } from "../components/Toast";
import WhatsAppShareButton from "../components/WhatsAppShareButton";
import { useArchiveAnnouncement, useRestoreAnnouncement, useSaveAnnouncement } from "../hooks";
import { clearFormAutosave, useFormAutosave } from "../lib/use-form-autosave";
import { uniqueSorted, type ListState } from "../lib/list-state";
import { buildAnnouncementMessage } from "../lib/whatsapp-share";
import { announcementSchema, type AnnouncementFormValues } from "../schemas";
import AnnouncementForm from "./announcements/AnnouncementForm";
import {
  CATEGORY_ICON_STYLES,
  CATEGORY_LABELS,
  STATUS_BADGE_LABELS,
  statusToCardStatus
} from "./announcements/announcement-styling";

interface AnnouncementsViewProps {
  snapshot: SiteSnapshot;
  state: ListState;
  onStateChange: (patch: Partial<ListState>) => void;
}

type StatusFilter = "all" | "draft" | "scheduled" | "published" | "archived";

const ANNOUNCEMENT_DRAFT_KEY = "announcement-draft";

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

export default function AnnouncementsView({ snapshot, state, onStateChange }: AnnouncementsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState<string>("conteudo");
  const saveMutation = useSaveAnnouncement();
  const archiveMutation = useArchiveAnnouncement();
  const restoreMutation = useRestoreAnnouncement();
  const { toast } = useToast();
  const confirm = useConfirm();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<AnnouncementFormValues>({
    resolver: valibotResolver(announcementSchema),
    defaultValues: emptyAnnouncementValues()
  });

  useFormAutosave(ANNOUNCEMENT_DRAFT_KEY, control, reset, editingId === null);

  const ctaSuggestions = useMemo(
    () => uniqueSorted(snapshot.announcements.map((item) => item.ctaLabel)),
    [snapshot]
  );

  const statusCounts = useMemo(() => {
    const counts = { all: 0, draft: 0, scheduled: 0, published: 0, archived: 0 };
    for (const item of snapshot.announcements) {
      counts.all += 1;
      counts[item.status] += 1;
    }
    return counts;
  }, [snapshot]);

  const visibleAnnouncements = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? snapshot.announcements
        : snapshot.announcements.filter((item) => item.status === statusFilter);
    return [...filtered].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
  }, [snapshot, statusFilter]);

  const filterOptions: ReadonlyArray<ChipOption<StatusFilter>> = [
    { value: "all", label: "Todos", count: statusCounts.all },
    { value: "published", label: "Publicado", count: statusCounts.published },
    { value: "scheduled", label: "Agendado", count: statusCounts.scheduled },
    { value: "draft", label: "Rascunho", count: statusCounts.draft },
    { value: "archived", label: "Arquivado", count: statusCounts.archived }
  ];

  function openCreate() {
    setEditingId(null);
    reset(emptyAnnouncementValues());
    setActiveTab("conteudo");
    setSheetOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditingId(item.id);
    reset(announcementToFormValues(item));
    setActiveTab("conteudo");
    setSheetOpen(true);
  }

  function closeSheet() {
    if (editingId === null) {
      clearFormAutosave(ANNOUNCEMENT_DRAFT_KEY);
    }
    setSheetOpen(false);
    setEditingId(null);
    reset(emptyAnnouncementValues());
  }

  async function onSubmit(values: AnnouncementFormValues) {
    try {
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
      toast(editingId ? "Aviso atualizado. Mudanças no site já." : "Aviso publicado. Boa entrega!", {
        variant: "success"
      });
      closeSheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não consegui salvar — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  async function handleDelete(item: Announcement) {
    const ok = await confirm({
      title: "Excluir aviso?",
      message: `"${item.title}" vai sumir do site. Você ainda pode restaurar pela auditoria.`,
      confirmText: "Excluir",
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await archiveMutation.mutateAsync(item.id);
      toast.undo({
        message: `"${item.title}" arquivado.`,
        onUndo: () => restoreMutation.mutate(item.id)
      });
      if (editingId === item.id) {
        closeSheet();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não consegui excluir — tenta de novo?";
      toast(message, { variant: "danger" });
    }
  }

  const saving = isSubmitting || saveMutation.isPending;

  // suppress unused-state-prop until pagination/search return to the view
  void state;
  void onStateChange;

  return (
    <section className="apple-view">
      <ViewHeader
        eyebrow="Comunicação"
        title="Avisos"
        lead="Compartilhe eventos, recados e pedidos de oração com a igreja em poucos cliques."
        primaryAction={
          <button type="button" className="button primary" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            <span>Novo aviso</span>
          </button>
        }
      />

      <FilterChips<StatusFilter>
        ariaLabel="Filtrar avisos por status"
        value={statusFilter}
        onChange={setStatusFilter}
        options={filterOptions}
      />

      {visibleAnnouncements.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={32} />}
          title="Sem avisos por aqui."
          description="Crie o primeiro pra anunciar evento, oração ou recado da semana."
        />
      ) : (
        <div className="data-cards-grid">
          {visibleAnnouncements.map((item) => {
            const iconStyle = CATEGORY_ICON_STYLES[item.category];
            const publishedLabel = formatDateOnly(item.publishedAt);
            return (
              <DataCard
                key={item.id}
                icon={<Megaphone size={22} aria-hidden="true" />}
                iconBackground={iconStyle.background}
                iconColor={iconStyle.color}
                status={statusToCardStatus(item.status)}
                title={item.title}
                subtitle={CATEGORY_LABELS[item.category]}
                badge={
                  <span className={`status-pill status-pill-${statusToCardStatus(item.status)}`}>
                    {STATUS_BADGE_LABELS[item.status]}
                  </span>
                }
                meta={publishedLabel ? <span>Publicado em {publishedLabel}</span> : undefined}
                description={
                  item.summary ? (
                    <span className="data-card-description-clamp">{item.summary}</span>
                  ) : undefined
                }
                secondaryActions={
                  <>
                    {item.status === "published" && (
                      <WhatsAppShareButton
                        message={buildAnnouncementMessage(item)}
                        size="sm"
                        label="Avisar grupo"
                      />
                    )}
                    <button type="button" className="button ghost" onClick={() => openEdit(item)}>
                      Editar
                    </button>
                    <a
                      href="/#avisos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="icon-button"
                      aria-label={`Ver aviso ${item.title} no site`}
                      title="Ver no site"
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(item)}
                      aria-label={`Excluir aviso ${item.title}`}
                      title="Excluir"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <DetailSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingId ? "Editar aviso" : "Novo aviso"}
        subtitle={
          editingId
            ? "Ajuste os detalhes e salve para publicar a alteração."
            : "Preencha os campos e publique para a igreja."
        }
      >
        <AnnouncementForm
          register={register}
          control={control}
          errors={errors}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          onCancel={closeSheet}
          saving={saving}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          ctaSuggestions={ctaSuggestions}
        />
      </DetailSheet>
    </section>
  );
}
