import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TurnstileWidget from "./TurnstileWidget";

interface MockTurnstile {
  render: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}

function installTurnstile(): MockTurnstile {
  const api: MockTurnstile = {
    render: vi.fn(() => "widget-1"),
    remove: vi.fn()
  };
  (window as unknown as { turnstile: MockTurnstile }).turnstile = api;
  return api;
}

function uninstallTurnstile() {
  delete (window as unknown as { turnstile?: MockTurnstile }).turnstile;
}

describe("TurnstileWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    uninstallTurnstile();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    uninstallTurnstile();
  });

  it("renders the widget when turnstile api is already loaded", () => {
    const api = installTurnstile();
    render(<TurnstileWidget siteKey="key-123" />);
    expect(api.render).toHaveBeenCalledTimes(1);
    const [container, options] = api.render.mock.calls[0];
    expect(container).toBeInstanceOf(HTMLDivElement);
    expect(options).toMatchObject({ sitekey: "key-123", theme: "light", language: "pt-BR" });
  });

  it("polls until turnstile script becomes available, then renders", () => {
    render(<TurnstileWidget siteKey="key-123" />);
    expect(window.turnstile).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    const api = installTurnstile();
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(api.render).toHaveBeenCalledTimes(1);
  });

  it("removes the widget on unmount", () => {
    const api = installTurnstile();
    const { unmount } = render(<TurnstileWidget siteKey="key-123" />);
    unmount();
    expect(api.remove).toHaveBeenCalledWith("widget-1");
  });

  it("stops polling after timeout when turnstile never loads", () => {
    render(<TurnstileWidget siteKey="key-123" />);
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    const api = installTurnstile();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(api.render).not.toHaveBeenCalled();
  });
});
