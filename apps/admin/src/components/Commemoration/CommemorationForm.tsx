import { Calendar, CalendarDays } from "lucide-react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { Field, FormActions, TextAreaField } from "../ui";
import { TEXT_MAX, TEXTAREA_MAX } from "../../lib/limits";
import { MONTH_OPTIONS } from "../../lib/commemoration";
import type { CommemorationFormValues } from "../../schemas";

interface CommemorationFormProps {
  form: UseFormReturn<CommemorationFormValues>;
  saving: boolean;
  onSubmit: (values: CommemorationFormValues) => void;
  onCancel: () => void;
}

export default function CommemorationForm({ form, saving, onSubmit, onCancel }: CommemorationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = form;
  const selectedType = watch("type");

  function handleTypeChange(next: "month" | "day") {
    setValue("type", next, { shouldValidate: true });
    if (next === "month") {
      setValue("dayOfMonth", null, { shouldValidate: true });
    } else if (watch("dayOfMonth") === null) {
      setValue("dayOfMonth", 1, { shouldValidate: true });
    }
  }

  return (
    <form className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field
        label="Nome"
        placeholder="Ex.: Mes de Missoes"
        maxLength={TEXT_MAX}
        error={errors.name?.message}
        {...register("name")}
      />

      <fieldset className="commemoration-type-group">
        <legend className="field-label">Tipo</legend>
        <div className="commemoration-type-options">
          <label className={selectedType === "month" ? "type-option selected" : "type-option"}>
            <input
              type="radio"
              value="month"
              checked={selectedType === "month"}
              onChange={() => handleTypeChange("month")}
            />
            <Calendar size={16} aria-hidden="true" />
            <span>Mes inteiro</span>
          </label>
          <label className={selectedType === "day" ? "type-option selected" : "type-option"}>
            <input
              type="radio"
              value="day"
              checked={selectedType === "day"}
              onChange={() => handleTypeChange("day")}
            />
            <CalendarDays size={16} aria-hidden="true" />
            <span>Dia especifico</span>
          </label>
        </div>
      </fieldset>

      <div className="form-grid">
        <label>
          <span className="field-label">Mes</span>
          <select {...register("month", { valueAsNumber: true })}>
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.month?.message && <small className="form-error">{errors.month.message}</small>}
        </label>

        {selectedType === "day" && (
          <Field
            label="Dia do mes"
            type="number"
            min={1}
            max={31}
            error={errors.dayOfMonth?.message}
            {...register("dayOfMonth", { valueAsNumber: true })}
          />
        )}
      </div>

      <TextAreaField
        label="Descricao (opcional)"
        placeholder="Ex.: Lembre da igreja em oracao pelos missionarios."
        maxLength={TEXTAREA_MAX}
        error={errors.description?.message}
        {...register("description")}
      />

      <div className="form-grid">
        <Field label="Cor do destaque" type="color" error={errors.color?.message} {...register("color")} />
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

export function useCommemorationForm(initialValues: CommemorationFormValues) {
  return useForm<CommemorationFormValues>({ defaultValues: initialValues });
}
