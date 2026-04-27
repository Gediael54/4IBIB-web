import { createMockBackend, MOCK_ADMIN } from "./index";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("starts with an empty content snapshot", async () => {
  const backend = createMockBackend();
  const snapshot = await backend.content.getSnapshot();

  expect(backend.mode).toBe("mock");
  expect(snapshot.profile.id).toBe("main");
  expect(snapshot.announcements).toEqual([]);
  expect(snapshot.ministries).toEqual([]);
  expect(snapshot.schedule).toEqual([]);
});

it("updates profile data", async () => {
  const backend = createMockBackend();
  const profile = await backend.content.getProfile();
  const updated = await backend.content.updateProfile({ ...profile, city: "Manaus, AM" });

  expect(updated.city).toBe("Manaus, AM");
  expect((await backend.content.getProfile()).city).toBe("Manaus, AM");
});

it("creates, updates and deletes announcements", async () => {
  const backend = createMockBackend();
  const sibling = await backend.content.saveAnnouncement({
    title: "Outro aviso",
    summary: "Resumo",
    category: "geral",
    publishedAt: "2030-01-01T08:00:00.000Z",
    pinned: false,
    ctaLabel: "",
    ctaUrl: ""
  });
  const created = await backend.content.saveAnnouncement({
    title: "Novo aviso",
    summary: "Resumo",
    category: "geral",
    publishedAt: "2030-01-01T10:00:00.000Z",
    pinned: false,
    ctaLabel: "Abrir",
    ctaUrl: "#"
  });
  const updated = await backend.content.saveAnnouncement({ ...created, title: "Aviso editado" });

  expect(updated.id).toBe(created.id);
  const list = await backend.content.listAnnouncements();
  expect(list.some((item) => item.title === "Aviso editado")).toBe(true);
  expect(list.some((item) => item.id === sibling.id)).toBe(true);

  await backend.content.deleteAnnouncement(created.id);

  expect((await backend.content.listAnnouncements()).some((item) => item.id === created.id)).toBe(false);
});

it("creates, updates and deletes ministries", async () => {
  const backend = createMockBackend();
  const created = await backend.content.saveMinistry({
    name: "Recepcao",
    summary: "Acolhimento",
    meetingTime: "Domingo",
    contact: "Equipe",
    color: "#111111"
  });
  const updated = await backend.content.saveMinistry({ ...created, contact: "Nova equipe" });

  expect(updated.id).toBe(created.id);
  expect((await backend.content.listMinistries()).some((item) => item.contact === "Nova equipe")).toBe(true);

  await backend.content.deleteMinistry(created.id);

  expect((await backend.content.listMinistries()).some((item) => item.id === created.id)).toBe(false);
});

it("creates, updates and deletes schedule items", async () => {
  const backend = createMockBackend();
  const created = await backend.content.saveScheduleItem({
    title: "Reuniao",
    ministry: "Diretoria",
    startsAt: "2030-01-01T10:00:00.000Z",
    endsAt: "2030-01-01T11:00:00.000Z",
    location: "Sala",
    summary: "Planejamento",
    preacher: "Pastor",
    director: "",
    passage: "",
    specialDate: "",
    googleEventId: "",
    status: "scheduled",
    featured: false
  });
  const updated = await backend.content.saveScheduleItem({ ...created, featured: true });

  expect(updated.featured).toBe(true);
  expect((await backend.content.listSchedule()).some((item) => item.id === created.id)).toBe(true);

  await backend.content.deleteScheduleItem(created.id);

  expect((await backend.content.listSchedule()).some((item) => item.id === created.id)).toBe(false);
});

it("persists all extended schedule fields through save and reload", async () => {
  const backend = createMockBackend();
  const saved = await backend.content.saveScheduleItem({
    title: "Culto Solene",
    ministry: "Culto",
    startsAt: "2030-04-21T20:00:00.000Z",
    endsAt: "2030-04-21T22:00:00.000Z",
    location: "Templo principal",
    summary: "Resumo do culto",
    preacher: "Pr. Augusto Lopes",
    director: "Diac. Ana",
    passage: "Marcos 1",
    specialDate: "PASCOA",
    googleEventId: "abc@google.com",
    status: "scheduled",
    featured: true
  });

  const reloaded = (await backend.content.listSchedule()).find((item) => item.id === saved.id);
  expect(reloaded).toEqual(saved);
  expect(reloaded?.preacher).toBe("Pr. Augusto Lopes");
  expect(reloaded?.director).toBe("Diac. Ana");
  expect(reloaded?.passage).toBe("Marcos 1");
  expect(reloaded?.specialDate).toBe("PASCOA");
  expect(reloaded?.googleEventId).toBe("abc@google.com");
  expect(reloaded?.status).toBe("scheduled");
});

it("keeps suspended and free schedule items in listSchedule but not in upcoming", async () => {
  const backend = createMockBackend();
  await backend.content.saveScheduleItem({
    title: "Culto Suspenso",
    ministry: "Culto",
    startsAt: "2030-05-01T20:00:00.000Z",
    endsAt: "2030-05-01T22:00:00.000Z",
    location: "",
    summary: "",
    preacher: "",
    director: "",
    passage: "",
    specialDate: "",
    googleEventId: "",
    status: "suspended",
    featured: false
  });
  await backend.content.saveScheduleItem({
    title: "Livre",
    ministry: "Geral",
    startsAt: "2030-05-08T20:00:00.000Z",
    endsAt: "2030-05-08T22:00:00.000Z",
    location: "",
    summary: "",
    preacher: "",
    director: "",
    passage: "",
    specialDate: "",
    googleEventId: "",
    status: "free",
    featured: false
  });

  const all = await backend.content.listSchedule();
  expect(all.map((item) => item.status).sort()).toEqual(["free", "suspended"]);
});

it("creates and updates prayer requests", async () => {
  const backend = createMockBackend();
  const firstRequest = await backend.content.createPrayerRequest({
    name: "Joao",
    contact: "",
    message: "Outro pedido"
  });
  const request = await backend.content.createPrayerRequest({
    name: "Maria",
    contact: "5595",
    message: "Pedido"
  });

  expect(request.status).toBe("novo");

  await backend.content.updatePrayerRequestStatus(request.id, "em_oracao");

  const requests = await backend.content.listPrayerRequests();

  expect(requests.find((item) => item.id === request.id)?.status).toBe("em_oracao");
  expect(requests.find((item) => item.id === firstRequest.id)?.status).toBe("novo");
});

it("handles mock authentication lifecycle", async () => {
  const backend = createMockBackend();
  const sessions: Array<string | null> = [];
  const unsubscribe = backend.auth.subscribe((session) => sessions.push(session?.email ?? null));

  await expect(backend.auth.signIn("wrong@example.com", "bad")).rejects.toThrow("Credenciais invalidas.");

  const session = await backend.auth.signIn(MOCK_ADMIN.email, MOCK_ADMIN.password);

  expect(session.email).toBe(MOCK_ADMIN.email);
  expect(await backend.auth.getSession()).toEqual(session);

  await backend.auth.signOut();
  unsubscribe();

  expect(await backend.auth.getSession()).toBeNull();
  expect(sessions).toContain(null);
  expect(sessions).toContain(MOCK_ADMIN.email);
});

it("resets invalid local storage state", async () => {
  window.localStorage.setItem("4ibib.mock.store.v1", "{bad json");
  window.localStorage.setItem("4ibib.mock.session.v1", "{bad json");

  const backend = createMockBackend();

  expect((await backend.content.getSnapshot()).profile.id).toBe("main");
  expect(await backend.auth.getSession()).toBeNull();
});

it("works when browser storage is unavailable", async () => {
  vi.stubGlobal("window", undefined);
  const backend = createMockBackend();
  const sessions: Array<string | null> = [];
  const unsubscribe = backend.auth.subscribe((session) => sessions.push(session?.email ?? null));

  expect((await backend.content.getSnapshot()).profile.id).toBe("main");

  await backend.auth.signIn(MOCK_ADMIN.email, MOCK_ADMIN.password);
  await backend.auth.signOut();
  unsubscribe();

  expect(await backend.auth.getSession()).toBeNull();
  expect(sessions).toEqual([null, MOCK_ADMIN.email, null]);
});

it("falls back when localStorage access throws", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new Error("blocked");
    }
  });

  const backend = createMockBackend();

  expect((await backend.content.getSnapshot()).profile.id).toBe("main");
  await backend.auth.signIn(MOCK_ADMIN.email, MOCK_ADMIN.password);
  expect(await backend.auth.getSession()).toBeNull();

  if (descriptor) {
    Object.defineProperty(window, "localStorage", descriptor);
  }
});
