import type {
  AdminRole,
  AnnouncementInput,
  AuditLogFilter,
  ChurchProfileInput,
  Household,
  InviteAdminInput,
  Member,
  MemberRelationship,
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

const RETRY_DELAY_BASE_MS = 1000;
const RETRY_DELAY_CAP_MS = 5000;
const RETRY_MAX_ATTEMPTS = 2;

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const message = error.message.toLowerCase();
  if (message.includes("network") || message.includes("fetch") || message.includes("timeout")) {
    return true;
  }
  const candidate = error as { status?: number; statusCode?: number };
  const status = candidate.status ?? candidate.statusCode;
  if (typeof status === "number") {
    if (status >= 400 && status < 500) return false;
    if (status >= 500) return true;
  }
  return false;
}

const CRITICAL_RETRY = {
  retry: (failureCount: number, error: unknown) => {
    if (failureCount >= RETRY_MAX_ATTEMPTS) return false;
    return isRetryableError(error);
  },
  retryDelay: (attempt: number) => Math.min(RETRY_DELAY_BASE_MS * 2 ** attempt, RETRY_DELAY_CAP_MS)
} as const;

const SNAPSHOT_KEY = ["snapshot"] as const;
const PRAYERS_KEY = ["prayers"] as const;
const VOLUNTEERS_KEY = ["volunteers"] as const;
const ADMINS_KEY = ["admins"] as const;
const AUDIT_KEY = ["audit"] as const;
const MEMBERS_KEY = ["members"] as const;
const HOUSEHOLDS_KEY = ["households"] as const;
const RELATIONSHIPS_KEY = ["relationships"] as const;

export type MemberInput = Omit<Member, "id" | "createdAt" | "updatedAt" | "deletedAt"> & { id?: string };
export type HouseholdInput = Omit<Household, "id" | "createdAt" | "updatedAt" | "deletedAt"> & {
  id?: string;
};
export type RelationshipInput = Omit<MemberRelationship, "id" | "createdAt">;

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
    ...CRITICAL_RETRY,
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
    ...CRITICAL_RETRY,
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
    ...CRITICAL_RETRY,
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
    ...CRITICAL_RETRY,
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

export function useMembers(options?: { isVolunteer?: boolean; householdId?: string }) {
  return useQuery({
    queryKey: [...MEMBERS_KEY, options ?? null],
    queryFn: () => backend.content.listMembers(options)
  });
}

export function useHouseholds() {
  return useQuery({
    queryKey: HOUSEHOLDS_KEY,
    queryFn: () => backend.content.listHouseholds()
  });
}

export function useRelationships(memberId: string | null) {
  return useQuery({
    queryKey: [...RELATIONSHIPS_KEY, memberId],
    enabled: memberId !== null && memberId !== "",
    queryFn: () => backend.content.listRelationships(memberId ?? "")
  });
}

export function useSaveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    ...CRITICAL_RETRY,
    mutationFn: (input: MemberInput) => {
      const { id, ...rest } = input;
      if (id) {
        return backend.content.updateMember(id, rest);
      }
      return backend.content.createMember(rest);
    },
    onMutate: (input) => {
      addMutationBreadcrumb("save-member", { id: input.id ?? null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    }
  });
}

export function useArchiveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.archiveMember(id),
    onMutate: (id) => {
      addMutationBreadcrumb("archive-member", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    }
  });
}

export function useRestoreMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.restoreMember(id),
    onMutate: (id) => {
      addMutationBreadcrumb("restore-member", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    }
  });
}

export function useAnonymizeMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.anonymizeMember(id),
    onMutate: (id) => {
      addMutationBreadcrumb("anonymize-member", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
      queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    }
  });
}

export function useFindMemberDuplicates() {
  return useMutation({
    mutationFn: (input: { fullName: string; cpf: string | null; email: string; phone: string }) =>
      backend.content.findMemberDuplicates(input)
  });
}

export function useSaveHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    ...CRITICAL_RETRY,
    mutationFn: (input: HouseholdInput) => {
      const { id, ...rest } = input;
      if (id) {
        return backend.content.updateHousehold(id, rest);
      }
      return backend.content.createHousehold(rest);
    },
    onMutate: (input) => {
      addMutationBreadcrumb("save-household", { id: input.id ?? null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLDS_KEY });
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    }
  });
}

export function useArchiveHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.archiveHousehold(id),
    onMutate: (id) => {
      addMutationBreadcrumb("archive-household", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLDS_KEY });
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    }
  });
}

export function useSaveRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RelationshipInput) => backend.content.createRelationship(input),
    onMutate: (input) => {
      addMutationBreadcrumb("save-relationship", { fromMemberId: input.fromMemberId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RELATIONSHIPS_KEY });
    }
  });
}

export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.content.deleteRelationship(id),
    onMutate: (id) => {
      addMutationBreadcrumb("delete-relationship", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RELATIONSHIPS_KEY });
    }
  });
}

export function useUpdateScheduleItemMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      members
    }: {
      itemId: string;
      members: {
        preacherMemberId: string | null;
        directorMemberId: string | null;
        soundMemberId: string | null;
      };
    }) => backend.content.updateScheduleItemMembers(itemId, members),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  });
}
