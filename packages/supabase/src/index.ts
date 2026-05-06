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
  type Commemoration,
  type CommemorationInput,
  type ContentRepository,
  type MfaAssurance,
  type MfaEnrollment,
  type MfaFactor,
  type Household,
  type InviteAdminInput,
  type Member,
  type MemberDuplicateMatch,
  type MemberRelationship,
  type PublicMember,
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
  sortCommemorations,
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

function nullableId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
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
    seriesId: nullableId(row.series_id),
    youtubeUrl: asString(row.youtube_url),
    preacherMemberId: nullableId(row.preacher_member_id),
    directorMemberId: nullableId(row.director_member_id),
    soundMemberId: nullableId(row.sound_member_id)
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
    series_id: input.seriesId,
    youtube_url: input.youtubeUrl,
    preacher_member_id: input.preacherMemberId ?? null,
    director_member_id: input.directorMemberId ?? null,
    sound_member_id: input.soundMemberId ?? null
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

function mapMember(row: JsonObject): Member {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    preferredName: asString(row.preferred_name),
    birthDate: row.birth_date === null || row.birth_date === undefined ? null : String(row.birth_date),
    maritalStatus: (row.marital_status as Member["maritalStatus"] | null | undefined) ?? null,
    gender: (row.gender as Member["gender"] | null | undefined) ?? null,
    photoUrl: asString(row.photo_url),
    email: asString(row.email),
    phone: asString(row.phone),
    whatsapp: asString(row.whatsapp),
    cpf: row.cpf === null || row.cpf === undefined ? null : String(row.cpf),
    rg: asString(row.rg),
    rgIssuer: asString(row.rg_issuer),
    profession: asString(row.profession),
    address: {
      zip: asString(row.address_zip),
      street: asString(row.address_street),
      number: asString(row.address_number),
      complement: asString(row.address_complement),
      neighborhood: asString(row.address_neighborhood),
      city: asString(row.address_city),
      state: asString(row.address_state)
    },
    householdId: nullableId(row.household_id),
    churchRole: (row.church_role as Member["churchRole"] | undefined) ?? "membro_comum",
    membershipStatus: (row.membership_status as Member["membershipStatus"] | undefined) ?? "ativo",
    joinedAt: row.joined_at === null || row.joined_at === undefined ? null : String(row.joined_at),
    baptismDate:
      row.baptism_date === null || row.baptism_date === undefined ? null : String(row.baptism_date),
    baptismLocation: asString(row.baptism_location),
    transferredFrom: asString(row.transferred_from),
    emergencyContactName: asString(row.emergency_contact_name),
    emergencyContactPhone: asString(row.emergency_contact_phone),
    prayerTopics: asStringArray(row.prayer_topics),
    spiritualGifts: asStringArray(row.spiritual_gifts),
    allergies: asString(row.allergies),
    medicalNotes: asString(row.medical_notes),
    consentMedicalDataAt:
      row.consent_medical_data_at === null || row.consent_medical_data_at === undefined
        ? null
        : String(row.consent_medical_data_at),
    isVolunteer: Boolean(row.is_volunteer),
    volunteerMinistries: asStringArray(row.volunteer_ministries),
    volunteerUnavailableDates: asStringArray(row.volunteer_unavailable_dates),
    volunteerNotes: asString(row.volunteer_notes),
    notes: asString(row.notes),
    consentGivenAt:
      row.consent_given_at === null || row.consent_given_at === undefined
        ? null
        : String(row.consent_given_at),
    consentVersion: asString(row.consent_version),
    publicDirectory: Boolean(row.public_directory),
    publicBio: asString(row.public_bio),
    dataRetentionUntil:
      row.data_retention_until === null || row.data_retention_until === undefined
        ? null
        : String(row.data_retention_until),
    deletedAt: row.deleted_at === null || row.deleted_at === undefined ? null : String(row.deleted_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function toMemberRow(input: Member): JsonObject {
  return {
    id: input.id,
    full_name: input.fullName,
    preferred_name: input.preferredName,
    birth_date: input.birthDate,
    marital_status: input.maritalStatus,
    gender: input.gender,
    photo_url: input.photoUrl,
    email: input.email,
    phone: input.phone,
    whatsapp: input.whatsapp,
    cpf: input.cpf,
    rg: input.rg,
    rg_issuer: input.rgIssuer,
    profession: input.profession,
    address_zip: input.address.zip,
    address_street: input.address.street,
    address_number: input.address.number,
    address_complement: input.address.complement,
    address_neighborhood: input.address.neighborhood,
    address_city: input.address.city,
    address_state: input.address.state,
    household_id: input.householdId,
    church_role: input.churchRole,
    membership_status: input.membershipStatus,
    joined_at: input.joinedAt,
    baptism_date: input.baptismDate,
    baptism_location: input.baptismLocation,
    transferred_from: input.transferredFrom,
    emergency_contact_name: input.emergencyContactName,
    emergency_contact_phone: input.emergencyContactPhone,
    prayer_topics: input.prayerTopics,
    spiritual_gifts: input.spiritualGifts,
    allergies: input.allergies,
    medical_notes: input.medicalNotes,
    consent_medical_data_at: input.consentMedicalDataAt,
    is_volunteer: input.isVolunteer,
    volunteer_ministries: input.volunteerMinistries,
    volunteer_unavailable_dates: input.volunteerUnavailableDates,
    volunteer_notes: input.volunteerNotes,
    notes: input.notes,
    consent_given_at: input.consentGivenAt,
    consent_version: input.consentVersion,
    public_directory: input.publicDirectory,
    public_bio: input.publicBio,
    data_retention_until: input.dataRetentionUntil
  };
}

function mapPublicMember(row: JsonObject): PublicMember {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    preferredName: asString(row.preferred_name),
    photoUrl: asString(row.photo_url),
    churchRole: (row.church_role as PublicMember["churchRole"] | undefined) ?? "membro_comum",
    publicBio: asString(row.public_bio),
    isVolunteer: Boolean(row.is_volunteer),
    householdId: nullableId(row.household_id)
  };
}

function memberPatchToRow(patch: Partial<Member>): JsonObject {
  const row: JsonObject = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.preferredName !== undefined) row.preferred_name = patch.preferredName;
  if (patch.birthDate !== undefined) row.birth_date = patch.birthDate;
  if (patch.maritalStatus !== undefined) row.marital_status = patch.maritalStatus;
  if (patch.gender !== undefined) row.gender = patch.gender;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.whatsapp !== undefined) row.whatsapp = patch.whatsapp;
  if (patch.cpf !== undefined) row.cpf = patch.cpf;
  if (patch.rg !== undefined) row.rg = patch.rg;
  if (patch.rgIssuer !== undefined) row.rg_issuer = patch.rgIssuer;
  if (patch.profession !== undefined) row.profession = patch.profession;
  if (patch.address !== undefined) {
    row.address_zip = patch.address.zip;
    row.address_street = patch.address.street;
    row.address_number = patch.address.number;
    row.address_complement = patch.address.complement;
    row.address_neighborhood = patch.address.neighborhood;
    row.address_city = patch.address.city;
    row.address_state = patch.address.state;
  }
  if (patch.householdId !== undefined) row.household_id = patch.householdId;
  if (patch.churchRole !== undefined) row.church_role = patch.churchRole;
  if (patch.membershipStatus !== undefined) row.membership_status = patch.membershipStatus;
  if (patch.joinedAt !== undefined) row.joined_at = patch.joinedAt;
  if (patch.baptismDate !== undefined) row.baptism_date = patch.baptismDate;
  if (patch.baptismLocation !== undefined) row.baptism_location = patch.baptismLocation;
  if (patch.transferredFrom !== undefined) row.transferred_from = patch.transferredFrom;
  if (patch.emergencyContactName !== undefined) row.emergency_contact_name = patch.emergencyContactName;
  if (patch.emergencyContactPhone !== undefined) row.emergency_contact_phone = patch.emergencyContactPhone;
  if (patch.prayerTopics !== undefined) row.prayer_topics = patch.prayerTopics;
  if (patch.spiritualGifts !== undefined) row.spiritual_gifts = patch.spiritualGifts;
  if (patch.allergies !== undefined) row.allergies = patch.allergies;
  if (patch.medicalNotes !== undefined) row.medical_notes = patch.medicalNotes;
  if (patch.consentMedicalDataAt !== undefined) row.consent_medical_data_at = patch.consentMedicalDataAt;
  if (patch.isVolunteer !== undefined) row.is_volunteer = patch.isVolunteer;
  if (patch.volunteerMinistries !== undefined) row.volunteer_ministries = patch.volunteerMinistries;
  if (patch.volunteerUnavailableDates !== undefined)
    row.volunteer_unavailable_dates = patch.volunteerUnavailableDates;
  if (patch.volunteerNotes !== undefined) row.volunteer_notes = patch.volunteerNotes;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.consentGivenAt !== undefined) row.consent_given_at = patch.consentGivenAt;
  if (patch.consentVersion !== undefined) row.consent_version = patch.consentVersion;
  if (patch.publicDirectory !== undefined) row.public_directory = patch.publicDirectory;
  if (patch.publicBio !== undefined) row.public_bio = patch.publicBio;
  if (patch.dataRetentionUntil !== undefined) row.data_retention_until = patch.dataRetentionUntil;
  return row;
}

function mapHousehold(row: JsonObject): Household {
  return {
    id: String(row.id),
    name: String(row.name),
    headMemberId: nullableId(row.head_member_id),
    address: {
      zip: asString(row.address_zip),
      street: asString(row.address_street),
      number: asString(row.address_number),
      complement: asString(row.address_complement),
      neighborhood: asString(row.address_neighborhood),
      city: asString(row.address_city),
      state: asString(row.address_state)
    },
    notes: asString(row.notes),
    deletedAt: row.deleted_at === null || row.deleted_at === undefined ? null : String(row.deleted_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function toHouseholdRow(input: Household): JsonObject {
  return {
    id: input.id,
    name: input.name,
    head_member_id: input.headMemberId,
    address_zip: input.address.zip,
    address_street: input.address.street,
    address_number: input.address.number,
    address_complement: input.address.complement,
    address_neighborhood: input.address.neighborhood,
    address_city: input.address.city,
    address_state: input.address.state,
    notes: input.notes
  };
}

function householdPatchToRow(patch: Partial<Household>): JsonObject {
  const row: JsonObject = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.headMemberId !== undefined) row.head_member_id = patch.headMemberId;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.address !== undefined) {
    row.address_zip = patch.address.zip;
    row.address_street = patch.address.street;
    row.address_number = patch.address.number;
    row.address_complement = patch.address.complement;
    row.address_neighborhood = patch.address.neighborhood;
    row.address_city = patch.address.city;
    row.address_state = patch.address.state;
  }
  return row;
}

function mapRelationship(row: JsonObject): MemberRelationship {
  return {
    id: String(row.id),
    fromMemberId: String(row.from_member_id),
    toMemberId: String(row.to_member_id),
    type: row.type as MemberRelationship["type"],
    startDate: row.start_date === null || row.start_date === undefined ? null : String(row.start_date),
    endDate: row.end_date === null || row.end_date === undefined ? null : String(row.end_date),
    createdAt: String(row.created_at)
  };
}

function mapDuplicateMatch(row: JsonObject): MemberDuplicateMatch {
  return {
    memberId: String(row.member_id),
    fullName: String(row.full_name),
    score: Number(row.score ?? 0),
    matchReason: row.match_reason as MemberDuplicateMatch["matchReason"]
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

function mapCommemoration(row: JsonObject): Commemoration {
  const dayValue = row.day_of_month;
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type === "day" ? "day" : "month",
    month: Number(row.month ?? 1),
    dayOfMonth: dayValue === null || dayValue === undefined ? null : Number(dayValue),
    description: asString(row.description),
    color: asString(row.color),
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function toCommemorationRow(input: Commemoration): JsonObject {
  return {
    id: input.id,
    name: input.name,
    type: input.type,
    month: input.month,
    day_of_month: input.type === "day" ? input.dayOfMonth : null,
    description: input.description,
    color: input.color,
    sort_order: input.sortOrder
  };
}

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
    const [announcements, schedule, volunteers, profile, ministries, recurringMeetings, commemorations] =
      await Promise.all([
        this.listAnnouncements(),
        this.listSchedule(),
        this.listVolunteers(),
        this.getProfile(),
        this.listMinistries(),
        this.listRecurringMeetings(),
        this.listCommemorations()
      ]);
    return { announcements, schedule, volunteers, profile, ministries, recurringMeetings, commemorations };
  }

  async listAnnouncements() {
    const { data, error } = await this.client
      .from("announcements")
      .select("*")
      .is("deleted_at", null)
      .order("published_at", { ascending: false });
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
    await this.archiveAnnouncement(id);
  }

  async archiveAnnouncement(id: string) {
    const { error } = await this.client.rpc("archive_announcement", { p_id: id });
    requireOk(error);
  }

  async restoreAnnouncement(id: string) {
    const { error } = await this.client.rpc("restore_announcement", { p_id: id });
    requireOk(error);
  }

  async listSchedule() {
    const { data, error } = await this.client
      .from("schedule_items")
      .select("*")
      .is("deleted_at", null)
      .order("starts_at");
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
      seriesId: input.seriesId ?? null,
      youtubeUrl: input.youtubeUrl ?? ""
    };
    const { data, error } = await this.client
      .from("schedule_items")
      .upsert(toScheduleRow(item))
      .select("*")
      .single();
    return mapSchedule(requireData(data as JsonObject | null, error));
  }

  async deleteScheduleItem(id: string) {
    await this.archiveScheduleItem(id);
  }

  async archiveScheduleItem(id: string) {
    const { error } = await this.client.rpc("archive_schedule_item", { p_id: id });
    requireOk(error);
  }

  async restoreScheduleItem(id: string) {
    const { error } = await this.client.rpc("restore_schedule_item", { p_id: id });
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
      .from("volunteers_public")
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
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    return requireData(data as JsonObject[] | null, error).map(mapPrayer);
  }

  async archivePrayerRequest(id: string) {
    const { error } = await this.client.rpc("archive_prayer_request", { p_id: id });
    requireOk(error);
  }

  async restorePrayerRequest(id: string) {
    const { error } = await this.client.rpc("restore_prayer_request", { p_id: id });
    requireOk(error);
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
      .is("deleted_at", null)
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
    await this.archiveMinistry(id);
  }

  async archiveMinistry(id: string) {
    const { error } = await this.client.rpc("archive_ministry", { p_id: id });
    requireOk(error);
  }

  async restoreMinistry(id: string) {
    const { error } = await this.client.rpc("restore_ministry", { p_id: id });
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

  async listCommemorations() {
    const { data, error } = await this.client
      .from("commemorative_dates")
      .select("*")
      .is("deleted_at", null)
      .order("month", { ascending: true })
      .order("sort_order", { ascending: true });
    return sortCommemorations(requireData(data as JsonObject[] | null, error).map(mapCommemoration));
  }

  async saveCommemoration(input: CommemorationInput) {
    const item: Commemoration = {
      id: input.id ?? crypto.randomUUID(),
      name: input.name,
      type: input.type,
      month: input.month,
      dayOfMonth: input.type === "day" ? input.dayOfMonth : null,
      description: input.description,
      color: input.color,
      sortOrder: input.sortOrder
    };
    const { data, error } = await this.client
      .from("commemorative_dates")
      .upsert(toCommemorationRow(item))
      .select("*")
      .single();
    return mapCommemoration(requireData(data as JsonObject | null, error));
  }

  async archiveCommemoration(id: string) {
    const { error } = await this.client.rpc("archive_commemorative_date", { p_id: id });
    requireOk(error);
  }

  async restoreCommemoration(id: string) {
    const { error } = await this.client.rpc("restore_commemorative_date", { p_id: id });
    requireOk(error);
  }

  async listAdmins() {
    const { data, error } = await this.client.rpc("list_admins");
    return sortAdmins(requireData(data as JsonObject[] | null, error).map(mapAdminUser));
  }

  async inviteAdmin(_input: InviteAdminInput): Promise<AdminUser> {
    void _input;
    throw new Error(
      "Convite por email exige edge function (planejado para depois). Use o Supabase Auth dashboard para criar o usuario, depois adicione o user_id manualmente em admin_users."
    );
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

  async revertAuditEntry(id: string): Promise<void> {
    const { error } = await this.client.rpc("revert_audit_entry", { entry_id: id });
    requireOk(error);
  }

  async updateScheduleItemMembers(
    itemId: string,
    members: {
      preacherMemberId: string | null;
      directorMemberId: string | null;
      soundMemberId: string | null;
    }
  ): Promise<void> {
    const { error } = await this.client
      .from("schedule_items")
      .update({
        preacher_member_id: members.preacherMemberId,
        director_member_id: members.directorMemberId,
        sound_member_id: members.soundMemberId
      })
      .eq("id", itemId);
    requireOk(error);
  }

  async createMember(input: Omit<Member, "id" | "createdAt" | "updatedAt" | "deletedAt">): Promise<Member> {
    const item: Member = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: "",
      updatedAt: "",
      deletedAt: null
    };
    const { data, error } = await this.client.from("members").insert(toMemberRow(item)).select("*").single();
    return mapMember(requireData(data as JsonObject | null, error));
  }

  async updateMember(id: string, patch: Partial<Member>): Promise<Member> {
    const { data, error } = await this.client
      .from("members")
      .update(memberPatchToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    return mapMember(requireData(data as JsonObject | null, error));
  }

  async archiveMember(id: string): Promise<void> {
    const { error } = await this.client.rpc("archive_member", { p_id: id });
    requireOk(error);
  }

  async restoreMember(id: string): Promise<void> {
    const { error } = await this.client.rpc("restore_member", { p_id: id });
    requireOk(error);
  }

  async anonymizeMember(id: string): Promise<void> {
    const { error } = await this.client.rpc("anonymize_member", { p_id: id });
    requireOk(error);
  }

  async getMember(id: string): Promise<Member | null> {
    const { data, error } = await this.client.from("members").select("*").eq("id", id).limit(1).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return null;
    }
    return mapMember(data as JsonObject);
  }

  async listMembers(
    options: {
      includeDeleted?: boolean;
      isVolunteer?: boolean;
      householdId?: string;
    } = {}
  ): Promise<Member[]> {
    let query = this.client.from("members").select("*").order("full_name", { ascending: true });
    if (options.includeDeleted !== true) {
      query = query.is("deleted_at", null);
    }
    if (options.isVolunteer !== undefined) {
      query = query.eq("is_volunteer", options.isVolunteer);
    }
    if (options.householdId !== undefined) {
      query = query.eq("household_id", options.householdId);
    }
    const { data, error } = await query;
    return requireData(data as JsonObject[] | null, error).map(mapMember);
  }

  async listPublicMembers(): Promise<PublicMember[]> {
    const { data, error } = await this.client
      .from("members_public")
      .select("*")
      .order("full_name", { ascending: true });
    return requireData(data as JsonObject[] | null, error).map(mapPublicMember);
  }

  async findMemberDuplicates(input: {
    fullName: string;
    cpf: string | null;
    email: string;
    phone: string;
  }): Promise<MemberDuplicateMatch[]> {
    const { data, error } = await this.client.rpc("find_member_duplicates", {
      p_full_name: input.fullName,
      p_cpf: input.cpf,
      p_email: input.email,
      p_phone: input.phone
    });
    return requireData(data as JsonObject[] | null, error).map(mapDuplicateMatch);
  }

  async createHousehold(
    input: Omit<Household, "id" | "createdAt" | "updatedAt" | "deletedAt">
  ): Promise<Household> {
    const item: Household = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: "",
      updatedAt: "",
      deletedAt: null
    };
    const { data, error } = await this.client
      .from("households")
      .insert(toHouseholdRow(item))
      .select("*")
      .single();
    return mapHousehold(requireData(data as JsonObject | null, error));
  }

  async updateHousehold(id: string, patch: Partial<Household>): Promise<Household> {
    const { data, error } = await this.client
      .from("households")
      .update(householdPatchToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    return mapHousehold(requireData(data as JsonObject | null, error));
  }

  async archiveHousehold(id: string): Promise<void> {
    const { error } = await this.client
      .from("households")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    requireOk(error);
  }

  async listHouseholds(): Promise<Household[]> {
    const { data, error } = await this.client
      .from("households")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    return requireData(data as JsonObject[] | null, error).map(mapHousehold);
  }

  async getHousehold(id: string): Promise<Household | null> {
    const { data, error } = await this.client
      .from("households")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return null;
    }
    return mapHousehold(data as JsonObject);
  }

  async createRelationship(input: Omit<MemberRelationship, "id" | "createdAt">): Promise<MemberRelationship> {
    const { data, error } = await this.client
      .from("member_relationships")
      .insert({
        id: crypto.randomUUID(),
        from_member_id: input.fromMemberId,
        to_member_id: input.toMemberId,
        type: input.type,
        start_date: input.startDate,
        end_date: input.endDate
      })
      .select("*")
      .single();
    return mapRelationship(requireData(data as JsonObject | null, error));
  }

  async deleteRelationship(id: string): Promise<void> {
    const { error } = await this.client.from("member_relationships").delete().eq("id", id);
    requireOk(error);
  }

  async listRelationships(memberId: string): Promise<MemberRelationship[]> {
    const { data, error } = await this.client
      .from("member_relationships")
      .select("*")
      .or(`from_member_id.eq.${memberId},to_member_id.eq.${memberId}`)
      .order("created_at", { ascending: false });
    return requireData(data as JsonObject[] | null, error).map(mapRelationship);
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

  async getAccessToken(): Promise<string | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
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

  async listMfaFactors(): Promise<MfaFactor[]> {
    const { data, error } = await this.client.auth.mfa.listFactors();
    if (error) throw new Error(error.message);
    const totp = data?.totp ?? [];
    return totp.map((factor) => ({
      id: factor.id,
      status: factor.status === "verified" ? "verified" : "unverified",
      factorType: "totp",
      friendlyName: factor.friendly_name ?? "Authenticator",
      createdAt: factor.created_at ?? ""
    }));
  }

  async enrollMfa(friendlyName: string = "Authenticator"): Promise<MfaEnrollment> {
    const { data, error } = await this.client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName
    });
    if (error) throw new Error(error.message);
    if (!data?.id || !data.totp) throw new Error("Resposta invalida ao enrolar MFA.");
    return {
      factorId: data.id,
      qrCodeSvg: data.totp.qr_code,
      uri: data.totp.uri,
      secret: data.totp.secret
    };
  }

  async verifyMfaEnrollment(factorId: string, code: string): Promise<void> {
    const { data: challenge, error: challengeError } = await this.client.auth.mfa.challenge({
      factorId
    });
    if (challengeError || !challenge?.id) {
      throw new Error(challengeError?.message ?? "Falha ao iniciar verificacao.");
    }
    const { error } = await this.client.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code
    });
    if (error) throw new Error(error.message);
  }

  async challengeMfa(factorId: string): Promise<{ challengeId: string }> {
    const { data, error } = await this.client.auth.mfa.challenge({ factorId });
    if (error) throw new Error(error.message);
    if (!data?.id) throw new Error("Resposta invalida ao desafiar MFA.");
    return { challengeId: data.id };
  }

  async verifyMfaChallenge(factorId: string, challengeId: string, code: string): Promise<void> {
    const { error } = await this.client.auth.mfa.verify({ factorId, challengeId, code });
    if (error) throw new Error(error.message);
  }

  async unenrollMfa(factorId: string): Promise<void> {
    const { error } = await this.client.auth.mfa.unenroll({ factorId });
    if (error) throw new Error(error.message);
  }

  async getAuthAssuranceLevel(): Promise<MfaAssurance> {
    const { data, error } = await this.client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw new Error(error.message);
    const current = data?.currentLevel === "aal2" ? "aal2" : "aal1";
    const next = data?.nextLevel === "aal2" ? "aal2" : "aal1";
    return { current, next };
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
