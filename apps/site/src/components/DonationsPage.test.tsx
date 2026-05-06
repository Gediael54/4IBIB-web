import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DonationsPage from "./DonationsPage";

vi.mock("../lib/church-context", () => ({
  useChurchProfile: () => ({ shortName: "4a Betel", whatsapp: "+55 81 98122-0651" })
}));

describe("DonationsPage", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the page title and PIX key", () => {
    render(<DonationsPage />);
    expect(screen.getByRole("heading", { level: 1, name: /doações/i })).toBeInTheDocument();
    expect(screen.getByText("46.882.520/0001-76")).toBeInTheDocument();
  });

  it("copies the PIX key when the button is clicked and toggles label", async () => {
    render(<DonationsPage />);
    const button = screen.getByRole("button", { name: /copiar chave/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(writeText).toHaveBeenCalledWith("46.882.520/0001-76");
    expect(screen.getByRole("button", { name: /copiado/i })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2400);
    });
    expect(screen.getByRole("button", { name: /copiar chave/i })).toBeInTheDocument();
  });
});
