import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PrivacyPolicy, { PRIVACY_POLICY_LAST_UPDATED } from "./PrivacyPolicy";
import { CHURCH } from "../config/church";

describe("PrivacyPolicy", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders heading and lead paragraph", () => {
    render(<PrivacyPolicy />);
    expect(screen.getByRole("heading", { level: 1, name: /Politica de privacidade/i })).toBeInTheDocument();
    expect(screen.getByText(/Lei Geral de Protecao de Dados/i)).toBeInTheDocument();
  });

  it("mentions LGPD legal bases (Art. 7 incisos I and V)", () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(/Art\. 7, inciso I\)/)).toBeInTheDocument();
    expect(screen.getByText(/Art\. 7, inciso V e/)).toBeInTheDocument();
  });

  it("states the 18-month retention policy", () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(/18 meses/i)).toBeInTheDocument();
  });

  it("exposes contact email for data subject rights", () => {
    render(<PrivacyPolicy />);
    const mailLinks = screen.getAllByRole("link", { name: new RegExp(CHURCH.email, "i") });
    expect(mailLinks.length).toBeGreaterThan(0);
    expect(mailLinks[0]).toHaveAttribute("href", expect.stringContaining(`mailto:${CHURCH.email}`));
  });

  it("links back to home and to the user data page", () => {
    render(<PrivacyPolicy />);
    expect(screen.getByRole("link", { name: /Voltar/i })).toHaveAttribute("href", "#inicio");
    expect(screen.getByRole("link", { name: /Meus dados/i })).toHaveAttribute("href", "#meus-dados");
  });

  it("shows last updated date", () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(new RegExp(PRIVACY_POLICY_LAST_UPDATED))).toBeInTheDocument();
  });

  it("lists data processors (Cloudflare and Supabase)", () => {
    render(<PrivacyPolicy />);
    expect(screen.getAllByText(/Cloudflare/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Supabase/).length).toBeGreaterThan(0);
  });
});
