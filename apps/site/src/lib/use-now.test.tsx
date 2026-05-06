import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNow } from "./use-now";

describe("useNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current Date.now() on mount", () => {
    const { result } = renderHook(() => useNow());
    expect(result.current).toBe(Date.parse("2026-05-06T10:00:00.000Z"));
  });

  it("ticks at the configured interval", () => {
    const { result } = renderHook(() => useNow(1_000));
    const initial = result.current;
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(initial + 1_000);
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current).toBe(initial + 3_000);
  });

  it("clears the interval on unmount", () => {
    const spy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useNow(1_000));
    unmount();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
