import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChurchProfile, PrayerRequest } from "@4ibib/core";

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args)
}));

import { createSupabaseBackend } from "./index";

type Result<T = unknown> = { data: T | null; error: { message: string } | null };

function makeQuery(result: Result) {
  const builder: Record<string, unknown> = {};

  Object.assign(builder, {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    order: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: Result) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject)
  });

  return builder;
}

interface FakeClient {
  from: ReturnType<typeof vi.fn>;
  queries: ReturnType<typeof makeQuery>[];
  setNext: (result: Result) => void;
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
  authSubscriptionUnsubscribe: ReturnType<typeof vi.fn>;
}

function createFakeClient(): FakeClient {
  const queue: Result[] = [];
  const queries: ReturnType<typeof makeQuery>[] = [];

  const from = vi.fn(() => {
    const result = queue.shift() ?? { data: null, error: null };
    const query = makeQuery(result);
    queries.push(query);
    return query;
  });

  const unsubscribe = vi.fn();

  const auth = {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
      auth._lastCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    })
  } as FakeClient["auth"] & { _lastCallback?: (event: string, session: unknown) => void };

  return {
    from,
    queries,
    setNext: (result) => {
      queue.push(result);
    },
    auth,
    authSubscriptionUnsubscribe: unsubscribe
  };
}

let client: FakeClient;

const profileRow = {
  id: "main",
  name: "Igreja",
  short_name: "Igreja",
  tagline: "tag",
  city: "Cidade",
  pastor_name: "Pastor",
  address: "Rua",
  email: "ig@ex.com",
  whatsapp: "5599",
  instagram_url: "https://i",
  youtube_url: "https://y",
  maps_url: "https://m",
  hero_verse: "verso",
  mission: "missao",
  founded_text: "fundada",
  regular_meetings: [
    { id: "legacy-rm1", title: "Culto", weekday: "Domingo", time: "10h", description: "culto" }
  ],
  updated_at: "2030-01-01T00:00:00.000Z"
};

const recurringMeetingRow = {
  id: "rm1",
  profile_id: "main",
  title: "Culto",
  weekday: "Domingo",
  starts_at: "10:00:00",
  ends_at: "11:00:00",
  description: "culto",
  sort_order: 0
};

const profile: ChurchProfile = {
  id: "main",
  name: "Igreja",
  shortName: "Igreja",
  tagline: "tag",
  city: "Cidade",
  pastorName: "Pastor",
  address: "Rua",
  email: "ig@ex.com",
  whatsapp: "5599",
  instagramUrl: "https://i",
  youtubeUrl: "https://y",
  mapsUrl: "https://m",
  heroVerse: "verso",
  mission: "missao",
  foundedText: "fundada",
  regularMeetings: [
    {
      id: "rm1",
      title: "Culto",
      weekday: "Domingo",
      time: "10:00 - 11:00",
      startsAt: "10:00",
      endsAt: "11:00",
      description: "culto",
      sortOrder: 0
    }
  ],
  updatedAt: "2030-01-01T00:00:00.000Z"
};

const announcementRow = {
  id: "a1",
  title: "Aviso",
  summary: "Resumo",
  category: "geral",
  published_at: "2030-01-01T10:00:00.000Z",
  pinned: true,
  cta_label: null,
  cta_url: null
};

const ministryRow = {
  id: "m1",
  name: "Louvor",
  summary: "Equipe",
  meeting_time: "Sabado",
  contact: "Lider",
  color: "#fff"
};

const scheduleRow = {
  id: "s1",
  title: "Reuniao",
  ministry_id: "m1",
  ministries: { name: "Louvor" },
  starts_at: "2030-01-01T10:00:00.000Z",
  ends_at: "2030-01-01T12:00:00.000Z",
  location: "Salao",
  summary: "Resumo",
  preacher: "Lider",
  director: "",
  passage: "",
  occasion_label: "",
  google_event_id: "",
  status: "scheduled",
  featured: true
};

const prayerRow = {
  id: "p1",
  name: "Maria",
  contact: null,
  message: "Oracao",
  created_at: "2030-01-01T10:00:00.000Z",
  status: "novo"
};

beforeEach(() => {
  client = createFakeClient();
  createClientMock.mockReset();
  createClientMock.mockReturnValue(client);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("createSupabaseBackend", () => {
  it("requires url", () => {
    expect(() => createSupabaseBackend({ url: "", anonKey: "k" })).toThrow(
      "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorios."
    );
  });

  it("requires anonKey", () => {
    expect(() => createSupabaseBackend({ url: "https://x", anonKey: "" })).toThrow(
      "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorios."
    );
  });

  it("returns a backend with mode supabase", () => {
    const backend = createSupabaseBackend({ url: "https://x", anonKey: "k" });
    expect(backend.mode).toBe("supabase");
    expect(createClientMock).toHaveBeenCalledWith("https://x", "k");
  });
});

describe("SupabaseContentRepository", () => {
  function backend() {
    return createSupabaseBackend({ url: "https://x", anonKey: "k" });
  }

  it("gets full snapshot", async () => {
    client.setNext({ data: profileRow, error: null });
    client.setNext({ data: [announcementRow], error: null });
    client.setNext({ data: [ministryRow], error: null });
    client.setNext({ data: [scheduleRow], error: null });
    client.setNext({ data: [recurringMeetingRow], error: null });

    const snapshot = await backend().content.getSnapshot();

    expect(snapshot.profile.id).toBe("main");
    expect(snapshot.announcements[0]?.id).toBe("a1");
    expect(snapshot.ministries[0]?.id).toBe("m1");
    expect(snapshot.schedule[0]?.id).toBe("s1");
  });

  it("maps profile with empty recurring meetings when none are stored", async () => {
    client.setNext({ data: { ...profileRow, regular_meetings: null }, error: null });
    client.setNext({ data: [], error: null });
    const result = await backend().content.getProfile();
    expect(result.regularMeetings).toEqual([]);
  });

  it("falls back to legacy regular meetings when recurring rows are unavailable", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000201");
    client.setNext({
      data: {
        ...profileRow,
        regular_meetings: [
          { title: "Sem horario", weekday: "Segunda", time: "", description: null },
          { id: "legacy-rm2", title: "Culto", weekday: "Domingo", time: "9h30 as 11h", description: "culto" },
          { id: "legacy-rm3" }
        ]
      },
      error: null
    });
    client.setNext({ data: null, error: null });

    const result = await backend().content.getProfile();

    expect(result.regularMeetings).toEqual([
      {
        id: "00000000-0000-4000-8000-000000000201",
        title: "Sem horario",
        weekday: "Segunda",
        startsAt: "00:00",
        endsAt: "01:00",
        time: "00:00 - 01:00",
        description: "",
        sortOrder: 0
      },
      {
        id: "legacy-rm2",
        title: "Culto",
        weekday: "Domingo",
        startsAt: "09:30",
        endsAt: "11:00",
        time: "9h30 as 11h",
        description: "culto",
        sortOrder: 1
      },
      {
        id: "legacy-rm3",
        title: "",
        weekday: "",
        startsAt: "00:00",
        endsAt: "01:00",
        time: "00:00 - 01:00",
        description: "",
        sortOrder: 2
      }
    ]);
    uuid.mockRestore();
  });

  it("ignores malformed legacy regular meeting payloads", async () => {
    client.setNext({ data: { ...profileRow, regular_meetings: { title: "quebrado" } }, error: null });
    client.setNext({ data: null, error: null });

    const result = await backend().content.getProfile();

    expect(result.regularMeetings).toEqual([]);
  });

  it("maps incomplete recurring meeting times defensively", async () => {
    client.setNext({ data: profileRow, error: null });
    client.setNext({
      data: [
        {
          ...recurringMeetingRow,
          id: "rm-empty",
          starts_at: null,
          ends_at: null,
          description: null,
          sort_order: null
        },
        { ...recurringMeetingRow, id: "rm-open-ended", ends_at: null }
      ],
      error: null
    });

    const result = await backend().content.getProfile();

    expect(result.regularMeetings[0]).toMatchObject({
      id: "rm-empty",
      time: "",
      description: "",
      sortOrder: 0
    });
    expect(result.regularMeetings[1]).toMatchObject({ id: "rm-open-ended", time: "10:00" });
  });

  it("propagates supabase error on list recurring meetings", async () => {
    client.setNext({ data: profileRow, error: null });
    client.setNext({ data: null, error: { message: "meetings-fail" } });
    await expect(backend().content.getProfile()).rejects.toThrow("meetings-fail");
  });

  it("propagates supabase error on getProfile", async () => {
    client.setNext({ data: null, error: { message: "boom" } });
    await expect(backend().content.getProfile()).rejects.toThrow("boom");
  });

  it("throws when profile row is missing", async () => {
    client.setNext({ data: null, error: null });
    await expect(backend().content.getProfile()).rejects.toThrow("Registro nao encontrado no Supabase.");
  });

  it("updates profile", async () => {
    client.setNext({ data: profileRow, error: null });
    client.setNext({ data: null, error: null });
    client.setNext({ data: null, error: null });
    const result = await backend().content.updateProfile(profile);
    expect(result.id).toBe("main");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ short_name: "Igreja", updated_at: expect.any(String) })
    );
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ regular_meetings: expect.anything() })
    );
    expect(client.queries[1]?.delete).toHaveBeenCalled();
    expect(client.queries[1]?.eq).toHaveBeenCalledWith("profile_id", "main");
    expect(client.queries[2]?.insert).toHaveBeenCalledWith([
      expect.objectContaining({ profile_id: "main", starts_at: "10:00", ends_at: "11:00", sort_order: 0 })
    ]);
  });

  it("updates profile without recurring meetings", async () => {
    client.setNext({ data: profileRow, error: null });
    client.setNext({ data: null, error: null });

    const result = await backend().content.updateProfile({ ...profile, regularMeetings: [] });

    expect(result.regularMeetings).toEqual([]);
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it("updates profile normalizing recurring meetings without sort order", async () => {
    client.setNext({ data: profileRow, error: null });
    client.setNext({ data: null, error: null });
    client.setNext({ data: null, error: null });

    await backend().content.updateProfile({
      ...profile,
      regularMeetings: [
        {
          id: "rm-no-sort",
          title: "Culto",
          weekday: "Domingo",
          time: "",
          startsAt: "09:30",
          endsAt: "11:00",
          description: "culto"
        } as ChurchProfile["regularMeetings"][number]
      ]
    });

    expect(client.queries[2]?.insert).toHaveBeenCalledWith([
      expect.objectContaining({ id: "rm-no-sort", sort_order: 0 })
    ]);
  });

  it("propagates supabase error on updateProfile", async () => {
    client.setNext({ data: null, error: { message: "fail" } });
    await expect(backend().content.updateProfile(profile)).rejects.toThrow("fail");
  });

  it("propagates supabase error while replacing recurring meetings", async () => {
    client.setNext({ data: profileRow, error: null });
    client.setNext({ data: null, error: { message: "delete-meetings-fail" } });

    await expect(backend().content.updateProfile(profile)).rejects.toThrow("delete-meetings-fail");
  });

  it("propagates supabase error while inserting recurring meetings", async () => {
    client.setNext({ data: profileRow, error: null });
    client.setNext({ data: null, error: null });
    client.setNext({ data: null, error: { message: "insert-meetings-fail" } });

    await expect(backend().content.updateProfile(profile)).rejects.toThrow("insert-meetings-fail");
  });

  it("lists announcements with empty cta fallbacks", async () => {
    client.setNext({ data: [announcementRow], error: null });
    const items = await backend().content.listAnnouncements();
    expect(items[0]?.ctaLabel).toBe("");
    expect(items[0]?.ctaUrl).toBe("");
  });

  it("propagates supabase error on listAnnouncements", async () => {
    client.setNext({ data: null, error: { message: "list-error" } });
    await expect(backend().content.listAnnouncements()).rejects.toThrow("list-error");
  });

  it("saves announcement preserving id when provided", async () => {
    client.setNext({ data: announcementRow, error: null });
    const result = await backend().content.saveAnnouncement({
      id: "a1",
      title: "Aviso",
      summary: "Resumo",
      category: "geral",
      publishedAt: "2030-01-01T10:00:00.000Z",
      pinned: true,
      ctaLabel: "ir",
      ctaUrl: "https://x"
    });
    expect(result.id).toBe("a1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  it("saves announcement generating id when missing", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("uuid-1-2-3-4-5");
    client.setNext({ data: { ...announcementRow, id: "uuid-1-2-3-4-5" }, error: null });

    await backend().content.saveAnnouncement({
      title: "Aviso",
      summary: "Resumo",
      category: "geral",
      publishedAt: "2030-01-01T10:00:00.000Z",
      pinned: false,
      ctaLabel: "",
      ctaUrl: ""
    });

    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "uuid-1-2-3-4-5" }));
    uuid.mockRestore();
  });

  it("propagates supabase error on saveAnnouncement", async () => {
    client.setNext({ data: null, error: { message: "save-fail" } });
    await expect(
      backend().content.saveAnnouncement({
        title: "x",
        summary: "y",
        category: "geral",
        publishedAt: "2030-01-01T10:00:00.000Z",
        pinned: false,
        ctaLabel: "",
        ctaUrl: ""
      })
    ).rejects.toThrow("save-fail");
  });

  it("deletes announcement", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.deleteAnnouncement("a1");
    expect(client.queries[0]?.delete).toHaveBeenCalled();
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "a1");
  });

  it("propagates supabase error on deleteAnnouncement", async () => {
    client.setNext({ data: null, error: { message: "del-fail" } });
    await expect(backend().content.deleteAnnouncement("a1")).rejects.toThrow("del-fail");
  });

  it("lists ministries", async () => {
    client.setNext({ data: [ministryRow], error: null });
    const items = await backend().content.listMinistries();
    expect(items[0]?.name).toBe("Louvor");
  });

  it("propagates supabase error on listMinistries", async () => {
    client.setNext({ data: null, error: { message: "min-list" } });
    await expect(backend().content.listMinistries()).rejects.toThrow("min-list");
  });

  it("saves ministry with provided id", async () => {
    client.setNext({ data: ministryRow, error: null });
    const result = await backend().content.saveMinistry({
      id: "m1",
      name: "Louvor",
      summary: "Equipe",
      meetingTime: "Sabado",
      contact: "Lider",
      color: "#fff"
    });
    expect(result.id).toBe("m1");
  });

  it("saves ministry generating id when missing", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("min-uuid-2-3-4");
    client.setNext({ data: { ...ministryRow, id: "min-uuid-2-3-4" }, error: null });
    await backend().content.saveMinistry({
      name: "Louvor",
      summary: "Equipe",
      meetingTime: "Sabado",
      contact: "Lider",
      color: "#fff"
    });
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "min-uuid-2-3-4" }));
    uuid.mockRestore();
  });

  it("propagates supabase error on saveMinistry", async () => {
    client.setNext({ data: null, error: { message: "min-save" } });
    await expect(
      backend().content.saveMinistry({
        name: "x",
        summary: "y",
        meetingTime: "",
        contact: "",
        color: "#000"
      })
    ).rejects.toThrow("min-save");
  });

  it("deletes ministry", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.deleteMinistry("m1");
    expect(client.queries[0]?.delete).toHaveBeenCalled();
  });

  it("propagates supabase error on deleteMinistry", async () => {
    client.setNext({ data: null, error: { message: "min-del" } });
    await expect(backend().content.deleteMinistry("m1")).rejects.toThrow("min-del");
  });

  it("lists schedule", async () => {
    client.setNext({ data: [scheduleRow], error: null });
    const items = await backend().content.listSchedule();
    expect(items[0]?.title).toBe("Reuniao");
  });

  it("maps every extended schedule column from supabase row", async () => {
    const row = {
      ...scheduleRow,
      preacher: "Pr. Augusto",
      director: "Diac. Ana",
      passage: "Marcos 1",
      occasion_label: "PASCOA",
      google_event_id: "abc@google.com",
      status: "suspended"
    };
    client.setNext({ data: [row], error: null });
    const [item] = await backend().content.listSchedule();
    expect(item).toEqual({
      id: "s1",
      title: "Reuniao",
      ministryId: "m1",
      ministry: "Louvor",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Pr. Augusto",
      director: "Diac. Ana",
      passage: "Marcos 1",
      occasionLabel: "PASCOA",
      googleEventId: "abc@google.com",
      status: "suspended",
      featured: true
    });
  });

  it("maps nullable schedule labels and google event ids to empty strings", async () => {
    client.setNext({ data: [{ ...scheduleRow, occasion_label: null, google_event_id: null }], error: null });
    const [item] = await backend().content.listSchedule();
    expect(item?.occasionLabel).toBe("");
    expect(item?.googleEventId).toBe("");
  });

  it("maps schedule ministry names from array relations and legacy fallbacks", async () => {
    client.setNext({
      data: [
        { ...scheduleRow, id: "array-relation", ministries: [{ name: "Array Ministry" }] },
        { ...scheduleRow, id: "array-object-fallback", ministries: [{}], ministry: "Array Object Fallback" },
        { ...scheduleRow, id: "array-object-empty", ministries: [{}], ministry: null },
        { ...scheduleRow, id: "empty-array-relation", ministries: [], ministry: "Empty Array Ministry" },
        {
          ...scheduleRow,
          id: "primitive-array-relation",
          ministries: ["bad"],
          ministry: "Primitive Array Ministry"
        },
        { ...scheduleRow, id: "object-fallback", ministries: {}, ministry: "Object Fallback Ministry" },
        { ...scheduleRow, id: "object-empty", ministries: {}, ministry: null },
        { ...scheduleRow, id: "legacy-fallback", ministries: null, ministry: "Legacy Ministry" },
        {
          ...scheduleRow,
          id: "primitive-relation",
          ministries: "bad",
          ministry: "Primitive Relation Ministry"
        },
        { ...scheduleRow, id: "empty-fallback", ministry_id: null, ministries: null, ministry: null }
      ],
      error: null
    });

    const items = await backend().content.listSchedule();

    expect(items.map((item) => item.ministry)).toEqual([
      "Array Ministry",
      "Array Object Fallback",
      "",
      "Empty Array Ministry",
      "Primitive Array Ministry",
      "Object Fallback Ministry",
      "",
      "Legacy Ministry",
      "Primitive Relation Ministry",
      ""
    ]);
    expect(items.at(-1)?.ministryId).toBe("");
  });

  it("propagates supabase error on listSchedule", async () => {
    client.setNext({ data: null, error: { message: "sch-list" } });
    await expect(backend().content.listSchedule()).rejects.toThrow("sch-list");
  });

  it("saves schedule item with provided id", async () => {
    client.setNext({ data: scheduleRow, error: null });
    const result = await backend().content.saveScheduleItem({
      id: "s1",
      title: "Reuniao",
      ministryId: "m1",
      ministry: "Louvor",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Lider",
      director: "",
      passage: "",
      occasionLabel: "",
      googleEventId: "",
      status: "scheduled",
      featured: true
    });
    expect(result.id).toBe("s1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ google_event_id: null, ministry_id: "m1" })
    );
  });

  it("saves schedule item generating id and ministry when missing", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("sch-uuid-1-2-3");
    client.setNext({ data: null, error: null });
    client.setNext({ data: { id: "m1" }, error: null });
    client.setNext({ data: { ...scheduleRow, id: "sch-uuid-1-2-3" }, error: null });
    await backend().content.saveScheduleItem({
      title: "Reuniao",
      ministry: "Louvor",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Lider",
      director: "",
      passage: "",
      occasionLabel: "",
      googleEventId: "",
      status: "scheduled",
      featured: false
    });
    expect(client.from).toHaveBeenNthCalledWith(1, "ministries");
    expect(client.queries[0]?.maybeSingle).toHaveBeenCalled();
    expect(client.queries[1]?.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Louvor", color: "#0f766e" })
    );
    expect(client.queries[2]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sch-uuid-1-2-3", ministry_id: "m1" })
    );
    uuid.mockRestore();
  });

  it("saves schedule item reusing an existing normalized ministry", async () => {
    client.setNext({ data: { id: "m-existing" }, error: null });
    client.setNext({ data: { ...scheduleRow, ministry_id: "m-existing" }, error: null });

    await backend().content.saveScheduleItem({
      title: "Reuniao",
      ministry: "  Louvor  ",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Lider",
      director: "",
      passage: "",
      occasionLabel: "",
      googleEventId: "",
      status: "scheduled",
      featured: false
    });

    expect(client.queries[0]?.eq).toHaveBeenCalledWith("slug", "louvor");
    expect(client.queries[1]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ ministry_id: "m-existing" })
    );
  });

  it("defaults blank schedule ministry names to Geral", async () => {
    client.setNext({ data: { id: "m-geral" }, error: null });
    client.setNext({ data: { ...scheduleRow, ministry_id: "m-geral" }, error: null });

    await backend().content.saveScheduleItem({
      title: "Reuniao",
      ministry: "   ",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Lider",
      director: "",
      passage: "",
      occasionLabel: "",
      googleEventId: "",
      status: "scheduled",
      featured: false
    });

    expect(client.queries[0]?.eq).toHaveBeenCalledWith("slug", "geral");
  });

  it("normalizes symbol-only schedule ministry names to Geral", async () => {
    client.setNext({ data: { id: "m-geral" }, error: null });
    client.setNext({ data: { ...scheduleRow, ministry_id: "m-geral" }, error: null });

    await backend().content.saveScheduleItem({
      title: "Reuniao",
      ministry: "!!!",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Lider",
      director: "",
      passage: "",
      occasionLabel: "",
      googleEventId: "",
      status: "scheduled",
      featured: false
    });

    expect(client.queries[0]?.eq).toHaveBeenCalledWith("slug", "geral");
  });

  it("propagates supabase error while resolving schedule ministry", async () => {
    client.setNext({ data: null, error: { message: "lookup-fail" } });

    await expect(
      backend().content.saveScheduleItem({
        title: "x",
        ministry: "y",
        startsAt: "2030-01-01T10:00:00.000Z",
        endsAt: "2030-01-01T11:00:00.000Z",
        location: "",
        summary: "",
        preacher: "",
        director: "",
        passage: "",
        occasionLabel: "",
        googleEventId: "",
        status: "scheduled",
        featured: false
      })
    ).rejects.toThrow("lookup-fail");
  });

  it("propagates supabase error while creating a schedule ministry", async () => {
    client.setNext({ data: null, error: null });
    client.setNext({ data: null, error: { message: "create-ministry-fail" } });

    await expect(
      backend().content.saveScheduleItem({
        title: "x",
        ministry: "y",
        startsAt: "2030-01-01T10:00:00.000Z",
        endsAt: "2030-01-01T11:00:00.000Z",
        location: "",
        summary: "",
        preacher: "",
        director: "",
        passage: "",
        occasionLabel: "",
        googleEventId: "",
        status: "scheduled",
        featured: false
      })
    ).rejects.toThrow("create-ministry-fail");
  });

  it("propagates supabase error on saveScheduleItem", async () => {
    client.setNext({ data: null, error: { message: "sch-save" } });
    await expect(
      backend().content.saveScheduleItem({
        title: "x",
        ministryId: "m1",
        ministry: "y",
        startsAt: "2030-01-01T10:00:00.000Z",
        endsAt: "2030-01-01T11:00:00.000Z",
        location: "",
        summary: "",
        preacher: "",
        director: "",
        passage: "",
        occasionLabel: "",
        googleEventId: "",
        status: "scheduled",
        featured: false
      })
    ).rejects.toThrow("sch-save");
  });

  it("deletes schedule item", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.deleteScheduleItem("s1");
    expect(client.queries[0]?.delete).toHaveBeenCalled();
  });

  it("propagates supabase error on deleteScheduleItem", async () => {
    client.setNext({ data: null, error: { message: "sch-del" } });
    await expect(backend().content.deleteScheduleItem("s1")).rejects.toThrow("sch-del");
  });

  it("creates prayer request", async () => {
    client.setNext({ data: prayerRow, error: null });
    const result = await backend().content.createPrayerRequest({
      name: "Maria",
      contact: "5599",
      message: "Pedido"
    });
    expect(result.status).toBe("novo");
    expect(result.contact).toBe("");
  });

  it("propagates supabase error on createPrayerRequest", async () => {
    client.setNext({ data: null, error: { message: "pray-create" } });
    await expect(
      backend().content.createPrayerRequest({ name: "x", contact: "", message: "y" })
    ).rejects.toThrow("pray-create");
  });

  it("creates prayer request through configured endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: prayerRow })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createSupabaseBackend({
      url: "https://x",
      anonKey: "k",
      prayerEndpoint: "/api/prayer"
    }).content.createPrayerRequest({
      name: "Maria",
      contact: "5599",
      message: "Pedido",
      turnstileToken: "token"
    });

    expect(result.id).toBe("p1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/prayer",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("token")
      })
    );
  });

  it("propagates endpoint errors on createPrayerRequest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "blocked" })
      })
    );

    await expect(
      createSupabaseBackend({
        url: "https://x",
        anonKey: "k",
        prayerEndpoint: "/api/prayer"
      }).content.createPrayerRequest({ name: "Maria", contact: "", message: "Pedido" })
    ).rejects.toThrow("blocked");
  });

  it("uses fallback endpoint error messages on createPrayerRequest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockRejectedValue(new Error("not-json"))
      })
    );

    await expect(
      createSupabaseBackend({
        url: "https://x",
        anonKey: "k",
        prayerEndpoint: "/api/prayer"
      }).content.createPrayerRequest({ name: "Maria", contact: "", message: "Pedido" })
    ).rejects.toThrow("Nao foi possivel enviar o pedido.");
  });

  it("rejects endpoint success responses without data on createPrayerRequest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({})
      })
    );

    await expect(
      createSupabaseBackend({
        url: "https://x",
        anonKey: "k",
        prayerEndpoint: "/api/prayer"
      }).content.createPrayerRequest({ name: "Maria", contact: "", message: "Pedido" })
    ).rejects.toThrow("Registro nao encontrado no Supabase.");
  });

  it("lists prayer requests", async () => {
    client.setNext({ data: [{ ...prayerRow, contact: "5599" }], error: null });
    const items = await backend().content.listPrayerRequests();
    expect(items[0]?.contact).toBe("5599");
  });

  it("propagates supabase error on listPrayerRequests", async () => {
    client.setNext({ data: null, error: { message: "pray-list" } });
    await expect(backend().content.listPrayerRequests()).rejects.toThrow("pray-list");
  });

  it("updates prayer request status", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.updatePrayerRequestStatus("p1", "em_oracao" as PrayerRequest["status"]);
    expect(client.queries[0]?.update).toHaveBeenCalledWith({ status: "em_oracao" });
  });

  it("propagates supabase error on updatePrayerRequestStatus", async () => {
    client.setNext({ data: null, error: { message: "pray-up" } });
    await expect(
      backend().content.updatePrayerRequestStatus("p1", "respondido" as PrayerRequest["status"])
    ).rejects.toThrow("pray-up");
  });
});

describe("SupabaseAuthGateway", () => {
  function backend() {
    return createSupabaseBackend({ url: "https://x", anonKey: "k" });
  }

  it("returns mapped session when present", async () => {
    client.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "u1",
            email: "admin@ex.com",
            user_metadata: { name: "Admin" }
          }
        }
      },
      error: null
    });

    const session = await backend().auth.getSession();
    expect(session).toEqual({ uid: "u1", email: "admin@ex.com", displayName: "Admin" });
  });

  it("returns null when no session", async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await backend().auth.getSession()).toBeNull();
  });

  it("returns null when user has no email", async () => {
    client.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1", email: null } } },
      error: null
    });
    expect(await backend().auth.getSession()).toBeNull();
  });

  it("falls back to email when user_metadata is missing", async () => {
    client.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1", email: "admin@ex.com" } } },
      error: null
    });
    const session = await backend().auth.getSession();
    expect(session?.displayName).toBe("admin@ex.com");
  });

  it("propagates supabase error on getSession", async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: { message: "sess-fail" } });
    await expect(backend().auth.getSession()).rejects.toThrow("sess-fail");
  });

  it("forwards auth state changes to subscriber and unsubscribes", () => {
    const listener = vi.fn();
    const unsubscribe = backend().auth.subscribe(listener);

    const cb = (client.auth as unknown as { _lastCallback: (event: string, session: unknown) => void })
      ._lastCallback;
    cb("SIGNED_IN", { user: { id: "u1", email: "admin@ex.com", user_metadata: { name: "Admin" } } });
    cb("SIGNED_OUT", null);

    expect(listener).toHaveBeenCalledWith({ uid: "u1", email: "admin@ex.com", displayName: "Admin" });
    expect(listener).toHaveBeenCalledWith(null);

    unsubscribe();
    expect(client.authSubscriptionUnsubscribe).toHaveBeenCalled();
  });

  it("signs in with valid credentials", async () => {
    client.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@ex.com", user_metadata: { name: "Admin" } } },
      error: null
    });
    const session = await backend().auth.signIn("admin@ex.com", "secret");
    expect(session.email).toBe("admin@ex.com");
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@ex.com",
      password: "secret"
    });
  });

  it("propagates supabase error on signIn", async () => {
    client.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" }
    });
    await expect(backend().auth.signIn("a@b", "bad")).rejects.toThrow("Invalid login credentials");
  });

  it("throws when signIn returns user without email", async () => {
    client.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1", email: null } },
      error: null
    });
    await expect(backend().auth.signIn("a@b", "p")).rejects.toThrow("Sessao invalida.");
  });

  it("signs out", async () => {
    client.auth.signOut.mockResolvedValue({ error: null });
    await backend().auth.signOut();
    expect(client.auth.signOut).toHaveBeenCalled();
  });

  it("propagates supabase error on signOut", async () => {
    client.auth.signOut.mockResolvedValue({ error: { message: "out-fail" } });
    await expect(backend().auth.signOut()).rejects.toThrow("out-fail");
  });
});
