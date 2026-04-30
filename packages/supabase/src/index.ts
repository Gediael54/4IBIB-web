import {
  type AdminSession,
  type Announcement,
  type AnnouncementInput,
  type AuthGateway,
  type PrayerRequest,
  type PrayerRequestInput,
  type ScheduleItem,
  type ScheduleItemInput,
  type Volunteer,
  type VolunteerInput,
  sortAnnouncements,
  sortSchedule,
  sortVolunteers
} from "@4ibib/core";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

interface SupabaseOptions {
  url: string;
  anonKey: string;
  prayerEndpoint?: string;
}

interface SiteSnapshot {
  announcements: Announcement[];
  schedule: ScheduleItem[];
  volunteers: Volunteer[];
}

interface ContentRepository {
  getSnapshot(): Promise<SiteSnapshot>;
  listAnnouncements(): Promise<Announcement[]>;
  saveAnnouncement(input: AnnouncementInput): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
  listSchedule(): Promise<ScheduleItem[]>;
  saveScheduleItem(input: ScheduleItemInput): Promise<ScheduleItem>;
  deleteScheduleItem(id: string): Promise<void>;
  listVolunteers(): Promise<Volunteer[]>;
  saveVolunteer(input: VolunteerInput): Promise<Volunteer>;
  deleteVolunteer(id: string): Promise<void>;
  createPrayerRequest(input: PrayerRequestInput): Promise<PrayerRequest>;
  listPrayerRequests(): Promise<PrayerRequest[]>;
  updatePrayerRequestStatus(id: string, status: PrayerRequest["status"]): Promise<void>;
}

interface SupabaseBackend {
  mode: "supabase";
  content: ContentRepository;
  auth: AuthGateway;
}

type JsonObject = Record<string, unknown>;

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Registro nao encontrado no Supabase.");
  }

  return data;
}

function mapUser(user: User | null): AdminSession | null {
  if (!user?.email) {
    return null;
  }

  return {
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.name ?? user.email
  };
}

function mapAnnouncement(row: JsonObject): Announcement {
  return {
    id: String(row.id),
    title: String(row.title),
    summary: String(row.summary),
    category: row.category as Announcement["category"],
    publishedAt: String(row.published_at),
    pinned: Boolean(row.pinned),
    ctaLabel: String(row.cta_label ?? ""),
    ctaUrl: String(row.cta_url ?? "")
  };
}

function toAnnouncementRow(input: Announcement): JsonObject {
  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    category: input.category,
    published_at: input.publishedAt,
    pinned: input.pinned,
    cta_label: input.ctaLabel,
    cta_url: input.ctaUrl
  };
}

function mapSchedule(row: JsonObject): ScheduleItem {
  return {
    id: String(row.id),
    title: String(row.title),
    ministry: String(row.ministry ?? ""),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    location: String(row.location),
    summary: String(row.summary),
    preacher: String(row.preacher),
    director: String(row.director),
    soundTeam: String(row.sound_team ?? ""),
    passage: String(row.passage),
    occasionLabel: String(row.occasion_label ?? ""),
    status: row.status as ScheduleItem["status"],
    featured: Boolean(row.featured)
  };
}

function toScheduleRow(input: ScheduleItem): JsonObject {
  return {
    id: input.id,
    title: input.title,
    ministry: input.ministry,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    location: input.location,
    summary: input.summary,
    preacher: input.preacher,
    director: input.director,
    sound_team: input.soundTeam,
    passage: input.passage,
    occasion_label: input.occasionLabel,
    status: input.status,
    featured: input.featured
  };
}

function mapVolunteer(row: JsonObject): Volunteer {
  const rawRole = String(row.role ?? "geral");
  return {
    id: String(row.id),
    name: String(row.name),
    role: rawRole === "som" ? "som" : "geral",
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function toVolunteerRow(input: Volunteer): JsonObject {
  return {
    id: input.id,
    name: input.name,
    role: input.role,
    sort_order: input.sortOrder
  };
}

function mapPrayer(row: JsonObject): PrayerRequest {
  return {
    id: String(row.id),
    name: String(row.name),
    contact: String(row.contact ?? ""),
    message: String(row.message),
    createdAt: String(row.created_at),
    status: row.status as PrayerRequest["status"]
  };
}

class SupabaseContentRepository implements ContentRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly prayerEndpoint = ""
  ) {}

  async getSnapshot() {
    const [announcements, schedule, volunteers] = await Promise.all([
      this.listAnnouncements(),
      this.listSchedule(),
      this.listVolunteers()
    ]);
    return { announcements, schedule, volunteers };
  }

  async listAnnouncements() {
    const { data, error } = await this.client.from("announcements").select("*").order("published_at", {
      ascending: false
    });
    return sortAnnouncements(requireData(data as JsonObject[] | null, error).map(mapAnnouncement));
  }

  async saveAnnouncement(input: AnnouncementInput) {
    const item: Announcement = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      summary: input.summary,
      category: input.category,
      publishedAt: input.publishedAt,
      pinned: input.pinned,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl
    };
    const { data, error } = await this.client
      .from("announcements")
      .upsert(toAnnouncementRow(item))
      .select("*")
      .single();
    return mapAnnouncement(requireData(data as JsonObject | null, error));
  }

  async deleteAnnouncement(id: string) {
    const { error } = await this.client.from("announcements").delete().eq("id", id);
    requireData(true, error);
  }

  async listSchedule() {
    const { data, error } = await this.client.from("schedule_items").select("*").order("starts_at");
    return sortSchedule(requireData(data as JsonObject[] | null, error).map(mapSchedule));
  }

  async saveScheduleItem(input: ScheduleItemInput) {
    const item: ScheduleItem = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      ministry: input.ministry,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      summary: input.summary,
      preacher: input.preacher,
      director: input.director,
      soundTeam: input.soundTeam,
      passage: input.passage,
      occasionLabel: input.occasionLabel,
      status: input.status,
      featured: input.featured
    };
    const { data, error } = await this.client
      .from("schedule_items")
      .upsert(toScheduleRow(item))
      .select("*")
      .single();
    return mapSchedule(requireData(data as JsonObject | null, error));
  }

  async deleteScheduleItem(id: string) {
    const { error } = await this.client.from("schedule_items").delete().eq("id", id);
    requireData(true, error);
  }

  async listVolunteers() {
    const { data, error } = await this.client
      .from("volunteers")
      .select("*")
      .order("sort_order", { ascending: true });
    return sortVolunteers(requireData(data as JsonObject[] | null, error).map(mapVolunteer));
  }

  async saveVolunteer(input: VolunteerInput) {
    const item: Volunteer = {
      id: input.id ?? crypto.randomUUID(),
      name: input.name,
      role: input.role,
      sortOrder: input.sortOrder
    };
    const { data, error } = await this.client
      .from("volunteers")
      .upsert(toVolunteerRow(item))
      .select("*")
      .single();
    return mapVolunteer(requireData(data as JsonObject | null, error));
  }

  async deleteVolunteer(id: string) {
    const { error } = await this.client.from("volunteers").delete().eq("id", id);
    requireData(true, error);
  }

  async createPrayerRequest(input: PrayerRequestInput) {
    if (this.prayerEndpoint) {
      return this.createPrayerRequestThroughEndpoint(input);
    }

    const { data, error } = await this.client
      .from("prayer_requests")
      .insert({
        name: input.name,
        contact: input.contact,
        message: input.message,
        status: "novo"
      })
      .select("*")
      .single();
    return mapPrayer(requireData(data as JsonObject | null, error));
  }

  private async createPrayerRequestThroughEndpoint(input: PrayerRequestInput) {
    const response = await fetch(this.prayerEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });

    const payload = (await response.json().catch(() => null)) as { data?: JsonObject; error?: string } | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Nao foi possivel enviar o pedido.");
    }

    return mapPrayer(requireData(payload?.data ?? null, null));
  }

  async listPrayerRequests() {
    const { data, error } = await this.client
      .from("prayer_requests")
      .select("*")
      .order("created_at", { ascending: false });
    return requireData(data as JsonObject[] | null, error).map(mapPrayer);
  }

  async updatePrayerRequestStatus(id: string, status: PrayerRequest["status"]) {
    const { error } = await this.client.from("prayer_requests").update({ status }).eq("id", id);
    requireData(true, error);
  }
}

class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly client: SupabaseClient) {}

  async getSession() {
    const { data, error } = await this.client.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    return mapUser(data.session?.user ?? null);
  }

  subscribe(listener: (session: AdminSession | null) => void) {
    const {
      data: { subscription }
    } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(mapUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(error.message);
    }

    const session = mapUser(data.user);

    if (!session) {
      throw new Error("Sessao invalida.");
    }

    return session;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }
}

export function createSupabaseBackend(options: SupabaseOptions): SupabaseBackend {
  if (!options.url || !options.anonKey) {
    throw new Error("VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorios.");
  }

  const client = createClient(options.url, options.anonKey);

  return {
    mode: "supabase",
    content: new SupabaseContentRepository(client, options.prayerEndpoint),
    auth: new SupabaseAuthGateway(client)
  };
}
