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
});
