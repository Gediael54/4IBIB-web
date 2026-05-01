import { type ScheduleBulkPatch, type ScheduleItem, type SiteSnapshot } from "@4ibib/core";
import { useMemo, useState } from "react";
import { useBulkUpdateScheduleItems } from "../../hooks";
import {
  applyPending,
  getCurrentValue,
  ROLE_LABELS,
  type PendingState,
  type RoleColumn,
  startOfWeek
} from "./cadence";

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit"
});

export interface UseAnnualScheduleResult {
  year: number;
  setYear: (value: number) => void;
  ministryFilter: string;
  setMinistryFilter: (value: string) => void;
  yearOptions: number[];
  ministryOptions: string[];
  yearItems: ScheduleItem[];
  pending: Map<string, PendingState>;
  pendingCount: number;
  setPendingForCell: (itemId: string, role: RoleColumn, value: string) => void;
  applyPendingMap: (next: Map<string, PendingState>) => void;
  clearPending: () => void;
  saveError: string | null;
  isSaving: boolean;
  handleSave: () => Promise<void>;
}

export function useAnnualSchedule(snapshot: SiteSnapshot): UseAnnualScheduleResult {
  const bulkMutation = useBulkUpdateScheduleItems();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const item of snapshot.schedule) {
      const parsed = new Date(item.startsAt);
      if (Number.isFinite(parsed.getTime())) {
        years.add(parsed.getFullYear());
      }
    }
    return Array.from(years).sort((left, right) => left - right);
  }, [snapshot.schedule, currentYear]);

  const [year, setYear] = useState<number>(currentYear);
  const [ministryFilter, setMinistryFilter] = useState<string>("all");
  const [pending, setPending] = useState<Map<string, PendingState>>(new Map());
  const [saveError, setSaveError] = useState<string | null>(null);

  const ministryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of snapshot.schedule) {
      if (item.ministry.trim()) {
        set.add(item.ministry);
      }
    }
    return Array.from(set).sort((left, right) => left.localeCompare(right, "pt-BR"));
  }, [snapshot.schedule]);

  const yearItems = useMemo(() => {
    return snapshot.schedule
      .filter((item) => {
        const parsed = new Date(item.startsAt);
        if (!Number.isFinite(parsed.getTime())) return false;
        if (parsed.getFullYear() !== year) return false;
        if (ministryFilter !== "all" && item.ministry !== ministryFilter) return false;
        return true;
      })
      .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  }, [snapshot.schedule, year, ministryFilter]);

  function setPendingForCell(itemId: string, role: RoleColumn, value: string) {
    setPending((current) => {
      const next = new Map(current);
      const existing = next.get(itemId) ?? {};
      const updated: PendingState = { ...existing, [role]: value };
      const original = snapshot.schedule.find((entry) => entry.id === itemId);
      if (original) {
        const stillDifferent = (Object.keys(updated) as RoleColumn[]).some(
          (key) => updated[key] !== undefined && updated[key] !== getCurrentValue(original, key)
        );
        const cleaned: PendingState = {};
        (Object.keys(updated) as RoleColumn[]).forEach((key) => {
          const candidate = updated[key];
          if (candidate !== undefined && candidate !== getCurrentValue(original, key)) {
            cleaned[key] = candidate;
          }
        });
        if (!stillDifferent || Object.keys(cleaned).length === 0) {
          next.delete(itemId);
          return next;
        }
        next.set(itemId, cleaned);
        return next;
      }
      next.set(itemId, updated);
      return next;
    });
  }

  function applyPendingMap(nextMap: Map<string, PendingState>) {
    setPending(nextMap);
  }

  function clearPending() {
    setPending(new Map());
  }

  function buildBatch(): Array<{ id: string; patch: ScheduleBulkPatch }> {
    const batch: Array<{ id: string; patch: ScheduleBulkPatch }> = [];
    pending.forEach((state, id) => {
      const patch: ScheduleBulkPatch = {};
      if (state.preacher !== undefined) patch.preacher = state.preacher;
      if (state.director !== undefined) patch.director = state.director;
      if (state.soundTeam !== undefined) patch.soundTeam = state.soundTeam;
      if (Object.keys(patch).length > 0) {
        batch.push({ id, patch });
      }
    });
    return batch;
  }

  function detectConflicts(): string[] {
    const warnings: string[] = [];
    const byRoleVolunteerWeek = new Map<string, ScheduleItem[]>();
    for (const item of yearItems) {
      const merged = applyPending(item, pending.get(item.id));
      const week = startOfWeek(item.startsAt);
      (Object.keys(ROLE_LABELS) as RoleColumn[]).forEach((role) => {
        const value = getCurrentValue(merged, role);
        if (!value.trim()) return;
        const names =
          role === "soundTeam"
            ? value
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean)
            : [value.trim()];
        for (const name of names) {
          const key = `${role}::${name}::${week}`;
          const list = byRoleVolunteerWeek.get(key) ?? [];
          list.push(item);
          byRoleVolunteerWeek.set(key, list);
        }
      });
    }
    byRoleVolunteerWeek.forEach((items, key) => {
      if (items.length < 2) return;
      const [role, name] = key.split("::");
      const dates = items.map((entry) => FULL_DATE_FORMATTER.format(new Date(entry.startsAt))).join(" e ");
      warnings.push(
        `${ROLE_LABELS[role as RoleColumn]} ${name} ${items.length}x na mesma semana (${dates}).`
      );
    });
    return warnings;
  }

  const pendingCount = useMemo(
    () => buildBatch().length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, snapshot.schedule]
  );

  async function handleSave() {
    const batch = buildBatch();
    if (batch.length === 0) return;
    const conflicts = detectConflicts();
    if (conflicts.length > 0) {
      const message = `Atencao:\n${conflicts.join("\n")}\nContinuar?`;
      if (!window.confirm(message)) {
        return;
      }
    }
    setSaveError(null);
    try {
      const grouped = new Map<string, string[]>();
      for (const entry of batch) {
        const key = JSON.stringify(entry.patch);
        const list = grouped.get(key) ?? [];
        list.push(entry.id);
        grouped.set(key, list);
      }
      for (const [key, ids] of grouped.entries()) {
        const patch = JSON.parse(key) as ScheduleBulkPatch;
        await bulkMutation.mutateAsync({ ids, patch });
      }
      clearPending();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Falha ao salvar mudancas.");
    }
  }

  return {
    year,
    setYear,
    ministryFilter,
    setMinistryFilter,
    yearOptions,
    ministryOptions,
    yearItems,
    pending,
    pendingCount,
    setPendingForCell,
    applyPendingMap,
    clearPending,
    saveError,
    isSaving: bulkMutation.isPending,
    handleSave
  };
}
