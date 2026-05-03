import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

function ControlledModal({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Modal
      open={open}
      onClose={() => {
        setOpen(false);
        onClose?.();
      }}
      title="Titulo"
    >
      <button type="button">primeiro</button>
      <button type="button">segundo</button>
    </Modal>
  );
}

describe("Modal", () => {
  afterEach(() => cleanup());

  it("does not render when closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        conteudo
      </Modal>
    );
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("renders title and content when open", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Aberto">
        conteudo
      </Modal>
    );
    expect(screen.getByText("Aberto")).toBeInTheDocument();
    expect(screen.getByText("conteudo")).toBeInTheDocument();
  });

  it("calls onClose when ESC pressed", () => {
    const close = vi.fn();
    render(<ControlledModal onClose={close} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(close).toHaveBeenCalled();
  });

  it("calls onClose when close button clicked", () => {
    const close = vi.fn();
    render(<ControlledModal onClose={close} />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(close).toHaveBeenCalled();
  });

  it("focuses the first focusable element on open", async () => {
    render(<ControlledModal />);
    await Promise.resolve();
    expect(document.activeElement).toBe(screen.getByLabelText("Fechar"));
  });

  it("traps focus by cycling from last back to first", async () => {
    render(<ControlledModal />);
    await Promise.resolve();
    const closeBtn = screen.getByLabelText("Fechar");
    const last = screen.getByText("segundo");
    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);
  });

  it("cycles backwards from first to last on shift+Tab", async () => {
    render(<ControlledModal />);
    await Promise.resolve();
    const closeBtn = screen.getByLabelText("Fechar");
    const last = screen.getByText("segundo");
    closeBtn.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("renders footer when provided", () => {
    render(
      <Modal open onClose={() => {}} title="t" footer={<button>ok</button>}>
        x
      </Modal>
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("exposes aria-modal and aria-labelledby on dialog", () => {
    render(
      <Modal open onClose={() => {}} title="Confirmar">
        body
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    const titleEl = document.getElementById(labelId!);
    expect(titleEl).toHaveTextContent("Confirmar");
  });

  it("restores focus to the previously focused element when closed", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
            abrir
          </button>
          <Modal open={open} onClose={() => setOpen(false)} title="x">
            <button type="button">interno</button>
          </Modal>
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByTestId("trigger");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    await Promise.resolve();
    expect(document.activeElement).not.toBe(trigger);
    fireEvent.keyDown(window, { key: "Escape" });
    await Promise.resolve();
    expect(document.activeElement).toBe(trigger);
  });

  it("falls back to the close button when body has no focusables", async () => {
    render(
      <Modal open onClose={() => {}} title="Vazio">
        <span>somente texto</span>
      </Modal>
    );
    await Promise.resolve();
    const closeBtn = screen.getByLabelText("Fechar");
    expect(document.activeElement).toBe(closeBtn);
  });
});
