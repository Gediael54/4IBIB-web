import type {
  AnnouncementInput,
  ChurchProfile,
  MinistryInput,
  PrayerRequest,
  ScheduleItemInput
} from "@4ibib/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBackend } from "./backend";

export const backend = createBackend();

const SNAPSHOT_KEY = ["snapshot"] as const;
const PRAYERS_KEY = ["prayers"] as const;

export function useSnapshot() {
  return useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: () => backend.content.getSnapshot()
  });
}

export function usePrayers() {
  return useQuery({
    queryKey: PRAYERS_KEY,
    queryFn: () => backend.content.listPrayerRequests()
  });
}

export function useSaveAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnnouncementInput) => backend.content.saveAnnouncement(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.deleteAnnouncement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useSaveScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleItemInput) => backend.content.saveScheduleItem(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useDeleteScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.deleteScheduleItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useSaveMinistry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MinistryInput) => backend.content.saveMinistry(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useDeleteMinistry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.deleteMinistry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: ChurchProfile) => backend.content.updateProfile(profile),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useUpdatePrayerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PrayerRequest["status"] }) =>
      backend.content.updatePrayerRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRAYERS_KEY })
  });
}
