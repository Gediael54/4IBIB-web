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
  prayerEndpoint?: string;
}

type JsonObject = Record<string, unknown>;
const DEFAULT_MINISTRY_COLOR = "#0f766e";

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

function normalizeTime(value: unknown): string {
  const match = String(value ?? "").match(/(\d{1,2})(?::|h)?(\d{2})?/i);
  if (!match) {
    return "";
  }

  const hour = Math.min(23, Number(match[1])).toString().padStart(2, "0");
  const minute = Math.min(59, Number(match[2] ?? "0"))
    .toString()
    .padStart(2, "0");
  return `${hour}:${minute}`;
}

function addMinutes(value: string, minutes: number): string {
  const [hour = "0", minute = "0"] = value.split(":");
  const total = (Number(hour) * 60 + Number(minute) + minutes) % (24 * 60);
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function formatMeetingTime(startsAt: string, endsAt: string): string {
  if (!startsAt && !endsAt) {
    return "";
  }

  if (!endsAt) {
    return startsAt;
  }

  return `${startsAt} - ${endsAt}`;
}

function normalizeRegularMeeting(
  input: Partial<ChurchProfile["regularMeetings"][number]>,
  index: number
): ChurchProfile["regularMeetings"][number] {
  const timeParts = String(input.time ?? "").match(/(\d{1,2}(?::|h)?\d{0,2})/gi) ?? [];
  const startsAt = (input.startsAt ?? normalizeTime(timeParts[0] ?? input.time)) || "00:00";
  const endsAt = (input.endsAt ?? normalizeTime(timeParts[1])) || addMinutes(startsAt, 60);

  return {
    id: String(input.id ?? crypto.randomUUID()),
    title: String(input.title ?? ""),
    weekday: String(input.weekday ?? ""),
    startsAt,
    endsAt,
    time: String(input.time ?? "") || formatMeetingTime(startsAt, endsAt),
    description: String(input.description ?? ""),
    sortOrder: Number(input.sortOrder ?? index)
  };
}

function mapRecurringMeeting(row: JsonObject): ChurchProfile["regularMeetings"][number] {
  const startsAt = normalizeTime(row.starts_at);
  const endsAt = normalizeTime(row.ends_at);

  return {
    id: String(row.id),
    title: String(row.title),
    weekday: String(row.weekday),
    startsAt,
    endsAt,
    time: formatMeetingTime(startsAt, endsAt),
    description: String(row.description ?? ""),
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function mapLegacyRegularMeetings(value: unknown): ChurchProfile["regularMeetings"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) =>
    normalizeRegularMeeting(item as Partial<ChurchProfile["regularMeetings"][number]>, index)
  );
}

function mapProfile(row: JsonObject, regularMeetings?: ChurchProfile["regularMeetings"]): ChurchProfile {
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
    regularMeetings: regularMeetings ?? mapLegacyRegularMeetings(row.regular_meetings),
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
    updated_at: new Date().toISOString()
  };
}

function toRecurringMeetingRows(profileId: string, meetings: ChurchProfile["regularMeetings"]): JsonObject[] {
  return meetings.map((meeting, index) => {
    const normalized = normalizeRegularMeeting(meeting, index);

    return {
      id: normalized.id,
      profile_id: profileId,
      title: normalized.title,
      weekday: normalized.weekday,
      starts_at: normalized.startsAt,
      ends_at: normalized.endsAt,
      description: normalized.description,
      sort_order: normalized.sortOrder
    };
  });
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
    ministryId: String(row.ministry_id ?? ""),
    ministry: getRelatedMinistryName(row),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    location: String(row.location),
    summary: String(row.summary),
    preacher: String(row.preacher),
    director: String(row.director),
    passage: String(row.passage),
    occasionLabel: String(row.occasion_label ?? ""),
    status: row.status as ScheduleItem["status"],
    featured: Boolean(row.featured)
  };
}

function getRelatedMinistryName(row: JsonObject): string {
  const relation = row.ministries;

  if (Array.isArray(relation) && relation[0] && typeof relation[0] === "object") {
    return String((relation[0] as JsonObject).name ?? row.ministry ?? "");
  }

  if (relation && typeof relation === "object") {
    return String((relation as JsonObject).name ?? row.ministry ?? "");
  }

  return String(row.ministry ?? "");
}

function normalizeMinistrySlug(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "geral";
}

function toScheduleRow(input: ScheduleItem, ministryId: string): JsonObject {
  return {
    id: input.id,
    title: input.title,
    ministry_id: ministryId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    location: input.location,
    summary: input.summary,
    preacher: input.preacher,
    director: input.director,
    passage: input.passage,
    occasion_label: input.occasionLabel,
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
  constructor(
    private readonly client: SupabaseClient,
    private readonly prayerEndpoint = ""
  ) {}

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
    const profile = requireData(data as JsonObject | null, error);
    const { data: meetingData, error: meetingError } = await this.client
      .from("recurring_meetings")
      .select("*")
      .eq("profile_id", profile.id)
      .order("sort_order");
    if (meetingError) {
      throw new Error(meetingError.message);
    }

    if (!Array.isArray(meetingData)) {
      return mapProfile(profile);
    }

    const meetings = (meetingData as JsonObject[]).map(mapRecurringMeeting);
    return mapProfile(profile, meetings);
  }

  async updateProfile(profile: ChurchProfile) {
    const row = toProfileRow(profile);
    const { data, error } = await this.client.from("church_profile").upsert(row).select("*").single();
    const savedProfile = requireData(data as JsonObject | null, error);
    const meetingRows = toRecurringMeetingRows(profile.id, profile.regularMeetings);

    const { error: deleteError } = await this.client
      .from("recurring_meetings")
      .delete()
      .eq("profile_id", profile.id);
    requireData(true, deleteError);

    if (meetingRows.length > 0) {
      const { error: insertError } = await this.client.from("recurring_meetings").insert(meetingRows);
      requireData(true, insertError);
    }

    return mapProfile(savedProfile, meetingRows.map(mapRecurringMeeting));
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
    const { data, error } = await this.client
      .from("schedule_items")
      .select("*, ministries(name)")
      .order("starts_at");
    return sortSchedule(requireData(data as JsonObject[] | null, error).map(mapSchedule));
  }

  async saveScheduleItem(input: ScheduleItemInput) {
    const item: ScheduleItem = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      ministryId: input.ministryId,
      ministry: input.ministry,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      summary: input.summary,
      preacher: input.preacher,
      director: input.director,
      passage: input.passage,
      occasionLabel: input.occasionLabel,
      status: input.status,
      featured: input.featured
    };
    const ministryId = item.ministryId || (await this.resolveMinistryId(item.ministry));
    const { data, error } = await this.client
      .from("schedule_items")
      .upsert(toScheduleRow(item, ministryId))
      .select("*, ministries(name)")
      .single();
    return mapSchedule(requireData(data as JsonObject | null, error));
  }

  private async resolveMinistryId(name: string) {
    const ministryName = name.trim() || "Geral";
    const slug = normalizeMinistrySlug(ministryName);
    const { data: existing, error: lookupError } = await this.client
      .from("ministries")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (existing && typeof existing === "object" && "id" in existing) {
      return String((existing as JsonObject).id);
    }

    const { data, error } = await this.client
      .from("ministries")
      .insert({
        name: ministryName,
        summary: "",
        meeting_time: "",
        contact: "",
        color: DEFAULT_MINISTRY_COLOR
      })
      .select("id")
      .single();

    return String(requireData(data as JsonObject | null, error).id);
  }

  async deleteScheduleItem(id: string) {
    const { error } = await this.client.from("schedule_items").delete().eq("id", id);
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

export function createSupabaseBackend(options: SupabaseOptions): ChurchBackend {
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
