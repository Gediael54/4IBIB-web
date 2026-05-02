import "@testing-library/jest-dom/vitest";
import { Inbox } from "lucide-react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  afterEach(() => cleanup());

  it("renders title and description", () => {
    render(<EmptyState icon={<Inbox />} title="Sem itens" description="Nada por aqui" />);
    expect(screen.getByText("Sem itens")).toBeInTheDocument();
    expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
  });

  it("renders the action button when provided", () => {
    const handler = vi.fn();
    render(
      <EmptyState
        icon={<Inbox />}
        title="Vazio"
        action={
          <button type="button" onClick={handler}>
            Criar
          </button>
        }
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("omits description when not provided", () => {
    render(<EmptyState icon={<Inbox />} title="Vazio" />);
    expect(screen.queryByText(/Nada/)).not.toBeInTheDocument();
  });
});
