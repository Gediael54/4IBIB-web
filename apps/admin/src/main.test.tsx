import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uniqueSorted } from "./lib/list-state";
import { runWithViewTransition } from "./lib/view-transition";

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

describe("runWithViewTransition", () => {
  const docAny = document as unknown as Record<string, unknown>;
  const originalStart = docAny.startViewTransition;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    docAny.startViewTransition = undefined;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })) as typeof window.matchMedia;
  });

  afterEach(() => {
    docAny.startViewTransition = originalStart;
    window.matchMedia = originalMatchMedia;
  });

  it("invokes the callback directly when startViewTransition is unavailable", () => {
    const callback = vi.fn();
    runWithViewTransition(callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("delegates to document.startViewTransition when available", () => {
    const callback = vi.fn();
    const start = vi.fn((cb: () => void) => {
      cb();
      return {};
    });
    docAny.startViewTransition = start;

    runWithViewTransition(callback);

    expect(start).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("skips startViewTransition when prefers-reduced-motion is set", () => {
    const callback = vi.fn();
    const start = vi.fn();
    docAny.startViewTransition = start;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })) as typeof window.matchMedia;

    runWithViewTransition(callback);

    expect(start).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
