import {
  type AdminSession,
  type Announcement,
  type AnnouncementInput,
  type AuthGateway,
  type ChurchBackend,
  type ChurchProfile,
  type ContentRepository,
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
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

interface SupabaseOptions {
  url: string;
  anonKey: string;
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

function mapProfile(row: JsonObject): ChurchProfile {
  return {
    id: String(row.id),
    name: String(row.name),
    shortName: String(row.short_name),
    tagline: String(row.tagline),
    city: String(row.city),
    pastorName: String(row.pastor_name),
    address: String(row.address),
    email: String(row.email),
    whatsapp: String(row.whatsapp),
    instagramUrl: String(row.instagram_url),
    youtubeUrl: String(row.youtube_url),
    mapsUrl: String(row.maps_url),
    heroVerse: String(row.hero_verse),
    mission: String(row.mission),
    foundedText: String(row.founded_text),
    regularMeetings: (row.regular_meetings ?? []) as ChurchProfile["regularMeetings"],
    updatedAt: String(row.updated_at)
  };
}

function toProfileRow(profile: ChurchProfile): JsonObject {
  return {
    id: profile.id,
    name: profile.name,
    short_name: profile.shortName,
    tagline: profile.tagline,
    city: profile.city,
    pastor_name: profile.pastorName,
    address: profile.address,
    email: profile.email,
    whatsapp: profile.whatsapp,
    instagram_url: profile.instagramUrl,
    youtube_url: profile.youtubeUrl,
    maps_url: profile.mapsUrl,
    hero_verse: profile.heroVerse,
    mission: profile.mission,
    founded_text: profile.foundedText,
    regular_meetings: profile.regularMeetings,
    updated_at: new Date().toISOString()
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

function mapMinistry(row: JsonObject): Ministry {
  return {
    id: String(row.id),
    name: String(row.name),
    summary: String(row.summary),
    meetingTime: String(row.meeting_time),
    contact: String(row.contact),
    color: String(row.color)
  };
}

function toMinistryRow(input: Ministry): JsonObject {
  return {
    id: input.id,
    name: input.name,
    summary: input.summary,
    meeting_time: input.meetingTime,
    contact: input.contact,
    color: input.color
  };
}

function mapSchedule(row: JsonObject): ScheduleItem {
  return {
    id: String(row.id),
    title: String(row.title),
    ministry: String(row.ministry),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    location: String(row.location),
    summary: String(row.summary),
    preacher: String(row.preacher),
    director: String(row.director),
    passage: String(row.passage),
    specialDate: String(row.special_date),
    googleEventId: String(row.google_event_id),
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
    passage: input.passage,
    special_date: input.specialDate,
    google_event_id: input.googleEventId,
    status: input.status,
    featured: input.featured
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
  constructor(private readonly client: SupabaseClient) {}

  async getSnapshot() {
    const [profile, announcements, ministries, schedule] = await Promise.all([
      this.getProfile(),
      this.listAnnouncements(),
      this.listMinistries(),
      this.listSchedule()
    ]);

    return { profile, announcements, ministries, schedule };
  }

  async getProfile() {
    const { data, error } = await this.client.from("church_profile").select("*").eq("id", "main").single();
    return mapProfile(requireData(data as JsonObject | null, error));
  }

  async updateProfile(profile: ChurchProfile) {
    const row = toProfileRow(profile);
    const { data, error } = await this.client
      .from("church_profile")
      .upsert(row)
      .select("*")
      .single();
    return mapProfile(requireData(data as JsonObject | null, error));
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

  async listMinistries() {
    const { data, error } = await this.client.from("ministries").select("*").order("name");
    return sortMinistries(requireData(data as JsonObject[] | null, error).map(mapMinistry));
  }

  async saveMinistry(input: MinistryInput) {
    const item: Ministry = {
      id: input.id ?? crypto.randomUUID(),
      name: input.name,
      summary: input.summary,
      meetingTime: input.meetingTime,
      contact: input.contact,
      color: input.color
    };
    const { data, error } = await this.client
      .from("ministries")
      .upsert(toMinistryRow(item))
      .select("*")
      .single();
    return mapMinistry(requireData(data as JsonObject | null, error));
  }

  async deleteMinistry(id: string) {
    const { error } = await this.client.from("ministries").delete().eq("id", id);
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
      passage: input.passage,
      specialDate: input.specialDate,
      googleEventId: input.googleEventId,
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

  async createPrayerRequest(input: PrayerRequestInput) {
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

export function createSupabaseBackend(options: SupabaseOptions): ChurchBackend {
  if (!options.url || !options.anonKey) {
    throw new Error("VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorios.");
  }

  const client = createClient(options.url, options.anonKey);

  return {
    mode: "supabase",
    content: new SupabaseContentRepository(client),
    auth: new SupabaseAuthGateway(client)
  };
}
