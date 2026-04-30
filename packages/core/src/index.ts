export type AnnouncementCategory = "geral" | "evento" | "juventude" | "oracao";

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
}

export type VolunteerRole = "geral" | "som";

export interface Volunteer {
  id: string;
  name: string;
  role: VolunteerRole;
  sortOrder: number;
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
export type ScheduleItemInput = Omit<ScheduleItem, "id"> & { id?: string };
export type VolunteerInput = Omit<Volunteer, "id"> & { id?: string };
export type PrayerRequestInput = Omit<PrayerRequest, "id" | "createdAt" | "status"> & {
  turnstileToken?: string;
};

export interface SiteSnapshot {
  announcements: Announcement[];
  schedule: ScheduleItem[];
  volunteers: Volunteer[];
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
  listVolunteers(): Promise<Volunteer[]>;
  saveVolunteer(input: VolunteerInput): Promise<Volunteer>;
  deleteVolunteer(id: string): Promise<void>;
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

export function getUpcomingSchedule(items: ScheduleItem[], limit = 5): ScheduleItem[] {
  const now = Date.now();
  return sortSchedule(items)
    .filter((item) => item.status === "scheduled" && Date.parse(item.startsAt) >= now)
    .slice(0, limit);
}

export function getPinnedAnnouncements(items: Announcement[], limit = 4): Announcement[] {
  return sortAnnouncements(items).slice(0, limit);
}

export function sortVolunteers(items: Volunteer[]): Volunteer[] {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
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

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
