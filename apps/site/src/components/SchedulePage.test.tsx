import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "@4ibib/core";
import SchedulePage from "./SchedulePage";

function makeItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "evt",
    title: "Culto",
    ministry: "culto",
    startsAt: "2026-05-08T22:30:00.000Z",
    endsAt: "2026-05-09T00:00:00.000Z",
    location: "",
    summary: "",
    preacher: "",
    director: "",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    ...overrides
  };
}

const SAMPLE_SCHEDULE: ScheduleItem[] = [
  makeItem({
    id: "may-thursday-praise",
    title: "Culto de louvor",
    ministry: "culto",
    startsAt: "2026-05-07T22:30:00.000Z",
    endsAt: "2026-05-08T00:00:00.000Z",
    preacher: "Pr. Samuel Costa",
    director: "Joao",
    soundTeam: "Carlos, Maria"
  } as Partial<ScheduleItem>),
  makeItem({
    id: "may-sunday-school",
    title: "Escola Biblica",
    ministry: "escola-biblica",
    startsAt: "2026-05-10T12:30:00.000Z",
    endsAt: "2026-05-10T14:00:00.000Z",
    preacher: "Diac. Lucas"
  }),
  makeItem({
    id: "may-sunday-solemn",
    title: "Culto Solene",
    ministry: "culto-solene",
    startsAt: "2026-05-10T20:00:00.000Z",
    endsAt: "2026-05-10T22:00:00.000Z",
    soundTeam: "Miguel"
  } as Partial<ScheduleItem>),
  makeItem({
    id: "june-special",
    title: "Encontro de jovens",
    ministry: "juventude",
    startsAt: "2026-06-14T19:00:00.000Z",
    endsAt: "2026-06-14T21:00:00.000Z"
  })
];

function setLocation({ hash = "", search = "" }: { hash?: string; search?: string }) {
  const url = new URL("https://example.com/");
  if (hash) url.hash = hash;
  if (search) url.search = search;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      hash: url.hash,
      search: url.search,
      href: url.href
    }
  });
}

describe("SchedulePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));
    setLocation({ hash: "#programacao" });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders empty state when filters return nothing", () => {
    render(<SchedulePage schedule={[]} />);
    expect(screen.getByText(/Nenhum evento encontrado/i)).toBeInTheDocument();
  });

  it("filters by name across preacher, director and soundTeam (case-insensitive)", () => {
    render(<SchedulePage schedule={SAMPLE_SCHEDULE} />);
    const input = screen.getByPlaceholderText(/Digite seu nome/i);
    fireEvent.change(input, { target: { value: "carlos" } });
    expect(screen.getByText("Culto de louvor")).toBeInTheDocument();
    expect(screen.queryByText("Escola Biblica")).toBeNull();
    expect(screen.queryByText("Culto Solene")).toBeNull();
  });

  it("filters by month (default selects current month with events)", () => {
    render(<SchedulePage schedule={SAMPLE_SCHEDULE} />);
    expect(screen.getByText("Culto de louvor")).toBeInTheDocument();
    expect(screen.queryByText("Encontro de jovens")).toBeNull();

    const monthSelect = screen.getByLabelText(/Mes/i) as HTMLSelectElement;
    fireEvent.change(monthSelect, { target: { value: "2026-06" } });
    expect(screen.getByText("Encontro de jovens")).toBeInTheDocument();
    expect(screen.queryByText("Culto de louvor")).toBeNull();
  });

  it("filters by type (Estudos shows only escola-biblica)", () => {
    render(<SchedulePage schedule={SAMPLE_SCHEDULE} />);
    const typeSelect = screen.getByLabelText(/Tipo/i) as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: "estudos" } });
    expect(screen.getByText("Escola Biblica")).toBeInTheDocument();
    expect(screen.queryByText("Culto de louvor")).toBeNull();
    expect(screen.queryByText("Culto Solene")).toBeNull();
  });

  it("preloads name query from URL ?nome=", () => {
    setLocation({ hash: "#programacao", search: "?nome=Miguel" });
    render(<SchedulePage schedule={SAMPLE_SCHEDULE} />);
    const input = screen.getByPlaceholderText(/Digite seu nome/i) as HTMLInputElement;
    expect(input.value).toBe("Miguel");
    expect(screen.getByText("Culto Solene")).toBeInTheDocument();
    expect(screen.queryByText("Culto de louvor")).toBeNull();
  });

  it("renders Voltar link pointing to #inicio", () => {
    render(<SchedulePage schedule={SAMPLE_SCHEDULE} />);
    const back = screen.getByRole("link", { name: /Voltar/i });
    expect(back).toHaveAttribute("href", "#inicio");
  });

  it("highlights matched name with mark.match", () => {
    render(<SchedulePage schedule={SAMPLE_SCHEDULE} />);
    const input = screen.getByPlaceholderText(/Digite seu nome/i);
    fireEvent.change(input, { target: { value: "Carlos" } });
    const card = screen.getByText("Culto de louvor").closest(".event-card");
    expect(card).not.toBeNull();
    if (card) {
      const mark = within(card as HTMLElement).getByText("Carlos");
      expect(mark.tagName).toBe("MARK");
      expect(mark).toHaveClass("match");
    }
  });

  it("clear filters button restores defaults", () => {
    render(<SchedulePage schedule={SAMPLE_SCHEDULE} />);
    const input = screen.getByPlaceholderText(/Digite seu nome/i) as HTMLInputElement;
    const typeSelect = screen.getByLabelText(/Tipo/i) as HTMLSelectElement;
    fireEvent.change(input, { target: { value: "Inexistente" } });
    fireEvent.change(typeSelect, { target: { value: "estudos" } });

    expect(screen.getByText(/Nenhum evento encontrado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Limpar filtros/i }));
    expect(input.value).toBe("");
    expect(typeSelect.value).toBe("all");
  });
});
