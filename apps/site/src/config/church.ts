export interface RegularMeeting {
  title: string;
  weekday: string;
  startsAt: string;
  endsAt: string;
  description: string;
}

export interface Ministry {
  slug: string;
  name: string;
  summary: string;
  meetingTime: string;
  contact: string;
  color: string;
}

export const CHURCH = {
  name: "4a Igreja Batista Independente Betel",
  shortName: "4a Betel",
  tagline: "Uma igreja para servir a cidade com Palavra, comunhao e cuidado.",
  city: "Caruaru, PE",
  pastorName: "Pr. Samuel Costa",
  address: "478 Rua Jose Victor de Albuquerque",
  email: "contato@4abetel.org",
  whatsapp: "+55 81 98122-0651",
  instagramUrl: "https://www.instagram.com/4igrejabatista/",
  youtubeUrl: "https://www.youtube.com/@4aibibetel864",
  mapsUrl: "https://maps.google.com/?q=Av.+Central,+420+-+Centro",
  heroVerse:
    "Assim brilhe a luz de voces diante dos homens, para que vejam as suas boas obras e glorifiquem o Pai de voces que esta nos ceus. - Mateus 5.16",
  mission: "Cultivar discipulos de Jesus que servem com excelencia, oracao e acolhimento."
} as const;

export const REGULAR_MEETINGS: RegularMeeting[] = [
  { title: "Culto de louvor", weekday: "Quinta", startsAt: "19:30", endsAt: "21:00", description: "" },
  { title: "Escola Biblica", weekday: "Domingo", startsAt: "09:30", endsAt: "11:00", description: "" },
  { title: "Culto solene", weekday: "Domingo", startsAt: "17:00", endsAt: "19:00", description: "" }
];

export const MINISTRIES: Ministry[] = [
  { slug: "culto", name: "Culto", summary: "", meetingTime: "", contact: "", color: "#0f766e" },
  {
    slug: "escola-biblica",
    name: "Escola Biblica",
    summary: "",
    meetingTime: "",
    contact: "",
    color: "#0f766e"
  },
  { slug: "geral", name: "Geral", summary: "", meetingTime: "", contact: "", color: "#0f766e" },
  { slug: "mulheres", name: "Mulheres", summary: "", meetingTime: "", contact: "", color: "#0f766e" }
];
