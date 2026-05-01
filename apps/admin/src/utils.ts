import { formatDateLabel, formatTimeRange, type ScheduleItem } from "@4ibib/core";

export const TEXT_MAX = 200;
export const TEXTAREA_MAX = 2000;
export const URL_MAX = 500;
export const PAGE_SIZE = 8;

export type ListView =
  | "announcements"
  | "schedule"
  | "prayers"
  | "volunteers"
  | "ministries"
  | "audit"
  | "team"
  | "annual";

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
  annual: { search: "", sort: "startsAsc", page: 1 }
};

export const ANNOUNCEMENT_SORT_OPTIONS = [
  { value: "publishedDesc", label: "Mais recentes" },
  { value: "publishedAsc", label: "Mais antigos" },
  { value: "titleAsc", label: "Titulo A-Z" },
  { value: "categoryAsc", label: "Categoria A-Z" },
  { value: "statusAsc", label: "Status A-Z" }
];

export const ANNOUNCEMENT_STATUS_OPTIONS: Array<{
  value: "all" | "draft" | "scheduled" | "published" | "archived";
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "scheduled", label: "Agendado" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" }
];

export const SCHEDULE_SORT_OPTIONS = [
  { value: "startsAsc", label: "Data crescente" },
  { value: "startsDesc", label: "Data decrescente" },
  { value: "titleAsc", label: "Titulo A-Z" },
  { value: "ministryAsc", label: "Ministerio A-Z" },
  { value: "statusAsc", label: "Status A-Z" }
];

export const PRAYER_SORT_OPTIONS = [
  { value: "createdDesc", label: "Mais recentes" },
  { value: "createdAsc", label: "Mais antigos" },
  { value: "statusAsc", label: "Status A-Z" },
  { value: "nameAsc", label: "Nome A-Z" }
];

export const PRAYER_STATUS_OPTIONS: Array<{
  value: "all" | "novo" | "em_oracao" | "concluido";
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "em_oracao", label: "Em oracao" },
  { value: "concluido", label: "Concluido" }
];

export const VOLUNTEER_SORT_OPTIONS = [
  { value: "nameAsc", label: "Nome A-Z" },
  { value: "nameDesc", label: "Nome Z-A" },
  { value: "roleAsc", label: "Funcao A-Z" },
  { value: "sortOrderAsc", label: "Ordem manual" }
];

export const VOLUNTEER_ROLE_OPTIONS: Array<{ value: VolunteerRoleFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "geral", label: "Geral" },
  { value: "som", label: "Som" }
];

export const VOLUNTEER_ROLE_LABELS: Record<"geral" | "som", string> = {
  geral: "Geral",
  som: "Som"
};

export const MINISTRY_SORT_OPTIONS = [
  { value: "sortOrderAsc", label: "Ordem manual" },
  { value: "nameAsc", label: "Nome A-Z" },
  { value: "nameDesc", label: "Nome Z-A" }
];

export const AUDIT_SORT_OPTIONS = [
  { value: "changedDesc", label: "Mais recentes" },
  { value: "changedAsc", label: "Mais antigos" },
  { value: "tableAsc", label: "Tabela A-Z" }
];

export const AUDIT_TABLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "announcements", label: "Avisos" },
  { value: "schedule_items", label: "Programacao" },
  { value: "volunteers", label: "Voluntarios" },
  { value: "prayer_requests", label: "Oracao" },
  { value: "church_profile", label: "Perfil" },
  { value: "ministries", label: "Ministerios" },
  { value: "recurring_meetings", label: "Encontros regulares" }
];

export const AUDIT_ACTION_OPTIONS: Array<{ value: "all" | "INSERT" | "UPDATE" | "DELETE"; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "INSERT", label: "Criacao" },
  { value: "UPDATE", label: "Edicao" },
  { value: "DELETE", label: "Exclusao" }
];

export const TEAM_SORT_OPTIONS = [
  { value: "roleAsc", label: "Funcao (owner primeiro)" },
  { value: "emailAsc", label: "Email A-Z" },
  { value: "createdDesc", label: "Mais recentes" }
];

export const ADMIN_ROLE_LABELS: Record<"owner" | "editor", string> = {
  owner: "Owner",
  editor: "Editor"
};

export const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

export function formatScheduleDetail(item: ScheduleItem): string {
  const base = `${formatDateLabel(item.startsAt)} - ${formatTimeRange(item.startsAt, item.endsAt)} - ${item.ministry}`;
  if (item.status === "suspended") return `${base} (SUSPENSO)`;
  if (item.status === "free") return `${base} (LIVRE)`;
  return base;
}

export function formatDateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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

export function normalizeOptionalHttpUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const url = new URL(trimmed);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("invalid protocol");
  }
  return url.toString();
}

export function isValidOptionalHttpUrl(value: string): boolean {
  if (!value || !value.trim()) {
    return true;
  }

  try {
    normalizeOptionalHttpUrl(value);
    return true;
  } catch {
    return false;
  }
}
