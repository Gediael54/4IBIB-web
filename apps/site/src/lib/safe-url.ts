const SAFE_SCHEMES = ["https:", "http:", "mailto:", "tel:"];

export function safeUrl(input: string | null | undefined, fallback = "#"): string {
  if (!input) return fallback;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(input, base);
    return SAFE_SCHEMES.includes(u.protocol) ? input : fallback;
  } catch {
    return fallback;
  }
}
