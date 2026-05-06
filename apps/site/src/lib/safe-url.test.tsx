import { describe, expect, it } from "vitest";
import { safeUrl } from "./safe-url";

describe("safeUrl", () => {
  it("returns fallback for null and undefined", () => {
    expect(safeUrl(null)).toBe("#");
    expect(safeUrl(undefined)).toBe("#");
  });

  it("returns fallback for empty string", () => {
    expect(safeUrl("")).toBe("#");
  });

  it("uses provided fallback when input is empty", () => {
    expect(safeUrl(null, "/home")).toBe("/home");
  });

  it("blocks javascript: scheme", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("#");
    expect(safeUrl("JavaScript:alert(1)")).toBe("#");
  });

  it("blocks data: scheme", () => {
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
  });

  it("blocks vbscript: scheme", () => {
    expect(safeUrl("vbscript:msgbox(1)")).toBe("#");
  });

  it("allows https URL", () => {
    const url = "https://example.com/path?q=1";
    expect(safeUrl(url)).toBe(url);
  });

  it("allows http URL", () => {
    const url = "http://example.com/";
    expect(safeUrl(url)).toBe(url);
  });

  it("allows mailto: URL", () => {
    const url = "mailto:foo@example.com";
    expect(safeUrl(url)).toBe(url);
  });

  it("allows tel: URL", () => {
    const url = "tel:+5581981220651";
    expect(safeUrl(url)).toBe(url);
  });

  it("allows relative URLs (resolved against origin)", () => {
    const url = "/about";
    expect(safeUrl(url)).toBe(url);
  });

  it("returns fallback for invalid input", () => {
    expect(safeUrl("http://[invalid")).toBe("#");
  });
});
