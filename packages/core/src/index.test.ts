import {
  buildWhatsAppForContact,
  buildWhatsAppUrl,
  createId,
  formatDateLabel,
  formatDateOnly,
  formatDateTime,
  formatInputDateTime,
  formatTimeRange,
  getPinnedAnnouncements,
  getScheduleInRange,
  getUpcomingSchedule,
  getVisibleAnnouncements,
  inputDateTimeToIso,
  isAnnouncementVisible,
  sortAdmins,
  sortAnnouncements,
  sortAuditLog,
  sortMinistries,
  sortRecurringMeetings,
  sortSchedule,
  sortVolunteers,
  splitNames,
  type AdminUser,
  type Announcement,
  type AuditLogEntry,
  type MinistryRecord,
  type RecurringMeetingRecord,
  type ScheduleItem,
  type Volunteer
} from "./index";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: "a",
    title: "Title",
    summary: "Summary",
    category: "geral",
    publishedAt: "2025-01-01T10:00:00.000Z",
    pinned: false,
    ctaLabel: "",
    ctaUrl: "",
    status: "published",
    expiresAt: null,
    imageUrl: "",
    ...overrides
  };
}

const announcements: Announcement[] = [
  makeAnnouncement({ id: "old", title: "Old", publishedAt: "2025-01-01T10:00:00.000Z" }),
  makeAnnouncement({
    id: "pinned",
    title: "Pinned",
    category: "evento",
    publishedAt: "2025-01-02T10:00:00.000Z",
    pinned: true
  }),
  makeAnnouncement({
    id: "new",
    title: "New",
    category: "oracao",
    publishedAt: "2025-01-03T10:00:00.000Z"
  })
];

function makeSchedule(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "x",
    title: "Item",
    ministry: "A",
    startsAt: "2030-01-01T10:00:00.000Z",
    endsAt: "2030-01-01T12:00:00.000Z",
    location: "A",
    summary: "A",
    preacher: "A",
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

const schedule: ScheduleItem[] = [
  makeSchedule({ id: "later", startsAt: "2030-01-03T10:00:00.000Z", endsAt: "2030-01-03T12:00:00.000Z" }),
  makeSchedule({
    id: "past",
    ministry: "B",
    startsAt: "2020-01-03T10:00:00.000Z",
    endsAt: "2020-01-03T12:00:00.000Z",
    location: "B",
    summary: "B",
    preacher: "B"
  }),
  makeSchedule({
    id: "soon",
    ministry: "C",
    startsAt: "2030-01-01T10:00:00.000Z",
    endsAt: "2030-01-01T12:00:00.000Z",
    location: "C",
    summary: "C",
    preacher: "C",
    featured: true
  }),
  makeSchedule({
    id: "suspended",
    ministry: "D",
    startsAt: "2030-01-02T10:00:00.000Z",
    endsAt: "2030-01-02T12:00:00.000Z",
    location: "D",
    summary: "D",
    preacher: "D",
    status: "suspended"
  })
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

it("keeps an event in upcoming while it is currently happening", () => {
  const now = new Date("2030-01-01T11:00:00.000Z");
  vi.setSystemTime(now);
  const items: ScheduleItem[] = [
    makeSchedule({
      id: "ongoing",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z"
    }),
    makeSchedule({
      id: "next-day",
      startsAt: "2030-01-02T10:00:00.000Z",
      endsAt: "2030-01-02T12:00:00.000Z"
    })
  ];
  expect(getUpcomingSchedule(items).map((entry) => entry.id)).toEqual(["ongoing", "next-day"]);
  vi.setSystemTime(new Date("2030-01-01T12:00:01.000Z"));
  expect(getUpcomingSchedule(items).map((entry) => entry.id)).toEqual(["next-day"]);
  vi.useRealTimers();
});

it("excludes free and suspended items from upcoming schedule", () => {
  const items: ScheduleItem[] = [
    makeSchedule({ id: "free-future", status: "free" }),
    makeSchedule({ id: "suspended-future", status: "suspended" }),
    makeSchedule({ id: "scheduled-future", status: "scheduled" })
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
  const item = makeSchedule({
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
    featured: true,
    seriesId: "serie-louvor",
    youtubeUrl: "https://youtu.be/abc123"
  });

  const [result] = sortSchedule([item]);
  expect(result).toEqual(item);
  expect(result?.soundTeam).toBe("Miguel, Brainer");
  expect(result?.seriesId).toBe("serie-louvor");
  expect(result?.youtubeUrl).toBe("https://youtu.be/abc123");
});

it("treats unpublished or future-dated announcements as not visible", () => {
  const now = new Date("2025-06-01T00:00:00.000Z");
  expect(isAnnouncementVisible(makeAnnouncement({ status: "draft" }), now)).toBe(false);
  expect(isAnnouncementVisible(makeAnnouncement({ status: "scheduled" }), now)).toBe(false);
  expect(isAnnouncementVisible(makeAnnouncement({ status: "archived" }), now)).toBe(false);
  expect(
    isAnnouncementVisible(
      makeAnnouncement({ status: "published", publishedAt: "2025-12-31T00:00:00.000Z" }),
      now
    )
  ).toBe(false);
  expect(
    isAnnouncementVisible(
      makeAnnouncement({ status: "published", expiresAt: "2025-05-31T00:00:00.000Z" }),
      now
    )
  ).toBe(false);
  expect(
    isAnnouncementVisible(
      makeAnnouncement({ status: "published", expiresAt: "2025-12-31T00:00:00.000Z" }),
      now
    )
  ).toBe(true);
});

it("falls back to current time when isAnnouncementVisible has no explicit now", () => {
  const future = makeAnnouncement({
    status: "published",
    publishedAt: new Date(Date.now() - 1000).toISOString()
  });
  expect(isAnnouncementVisible(future)).toBe(true);
});

it("returns visible announcements sorted with pinned first", () => {
  const now = new Date("2025-06-01T00:00:00.000Z");
  const items: Announcement[] = [
    makeAnnouncement({ id: "a", publishedAt: "2025-01-01T00:00:00.000Z" }),
    makeAnnouncement({ id: "b", publishedAt: "2025-02-01T00:00:00.000Z", pinned: true }),
    makeAnnouncement({ id: "draft", status: "draft" }),
    makeAnnouncement({ id: "expired", expiresAt: "2025-04-01T00:00:00.000Z" })
  ];
  expect(getVisibleAnnouncements(items, now, 2).map((item) => item.id)).toEqual(["b", "a"]);
});

it("uses default now when getVisibleAnnouncements omits it", () => {
  const items = [makeAnnouncement({ id: "live", publishedAt: new Date(Date.now() - 1000).toISOString() })];
  expect(getVisibleAnnouncements(items).map((item) => item.id)).toEqual(["live"]);
});

it("sorts volunteers by sortOrder then alphabetical name", () => {
  const items: Volunteer[] = [
    {
      id: "c",
      name: "Carla",
      role: "geral",
      sortOrder: 1,
      contact: "",
      photoUrl: "",
      ministries: [],
      unavailableDates: [],
      notes: ""
    },
    {
      id: "a",
      name: "Ana",
      role: "geral",
      sortOrder: 1,
      contact: "",
      photoUrl: "",
      ministries: [],
      unavailableDates: [],
      notes: ""
    },
    {
      id: "b",
      name: "Bruno",
      role: "som",
      sortOrder: 0,
      contact: "",
      photoUrl: "",
      ministries: [],
      unavailableDates: [],
      notes: ""
    }
  ];

  expect(sortVolunteers(items).map((item) => item.id)).toEqual(["b", "a", "c"]);
});

it("returns empty array when sorting no volunteers", () => {
  expect(sortVolunteers([])).toEqual([]);
});

it("sorts ministries by sortOrder then name", () => {
  const items: MinistryRecord[] = [
    {
      id: "1",
      slug: "z",
      name: "Zelo",
      summary: "",
      meetingTime: "",
      contact: "",
      color: "#000",
      sortOrder: 1
    },
    {
      id: "2",
      slug: "a",
      name: "Acolhida",
      summary: "",
      meetingTime: "",
      contact: "",
      color: "#000",
      sortOrder: 1
    },
    {
      id: "3",
      slug: "m",
      name: "Musica",
      summary: "",
      meetingTime: "",
      contact: "",
      color: "#000",
      sortOrder: 0
    }
  ];
  expect(sortMinistries(items).map((item) => item.id)).toEqual(["3", "2", "1"]);
  expect(sortMinistries([])).toEqual([]);
});

it("sorts recurring meetings by sortOrder then weekday then time", () => {
  const items: RecurringMeetingRecord[] = [
    { id: "a", title: "A", weekday: 4, startsAt: "20:00", endsAt: "21:00", description: "", sortOrder: 1 },
    { id: "b", title: "B", weekday: 0, startsAt: "10:00", endsAt: "11:00", description: "", sortOrder: 1 },
    { id: "c", title: "C", weekday: 0, startsAt: "09:00", endsAt: "10:00", description: "", sortOrder: 1 },
    { id: "d", title: "D", weekday: 4, startsAt: "19:30", endsAt: "21:00", description: "", sortOrder: 0 }
  ];
  expect(sortRecurringMeetings(items).map((item) => item.id)).toEqual(["d", "c", "b", "a"]);
  expect(sortRecurringMeetings([])).toEqual([]);
});

it("sorts audit log by changedAt descending", () => {
  const items: AuditLogEntry[] = [
    {
      id: "old",
      tableName: "schedule_items",
      rowId: "1",
      action: "INSERT",
      changedBy: null,
      changedAt: "2025-01-01T10:00:00.000Z",
      oldRow: null,
      newRow: {}
    },
    {
      id: "new",
      tableName: "schedule_items",
      rowId: "1",
      action: "UPDATE",
      changedBy: null,
      changedAt: "2025-02-01T10:00:00.000Z",
      oldRow: {},
      newRow: {}
    }
  ];
  expect(sortAuditLog(items).map((item) => item.id)).toEqual(["new", "old"]);
});

it("sorts admins with owners first then alphabetically by email", () => {
  const items: AdminUser[] = [
    {
      userId: "1",
      email: "b@x.com",
      displayName: "B",
      role: "editor",
      createdAt: "2025-01-01T00:00:00.000Z"
    },
    { userId: "2", email: "a@x.com", displayName: "A", role: "owner", createdAt: "2025-01-02T00:00:00.000Z" },
    { userId: "3", email: "c@x.com", displayName: "C", role: "owner", createdAt: "2025-01-03T00:00:00.000Z" },
    { userId: "4", email: "a@y.com", displayName: "A", role: "editor", createdAt: "2025-01-04T00:00:00.000Z" }
  ];
  expect(sortAdmins(items).map((item) => item.userId)).toEqual(["2", "3", "4", "1"]);
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

it("preserves Brazil country code already present on whatsapp links", () => {
  expect(buildWhatsAppUrl("559599999999", "Ola igreja")).toBe("https://wa.me/559599999999?text=Ola%20igreja");
});

it("prefixes Brazilian country code when missing on whatsapp links", () => {
  expect(buildWhatsAppUrl("81993260372", "Ola")).toBe("https://wa.me/5581993260372?text=Ola");
  expect(buildWhatsAppUrl("+55 81 98122-0651", "x")).toBe("https://wa.me/5581981220651?text=x");
});

it("strips non-digits and forces Brazil country code from contact", () => {
  expect(buildWhatsAppForContact("(81) 98122-0651", "msg")).toBe("https://wa.me/5581981220651?text=msg");
});

it("returns null when contact has fewer than 10 digits", () => {
  expect(buildWhatsAppForContact("123", "msg")).toBeNull();
  expect(buildWhatsAppForContact("", "msg")).toBeNull();
});

it("formats full date and time labels", () => {
  expect(formatDateTime("2030-01-01T10:30:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
});

it("formats date-only labels and rejects invalid input", () => {
  expect(formatDateOnly("2030-01-01T10:30:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  expect(formatDateOnly("")).toBeNull();
  expect(formatDateOnly("not-a-date")).toBeNull();
});

it("splits comma-separated names and ignores empty entries", () => {
  expect(splitNames("Ana, Bruno , , Carla")).toEqual(["Ana", "Bruno", "Carla"]);
  expect(splitNames("")).toEqual([]);
  expect(splitNames(null)).toEqual([]);
  expect(splitNames(undefined)).toEqual([]);
});

it("filters schedule items inside a date range and only scheduled status", () => {
  const items: ScheduleItem[] = [
    makeSchedule({ id: "before", startsAt: "2030-01-01T10:00:00.000Z" }),
    makeSchedule({ id: "in", startsAt: "2030-02-01T10:00:00.000Z" }),
    makeSchedule({ id: "after", startsAt: "2030-03-01T10:00:00.000Z" }),
    makeSchedule({ id: "suspended", startsAt: "2030-02-01T10:00:00.000Z", status: "suspended" })
  ];
  const from = Date.parse("2030-01-15T00:00:00.000Z");
  const to = Date.parse("2030-02-15T00:00:00.000Z");
  expect(getScheduleInRange(items, from, to).map((item) => item.id)).toEqual(["in"]);
});

it("creates ids with the requested prefix", () => {
  expect(createId("item")).toMatch(/^item-/);
});

it("creates ids when randomUUID is unavailable", () => {
  vi.stubGlobal("crypto", {});

  expect(createId("fallback")).toMatch(/^fallback-/);
});
