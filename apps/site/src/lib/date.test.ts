import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMonths,
  daysInMonth,
  endOfMonth,
  formatMonthLabel,
  formatMonthShort,
  formatTime,
  formatWeekdayLong,
  formatWeekdayShort,
  getZonedParts,
  isoForDay,
  startOfMonth,
  weekdayOfFirstDay
} from "./date";

describe("date helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("startOfMonth normalizes to first day", () => {
    const result = startOfMonth(new Date(2026, 1, 18));
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  it("endOfMonth returns last day", () => {
    expect(endOfMonth(new Date(2026, 1, 1)).getDate()).toBe(28);
    expect(endOfMonth(new Date(2024, 1, 1)).getDate()).toBe(29);
  });

  it("addMonths handles forward and backward navigation including year wrap", () => {
    expect(addMonths(new Date(2026, 0, 1), 1).getMonth()).toBe(1);
    expect(addMonths(new Date(2026, 0, 1), -1).getFullYear()).toBe(2025);
    expect(addMonths(new Date(2026, 0, 1), -1).getMonth()).toBe(11);
  });

  it("daysInMonth returns 28/29/30/31 correctly", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 1)).toBe(31);
  });

  it("weekdayOfFirstDay matches calendar reality", () => {
    expect(weekdayOfFirstDay(2026, 2)).toBe(0);
    expect(weekdayOfFirstDay(2026, 1)).toBe(4);
  });

  it("formatMonthLabel capitalizes and survives runtime timezone", () => {
    const label = formatMonthLabel(new Date(2026, 1, 1));
    expect(label).toMatch(/Fevereiro/i);
    expect(label).toContain("2026");
  });

  it("formatTime renders Recife timezone", () => {
    expect(formatTime("2026-02-01T20:00:00.000Z")).toBe("17h00");
    expect(formatTime("2026-02-01T22:30:00.000Z")).toBe("19h30");
  });

  it("formatWeekdayLong drops -feira and capitalizes", () => {
    expect(formatWeekdayLong("2026-02-01T20:00:00.000Z")).toMatch(/Domingo/);
    expect(formatWeekdayLong("2026-02-05T22:30:00.000Z")).toMatch(/Quinta/);
  });

  it("formatWeekdayShort returns short label without trailing punctuation", () => {
    const value = formatWeekdayShort("2026-02-01T20:00:00.000Z");
    expect(value).not.toContain(".");
  });

  it("formatMonthShort returns short month label without trailing punctuation", () => {
    const value = formatMonthShort("2026-02-15T12:00:00.000Z");
    expect(value).not.toContain(".");
    expect(value.toLowerCase()).toContain("fev");
  });

  it("getZonedParts returns the date parts in Recife", () => {
    const parts = getZonedParts("2026-02-01T20:00:00.000Z");
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(2);
    expect(parts.day).toBe(1);
    expect(parts.hour).toBe(17);
    expect(parts.minute).toBe(0);
  });

  it("isoForDay builds a stable midday ISO", () => {
    expect(isoForDay(2026, 2, 1)).toBe("2026-02-01T12:00:00.000Z");
  });
});
