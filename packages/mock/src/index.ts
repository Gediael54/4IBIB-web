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

const STORE_KEY = "4ibib.mock.store.v1";
const SESSION_KEY = "4ibib.mock.session.v1";

export const MOCK_ADMIN = {
  email: "admin@4ibib.local",
  password: "123456"
};

function isoDaysAhead(days: number, hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

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
      name: "4a Igreja Batista Betel",
      shortName: "4a Betel",
      tagline: "Uma igreja para servir a cidade com Palavra, comunhao e cuidado.",
      city: "Boa Vista, RR",
      pastorName: "Pr. Samuel Costa",
      address: "Av. Central, 420 - Centro",
      email: "contato@4abetel.org",
      whatsapp: "5595980000000",
      instagramUrl: "https://www.instagram.com/4abetel",
      youtubeUrl: "https://www.youtube.com/@4abetel",
      mapsUrl: "https://maps.google.com/?q=Av.+Central,+420+-+Centro",
      heroVerse: "Assim brilhe a luz de voces diante dos homens. Mateus 5:16",
      mission: "Cultivar discipulos de Jesus que servem com excelencia, oracao e acolhimento.",
      foundedText: "Desde 1986 servindo familias e formando lideres.",
      regularMeetings: [
        {
          id: "domingo-manha",
          title: "Escola Biblica",
          weekday: "Domingo",
          time: "09:00",
          description: "Classes por faixa etaria e cafe comunitario."
        },
        {
          id: "domingo-noite",
          title: "Culto de Celebracao",
          weekday: "Domingo",
          time: "18:30",
          description: "Louvor congregacional, mensagem e recepcao aos visitantes."
        },
        {
          id: "quarta",
          title: "Culto de Oracao",
          weekday: "Quarta",
          time: "19:30",
          description: "Intercessao, estudo biblico e cuidado pastoral."
        }
      ],
      updatedAt: nowIso()
    },
    announcements: [
      {
        id: "conferencia",
        title: "Conferencia de Avivamento",
        summary: "Tres noites com preletores convidados, ministerio infantil e recepcao especial.",
        category: "evento",
        publishedAt: isoDaysAhead(3, 9, 0),
        pinned: true,
        ctaLabel: "Ver programacao",
        ctaUrl: "#programacao"
      },
      {
        id: "cestas",
        title: "Campanha de cestas basicas",
        summary: "Receberemos alimentos e itens de higiene ate a ultima quarta-feira do mes.",
        category: "geral",
        publishedAt: isoDaysAhead(1, 8, 0),
        pinned: true,
        ctaLabel: "Falar com a equipe",
        ctaUrl: "https://wa.me/5595980000000"
      },
      {
        id: "retiro",
        title: "Retiro da juventude",
        summary: "Inscricoes abertas para jovens e adolescentes. Vagas limitadas.",
        category: "juventude",
        publishedAt: isoDaysAhead(8, 10, 30),
        pinned: false,
        ctaLabel: "Reservar vaga",
        ctaUrl: "https://wa.me/5595980000000?text=Quero%20participar%20do%20retiro"
      }
    ],
    ministries: [
      {
        id: "louvor",
        name: "Louvor e Midia",
        summary: "Musica, som, transmissao e apoio tecnico dos cultos.",
        meetingTime: "Sexta, 20:00",
        contact: "Ana Paula",
        color: "#b45309"
      },
      {
        id: "infantil",
        name: "Infantil",
        summary: "Acolhimento e ensino biblico para criancas durante os cultos.",
        meetingTime: "Domingo, 18:30",
        contact: "Iris Nascimento",
        color: "#0f766e"
      },
      {
        id: "acao-social",
        name: "Acao Social",
        summary: "Visitas, cestas, escuta e cuidado pratico com familias.",
        meetingTime: "Sabado, 08:00",
        contact: "Lucas Menezes",
        color: "#be123c"
      },
      {
        id: "ensino",
        name: "Ensino",
        summary: "Escola biblica, discipulado e formacao de liderancas.",
        meetingTime: "Domingo, 09:00",
        contact: "Equipe pastoral",
        color: "#2563eb"
      }
    ],
    schedule: [
      {
        id: "domingo-celebracao",
        title: "Culto de Celebracao",
        ministry: "Igreja",
        startsAt: isoDaysAhead(1, 18, 30),
        endsAt: isoDaysAhead(1, 20, 30),
        location: "Templo principal",
        summary: "Louvor, mensagem e recepcao aos visitantes.",
        leader: "Pr. Samuel Costa",
        featured: true
      },
      {
        id: "quarta-oracao",
        title: "Culto de Oracao",
        ministry: "Intercessao",
        startsAt: isoDaysAhead(4, 19, 30),
        endsAt: isoDaysAhead(4, 21, 0),
        location: "Templo principal",
        summary: "Noite de intercessao e estudo biblico.",
        leader: "Pra. Debora Almeida",
        featured: true
      },
      {
        id: "ensaio-louvor",
        title: "Ensaio do Louvor",
        ministry: "Louvor e Midia",
        startsAt: isoDaysAhead(6, 20, 0),
        endsAt: isoDaysAhead(6, 22, 0),
        location: "Sala de musica",
        summary: "Alinhamento musical e tecnico da semana.",
        leader: "Ana Paula",
        featured: false
      },
      {
        id: "ebd",
        title: "Escola Biblica",
        ministry: "Ensino",
        startsAt: isoDaysAhead(8, 9, 0),
        endsAt: isoDaysAhead(8, 10, 30),
        location: "Salas por classe",
        summary: "Turmas infantis, jovens e adultos.",
        leader: "Equipe de ensino",
        featured: false
      }
    ],
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
      leader: input.leader,
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
