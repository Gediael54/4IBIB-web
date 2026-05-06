import { getDayCommemorations, getMonthCommemorations, type Commemoration } from "@4ibib/core";

export interface MonthHighlight {
  key: string;
  label: string;
  description: string;
  color: string;
}

export interface DayHighlight {
  id: string;
  label: string;
  description: string;
  color: string;
}

const MONTH_LABELS_PT = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

export function getCurrentMonthCommemorations(commemorations: Commemoration[]): MonthHighlight[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  return getMonthCommemorations(commemorations, month).map((item) => ({
    key: item.id,
    label: item.name,
    description: item.description,
    color: item.color
  }));
}

export function getCommemorationsForMonth(commemorations: Commemoration[], month: number): MonthHighlight[] {
  return getMonthCommemorations(commemorations, month).map((item) => ({
    key: item.id,
    label: item.name,
    description: item.description,
    color: item.color
  }));
}

export function getCommemorationsForDate(commemorations: Commemoration[], date: Date): DayHighlight[] {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return getDayCommemorations(commemorations, month, day).map((item) => ({
    id: item.id,
    label: item.name,
    description: item.description,
    color: item.color
  }));
}

export function getCommemorationsForIso(commemorations: Commemoration[], iso: string): DayHighlight[] {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return [];
  return getCommemorationsForDate(commemorations, date);
}

export function monthLabelPt(month: number): string {
  return MONTH_LABELS_PT[month - 1] ?? `Mes ${month}`;
}
