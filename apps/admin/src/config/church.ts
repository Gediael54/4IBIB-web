export interface Ministry {
  slug: string;
  name: string;
}

export const MINISTRIES: Ministry[] = [
  { slug: "culto", name: "Culto" },
  { slug: "escola-biblica", name: "Escola Biblica" },
  { slug: "geral", name: "Geral" },
  { slug: "mulheres", name: "Mulheres" }
];
