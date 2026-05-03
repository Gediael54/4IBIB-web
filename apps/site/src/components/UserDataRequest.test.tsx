import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import UserDataRequest from "./UserDataRequest";
import { CHURCH } from "../config/church";

describe("UserDataRequest", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the meus dados heading", () => {
    render(<UserDataRequest />);
    expect(screen.getByRole("heading", { level: 1, name: /Meus dados/i })).toBeInTheDocument();
  });

  it("provides a mailto link with the LGPD subject", () => {
    render(<UserDataRequest />);
    const link = screen.getByRole("link", { name: new RegExp(CHURCH.email, "i") });
    expect(link.getAttribute("href")).toContain(`mailto:${CHURCH.email}`);
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain("Direitos do titular - LGPD");
  });

  it("mentions the 15 business days response deadline", () => {
    render(<UserDataRequest />);
    expect(screen.getByText(/15 dias uteis/i)).toBeInTheDocument();
  });

  it("lists the LGPD rights", () => {
    render(<UserDataRequest />);
    const rightsList = screen.getByRole("list");
    const titleTexts = within(rightsList)
      .getAllByText((_, element) => element?.tagName === "STRONG")
      .map((node) => node.textContent ?? "");
    expect(titleTexts).toEqual([
      "Acesso.",
      "Correcao.",
      "Anonimizacao ou bloqueio.",
      "Portabilidade.",
      "Eliminacao.",
      "Revogacao do consentimento."
    ]);
  });

  it("links back to home and to the privacy policy", () => {
    render(<UserDataRequest />);
    expect(screen.getByRole("link", { name: /Voltar/i })).toHaveAttribute("href", "#inicio");
    expect(screen.getByRole("link", { name: /politica de privacidade/i })).toHaveAttribute(
      "href",
      "#politica-privacidade"
    );
  });
});
