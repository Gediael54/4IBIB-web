import type { AnnouncementInput, PrayerRequest, ScheduleItemInput, VolunteerInput } from "@4ibib/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backend } from "./backend";

export { backend };

const SNAPSHOT_KEY = ["snapshot"] as const;
const PRAYERS_KEY = ["prayers"] as const;
const VOLUNTEERS_KEY = ["volunteers"] as const;

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

export function useUpdatePrayerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PrayerRequest["status"] }) =>
      backend.content.updatePrayerRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRAYERS_KEY })
  });
}

export function useVolunteers() {
  return useQuery({
    queryKey: VOLUNTEERS_KEY,
    queryFn: () => backend.content.listVolunteers()
  });
}

export function useSaveVolunteer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VolunteerInput) => backend.content.saveVolunteer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOLUNTEERS_KEY });
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    }
  });
}

export function useDeleteVolunteer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.deleteVolunteer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOLUNTEERS_KEY });
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    }
  });
}
