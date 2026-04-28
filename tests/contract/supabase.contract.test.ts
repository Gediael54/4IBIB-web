import { describe, expect, it } from "vitest";
import { createSupabaseBackend } from "@4ibib/supabase";

const url = process.env.VITE_SUPABASE_URL ?? "";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const skip = !url || !key;

const isoString = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);

describe.skipIf(skip)("supabase contract", () => {
  const backend = createSupabaseBackend({ url, anonKey: key });

  it("getProfile returns the singleton with required string fields and meetings array", async () => {
    const profile = await backend.content.getProfile();

    expect(profile.id).toBe("main");
    expect(profile).toMatchObject({
      name: expect.any(String),
      shortName: expect.any(String),
      tagline: expect.any(String),
      city: expect.any(String),
      pastorName: expect.any(String),
      address: expect.any(String),
      email: expect.any(String),
      whatsapp: expect.any(String),
      instagramUrl: expect.any(String),
      youtubeUrl: expect.any(String),
      mapsUrl: expect.any(String),
      heroVerse: expect.any(String),
      mission: expect.any(String),
      foundedText: expect.any(String),
      updatedAt: isoString
    });
    expect(Array.isArray(profile.regularMeetings)).toBe(true);
    for (const meeting of profile.regularMeetings) {
      expect(meeting).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        weekday: expect.any(String),
        time: expect.any(String),
        startsAt: expect.any(String),
        endsAt: expect.any(String),
        sortOrder: expect.any(Number)
      });
    }
  });

  it("listSchedule returns rows with the new schedule columns mapped", async () => {
    const schedule = await backend.content.listSchedule();

    expect(schedule.length).toBeGreaterThan(0);

    const first = schedule[0]!;
    expect(first).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      ministryId: expect.any(String),
      ministry: expect.any(String),
      startsAt: isoString,
      endsAt: isoString,
      location: expect.any(String),
      summary: expect.any(String),
      preacher: expect.any(String),
      director: expect.any(String),
      passage: expect.any(String),
      occasionLabel: expect.any(String),
      featured: expect.any(Boolean)
    });
    expect(["scheduled", "suspended", "free"]).toContain(first.status);
  });

  it("listSchedule yields at least one entry for each status the seed produces", async () => {
    const schedule = await backend.content.listSchedule();
    const statuses = new Set(schedule.map((item) => item.status));

    expect(statuses.has("scheduled")).toBe(true);
  });

  it("listAnnouncements and listMinistries return arrays even when empty", async () => {
    const [announcements, ministries] = await Promise.all([
      backend.content.listAnnouncements(),
      backend.content.listMinistries()
    ]);

    expect(Array.isArray(announcements)).toBe(true);
    expect(Array.isArray(ministries)).toBe(true);
  });

  it("schedule ministry ids resolve to known ministries", async () => {
    const [schedule, ministries] = await Promise.all([
      backend.content.listSchedule(),
      backend.content.listMinistries()
    ]);
    const ministryIds = new Set(ministries.map((item) => item.id));

    for (const item of schedule) {
      expect(ministryIds.has(item.ministryId ?? "")).toBe(true);
    }
  });

  it("getSnapshot composes profile + content lists in a single call", async () => {
    const snapshot = await backend.content.getSnapshot();

    expect(snapshot.profile.id).toBe("main");
    expect(Array.isArray(snapshot.announcements)).toBe(true);
    expect(Array.isArray(snapshot.ministries)).toBe(true);
    expect(Array.isArray(snapshot.schedule)).toBe(true);
  });
});
