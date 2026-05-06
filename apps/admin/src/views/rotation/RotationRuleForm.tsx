import type { Member } from "@4ibib/core";
import type { UseFormReturn } from "react-hook-form";
import { Field, FormActions, TextAreaField } from "../../components/ui";
import { TEXT_MAX, TEXTAREA_MAX } from "../../lib/limits";
import {
  ROTATION_FREQUENCY_OPTIONS,
  ROTATION_ROLE_OPTIONS,
  WEEKDAY_OPTIONS
} from "../../lib/rotation-labels";
import type { RotationRuleFormValues } from "../../schemas";

interface RotationRuleFormProps {
  form: UseFormReturn<RotationRuleFormValues>;
  members: Member[];
  saving: boolean;
  onSubmit: (values: RotationRuleFormValues) => void;
  onCancel: () => void;
}

export default function RotationRuleForm({
  form,
  members,
  saving,
  onSubmit,
  onCancel
}: RotationRuleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = form;

  const sortedMembers = [...members].sort((left, right) =>
    left.fullName.localeCompare(right.fullName, "pt-BR")
  );

  return (
    <form className="editor-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <label>
        <span className="field-label">Voluntário</span>
        <select {...register("memberId")}>
          <option value="">Selecione um voluntário</option>
          {sortedMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName}
            </option>
          ))}
        </select>
        {errors.memberId?.message && <small className="form-error">{errors.memberId.message}</small>}
      </label>

      <div className="form-grid">
        <label>
          <span className="field-label">Função</span>
          <select {...register("role")}>
            {ROTATION_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Dia da semana</span>
          <select {...register("weekday", { valueAsNumber: true })}>
            {WEEKDAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span className="field-label">Frequência</span>
        <select {...register("frequency")}>
          {ROTATION_FREQUENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="Ministério (opcional)"
        placeholder="Ex.: culto-solene · deixe vazio para qualquer"
        maxLength={TEXT_MAX}
        error={errors.ministry?.message}
        {...register("ministry")}
      />

      <div className="form-grid">
        <Field
          label="Prioridade"
          type="number"
          min={0}
          error={errors.priority?.message}
          {...register("priority", { valueAsNumber: true })}
        />
        <label className="check-row">
          <input type="checkbox" {...register("active")} />
          <span>Ativa</span>
        </label>
      </div>

      <TextAreaField
        label="Anotações (opcional)"
        placeholder="Ex.: prefere o culto da noite"
        maxLength={TEXTAREA_MAX}
        error={errors.notes?.message}
        {...register("notes")}
      />

      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}
