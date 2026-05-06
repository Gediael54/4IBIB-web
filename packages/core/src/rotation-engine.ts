import type { RotationFrequency, RotationRole, RotationRule, ScheduleItem } from "./index";

export interface MemberAvailability {
  id: string;
  name: string;
  unavailableIsoDates: string[];
}

export interface ScheduleAssignment {
  itemId: string;
  role: RotationRole;
  memberId: string;
  memberName: string;
}

export interface RotationContext {
  startsAt: Date;
  weekIndex: number;
  weekOfMonth: number;
  isLastWeekOfMonth: boolean;
  quarterIndex: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildRotationContext(date: Date, anchor: Date): RotationContext {
  const startsAt = new Date(date.getTime());
  const diffMs = startsAt.getTime() - anchor.getTime();
  const diffDays = Math.floor(diffMs / DAY_MS);
  const weekIndex = Math.floor(diffDays / 7);
  const weekOfMonth = Math.floor((startsAt.getDate() - 1) / 7) + 1;
  const lastDayOfMonth = new Date(startsAt.getFullYear(), startsAt.getMonth() + 1, 0).getDate();
  const isLastWeekOfMonth = startsAt.getDate() > lastDayOfMonth - 7;
  const quarterIndex = Math.floor(weekIndex / 13);
  return { startsAt, weekIndex, weekOfMonth, isLastWeekOfMonth, quarterIndex };
}

export function frequencyMatches(frequency: RotationFrequency, context: RotationContext): boolean {
  switch (frequency) {
    case "every_week":
      return true;
    case "every_2_weeks":
      return context.weekIndex % 2 === 0;
    case "every_3_weeks":
      return context.weekIndex % 3 === 0;
    case "every_4_weeks":
      return context.weekIndex % 4 === 0;
    case "monthly_first":
      return context.weekOfMonth === 1;
    case "monthly_second":
      return context.weekOfMonth === 2;
    case "monthly_third":
      return context.weekOfMonth === 3;
    case "monthly_fourth":
      return context.weekOfMonth === 4;
    case "monthly_last":
      return context.isLastWeekOfMonth;
    case "quarterly":
      return context.quarterIndex !== Math.floor((context.weekIndex - 1) / 13);
  }
}

function memberAvailableForDate(member: MemberAvailability, isoDate: string): boolean {
  if (member.unavailableIsoDates.length === 0) return true;
  const day = isoDate.slice(0, 10);
  return !member.unavailableIsoDates.some((entry) => entry.slice(0, 10) === day);
}

interface RoleSlot {
  field: "preacher" | "director" | "soundTeam";
  rotationRole: RotationRole;
}

const ROLE_SLOTS: RoleSlot[] = [
  { field: "preacher", rotationRole: "preacher" },
  { field: "director", rotationRole: "director" },
  { field: "soundTeam", rotationRole: "sound" }
];

export interface GenerateInput {
  items: ScheduleItem[];
  rules: RotationRule[];
  members: MemberAvailability[];
  anchor?: Date;
  overwrite?: boolean;
}

export interface GenerateResult {
  assignments: ScheduleAssignment[];
  conflicts: Array<{ itemId: string; role: RotationRole; reason: string }>;
}

export function generateScheduleAssignments(input: GenerateInput): GenerateResult {
  const { items, rules, members } = input;
  const overwrite = input.overwrite ?? false;
  const anchor = input.anchor ?? findEarliestStart(items);
  const memberById = new Map(members.map((member) => [member.id, member]));

  const activeRules = rules.filter((rule) => rule.active);
  const sortedRules = [...activeRules].sort((left, right) => right.priority - left.priority);

  const usageCount = new Map<string, number>();
  const assignments: ScheduleAssignment[] = [];
  const conflicts: GenerateResult["conflicts"] = [];

  for (const item of [...items].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
    if (item.status !== "scheduled") continue;
    const startsAt = new Date(item.startsAt);
    const context = buildRotationContext(startsAt, anchor);

    for (const slot of ROLE_SLOTS) {
      if (!overwrite && hasValue(item, slot.field)) continue;
      const candidates = sortedRules.filter(
        (rule) =>
          rule.role === slot.rotationRole &&
          rule.weekday === startsAt.getDay() &&
          (rule.ministry === "" || rule.ministry === item.ministry) &&
          frequencyMatches(rule.frequency, context)
      );
      if (candidates.length === 0) continue;

      const eligible = candidates
        .map((rule) => {
          const member = memberById.get(rule.memberId);
          if (!member) return null;
          if (!memberAvailableForDate(member, item.startsAt)) return null;
          return { rule, member, used: usageCount.get(member.id) ?? 0 };
        })
        .filter(
          (entry): entry is { rule: RotationRule; member: MemberAvailability; used: number } => entry !== null
        );

      if (eligible.length === 0) {
        conflicts.push({
          itemId: item.id,
          role: slot.rotationRole,
          reason: "Nenhum voluntario disponivel atende a regra nessa data."
        });
        continue;
      }

      eligible.sort((left, right) => {
        if (left.used !== right.used) return left.used - right.used;
        return right.rule.priority - left.rule.priority;
      });
      const winner = eligible[0];
      assignments.push({
        itemId: item.id,
        role: slot.rotationRole,
        memberId: winner.member.id,
        memberName: winner.member.name
      });
      usageCount.set(winner.member.id, (usageCount.get(winner.member.id) ?? 0) + 1);
    }
  }

  return { assignments, conflicts };
}

function hasValue(item: ScheduleItem, field: RoleSlot["field"]): boolean {
  if (field === "soundTeam") return item.soundTeam.trim().length > 0;
  return item[field].trim().length > 0;
}

function findEarliestStart(items: ScheduleItem[]): Date {
  if (items.length === 0) return new Date();
  let earliest = Date.parse(items[0].startsAt);
  for (const item of items) {
    const time = Date.parse(item.startsAt);
    if (time < earliest) earliest = time;
  }
  return new Date(earliest);
}
