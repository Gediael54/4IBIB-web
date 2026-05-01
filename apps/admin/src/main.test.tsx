import { describe, expect, it } from "vitest";
import { uniqueSorted } from "./lib/list-state";

describe("uniqueSorted", () => {
  it("removes duplicates regardless of surrounding whitespace", () => {
    expect(uniqueSorted(["Pastor", "  Pastor  ", "Pastor"])).toEqual(["Pastor"]);
  });

  it("filters out empty and whitespace-only entries", () => {
    expect(uniqueSorted(["", "   ", "Templo", "\t"])).toEqual(["Templo"]);
  });

  it("sorts results alphabetically using pt-BR locale", () => {
    expect(uniqueSorted(["Zelo", "Aviva", "Ágape", "Betel"])).toEqual(["Ágape", "Aviva", "Betel", "Zelo"]);
  });

  it("returns an empty list when all values are blank", () => {
    expect(uniqueSorted(["", " ", "\n"])).toEqual([]);
  });

  it("trims values before deduplicating", () => {
    expect(uniqueSorted(["  Louvor", "Louvor  ", "Diaconia"])).toEqual(["Diaconia", "Louvor"]);
  });
});
