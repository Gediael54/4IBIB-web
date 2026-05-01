import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "@4ibib/core";
import UpcomingEvents from "./UpcomingEvents";

function makeItem(id: string, daysFromNow: number, overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  const base = new Date("2026-02-15T12:00:00.000Z").getTime();
  const startsAt = new Date(base + daysFromNow * 86_400_000).toISOString();
  const endsAt = new Date(base + daysFromNow * 86_400_000 + 90 * 60_000).toISOString();
  return {
    id,
    title: `Evento ${id}`,
    ministry: "",
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
    ...overrides
  };
}

describe("UpcomingEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders nothing when there are no upcoming events", () => {
    const { container } = render(<UpcomingEvents schedule={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("limits the list to the upcoming default of 5", () => {
    const schedule = Array.from({ length: 10 }, (_, index) => makeItem(`evt-${index}`, index + 1));
    render(<UpcomingEvents schedule={schedule} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
  });

  it("ignores past events and non-scheduled status", () => {
    const schedule = [
      makeItem("past", -1),
      makeItem("suspended", 2, { status: "suspended" }),
      makeItem("free", 3, { status: "free" }),
      makeItem("future", 4)
    ];
    render(<UpcomingEvents schedule={schedule} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Evento future")).toBeInTheDocument();
  });

  it("respects custom limit prop", () => {
    const schedule = Array.from({ length: 5 }, (_, index) => makeItem(`evt-${index}`, index + 1));
    render(<UpcomingEvents schedule={schedule} limit={2} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
