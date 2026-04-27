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
  sortMinistries,
  sortSchedule,
  type Announcement,
  type Ministry,
  type ScheduleItem
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
    passage: "",
    specialDate: "",
    googleEventId: "",
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
    passage: "",
    specialDate: "",
    googleEventId: "",
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
    passage: "",
    specialDate: "",
    googleEventId: "",
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
    passage: "",
    specialDate: "",
    googleEventId: "",
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

it("sorts ministries alphabetically in pt-BR order", () => {
  const ministries: Ministry[] = [
    { id: "2", name: "Zeladoria", summary: "", meetingTime: "", contact: "", color: "#000" },
    { id: "1", name: "Acao Social", summary: "", meetingTime: "", contact: "", color: "#000" }
  ];

  expect(sortMinistries(ministries).map((item) => item.id)).toEqual(["1", "2"]);
});

it("sorts schedule by start date and returns upcoming scheduled events", () => {
  expect(sortSchedule(schedule).map((item) => item.id)).toEqual(["past", "soon", "suspended", "later"]);
  expect(getUpcomingSchedule(schedule, 1).map((item) => item.id)).toEqual(["soon"]);
  expect(getUpcomingSchedule(schedule).map((item) => item.id)).toEqual(["soon", "later"]);
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
  expect(buildWhatsAppUrl("559599999999", "Ola igreja")).toBe(
    "https://wa.me/559599999999?text=Ola%20igreja"
  );
});

it("creates ids with the requested prefix", () => {
  expect(createId("item")).toMatch(/^item-/);
});

it("creates ids when randomUUID is unavailable", () => {
  vi.stubGlobal("crypto", {});

  expect(createId("fallback")).toMatch(/^fallback-/);
});
