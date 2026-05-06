import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PageShell from "./PageShell";

describe("PageShell", () => {
  afterEach(cleanup);

  it("renders title and children", () => {
    render(
      <PageShell title="Pagina">
        <p>Conteudo</p>
      </PageShell>
    );
    expect(screen.getByRole("heading", { level: 1, name: /pagina/i })).toBeInTheDocument();
    expect(screen.getByText("Conteudo")).toBeInTheDocument();
  });

  it("renders eyebrow and lead when provided", () => {
    render(
      <PageShell eyebrow="Categoria" title="Titulo" lead="Descricao da pagina">
        <p>x</p>
      </PageShell>
    );
    expect(screen.getByText("Categoria")).toBeInTheDocument();
    expect(screen.getByText("Descricao da pagina")).toBeInTheDocument();
  });

  it("renders default back link to #inicio", () => {
    render(
      <PageShell title="X">
        <p>x</p>
      </PageShell>
    );
    const back = screen.getByRole("link", { name: /voltar/i });
    expect(back).toHaveAttribute("href", "#inicio");
  });

  it("respects custom back href and label", () => {
    render(
      <PageShell title="X" back={{ href: "#agenda", label: "Voltar pra agenda" }}>
        <p>x</p>
      </PageShell>
    );
    const back = screen.getByRole("link", { name: /voltar pra agenda/i });
    expect(back).toHaveAttribute("href", "#agenda");
  });

  it("renders breadcrumb with last item as current page (not link)", () => {
    render(
      <PageShell
        title="X"
        breadcrumb={[
          { href: "#inicio", label: "Inicio" },
          { href: "#quem-somos", label: "Quem somos" },
          { href: "#confissao-de-fe", label: "Confissao de fe" }
        ]}
      >
        <p>x</p>
      </PageShell>
    );
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "#inicio");
    expect(screen.getByRole("link", { name: "Quem somos" })).toHaveAttribute("href", "#quem-somos");
    expect(screen.queryByRole("link", { name: "Confissao de fe" })).toBeNull();
    expect(screen.getByText("Confissao de fe")).toBeInTheDocument();
  });
});
