import "@testing-library/jest-dom/vitest";
import type { ScheduleItem, SiteSnapshot } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bulkUpdateScheduleItems: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      bulkUpdateScheduleItems: mocks.bulkUpdateScheduleItems
    }
  }
}));

import { useAnnualSchedule } from "./use-annual-schedule";

function makeItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: overrides.id ?? "s1",
    title: "Culto solene",
    ministry: "Louvor",
    startsAt: "2026-01-04T17:00:00.000Z",
    endsAt: "2026-01-04T19:00:00.000Z",
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
    ...overrides
  };
}

function buildSnapshot(overrides: Partial<SiteSnapshot> = {}): SiteSnapshot {
  return {
    announcements: [],
    schedule: [],
    volunteers: [],
    profile: null,
    ministries: [],
    recurringMeetings: [],
    ...overrides
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useAnnualSchedule", () => {
  afterEach(() => {
    mocks.bulkUpdateScheduleItems.mockClear();
  });

  it("returns yearOptions including the current year", () => {
    const snapshot = buildSnapshot({
      schedule: [makeItem({ id: "1", startsAt: "2024-06-01T10:00:00.000Z" })]
    });
    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });
    const currentYear = new Date().getFullYear();
    expect(result.current.yearOptions).toContain(currentYear);
    expect(result.current.yearOptions).toContain(2024);
  });

  it("filters yearItems by year and ministry", () => {
    const snapshot = buildSnapshot({
      schedule: [
        makeItem({ id: "1", startsAt: "2026-03-01T10:00:00.000Z", ministry: "Louvor" }),
        makeItem({ id: "2", startsAt: "2026-04-01T10:00:00.000Z", ministry: "Diaconia" }),
        makeItem({ id: "3", startsAt: "2025-04-01T10:00:00.000Z", ministry: "Louvor" })
      ]
    });
    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });

    act(() => {
      result.current.setYear(2026);
    });
    expect(result.current.yearItems).toHaveLength(2);

    act(() => {
      result.current.setMinistryFilter("Louvor");
    });
    expect(result.current.yearItems).toHaveLength(1);
    expect(result.current.yearItems[0].id).toBe("1");
  });

  it("setPendingForCell creates a pending entry that differs from original", () => {
    const snapshot = buildSnapshot({
      schedule: [makeItem({ id: "1", preacher: "" })]
    });
    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });

    act(() => {
      result.current.setPendingForCell("1", "preacher", "Pastor Joao");
    });

    expect(result.current.pending.get("1")).toEqual({ preacher: "Pastor Joao" });
    expect(result.current.pendingCount).toBe(1);
  });

  it("setPendingForCell removes the entry when value matches original", () => {
    const snapshot = buildSnapshot({
      schedule: [makeItem({ id: "1", preacher: "Pastor" })]
    });
    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });

    act(() => {
      result.current.setPendingForCell("1", "preacher", "Pastor");
    });

    expect(result.current.pending.has("1")).toBe(false);
  });

  it("clearPending removes all pending changes", () => {
    const snapshot = buildSnapshot({
      schedule: [makeItem({ id: "1" })]
    });
    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });

    act(() => {
      result.current.setPendingForCell("1", "preacher", "Pastor");
    });
    expect(result.current.pendingCount).toBe(1);

    act(() => {
      result.current.clearPending();
    });
    expect(result.current.pendingCount).toBe(0);
  });

  it("applyPendingMap replaces the entire pending map", () => {
    const snapshot = buildSnapshot({
      schedule: [makeItem({ id: "1" })]
    });
    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });

    act(() => {
      result.current.applyPendingMap(new Map([["1", { director: "Joao" }]]));
    });
    expect(result.current.pending.get("1")).toEqual({ director: "Joao" });
  });

  it("handleSave does nothing when there are no pending changes", async () => {
    const snapshot = buildSnapshot();
    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.handleSave();
    });
    expect(mocks.bulkUpdateScheduleItems).not.toHaveBeenCalled();
  });

  it("handleSave dispatches mutations grouped by patch when no conflicts", async () => {
    const snapshot = buildSnapshot({
      schedule: [
        makeItem({ id: "1", startsAt: "2026-03-01T10:00:00.000Z" }),
        makeItem({ id: "2", startsAt: "2026-04-01T10:00:00.000Z" })
      ]
    });
    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });

    act(() => {
      result.current.setPendingForCell("1", "preacher", "Pastor A");
    });
    act(() => {
      result.current.setPendingForCell("2", "preacher", "Pastor B");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mocks.bulkUpdateScheduleItems).toHaveBeenCalledTimes(2);
  });

  it("handleSave warns about same-week conflicts and respects window.confirm cancel", async () => {
    const snapshot = buildSnapshot({
      schedule: [
        makeItem({ id: "1", startsAt: "2026-03-01T10:00:00.000Z" }),
        makeItem({ id: "2", startsAt: "2026-03-04T10:00:00.000Z" })
      ]
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });

    act(() => {
      result.current.setPendingForCell("1", "preacher", "Pastor A");
    });
    act(() => {
      result.current.setPendingForCell("2", "preacher", "Pastor A");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(mocks.bulkUpdateScheduleItems).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("handleSave records save error when mutation fails", async () => {
    mocks.bulkUpdateScheduleItems.mockRejectedValueOnce(new Error("boom"));
    const snapshot = buildSnapshot({
      schedule: [makeItem({ id: "1" })]
    });
    const { result } = renderHook(() => useAnnualSchedule(snapshot), { wrapper: createWrapper() });

    act(() => {
      result.current.setPendingForCell("1", "preacher", "Pastor A");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    await waitFor(() => {
      expect(result.current.saveError).toBe("boom");
    });
  });
});
