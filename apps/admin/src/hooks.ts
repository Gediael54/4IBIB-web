import type {
  AdminRole,
  AnnouncementInput,
  AuditLogFilter,
  ChurchProfileInput,
  InviteAdminInput,
  MinistryInput,
  PrayerRequestPatch,
  PrayerStatus,
  RecurringMeetingInput,
  RenameVolunteerInput,
  ScheduleBulkPatch,
  ScheduleItemInput,
  VolunteerInput
} from "@4ibib/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backend } from "./backend";
import { addMutationBreadcrumb } from "./monitoring";

export { backend };

const SNAPSHOT_KEY = ["snapshot"] as const;
const PRAYERS_KEY = ["prayers"] as const;
const VOLUNTEERS_KEY = ["volunteers"] as const;
const ADMINS_KEY = ["admins"] as const;
const AUDIT_KEY = ["audit"] as const;

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
    onMutate: (input) => {
      addMutationBreadcrumb("save-announcement", { id: input.id ?? null });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.deleteAnnouncement(id),
    onMutate: (id) => {
      addMutationBreadcrumb("delete-announcement", { id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useSaveScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleItemInput) => backend.content.saveScheduleItem(input),
    onMutate: (input) => {
      addMutationBreadcrumb("save-schedule-item", { id: input.id ?? null });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useDeleteScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.deleteScheduleItem(id),
    onMutate: (id) => {
      addMutationBreadcrumb("delete-schedule-item", { id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useDuplicateScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.duplicateScheduleItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useBulkUpdateScheduleItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: ScheduleBulkPatch }) =>
      backend.content.bulkUpdateScheduleItems(ids, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useUpdatePrayerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PrayerStatus }) =>
      backend.content.updatePrayerRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRAYERS_KEY })
  });
}

export function useUpdatePrayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PrayerRequestPatch }) =>
      backend.content.updatePrayerRequest(id, patch),
    onMutate: ({ id }) => {
      addMutationBreadcrumb("update-prayer", { id });
    },
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
    onMutate: (input) => {
      addMutationBreadcrumb("save-volunteer", { id: input.id ?? null });
    },
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
    onMutate: (id) => {
      addMutationBreadcrumb("delete-volunteer", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOLUNTEERS_KEY });
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    }
  });
}

export function useRenameVolunteer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameVolunteerInput) => backend.content.renameVolunteer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOLUNTEERS_KEY });
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    }
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChurchProfileInput) => backend.content.saveProfile(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useSaveMinistry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MinistryInput) => backend.content.saveMinistry(input),
    onMutate: (input) => {
      addMutationBreadcrumb("save-ministry", { id: input.id ?? null });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useDeleteMinistry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.deleteMinistry(id),
    onMutate: (id) => {
      addMutationBreadcrumb("delete-ministry", { id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useSaveRecurringMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecurringMeetingInput) => backend.content.saveRecurringMeeting(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useDeleteRecurringMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.deleteRecurringMeeting(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}

export function useAdmins() {
  return useQuery({
    queryKey: ADMINS_KEY,
    queryFn: () => backend.content.listAdmins()
  });
}

export function useInviteAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteAdminInput) => backend.content.inviteAdmin(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMINS_KEY })
  });
}

export function useUpdateAdminRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AdminRole }) =>
      backend.content.updateAdminRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMINS_KEY })
  });
}

export function useRemoveAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => backend.content.removeAdmin(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMINS_KEY })
  });
}

export function useAuditLog(filter?: AuditLogFilter) {
  return useQuery({
    queryKey: [...AUDIT_KEY, filter ?? null],
    queryFn: () => backend.content.listAuditLog(filter)
  });
}

export function useRevertAuditEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.revertAuditEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUDIT_KEY });
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    }
  });
}
