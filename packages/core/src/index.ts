export type AnnouncementCategory = "geral" | "evento" | "juventude" | "oracao";

export interface RegularMeeting {
  id: string;
  title: string;
  weekday: string;
  time: string;
  description: string;
}

export interface ChurchProfile {
  id: string;
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
  foundedText: string;
  regularMeetings: RegularMeeting[];
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  category: AnnouncementCategory;
  publishedAt: string;
  pinned: boolean;
  ctaLabel: string;
  ctaUrl: string;
}

export interface Ministry {
  id: string;
  name: string;
  summary: string;
  meetingTime: string;
  contact: string;
  color: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  ministry: string;
  startsAt: string;
  endsAt: string;
  location: string;
  summary: string;
  leader: string;
  featured: boolean;
}

export interface PrayerRequest {
  id: string;
  name: string;
  contact: string;
  message: string;
  createdAt: string;
  status: "novo" | "em_oracao" | "concluido";
}

export type AnnouncementInput = Omit<Announcement, "id"> & { id?: string };
export type MinistryInput = Omit<Ministry, "id"> & { id?: string };
export type ScheduleItemInput = Omit<ScheduleItem, "id"> & { id?: string };
export type PrayerRequestInput = Omit<PrayerRequest, "id" | "createdAt" | "status">;

export interface SiteSnapshot {
  profile: ChurchProfile;
  announcements: Announcement[];
  ministries: Ministry[];
  schedule: ScheduleItem[];
}

export interface AdminSession {
  uid: string;
  email: string;
  displayName: string;
}

export interface ContentRepository {
  getSnapshot(): Promise<SiteSnapshot>;
  getProfile(): Promise<ChurchProfile>;
  updateProfile(profile: ChurchProfile): Promise<ChurchProfile>;
  listAnnouncements(): Promise<Announcement[]>;
  saveAnnouncement(input: AnnouncementInput): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
  listMinistries(): Promise<Ministry[]>;
  saveMinistry(input: MinistryInput): Promise<Ministry>;
  deleteMinistry(id: string): Promise<void>;
  listSchedule(): Promise<ScheduleItem[]>;
  saveScheduleItem(input: ScheduleItemInput): Promise<ScheduleItem>;
  deleteScheduleItem(id: string): Promise<void>;
  createPrayerRequest(input: PrayerRequestInput): Promise<PrayerRequest>;
  listPrayerRequests(): Promise<PrayerRequest[]>;
  updatePrayerRequestStatus(id: string, status: PrayerRequest["status"]): Promise<void>;
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
  mode: "mock" | "supabase";
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

export function sortMinistries(items: Ministry[]): Ministry[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export function getUpcomingSchedule(items: ScheduleItem[], limit = 5): ScheduleItem[] {
  const now = Date.now();
  return sortSchedule(items)
    .filter((item) => Date.parse(item.startsAt) >= now)
    .slice(0, limit);
}

export function getPinnedAnnouncements(items: Announcement[], limit = 4): Announcement[] {
  return sortAnnouncements(items).slice(0, limit);
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

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
