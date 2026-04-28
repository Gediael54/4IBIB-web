import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "@4ibib/core";
import MonthAgenda, { addMonths, endOfMonth, startOfMonth } from "./MonthAgenda";

function makeItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "evt-1",
    title: "Culto de louvor",
    ministry: "Louvor",
    startsAt: "2026-02-05T22:30:00.000Z",
    endsAt: "2026-02-06T00:00:00.000Z",
    location: "Templo principal",
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
    preacher: "Pr. Augusto",
    location: "Templo principal"
  }),
  makeItem({
    id: "feb-sunday-solemn",
    title: "Culto Solene",
    startsAt: "2026-02-01T20:00:00.000Z",
    endsAt: "2026-02-01T22:00:00.000Z",
    preacher: "Pr. Augusto",
    location: "Marcos 5",
    featured: true
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
  }),
  makeItem({
    id: "feb-suspended",
    title: "Culto suspenso",
    startsAt: "2026-02-12T22:30:00.000Z",
    endsAt: "2026-02-13T00:00:00.000Z",
    status: "suspended"
  }),
  makeItem({
    id: "feb-free",
    title: "Sem programacao",
    startsAt: "2026-02-19T22:30:00.000Z",
    endsAt: "2026-02-20T00:00:00.000Z",
    status: "free"
  })
];

describe("MonthAgenda helpers", () => {
  it("startOfMonth normalizes to first day", () => {
    const result = startOfMonth(new Date(2026, 1, 18));
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  it("endOfMonth returns last day of month", () => {
    const result = endOfMonth(new Date(2026, 1, 1));
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });

  it("addMonths handles forward and backward navigation including year wrap", () => {
    expect(addMonths(new Date(2026, 0, 1), 1).getMonth()).toBe(1);
    expect(addMonths(new Date(2026, 0, 1), -1).getFullYear()).toBe(2025);
    expect(addMonths(new Date(2026, 0, 1), -1).getMonth()).toBe(11);
  });
});

describe("MonthAgenda component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the current month header by default", () => {
    render(<MonthAgenda schedule={SCHEDULE} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(/Fevereiro de 2026/i);
  });

  it("respects initialMonth prop", () => {
    render(<MonthAgenda schedule={SCHEDULE} initialMonth={new Date(2026, 2, 1)} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(/Marco de 2026|Março de 2026/i);
  });

  it("groups events by day in ascending time order", () => {
    render(<MonthAgenda schedule={SCHEDULE} />);
    const dayHeadings = screen.getAllByRole("heading", { level: 4 });
    expect(dayHeadings).toHaveLength(4);

    const sundayBlock = dayHeadings[0].closest("li");
    expect(sundayBlock).not.toBeNull();
    if (sundayBlock) {
      const sundayEvents = within(sundayBlock).getAllByRole("listitem");
      expect(sundayEvents).toHaveLength(2);
      expect(sundayEvents[0]).toHaveTextContent("Escola Biblica");
      expect(sundayEvents[0]).toHaveTextContent("9h30");
      expect(sundayEvents[1]).toHaveTextContent("Culto Solene");
      expect(sundayEvents[1]).toHaveTextContent("17h00");
    }

    expect(dayHeadings[0]).toHaveTextContent(/Domingo/);
    expect(dayHeadings[0]).toHaveTextContent("1");
    expect(dayHeadings[1]).toHaveTextContent(/Quinta/);
    expect(dayHeadings[1]).toHaveTextContent("5");
  });

  it("excludes events outside the visible month", () => {
    render(<MonthAgenda schedule={SCHEDULE} />);
    expect(screen.queryByText("Reuniao de oracao")).toBeNull();
  });

  it("navigates forward and backward through months", () => {
    render(<MonthAgenda schedule={SCHEDULE} />);
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

  it("applies status and featured class names", () => {
    render(<MonthAgenda schedule={SCHEDULE} />);

    const featured = screen.getByText("Culto Solene").closest("li");
    expect(featured).toHaveClass("featured");

    const suspended = screen.getByText("Culto suspenso").closest("li");
    expect(suspended).toHaveClass("suspended");

    const free = screen.getByText("Sem programacao").closest("li");
    expect(free).toHaveClass("free");
  });

  it("renders empty state when month has no events", () => {
    render(<MonthAgenda schedule={[]} />);
    expect(screen.getByText(/Nenhum evento neste mes/i)).toBeInTheDocument();
  });

  it("renders preacher and location meta when available", () => {
    render(<MonthAgenda schedule={SCHEDULE} />);
    expect(screen.getByText(/Pr\. Augusto · Templo principal/i)).toBeInTheDocument();
  });
});
