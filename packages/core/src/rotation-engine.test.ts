import { describe, expect, it } from "vitest";
import {
  buildRotationContext,
  frequencyMatches,
  generateScheduleAssignments,
  type MemberAvailability
} from "./rotation-engine";
import type { RotationFrequency, RotationRule, ScheduleItem } from "./index";

function makeRule(overrides: Partial<RotationRule> = {}): RotationRule {
  return {
    id: "rule-1",
    memberId: "m1",
    role: "preacher",
    frequency: "every_week",
    weekday: 0,
    ministry: "",
    priority: 0,
    active: true,
    notes: "",
    ...overrides
  };
}

function makeItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "evt-1",
    title: "Culto",
    ministry: "culto-solene",
    startsAt: "2026-05-10T20:00:00.000Z",
    endsAt: "2026-05-10T22:00:00.000Z",
    location: "",
    summary: "",
    preacher: "",
    director: "",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    seriesId: null,
    youtubeUrl: "",
    ...overrides
  };
}

function makeMember(overrides: Partial<MemberAvailability> = {}): MemberAvailability {
  return {
    id: "m1",
    name: "Pastor Samuel",
    unavailableIsoDates: [],
    ...overrides
  };
}

describe("buildRotationContext", () => {
  it("derives weekIndex from anchor distance", () => {
    const anchor = new Date("2026-01-04T00:00:00.000Z");
    const context = buildRotationContext(new Date("2026-01-18T00:00:00.000Z"), anchor);
    expect(context.weekIndex).toBe(2);
  });

  it("identifies week of month and last week", () => {
    const anchor = new Date("2026-05-03T00:00:00.000Z");
    const lastWeek = buildRotationContext(new Date("2026-05-31T00:00:00.000Z"), anchor);
    expect(lastWeek.weekOfMonth).toBe(5);
    expect(lastWeek.isLastWeekOfMonth).toBe(true);
  });
});

describe("frequencyMatches", () => {
  const cases: Array<[RotationFrequency, number, boolean]> = [
    ["every_week", 0, true],
    ["every_week", 5, true],
    ["every_2_weeks", 0, true],
    ["every_2_weeks", 1, false],
    ["every_3_weeks", 3, true],
    ["every_4_weeks", 4, true],
    ["every_4_weeks", 5, false]
  ];
  it.each(cases)("frequency %s on weekIndex %s -> %s", (freq, weekIndex, expected) => {
    expect(
      frequencyMatches(freq, {
        startsAt: new Date(),
        weekIndex,
        weekOfMonth: 1,
        isLastWeekOfMonth: false,
        quarterIndex: 0
      })
    ).toBe(expected);
  });

  it("matches monthly slots by week of month", () => {
    const ctx = (weekOfMonth: number, isLast = false) => ({
      startsAt: new Date(),
      weekIndex: 0,
      weekOfMonth,
      isLastWeekOfMonth: isLast,
      quarterIndex: 0
    });
    expect(frequencyMatches("monthly_first", ctx(1))).toBe(true);
    expect(frequencyMatches("monthly_first", ctx(2))).toBe(false);
    expect(frequencyMatches("monthly_second", ctx(2))).toBe(true);
    expect(frequencyMatches("monthly_third", ctx(3))).toBe(true);
    expect(frequencyMatches("monthly_fourth", ctx(4))).toBe(true);
    expect(frequencyMatches("monthly_last", ctx(4, true))).toBe(true);
    expect(frequencyMatches("monthly_last", ctx(4, false))).toBe(false);
  });

  it("triggers quarterly on quarter boundaries", () => {
    const make = (weekIndex: number) => ({
      startsAt: new Date(),
      weekIndex,
      weekOfMonth: 1,
      isLastWeekOfMonth: false,
      quarterIndex: Math.floor(weekIndex / 13)
    });
    expect(frequencyMatches("quarterly", make(0))).toBe(true);
    expect(frequencyMatches("quarterly", make(13))).toBe(true);
    expect(frequencyMatches("quarterly", make(7))).toBe(false);
  });
});

describe("generateScheduleAssignments", () => {
  it("assigns the only eligible volunteer to a scheduled event", () => {
    const result = generateScheduleAssignments({
      items: [makeItem()],
      rules: [makeRule({ weekday: 0 })],
      members: [makeMember()]
    });
    expect(result.assignments).toEqual([
      { itemId: "evt-1", role: "preacher", memberId: "m1", memberName: "Pastor Samuel" }
    ]);
    expect(result.conflicts).toEqual([]);
  });

  it("does not overwrite existing values by default", () => {
    const result = generateScheduleAssignments({
      items: [makeItem({ preacher: "Existing" })],
      rules: [makeRule({ weekday: 0 })],
      members: [makeMember()]
    });
    expect(result.assignments).toEqual([]);
  });

  it("overwrites when overwrite flag is set", () => {
    const result = generateScheduleAssignments({
      items: [makeItem({ preacher: "Existing" })],
      rules: [makeRule({ weekday: 0 })],
      members: [makeMember()],
      overwrite: true
    });
    expect(result.assignments).toHaveLength(1);
  });

  it("skips items not scheduled", () => {
    const result = generateScheduleAssignments({
      items: [makeItem({ status: "suspended" })],
      rules: [makeRule({ weekday: 0 })],
      members: [makeMember()]
    });
    expect(result.assignments).toEqual([]);
  });

  it("skips when weekday does not match", () => {
    const result = generateScheduleAssignments({
      items: [makeItem({ startsAt: "2026-05-13T19:30:00.000Z", endsAt: "2026-05-13T21:00:00.000Z" })],
      rules: [makeRule({ weekday: 0 })],
      members: [makeMember()]
    });
    expect(result.assignments).toEqual([]);
  });

  it("ignores rules from other ministry when ministry is set", () => {
    const result = generateScheduleAssignments({
      items: [makeItem({ ministry: "louvor" })],
      rules: [makeRule({ weekday: 0, ministry: "culto-solene" })],
      members: [makeMember()]
    });
    expect(result.assignments).toEqual([]);
  });

  it("matches any ministry when rule.ministry is empty", () => {
    const result = generateScheduleAssignments({
      items: [makeItem({ ministry: "louvor" })],
      rules: [makeRule({ weekday: 0, ministry: "" })],
      members: [makeMember()]
    });
    expect(result.assignments).toHaveLength(1);
  });

  it("respects unavailable dates", () => {
    const result = generateScheduleAssignments({
      items: [makeItem()],
      rules: [makeRule({ weekday: 0 })],
      members: [makeMember({ unavailableIsoDates: ["2026-05-10"] })]
    });
    expect(result.assignments).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({ itemId: "evt-1", role: "preacher" });
  });

  it("rotates between volunteers preferring less used", () => {
    const items = [
      makeItem({ id: "a", startsAt: "2026-05-10T20:00:00.000Z", endsAt: "2026-05-10T22:00:00.000Z" }),
      makeItem({ id: "b", startsAt: "2026-05-17T20:00:00.000Z", endsAt: "2026-05-17T22:00:00.000Z" }),
      makeItem({ id: "c", startsAt: "2026-05-24T20:00:00.000Z", endsAt: "2026-05-24T22:00:00.000Z" })
    ];
    const rules = [
      makeRule({ id: "r1", memberId: "m1", weekday: 0, priority: 1 }),
      makeRule({ id: "r2", memberId: "m2", weekday: 0, priority: 1 })
    ];
    const members = [makeMember({ id: "m1", name: "Carlos" }), makeMember({ id: "m2", name: "Maria" })];
    const result = generateScheduleAssignments({ items, rules, members });
    const memberIds = result.assignments.map((a) => a.memberId);
    expect(new Set(memberIds).size).toBe(2);
  });

  it("ignores inactive rules", () => {
    const result = generateScheduleAssignments({
      items: [makeItem()],
      rules: [makeRule({ weekday: 0, active: false })],
      members: [makeMember()]
    });
    expect(result.assignments).toEqual([]);
  });

  it("returns no assignments when there are no items", () => {
    const result = generateScheduleAssignments({
      items: [],
      rules: [makeRule({ weekday: 0 })],
      members: [makeMember()]
    });
    expect(result.assignments).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it("skips rules that point to non-existing members", () => {
    const result = generateScheduleAssignments({
      items: [makeItem()],
      rules: [makeRule({ weekday: 0, memberId: "ghost" })],
      members: [makeMember({ id: "m1" })]
    });
    expect(result.conflicts).toHaveLength(1);
  });

  it("derives anchor from earliest item when not provided", () => {
    const items = [
      makeItem({ id: "later", startsAt: "2026-05-17T20:00:00.000Z", endsAt: "2026-05-17T22:00:00.000Z" }),
      makeItem({ id: "early", startsAt: "2026-05-10T20:00:00.000Z", endsAt: "2026-05-10T22:00:00.000Z" })
    ];
    const result = generateScheduleAssignments({
      items,
      rules: [makeRule({ weekday: 0, frequency: "every_2_weeks" })],
      members: [makeMember()]
    });
    // earliest is 2026-05-10 (anchor); 2026-05-17 = weekIndex 1 (odd), so it skips with every_2_weeks
    expect(result.assignments.map((a) => a.itemId)).toEqual(["early"]);
  });
});
