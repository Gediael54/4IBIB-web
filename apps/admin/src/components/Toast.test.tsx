import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function TriggerButton({
  message,
  opts
}: {
  message: string;
  opts?: Parameters<ReturnType<typeof useToast>["toast"]>[1];
}) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(message, opts)}>
      fire
    </button>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("fires a toast and auto dismisses after duration", () => {
    render(
      <ToastProvider>
        <TriggerButton message="Salvo" opts={{ duration: 1000 }} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("fire"));
    expect(screen.getByText("Salvo")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText("Salvo")).not.toBeInTheDocument();
  });

  it("renders action button and dismisses on click", () => {
    const action = vi.fn();
    render(
      <ToastProvider>
        <TriggerButton
          message="Excluido"
          opts={{ duration: 5000, action: { label: "Desfazer", onClick: action } }}
        />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("fire"));
    fireEvent.click(screen.getByText("Desfazer"));
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Excluido")).not.toBeInTheDocument();
  });

  it("limits visible toasts to three", () => {
    render(
      <ToastProvider>
        <TriggerButton message="t1" opts={{ duration: 5000 }} />
      </ToastProvider>
    );
    const button = screen.getByText("fire");
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getAllByTestId("toast")).toHaveLength(3);
  });

  it("throws when useToast is used outside provider", () => {
    function Broken() {
      useToast();
      return null;
    }
    const original = console.error;
    console.error = () => {};
    expect(() => render(<Broken />)).toThrow();
    console.error = original;
  });

  it("uses role=alert for danger variant and role=status for others", () => {
    render(
      <ToastProvider>
        <TriggerButton message="Erro" opts={{ duration: 5000, variant: "danger" }} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("fire"));
    expect(screen.getByRole("alert")).toHaveTextContent("Erro");
  });

  it("uses role=status for success variant", () => {
    render(
      <ToastProvider>
        <TriggerButton message="Salvo" opts={{ duration: 5000, variant: "success" }} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("fire"));
    expect(screen.getByRole("status")).toHaveTextContent("Salvo");
  });

  it("viewport region has aria-live polite", () => {
    render(
      <ToastProvider>
        <TriggerButton message="ola" opts={{ duration: 5000 }} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("fire"));
    const region = screen.getByRole("region", { name: "Notificacoes" });
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("undo() shows toast with Desfazer action and triggers onUndo", () => {
    function UndoTrigger({ onUndo }: { onUndo: () => void }) {
      const { toast } = useToast();
      return (
        <button
          type="button"
          onClick={() => toast.undo({ message: "Aviso arquivado.", onUndo, duration: 5000 })}
        >
          archive
        </button>
      );
    }
    const onUndo = vi.fn();
    render(
      <ToastProvider>
        <UndoTrigger onUndo={onUndo} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("archive"));
    expect(screen.getByText("Aviso arquivado.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Desfazer"));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Aviso arquivado.")).not.toBeInTheDocument();
  });

  it("undo() calls onTimeout when duration expires without undoing", () => {
    function UndoTrigger({ onTimeout }: { onTimeout: () => void }) {
      const { toast } = useToast();
      return (
        <button
          type="button"
          onClick={() => toast.undo({ message: "Vai sumir.", onUndo: () => {}, duration: 1000, onTimeout })}
        >
          fire
        </button>
      );
    }
    const onTimeout = vi.fn();
    render(
      <ToastProvider>
        <UndoTrigger onTimeout={onTimeout} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("fire"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("undo() does NOT call onTimeout when user clicked Desfazer first", () => {
    function UndoTrigger({ onTimeout, onUndo }: { onTimeout: () => void; onUndo: () => void }) {
      const { toast } = useToast();
      return (
        <button type="button" onClick={() => toast.undo({ message: "x", onUndo, duration: 1000, onTimeout })}>
          fire
        </button>
      );
    }
    const onTimeout = vi.fn();
    const onUndo = vi.fn();
    render(
      <ToastProvider>
        <UndoTrigger onTimeout={onTimeout} onUndo={onUndo} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("fire"));
    fireEvent.click(screen.getByText("Desfazer"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onUndo).toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("undo() supports a custom undoLabel", () => {
    function UndoTrigger() {
      const { toast } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            toast.undo({ message: "x", onUndo: () => {}, duration: 5000, undoLabel: "Reverter" })
          }
        >
          fire
        </button>
      );
    }
    render(
      <ToastProvider>
        <UndoTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("fire"));
    expect(screen.getByText("Reverter")).toBeInTheDocument();
  });
});
