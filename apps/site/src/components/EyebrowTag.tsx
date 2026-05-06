export type EyebrowVariant =
  | "geral"
  | "evento"
  | "juventude"
  | "oracao"
  | "culto"
  | "louvor"
  | "estudo"
  | "default";

export interface EyebrowTagProps {
  label: string;
  variant?: EyebrowVariant;
}

const CATEGORY_VARIANTS: Record<string, EyebrowVariant> = {
  geral: "geral",
  evento: "evento",
  juventude: "juventude",
  oracao: "oracao"
};

const MINISTRY_VARIANTS: Record<string, EyebrowVariant> = {
  culto: "culto",
  "culto-solene": "culto",
  "escola-biblica": "estudo",
  estudo: "estudo",
  estudos: "estudo",
  louvor: "louvor",
  juventude: "juventude",
  oracao: "oracao",
  evento: "evento",
  eventos: "evento"
};

const MINISTRY_LABELS: Record<string, string> = {
  culto: "Culto",
  "culto-solene": "Culto solene",
  "escola-biblica": "Escola biblica",
  estudo: "Estudo",
  louvor: "Louvor",
  juventude: "Juventude",
  oracao: "Oracao",
  evento: "Evento"
};

export function ministryToLabel(ministry: string): string {
  const key = ministry?.trim().toLowerCase() ?? "";
  if (!key) return "";
  return MINISTRY_LABELS[key] ?? ministry.trim();
}

export function categoryToVariant(category: string): EyebrowVariant {
  const key = category?.trim().toLowerCase() ?? "";
  return CATEGORY_VARIANTS[key] ?? "default";
}

export function ministryToVariant(ministry: string): EyebrowVariant {
  const key = ministry?.trim().toLowerCase() ?? "";
  return MINISTRY_VARIANTS[key] ?? "default";
}

export default function EyebrowTag({ label, variant = "default" }: EyebrowTagProps) {
  return <span className={`eyebrow-tag eyebrow-tag-${variant}`}>{label}</span>;
}
