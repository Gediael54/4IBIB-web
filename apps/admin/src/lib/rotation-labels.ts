import type { RotationFrequency, RotationRole } from "@4ibib/core";

export const ROTATION_ROLE_OPTIONS: ReadonlyArray<{ value: RotationRole; label: string }> = [
  { value: "preacher", label: "Pregador" },
  { value: "director", label: "Dirigente" },
  { value: "sound", label: "Som" }
];

export const ROTATION_ROLE_LABEL: Record<RotationRole, string> = {
  preacher: "Pregador",
  director: "Dirigente",
  sound: "Som"
};

export const ROTATION_FREQUENCY_OPTIONS: ReadonlyArray<{ value: RotationFrequency; label: string }> = [
  { value: "every_week", label: "Toda semana" },
  { value: "every_2_weeks", label: "A cada 2 semanas" },
  { value: "every_3_weeks", label: "A cada 3 semanas" },
  { value: "every_4_weeks", label: "A cada 4 semanas" },
  { value: "monthly_first", label: "1ª semana do mês" },
  { value: "monthly_second", label: "2ª semana do mês" },
  { value: "monthly_third", label: "3ª semana do mês" },
  { value: "monthly_fourth", label: "4ª semana do mês" },
  { value: "monthly_last", label: "Última semana do mês" },
  { value: "quarterly", label: "Trimestralmente" }
];

export const ROTATION_FREQUENCY_LABEL: Record<RotationFrequency, string> = ROTATION_FREQUENCY_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<RotationFrequency, string>
);

export const WEEKDAY_OPTIONS: ReadonlyArray<{ value: number; label: string; short: string }> = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terca", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sabado", short: "Sab" }
];

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label ?? "";
}
