export const ANNOUNCEMENT_SORT_OPTIONS = [
  { value: "publishedDesc", label: "Mais recentes" },
  { value: "publishedAsc", label: "Mais antigos" },
  { value: "titleAsc", label: "Titulo A-Z" },
  { value: "categoryAsc", label: "Categoria A-Z" },
  { value: "statusAsc", label: "Status A-Z" }
] as const;

export const SCHEDULE_SORT_OPTIONS = [
  { value: "startsAsc", label: "Data crescente" },
  { value: "startsDesc", label: "Data decrescente" },
  { value: "titleAsc", label: "Titulo A-Z" },
  { value: "ministryAsc", label: "Ministerio A-Z" },
  { value: "statusAsc", label: "Status A-Z" }
] as const;

export const PRAYER_SORT_OPTIONS = [
  { value: "createdDesc", label: "Mais recentes" },
  { value: "createdAsc", label: "Mais antigos" },
  { value: "statusAsc", label: "Status A-Z" },
  { value: "nameAsc", label: "Nome A-Z" }
] as const;

export const VOLUNTEER_SORT_OPTIONS = [
  { value: "nameAsc", label: "Nome A-Z" },
  { value: "nameDesc", label: "Nome Z-A" },
  { value: "roleAsc", label: "Funcao A-Z" },
  { value: "sortOrderAsc", label: "Ordem manual" }
] as const;

export const MINISTRY_SORT_OPTIONS = [
  { value: "sortOrderAsc", label: "Ordem manual" },
  { value: "nameAsc", label: "Nome A-Z" },
  { value: "nameDesc", label: "Nome Z-A" }
] as const;

export const AUDIT_SORT_OPTIONS = [
  { value: "changedDesc", label: "Mais recentes" },
  { value: "changedAsc", label: "Mais antigos" },
  { value: "tableAsc", label: "Tabela A-Z" }
] as const;

export const TEAM_SORT_OPTIONS = [
  { value: "roleAsc", label: "Funcao (owner primeiro)" },
  { value: "emailAsc", label: "Email A-Z" },
  { value: "createdDesc", label: "Mais recentes" }
] as const;

export const MEMBER_SORT_OPTIONS = [
  { value: "nameAsc", label: "Nome A-Z" },
  { value: "nameDesc", label: "Nome Z-A" },
  { value: "joinedDesc", label: "Mais recentes" },
  { value: "roleAsc", label: "Funcao A-Z" }
] as const;

export const HOUSEHOLD_SORT_OPTIONS = [
  { value: "nameAsc", label: "Nome A-Z" },
  { value: "nameDesc", label: "Nome Z-A" }
] as const;
