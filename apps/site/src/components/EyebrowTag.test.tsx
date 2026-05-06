import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EyebrowTag, { categoryToVariant, ministryToLabel, ministryToVariant } from "./EyebrowTag";

describe("EyebrowTag", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders label text inside a span", () => {
    render(<EyebrowTag label="Juventude" variant="juventude" />);
    const tag = screen.getByText("Juventude");
    expect(tag.tagName).toBe("SPAN");
  });

  it("applies variant as suffix in className", () => {
    render(<EyebrowTag label="Evento" variant="evento" />);
    const tag = screen.getByText("Evento");
    expect(tag).toHaveClass("eyebrow-tag");
    expect(tag).toHaveClass("eyebrow-tag-evento");
  });

  it("falls back to default variant when none is provided", () => {
    render(<EyebrowTag label="Geral" />);
    const tag = screen.getByText("Geral");
    expect(tag).toHaveClass("eyebrow-tag-default");
  });
});

describe("categoryToVariant", () => {
  it("maps known announcement categories", () => {
    expect(categoryToVariant("geral")).toBe("geral");
    expect(categoryToVariant("evento")).toBe("evento");
    expect(categoryToVariant("juventude")).toBe("juventude");
    expect(categoryToVariant("oracao")).toBe("oracao");
  });

  it("returns default for unknown categories", () => {
    expect(categoryToVariant("desconhecido")).toBe("default");
    expect(categoryToVariant("")).toBe("default");
  });
});

describe("ministryToVariant", () => {
  it("maps known ministry slugs", () => {
    expect(ministryToVariant("culto")).toBe("culto");
    expect(ministryToVariant("culto-solene")).toBe("culto");
    expect(ministryToVariant("escola-biblica")).toBe("estudo");
    expect(ministryToVariant("louvor")).toBe("louvor");
    expect(ministryToVariant("juventude")).toBe("juventude");
  });

  it("returns default for unknown ministries", () => {
    expect(ministryToVariant("conselho")).toBe("default");
  });
});

describe("ministryToLabel", () => {
  it("returns humanized label for known slugs", () => {
    expect(ministryToLabel("culto")).toBe("Culto");
    expect(ministryToLabel("culto-solene")).toBe("Culto solene");
    expect(ministryToLabel("escola-biblica")).toBe("Escola biblica");
    expect(ministryToLabel("juventude")).toBe("Juventude");
  });

  it("returns trimmed original for unknown slugs and empty for blank", () => {
    expect(ministryToLabel("Pregacao")).toBe("Pregacao");
    expect(ministryToLabel("")).toBe("");
  });
});
