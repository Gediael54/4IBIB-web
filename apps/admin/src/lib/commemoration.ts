import type { Commemoration } from "@4ibib/core";
import type { CommemorationFormValues } from "../schemas";

export const MONTH_OPTIONS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Marco" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" }
] as const;

export function emptyCommemorationValues(nextSortOrder: number): CommemorationFormValues {
  return {
    name: "",
    type: "month",
    month: new Date().getMonth() + 1,
    dayOfMonth: null,
    description: "",
    color: "#0f766e",
    sortOrder: nextSortOrder
  };
}

export function commemorationToFormValues(item: Commemoration): CommemorationFormValues {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    month: item.month,
    dayOfMonth: item.dayOfMonth,
    description: item.description,
    color: item.color,
    sortOrder: item.sortOrder
  };
}

export function describeCommemorationWhen(item: Commemoration): string {
  const monthLabel = MONTH_OPTIONS.find((m) => m.value === item.month)?.label ?? `Mes ${item.month}`;
  if (item.type === "month") {
    return `Mes inteiro · ${monthLabel}`;
  }
  return `Dia ${item.dayOfMonth} de ${monthLabel}`;
}
