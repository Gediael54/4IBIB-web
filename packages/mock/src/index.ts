import {
  type AdminSession,
  type Announcement,
  type AnnouncementInput,
  type AuthGateway,
  type ChurchBackend,
  type ChurchProfile,
  type ContentRepository,
  createId,
  type Ministry,
  type MinistryInput,
  type PrayerRequest,
  type PrayerRequestInput,
  type ScheduleItem,
  type ScheduleItemInput,
  sortAnnouncements,
  sortMinistries,
  sortSchedule
} from "@4ibib/core";

interface MockStore {
  profile: ChurchProfile;
  announcements: Announcement[];
  ministries: Ministry[];
  schedule: ScheduleItem[];
  prayerRequests: PrayerRequest[];
}

const STORE_KEY = "4ibib.mock.store.v2";
const SESSION_KEY = "4ibib.mock.session.v2";

export const MOCK_ADMIN = {
  email: "admin@4ibib.local",
  password: "123456"
};

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function seedStore(): MockStore {
  return {
    profile: {
      id: "main",
      name: "4a Igreja Batista Independente Betel",
      shortName: "4a Betel",
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
      mission: "",
      foundedText: "",
      regularMeetings: [],
      updatedAt: nowIso()
    },
    announcements: [],
    ministries: [],
    schedule: [],
    prayerRequests: []
  };
}

function readStore(): MockStore {
  const storage = getStorage();

  if (!storage) {
    return seedStore();
  }

  const raw = storage.getItem(STORE_KEY);

  if (!raw) {
    const seeded = seedStore();
    storage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(raw) as MockStore;
  } catch {
    const seeded = seedStore();
    storage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(store: MockStore): void {
  const storage = getStorage();

  if (storage) {
    storage.setItem(STORE_KEY, JSON.stringify(store));
  }
}

class MockContentRepository implements ContentRepository {
  async getSnapshot() {
    const store = readStore();
    return {
      profile: clone(store.profile),
      announcements: sortAnnouncements(clone(store.announcements)),
      ministries: sortMinistries(clone(store.ministries)),
      schedule: sortSchedule(clone(store.schedule))
    };
  }

  async getProfile() {
    return clone(readStore().profile);
  }

  async updateProfile(profile: ChurchProfile) {
    const store = readStore();
    store.profile = { ...profile, updatedAt: nowIso() };
    writeStore(store);
    return clone(store.profile);
  }

  async listAnnouncements() {
    return sortAnnouncements(clone(readStore().announcements));
  }

  async saveAnnouncement(input: AnnouncementInput) {
    const store = readStore();
    const item: Announcement = {
      id: input.id ?? createId("announcement"),
      title: input.title,
      summary: input.summary,
      category: input.category,
      publishedAt: input.publishedAt,
      pinned: input.pinned,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl
    };
    store.announcements = upsertById(store.announcements, item);
    writeStore(store);
    return clone(item);
  }

  async deleteAnnouncement(id: string) {
    const store = readStore();
    store.announcements = store.announcements.filter((item) => item.id !== id);
    writeStore(store);
  }

  async listMinistries() {
    return sortMinistries(clone(readStore().ministries));
  }

  async saveMinistry(input: MinistryInput) {
    const store = readStore();
    const item: Ministry = {
      id: input.id ?? createId("ministry"),
      name: input.name,
      summary: input.summary,
      meetingTime: input.meetingTime,
      contact: input.contact,
      color: input.color
    };
    store.ministries = upsertById(store.ministries, item);
    writeStore(store);
    return clone(item);
  }

  async deleteMinistry(id: string) {
    const store = readStore();
    store.ministries = store.ministries.filter((item) => item.id !== id);
    writeStore(store);
  }

  async listSchedule() {
    return sortSchedule(clone(readStore().schedule));
  }

  async saveScheduleItem(input: ScheduleItemInput) {
    const store = readStore();
    const item: ScheduleItem = {
      id: input.id ?? createId("schedule"),
      title: input.title,
      ministry: input.ministry,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      summary: input.summary,
      preacher: input.preacher,
      director: input.director,
      passage: input.passage,
      specialDate: input.specialDate,
      googleEventId: input.googleEventId,
      status: input.status,
      featured: input.featured
    };
    store.schedule = upsertById(store.schedule, item);
    writeStore(store);
    return clone(item);
  }

  async deleteScheduleItem(id: string) {
    const store = readStore();
    store.schedule = store.schedule.filter((item) => item.id !== id);
    writeStore(store);
  }

  async createPrayerRequest(input: PrayerRequestInput) {
    const store = readStore();
    const request: PrayerRequest = {
      id: createId("prayer"),
      name: input.name,
      contact: input.contact,
      message: input.message,
      createdAt: nowIso(),
      status: "novo"
    };
    store.prayerRequests = [request, ...store.prayerRequests];
    writeStore(store);
    return clone(request);
  }

  async listPrayerRequests() {
    return clone(readStore().prayerRequests);
  }

  async updatePrayerRequestStatus(id: string, status: PrayerRequest["status"]) {
    const store = readStore();
    store.prayerRequests = store.prayerRequests.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    writeStore(store);
  }
}

class MockAuthGateway implements AuthGateway {
  private listeners = new Set<(session: AdminSession | null) => void>();

  async getSession() {
    return this.readSession();
  }

  subscribe(listener: (session: AdminSession | null) => void) {
    this.listeners.add(listener);
    listener(this.readSession());

    return () => {
      this.listeners.delete(listener);
    };
  }

  async signIn(email: string, password: string) {
    if (email !== MOCK_ADMIN.email || password !== MOCK_ADMIN.password) {
      throw new Error("Credenciais invalidas.");
    }

    const session: AdminSession = {
      uid: "mock-admin",
      email,
      displayName: "Administrador"
    };

    this.writeSession(session);
    this.emit(session);
    return session;
  }

  async signOut() {
    this.writeSession(null);
    this.emit(null);
  }

  private readSession(): AdminSession | null {
    const storage = getStorage();

    if (!storage) {
      return null;
    }

    const raw = storage.getItem(SESSION_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AdminSession;
    } catch {
      storage.removeItem(SESSION_KEY);
      return null;
    }
  }

  private writeSession(session: AdminSession | null): void {
    const storage = getStorage();

    if (!storage) {
      return;
    }

    if (!session) {
      storage.removeItem(SESSION_KEY);
      return;
    }

    storage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  private emit(session: AdminSession | null): void {
    this.listeners.forEach((listener) => listener(session));
  }
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const exists = items.some((current) => current.id === item.id);

  if (!exists) {
    return [...items, item];
  }

  return items.map((current) => (current.id === item.id ? item : current));
}

export function createMockBackend(): ChurchBackend {
  return {
    mode: "mock",
    content: new MockContentRepository(),
    auth: new MockAuthGateway()
  };
}
