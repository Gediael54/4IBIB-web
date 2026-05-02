import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileTopbar } from "./MobileTopbar";

describe("MobileTopbar", () => {
  afterEach(() => cleanup());

  it("renders title", () => {
    render(<MobileTopbar title="Resumo" drawerOpen={false} onToggleDrawer={() => {}} />);
    expect(screen.getByRole("heading", { name: "Resumo" })).toBeInTheDocument();
  });

  it("calls onToggleDrawer when hamburger clicked", () => {
    const toggle = vi.fn();
    render(<MobileTopbar title="x" drawerOpen={false} onToggleDrawer={toggle} />);
    fireEvent.click(screen.getByLabelText("Abrir menu"));
    expect(toggle).toHaveBeenCalled();
  });

  it("reflects drawerOpen state via aria-expanded", () => {
    const { rerender } = render(<MobileTopbar title="x" drawerOpen={false} onToggleDrawer={() => {}} />);
    expect(screen.getByLabelText("Abrir menu")).toHaveAttribute("aria-expanded", "false");
    rerender(<MobileTopbar title="x" drawerOpen={true} onToggleDrawer={() => {}} />);
    expect(screen.getByLabelText("Abrir menu")).toHaveAttribute("aria-expanded", "true");
  });

  it("renders optional action node", () => {
    render(
      <MobileTopbar
        title="x"
        drawerOpen={false}
        onToggleDrawer={() => {}}
        action={<button type="button">novo</button>}
      />
    );
    expect(screen.getByRole("button", { name: "novo" })).toBeInTheDocument();
  });
});
