import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShortcutsHelp } from "./ShortcutsHelp";

describe("ShortcutsHelp", () => {
  afterEach(() => cleanup());

  it("does not render when closed", () => {
    render(<ShortcutsHelp open={false} onClose={() => {}} />);
    expect(screen.queryByText("Atalhos de teclado")).not.toBeInTheDocument();
  });

  it("renders the title and shortcut entries when open", () => {
    render(<ShortcutsHelp open onClose={() => {}} />);
    expect(screen.getByText("Atalhos de teclado")).toBeInTheDocument();
    expect(screen.getByText("Abrir busca rapida")).toBeInTheDocument();
    expect(screen.getByText("Fechar modal ou busca")).toBeInTheDocument();
    expect(screen.getByText("Navegar pelos campos")).toBeInTheDocument();
    expect(screen.getByText("Abrir esta ajuda")).toBeInTheDocument();
  });

  it("renders kbd elements for each key", () => {
    const { container } = render(<ShortcutsHelp open onClose={() => {}} />);
    const kbdElements = container.querySelectorAll("kbd");
    expect(kbdElements.length).toBeGreaterThan(0);
  });

  it("calls onClose when Escape pressed", () => {
    const close = vi.fn();
    render(<ShortcutsHelp open onClose={close} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(close).toHaveBeenCalled();
  });

  it("calls onClose when close button clicked", () => {
    const close = vi.fn();
    render(<ShortcutsHelp open onClose={close} />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(close).toHaveBeenCalled();
  });
});
