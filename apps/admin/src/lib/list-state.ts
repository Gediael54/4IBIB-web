import { PAGE_SIZE } from "./limits";

export type ListView =
  | "announcements"
  | "schedule"
  | "prayers"
  | "volunteers"
  | "ministries"
  | "audit"
  | "team"
  | "annual"
  | "members"
  | "households";

export interface ListState {
  search: string;
  sort: string;
  page: number;
}

export type VolunteerRoleFilter = "all" | "geral" | "som";

export interface VisibleList<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

export const INITIAL_LIST_STATE: Record<ListView, ListState> = {
  announcements: { search: "", sort: "publishedDesc", page: 1 },
  schedule: { search: "", sort: "startsAsc", page: 1 },
  prayers: { search: "", sort: "createdDesc", page: 1 },
  volunteers: { search: "", sort: "nameAsc", page: 1 },
  ministries: { search: "", sort: "sortOrderAsc", page: 1 },
  audit: { search: "", sort: "changedDesc", page: 1 },
  team: { search: "", sort: "roleAsc", page: 1 },
  annual: { search: "", sort: "startsAsc", page: 1 },
  members: { search: "", sort: "nameAsc", page: 1 },
  households: { search: "", sort: "nameAsc", page: 1 }
};

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function matchesSearch(query: string, values: string[]): boolean {
  if (!query) {
    return true;
  }

  return values.some((value) => normalizeSearch(value).includes(query));
}

export function compareText(left: string, right: string): number {
  return left.localeCompare(right, "pt-BR");
}

export function paginateItems<T>(items: T[], page: number): VisibleList<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * PAGE_SIZE;

  return {
    items: items.slice(start, start + PAGE_SIZE),
    total: items.length,
    page: safePage,
    pageCount
  };
}
