import "@testing-library/jest-dom/vitest";
import type { Member, ScheduleItem, SiteSnapshot } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { configureAxe, type AxeMatchers } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/dist/matchers.js";

const mocks = vi.hoisted(() => ({
  listMembers: vi.fn().mockResolvedValue([]),
  listHouseholds: vi.fn().mockResolvedValue([]),
  listRelationships: vi.fn().mockResolvedValue([]),
  saveMinistry: vi.fn().mockResolvedValue({}),
  saveScheduleItem: vi.fn().mockResolvedValue({}),
  archiveScheduleItem: vi.fn().mockResolvedValue(undefined),
  restoreScheduleItem: vi.fn().mockResolvedValue(undefined),
  archiveMember: vi.fn().mockResolvedValue(undefined),
  restoreMember: vi.fn().mockResolvedValue(undefined),
  anonymizeMember: vi.fn().mockResolvedValue(undefined),
  archiveAnnouncement: vi.fn().mockResolvedValue(undefined),
  restoreAnnouncement: vi.fn().mockResolvedValue(undefined),
  saveAnnouncement: vi.fn().mockResolvedValue({}),
  duplicateScheduleItem: vi.fn().mockResolvedValue({}),
  bulkUpdateScheduleItems: vi.fn().mockResolvedValue([]),
  updateScheduleItemMembers: vi.fn().mockResolvedValue(undefined),
  findMemberDuplicates: vi.fn().mockResolvedValue([]),
  createMember: vi.fn().mockResolvedValue({}),
  updateMember: vi.fn().mockResolvedValue({})
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: mocks
  }
}));

import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import AnnouncementsView from "./AnnouncementsView";
import MembersView from "./MembersView";
import ScheduleView from "./ScheduleView";

declare module "vitest" {
  interface Assertion<T> extends AxeMatchers {
    _phantom?: T;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false }
  }
});

beforeAll(() => {
  expect.extend({ toHaveNoViolations });
});

function buildSnapshot(overrides: Partial<SiteSnapshot> = {}): SiteSnapshot {
  return {
    announcements: [],
    schedule: [],
    volunteers: [],
    profile: null,
    ministries: [],
    recurringMeetings: [],
    commemorations: [],
    ...overrides
  };
}

function makeScheduleItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "s1",
    title: "Culto",
    ministry: "louvor",
    startsAt: "2030-01-01T19:30:00.000Z",
    endsAt: "2030-01-01T21:00:00.000Z",
    location: "Templo",
    summary: "",
    preacher: "",
    director: "",
    soundTeam: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    seriesId: null,
    youtubeUrl: "",
    preacherMemberId: null,
    directorMemberId: null,
    soundMemberId: null,
    ...overrides
  };
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "m1",
    fullName: "Joao Silva",
    preferredName: "",
    birthDate: null,
    maritalStatus: null,
    gender: null,
    photoUrl: "",
    email: "",
    phone: "",
    whatsapp: "",
    cpf: null,
    rg: "",
    rgIssuer: "",
    profession: "",
    address: {
      zip: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: ""
    },
    householdId: null,
    churchRole: "membro_comum",
    membershipStatus: "ativo",
    joinedAt: null,
    baptismDate: null,
    baptismLocation: "",
    transferredFrom: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    prayerTopics: [],
    spiritualGifts: [],
    allergies: "",
    medicalNotes: "",
    consentMedicalDataAt: null,
    isVolunteer: false,
    volunteerMinistries: [],
    volunteerUnavailableDates: [],
    volunteerNotes: "",
    notes: "",
    consentGivenAt: null,
    consentVersion: "1.0",
    publicDirectory: false,
    publicBio: "",
    dataRetentionUntil: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function renderWithProviders(node: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>{node}</ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("a11y views", () => {
  afterEach(() => {
    cleanup();
    mocks.listMembers.mockReset().mockResolvedValue([]);
    mocks.listHouseholds.mockReset().mockResolvedValue([]);
    mocks.listRelationships.mockReset().mockResolvedValue([]);
  });

  it("MembersView com lista vazia nao viola regras axe", async () => {
    const { container } = renderWithProviders(
      <MembersView state={{ search: "", sort: "nameAsc", page: 1 }} onStateChange={vi.fn()} />
    );
    await waitFor(() => {
      expect(mocks.listMembers).toHaveBeenCalled();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("MembersView com membros listados nao viola regras axe", async () => {
    mocks.listMembers.mockResolvedValue([makeMember({ id: "m1", fullName: "Membro A11y" })]);
    const { container } = renderWithProviders(
      <MembersView state={{ search: "", sort: "nameAsc", page: 1 }} onStateChange={vi.fn()} />
    );
    await waitFor(() => {
      expect(mocks.listMembers).toHaveBeenCalled();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ScheduleView com itens nao viola regras axe", async () => {
    const snapshot = buildSnapshot({ schedule: [makeScheduleItem({ id: "s1", title: "Culto a11y" })] });
    const { container } = renderWithProviders(
      <ScheduleView
        snapshot={snapshot}
        state={{ search: "", sort: "startsAsc", page: 1 }}
        onStateChange={vi.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("AnnouncementsView vazio nao viola regras axe", async () => {
    const snapshot = buildSnapshot();
    const { container } = renderWithProviders(
      <AnnouncementsView
        snapshot={snapshot}
        state={{ search: "", sort: "publishedDesc", page: 1 }}
        onStateChange={vi.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
