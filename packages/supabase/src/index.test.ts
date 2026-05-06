import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrayerRequest } from "@4ibib/core";

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
    in: vi.fn(() => builder),
    is: vi.fn(() => builder),
    or: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: Result) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject)
  });

  return builder;
}

interface FakeClient {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  queries: ReturnType<typeof makeQuery>[];
  setNext: (result: Result) => void;
  setNextRpc: (result: Result) => void;
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
    mfa: {
      listFactors: ReturnType<typeof vi.fn>;
      enroll: ReturnType<typeof vi.fn>;
      challenge: ReturnType<typeof vi.fn>;
      verify: ReturnType<typeof vi.fn>;
      unenroll: ReturnType<typeof vi.fn>;
      getAuthenticatorAssuranceLevel: ReturnType<typeof vi.fn>;
    };
  };
  authSubscriptionUnsubscribe: ReturnType<typeof vi.fn>;
}

function createFakeClient(): FakeClient {
  const queue: Result[] = [];
  const rpcQueue: Result[] = [];
  const queries: ReturnType<typeof makeQuery>[] = [];

  const from = vi.fn(() => {
    const result = queue.shift() ?? { data: null, error: null };
    const query = makeQuery(result);
    queries.push(query);
    return query;
  });

  const rpc = vi.fn(() => {
    const result = rpcQueue.shift() ?? { data: null, error: null };
    return Promise.resolve(result);
  });

  const unsubscribe = vi.fn();

  const auth = {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
      auth._lastCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    }),
    mfa: {
      listFactors: vi.fn(),
      enroll: vi.fn(),
      challenge: vi.fn(),
      verify: vi.fn(),
      unenroll: vi.fn(),
      getAuthenticatorAssuranceLevel: vi.fn()
    }
  } as FakeClient["auth"] & { _lastCallback?: (event: string, session: unknown) => void };

  return {
    from,
    rpc,
    queries,
    setNext: (result) => {
      queue.push(result);
    },
    setNextRpc: (result) => {
      rpcQueue.push(result);
    },
    auth,
    authSubscriptionUnsubscribe: unsubscribe
  };
}

let client: FakeClient;

const announcementRow = {
  id: "a1",
  title: "Aviso",
  summary: "Resumo",
  category: "geral",
  published_at: "2030-01-01T10:00:00.000Z",
  pinned: true,
  cta_label: null,
  cta_url: null,
  status: "published",
  expires_at: null,
  image_url: ""
};

const scheduleRow = {
  id: "s1",
  title: "Reuniao",
  ministry: "louvor",
  starts_at: "2030-01-01T10:00:00.000Z",
  ends_at: "2030-01-01T12:00:00.000Z",
  location: "Salao",
  summary: "Resumo",
  preacher: "Lider",
  director: "",
  sound_team: "",
  passage: "",
  occasion_label: "",
  status: "scheduled",
  featured: true,
  series_id: null,
  youtube_url: ""
};

const volunteerRow = {
  id: "v1",
  name: "Miguel",
  role: "som",
  sort_order: 0,
  contact: "",
  photo_url: "",
  ministries: [],
  unavailable_dates: [],
  notes: ""
};

const prayerRow = {
  id: "p1",
  name: "Maria",
  contact: null,
  message: "Oracao",
  created_at: "2030-01-01T10:00:00.000Z",
  status: "novo",
  pastoral_notes: "",
  assigned_to: null,
  seen_at: null
};

const profileRow = {
  id: "main",
  name: "4a Betel",
  short_name: "4Betel",
  tagline: "tag",
  city: "Caruaru, PE",
  pastor_name: "Pr. X",
  address: "Rua Y",
  email: "a@b",
  whatsapp: "+55",
  instagram_url: "https://ig",
  youtube_url: "https://yt",
  maps_url: "https://maps",
  hero_verse: "Mt 5.16",
  mission: "Servir"
};

const ministryRow = {
  id: "m1",
  slug: "louvor",
  name: "Louvor",
  summary: "resumo",
  meeting_time: "Qui 19:30",
  contact: "x",
  color: "#000",
  sort_order: 1
};

const recurringMeetingRow = {
  id: "r1",
  title: "Culto",
  weekday: 4,
  starts_at: "19:30:00",
  ends_at: "21:00:00",
  description: "desc",
  sort_order: 1
};

const commemorationRow = {
  id: "c1",
  name: "Mes de Missoes",
  type: "month",
  month: 7,
  day_of_month: null,
  description: "",
  color: "#0f766e",
  sort_order: 0
};

const rotationRuleRow = {
  id: "rr1",
  member_id: "m1",
  role: "preacher",
  frequency: "every_week",
  weekday: 0,
  ministry: "culto",
  priority: 10,
  active: true,
  notes: ""
};

const adminUserRow = {
  user_id: "u-1",
  role: "owner",
  created_at: "2030-01-01T10:00:00.000Z"
};

const adminUserRpcRow = {
  user_id: "u-1",
  email: "admin@ex.com",
  display_name: "Admin",
  role: "owner",
  created_at: "2030-01-01T10:00:00.000Z"
};

const auditRow = {
  id: "log-1",
  table_name: "schedule_items",
  row_id: "s1",
  action: "UPDATE",
  changed_by: "u-1",
  changed_at: "2030-01-01T10:00:00.000Z",
  old_row: { title: "old" },
  new_row: { title: "new" }
};

const memberRow = {
  id: "mem-1",
  full_name: "Joao Silva",
  preferred_name: "Joao",
  birth_date: "1990-05-12",
  marital_status: "casado",
  gender: "masculino",
  photo_url: "https://photo",
  email: "joao@ex.com",
  phone: "5581999990000",
  whatsapp: "5581999990000",
  cpf: "12345678901",
  rg: "1234567",
  rg_issuer: "SDS-PE",
  profession: "Engenheiro",
  address_zip: "55000-000",
  address_street: "Rua A",
  address_number: "100",
  address_complement: "Apt 1",
  address_neighborhood: "Centro",
  address_city: "Caruaru",
  address_state: "PE",
  household_id: "house-1",
  church_role: "diacono",
  membership_status: "ativo",
  joined_at: "2020-01-01",
  baptism_date: "2010-04-04",
  baptism_location: "4a Betel",
  transferred_from: "",
  emergency_contact_name: "Maria Silva",
  emergency_contact_phone: "5581988880000",
  prayer_topics: ["familia"],
  spiritual_gifts: ["ensino"],
  allergies: "",
  medical_notes: "",
  consent_medical_data_at: "2024-01-01T00:00:00.000Z",
  is_volunteer: true,
  volunteer_ministries: ["som"],
  volunteer_unavailable_dates: ["2030-12-25"],
  volunteer_notes: "",
  notes: "",
  consent_given_at: "2024-01-01T00:00:00.000Z",
  consent_version: "v1",
  public_directory: true,
  public_bio: "Pastor da igreja desde 2015.",
  data_retention_until: "2030-01-01",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  deleted_at: null
};

const householdRow = {
  id: "house-1",
  name: "Familia Silva",
  head_member_id: "mem-1",
  address_zip: "55000-000",
  address_street: "Rua A",
  address_number: "100",
  address_complement: "",
  address_neighborhood: "Centro",
  address_city: "Caruaru",
  address_state: "PE",
  notes: "",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  deleted_at: null
};

const relationshipRow = {
  id: "rel-1",
  from_member_id: "mem-1",
  to_member_id: "mem-2",
  type: "conjuge",
  start_date: "2010-06-01",
  end_date: null,
  created_at: "2024-01-01T00:00:00.000Z"
};

const duplicateMatchRow = {
  member_id: "mem-9",
  full_name: "Joao da Silva",
  score: 0.95,
  match_reason: "cpf_match"
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

  it("gets snapshot fanning out across content tables", async () => {
    client.setNext({ data: [announcementRow], error: null });
    client.setNext({ data: [scheduleRow], error: null });
    client.setNext({ data: [volunteerRow], error: null });
    client.setNext({ data: profileRow, error: null });
    client.setNext({ data: [ministryRow], error: null });
    client.setNext({ data: [recurringMeetingRow], error: null });
    client.setNext({ data: [commemorationRow], error: null });
    client.setNext({ data: [rotationRuleRow], error: null });

    const snapshot = await backend().content.getSnapshot();

    expect(snapshot.announcements[0]?.id).toBe("a1");
    expect(snapshot.schedule[0]?.id).toBe("s1");
    expect(snapshot.volunteers[0]?.id).toBe("v1");
    expect(snapshot.profile?.id).toBe("main");
    expect(snapshot.ministries[0]?.id).toBe("m1");
    expect(snapshot.recurringMeetings[0]?.id).toBe("r1");
    expect(snapshot.commemorations[0]?.id).toBe("c1");
    expect(snapshot.rotationRules[0]?.id).toBe("rr1");
    expect(client.from).toHaveBeenCalledTimes(8);
  });

  it("falls back to empty rotation rules when listing fails", async () => {
    client.setNext({ data: [announcementRow], error: null });
    client.setNext({ data: [scheduleRow], error: null });
    client.setNext({ data: [volunteerRow], error: null });
    client.setNext({ data: profileRow, error: null });
    client.setNext({ data: [ministryRow], error: null });
    client.setNext({ data: [recurringMeetingRow], error: null });
    client.setNext({ data: [commemorationRow], error: null });
    client.setNext({ data: null, error: { message: "rotation-fail" } });

    const snapshot = await backend().content.getSnapshot();
    expect(snapshot.rotationRules).toEqual([]);
  });

  it("lists announcements with empty cta fallbacks and default status", async () => {
    client.setNext({
      data: [{ ...announcementRow, status: undefined, image_url: undefined }],
      error: null
    });
    const items = await backend().content.listAnnouncements();
    expect(items[0]?.ctaLabel).toBe("");
    expect(items[0]?.ctaUrl).toBe("");
    expect(items[0]?.status).toBe("published");
    expect(items[0]?.imageUrl).toBe("");
    expect(items[0]?.expiresAt).toBeNull();
    expect(client.queries[0]?.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("propagates supabase error on listAnnouncements", async () => {
    client.setNext({ data: null, error: { message: "list-error" } });
    await expect(backend().content.listAnnouncements()).rejects.toThrow("list-error");
  });

  it("maps full announcement row including expiresAt", async () => {
    client.setNext({
      data: [
        {
          ...announcementRow,
          status: "draft",
          expires_at: "2030-02-01T00:00:00.000Z",
          image_url: "https://i"
        }
      ],
      error: null
    });
    const items = await backend().content.listAnnouncements();
    expect(items[0]?.status).toBe("draft");
    expect(items[0]?.expiresAt).toBe("2030-02-01T00:00:00.000Z");
    expect(items[0]?.imageUrl).toBe("https://i");
  });

  it("saves announcement preserving id and explicit fields", async () => {
    client.setNext({ data: announcementRow, error: null });
    const result = await backend().content.saveAnnouncement({
      id: "a1",
      title: "Aviso",
      summary: "Resumo",
      category: "geral",
      publishedAt: "2030-01-01T10:00:00.000Z",
      pinned: true,
      ctaLabel: "ir",
      ctaUrl: "https://x",
      status: "draft",
      expiresAt: "2030-02-01T00:00:00.000Z",
      imageUrl: "https://i"
    });
    expect(result.id).toBe("a1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "a1",
        status: "draft",
        expires_at: "2030-02-01T00:00:00.000Z",
        image_url: "https://i"
      })
    );
  });

  it("saves announcement generating id and applying defaults when fields missing", async () => {
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

    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "uuid-1-2-3-4-5",
        status: "published",
        expires_at: null,
        image_url: ""
      })
    );
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

  it("deletes announcement via archive rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.deleteAnnouncement("a1");
    expect(client.rpc).toHaveBeenCalledWith("archive_announcement", { p_id: "a1" });
  });

  it("propagates supabase error on deleteAnnouncement", async () => {
    client.setNextRpc({ data: null, error: { message: "del-fail" } });
    await expect(backend().content.deleteAnnouncement("a1")).rejects.toThrow("del-fail");
  });

  it("archives announcement through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.archiveAnnouncement("a1");
    expect(client.rpc).toHaveBeenCalledWith("archive_announcement", { p_id: "a1" });
  });

  it("propagates rpc error on archiveAnnouncement", async () => {
    client.setNextRpc({ data: null, error: { message: "arc-ann-fail" } });
    await expect(backend().content.archiveAnnouncement("a1")).rejects.toThrow("arc-ann-fail");
  });

  it("restores announcement through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.restoreAnnouncement("a1");
    expect(client.rpc).toHaveBeenCalledWith("restore_announcement", { p_id: "a1" });
  });

  it("propagates rpc error on restoreAnnouncement", async () => {
    client.setNextRpc({ data: null, error: { message: "res-ann-fail" } });
    await expect(backend().content.restoreAnnouncement("a1")).rejects.toThrow("res-ann-fail");
  });

  it("lists schedule reading ministry as plain text", async () => {
    client.setNext({ data: [scheduleRow], error: null });
    const items = await backend().content.listSchedule();
    expect(items[0]?.title).toBe("Reuniao");
    expect(items[0]?.ministry).toBe("louvor");
    expect(items[0]?.seriesId).toBeNull();
    expect(client.queries[0]?.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("maps every schedule column from supabase row", async () => {
    const row = {
      ...scheduleRow,
      preacher: "Pr. Augusto",
      director: "Diac. Ana",
      sound_team: "Miguel, Brainer",
      passage: "Marcos 1",
      occasion_label: "PASCOA",
      status: "suspended",
      series_id: "ser-1",
      youtube_url: "https://youtu.be/abc123"
    };
    client.setNext({ data: [row], error: null });
    const [item] = await backend().content.listSchedule();
    expect(item).toEqual({
      id: "s1",
      title: "Reuniao",
      ministry: "louvor",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Pr. Augusto",
      director: "Diac. Ana",
      soundTeam: "Miguel, Brainer",
      passage: "Marcos 1",
      occasionLabel: "PASCOA",
      status: "suspended",
      featured: true,
      seriesId: "ser-1",
      youtubeUrl: "https://youtu.be/abc123",
      preacherMemberId: null,
      directorMemberId: null,
      soundMemberId: null
    });
  });

  it("maps schedule youtube_url to empty string when null", async () => {
    client.setNext({ data: [{ ...scheduleRow, youtube_url: null }], error: null });
    const [item] = await backend().content.listSchedule();
    expect(item?.youtubeUrl).toBe("");
  });

  it("saves schedule item carrying youtube_url in payload", async () => {
    client.setNext({
      data: { ...scheduleRow, youtube_url: "https://youtu.be/xyz" },
      error: null
    });
    const result = await backend().content.saveScheduleItem({
      id: "s1",
      title: "Culto",
      ministry: "louvor",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "",
      preacher: "Lider",
      director: "",
      soundTeam: "",
      passage: "",
      occasionLabel: "",
      status: "scheduled",
      featured: false,
      youtubeUrl: "https://youtu.be/xyz"
    });
    expect(result.youtubeUrl).toBe("https://youtu.be/xyz");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ youtube_url: "https://youtu.be/xyz" })
    );
  });

  it("defaults youtube_url to empty string when input omits it", async () => {
    client.setNext({ data: scheduleRow, error: null });
    await backend().content.saveScheduleItem({
      title: "Culto",
      ministry: "louvor",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "",
      preacher: "Lider",
      director: "",
      soundTeam: "",
      passage: "",
      occasionLabel: "",
      status: "scheduled",
      featured: false
    });
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(expect.objectContaining({ youtube_url: "" }));
  });

  it("maps nullable schedule labels to empty strings", async () => {
    client.setNext({
      data: [
        { ...scheduleRow, occasion_label: null, ministry: null, sound_team: null, series_id: undefined }
      ],
      error: null
    });
    const [item] = await backend().content.listSchedule();
    expect(item?.occasionLabel).toBe("");
    expect(item?.ministry).toBe("");
    expect(item?.soundTeam).toBe("");
    expect(item?.seriesId).toBeNull();
  });

  it("propagates supabase error on listSchedule", async () => {
    client.setNext({ data: null, error: { message: "sch-list" } });
    await expect(backend().content.listSchedule()).rejects.toThrow("sch-list");
  });

  it("saves schedule item preserving series id", async () => {
    client.setNext({ data: { ...scheduleRow, series_id: "ser-1" }, error: null });
    const result = await backend().content.saveScheduleItem({
      id: "s1",
      title: "Reuniao",
      ministry: "louvor",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Lider",
      director: "",
      soundTeam: "Miguel",
      passage: "",
      occasionLabel: "",
      status: "scheduled",
      featured: true,
      seriesId: "ser-1"
    });
    expect(result.seriesId).toBe("ser-1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1", series_id: "ser-1" })
    );
  });

  it("saves schedule item generating id with default series id null", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("sch-uuid-1-2-3");
    client.setNext({ data: { ...scheduleRow, id: "sch-uuid-1-2-3" }, error: null });

    await backend().content.saveScheduleItem({
      title: "Reuniao",
      ministry: "louvor",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Lider",
      director: "",
      soundTeam: "",
      passage: "",
      occasionLabel: "",
      status: "scheduled",
      featured: false
    });

    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sch-uuid-1-2-3", series_id: null })
    );
    uuid.mockRestore();
  });

  it("propagates supabase error on saveScheduleItem", async () => {
    client.setNext({ data: null, error: { message: "sch-save" } });
    await expect(
      backend().content.saveScheduleItem({
        title: "x",
        ministry: "louvor",
        startsAt: "2030-01-01T10:00:00.000Z",
        endsAt: "2030-01-01T11:00:00.000Z",
        location: "",
        summary: "",
        preacher: "",
        director: "",
        soundTeam: "",
        passage: "",
        occasionLabel: "",
        status: "scheduled",
        featured: false
      })
    ).rejects.toThrow("sch-save");
  });

  it("deletes schedule item via archive rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.deleteScheduleItem("s1");
    expect(client.rpc).toHaveBeenCalledWith("archive_schedule_item", { p_id: "s1" });
  });

  it("propagates supabase error on deleteScheduleItem", async () => {
    client.setNextRpc({ data: null, error: { message: "sch-del" } });
    await expect(backend().content.deleteScheduleItem("s1")).rejects.toThrow("sch-del");
  });

  it("archives schedule item through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.archiveScheduleItem("s1");
    expect(client.rpc).toHaveBeenCalledWith("archive_schedule_item", { p_id: "s1" });
  });

  it("propagates rpc error on archiveScheduleItem", async () => {
    client.setNextRpc({ data: null, error: { message: "arc-sch-fail" } });
    await expect(backend().content.archiveScheduleItem("s1")).rejects.toThrow("arc-sch-fail");
  });

  it("restores schedule item through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.restoreScheduleItem("s1");
    expect(client.rpc).toHaveBeenCalledWith("restore_schedule_item", { p_id: "s1" });
  });

  it("propagates rpc error on restoreScheduleItem", async () => {
    client.setNextRpc({ data: null, error: { message: "res-sch-fail" } });
    await expect(backend().content.restoreScheduleItem("s1")).rejects.toThrow("res-sch-fail");
  });

  it("duplicates schedule item generating new id and clearing featured", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("dup-uuid-1-2-3");
    client.setNext({ data: scheduleRow, error: null });
    client.setNext({ data: { ...scheduleRow, id: "dup-uuid-1-2-3", featured: false }, error: null });

    const result = await backend().content.duplicateScheduleItem("s1");
    expect(result.id).toBe("dup-uuid-1-2-3");
    expect(result.featured).toBe(false);
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "s1");
    expect(client.queries[1]?.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dup-uuid-1-2-3", featured: false })
    );
    uuid.mockRestore();
  });

  it("propagates read error on duplicateScheduleItem", async () => {
    client.setNext({ data: null, error: { message: "dup-read" } });
    await expect(backend().content.duplicateScheduleItem("s1")).rejects.toThrow("dup-read");
  });

  it("propagates insert error on duplicateScheduleItem", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("dup-uuid-1-2-3");
    client.setNext({ data: scheduleRow, error: null });
    client.setNext({ data: null, error: { message: "dup-insert" } });
    await expect(backend().content.duplicateScheduleItem("s1")).rejects.toThrow("dup-insert");
  });

  it("bulk updates schedule items with all patch fields", async () => {
    client.setNext({ data: [scheduleRow], error: null });
    const result = await backend().content.bulkUpdateScheduleItems(["s1"], {
      preacher: "Pr",
      director: "Dr",
      soundTeam: "St",
      ministry: "louvor",
      location: "Sala",
      status: "suspended",
      occasionLabel: "PASCOA",
      featured: true
    });
    expect(result).toHaveLength(1);
    expect(client.queries[0]?.update).toHaveBeenCalledWith({
      preacher: "Pr",
      director: "Dr",
      sound_team: "St",
      ministry: "louvor",
      location: "Sala",
      status: "suspended",
      occasion_label: "PASCOA",
      featured: true
    });
    expect(client.queries[0]?.in).toHaveBeenCalledWith("id", ["s1"]);
  });

  it("bulk updates schedule items skipping undefined fields", async () => {
    client.setNext({ data: [], error: null });
    await backend().content.bulkUpdateScheduleItems(["s1"], { preacher: "Pr" });
    expect(client.queries[0]?.update).toHaveBeenCalledWith({ preacher: "Pr" });
  });

  it("propagates supabase error on bulkUpdateScheduleItems", async () => {
    client.setNext({ data: null, error: { message: "bulk-fail" } });
    await expect(backend().content.bulkUpdateScheduleItems(["s1"], { preacher: "x" })).rejects.toThrow(
      "bulk-fail"
    );
  });

  it("lists volunteers ordered by sort order", async () => {
    client.setNext({
      data: [{ ...volunteerRow, id: "v2", name: "Brainer", sort_order: 1 }, volunteerRow],
      error: null
    });
    const items = await backend().content.listVolunteers();
    expect(items.map((item) => item.id)).toEqual(["v1", "v2"]);
    expect(client.queries[0]?.order).toHaveBeenCalledWith("sort_order", { ascending: true });
  });

  it("maps nullable volunteer columns to defaults", async () => {
    client.setNext({
      data: [{ id: "v3", name: "Sem Role", role: null, sort_order: null }],
      error: null
    });
    const [item] = await backend().content.listVolunteers();
    expect(item?.role).toBe("geral");
    expect(item?.sortOrder).toBe(0);
    expect(item?.contact).toBe("");
    expect(item?.photoUrl).toBe("");
    expect(item?.ministries).toEqual([]);
    expect(item?.unavailableDates).toEqual([]);
    expect(item?.notes).toBe("");
  });

  it("maps full volunteer columns including arrays", async () => {
    client.setNext({
      data: [
        {
          ...volunteerRow,
          contact: "5599",
          photo_url: "https://p",
          ministries: ["louvor", "som"],
          unavailable_dates: ["2030-05-01"],
          notes: "obs"
        }
      ],
      error: null
    });
    const [item] = await backend().content.listVolunteers();
    expect(item?.contact).toBe("5599");
    expect(item?.photoUrl).toBe("https://p");
    expect(item?.ministries).toEqual(["louvor", "som"]);
    expect(item?.unavailableDates).toEqual(["2030-05-01"]);
    expect(item?.notes).toBe("obs");
  });

  it("propagates supabase error on listVolunteers", async () => {
    client.setNext({ data: null, error: { message: "vol-list" } });
    await expect(backend().content.listVolunteers()).rejects.toThrow("vol-list");
  });

  it("saves volunteer with provided id and full fields", async () => {
    client.setNext({ data: volunteerRow, error: null });
    const result = await backend().content.saveVolunteer({
      id: "v1",
      name: "Miguel",
      role: "som",
      sortOrder: 0,
      contact: "5599",
      photoUrl: "https://p",
      ministries: ["som"],
      unavailableDates: ["2030-05-01"],
      notes: "obs"
    });
    expect(result.id).toBe("v1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith({
      id: "v1",
      name: "Miguel",
      role: "som",
      sort_order: 0,
      contact: "5599",
      photo_url: "https://p",
      ministries: ["som"],
      unavailable_dates: ["2030-05-01"],
      notes: "obs"
    });
  });

  it("saves volunteer generating id and applying defaults when omitted", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("vol-uuid-1-2-3");
    client.setNext({ data: { ...volunteerRow, id: "vol-uuid-1-2-3" }, error: null });

    await backend().content.saveVolunteer({
      name: "Miguel",
      role: "som",
      sortOrder: 5
    });

    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "vol-uuid-1-2-3",
        sort_order: 5,
        contact: "",
        photo_url: "",
        ministries: [],
        unavailable_dates: [],
        notes: ""
      })
    );
    uuid.mockRestore();
  });

  it("propagates supabase error on saveVolunteer", async () => {
    client.setNext({ data: null, error: { message: "vol-save" } });
    await expect(backend().content.saveVolunteer({ name: "x", role: "geral", sortOrder: 0 })).rejects.toThrow(
      "vol-save"
    );
  });

  it("deletes volunteer", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.deleteVolunteer("v1");
    expect(client.queries[0]?.delete).toHaveBeenCalled();
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "v1");
  });

  it("propagates supabase error on deleteVolunteer", async () => {
    client.setNext({ data: null, error: { message: "vol-del" } });
    await expect(backend().content.deleteVolunteer("v1")).rejects.toThrow("vol-del");
  });

  it("renames volunteer without cascade", async () => {
    client.setNext({ data: volunteerRow, error: null });
    client.setNext({ data: { ...volunteerRow, name: "Miguel Souza" }, error: null });

    const result = await backend().content.renameVolunteer({ id: "v1", newName: "Miguel Souza" });
    expect(result.volunteer.name).toBe("Miguel Souza");
    expect(result.updatedScheduleItems).toBe(0);
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it("renames volunteer with cascade updating preacher and director rows", async () => {
    client.setNext({ data: volunteerRow, error: null });
    client.setNext({ data: { ...volunteerRow, name: "Miguel Souza" }, error: null });
    client.setNext({ data: [{ id: "s1" }, { id: "s2" }], error: null });
    client.setNext({ data: [{ id: "s3" }], error: null });

    const result = await backend().content.renameVolunteer({
      id: "v1",
      newName: "Miguel Souza",
      cascade: true
    });
    expect(result.updatedScheduleItems).toBe(3);
    expect(client.from).toHaveBeenCalledTimes(4);
    expect(client.queries[2]?.eq).toHaveBeenCalledWith("preacher", "Miguel");
    expect(client.queries[3]?.eq).toHaveBeenCalledWith("director", "Miguel");
  });

  it("renames volunteer with cascade defaulting count when data null", async () => {
    client.setNext({ data: volunteerRow, error: null });
    client.setNext({ data: { ...volunteerRow, name: "Miguel Souza" }, error: null });
    client.setNext({ data: null, error: null });
    client.setNext({ data: null, error: null });

    const result = await backend().content.renameVolunteer({
      id: "v1",
      newName: "Miguel Souza",
      cascade: true
    });
    expect(result.updatedScheduleItems).toBe(0);
  });

  it("skips cascade when newName equals oldName", async () => {
    client.setNext({ data: volunteerRow, error: null });
    client.setNext({ data: volunteerRow, error: null });

    const result = await backend().content.renameVolunteer({
      id: "v1",
      newName: "Miguel",
      cascade: true
    });
    expect(result.updatedScheduleItems).toBe(0);
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it("propagates read error on renameVolunteer", async () => {
    client.setNext({ data: null, error: { message: "rename-read" } });
    await expect(backend().content.renameVolunteer({ id: "v1", newName: "X" })).rejects.toThrow(
      "rename-read"
    );
  });

  it("propagates update error on renameVolunteer", async () => {
    client.setNext({ data: volunteerRow, error: null });
    client.setNext({ data: null, error: { message: "rename-update" } });
    await expect(backend().content.renameVolunteer({ id: "v1", newName: "X" })).rejects.toThrow(
      "rename-update"
    );
  });

  it("propagates preacher cascade error on renameVolunteer", async () => {
    client.setNext({ data: volunteerRow, error: null });
    client.setNext({ data: { ...volunteerRow, name: "X" }, error: null });
    client.setNext({ data: null, error: { message: "preacher-fail" } });
    await expect(
      backend().content.renameVolunteer({ id: "v1", newName: "X", cascade: true })
    ).rejects.toThrow("preacher-fail");
  });

  it("propagates director cascade error on renameVolunteer", async () => {
    client.setNext({ data: volunteerRow, error: null });
    client.setNext({ data: { ...volunteerRow, name: "X" }, error: null });
    client.setNext({ data: [], error: null });
    client.setNext({ data: null, error: { message: "director-fail" } });
    await expect(
      backend().content.renameVolunteer({ id: "v1", newName: "X", cascade: true })
    ).rejects.toThrow("director-fail");
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
    expect(result.pastoralNotes).toBe("");
    expect(result.assignedTo).toBeNull();
    expect(result.seenAt).toBeNull();
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

  it("lists prayer requests with full mapping", async () => {
    client.setNext({
      data: [
        {
          ...prayerRow,
          contact: "5599",
          pastoral_notes: "obs",
          assigned_to: "u-1",
          seen_at: "2030-01-02T10:00:00.000Z"
        }
      ],
      error: null
    });
    const items = await backend().content.listPrayerRequests();
    expect(items[0]?.contact).toBe("5599");
    expect(items[0]?.pastoralNotes).toBe("obs");
    expect(items[0]?.assignedTo).toBe("u-1");
    expect(items[0]?.seenAt).toBe("2030-01-02T10:00:00.000Z");
    expect(client.queries[0]?.is).toHaveBeenCalledWith("deleted_at", null);
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

  it("updates prayer request with full patch", async () => {
    client.setNext({
      data: {
        ...prayerRow,
        status: "em_oracao",
        pastoral_notes: "obs",
        assigned_to: "u-1",
        seen_at: "2030-01-02T10:00:00.000Z"
      },
      error: null
    });
    const result = await backend().content.updatePrayerRequest("p1", {
      status: "em_oracao",
      pastoralNotes: "obs",
      assignedTo: "u-1",
      seenAt: "2030-01-02T10:00:00.000Z"
    });
    expect(result.status).toBe("em_oracao");
    expect(result.pastoralNotes).toBe("obs");
    expect(client.queries[0]?.update).toHaveBeenCalledWith({
      status: "em_oracao",
      pastoral_notes: "obs",
      assigned_to: "u-1",
      seen_at: "2030-01-02T10:00:00.000Z"
    });
  });

  it("updates prayer request with empty patch", async () => {
    client.setNext({ data: prayerRow, error: null });
    const result = await backend().content.updatePrayerRequest("p1", {});
    expect(result.id).toBe("p1");
    expect(client.queries[0]?.update).toHaveBeenCalledWith({});
  });

  it("propagates supabase error on updatePrayerRequest", async () => {
    client.setNext({ data: null, error: { message: "pray-update" } });
    await expect(backend().content.updatePrayerRequest("p1", {})).rejects.toThrow("pray-update");
  });

  it("archives prayer request through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.archivePrayerRequest("p1");
    expect(client.rpc).toHaveBeenCalledWith("archive_prayer_request", { p_id: "p1" });
  });

  it("propagates rpc error on archivePrayerRequest", async () => {
    client.setNextRpc({ data: null, error: { message: "arc-pray-fail" } });
    await expect(backend().content.archivePrayerRequest("p1")).rejects.toThrow("arc-pray-fail");
  });

  it("restores prayer request through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.restorePrayerRequest("p1");
    expect(client.rpc).toHaveBeenCalledWith("restore_prayer_request", { p_id: "p1" });
  });

  it("propagates rpc error on restorePrayerRequest", async () => {
    client.setNextRpc({ data: null, error: { message: "res-pray-fail" } });
    await expect(backend().content.restorePrayerRequest("p1")).rejects.toThrow("res-pray-fail");
  });

  it("getProfile returns mapped profile", async () => {
    client.setNext({ data: profileRow, error: null });
    const profile = await backend().content.getProfile();
    expect(profile?.id).toBe("main");
    expect(profile?.name).toBe("4a Betel");
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "main");
  });

  it("getProfile maps nullable fields to empty string", async () => {
    client.setNext({
      data: { id: "main", name: null, short_name: null },
      error: null
    });
    const profile = await backend().content.getProfile();
    expect(profile?.name).toBe("");
    expect(profile?.shortName).toBe("");
    expect(profile?.tagline).toBe("");
  });

  it("getProfile returns null when no row found", async () => {
    client.setNext({ data: null, error: null });
    const profile = await backend().content.getProfile();
    expect(profile).toBeNull();
  });

  it("propagates supabase error on getProfile", async () => {
    client.setNext({ data: null, error: { message: "profile-fail" } });
    await expect(backend().content.getProfile()).rejects.toThrow("profile-fail");
  });

  it("saves profile forcing id main", async () => {
    client.setNext({ data: profileRow, error: null });
    const result = await backend().content.saveProfile({
      name: "4a Betel",
      shortName: "4Betel",
      tagline: "tag",
      city: "Caruaru, PE",
      pastorName: "Pr. X",
      address: "Rua Y",
      email: "a@b",
      whatsapp: "+55",
      instagramUrl: "https://ig",
      youtubeUrl: "https://yt",
      mapsUrl: "https://maps",
      heroVerse: "Mt 5.16",
      mission: "Servir"
    });
    expect(result.id).toBe("main");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "main", name: "4a Betel", short_name: "4Betel" })
    );
  });

  it("propagates supabase error on saveProfile", async () => {
    client.setNext({ data: null, error: { message: "profile-save" } });
    await expect(
      backend().content.saveProfile({
        name: "",
        shortName: "",
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
        mission: ""
      })
    ).rejects.toThrow("profile-save");
  });

  it("lists ministries sorted", async () => {
    client.setNext({
      data: [
        { ...ministryRow, id: "m2", sort_order: 2, name: "Som" },
        { ...ministryRow, sort_order: 1 }
      ],
      error: null
    });
    const items = await backend().content.listMinistries();
    expect(items.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(client.queries[0]?.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("maps ministry nullable fields to defaults", async () => {
    client.setNext({
      data: [
        {
          id: "m9",
          slug: null,
          name: "Sem",
          summary: null,
          meeting_time: null,
          contact: null,
          color: null,
          sort_order: null
        }
      ],
      error: null
    });
    const [item] = await backend().content.listMinistries();
    expect(item?.slug).toBe("");
    expect(item?.summary).toBe("");
    expect(item?.meetingTime).toBe("");
    expect(item?.contact).toBe("");
    expect(item?.color).toBe("");
    expect(item?.sortOrder).toBe(0);
  });

  it("propagates supabase error on listMinistries", async () => {
    client.setNext({ data: null, error: { message: "min-list" } });
    await expect(backend().content.listMinistries()).rejects.toThrow("min-list");
  });

  it("saves ministry preserving id", async () => {
    client.setNext({ data: ministryRow, error: null });
    const result = await backend().content.saveMinistry({
      id: "m1",
      slug: "louvor",
      name: "Louvor",
      summary: "resumo",
      meetingTime: "Qui 19:30",
      contact: "x",
      color: "#000",
      sortOrder: 1
    });
    expect(result.id).toBe("m1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1", slug: "louvor", meeting_time: "Qui 19:30", sort_order: 1 })
    );
  });

  it("saves ministry generating id when missing", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("min-uuid-1-2-3");
    client.setNext({ data: { ...ministryRow, id: "min-uuid-1-2-3" }, error: null });
    await backend().content.saveMinistry({
      slug: "louvor",
      name: "Louvor",
      summary: "",
      meetingTime: "",
      contact: "",
      color: "#0f766e",
      sortOrder: 0
    });
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "min-uuid-1-2-3" }));
    uuid.mockRestore();
  });

  it("propagates supabase error on saveMinistry", async () => {
    client.setNext({ data: null, error: { message: "min-save" } });
    await expect(
      backend().content.saveMinistry({
        slug: "x",
        name: "x",
        summary: "",
        meetingTime: "",
        contact: "",
        color: "#000",
        sortOrder: 0
      })
    ).rejects.toThrow("min-save");
  });

  it("deletes ministry via archive rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.deleteMinistry("m1");
    expect(client.rpc).toHaveBeenCalledWith("archive_ministry", { p_id: "m1" });
  });

  it("propagates supabase error on deleteMinistry", async () => {
    client.setNextRpc({ data: null, error: { message: "min-del" } });
    await expect(backend().content.deleteMinistry("m1")).rejects.toThrow("min-del");
  });

  it("archives ministry through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.archiveMinistry("m1");
    expect(client.rpc).toHaveBeenCalledWith("archive_ministry", { p_id: "m1" });
  });

  it("propagates rpc error on archiveMinistry", async () => {
    client.setNextRpc({ data: null, error: { message: "arc-min-fail" } });
    await expect(backend().content.archiveMinistry("m1")).rejects.toThrow("arc-min-fail");
  });

  it("restores ministry through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.restoreMinistry("m1");
    expect(client.rpc).toHaveBeenCalledWith("restore_ministry", { p_id: "m1" });
  });

  it("propagates rpc error on restoreMinistry", async () => {
    client.setNextRpc({ data: null, error: { message: "res-min-fail" } });
    await expect(backend().content.restoreMinistry("m1")).rejects.toThrow("res-min-fail");
  });

  it("lists recurring meetings stripping seconds", async () => {
    client.setNext({ data: [recurringMeetingRow], error: null });
    const items = await backend().content.listRecurringMeetings();
    expect(items[0]?.startsAt).toBe("19:30");
    expect(items[0]?.endsAt).toBe("21:00");
  });

  it("maps recurring meetings with already short time and null defaults", async () => {
    client.setNext({
      data: [
        {
          id: "r2",
          title: "X",
          weekday: null,
          starts_at: "08:30",
          ends_at: "10",
          description: null,
          sort_order: null
        }
      ],
      error: null
    });
    const [item] = await backend().content.listRecurringMeetings();
    expect(item?.startsAt).toBe("08:30");
    expect(item?.endsAt).toBe("10");
    expect(item?.weekday).toBe(0);
    expect(item?.description).toBe("");
    expect(item?.sortOrder).toBe(0);
  });

  it("propagates supabase error on listRecurringMeetings", async () => {
    client.setNext({ data: null, error: { message: "rec-list" } });
    await expect(backend().content.listRecurringMeetings()).rejects.toThrow("rec-list");
  });

  it("saves recurring meeting preserving id", async () => {
    client.setNext({ data: recurringMeetingRow, error: null });
    const result = await backend().content.saveRecurringMeeting({
      id: "r1",
      title: "Culto",
      weekday: 4,
      startsAt: "19:30",
      endsAt: "21:00",
      description: "desc",
      sortOrder: 1
    });
    expect(result.id).toBe("r1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "r1", weekday: 4, starts_at: "19:30", ends_at: "21:00" })
    );
  });

  it("saves recurring meeting generating id when missing", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("rec-uuid-1-2-3");
    client.setNext({ data: { ...recurringMeetingRow, id: "rec-uuid-1-2-3" }, error: null });
    await backend().content.saveRecurringMeeting({
      title: "Culto",
      weekday: 0,
      startsAt: "09:30",
      endsAt: "11:00",
      description: "",
      sortOrder: 0
    });
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "rec-uuid-1-2-3" }));
    uuid.mockRestore();
  });

  it("propagates supabase error on saveRecurringMeeting", async () => {
    client.setNext({ data: null, error: { message: "rec-save" } });
    await expect(
      backend().content.saveRecurringMeeting({
        title: "x",
        weekday: 0,
        startsAt: "09:30",
        endsAt: "11:00",
        description: "",
        sortOrder: 0
      })
    ).rejects.toThrow("rec-save");
  });

  it("deletes recurring meeting", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.deleteRecurringMeeting("r1");
    expect(client.queries[0]?.delete).toHaveBeenCalled();
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "r1");
  });

  it("propagates supabase error on deleteRecurringMeeting", async () => {
    client.setNext({ data: null, error: { message: "rec-del" } });
    await expect(backend().content.deleteRecurringMeeting("r1")).rejects.toThrow("rec-del");
  });

  it("lists commemorations sorted excluding deleted", async () => {
    client.setNext({
      data: [{ ...commemorationRow, id: "c-aug", month: 8, name: "Agosto" }, commemorationRow],
      error: null
    });
    const items = await backend().content.listCommemorations();
    expect(items.map((c) => c.id)).toEqual(["c1", "c-aug"]);
    expect(client.queries[0]?.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("maps commemoration with missing month defaulting to 1", async () => {
    client.setNext({
      data: [
        {
          id: "c-no-month",
          name: "X",
          type: "month",
          month: null,
          day_of_month: null,
          description: null,
          color: null,
          sort_order: null
        }
      ],
      error: null
    });
    const [item] = await backend().content.listCommemorations();
    expect(item?.month).toBe(1);
  });

  it("maps commemoration day type and null fields", async () => {
    client.setNext({
      data: [
        {
          id: "c-day",
          name: "Dia das Maes",
          type: "day",
          month: 5,
          day_of_month: 10,
          description: null,
          color: null,
          sort_order: null
        }
      ],
      error: null
    });
    const [item] = await backend().content.listCommemorations();
    expect(item?.type).toBe("day");
    expect(item?.dayOfMonth).toBe(10);
    expect(item?.description).toBe("");
    expect(item?.color).toBe("");
    expect(item?.sortOrder).toBe(0);
  });

  it("propagates supabase error on listCommemorations", async () => {
    client.setNext({ data: null, error: { message: "com-list" } });
    await expect(backend().content.listCommemorations()).rejects.toThrow("com-list");
  });

  it("saves commemoration preserving id and clearing day for month type", async () => {
    client.setNext({ data: commemorationRow, error: null });
    const result = await backend().content.saveCommemoration({
      id: "c1",
      name: "Mes de Missoes",
      type: "month",
      month: 7,
      dayOfMonth: 15,
      description: "",
      color: "#0f766e",
      sortOrder: 0
    });
    expect(result.id).toBe("c1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1", type: "month", month: 7, day_of_month: null })
    );
  });

  it("saves commemoration of day type preserving day", async () => {
    client.setNext({
      data: { ...commemorationRow, id: "c-day", type: "day", day_of_month: 10, month: 5 },
      error: null
    });
    await backend().content.saveCommemoration({
      name: "Dia das Maes",
      type: "day",
      month: 5,
      dayOfMonth: 10,
      description: "",
      color: "#0f766e",
      sortOrder: 0
    });
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "day", day_of_month: 10 })
    );
  });

  it("saves commemoration generating id when missing", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("com-uuid-1-2-3");
    client.setNext({ data: { ...commemorationRow, id: "com-uuid-1-2-3" }, error: null });
    await backend().content.saveCommemoration({
      name: "Mes de Missoes",
      type: "month",
      month: 7,
      dayOfMonth: null,
      description: "",
      color: "#0f766e",
      sortOrder: 0
    });
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "com-uuid-1-2-3" }));
    uuid.mockRestore();
  });

  it("propagates supabase error on saveCommemoration", async () => {
    client.setNext({ data: null, error: { message: "com-save" } });
    await expect(
      backend().content.saveCommemoration({
        name: "x",
        type: "month",
        month: 1,
        dayOfMonth: null,
        description: "",
        color: "#000",
        sortOrder: 0
      })
    ).rejects.toThrow("com-save");
  });

  it("archives commemoration through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.archiveCommemoration("c1");
    expect(client.rpc).toHaveBeenCalledWith("archive_commemorative_date", { p_id: "c1" });
  });

  it("propagates rpc error on archiveCommemoration", async () => {
    client.setNextRpc({ data: null, error: { message: "arc-com-fail" } });
    await expect(backend().content.archiveCommemoration("c1")).rejects.toThrow("arc-com-fail");
  });

  it("restores commemoration through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.restoreCommemoration("c1");
    expect(client.rpc).toHaveBeenCalledWith("restore_commemorative_date", { p_id: "c1" });
  });

  it("propagates rpc error on restoreCommemoration", async () => {
    client.setNextRpc({ data: null, error: { message: "res-com-fail" } });
    await expect(backend().content.restoreCommemoration("c1")).rejects.toThrow("res-com-fail");
  });

  it("lists rotation rules sorted excluding deleted", async () => {
    client.setNext({
      data: [{ ...rotationRuleRow, id: "rr-low", priority: 1 }, rotationRuleRow],
      error: null
    });
    const items = await backend().content.listRotationRules();
    expect(items.map((r) => r.id)).toEqual(["rr1", "rr-low"]);
    expect(client.queries[0]?.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("maps rotation rule with default fallbacks", async () => {
    client.setNext({
      data: [
        {
          id: "rr-defaults",
          member_id: "m1",
          role: undefined,
          frequency: undefined,
          weekday: null,
          ministry: null,
          priority: null,
          active: false,
          notes: null
        }
      ],
      error: null
    });
    const [rule] = await backend().content.listRotationRules();
    expect(rule?.role).toBe("preacher");
    expect(rule?.frequency).toBe("every_week");
    expect(rule?.weekday).toBe(0);
    expect(rule?.ministry).toBe("");
    expect(rule?.priority).toBe(0);
    expect(rule?.active).toBe(false);
    expect(rule?.notes).toBe("");
  });

  it("propagates supabase error on listRotationRules", async () => {
    client.setNext({ data: null, error: { message: "rr-list" } });
    await expect(backend().content.listRotationRules()).rejects.toThrow("rr-list");
  });

  it("saves rotation rule preserving id", async () => {
    client.setNext({ data: rotationRuleRow, error: null });
    const result = await backend().content.saveRotationRule({
      id: "rr1",
      memberId: "m1",
      role: "preacher",
      frequency: "every_week",
      weekday: 0,
      ministry: "culto",
      priority: 10,
      active: true,
      notes: ""
    });
    expect(result.id).toBe("rr1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rr1", member_id: "m1", role: "preacher" })
    );
  });

  it("saves rotation rule generating id when missing", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("rr-uuid-1-2-3");
    client.setNext({ data: { ...rotationRuleRow, id: "rr-uuid-1-2-3" }, error: null });
    await backend().content.saveRotationRule({
      memberId: "m1",
      role: "sound",
      frequency: "monthly_first",
      weekday: 0,
      ministry: "",
      priority: 0,
      active: true,
      notes: ""
    });
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "rr-uuid-1-2-3" }));
    uuid.mockRestore();
  });

  it("propagates supabase error on saveRotationRule", async () => {
    client.setNext({ data: null, error: { message: "rr-save" } });
    await expect(
      backend().content.saveRotationRule({
        memberId: "m1",
        role: "preacher",
        frequency: "every_week",
        weekday: 0,
        ministry: "",
        priority: 0,
        active: true,
        notes: ""
      })
    ).rejects.toThrow("rr-save");
  });

  it("archives rotation rule through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.archiveRotationRule("rr1");
    expect(client.rpc).toHaveBeenCalledWith("archive_rotation_rule", { p_id: "rr1" });
  });

  it("propagates rpc error on archiveRotationRule", async () => {
    client.setNextRpc({ data: null, error: { message: "arc-rr-fail" } });
    await expect(backend().content.archiveRotationRule("rr1")).rejects.toThrow("arc-rr-fail");
  });

  it("restores rotation rule through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.restoreRotationRule("rr1");
    expect(client.rpc).toHaveBeenCalledWith("restore_rotation_rule", { p_id: "rr1" });
  });

  it("propagates rpc error on restoreRotationRule", async () => {
    client.setNextRpc({ data: null, error: { message: "res-rr-fail" } });
    await expect(backend().content.restoreRotationRule("rr1")).rejects.toThrow("res-rr-fail");
  });

  it("lists admins enriched via list_admins rpc", async () => {
    client.setNextRpc({ data: [adminUserRpcRow], error: null });
    const items = await backend().content.listAdmins();
    expect(items[0]?.userId).toBe("u-1");
    expect(items[0]?.email).toBe("admin@ex.com");
    expect(items[0]?.displayName).toBe("Admin");
    expect(items[0]?.role).toBe("owner");
    expect(client.rpc).toHaveBeenCalledWith("list_admins");
  });

  it("propagates rpc error on listAdmins", async () => {
    client.setNextRpc({ data: null, error: { message: "admin-list" } });
    await expect(backend().content.listAdmins()).rejects.toThrow("admin-list");
  });

  it("inviteAdmin throws guidance pointing to Auth dashboard", async () => {
    await expect(backend().content.inviteAdmin({ email: "x@y", role: "editor" })).rejects.toThrow(
      "Convite por email exige edge function (planejado para depois). Use o Supabase Auth dashboard para criar o usuario, depois adicione o user_id manualmente em admin_users."
    );
  });

  it("updates admin role", async () => {
    client.setNext({ data: { ...adminUserRow, role: "editor" }, error: null });
    const result = await backend().content.updateAdminRole("u-1", "editor");
    expect(result.role).toBe("editor");
    expect(client.queries[0]?.update).toHaveBeenCalledWith({ role: "editor" });
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("user_id", "u-1");
  });

  it("propagates supabase error on updateAdminRole", async () => {
    client.setNext({ data: null, error: { message: "admin-up" } });
    await expect(backend().content.updateAdminRole("u-1", "editor")).rejects.toThrow("admin-up");
  });

  it("removes admin", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.removeAdmin("u-1");
    expect(client.queries[0]?.delete).toHaveBeenCalled();
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("user_id", "u-1");
  });

  it("propagates supabase error on removeAdmin", async () => {
    client.setNext({ data: null, error: { message: "admin-del" } });
    await expect(backend().content.removeAdmin("u-1")).rejects.toThrow("admin-del");
  });

  it("lists audit log without filter", async () => {
    client.setNext({ data: [auditRow], error: null });
    const entries = await backend().content.listAuditLog();
    expect(entries[0]?.id).toBe("log-1");
    expect(entries[0]?.tableName).toBe("schedule_items");
    expect(entries[0]?.oldRow).toEqual({ title: "old" });
    expect(entries[0]?.newRow).toEqual({ title: "new" });
    expect(client.queries[0]?.eq).not.toHaveBeenCalled();
  });

  it("maps audit log nullable fields", async () => {
    client.setNext({
      data: [{ ...auditRow, changed_by: null, old_row: null, new_row: undefined }],
      error: null
    });
    const [entry] = await backend().content.listAuditLog();
    expect(entry?.changedBy).toBeNull();
    expect(entry?.oldRow).toBeNull();
    expect(entry?.newRow).toBeNull();
  });

  it("lists audit log applying every filter", async () => {
    client.setNext({ data: [auditRow], error: null });
    await backend().content.listAuditLog({
      tableName: "schedule_items",
      rowId: "s1",
      changedBy: "u-1",
      action: "UPDATE",
      since: "2030-01-01T00:00:00.000Z",
      until: "2030-12-31T23:59:59.000Z",
      limit: 10
    });
    const q = client.queries[0]!;
    expect(q.eq).toHaveBeenCalledWith("table_name", "schedule_items");
    expect(q.eq).toHaveBeenCalledWith("row_id", "s1");
    expect(q.eq).toHaveBeenCalledWith("changed_by", "u-1");
    expect(q.eq).toHaveBeenCalledWith("action", "UPDATE");
    expect(q.gte).toHaveBeenCalledWith("changed_at", "2030-01-01T00:00:00.000Z");
    expect(q.lte).toHaveBeenCalledWith("changed_at", "2030-12-31T23:59:59.000Z");
    expect(q.limit).toHaveBeenCalledWith(10);
  });

  it("propagates supabase error on listAuditLog", async () => {
    client.setNext({ data: null, error: { message: "audit-fail" } });
    await expect(backend().content.listAuditLog()).rejects.toThrow("audit-fail");
  });

  it("revertAuditEntry calls revert_audit_entry rpc and resolves", async () => {
    client.setNextRpc({ data: null, error: null });
    await expect(backend().content.revertAuditEntry("log-1")).resolves.toBeUndefined();
    expect(client.rpc).toHaveBeenCalledWith("revert_audit_entry", { entry_id: "log-1" });
  });

  it("propagates rpc error on revertAuditEntry", async () => {
    client.setNextRpc({ data: null, error: { message: "revert-fail" } });
    await expect(backend().content.revertAuditEntry("log-1")).rejects.toThrow("revert-fail");
  });

  it("maps schedule with member ids when present", async () => {
    client.setNext({
      data: [
        {
          ...scheduleRow,
          preacher_member_id: "mem-1",
          director_member_id: "mem-2",
          sound_member_id: "mem-3"
        }
      ],
      error: null
    });
    const [item] = await backend().content.listSchedule();
    expect(item?.preacherMemberId).toBe("mem-1");
    expect(item?.directorMemberId).toBe("mem-2");
    expect(item?.soundMemberId).toBe("mem-3");
  });

  it("saves schedule item carrying member ids in payload", async () => {
    client.setNext({ data: scheduleRow, error: null });
    await backend().content.saveScheduleItem({
      id: "s1",
      title: "Reuniao",
      ministry: "louvor",
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T12:00:00.000Z",
      location: "Salao",
      summary: "Resumo",
      preacher: "Lider",
      director: "",
      soundTeam: "",
      passage: "",
      occasionLabel: "",
      status: "scheduled",
      featured: false
    });
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        preacher_member_id: null,
        director_member_id: null,
        sound_member_id: null
      })
    );
  });

  it("updates schedule item members through dedicated method", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.updateScheduleItemMembers("s1", {
      preacherMemberId: "mem-1",
      directorMemberId: null,
      soundMemberId: "mem-3"
    });
    expect(client.queries[0]?.update).toHaveBeenCalledWith({
      preacher_member_id: "mem-1",
      director_member_id: null,
      sound_member_id: "mem-3"
    });
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "s1");
  });

  it("propagates supabase error on updateScheduleItemMembers", async () => {
    client.setNext({ data: null, error: { message: "ups-fail" } });
    await expect(
      backend().content.updateScheduleItemMembers("s1", {
        preacherMemberId: null,
        directorMemberId: null,
        soundMemberId: null
      })
    ).rejects.toThrow("ups-fail");
  });

  it("creates a member with full payload mapping every column", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("mem-uuid-1-2-3");
    client.setNext({ data: { ...memberRow, id: "mem-uuid-1-2-3" }, error: null });

    const result = await backend().content.createMember({
      fullName: "Joao Silva",
      preferredName: "Joao",
      birthDate: "1990-05-12",
      maritalStatus: "casado",
      gender: "masculino",
      photoUrl: "https://photo",
      email: "joao@ex.com",
      phone: "5581999990000",
      whatsapp: "5581999990000",
      cpf: "12345678901",
      rg: "1234567",
      rgIssuer: "SDS-PE",
      profession: "Engenheiro",
      address: {
        zip: "55000-000",
        street: "Rua A",
        number: "100",
        complement: "Apt 1",
        neighborhood: "Centro",
        city: "Caruaru",
        state: "PE"
      },
      householdId: "house-1",
      churchRole: "diacono",
      membershipStatus: "ativo",
      joinedAt: "2020-01-01",
      baptismDate: "2010-04-04",
      baptismLocation: "4a Betel",
      transferredFrom: "",
      emergencyContactName: "Maria Silva",
      emergencyContactPhone: "5581988880000",
      prayerTopics: ["familia"],
      spiritualGifts: ["ensino"],
      allergies: "",
      medicalNotes: "",
      consentMedicalDataAt: "2024-01-01T00:00:00.000Z",
      isVolunteer: true,
      volunteerMinistries: ["som"],
      volunteerUnavailableDates: ["2030-12-25"],
      volunteerNotes: "",
      notes: "",
      consentGivenAt: "2024-01-01T00:00:00.000Z",
      consentVersion: "v1",
      publicDirectory: true,
      publicBio: "Pastor da igreja desde 2015.",
      dataRetentionUntil: "2030-01-01"
    });

    expect(result.id).toBe("mem-uuid-1-2-3");
    expect(result.fullName).toBe("Joao Silva");
    expect(result.address.city).toBe("Caruaru");
    expect(result.churchRole).toBe("diacono");
    expect(result.publicDirectory).toBe(true);
    expect(result.publicBio).toBe("Pastor da igreja desde 2015.");
    expect(client.queries[0]?.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "mem-uuid-1-2-3",
        full_name: "Joao Silva",
        cpf: "12345678901",
        address_city: "Caruaru",
        is_volunteer: true,
        public_directory: true,
        public_bio: "Pastor da igreja desde 2015."
      })
    );
    uuid.mockRestore();
  });

  it("maps member nullable columns to defaults", async () => {
    client.setNext({
      data: {
        id: "mem-2",
        full_name: "Sem Dados",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z"
      },
      error: null
    });

    const result = await backend().content.getMember("mem-2");
    expect(result?.preferredName).toBe("");
    expect(result?.birthDate).toBeNull();
    expect(result?.maritalStatus).toBeNull();
    expect(result?.gender).toBeNull();
    expect(result?.cpf).toBeNull();
    expect(result?.householdId).toBeNull();
    expect(result?.joinedAt).toBeNull();
    expect(result?.baptismDate).toBeNull();
    expect(result?.consentMedicalDataAt).toBeNull();
    expect(result?.consentGivenAt).toBeNull();
    expect(result?.dataRetentionUntil).toBeNull();
    expect(result?.deletedAt).toBeNull();
    expect(result?.churchRole).toBe("membro_comum");
    expect(result?.membershipStatus).toBe("ativo");
    expect(result?.isVolunteer).toBe(false);
    expect(result?.publicDirectory).toBe(false);
    expect(result?.publicBio).toBe("");
    expect(result?.address.zip).toBe("");
    expect(result?.prayerTopics).toEqual([]);
    expect(result?.spiritualGifts).toEqual([]);
    expect(result?.volunteerMinistries).toEqual([]);
    expect(result?.volunteerUnavailableDates).toEqual([]);
  });

  it("propagates supabase error on createMember", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("mem-uuid-x-y-z");
    client.setNext({ data: null, error: { message: "mem-create" } });
    await expect(
      backend().content.createMember({
        fullName: "X",
        preferredName: "",
        birthDate: null,
        maritalStatus: null,
        gender: null,
        photoUrl: "",
        email: "",
        phone: "",
        whatsapp: "",
        cpf: null,
        rg: "",
        rgIssuer: "",
        profession: "",
        address: {
          zip: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: ""
        },
        householdId: null,
        churchRole: "membro_comum",
        membershipStatus: "ativo",
        joinedAt: null,
        baptismDate: null,
        baptismLocation: "",
        transferredFrom: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        prayerTopics: [],
        spiritualGifts: [],
        allergies: "",
        medicalNotes: "",
        consentMedicalDataAt: null,
        isVolunteer: false,
        volunteerMinistries: [],
        volunteerUnavailableDates: [],
        volunteerNotes: "",
        notes: "",
        consentGivenAt: null,
        consentVersion: "",
        publicDirectory: false,
        publicBio: "",
        dataRetentionUntil: null
      })
    ).rejects.toThrow("mem-create");
  });

  it("updates member with patch covering all fields", async () => {
    client.setNext({ data: memberRow, error: null });
    await backend().content.updateMember("mem-1", {
      fullName: "Joao",
      preferredName: "Jo",
      birthDate: "1990-05-12",
      maritalStatus: "casado",
      gender: "masculino",
      photoUrl: "https://p",
      email: "j@x",
      phone: "111",
      whatsapp: "222",
      cpf: "12345678901",
      rg: "rg",
      rgIssuer: "SDS",
      profession: "Eng",
      address: {
        zip: "0",
        street: "S",
        number: "1",
        complement: "C",
        neighborhood: "N",
        city: "C",
        state: "PE"
      },
      householdId: "h",
      churchRole: "diacono",
      membershipStatus: "ativo",
      joinedAt: "2020-01-01",
      baptismDate: "2010-01-01",
      baptismLocation: "B",
      transferredFrom: "T",
      emergencyContactName: "EC",
      emergencyContactPhone: "ECP",
      prayerTopics: ["a"],
      spiritualGifts: ["b"],
      allergies: "",
      medicalNotes: "",
      consentMedicalDataAt: "2024-01-01T00:00:00.000Z",
      isVolunteer: true,
      volunteerMinistries: ["som"],
      volunteerUnavailableDates: ["2030-12-25"],
      volunteerNotes: "vn",
      notes: "n",
      consentGivenAt: "2024-01-01T00:00:00.000Z",
      consentVersion: "v1",
      publicDirectory: true,
      publicBio: "Pastor desde 2015.",
      dataRetentionUntil: "2030-01-01"
    });
    expect(client.queries[0]?.update).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Joao",
        preferred_name: "Jo",
        marital_status: "casado",
        address_city: "C",
        is_volunteer: true,
        public_directory: true,
        public_bio: "Pastor desde 2015.",
        data_retention_until: "2030-01-01"
      })
    );
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "mem-1");
  });

  it("updates member with empty patch produces empty payload", async () => {
    client.setNext({ data: memberRow, error: null });
    await backend().content.updateMember("mem-1", {});
    expect(client.queries[0]?.update).toHaveBeenCalledWith({});
  });

  it("propagates supabase error on updateMember", async () => {
    client.setNext({ data: null, error: { message: "mem-update" } });
    await expect(backend().content.updateMember("mem-1", { fullName: "X" })).rejects.toThrow("mem-update");
  });

  it("archives member through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.archiveMember("mem-1");
    expect(client.rpc).toHaveBeenCalledWith("archive_member", { p_id: "mem-1" });
  });

  it("propagates rpc error on archiveMember", async () => {
    client.setNextRpc({ data: null, error: { message: "arc-fail" } });
    await expect(backend().content.archiveMember("mem-1")).rejects.toThrow("arc-fail");
  });

  it("restores member through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.restoreMember("mem-1");
    expect(client.rpc).toHaveBeenCalledWith("restore_member", { p_id: "mem-1" });
  });

  it("propagates rpc error on restoreMember", async () => {
    client.setNextRpc({ data: null, error: { message: "res-fail" } });
    await expect(backend().content.restoreMember("mem-1")).rejects.toThrow("res-fail");
  });

  it("anonymizes member through rpc", async () => {
    client.setNextRpc({ data: null, error: null });
    await backend().content.anonymizeMember("mem-1");
    expect(client.rpc).toHaveBeenCalledWith("anonymize_member", { p_id: "mem-1" });
  });

  it("propagates rpc error on anonymizeMember", async () => {
    client.setNextRpc({ data: null, error: { message: "anon-fail" } });
    await expect(backend().content.anonymizeMember("mem-1")).rejects.toThrow("anon-fail");
  });

  it("getMember returns null when no row found", async () => {
    client.setNext({ data: null, error: null });
    expect(await backend().content.getMember("mem-x")).toBeNull();
  });

  it("propagates supabase error on getMember", async () => {
    client.setNext({ data: null, error: { message: "mem-get" } });
    await expect(backend().content.getMember("mem-x")).rejects.toThrow("mem-get");
  });

  it("getMember returns mapped record when present", async () => {
    client.setNext({ data: memberRow, error: null });
    const member = await backend().content.getMember("mem-1");
    expect(member?.id).toBe("mem-1");
    expect(member?.fullName).toBe("Joao Silva");
  });

  it("listMembers without options filters out deleted", async () => {
    client.setNext({ data: [memberRow], error: null });
    const items = await backend().content.listMembers();
    expect(items).toHaveLength(1);
    expect(client.queries[0]?.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("listMembers with includeDeleted skips deleted_at filter", async () => {
    client.setNext({
      data: [memberRow, { ...memberRow, id: "mem-2", deleted_at: "2024-06-01" }],
      error: null
    });
    await backend().content.listMembers({ includeDeleted: true });
    expect(client.queries[0]?.is).not.toHaveBeenCalled();
  });

  it("listMembers applies isVolunteer filter", async () => {
    client.setNext({ data: [memberRow], error: null });
    await backend().content.listMembers({ isVolunteer: true });
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("is_volunteer", true);
  });

  it("listMembers applies householdId filter", async () => {
    client.setNext({ data: [memberRow], error: null });
    await backend().content.listMembers({ householdId: "house-1" });
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("household_id", "house-1");
  });

  it("propagates supabase error on listMembers", async () => {
    client.setNext({ data: null, error: { message: "mem-list" } });
    await expect(backend().content.listMembers()).rejects.toThrow("mem-list");
  });

  it("listPublicMembers maps rows from members_public view", async () => {
    const publicRow = {
      id: "mem-1",
      full_name: "Joao Silva",
      preferred_name: "Joao",
      photo_url: "https://photo",
      church_role: "diacono",
      public_bio: "Pastor da igreja desde 2015.",
      is_volunteer: true,
      household_id: "house-1"
    };
    client.setNext({ data: [publicRow], error: null });
    const items = await backend().content.listPublicMembers();
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("mem-1");
    expect(items[0]?.fullName).toBe("Joao Silva");
    expect(items[0]?.churchRole).toBe("diacono");
    expect(items[0]?.publicBio).toBe("Pastor da igreja desde 2015.");
    expect(items[0]?.isVolunteer).toBe(true);
    expect(items[0]?.householdId).toBe("house-1");
    expect(client.from).toHaveBeenCalledWith("members_public");
    expect(client.queries[0]?.order).toHaveBeenCalledWith("full_name", { ascending: true });
  });

  it("listPublicMembers applies fallbacks for missing optional fields", async () => {
    client.setNext({
      data: [
        {
          id: "mem-2",
          full_name: "Sem Bio",
          preferred_name: null,
          photo_url: null,
          church_role: undefined,
          public_bio: null,
          is_volunteer: false,
          household_id: null
        }
      ],
      error: null
    });
    const items = await backend().content.listPublicMembers();
    expect(items[0]?.preferredName).toBe("");
    expect(items[0]?.photoUrl).toBe("");
    expect(items[0]?.churchRole).toBe("membro_comum");
    expect(items[0]?.publicBio).toBe("");
    expect(items[0]?.householdId).toBeNull();
  });

  it("propagates supabase error on listPublicMembers", async () => {
    client.setNext({ data: null, error: { message: "pub-list" } });
    await expect(backend().content.listPublicMembers()).rejects.toThrow("pub-list");
  });

  it("findMemberDuplicates calls rpc and maps rows", async () => {
    client.setNextRpc({ data: [duplicateMatchRow], error: null });
    const matches = await backend().content.findMemberDuplicates({
      fullName: "Joao",
      cpf: "12345678901",
      email: "j@x",
      phone: "5599"
    });
    expect(matches[0]?.memberId).toBe("mem-9");
    expect(matches[0]?.score).toBe(0.95);
    expect(matches[0]?.matchReason).toBe("cpf_match");
    expect(client.rpc).toHaveBeenCalledWith("find_member_duplicates", {
      p_full_name: "Joao",
      p_cpf: "12345678901",
      p_email: "j@x",
      p_phone: "5599"
    });
  });

  it("findMemberDuplicates defaults score to zero when missing", async () => {
    client.setNextRpc({
      data: [{ member_id: "mem-x", full_name: "X", match_reason: "name_similar" }],
      error: null
    });
    const matches = await backend().content.findMemberDuplicates({
      fullName: "X",
      cpf: null,
      email: "",
      phone: ""
    });
    expect(matches[0]?.score).toBe(0);
  });

  it("propagates rpc error on findMemberDuplicates", async () => {
    client.setNextRpc({ data: null, error: { message: "dup-fail" } });
    await expect(
      backend().content.findMemberDuplicates({ fullName: "X", cpf: null, email: "", phone: "" })
    ).rejects.toThrow("dup-fail");
  });

  it("creates household generating uuid", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("house-uuid-1-2-3");
    client.setNext({ data: { ...householdRow, id: "house-uuid-1-2-3" }, error: null });
    const result = await backend().content.createHousehold({
      name: "Familia Silva",
      headMemberId: "mem-1",
      address: {
        zip: "55000-000",
        street: "Rua A",
        number: "100",
        complement: "",
        neighborhood: "Centro",
        city: "Caruaru",
        state: "PE"
      },
      notes: ""
    });
    expect(result.id).toBe("house-uuid-1-2-3");
    expect(client.queries[0]?.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "house-uuid-1-2-3",
        name: "Familia Silva",
        head_member_id: "mem-1",
        address_city: "Caruaru"
      })
    );
    uuid.mockRestore();
  });

  it("propagates supabase error on createHousehold", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("house-uuid-x-y-z");
    client.setNext({ data: null, error: { message: "house-create" } });
    await expect(
      backend().content.createHousehold({
        name: "X",
        headMemberId: null,
        address: {
          zip: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: ""
        },
        notes: ""
      })
    ).rejects.toThrow("house-create");
  });

  it("updates household with all fields", async () => {
    client.setNext({ data: householdRow, error: null });
    await backend().content.updateHousehold("house-1", {
      name: "Familia Silva 2",
      headMemberId: "mem-2",
      notes: "obs",
      address: {
        zip: "z",
        street: "s",
        number: "n",
        complement: "c",
        neighborhood: "nb",
        city: "ct",
        state: "PE"
      }
    });
    expect(client.queries[0]?.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Familia Silva 2",
        head_member_id: "mem-2",
        notes: "obs",
        address_city: "ct"
      })
    );
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "house-1");
  });

  it("updates household with empty patch", async () => {
    client.setNext({ data: householdRow, error: null });
    await backend().content.updateHousehold("house-1", {});
    expect(client.queries[0]?.update).toHaveBeenCalledWith({});
  });

  it("propagates supabase error on updateHousehold", async () => {
    client.setNext({ data: null, error: { message: "house-update" } });
    await expect(backend().content.updateHousehold("house-1", {})).rejects.toThrow("house-update");
  });

  it("archives household setting deleted_at", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.archiveHousehold("house-1");
    const call = client.queries[0]?.update as ReturnType<typeof vi.fn>;
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ deleted_at: expect.any(String) }));
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "house-1");
  });

  it("propagates supabase error on archiveHousehold", async () => {
    client.setNext({ data: null, error: { message: "house-arc" } });
    await expect(backend().content.archiveHousehold("house-1")).rejects.toThrow("house-arc");
  });

  it("lists households filtering deleted", async () => {
    client.setNext({ data: [householdRow], error: null });
    const items = await backend().content.listHouseholds();
    expect(items[0]?.id).toBe("house-1");
    expect(client.queries[0]?.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("maps household nullable head_member_id and addresses", async () => {
    client.setNext({
      data: [
        {
          id: "house-9",
          name: "Vazio",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z"
        }
      ],
      error: null
    });
    const [item] = await backend().content.listHouseholds();
    expect(item?.headMemberId).toBeNull();
    expect(item?.address.zip).toBe("");
    expect(item?.notes).toBe("");
    expect(item?.deletedAt).toBeNull();
  });

  it("propagates supabase error on listHouseholds", async () => {
    client.setNext({ data: null, error: { message: "house-list" } });
    await expect(backend().content.listHouseholds()).rejects.toThrow("house-list");
  });

  it("getHousehold returns null when not found", async () => {
    client.setNext({ data: null, error: null });
    expect(await backend().content.getHousehold("no")).toBeNull();
  });

  it("maps household deleted_at when set", async () => {
    client.setNext({
      data: { ...householdRow, deleted_at: "2024-06-01T00:00:00.000Z" },
      error: null
    });
    const item = await backend().content.getHousehold("house-1");
    expect(item?.deletedAt).toBe("2024-06-01T00:00:00.000Z");
  });

  it("getHousehold returns mapped row when present", async () => {
    client.setNext({ data: householdRow, error: null });
    const item = await backend().content.getHousehold("house-1");
    expect(item?.id).toBe("house-1");
  });

  it("propagates supabase error on getHousehold", async () => {
    client.setNext({ data: null, error: { message: "house-get" } });
    await expect(backend().content.getHousehold("house-1")).rejects.toThrow("house-get");
  });

  it("creates relationship", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("rel-uuid-1-2-3");
    client.setNext({ data: relationshipRow, error: null });
    const result = await backend().content.createRelationship({
      fromMemberId: "mem-1",
      toMemberId: "mem-2",
      type: "conjuge",
      startDate: "2010-06-01",
      endDate: null
    });
    expect(result.id).toBe("rel-1");
    expect(result.type).toBe("conjuge");
    expect(client.queries[0]?.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rel-uuid-1-2-3",
        from_member_id: "mem-1",
        to_member_id: "mem-2",
        type: "conjuge",
        start_date: "2010-06-01",
        end_date: null
      })
    );
    uuid.mockRestore();
  });

  it("maps relationship with nullable dates", async () => {
    client.setNext({
      data: [
        {
          id: "rel-2",
          from_member_id: "mem-1",
          to_member_id: "mem-3",
          type: "irmao",
          start_date: null,
          end_date: null,
          created_at: "2024-01-01T00:00:00.000Z"
        }
      ],
      error: null
    });
    const items = await backend().content.listRelationships("mem-1");
    expect(items[0]?.startDate).toBeNull();
    expect(items[0]?.endDate).toBeNull();
  });

  it("maps relationship with end_date set", async () => {
    client.setNext({
      data: [{ ...relationshipRow, start_date: "2010-01-01", end_date: "2020-01-01" }],
      error: null
    });
    const items = await backend().content.listRelationships("mem-1");
    expect(items[0]?.startDate).toBe("2010-01-01");
    expect(items[0]?.endDate).toBe("2020-01-01");
  });

  it("propagates supabase error on createRelationship", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("rel-uuid-x-y-z");
    client.setNext({ data: null, error: { message: "rel-create" } });
    await expect(
      backend().content.createRelationship({
        fromMemberId: "mem-1",
        toMemberId: "mem-2",
        type: "conjuge",
        startDate: null,
        endDate: null
      })
    ).rejects.toThrow("rel-create");
  });

  it("deletes relationship", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.deleteRelationship("rel-1");
    expect(client.queries[0]?.delete).toHaveBeenCalled();
    expect(client.queries[0]?.eq).toHaveBeenCalledWith("id", "rel-1");
  });

  it("propagates supabase error on deleteRelationship", async () => {
    client.setNext({ data: null, error: { message: "rel-del" } });
    await expect(backend().content.deleteRelationship("rel-1")).rejects.toThrow("rel-del");
  });

  it("lists relationships filtering by member id", async () => {
    client.setNext({ data: [relationshipRow], error: null });
    const items = await backend().content.listRelationships("mem-1");
    expect(items).toHaveLength(1);
    expect(client.queries[0]?.or).toHaveBeenCalledWith("from_member_id.eq.mem-1,to_member_id.eq.mem-1");
  });

  it("propagates supabase error on listRelationships", async () => {
    client.setNext({ data: null, error: { message: "rel-list" } });
    await expect(backend().content.listRelationships("mem-1")).rejects.toThrow("rel-list");
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

  it("returns access token from session", async () => {
    client.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-1", user: { id: "u1", email: "a@b.c" } } },
      error: null
    });
    expect(await backend().auth.getAccessToken()).toBe("tok-1");
  });

  it("returns null access token when no session", async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await backend().auth.getAccessToken()).toBeNull();
  });

  it("returns null access token on error", async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: { message: "x" } });
    expect(await backend().auth.getAccessToken()).toBeNull();
  });

  it("lists MFA factors mapping verified status", async () => {
    client.auth.mfa.listFactors.mockResolvedValue({
      data: {
        totp: [
          {
            id: "f1",
            status: "verified",
            friendly_name: "Authenticator",
            created_at: "2026-05-06T00:00:00Z"
          },
          { id: "f2", status: "unverified", friendly_name: null, created_at: null }
        ]
      },
      error: null
    });
    const factors = await backend().auth.listMfaFactors();
    expect(factors).toEqual([
      {
        id: "f1",
        status: "verified",
        factorType: "totp",
        friendlyName: "Authenticator",
        createdAt: "2026-05-06T00:00:00Z"
      },
      {
        id: "f2",
        status: "unverified",
        factorType: "totp",
        friendlyName: "Authenticator",
        createdAt: ""
      }
    ]);
  });

  it("returns empty list when no MFA factors", async () => {
    client.auth.mfa.listFactors.mockResolvedValue({ data: { totp: null }, error: null });
    expect(await backend().auth.listMfaFactors()).toEqual([]);
  });

  it("propagates error on listMfaFactors", async () => {
    client.auth.mfa.listFactors.mockResolvedValue({ data: null, error: { message: "list-mfa" } });
    await expect(backend().auth.listMfaFactors()).rejects.toThrow("list-mfa");
  });

  it("enrolls MFA returning factor + qr code + secret", async () => {
    client.auth.mfa.enroll.mockResolvedValue({
      data: {
        id: "f1",
        totp: { qr_code: "<svg></svg>", uri: "otpauth://x", secret: "SECRET" }
      },
      error: null
    });
    const result = await backend().auth.enrollMfa("My device");
    expect(result).toEqual({
      factorId: "f1",
      qrCodeSvg: "<svg></svg>",
      uri: "otpauth://x",
      secret: "SECRET"
    });
    expect(client.auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: "totp",
      friendlyName: "My device"
    });
  });

  it("uses default friendly name when omitted", async () => {
    client.auth.mfa.enroll.mockResolvedValue({
      data: { id: "f1", totp: { qr_code: "x", uri: "y", secret: "z" } },
      error: null
    });
    await backend().auth.enrollMfa();
    expect(client.auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: "totp",
      friendlyName: "Authenticator"
    });
  });

  it("propagates error on enrollMfa", async () => {
    client.auth.mfa.enroll.mockResolvedValue({ data: null, error: { message: "enroll-fail" } });
    await expect(backend().auth.enrollMfa()).rejects.toThrow("enroll-fail");
  });

  it("rejects enrollMfa when totp data is missing", async () => {
    client.auth.mfa.enroll.mockResolvedValue({ data: { id: "f1", totp: null }, error: null });
    await expect(backend().auth.enrollMfa()).rejects.toThrow(/Resposta invalida/);
  });

  it("verifies enrollment via challenge + verify", async () => {
    client.auth.mfa.challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    client.auth.mfa.verify.mockResolvedValue({ data: {}, error: null });
    await backend().auth.verifyMfaEnrollment("f1", "123456");
    expect(client.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: "f1" });
    expect(client.auth.mfa.verify).toHaveBeenCalledWith({
      factorId: "f1",
      challengeId: "c1",
      code: "123456"
    });
  });

  it("propagates challenge error during enrollment verify", async () => {
    client.auth.mfa.challenge.mockResolvedValue({ data: null, error: { message: "chall-fail" } });
    await expect(backend().auth.verifyMfaEnrollment("f1", "123456")).rejects.toThrow("chall-fail");
  });

  it("rejects enrollment verify when challenge has no id", async () => {
    client.auth.mfa.challenge.mockResolvedValue({ data: { id: null }, error: null });
    await expect(backend().auth.verifyMfaEnrollment("f1", "123456")).rejects.toThrow(
      /Falha ao iniciar verificacao/
    );
  });

  it("propagates verify error during enrollment verify", async () => {
    client.auth.mfa.challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    client.auth.mfa.verify.mockResolvedValue({ data: null, error: { message: "verify-fail" } });
    await expect(backend().auth.verifyMfaEnrollment("f1", "123456")).rejects.toThrow("verify-fail");
  });

  it("issues a challenge", async () => {
    client.auth.mfa.challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    expect(await backend().auth.challengeMfa("f1")).toEqual({ challengeId: "c1" });
  });

  it("rejects challenge when id missing", async () => {
    client.auth.mfa.challenge.mockResolvedValue({ data: { id: null }, error: null });
    await expect(backend().auth.challengeMfa("f1")).rejects.toThrow(/Resposta invalida/);
  });

  it("propagates error on challengeMfa", async () => {
    client.auth.mfa.challenge.mockResolvedValue({ data: null, error: { message: "chall-fail" } });
    await expect(backend().auth.challengeMfa("f1")).rejects.toThrow("chall-fail");
  });

  it("verifies a challenge", async () => {
    client.auth.mfa.verify.mockResolvedValue({ data: {}, error: null });
    await backend().auth.verifyMfaChallenge("f1", "c1", "123456");
    expect(client.auth.mfa.verify).toHaveBeenCalledWith({
      factorId: "f1",
      challengeId: "c1",
      code: "123456"
    });
  });

  it("propagates error on verifyMfaChallenge", async () => {
    client.auth.mfa.verify.mockResolvedValue({ data: null, error: { message: "verify-fail" } });
    await expect(backend().auth.verifyMfaChallenge("f1", "c1", "123456")).rejects.toThrow("verify-fail");
  });

  it("unenrolls a factor", async () => {
    client.auth.mfa.unenroll.mockResolvedValue({ data: {}, error: null });
    await backend().auth.unenrollMfa("f1");
    expect(client.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: "f1" });
  });

  it("propagates error on unenrollMfa", async () => {
    client.auth.mfa.unenroll.mockResolvedValue({ data: null, error: { message: "unenroll-fail" } });
    await expect(backend().auth.unenrollMfa("f1")).rejects.toThrow("unenroll-fail");
  });

  it("returns assurance level mapped to aal2", async () => {
    client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2" },
      error: null
    });
    expect(await backend().auth.getAuthAssuranceLevel()).toEqual({ current: "aal2", next: "aal2" });
  });

  it("defaults assurance level to aal1 when missing", async () => {
    client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: undefined, nextLevel: undefined },
      error: null
    });
    expect(await backend().auth.getAuthAssuranceLevel()).toEqual({ current: "aal1", next: "aal1" });
  });

  it("propagates error on getAuthAssuranceLevel", async () => {
    client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: null,
      error: { message: "aal-fail" }
    });
    await expect(backend().auth.getAuthAssuranceLevel()).rejects.toThrow("aal-fail");
  });
});
