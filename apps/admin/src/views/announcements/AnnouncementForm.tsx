import { formatDateOnly } from "@4ibib/core";
import { useMemo } from "react";
import type { Control, FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { FieldGroup } from "../../components/FieldGroup";
import { Field, FormActions, SelectField, TextAreaField } from "../../components/ui";
import { ANNOUNCEMENT_STATUS_LABELS } from "../../lib/labels";
import { TEXT_MAX, TEXTAREA_MAX, URL_MAX } from "../../lib/limits";
import type { AnnouncementFormValues } from "../../schemas";

interface AnnouncementFormProps {
  register: UseFormRegister<AnnouncementFormValues>;
  control: Control<AnnouncementFormValues>;
  errors: FieldErrors<AnnouncementFormValues>;
  handleSubmit: UseFormHandleSubmit<AnnouncementFormValues>;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  activeTab: string;
  onActiveTabChange: (id: string) => void;
  ctaSuggestions: string[];
}

const TAB_FIELDS: Record<string, ReadonlyArray<keyof AnnouncementFormValues>> = {
  conteudo: ["title", "summary", "category", "ctaLabel", "ctaUrl", "pinned"],
  publicacao: ["status", "publishedAt", "expiresAt"],
  imagem: ["imageUrl"]
};

const TAB_ORDER = ["conteudo", "publicacao", "imagem"] as const;

const CATEGORY_LABELS: Record<AnnouncementFormValues["category"], string> = {
  geral: "Geral",
  evento: "Evento",
  juventude: "Juventude",
  oracao: "Oracao"
};

export default function AnnouncementForm({
  register,
  control,
  errors,
  handleSubmit,
  onSubmit,
  onCancel,
  saving,
  activeTab,
  onActiveTabChange,
  ctaSuggestions
}: AnnouncementFormProps) {
  const previewValues = useWatch({ control });

  const tabErrorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tabId of TAB_ORDER) {
      const fields = TAB_FIELDS[tabId] ?? [];
      let count = 0;
      for (const field of fields) {
        if (errors[field as keyof typeof errors]) count += 1;
      }
      counts[tabId] = count;
    }
    return counts;
  }, [errors]);

  function focusFirstTabWithErrors() {
    for (const tabId of TAB_ORDER) {
      if ((tabErrorCounts[tabId] ?? 0) > 0) {
        onActiveTabChange(tabId);
        return;
      }
    }
  }

  const previewStatus = previewValues.status ?? "draft";
  const previewCategory = previewValues.category ?? "geral";
  const previewTitle = previewValues.title?.trim() ? previewValues.title : "Titulo do aviso";
  const previewSummary = previewValues.summary?.trim()
    ? previewValues.summary
    : "Resumo aparecera aqui conforme voce digita.";
  const previewImage = previewValues.imageUrl?.trim() ?? "";
  const previewCtaLabel = previewValues.ctaLabel?.trim() ?? "";
  const previewCtaUrl = previewValues.ctaUrl?.trim() ?? "";
  const previewExpiresLabel = formatDateOnly(previewValues.expiresAt ?? "");

  const conteudoPanel = (
    <>
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
      <SelectField label="Categoria" error={errors.category?.message} {...register("category")}>
        <option value="geral">Geral</option>
        <option value="evento">Evento</option>
        <option value="juventude">Juventude</option>
        <option value="oracao">Oracao</option>
      </SelectField>
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
        {ctaSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <label className="check-row">
        <input type="checkbox" {...register("pinned")} />
        Destacar aviso
      </label>
    </>
  );

  const publicacaoPanel = (
    <>
      <SelectField label="Status" error={errors.status?.message} {...register("status")}>
        <option value="draft">Rascunho</option>
        <option value="scheduled">Agendado</option>
        <option value="published">Publicado</option>
        <option value="archived">Arquivado</option>
      </SelectField>
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
    </>
  );

  const imagemPanel = (
    <Field
      label="Imagem (URL)"
      type="url"
      placeholder="https://..."
      maxLength={URL_MAX}
      error={errors.imageUrl?.message}
      {...register("imageUrl")}
    />
  );

  return (
    <form
      className="editor-form"
      onSubmit={handleSubmit(onSubmit, () => focusFirstTabWithErrors())}
      noValidate
    >
      <FieldGroup
        activeGroup={activeTab}
        onActiveChange={onActiveTabChange}
        groups={[
          {
            id: "conteudo",
            label: "Conteudo",
            content: conteudoPanel,
            errorCount: tabErrorCounts.conteudo
          },
          {
            id: "publicacao",
            label: "Publicacao",
            content: publicacaoPanel,
            errorCount: tabErrorCounts.publicacao
          },
          {
            id: "imagem",
            label: "Imagem",
            content: imagemPanel,
            errorCount: tabErrorCounts.imagem
          }
        ]}
      />
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
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}
