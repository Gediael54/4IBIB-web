import {
  type AdminRole,
  type AdminSession,
  type AdminUser,
  type Announcement,
  type AnnouncementInput,
  type AuditAction,
  type AuditLogEntry,
  type AuditLogFilter,
  type AuthGateway,
  type ChurchBackend,
  type ChurchProfile,
  type ChurchProfileInput,
  type ContentRepository,
  type InviteAdminInput,
  type MinistryInput,
  type MinistryRecord,
  type PrayerRequest,
  type PrayerRequestInput,
  type PrayerRequestPatch,
  type PrayerStatus,
  type RecurringMeetingInput,
  type RecurringMeetingRecord,
  type RenameVolunteerInput,
  type ScheduleBulkPatch,
  type ScheduleItem,
  type ScheduleItemInput,
  type SiteSnapshot,
  type Volunteer,
  type VolunteerInput,
  sortAdmins,
  sortAnnouncements,
  sortAuditLog,
  sortMinistries,
  sortRecurringMeetings,
  sortSchedule,
  sortVolunteers
} from "@4ibib/core";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

interface SupabaseOptions {
  url: string;
  anonKey: string;
  prayerEndpoint?: string;
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

function requireOk(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
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

function asString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  return [];
}

function stripSeconds(value: unknown): string {
  const text = asString(value);
  if (text.length >= 5 && text[2] === ":") {
    return text.slice(0, 5);
  }
  return text;
}

function mapAnnouncement(row: JsonObject): Announcement {
  return {
    id: String(row.id),
    title: String(row.title),
    summary: String(row.summary),
    category: row.category as Announcement["category"],
    publishedAt: String(row.published_at),
    pinned: Boolean(row.pinned),
    ctaLabel: asString(row.cta_label),
    ctaUrl: asString(row.cta_url),
    status: (row.status as Announcement["status"] | undefined) ?? "published",
    expiresAt: row.expires_at === null || row.expires_at === undefined ? null : String(row.expires_at),
    imageUrl: asString(row.image_url)
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
    cta_url: input.ctaUrl,
    status: input.status,
    expires_at: input.expiresAt,
    image_url: input.imageUrl
  };
}

function mapSchedule(row: JsonObject): ScheduleItem {
  return {
    id: String(row.id),
    title: String(row.title),
    ministry: asString(row.ministry),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    location: String(row.location),
    summary: String(row.summary),
    preacher: String(row.preacher),
    director: String(row.director),
    soundTeam: asString(row.sound_team),
    passage: String(row.passage),
    occasionLabel: asString(row.occasion_label),
    status: row.status as ScheduleItem["status"],
    featured: Boolean(row.featured),
    seriesId: row.series_id === null || row.series_id === undefined ? null : String(row.series_id)
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
    featured: input.featured,
    series_id: input.seriesId
  };
}

function bulkPatchToRow(patch: ScheduleBulkPatch): JsonObject {
  const row: JsonObject = {};
  if (patch.preacher !== undefined) row.preacher = patch.preacher;
  if (patch.director !== undefined) row.director = patch.director;
  if (patch.soundTeam !== undefined) row.sound_team = patch.soundTeam;
  if (patch.ministry !== undefined) row.ministry = patch.ministry;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.occasionLabel !== undefined) row.occasion_label = patch.occasionLabel;
  if (patch.featured !== undefined) row.featured = patch.featured;
  return row;
}

function mapVolunteer(row: JsonObject): Volunteer {
  const rawRole = asString(row.role, "geral");
  return {
    id: String(row.id),
    name: String(row.name),
    role: rawRole === "som" ? "som" : "geral",
    sortOrder: Number(row.sort_order ?? 0),
    contact: asString(row.contact),
    photoUrl: asString(row.photo_url),
    ministries: asStringArray(row.ministries),
    unavailableDates: asStringArray(row.unavailable_dates),
    notes: asString(row.notes)
  };
}

function toVolunteerRow(input: Volunteer): JsonObject {
  return {
    id: input.id,
    name: input.name,
    role: input.role,
    sort_order: input.sortOrder,
    contact: input.contact,
    photo_url: input.photoUrl,
    ministries: input.ministries,
    unavailable_dates: input.unavailableDates,
    notes: input.notes
  };
}

function mapPrayer(row: JsonObject): PrayerRequest {
  return {
    id: String(row.id),
    name: String(row.name),
    contact: asString(row.contact),
    message: String(row.message),
    createdAt: String(row.created_at),
    status: row.status as PrayerRequest["status"],
    pastoralNotes: asString(row.pastoral_notes),
    assignedTo: row.assigned_to === null || row.assigned_to === undefined ? null : String(row.assigned_to),
    seenAt: row.seen_at === null || row.seen_at === undefined ? null : String(row.seen_at)
  };
}

function prayerPatchToRow(patch: PrayerRequestPatch): JsonObject {
  const row: JsonObject = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.pastoralNotes !== undefined) row.pastoral_notes = patch.pastoralNotes;
  if (patch.assignedTo !== undefined) row.assigned_to = patch.assignedTo;
  if (patch.seenAt !== undefined) row.seen_at = patch.seenAt;
  return row;
}

function mapProfile(row: JsonObject): ChurchProfile {
  return {
    id: "main",
    name: asString(row.name),
    shortName: asString(row.short_name),
    tagline: asString(row.tagline),
    city: asString(row.city),
    pastorName: asString(row.pastor_name),
    address: asString(row.address),
    email: asString(row.email),
    whatsapp: asString(row.whatsapp),
    instagramUrl: asString(row.instagram_url),
    youtubeUrl: asString(row.youtube_url),
    mapsUrl: asString(row.maps_url),
    heroVerse: asString(row.hero_verse),
    mission: asString(row.mission)
  };
}

function toProfileRow(input: ChurchProfileInput): JsonObject {
  return {
    id: "main",
    name: input.name,
    short_name: input.shortName,
    tagline: input.tagline,
    city: input.city,
    pastor_name: input.pastorName,
    address: input.address,
    email: input.email,
    whatsapp: input.whatsapp,
    instagram_url: input.instagramUrl,
    youtube_url: input.youtubeUrl,
    maps_url: input.mapsUrl,
    hero_verse: input.heroVerse,
    mission: input.mission
  };
}

function mapMinistry(row: JsonObject): MinistryRecord {
  return {
    id: String(row.id),
    slug: asString(row.slug),
    name: String(row.name),
    summary: asString(row.summary),
    meetingTime: asString(row.meeting_time),
    contact: asString(row.contact),
    color: asString(row.color),
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function toMinistryRow(input: MinistryRecord): JsonObject {
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    summary: input.summary,
    meeting_time: input.meetingTime,
    contact: input.contact,
    color: input.color,
    sort_order: input.sortOrder
  };
}

function mapRecurringMeeting(row: JsonObject): RecurringMeetingRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    weekday: Number(row.weekday ?? 0),
    startsAt: stripSeconds(row.starts_at),
    endsAt: stripSeconds(row.ends_at),
    description: asString(row.description),
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function toRecurringMeetingRow(input: RecurringMeetingRecord): JsonObject {
  return {
    id: input.id,
    title: input.title,
    weekday: input.weekday,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    description: input.description,
    sort_order: input.sortOrder
  };
}

// admin_users so possui user_id, role e created_at no banco. email e displayName
// vem da auth.users e exigem service_role para serem buscados. Phase 4 vai
// adicionar uma funcao Postgres ou edge function para enriquecer; por enquanto
// retornamos os campos vazios.
function mapAdminUser(row: JsonObject): AdminUser {
  return {
    userId: String(row.user_id),
    email: asString(row.email),
    displayName: asString(row.display_name),
    role: row.role as AdminRole,
    createdAt: asString(row.created_at)
  };
}

function mapAuditLog(row: JsonObject): AuditLogEntry {
  return {
    id: String(row.id),
    tableName: String(row.table_name),
    rowId: String(row.row_id),
    action: row.action as AuditAction,
    changedBy: row.changed_by === null || row.changed_by === undefined ? null : String(row.changed_by),
    changedAt: String(row.changed_at),
    oldRow: (row.old_row as Record<string, unknown> | null | undefined) ?? null,
    newRow: (row.new_row as Record<string, unknown> | null | undefined) ?? null
  };
}

class SupabaseContentRepository implements ContentRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly prayerEndpoint = ""
  ) {}

  async getSnapshot(): Promise<SiteSnapshot> {
    const [announcements, schedule, volunteers, profile, ministries, recurringMeetings] = await Promise.all([
      this.listAnnouncements(),
      this.listSchedule(),
      this.listVolunteers(),
      this.getProfile(),
      this.listMinistries(),
      this.listRecurringMeetings()
    ]);
    return { announcements, schedule, volunteers, profile, ministries, recurringMeetings };
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
      ctaUrl: input.ctaUrl,
      status: input.status ?? "published",
      expiresAt: input.expiresAt ?? null,
      imageUrl: input.imageUrl ?? ""
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
    requireOk(error);
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
      featured: input.featured,
      seriesId: input.seriesId ?? null
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
    requireOk(error);
  }

  async duplicateScheduleItem(id: string) {
    const { data: original, error: readError } = await this.client
      .from("schedule_items")
      .select("*")
      .eq("id", id)
      .single();
    const sourceRow = requireData(original as JsonObject | null, readError);
    const source = mapSchedule(sourceRow);
    const clone: ScheduleItem = {
      ...source,
      id: crypto.randomUUID(),
      featured: false
    };
    const { data, error } = await this.client
      .from("schedule_items")
      .insert(toScheduleRow(clone))
      .select("*")
      .single();
    return mapSchedule(requireData(data as JsonObject | null, error));
  }

  async bulkUpdateScheduleItems(ids: string[], patch: ScheduleBulkPatch) {
    const payload = bulkPatchToRow(patch);
    const { data, error } = await this.client
      .from("schedule_items")
      .update(payload)
      .in("id", ids)
      .select("*");
    return sortSchedule(requireData(data as JsonObject[] | null, error).map(mapSchedule));
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
      sortOrder: input.sortOrder,
      contact: input.contact ?? "",
      photoUrl: input.photoUrl ?? "",
      ministries: input.ministries ?? [],
      unavailableDates: input.unavailableDates ?? [],
      notes: input.notes ?? ""
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
    requireOk(error);
  }

  async renameVolunteer(input: RenameVolunteerInput) {
    const cascade = input.cascade === true;
    const { data: current, error: readError } = await this.client
      .from("volunteers")
      .select("*")
      .eq("id", input.id)
      .single();
    const oldRow = requireData(current as JsonObject | null, readError);
    const oldName = String(oldRow.name);

    const { data: updated, error: updateError } = await this.client
      .from("volunteers")
      .update({ name: input.newName })
      .eq("id", input.id)
      .select("*")
      .single();
    const volunteer = mapVolunteer(requireData(updated as JsonObject | null, updateError));

    if (!cascade || oldName === input.newName) {
      return { volunteer, updatedScheduleItems: 0 };
    }

    const preacherUpdate = await this.client
      .from("schedule_items")
      .update({ preacher: input.newName })
      .eq("preacher", oldName)
      .select("id");
    requireOk(preacherUpdate.error);

    const directorUpdate = await this.client
      .from("schedule_items")
      .update({ director: input.newName })
      .eq("director", oldName)
      .select("id");
    requireOk(directorUpdate.error);

    const preacherCount = ((preacherUpdate.data as unknown[] | null) ?? []).length;
    const directorCount = ((directorUpdate.data as unknown[] | null) ?? []).length;

    return { volunteer, updatedScheduleItems: preacherCount + directorCount };
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

  async updatePrayerRequestStatus(id: string, status: PrayerStatus) {
    const { error } = await this.client.from("prayer_requests").update({ status }).eq("id", id);
    requireOk(error);
  }

  async updatePrayerRequest(id: string, patch: PrayerRequestPatch) {
    const { data, error } = await this.client
      .from("prayer_requests")
      .update(prayerPatchToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    return mapPrayer(requireData(data as JsonObject | null, error));
  }

  async getProfile() {
    const { data, error } = await this.client
      .from("church_profile")
      .select("*")
      .eq("id", "main")
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return null;
    }
    return mapProfile(data as JsonObject);
  }

  async saveProfile(input: ChurchProfileInput) {
    const { data, error } = await this.client
      .from("church_profile")
      .upsert(toProfileRow(input))
      .select("*")
      .single();
    return mapProfile(requireData(data as JsonObject | null, error));
  }

  async listMinistries() {
    const { data, error } = await this.client
      .from("ministries")
      .select("*")
      .order("sort_order", { ascending: true });
    return sortMinistries(requireData(data as JsonObject[] | null, error).map(mapMinistry));
  }

  async saveMinistry(input: MinistryInput) {
    const item: MinistryRecord = {
      id: input.id ?? crypto.randomUUID(),
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      meetingTime: input.meetingTime,
      contact: input.contact,
      color: input.color,
      sortOrder: input.sortOrder
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
    requireOk(error);
  }

  async listRecurringMeetings() {
    const { data, error } = await this.client
      .from("recurring_meetings")
      .select("*")
      .order("sort_order", { ascending: true });
    return sortRecurringMeetings(requireData(data as JsonObject[] | null, error).map(mapRecurringMeeting));
  }

  async saveRecurringMeeting(input: RecurringMeetingInput) {
    const item: RecurringMeetingRecord = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      weekday: input.weekday,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      description: input.description,
      sortOrder: input.sortOrder
    };
    const { data, error } = await this.client
      .from("recurring_meetings")
      .upsert(toRecurringMeetingRow(item))
      .select("*")
      .single();
    return mapRecurringMeeting(requireData(data as JsonObject | null, error));
  }

  async deleteRecurringMeeting(id: string) {
    const { error } = await this.client.from("recurring_meetings").delete().eq("id", id);
    requireOk(error);
  }

  // admin_users guarda apenas user_id, role e created_at. email/displayName
  // dependem de service_role para consultar auth.users; ate la os campos vem
  // vazios (Phase 4 deve adicionar uma view enriquecida ou edge function).
  async listAdmins() {
    const { data, error } = await this.client.from("admin_users").select("*");
    return sortAdmins(requireData(data as JsonObject[] | null, error).map(mapAdminUser));
  }

  async inviteAdmin(_input: InviteAdminInput): Promise<AdminUser> {
    void _input;
    throw new Error("inviteAdmin requer service_role; sera completado na Fase 4");
  }

  async updateAdminRole(userId: string, role: AdminRole) {
    const { data, error } = await this.client
      .from("admin_users")
      .update({ role })
      .eq("user_id", userId)
      .select("*")
      .single();
    return mapAdminUser(requireData(data as JsonObject | null, error));
  }

  async removeAdmin(userId: string) {
    const { error } = await this.client.from("admin_users").delete().eq("user_id", userId);
    requireOk(error);
  }

  async listAuditLog(filter: AuditLogFilter = {}) {
    let query = this.client.from("content_audit_log").select("*").order("changed_at", { ascending: false });

    if (filter.tableName !== undefined) {
      query = query.eq("table_name", filter.tableName);
    }
    if (filter.rowId !== undefined) {
      query = query.eq("row_id", filter.rowId);
    }
    if (filter.changedBy !== undefined) {
      query = query.eq("changed_by", filter.changedBy);
    }
    if (filter.action !== undefined) {
      query = query.eq("action", filter.action);
    }
    if (filter.since !== undefined) {
      query = query.gte("changed_at", filter.since);
    }
    if (filter.until !== undefined) {
      query = query.lte("changed_at", filter.until);
    }
    if (filter.limit !== undefined) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;
    return sortAuditLog(requireData(data as JsonObject[] | null, error).map(mapAuditLog));
  }

  async revertAuditEntry(_id: string): Promise<void> {
    void _id;
    throw new Error("Reverter sera implementado na Fase 4 via funcao Postgres");
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
