import "@testing-library/jest-dom/vitest";
import type {
  Announcement,
  MinistryRecord,
  PrayerRequest,
  ScheduleItem,
  SiteSnapshot,
  Volunteer
} from "@4ibib/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

function snapshot(overrides: Partial<SiteSnapshot> = {}): SiteSnapshot {
  return {
    announcements: [],
    schedule: [],
    volunteers: [],
    profile: null,
    ministries: [],
    recurringMeetings: [],
    commemorations: [],
    ...overrides
  };
}

function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: "a1",
    title: "Aniversario",
    summary: "Celebracao",
    category: "geral",
    publishedAt: new Date().toISOString(),
    pinned: false,
    ctaLabel: "",
    ctaUrl: "",
    status: "published",
    expiresAt: null,
    imageUrl: "",
    ...overrides
  };
}

function makeSchedule(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "s1",
    title: "Culto solene",
    ministry: "Louvor",
    startsAt: "2026-01-04T17:00:00.000Z",
    endsAt: "2026-01-04T19:00:00.000Z",
    location: "Templo",
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

function makeVolunteer(overrides: Partial<Volunteer> = {}): Volunteer {
  return {
    id: "v1",
    name: "Voluntario Z",
    role: "geral",
    sortOrder: 0,
    contact: "",
    photoUrl: "",
    ministries: [],
    unavailableDates: [],
    notes: "",
    ...overrides
  };
}

function makeMinistry(overrides: Partial<MinistryRecord> = {}): MinistryRecord {
  return {
    id: "m1",
    slug: "louvor",
    name: "Louvor",
    summary: "",
    meetingTime: "",
    contact: "",
    color: "#0f766e",
    sortOrder: 0,
    ...overrides
  };
}

function makePrayer(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: "p1",
    name: "Maria",
    contact: "",
    message: "Oracao",
    createdAt: new Date().toISOString(),
    status: "novo",
    pastoralNotes: "",
    assignedTo: null,
    seenAt: null,
    ...overrides
  };
}

describe("CommandPalette", () => {
  afterEach(() => cleanup());

  it("renders nothing when open is false", () => {
    const { container } = render(
      <CommandPalette
        snapshot={snapshot()}
        prayers={[]}
        open={false}
        onOpenChange={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog with input when open", () => {
    render(
      <CommandPalette snapshot={snapshot()} prayers={[]} open onOpenChange={vi.fn()} onNavigate={vi.fn()} />
    );
    expect(screen.getByRole("dialog", { name: "Busca rapida" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Buscar" })).toBeInTheDocument();
  });

  it("filters results by search query", () => {
    render(
      <CommandPalette
        snapshot={snapshot({
          announcements: [makeAnnouncement({ title: "Festa de aniversario" })],
          schedule: [makeSchedule({ title: "Culto solene" })],
          volunteers: [makeVolunteer({ name: "Voluntario Z" })],
          ministries: [makeMinistry()]
        })}
        prayers={[]}
        open
        onOpenChange={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Buscar" }), {
      target: { value: "aniversario" }
    });

    expect(screen.getByText("Festa de aniversario")).toBeInTheDocument();
    expect(screen.queryByText("Voluntario Z")).not.toBeInTheDocument();
  });

  it("renders 'Nenhum resultado' when no items match", () => {
    render(
      <CommandPalette snapshot={snapshot()} prayers={[]} open onOpenChange={vi.fn()} onNavigate={vi.fn()} />
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Buscar" }), {
      target: { value: "zzzz-nada" }
    });

    expect(screen.getByText("Nenhum resultado")).toBeInTheDocument();
  });

  it("navigates when clicking on a result", () => {
    const onNavigate = vi.fn();
    render(
      <CommandPalette
        snapshot={snapshot({ announcements: [makeAnnouncement({ title: "Aviso teste" })] })}
        prayers={[]}
        open
        onOpenChange={vi.fn()}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText("Aviso teste"));
    expect(onNavigate).toHaveBeenCalledWith("announcements");
  });

  it("navigates with ArrowDown + Enter keyboard", () => {
    const onNavigate = vi.fn();
    render(
      <CommandPalette
        snapshot={snapshot()}
        prayers={[]}
        open
        onOpenChange={vi.fn()}
        onNavigate={onNavigate}
      />
    );

    const dialog = screen.getByRole("dialog", { name: "Busca rapida" });
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("ArrowUp wraps around the result list", () => {
    const onNavigate = vi.fn();
    render(
      <CommandPalette
        snapshot={snapshot()}
        prayers={[]}
        open
        onOpenChange={vi.fn()}
        onNavigate={onNavigate}
      />
    );

    const dialog = screen.getByRole("dialog", { name: "Busca rapida" });
    fireEvent.keyDown(dialog, { key: "ArrowUp" });
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("closes when clicking the backdrop", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        snapshot={snapshot()}
        prayers={[]}
        open
        onOpenChange={onOpenChange}
        onNavigate={vi.fn()}
      />
    );

    const backdrop = document.querySelector(".command-palette-backdrop") as HTMLElement;
    fireEvent.click(backdrop);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("includes prayer requests in the results", () => {
    render(
      <CommandPalette
        snapshot={snapshot()}
        prayers={[makePrayer({ name: "Maria oracao" })]}
        open
        onOpenChange={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Buscar" }), {
      target: { value: "maria" }
    });

    expect(screen.getByText("Maria oracao")).toBeInTheDocument();
  });

  it("focuses the input when opened", async () => {
    vi.useFakeTimers();
    try {
      render(
        <CommandPalette snapshot={snapshot()} prayers={[]} open onOpenChange={vi.fn()} onNavigate={vi.fn()} />
      );
      vi.runAllTimers();
      const input = screen.getByRole("combobox", { name: "Buscar" });
      expect(document.activeElement).toBe(input);
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores focus to the previously focused trigger when closed", async () => {
    vi.useFakeTimers();
    try {
      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
              abrir
            </button>
            <CommandPalette
              snapshot={snapshot()}
              prayers={[]}
              open={open}
              onOpenChange={setOpen}
              onNavigate={vi.fn()}
            />
          </>
        );
      }
      render(<Harness />);
      const trigger = screen.getByTestId("trigger");
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
      fireEvent.click(trigger);
      vi.runAllTimers();
      expect(document.activeElement).not.toBe(trigger);
      const backdrop = document.querySelector(".command-palette-backdrop") as HTMLElement;
      fireEvent.click(backdrop);
      vi.runAllTimers();
      expect(document.activeElement).toBe(trigger);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sets aria-activedescendant on the input matching the active option", () => {
    render(
      <CommandPalette
        snapshot={snapshot({
          announcements: [makeAnnouncement({ title: "Aviso 1" })]
        })}
        prayers={[]}
        open
        onOpenChange={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    const input = screen.getByRole("combobox", { name: "Buscar" });
    const activeId = input.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    const option = document.getElementById(activeId!);
    expect(option).not.toBeNull();
    expect(option).toHaveAttribute("role", "option");
    expect(option).toHaveAttribute("aria-selected", "true");
  });

  it("clears aria-activedescendant when no results match", () => {
    render(
      <CommandPalette snapshot={snapshot()} prayers={[]} open onOpenChange={vi.fn()} onNavigate={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Buscar" }), {
      target: { value: "zzz-nada-mesmo" }
    });
    const input = screen.getByRole("combobox", { name: "Buscar" });
    expect(input.getAttribute("aria-activedescendant")).toBeNull();
  });
});
