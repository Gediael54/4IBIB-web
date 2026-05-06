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
    expect(screen.getByRole("link", { name: /início/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quem somos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /programação/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pregações/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /doações/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pedido de oração/i })).toBeInTheDocument();
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
    expect(screen.getByRole("dialog", { name: /menu de navegação/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /menu de navegação/i })).toBeNull();
  });

  it("expands Quem somos sub-list inside drawer", () => {
    render(<SiteNav />);
    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));
    const drawer = screen.getByRole("dialog", { name: /menu de navegação/i });
    const drawerGroup = within(drawer).getByRole("button", { name: /quem somos/i });
    fireEvent.click(drawerGroup);
    expect(within(drawer).getByRole("link", { name: /confissão de fé/i })).toBeInTheDocument();
  });

  it("marks the drawer as aria-modal and locks body scroll", () => {
    render(<SiteNav />);
    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));
    const drawer = screen.getByRole("dialog", { name: /menu de navegação/i });
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body scroll and returns focus to burger when drawer closes", () => {
    render(<SiteNav />);
    const burger = screen.getByRole("button", { name: /abrir menu/i });
    fireEvent.click(burger);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(burger);
  });

  it("traps Tab inside the drawer (wraps from last to first)", () => {
    render(<SiteNav />);
    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));
    const drawer = screen.getByRole("dialog", { name: /menu de navegação/i });
    const focusables = drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    const last = focusables[focusables.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(document.activeElement).toBe(focusables[0]);
  });
});
