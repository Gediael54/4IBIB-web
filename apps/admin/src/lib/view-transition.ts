export function runWithViewTransition(callback: () => void): void {
  if (typeof document === "undefined") {
    callback();
    return;
  }
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  if (reduced || typeof start !== "function") {
    callback();
    return;
  }
  (start as (cb: () => void) => unknown).call(document, callback);
}
