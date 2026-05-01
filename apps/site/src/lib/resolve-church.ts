import type { ChurchProfile, MinistryRecord, RecurringMeetingRecord } from "@4ibib/core";
import { sortMinistries, sortRecurringMeetings } from "@4ibib/core";
import { CHURCH, MINISTRIES, REGULAR_MEETINGS } from "../config/church";
import type { Ministry, RegularMeeting } from "../config/church";

export interface ResolvedChurch {
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

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

function pickString(dbValue: string | null | undefined, fallback: string): string {
  if (typeof dbValue !== "string") {
    return fallback;
  }
  const trimmed = dbValue.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function trimTime(value: string): string {
  if (!value) return "";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export function resolveProfile(profile: ChurchProfile | null | undefined): ResolvedChurch {
  if (!profile) {
    return CHURCH;
  }
  return {
    name: pickString(profile.name, CHURCH.name),
    shortName: pickString(profile.shortName, CHURCH.shortName),
    tagline: pickString(profile.tagline, CHURCH.tagline),
    city: pickString(profile.city, CHURCH.city),
    pastorName: pickString(profile.pastorName, CHURCH.pastorName),
    address: pickString(profile.address, CHURCH.address),
    email: pickString(profile.email, CHURCH.email),
    whatsapp: pickString(profile.whatsapp, CHURCH.whatsapp),
    instagramUrl: pickString(profile.instagramUrl, CHURCH.instagramUrl),
    youtubeUrl: pickString(profile.youtubeUrl, CHURCH.youtubeUrl),
    mapsUrl: pickString(profile.mapsUrl, CHURCH.mapsUrl),
    heroVerse: pickString(profile.heroVerse, CHURCH.heroVerse),
    mission: pickString(profile.mission, CHURCH.mission)
  };
}

export function resolveRegularMeetings(
  records: RecurringMeetingRecord[] | null | undefined
): RegularMeeting[] {
  if (!records || records.length === 0) {
    return REGULAR_MEETINGS;
  }
  return sortRecurringMeetings(records).map((record) => ({
    title: record.title,
    weekday: WEEKDAY_LABELS[record.weekday] ?? "",
    startsAt: trimTime(record.startsAt),
    endsAt: trimTime(record.endsAt),
    description: record.description ?? ""
  }));
}

export function resolveMinistries(records: MinistryRecord[] | null | undefined): Ministry[] {
  if (!records || records.length === 0) {
    return MINISTRIES;
  }
  return sortMinistries(records).map((record) => ({
    slug: record.slug,
    name: record.name,
    summary: record.summary ?? "",
    meetingTime: record.meetingTime ?? "",
    contact: record.contact ?? "",
    color: pickString(record.color, "#0f766e")
  }));
}
