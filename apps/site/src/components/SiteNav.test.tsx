import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SiteNav from "./SiteNav";

vi.mock("../lib/church-context", () => ({
  useChurchProfile: () => ({ shortName: "4a Betel", whatsapp: "" })
}));

afterEach(cleanup);

describe("SiteNav", () => {
  it("renders core links and CTA", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: /inicio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quem somos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /programacao/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pregacoes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /doacoes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pedido de oracao/i })).toBeInTheDocument();
  });

  it("opens and closes the Quem somos dropdown", () => {
    render(<SiteNav />);
    const trigger = screen.getByRole("button", { name: /quem somos/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the mobile drawer via burger and closes via Escape", () => {
    render(<SiteNav />);
    const burger = screen.getByRole("button", { name: /abrir menu/i });
    fireEvent.click(burger);
    expect(screen.getByRole("dialog", { name: /menu de navegacao/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /menu de navegacao/i })).toBeNull();
  });

  it("expands Quem somos sub-list inside drawer", () => {
    render(<SiteNav />);
    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));
    const drawer = screen.getByRole("dialog", { name: /menu de navegacao/i });
    const drawerGroup = within(drawer).getByRole("button", { name: /quem somos/i });
    fireEvent.click(drawerGroup);
    expect(within(drawer).getByRole("link", { name: /confissao de fe/i })).toBeInTheDocument();
  });
});
