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
  preacherMemberId?: string | null;
  directorMemberId?: string | null;
  soundMemberId?: string | null;
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

export type MaritalStatus = "solteiro" | "casado" | "viuvo" | "divorciado" | "uniao_estavel";

export type Gender = "masculino" | "feminino" | "outro";

export type MembershipStatus = "ativo" | "inativo" | "transferido" | "falecido";

export type ChurchRole =
  | "membro_comum"
  | "presbitero"
  | "diacono"
  | "conselho_fiscal"
  | "tesoureiro"
  | "secretario"
  | "pastor"
  | "pastor_auxiliar";

export type RelationshipType =
  | "conjuge"
  | "pai"
  | "mae"
  | "filho"
  | "irmao"
  | "avo"
  | "neto"
  | "tio"
  | "sobrinho"
  | "responsavel";

export interface Address {
  zip: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface Member {
  id: string;
  fullName: string;
  preferredName: string;
  birthDate: string | null;
  maritalStatus: MaritalStatus | null;
  gender: Gender | null;
  photoUrl: string;
  email: string;
  phone: string;
  whatsapp: string;
  cpf: string | null;
  rg: string;
  rgIssuer: string;
  profession: string;
  address: Address;
  householdId: string | null;
  churchRole: ChurchRole;
  membershipStatus: MembershipStatus;
  joinedAt: string | null;
  baptismDate: string | null;
  baptismLocation: string;
  transferredFrom: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  prayerTopics: string[];
  spiritualGifts: string[];
  allergies: string;
  medicalNotes: string;
  consentMedicalDataAt: string | null;
  isVolunteer: boolean;
  volunteerMinistries: string[];
  volunteerUnavailableDates: string[];
  volunteerNotes: string;
  notes: string;
  consentGivenAt: string | null;
  consentVersion: string;
  publicDirectory: boolean;
  dataRetentionUntil: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  id: string;
  name: string;
  headMemberId: string | null;
  address: Address;
  notes: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberRelationship {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface MemberDuplicateMatch {
  memberId: string;
  fullName: string;
  score: number;
  matchReason: "cpf_match" | "email_match" | "phone_match" | "name_similar";
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

export interface AnnouncementRepo {
  listAnnouncements(): Promise<Announcement[]>;
  saveAnnouncement(input: AnnouncementInput): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
  archiveAnnouncement(id: string): Promise<void>;
  restoreAnnouncement(id: string): Promise<void>;
}

export interface ScheduleRepo {
  listSchedule(): Promise<ScheduleItem[]>;
  saveScheduleItem(input: ScheduleItemInput): Promise<ScheduleItem>;
  deleteScheduleItem(id: string): Promise<void>;
  archiveScheduleItem(id: string): Promise<void>;
  restoreScheduleItem(id: string): Promise<void>;
  duplicateScheduleItem(id: string): Promise<ScheduleItem>;
  bulkUpdateScheduleItems(ids: string[], patch: ScheduleBulkPatch): Promise<ScheduleItem[]>;
  updateScheduleItemMembers(
    itemId: string,
    members: {
      preacherMemberId: string | null;
      directorMemberId: string | null;
      soundMemberId: string | null;
    }
  ): Promise<void>;
}

export interface MemberRepo {
  createMember(input: Omit<Member, "id" | "createdAt" | "updatedAt" | "deletedAt">): Promise<Member>;
  updateMember(id: string, patch: Partial<Member>): Promise<Member>;
  archiveMember(id: string): Promise<void>;
  restoreMember(id: string): Promise<void>;
  anonymizeMember(id: string): Promise<void>;
  getMember(id: string): Promise<Member | null>;
  listMembers(options?: {
    includeDeleted?: boolean;
    isVolunteer?: boolean;
    householdId?: string;
  }): Promise<Member[]>;
  findMemberDuplicates(input: {
    fullName: string;
    cpf: string | null;
    email: string;
    phone: string;
  }): Promise<MemberDuplicateMatch[]>;
}

export interface HouseholdRepo {
  createHousehold(input: Omit<Household, "id" | "createdAt" | "updatedAt" | "deletedAt">): Promise<Household>;
  updateHousehold(id: string, patch: Partial<Household>): Promise<Household>;
  archiveHousehold(id: string): Promise<void>;
  listHouseholds(): Promise<Household[]>;
  getHousehold(id: string): Promise<Household | null>;
}

export interface RelationshipRepo {
  createRelationship(input: Omit<MemberRelationship, "id" | "createdAt">): Promise<MemberRelationship>;
  deleteRelationship(id: string): Promise<void>;
  listRelationships(memberId: string): Promise<MemberRelationship[]>;
}

export interface VolunteerRepo {
  listVolunteers(): Promise<Volunteer[]>;
  saveVolunteer(input: VolunteerInput): Promise<Volunteer>;
  deleteVolunteer(id: string): Promise<void>;
  renameVolunteer(
    input: RenameVolunteerInput
  ): Promise<{ volunteer: Volunteer; updatedScheduleItems: number }>;
}

export interface PrayerRepo {
  createPrayerRequest(input: PrayerRequestInput): Promise<PrayerRequest>;
  listPrayerRequests(): Promise<PrayerRequest[]>;
  updatePrayerRequestStatus(id: string, status: PrayerStatus): Promise<void>;
  updatePrayerRequest(id: string, patch: PrayerRequestPatch): Promise<PrayerRequest>;
  archivePrayerRequest(id: string): Promise<void>;
  restorePrayerRequest(id: string): Promise<void>;
}

export interface ProfileRepo {
  getProfile(): Promise<ChurchProfile | null>;
  saveProfile(input: ChurchProfileInput): Promise<ChurchProfile>;
}

export interface MinistryRepo {
  listMinistries(): Promise<MinistryRecord[]>;
  saveMinistry(input: MinistryInput): Promise<MinistryRecord>;
  deleteMinistry(id: string): Promise<void>;
  archiveMinistry(id: string): Promise<void>;
  restoreMinistry(id: string): Promise<void>;
}

export interface RecurringMeetingRepo {
  listRecurringMeetings(): Promise<RecurringMeetingRecord[]>;
  saveRecurringMeeting(input: RecurringMeetingInput): Promise<RecurringMeetingRecord>;
  deleteRecurringMeeting(id: string): Promise<void>;
}

export interface AdminRepo {
  listAdmins(): Promise<AdminUser[]>;
  inviteAdmin(input: InviteAdminInput): Promise<AdminUser>;
  updateAdminRole(userId: string, role: AdminRole): Promise<AdminUser>;
  removeAdmin(userId: string): Promise<void>;
}

export interface AuditRepo {
  listAuditLog(filter?: AuditLogFilter): Promise<AuditLogEntry[]>;
  revertAuditEntry(id: string): Promise<void>;
}

export interface SnapshotRepo {
  getSnapshot(): Promise<SiteSnapshot>;
}

export interface ContentRepository
  extends
    AnnouncementRepo,
    ScheduleRepo,
    VolunteerRepo,
    PrayerRepo,
    ProfileRepo,
    MinistryRepo,
    RecurringMeetingRepo,
    AdminRepo,
    AuditRepo,
    SnapshotRepo,
    MemberRepo,
    HouseholdRepo,
    RelationshipRepo {}

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

const WHATSAPP_MIN_DIGITS = 10;
const WHATSAPP_BR_COUNTRY_CODE = "55";

function normalizeBrazilianPhone(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (digits.startsWith(WHATSAPP_BR_COUNTRY_CODE) && digits.length >= 12) {
    return digits;
  }
  return `${WHATSAPP_BR_COUNTRY_CODE}${digits}`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizeBrazilianPhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

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
