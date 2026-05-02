import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FieldGroup } from "./FieldGroup";

const groups = [
  { id: "geral", label: "Geral", content: <p>Conteudo Geral</p> },
  { id: "detalhes", label: "Detalhes", content: <p>Conteudo Detalhes</p> },
  { id: "avancado", label: "Avancado", content: <p>Conteudo Avancado</p> }
];

describe("FieldGroup", () => {
  afterEach(() => cleanup());

  it("renders the first group by default", () => {
    render(<FieldGroup groups={groups} />);
    expect(screen.getByText("Conteudo Geral")).toBeInTheDocument();
    expect(screen.queryByText("Conteudo Detalhes")).not.toBeInTheDocument();
  });

  it("respects defaultGroup prop", () => {
    render(<FieldGroup groups={groups} defaultGroup="detalhes" />);
    expect(screen.getByText("Conteudo Detalhes")).toBeInTheDocument();
  });

  it("falls back to first group when defaultGroup id missing", () => {
    render(<FieldGroup groups={groups} defaultGroup="invalid" />);
    expect(screen.getByText("Conteudo Geral")).toBeInTheDocument();
  });

  it("switches content when tab clicked", () => {
    render(<FieldGroup groups={groups} />);
    fireEvent.click(screen.getByRole("tab", { name: "Avancado" }));
    expect(screen.getByText("Conteudo Avancado")).toBeInTheDocument();
    expect(screen.queryByText("Conteudo Geral")).not.toBeInTheDocument();
  });

  it("returns null when groups list is empty", () => {
    const { container } = render(<FieldGroup groups={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("sets aria-selected on active tab", () => {
    render(<FieldGroup groups={groups} />);
    const geralTab = screen.getByRole("tab", { name: "Geral" });
    expect(geralTab).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Detalhes" }));
    expect(screen.getByRole("tab", { name: "Detalhes" })).toHaveAttribute("aria-selected", "true");
  });
});
