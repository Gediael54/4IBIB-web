import type { AuditAction, AuditLogEntry } from "@4ibib/core";

interface TablePhrase {
  singular: string;
  feminine: boolean;
}

const TABLE_PHRASES: Record<string, TablePhrase> = {
  announcements: { singular: "Aviso", feminine: false },
  schedule_items: { singular: "Item de programacao", feminine: false },
  volunteers: { singular: "Voluntario", feminine: false },
  prayer_requests: { singular: "Pedido de oracao", feminine: false },
  church_profile: { singular: "Perfil da igreja", feminine: false },
  ministries: { singular: "Ministerio", feminine: false },
  recurring_meetings: { singular: "Encontro regular", feminine: false },
  members: { singular: "Membro", feminine: false }
};

const ACTION_VERBS: Record<AuditAction, { masc: string; fem: string }> = {
  INSERT: { masc: "criado", fem: "criada" },
  UPDATE: { masc: "atualizado", fem: "atualizada" },
  DELETE: { masc: "excluido", fem: "excluida" }
};

const ACTION_ICONS: Record<AuditAction, string> = {
  INSERT: "+",
  UPDATE: "~",
  DELETE: "-"
};

const TITLE_FIELDS: ReadonlyArray<string> = ["title", "name", "full_name", "fullName", "label", "summary"];

function pickTitle(row: Record<string, unknown> | null): string | null {
  if (!row) return null;
  for (const field of TITLE_FIELDS) {
    const value = row[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function entryTitle(entry: AuditLogEntry): string | null {
  return pickTitle(entry.newRow) ?? pickTitle(entry.oldRow);
}

export function entryActionIcon(action: AuditAction): string {
  return ACTION_ICONS[action];
}

export function entryPhrase(entry: AuditLogEntry): string {
  const phrase = TABLE_PHRASES[entry.tableName] ?? { singular: entry.tableName, feminine: false };
  const verb = ACTION_VERBS[entry.action];
  const verbForm = phrase.feminine ? verb.fem : verb.masc;
  const article = phrase.feminine ? "foi" : "foi";
  return `${phrase.singular} ${article} ${verbForm}`;
}

export function tableLabel(tableName: string): string {
  return TABLE_PHRASES[tableName]?.singular ?? tableName;
}
