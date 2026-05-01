import { type ScheduleItem } from "@4ibib/core";

export type RoleColumn = "preacher" | "director" | "soundTeam";

export type Frequency =
  | "weekly"
  | "biweekly"
  | "monthly_1x"
  | "monthly_2x"
  | "every_2_months"
  | "every_3_months";

export type WeekdayFilter = "any" | 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PendingState {
  preacher?: string;
  director?: string;
  soundTeam?: string;
}

export interface GeneratorRule {
  id: string;
  volunteerName: string;
  role: RoleColumn;
  frequency: Frequency;
  weekday: WeekdayFilter;
}

export const ROLE_LABELS: Record<RoleColumn, string> = {
  preacher: "Pregador",
  director: "Dirigente",
  soundTeam: "Som"
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: "Toda semana",
  biweekly: "Dia sim, dia nao (a cada 2 semanas)",
  monthly_1x: "1x por mes",
  monthly_2x: "2x por mes",
  every_2_months: "1x a cada 2 meses",
  every_3_months: "1x por trimestre"
};

export const WEEKDAY_OPTIONS: Array<{ value: WeekdayFilter; label: string }> = [
  { value: "any", label: "Qualquer" },
  { value: 0, label: "Domingo" },
  { value: 4, label: "Quinta" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terca" },
  { value: 3, label: "Quarta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sabado" }
];

export function makeRuleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rule-${Math.random().toString(36).slice(2, 10)}`;
}

export function getCurrentValue(item: ScheduleItem, role: RoleColumn): string {
  if (role === "preacher") return item.preacher;
  if (role === "director") return item.director;
  return item.soundTeam;
}

export function applyPending(item: ScheduleItem, pending: PendingState | undefined): ScheduleItem {
  if (!pending) return item;
  return {
    ...item,
    preacher: pending.preacher ?? item.preacher,
    director: pending.director ?? item.director,
    soundTeam: pending.soundTeam ?? item.soundTeam
  };
}

export function startOfWeek(value: string): number {
  const date = new Date(value);
  const day = date.getDay();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

export function pickByCadence(eligible: ScheduleItem[], frequency: Frequency): ScheduleItem[] {
  if (eligible.length === 0) return [];
  if (frequency === "weekly") return eligible;
  if (frequency === "biweekly") return eligible.filter((_, index) => index % 2 === 0);

  const groups = new Map<string, ScheduleItem[]>();
  const order: string[] = [];
  for (const item of eligible) {
    const date = new Date(item.startsAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }

  const picks: ScheduleItem[] = [];
  if (frequency === "monthly_1x") {
    for (const key of order) {
      picks.push(groups.get(key)![0]);
    }
    return picks;
  }
  if (frequency === "monthly_2x") {
    for (const key of order) {
      picks.push(...groups.get(key)!.slice(0, 2));
    }
    return picks;
  }
  if (frequency === "every_2_months") {
    for (const key of order) {
      const month = Number(key.split("-")[1]);
      if (month % 2 === 0) {
        picks.push(groups.get(key)![0]);
      }
    }
    return picks;
  }
  if (frequency === "every_3_months") {
    for (const key of order) {
      const month = Number(key.split("-")[1]);
      if (month % 3 === 0) {
        picks.push(groups.get(key)![0]);
      }
    }
    return picks;
  }
  return picks;
}

export function generateAssignments(
  rules: GeneratorRule[],
  items: ScheduleItem[],
  current: Map<string, PendingState>,
  schedule: ScheduleItem[],
  overwrite: boolean
): { next: Map<string, PendingState>; assignments: number } {
  const next = new Map<string, PendingState>();
  current.forEach((value, key) => {
    next.set(key, { ...value });
  });

  let assignments = 0;
  const itemById = new Map<string, ScheduleItem>();
  for (const item of schedule) {
    itemById.set(item.id, item);
  }

  for (const rule of rules) {
    const trimmed = rule.volunteerName.trim();
    if (!trimmed) continue;

    const eligible = items.filter((item) => {
      if (item.status !== "scheduled") return false;
      const date = new Date(item.startsAt);
      if (rule.weekday !== "any" && date.getDay() !== rule.weekday) return false;
      const merged = applyPending(item, next.get(item.id));
      const currentValue = getCurrentValue(merged, rule.role).trim();
      return overwrite || currentValue === "";
    });

    const picks = pickByCadence(eligible, rule.frequency);

    for (const item of picks) {
      const original = itemById.get(item.id);
      if (!original) continue;
      const existing = next.get(item.id) ?? {};
      const updated: PendingState = { ...existing, [rule.role]: trimmed };
      const cleaned: PendingState = {};
      (Object.keys(updated) as RoleColumn[]).forEach((key) => {
        const candidate = updated[key];
        if (candidate !== undefined && candidate !== getCurrentValue(original, key)) {
          cleaned[key] = candidate;
        }
      });
      if (Object.keys(cleaned).length === 0) {
        next.delete(item.id);
      } else {
        next.set(item.id, cleaned);
      }
      assignments += 1;
    }
  }

  return { next, assignments };
}
