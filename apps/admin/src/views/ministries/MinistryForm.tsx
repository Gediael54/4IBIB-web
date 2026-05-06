import type { UseFormReturn } from "react-hook-form";
import type { MinistryFormValues } from "../../schemas";
import { Field, FormActions, TextAreaField } from "../../components/ui";
import { TEXT_MAX, TEXTAREA_MAX } from "../../lib/limits";

interface MinistryFormProps {
  form: UseFormReturn<MinistryFormValues>;
  saving: boolean;
  isEditing: boolean;
  onSubmit: (values: MinistryFormValues) => void;
  onCancel: () => void;
}

export default function MinistryForm({ form, saving, isEditing, onSubmit, onCancel }: MinistryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = form;

  return (
    <form className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field
        label="Nome"
        placeholder="Nome"
        maxLength={TEXT_MAX}
        error={errors.name?.message}
        {...register("name")}
      />
      <Field
        label="Slug"
        placeholder="slug-do-ministerio"
        maxLength={80}
        readOnly={isEditing}
        error={errors.slug?.message}
        {...register("slug")}
      />
      <TextAreaField
        label="Descricao"
        placeholder="Descricao"
        maxLength={TEXTAREA_MAX}
        error={errors.summary?.message}
        {...register("summary")}
      />
      <div className="form-grid">
        <Field
          label="Horario de encontro"
          placeholder="Ex.: Quintas, 19:30"
          maxLength={TEXT_MAX}
          error={errors.meetingTime?.message}
          {...register("meetingTime")}
        />
        <Field
          label="Contato"
          placeholder="Nome ou WhatsApp"
          maxLength={TEXT_MAX}
          error={errors.contact?.message}
          {...register("contact")}
        />
      </div>
      <div className="form-grid">
        <Field label="Cor" type="color" error={errors.color?.message} {...register("color")} />
        <Field
          label="Ordem"
          type="number"
          min={0}
          error={errors.sortOrder?.message}
          {...register("sortOrder", { valueAsNumber: true })}
        />
      </div>
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}
