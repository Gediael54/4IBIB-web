import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "@4ibib/core";
import { CHURCH } from "../config/church";
import { categoryOf, displayLocation, getSoundTeam, nameMatches, occasionStyle, splitNames } from "./event";

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

describe("displayLocation", () => {
  it("falls back to CHURCH shortName + name when location is empty", () => {
    const result = displayLocation(makeItem({ location: "" }));
    expect(result.primary).toBe(CHURCH.shortName);
    expect(result.secondary).toBe(CHURCH.name);
  });

  it("falls back to CHURCH when location is 'Templo principal' (case-insensitive)", () => {
    const result = displayLocation(makeItem({ location: "Templo Principal" }));
    expect(result.primary).toBe(CHURCH.shortName);
    expect(result.secondary).toBe(CHURCH.name);
  });

  it("renders external location literal when provided", () => {
    const result = displayLocation(makeItem({ location: "Sitio Marcos 5" }));
    expect(result.primary).toBe("Sitio Marcos 5");
    expect(result.secondary).toBeUndefined();
  });
});

describe("occasionStyle", () => {
  it("returns null for empty label", () => {
    expect(occasionStyle("")).toBeNull();
  });

  it("returns the trimmed label as the badge label", () => {
    const style = occasionStyle("PASCOA");
    expect(style).not.toBeNull();
    expect(style!.label).toBe("PASCOA");
  });

  it("returns the same single-palette colors for any non-empty label", () => {
    const a = occasionStyle("PASCOA");
    const b = occasionStyle("MES DAS MISSOES");
    expect(a?.color).toBe(b?.color);
    expect(a?.background).toBe(b?.background);
    expect(a?.border).toBe(b?.border);
  });

  it("preserves the label as provided (with accents)", () => {
    expect(occasionStyle("Páscoa")?.label).toBe("Páscoa");
  });

  it("ignores surrounding whitespace", () => {
    expect(occasionStyle("  ")).toBeNull();
    expect(occasionStyle("  NATAL  ")?.label).toBe("NATAL");
  });
});

describe("splitNames", () => {
  it("splits comma separated values and trims whitespace", () => {
    expect(splitNames("Carlos, Maria , Joao")).toEqual(["Carlos", "Maria", "Joao"]);
  });

  it("returns empty array for empty/nullish input", () => {
    expect(splitNames("")).toEqual([]);
    expect(splitNames(undefined)).toEqual([]);
    expect(splitNames(null)).toEqual([]);
  });

  it("filters empty tokens", () => {
    expect(splitNames(",,Carlos,,")).toEqual(["Carlos"]);
  });
});

describe("getSoundTeam", () => {
  it("returns empty string when soundTeam is missing", () => {
    expect(getSoundTeam(makeItem())).toBe("");
  });

  it("returns the soundTeam string when present", () => {
    const item = { ...makeItem(), soundTeam: "Carlos, Maria" } as ScheduleItem;
    expect(getSoundTeam(item)).toBe("Carlos, Maria");
  });
});

describe("nameMatches", () => {
  it("returns false for empty query", () => {
    const item = makeItem({ preacher: "Pr. Samuel" });
    expect(nameMatches(item, "")).toBe(false);
    expect(nameMatches(item, "   ")).toBe(false);
  });

  it("matches preacher case-insensitively", () => {
    const item = makeItem({ preacher: "Pr. Samuel Costa" });
    expect(nameMatches(item, "samuel")).toBe(true);
  });

  it("matches director", () => {
    const item = makeItem({ director: "Joao" });
    expect(nameMatches(item, "joao")).toBe(true);
  });

  it("matches sound team names", () => {
    const item = { ...makeItem(), soundTeam: "Carlos, Maria" } as ScheduleItem;
    expect(nameMatches(item, "maria")).toBe(true);
  });

  it("returns false when name is not present", () => {
    const item = makeItem({ preacher: "Samuel" });
    expect(nameMatches(item, "joao")).toBe(false);
  });
});

describe("categoryOf", () => {
  it("classifies culto and culto-solene as cultos", () => {
    expect(categoryOf(makeItem({ ministry: "culto" }))).toBe("cultos");
    expect(categoryOf(makeItem({ ministry: "culto-solene" }))).toBe("cultos");
  });

  it("classifies escola-biblica as estudos", () => {
    expect(categoryOf(makeItem({ ministry: "escola-biblica" }))).toBe("estudos");
  });

  it("falls back to especiais for any other ministry", () => {
    expect(categoryOf(makeItem({ ministry: "juventude" }))).toBe("especiais");
    expect(categoryOf(makeItem({ ministry: "" }))).toBe("especiais");
  });
});
