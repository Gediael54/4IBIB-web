import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChurchProfile, ScheduleItem } from "@4ibib/core";
import MonthScrollCalendar from "./MonthScrollCalendar";

const PROFILE: ChurchProfile = {
  id: "main",
  name: "4a Igreja Batista Independente Betel",
  shortName: "4a Betel",
  tagline: "",
  city: "",
  pastorName: "",
  address: "",
  email: "",
  whatsapp: "",
  instagramUrl: "",
  youtubeUrl: "",
  mapsUrl: "",
  heroVerse: "",
  mission: "",
  foundedText: "",
  regularMeetings: [],
  updatedAt: ""
};

function makeItem(overrides: Partial<ScheduleItem>): ScheduleItem {
  return {
    id: "evt",
    title: "Culto",
    ministry: "",
    startsAt: "2026-02-05T22:30:00.000Z",
    endsAt: "2026-02-06T00:00:00.000Z",
    location: "",
    summary: "",
    preacher: "",
    director: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    ...overrides
  };
}

const SCHEDULE: ScheduleItem[] = [
  makeItem({
    id: "feb-sunday-school",
    title: "Escola Biblica",
    startsAt: "2026-02-01T12:30:00.000Z",
    endsAt: "2026-02-01T14:00:00.000Z",
    preacher: "Pr. Augusto"
  }),
  makeItem({
    id: "feb-sunday-solemn",
    title: "Culto Solene",
    startsAt: "2026-02-01T20:00:00.000Z",
    endsAt: "2026-02-01T22:00:00.000Z",
    featured: true,
    occasionLabel: "MES DAS MISSOES"
  }),
  makeItem({
    id: "feb-thursday-praise",
    title: "Culto de louvor",
    startsAt: "2026-02-05T22:30:00.000Z",
    endsAt: "2026-02-06T00:00:00.000Z"
  }),
  makeItem({
    id: "march-event",
    title: "Reuniao de oracao",
    startsAt: "2026-03-12T22:30:00.000Z",
    endsAt: "2026-03-13T00:00:00.000Z"
  })
];

describe("MonthScrollCalendar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the current month header by default", () => {
    render(<MonthScrollCalendar schedule={SCHEDULE} profile={PROFILE} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(/Fevereiro de 2026/i);
  });

  it("renders the month occasion banner when any event has one", () => {
    const { container } = render(<MonthScrollCalendar schedule={SCHEDULE} profile={PROFILE} />);
    const banner = container.querySelector(".month-scroll-occasion");
    expect(banner).not.toBeNull();
    expect(banner).toHaveTextContent("MES DAS MISSOES");
  });

  it("marks days with events with the has-event class and disables empty days", () => {
    const { container } = render(<MonthScrollCalendar schedule={SCHEDULE} profile={PROFILE} />);
    const eventCells = container.querySelectorAll(".month-grid-cell.has-event");
    expect(eventCells.length).toBe(2);

    const day10 = screen.getByRole("button", { name: /Dia 10 sem eventos/i });
    expect(day10).toBeDisabled();
  });

  it("marks today with the today class", () => {
    const { container } = render(<MonthScrollCalendar schedule={SCHEDULE} profile={PROFILE} />);
    const today = container.querySelector(".month-grid-cell.today");
    expect(today).not.toBeNull();
    expect(today).toHaveTextContent("15");
  });

  it("renders one timeline section per day with events", () => {
    render(<MonthScrollCalendar schedule={SCHEDULE} profile={PROFILE} />);
    const sections = screen.getAllByRole("heading", { level: 4 });
    expect(sections).toHaveLength(2);
    expect(sections[0]).toHaveTextContent(/Domingo/);
    expect(sections[1]).toHaveTextContent(/Quinta/);
  });

  it("excludes events outside the visible month", () => {
    render(<MonthScrollCalendar schedule={SCHEDULE} profile={PROFILE} />);
    expect(screen.queryByText("Reuniao de oracao")).toBeNull();
  });

  it("navigates forward and backward through months", () => {
    render(<MonthScrollCalendar schedule={SCHEDULE} profile={PROFILE} />);
    const next = screen.getByRole("button", { name: /proximo mes/i });
    const prev = screen.getByRole("button", { name: /mes anterior/i });

    fireEvent.click(next);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(/Marco de 2026|Março de 2026/i);
    expect(screen.getByText("Reuniao de oracao")).toBeInTheDocument();

    fireEvent.click(prev);
    fireEvent.click(prev);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(/Janeiro de 2026/i);
    expect(screen.getByText(/Nenhum evento neste mes/i)).toBeInTheDocument();
  });

  it("scrolls to the day section when clicking a mini-grid day", () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollSpy
    });

    render(<MonthScrollCalendar schedule={SCHEDULE} profile={PROFILE} />);
    const cell = screen.getByRole("button", { name: /Ir para eventos do dia 5/i });
    fireEvent.click(cell);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("groups events by day in chronological order", () => {
    render(<MonthScrollCalendar schedule={SCHEDULE} profile={PROFILE} />);
    const sections = screen.getAllByRole("heading", { level: 4 });
    const sundayBlock = sections[0].closest("section");
    expect(sundayBlock).not.toBeNull();
    if (sundayBlock) {
      const titles = within(sundayBlock).getAllByText(/Escola Biblica|Culto Solene/);
      expect(titles[0]).toHaveTextContent("Escola Biblica");
      expect(titles[1]).toHaveTextContent("Culto Solene");
    }
  });
});
