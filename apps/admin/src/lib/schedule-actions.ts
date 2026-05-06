import type { ScheduleItem, ScheduleItemInput, ScheduleStatus } from "@4ibib/core";

export function scheduleItemToInput(item: ScheduleItem): ScheduleItemInput {
  return {
    id: item.id,
    title: item.title,
    ministry: item.ministry,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    location: item.location,
    summary: item.summary,
    preacher: item.preacher,
    director: item.director,
    soundTeam: item.soundTeam,
    passage: item.passage,
    occasionLabel: item.occasionLabel,
    status: item.status,
    featured: item.featured,
    seriesId: item.seriesId ?? null,
    youtubeUrl: item.youtubeUrl
  };
}

export function withStatus(item: ScheduleItem, status: ScheduleStatus): ScheduleItemInput {
  return { ...scheduleItemToInput(item), status };
}
