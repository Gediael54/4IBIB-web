import { describe, expect, it } from "vitest";
import type { ChurchProfile, ScheduleItem } from "@4ibib/core";
import { displayLocation, occasionStyle } from "./event";

const PROFILE: ChurchProfile = {
  id: "main",
  name: "4a Igreja Batista Independente Betel",
  shortName: "4a Betel",
  tagline: "",
  city: "",
  pastorName: "",
  address: "",
  email: "",
  whatsapp: "",
  instagramUrl: "",
  youtubeUrl: "",
  mapsUrl: "",
  heroVerse: "",
  mission: "",
  foundedText: "",
  regularMeetings: [],
  updatedAt: ""
};

function makeItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "evt",
    title: "Culto",
    ministry: "",
    startsAt: "2026-02-01T20:00:00.000Z",
    endsAt: "2026-02-01T22:00:00.000Z",
    location: "",
    summary: "",
    preacher: "",
    director: "",
    passage: "",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    ...overrides
  };
}

describe("displayLocation", () => {
  it("falls back to profile shortName + name when location is empty", () => {
    const result = displayLocation(makeItem({ location: "" }), PROFILE);
    expect(result.primary).toBe(PROFILE.shortName);
    expect(result.secondary).toBe(PROFILE.name);
  });

  it("falls back to profile when location is 'Templo principal' (case-insensitive)", () => {
    const result = displayLocation(makeItem({ location: "Templo Principal" }), PROFILE);
    expect(result.primary).toBe(PROFILE.shortName);
    expect(result.secondary).toBe(PROFILE.name);
  });

  it("renders external location literal when provided", () => {
    const result = displayLocation(makeItem({ location: "Sitio Marcos 5" }), PROFILE);
    expect(result.primary).toBe("Sitio Marcos 5");
    expect(result.secondary).toBeUndefined();
  });
});

describe("occasionStyle", () => {
  it("returns null for empty label", () => {
    expect(occasionStyle("")).toBeNull();
  });

  it("matches PASCOA with lavender palette", () => {
    const style = occasionStyle("PASCOA");
    expect(style).not.toBeNull();
    expect(style!.color).toBe("#5b21b6");
  });

  it("matches MES DAS MISSOES via 'MISSO' substring", () => {
    const style = occasionStyle("MES DAS MISSOES");
    expect(style?.color).toBe("#0f766e");
  });

  it("matches NATAL with rose palette", () => {
    expect(occasionStyle("NATAL")?.color).toBe("#9f1239");
  });

  it("matches CARNAVAL with amber palette", () => {
    expect(occasionStyle("CARNAVAL")?.color).toBe("#92400e");
  });

  it("falls back to neutral palette for unknown labels", () => {
    const style = occasionStyle("ALGO DIFERENTE");
    expect(style).not.toBeNull();
    expect(style!.label).toBe("ALGO DIFERENTE");
  });

  it("preserves the label as provided (with accents)", () => {
    expect(occasionStyle("Páscoa")?.label).toBe("Páscoa");
  });
});
