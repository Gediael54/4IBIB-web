import {
  buildWhatsAppUrl,
  createId,
  formatDateLabel,
  formatInputDateTime,
  formatTimeRange,
  getPinnedAnnouncements,
  getUpcomingSchedule,
  inputDateTimeToIso,
  sortAnnouncements,
  sortSchedule,
  sortVolunteers,
  type Announcement,
  type ScheduleItem,
  type Volunteer
} from "./index";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

const announcements: Announcement[] = [
  {
    id: "old",
    title: "Old",
    summary: "Old summary",
    category: "geral",
    publishedAt: "2025-01-01T10:00:00.000Z",
    pinned: false,
    ctaLabel: "Open",
    ctaUrl: "#"
  },
  {
    id: "pinned",
    title: "Pinned",
    summary: "Pinned summary",
    category: "evento",
    publishedAt: "2025-01-02T10:00:00.000Z",
    pinned: true,
    ctaLabel: "Open",
    ctaUrl: "#"
  },
  {
    id: "new",
    title: "New",
    summary: "New summary",
    category: "oracao",
    publishedAt: "2025-01-03T10:00:00.000Z",
    pinned: false,
    ctaLabel: "Open",
    ctaUrl: "#"
  }
];

const schedule: ScheduleItem[] = [
  {
    id: "later",
    title: "Later",
    ministry: "A",
    startsAt: "2030-01-03T10:00:00.000Z",
    endsAt: "2030-01-03T12:00:00.000Z",
    location: "A",
    summary: "A",
    preacher: "A",
    director: "",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false
  },
  {
    id: "past",
    title: "Past",
    ministry: "B",
    startsAt: "2020-01-03T10:00:00.000Z",
    endsAt: "2020-01-03T12:00:00.000Z",
    location: "B",
    summary: "B",
    preacher: "B",
    director: "",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false
  },
  {
    id: "soon",
    title: "Soon",
    ministry: "C",
    startsAt: "2030-01-01T10:00:00.000Z",
    endsAt: "2030-01-01T12:00:00.000Z",
    location: "C",
    summary: "C",
    preacher: "C",
    director: "",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: true
  },
  {
    id: "suspended",
    title: "Suspended",
    ministry: "D",
    startsAt: "2030-01-02T10:00:00.000Z",
    endsAt: "2030-01-02T12:00:00.000Z",
    location: "D",
    summary: "D",
    preacher: "D",
    director: "",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "suspended",
    featured: false
  }
];

it("sorts announcements with pinned items first and newest after that", () => {
  expect(sortAnnouncements(announcements).map((item) => item.id)).toEqual(["pinned", "new", "old"]);
});

it("limits pinned announcement selection after sorting", () => {
  expect(getPinnedAnnouncements(announcements, 2).map((item) => item.id)).toEqual(["pinned", "new"]);
});

it("sorts schedule by start date and returns upcoming scheduled events", () => {
  expect(sortSchedule(schedule).map((item) => item.id)).toEqual(["past", "soon", "suspended", "later"]);
  expect(getUpcomingSchedule(schedule, 1).map((item) => item.id)).toEqual(["soon"]);
  expect(getUpcomingSchedule(schedule).map((item) => item.id)).toEqual(["soon", "later"]);
});

it("excludes free and suspended items from upcoming schedule", () => {
  const items: ScheduleItem[] = [
    { ...schedule[0], id: "free-future", status: "free" },
    { ...schedule[0], id: "suspended-future", status: "suspended" },
    { ...schedule[0], id: "scheduled-future", status: "scheduled" }
  ];

  const ids = getUpcomingSchedule(items).map((item) => item.id);
  expect(ids).toEqual(["scheduled-future"]);
});

it("returns empty results when given empty arrays", () => {
  expect(sortSchedule([])).toEqual([]);
  expect(getUpcomingSchedule([])).toEqual([]);
  expect(sortAnnouncements([])).toEqual([]);
  expect(getPinnedAnnouncements([])).toEqual([]);
});

it("preserves all schedule fields through sort", () => {
  const item: ScheduleItem = {
    id: "x",
    title: "Culto Solene",
    ministry: "Culto",
    startsAt: "2030-01-01T20:00:00.000Z",
    endsAt: "2030-01-01T22:00:00.000Z",
    location: "Templo principal",
    summary: "Resumo",
    preacher: "Pr. Augusto",
    director: "Diac. Ana",
    soundTeam: "Miguel, Brainer",
    passage: "Marcos 1",
    occasionLabel: "PASCOA",
    status: "scheduled",
    featured: true
  };

  const [result] = sortSchedule([item]);
  expect(result).toEqual(item);
  expect(result?.soundTeam).toBe("Miguel, Brainer");
});

it("sorts volunteers by sortOrder then alphabetical name", () => {
  const items: Volunteer[] = [
    { id: "c", name: "Carla", role: "geral", sortOrder: 1 },
    { id: "a", name: "Ana", role: "geral", sortOrder: 1 },
    { id: "b", name: "Bruno", role: "som", sortOrder: 0 }
  ];

  expect(sortVolunteers(items).map((item) => item.id)).toEqual(["b", "a", "c"]);
});

it("returns empty array when sorting no volunteers", () => {
  expect(sortVolunteers([])).toEqual([]);
});

it("formats date and time labels for Brazilian Portuguese", () => {
  expect(formatDateLabel("2030-01-01T10:00:00.000Z")).toContain("01");
  expect(formatTimeRange("2030-01-01T10:00:00.000Z", "2030-01-01T12:00:00.000Z")).toContain(" - ");
});

it("converts date-time input values", () => {
  const iso = inputDateTimeToIso("2030-01-01T10:30");

  expect(iso).toBe(new Date("2030-01-01T10:30").toISOString());
  expect(formatInputDateTime(iso)).toMatch(/^2030-01-01T/);
});

it("builds whatsapp links with encoded messages", () => {
  expect(buildWhatsAppUrl("559599999999", "Ola igreja")).toBe("https://wa.me/559599999999?text=Ola%20igreja");
});

it("creates ids with the requested prefix", () => {
  expect(createId("item")).toMatch(/^item-/);
});

it("creates ids when randomUUID is unavailable", () => {
  vi.stubGlobal("crypto", {});

  expect(createId("fallback")).toMatch(/^fallback-/);
});
