import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "@4ibib/core";
import LatestTeaching from "./LatestTeaching";

function makeItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "evt",
    title: "Culto solene",
    ministry: "culto",
    startsAt: "2026-04-01T20:00:00.000Z",
    endsAt: "2026-04-01T22:00:00.000Z",
    location: "",
    summary: "",
    preacher: "Pr. Augusto",
    director: "",
    soundTeam: "",
    passage: "Marcos 5",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    seriesId: null,
    youtubeUrl: "",
    ...overrides
  };
}

describe("LatestTeaching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the most recent past event with a youtube link", () => {
    const schedule: ScheduleItem[] = [
      makeItem({
        id: "older",
        title: "Pregacao antiga",
        startsAt: "2026-03-01T20:00:00.000Z",
        endsAt: "2026-03-01T22:00:00.000Z",
        youtubeUrl: "https://youtu.be/oldid000001"
      }),
      makeItem({
        id: "latest",
        title: "Pregacao recente",
        startsAt: "2026-05-01T20:00:00.000Z",
        endsAt: "2026-05-01T22:00:00.000Z",
        youtubeUrl: "https://www.youtube.com/watch?v=newid000002"
      })
    ];
    render(<LatestTeaching schedule={schedule} />);
    expect(screen.getByText("Pregacao recente")).toBeInTheDocument();
    expect(screen.queryByText("Pregacao antiga")).toBeNull();
    const link = screen.getByRole("link", { name: /Assistir no YouTube/u });
    expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=newid000002");
  });

  it("renders nothing when there are no past events with youtube links", () => {
    const schedule: ScheduleItem[] = [
      makeItem({
        id: "future",
        endsAt: "2026-06-01T22:00:00.000Z",
        youtubeUrl: "https://youtu.be/future0001"
      }),
      makeItem({ id: "past-no-yt", startsAt: "2026-04-01T20:00:00.000Z", endsAt: "2026-04-01T22:00:00.000Z" })
    ];
    const { container } = render(<LatestTeaching schedule={schedule} />);
    expect(container.firstChild).toBeNull();
  });

  it("ignores past events whose youtubeUrl is invalid", () => {
    const schedule: ScheduleItem[] = [
      makeItem({
        id: "broken",
        startsAt: "2026-04-10T20:00:00.000Z",
        endsAt: "2026-04-10T22:00:00.000Z",
        youtubeUrl: "https://vimeo.com/12345"
      })
    ];
    const { container } = render(<LatestTeaching schedule={schedule} />);
    expect(container.firstChild).toBeNull();
  });
});
