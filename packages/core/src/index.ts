export type AnnouncementCategory = "geral" | "evento" | "juventude" | "oracao";

export type AnnouncementStatus = "draft" | "scheduled" | "published" | "archived";

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  category: AnnouncementCategory;
  publishedAt: string;
  pinned: boolean;
  ctaLabel: string;
  ctaUrl: string;
  status: AnnouncementStatus;
  expiresAt: string | null;
  imageUrl: string;
}

export type ScheduleStatus = "scheduled" | "suspended" | "free";

export interface ScheduleItem {
  id: string;
  title: string;
  ministry: string;
  startsAt: string;
  endsAt: string;
  location: string;
  summary: string;
  preacher: string;
  director: string;
  soundTeam: string;
  passage: string;
  occasionLabel: string;
  status: ScheduleStatus;
  featured: boolean;
  seriesId: string | null;
}

export type VolunteerRole = "geral" | "som";

export interface Volunteer {
  id: string;
  name: string;
  role: VolunteerRole;
  sortOrder: number;
  contact: string;
  photoUrl: string;
  ministries: string[];
  unavailableDates: string[];
  notes: string;
}

export type PrayerStatus = "novo" | "em_oracao" | "concluido";

export interface PrayerRequest {
  id: string;
  name: string;
  contact: string;
  message: string;
  createdAt: string;
  status: PrayerStatus;
  pastoralNotes: string;
  assignedTo: string | null;
  seenAt: string | null;
}

export interface ChurchProfile {
  id: "main";
  name: string;
  shortName: string;
  tagline: string;
  city: string;
  pastorName: string;
  address: string;
  email: string;
  whatsapp: string;
  instagramUrl: string;
  youtubeUrl: string;
  mapsUrl: string;
  heroVerse: string;
  mission: string;
}

export interface MinistryRecord {
  id: string;
  slug: string;
  name: string;
  summary: string;
  meetingTime: string;
  contact: string;
  color: string;
  sortOrder: number;
}

export interface RecurringMeetingRecord {
  id: string;
  title: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  description: string;
  sortOrder: number;
}

export type AdminRole = "owner" | "editor";

export interface AdminUser {
  userId: string;
  email: string;
  displayName: string;
  role: AdminRole;
  createdAt: string;
}

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export interface AuditLogEntry {
  id: string;
  tableName: string;
  rowId: string;
  action: AuditAction;
  changedBy: string | null;
  changedAt: string;
  oldRow: Record<string, unknown> | null;
  newRow: Record<string, unknown> | null;
}

export interface AuditLogFilter {
  tableName?: string;
  rowId?: string;
  changedBy?: string;
  action?: AuditAction;
  since?: string;
  until?: string;
  limit?: number;
}

export type AnnouncementInput = {
  id?: string;
  title: string;
  summary: string;
  category: AnnouncementCategory;
  publishedAt: string;
  pinned: boolean;
  ctaLabel: string;
  ctaUrl: string;
  status?: AnnouncementStatus;
  expiresAt?: string | null;
  imageUrl?: string;
};

export type ScheduleItemInput = {
  id?: string;
  title: string;
  ministry: string;
  startsAt: string;
  endsAt: string;
  location: string;
  summary: string;
  preacher: string;
  director: string;
  soundTeam: string;
  passage: string;
  occasionLabel: string;
  status: ScheduleStatus;
  featured: boolean;
  seriesId?: string | null;
};

export type ScheduleBulkPatch = Partial<
  Pick<
    ScheduleItem,
    "preacher" | "director" | "soundTeam" | "ministry" | "location" | "status" | "occasionLabel" | "featured"
  >
>;

export type VolunteerInput = {
  id?: string;
  name: string;
  role: VolunteerRole;
  sortOrder: number;
  contact?: string;
  photoUrl?: string;
  ministries?: string[];
  unavailableDates?: string[];
  notes?: string;
};

export interface RenameVolunteerInput {
  id: string;
  newName: string;
  cascade?: boolean;
}

export type PrayerRequestInput = {
  name: string;
  contact: string;
  message: string;
  turnstileToken?: string;
};

export type PrayerRequestPatch = Partial<{
  status: PrayerStatus;
  pastoralNotes: string;
  assignedTo: string | null;
  seenAt: string | null;
}>;

export type ChurchProfileInput = Omit<ChurchProfile, "id"> & { id?: "main" };

export type MinistryInput = {
  id?: string;
  slug: string;
  name: string;
  summary: string;
  meetingTime: string;
  contact: string;
  color: string;
  sortOrder: number;
};

export type RecurringMeetingInput = {
  id?: string;
  title: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  description: string;
  sortOrder: number;
};

export interface InviteAdminInput {
  email: string;
  role: AdminRole;
}

export interface SiteSnapshot {
  announcements: Announcement[];
  schedule: ScheduleItem[];
  volunteers: Volunteer[];
  profile: ChurchProfile | null;
  ministries: MinistryRecord[];
  recurringMeetings: RecurringMeetingRecord[];
}

export interface AdminSession {
  uid: string;
  email: string;
  displayName: string;
}

export interface ContentRepository {
  getSnapshot(): Promise<SiteSnapshot>;

  listAnnouncements(): Promise<Announcement[]>;
  saveAnnouncement(input: AnnouncementInput): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;

  listSchedule(): Promise<ScheduleItem[]>;
  saveScheduleItem(input: ScheduleItemInput): Promise<ScheduleItem>;
  deleteScheduleItem(id: string): Promise<void>;
  duplicateScheduleItem(id: string): Promise<ScheduleItem>;
  bulkUpdateScheduleItems(ids: string[], patch: ScheduleBulkPatch): Promise<ScheduleItem[]>;

  listVolunteers(): Promise<Volunteer[]>;
  saveVolunteer(input: VolunteerInput): Promise<Volunteer>;
  deleteVolunteer(id: string): Promise<void>;
  renameVolunteer(
    input: RenameVolunteerInput
  ): Promise<{ volunteer: Volunteer; updatedScheduleItems: number }>;

  createPrayerRequest(input: PrayerRequestInput): Promise<PrayerRequest>;
  listPrayerRequests(): Promise<PrayerRequest[]>;
  updatePrayerRequestStatus(id: string, status: PrayerStatus): Promise<void>;
  updatePrayerRequest(id: string, patch: PrayerRequestPatch): Promise<PrayerRequest>;

  getProfile(): Promise<ChurchProfile | null>;
  saveProfile(input: ChurchProfileInput): Promise<ChurchProfile>;

  listMinistries(): Promise<MinistryRecord[]>;
  saveMinistry(input: MinistryInput): Promise<MinistryRecord>;
  deleteMinistry(id: string): Promise<void>;

  listRecurringMeetings(): Promise<RecurringMeetingRecord[]>;
  saveRecurringMeeting(input: RecurringMeetingInput): Promise<RecurringMeetingRecord>;
  deleteRecurringMeeting(id: string): Promise<void>;

  listAdmins(): Promise<AdminUser[]>;
  inviteAdmin(input: InviteAdminInput): Promise<AdminUser>;
  updateAdminRole(userId: string, role: AdminRole): Promise<AdminUser>;
  removeAdmin(userId: string): Promise<void>;

  listAuditLog(filter?: AuditLogFilter): Promise<AuditLogEntry[]>;
  revertAuditEntry(id: string): Promise<void>;
}

export interface AuthGateway {
  getSession(): Promise<AdminSession | null>;
  subscribe(listener: (session: AdminSession | null) => void): () => void;
  signIn(email: string, password: string): Promise<AdminSession>;
  signOut(): Promise<void>;
}

export interface ChurchBackend {
  content: ContentRepository;
  auth: AuthGateway;
  mode: "supabase";
}

export function sortAnnouncements(items: Announcement[]): Announcement[] {
  return [...items].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  });
}

export function sortSchedule(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
}

export function getUpcomingSchedule(items: ScheduleItem[], limit = 5): ScheduleItem[] {
  const now = Date.now();
  return sortSchedule(items)
    .filter((item) => item.status === "scheduled" && Date.parse(item.startsAt) >= now)
    .slice(0, limit);
}

export function getPinnedAnnouncements(items: Announcement[], limit = 4): Announcement[] {
  return sortAnnouncements(items).slice(0, limit);
}

export function isAnnouncementVisible(item: Announcement, now: Date = new Date()): boolean {
  if (item.status !== "published") {
    return false;
  }

  if (Date.parse(item.publishedAt) > now.getTime()) {
    return false;
  }

  if (item.expiresAt && Date.parse(item.expiresAt) <= now.getTime()) {
    return false;
  }

  return true;
}

export function getVisibleAnnouncements(
  items: Announcement[],
  now: Date = new Date(),
  limit = 4
): Announcement[] {
  return sortAnnouncements(items.filter((item) => isAnnouncementVisible(item, now))).slice(0, limit);
}

export function sortVolunteers(items: Volunteer[]): Volunteer[] {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export function sortMinistries(items: MinistryRecord[]): MinistryRecord[] {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export function sortRecurringMeetings(items: RecurringMeetingRecord[]): RecurringMeetingRecord[] {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    if (left.weekday !== right.weekday) {
      return left.weekday - right.weekday;
    }

    return left.startsAt.localeCompare(right.startsAt);
  });
}

export function sortAuditLog(items: AuditLogEntry[]): AuditLogEntry[] {
  return [...items].sort((left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt));
}

export function sortAdmins(items: AdminUser[]): AdminUser[] {
  return [...items].sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "owner" ? -1 : 1;
    }

    return left.email.localeCompare(right.email);
  });
}

export function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

export function formatTimeRange(startsAt: string, endsAt: string): string {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
}

export function formatInputDateTime(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function inputDateTimeToIso(value: string): string {
  return new Date(value).toISOString();
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

const WHATSAPP_MIN_DIGITS = 10;

export function buildWhatsAppForContact(contact: string, message: string): string | null {
  const digits = contact.replace(/\D+/g, "");
  if (digits.length < WHATSAPP_MIN_DIGITS) return null;
  return buildWhatsAppUrl(digits, message);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDateOnly(value: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parsed);
}

export function splitNames(value: string | undefined | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function getScheduleInRange(items: ScheduleItem[], fromMs: number, toMs: number): ScheduleItem[] {
  return items.filter((item) => {
    if (item.status !== "scheduled") {
      return false;
    }

    const startsAt = Date.parse(item.startsAt);
    return startsAt >= fromMs && startsAt < toMs;
  });
}

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
