import "@testing-library/jest-dom/vitest";
import type { Announcement, PrayerRequest, ScheduleItem, SiteSnapshot, Volunteer } from "@4ibib/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardView from "./DashboardView";

function emptySnapshot(overrides: Partial<SiteSnapshot> = {}): SiteSnapshot {
  return {
    announcements: [],
    schedule: [],
    volunteers: [],
    profile: null,
    ministries: [],
    recurringMeetings: [],
    commemorations: [],

    rotationRules: [],
    ...overrides
  };
}

function makeSchedule(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: overrides.id ?? "s1",
    title: "Culto solene",
    ministry: "Louvor",
    startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
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

function makePrayer(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: overrides.id ?? "p1",
    name: "Anonimo",
    contact: "",
    message: "Pedido",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "novo",
    pastoralNotes: "",
    assignedTo: null,
    seenAt: null,
    ...overrides
  };
}

function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: overrides.id ?? "a1",
    title: "Aviso",
    summary: "Resumo",
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

describe("DashboardView", () => {
  afterEach(() => cleanup());

  it("renders default empty cards when there is nothing pending", () => {
    render(<DashboardView snapshot={emptySnapshot()} prayers={[]} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Pedidos de oracao novos")).toBeInTheDocument();
    expect(screen.getByText("Cultos solenes sem pregador")).toBeInTheDocument();
    expect(screen.getByText("Cultos solenes sem dirigente")).toBeInTheDocument();
    expect(screen.getByText("Avisos fixados desatualizados")).toBeInTheDocument();
    expect(screen.getByText("Voluntario mais escalado (30 dias)")).toBeInTheDocument();
    expect(screen.getAllByText("OK, nada pendente.").length).toBeGreaterThan(0);
  });

  it("counts new prayer requests older than 24h that have not been seen", () => {
    const old = makePrayer({ id: "p-old" });
    const recent = makePrayer({
      id: "p-recent",
      createdAt: new Date().toISOString()
    });
    const seen = makePrayer({
      id: "p-seen",
      seenAt: new Date().toISOString()
    });

    render(<DashboardView snapshot={emptySnapshot()} prayers={[old, recent, seen]} />);

    const card = screen.getByText("Pedidos de oracao novos").closest(".dashboard-card");
    expect(card?.querySelector(".dashboard-card-count")?.textContent).toBe("1");
  });

  it("counts cultos solenes sem pregador in the next 7 days", () => {
    const missingPreacher = makeSchedule({ id: "missing", title: "Culto solene" });
    const withPreacher = makeSchedule({ id: "with", title: "Culto solene", preacher: "Pastor" });
    const farAway = makeSchedule({
      id: "far",
      title: "Culto solene",
      startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    render(
      <DashboardView
        snapshot={emptySnapshot({ schedule: [missingPreacher, withPreacher, farAway] })}
        prayers={[]}
      />
    );

    const card = screen.getByText("Cultos solenes sem pregador").closest(".dashboard-card");
    expect(card?.querySelector(".dashboard-card-count")?.textContent).toBe("1");
  });

  it("counts stale pinned announcements", () => {
    const expired = makeAnnouncement({
      id: "exp",
      pinned: true,
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    });
    const archived = makeAnnouncement({ id: "arc", pinned: true, status: "archived" });
    const ok = makeAnnouncement({ id: "ok", pinned: true });

    render(
      <DashboardView snapshot={emptySnapshot({ announcements: [expired, archived, ok] })} prayers={[]} />
    );

    const card = screen.getByText("Avisos fixados desatualizados").closest(".dashboard-card");
    expect(card?.querySelector(".dashboard-card-count")?.textContent).toBe("2");
  });

  it("shows top volunteer card when there are upcoming assignments", () => {
    const item1 = makeSchedule({ id: "1", preacher: "Pastor Joao" });
    const item2 = makeSchedule({ id: "2", preacher: "Pastor Joao" });

    render(<DashboardView snapshot={emptySnapshot({ schedule: [item1, item2] })} prayers={[]} />);

    expect(screen.getByText(/Pastor Joao aparece em 2 escalas/)).toBeInTheDocument();
  });

  it("renders totals footer with snapshot counts", () => {
    const volunteer: Volunteer = {
      id: "v",
      name: "Voluntario",
      role: "geral",
      sortOrder: 0,
      contact: "",
      photoUrl: "",
      ministries: [],
      unavailableDates: [],
      notes: ""
    };
    render(
      <DashboardView
        snapshot={emptySnapshot({
          announcements: [makeAnnouncement()],
          schedule: [makeSchedule()],
          volunteers: [volunteer],
          ministries: [
            {
              id: "m",
              slug: "louvor",
              name: "Louvor",
              summary: "",
              meetingTime: "",
              contact: "",
              color: "#000000",
              sortOrder: 0
            }
          ]
        })}
        prayers={[makePrayer()]}
      />
    );

    expect(screen.getByText("1 avisos")).toBeInTheDocument();
    expect(screen.getByText("1 eventos")).toBeInTheDocument();
    expect(screen.getByText("1 voluntarios")).toBeInTheDocument();
    expect(screen.getByText("1 pedidos de oracao")).toBeInTheDocument();
    expect(screen.getByText("1 ministerios")).toBeInTheDocument();
  });

  it("invokes onNavigate when CTA buttons are clicked", () => {
    const onNavigate = vi.fn();
    const missing = makeSchedule({ id: "missing", title: "Culto solene" });
    const expired = makeAnnouncement({
      id: "exp",
      pinned: true,
      status: "archived"
    });

    render(
      <DashboardView
        snapshot={emptySnapshot({ schedule: [missing], announcements: [expired] })}
        prayers={[makePrayer()]}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver pedidos novos" }));
    expect(onNavigate).toHaveBeenCalledWith("prayers");

    fireEvent.click(screen.getAllByRole("button", { name: "Editar programacao" })[0]);
    expect(onNavigate).toHaveBeenCalledWith("schedule");

    fireEvent.click(screen.getByRole("button", { name: "Ver avisos" }));
    expect(onNavigate).toHaveBeenCalledWith("announcements");
  });
});
