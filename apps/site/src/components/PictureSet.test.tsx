import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PictureSet from "./PictureSet";

describe("PictureSet", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders <picture> with avif and webp sources plus jpg fallback", () => {
    const { container } = render(<PictureSet src="/hero.jpg" alt="Fachada da igreja" />);
    const sources = container.querySelectorAll("source");
    expect(sources).toHaveLength(2);
    expect(sources[0]).toHaveAttribute("type", "image/avif");
    expect(sources[0]).toHaveAttribute("srcset", "/hero.avif");
    expect(sources[1]).toHaveAttribute("type", "image/webp");
    expect(sources[1]).toHaveAttribute("srcset", "/hero.webp");
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "/hero.jpg");
    expect(img).toHaveAttribute("alt", "Fachada da igreja");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("uses eager loading when requested and applies className", () => {
    const { container } = render(
      <PictureSet src="/intro.jpg" alt="Leitura biblica" loading="eager" className="hero-img" />
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveClass("hero-img");
  });

  it("derives source paths from nested public folders", () => {
    const { container } = render(<PictureSet src="/gallery-worship.jpg" alt="Cultos" />);
    const sources = container.querySelectorAll("source");
    expect(sources[0]).toHaveAttribute("srcset", "/gallery-worship.avif");
    expect(sources[1]).toHaveAttribute("srcset", "/gallery-worship.webp");
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/gallery-worship.jpg");
  });
});
