import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StickyActionBar } from "./StickyActionBar";

describe("StickyActionBar", () => {
  afterEach(() => cleanup());

  it("renders nothing when not visible", () => {
    const { container } = render(<StickyActionBar visible={false} onCancel={() => {}} onSave={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders default message and buttons when visible", () => {
    render(<StickyActionBar visible onCancel={() => {}} onSave={() => {}} />);
    expect(screen.getByText(/alteracoes nao salvas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeInTheDocument();
  });

  it("calls onSave and onCancel callbacks", () => {
    const save = vi.fn();
    const cancel = vi.fn();
    render(<StickyActionBar visible onCancel={cancel} onSave={save} />);
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("disables buttons when saving", () => {
    render(<StickyActionBar visible saving onCancel={() => {}} onSave={() => {}} />);
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeDisabled();
  });

  it("uses custom message and labels", () => {
    render(
      <StickyActionBar
        visible
        message="Pendente"
        saveLabel="Aplicar"
        cancelLabel="Descartar"
        onCancel={() => {}}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aplicar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /descartar/i })).toBeInTheDocument();
  });
});
