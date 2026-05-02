import "@testing-library/jest-dom/vitest";
import { Inbox } from "lucide-react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";
import { ListView } from "./ListView";

interface Item {
  id: string;
  label: string;
}

const items: Item[] = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" }
];

describe("ListView", () => {
  afterEach(() => cleanup());

  it("renders title, count and items", () => {
    render(
      <ListView
        title="Avisos"
        count={items.length}
        items={items}
        renderItem={(item) => <span>{item.label}</span>}
      />
    );
    expect(screen.getByText("Avisos")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows skeleton rows when loading", () => {
    render(<ListView title="x" items={[]} loading renderItem={() => null} />);
    expect(screen.getByTestId("skeleton-rows")).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(
      <ListView
        title="x"
        items={[]}
        renderItem={() => null}
        emptyState={<EmptyState icon={<Inbox />} title="Sem avisos" />}
      />
    );
    expect(screen.getByText("Sem avisos")).toBeInTheDocument();
  });

  it("renders default empty note when no emptyState passed", () => {
    render(<ListView title="x" items={[]} renderItem={() => null} />);
    expect(screen.getByText("Nenhum item.")).toBeInTheDocument();
  });

  it("renders error banner with retry callback", () => {
    const retry = vi.fn();
    render(
      <ListView title="x" items={[]} error={{ message: "Falhou", onRetry: retry }} renderItem={() => null} />
    );
    expect(screen.getByText("Falhou")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("renders bulk actions when items selected", () => {
    const onSelectionChange = vi.fn();
    render(
      <ListView
        title="x"
        items={items}
        getId={(item) => item.id}
        selectable
        selectedIds={["a"]}
        onSelectionChange={onSelectionChange}
        bulkActions={<button>Excluir</button>}
        renderItem={(item) => <span>{item.label}</span>}
      />
    );
    expect(screen.getByText("1 selecionado(s)")).toBeInTheDocument();
    expect(screen.getByText("Excluir")).toBeInTheDocument();
  });

  it("toggles selection when row checkbox clicked", () => {
    const onSelectionChange = vi.fn();
    render(
      <ListView
        title="x"
        items={items}
        getId={(item) => item.id}
        selectable
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
        renderItem={(item) => <span>{item.label}</span>}
      />
    );
    const checkboxes = screen.getAllByLabelText("Selecionar item");
    fireEvent.click(checkboxes[0]);
    expect(onSelectionChange).toHaveBeenCalledWith(["a"]);
  });

  it("toggles all when select-all clicked", () => {
    const onSelectionChange = vi.fn();
    render(
      <ListView
        title="x"
        items={items}
        getId={(item) => item.id}
        selectable
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
        renderItem={(item) => <span>{item.label}</span>}
      />
    );
    fireEvent.click(screen.getByLabelText("Selecionar todos"));
    expect(onSelectionChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it("renders primary action and footer", () => {
    render(
      <ListView
        title="x"
        items={items}
        renderItem={(item) => <span>{item.label}</span>}
        primaryAction={<button>Novo</button>}
        footer={<span>rodape</span>}
      />
    );
    expect(screen.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText("rodape")).toBeInTheDocument();
  });
});
