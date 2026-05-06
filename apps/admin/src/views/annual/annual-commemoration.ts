import { getDayCommemorations, getMonthCommemorations, type Commemoration } from "@4ibib/core";

export interface MonthHighlight {
  monthIndex: number;
  monthLabel: string;
  items: { id: string; name: string; description: string; color: string }[];
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

export function monthHighlightsForYear(commemorations: Commemoration[], year: number): MonthHighlight[] {
  const months: MonthHighlight[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const monthCommemos = getMonthCommemorations(commemorations, m);
    if (monthCommemos.length === 0) continue;
    months.push({
      monthIndex: m,
      monthLabel: MONTH_LABELS_PT[m - 1] ?? `Mes ${m}`,
      items: monthCommemos.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        color: item.color
      }))
    });
  }
  void year;
  return months;
}

export function dayHighlightForIso(
  commemorations: Commemoration[],
  iso: string
): { id: string; name: string; description: string; color: string }[] {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return [];
  return getDayCommemorations(commemorations, date.getMonth() + 1, date.getDate()).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    color: item.color
  }));
}
