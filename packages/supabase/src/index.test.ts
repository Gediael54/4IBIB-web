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
  featured: true
};

const volunteerRow = {
  id: "v1",
  name: "Miguel",
  role: "som",
  sort_order: 0
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

  it("gets snapshot with announcements, schedule and volunteers", async () => {
    client.setNext({ data: [announcementRow], error: null });
    client.setNext({ data: [scheduleRow], error: null });
    client.setNext({ data: [volunteerRow], error: null });

    const snapshot = await backend().content.getSnapshot();

    expect(snapshot.announcements[0]?.id).toBe("a1");
    expect(snapshot.schedule[0]?.id).toBe("s1");
    expect(snapshot.volunteers[0]?.id).toBe("v1");
    expect(client.from).toHaveBeenCalledTimes(3);
    expect(client.from).toHaveBeenNthCalledWith(1, "announcements");
    expect(client.from).toHaveBeenNthCalledWith(2, "schedule_items");
    expect(client.from).toHaveBeenNthCalledWith(3, "volunteers");
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

  it("lists schedule reading ministry as plain text", async () => {
    client.setNext({ data: [scheduleRow], error: null });
    const items = await backend().content.listSchedule();
    expect(items[0]?.title).toBe("Reuniao");
    expect(items[0]?.ministry).toBe("louvor");
    expect(client.queries[0]?.select).toHaveBeenCalledWith("*");
  });

  it("maps every schedule column from supabase row", async () => {
    const row = {
      ...scheduleRow,
      preacher: "Pr. Augusto",
      director: "Diac. Ana",
      sound_team: "Miguel, Brainer",
      passage: "Marcos 1",
      occasion_label: "PASCOA",
      status: "suspended"
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
      featured: true
    });
  });

  it("maps nullable schedule labels to empty strings", async () => {
    client.setNext({
      data: [{ ...scheduleRow, occasion_label: null, ministry: null, sound_team: null }],
      error: null
    });
    const [item] = await backend().content.listSchedule();
    expect(item?.occasionLabel).toBe("");
    expect(item?.ministry).toBe("");
    expect(item?.soundTeam).toBe("");
  });

  it("propagates supabase error on listSchedule", async () => {
    client.setNext({ data: null, error: { message: "sch-list" } });
    await expect(backend().content.listSchedule()).rejects.toThrow("sch-list");
  });

  it("saves schedule item with provided id, ministry slug and sound team", async () => {
    client.setNext({ data: { ...scheduleRow, sound_team: "Miguel" }, error: null });
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
      featured: true
    });
    expect(result.id).toBe("s1");
    expect(result.soundTeam).toBe("Miguel");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1", ministry: "louvor", sound_team: "Miguel" })
    );
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ ministry_id: expect.anything() })
    );
  });

  it("saves schedule item generating id when missing", async () => {
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
      expect.objectContaining({ id: "sch-uuid-1-2-3", ministry: "louvor", sound_team: "" })
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

  it("deletes schedule item", async () => {
    client.setNext({ data: null, error: null });
    await backend().content.deleteScheduleItem("s1");
    expect(client.queries[0]?.delete).toHaveBeenCalled();
  });

  it("propagates supabase error on deleteScheduleItem", async () => {
    client.setNext({ data: null, error: { message: "sch-del" } });
    await expect(backend().content.deleteScheduleItem("s1")).rejects.toThrow("sch-del");
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
  });

  it("propagates supabase error on listVolunteers", async () => {
    client.setNext({ data: null, error: { message: "vol-list" } });
    await expect(backend().content.listVolunteers()).rejects.toThrow("vol-list");
  });

  it("saves volunteer with provided id", async () => {
    client.setNext({ data: volunteerRow, error: null });
    const result = await backend().content.saveVolunteer({
      id: "v1",
      name: "Miguel",
      role: "som",
      sortOrder: 0
    });
    expect(result.id).toBe("v1");
    expect(client.queries[0]?.upsert).toHaveBeenCalledWith({
      id: "v1",
      name: "Miguel",
      role: "som",
      sort_order: 0
    });
  });

  it("saves volunteer generating id when missing", async () => {
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("vol-uuid-1-2-3");
    client.setNext({ data: { ...volunteerRow, id: "vol-uuid-1-2-3" }, error: null });

    await backend().content.saveVolunteer({
      name: "Miguel",
      role: "som",
      sortOrder: 5
    });

    expect(client.queries[0]?.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "vol-uuid-1-2-3", sort_order: 5 })
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
