import { describe, expect, it } from "vitest";
import { buildMonthCalendar, getMonthLabel, getWeekdayShortLabels, groupItemsByDay } from "./calendar";
import type { ScheduleItem } from "./index";

describe("getMonthLabel", () => {
  it("returns the Portuguese label for each month", () => {
    expect(getMonthLabel(1)).toBe("Janeiro");
    expect(getMonthLabel(5)).toBe("Maio");
    expect(getMonthLabel(12)).toBe("Dezembro");
  });

  it("falls back to numeric label for invalid month", () => {
    expect(getMonthLabel(13)).toBe("Mes 13");
  });
});

describe("getWeekdayShortLabels", () => {
  it("returns Sunday-first short labels", () => {
    expect(getWeekdayShortLabels()).toEqual(["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]);
  });
});

describe("buildMonthCalendar", () => {
  it("builds a 6-week grid covering May 2026 with leading days from April", () => {
    const calendar = buildMonthCalendar(2026, 5, new Date("2026-05-15T12:00:00.000Z"));
    expect(calendar.year).toBe(2026);
    expect(calendar.month).toBe(5);
    expect(calendar.weeks).toHaveLength(6);
    const firstDay = calendar.weeks[0].days[0];
    expect(firstDay.iso).toBe("2026-04-26");
    expect(firstDay.isCurrentMonth).toBe(false);
  });

  it("marks today correctly", () => {
    const calendar = buildMonthCalendar(2026, 5, new Date("2026-05-15T12:00:00.000Z"));
    const todayCell = calendar.weeks.flatMap((week) => week.days).find((day) => day.iso === "2026-05-15");
    expect(todayCell?.isToday).toBe(true);
  });

  it("limits the calendar to at most 6 weeks and keeps current-month days in the last", () => {
    const calendar = buildMonthCalendar(2026, 5, new Date("2026-05-01T00:00:00.000Z"));
    expect(calendar.weeks.length).toBeLessThanOrEqual(6);
    const last = calendar.weeks[calendar.weeks.length - 1];
    const hasCurrent = last.days.some((day) => day.isCurrentMonth);
    expect(hasCurrent).toBe(true);
  });

  it("trims the trailing week when it would be entirely out of month", () => {
    const calendar = buildMonthCalendar(2030, 9, new Date("2030-09-01T00:00:00.000Z"));
    const last = calendar.weeks[calendar.weeks.length - 1];
    const allOut = last.days.every((day) => !day.isCurrentMonth);
    expect(allOut).toBe(false);
  });
});

describe("groupItemsByDay", () => {
  function makeItem(id: string, startsAt: string, endsAt = startsAt): ScheduleItem {
    return {
      id,
      title: `Evt ${id}`,
      ministry: "culto",
      startsAt,
      endsAt,
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
      youtubeUrl: ""
    };
  }

  it("groups items into a map keyed by ISO day", () => {
    const items = [
      makeItem("a", "2026-05-10T20:00:00.000Z"),
      makeItem("b", "2026-05-10T21:30:00.000Z"),
      makeItem("c", "2026-05-12T19:00:00.000Z")
    ];
    const grouped = groupItemsByDay(items);
    expect(grouped.get("2026-05-10")?.map((i) => i.id)).toEqual(["a", "b"]);
    expect(grouped.get("2026-05-12")?.map((i) => i.id)).toEqual(["c"]);
  });

  it("ignores items with invalid dates", () => {
    const items = [makeItem("bad", "not-a-date"), makeItem("ok", "2026-05-10T20:00:00.000Z")];
    const grouped = groupItemsByDay(items);
    expect(grouped.size).toBe(1);
  });

  it("returns empty map for empty input", () => {
    expect(groupItemsByDay([]).size).toBe(0);
  });
});
