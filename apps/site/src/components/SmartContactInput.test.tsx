import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SmartContactInput, { detectContactMode, maskPhone, validateContact } from "./SmartContactInput";

afterEach(cleanup);

describe("detectContactMode", () => {
  it("returns auto for empty input", () => {
    expect(detectContactMode("")).toBe("auto");
  });
  it("returns email when starting with letter", () => {
    expect(detectContactMode("ana@")).toBe("email");
  });
  it("returns phone when starting with digit, +, or (", () => {
    expect(detectContactMode("81")).toBe("phone");
    expect(detectContactMode("+55 81")).toBe("phone");
    expect(detectContactMode("(81)")).toBe("phone");
  });
});

describe("maskPhone", () => {
  it("formats partial digits with parens and dash", () => {
    expect(maskPhone("8")).toBe("(8");
    expect(maskPhone("81")).toBe("(81");
    expect(maskPhone("819")).toBe("(81) 9");
    expect(maskPhone("819812")).toBe("(81) 9812");
    expect(maskPhone("8198122")).toBe("(81) 9812-2");
    expect(maskPhone("81981220651")).toBe("(81) 98122-0651");
  });
  it("ignores non-digits", () => {
    expect(maskPhone("(81) 9-8122a0651")).toBe("(81) 98122-0651");
  });
});

describe("validateContact", () => {
  it("returns null when empty regardless of mode", () => {
    expect(validateContact("auto", "")).toBeNull();
    expect(validateContact("email", "  ")).toBeNull();
  });
  it("blocks invalid email", () => {
    expect(validateContact("email", "ana")).toMatch(/email/i);
    expect(validateContact("email", "ana@")).toMatch(/email/i);
  });
  it("accepts valid email", () => {
    expect(validateContact("email", "ana@church.org")).toBeNull();
  });
  it("blocks short phone", () => {
    expect(validateContact("phone", "(81) 9")).toMatch(/DDD/);
  });
  it("accepts 10 and 11 digit phones", () => {
    expect(validateContact("phone", "(81) 3333-4444")).toBeNull();
    expect(validateContact("phone", "(81) 98122-0651")).toBeNull();
  });
  it("flags ambiguous starts as invalid", () => {
    expect(validateContact("auto", "@@@")).toMatch(/WhatsApp/);
  });
});

describe("SmartContactInput component", () => {
  it("renders no hint when empty and untouched", () => {
    const { container } = render(<SmartContactInput name="contact" maxLength={180} />);
    expect(container.querySelector(".form-hint")).toBeNull();
  });
  it("masks phone digits as user types", () => {
    render(<SmartContactInput name="contact" maxLength={180} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "81981220651" } });
    expect(input.value).toBe("(81) 98122-0651");
  });
  it("preserves email text without masking", () => {
    render(<SmartContactInput name="contact" maxLength={180} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ana@church.org" } });
    expect(input.value).toBe("ana@church.org");
  });
  it("shows error after blur on invalid email", () => {
    render(<SmartContactInput name="contact" maxLength={180} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "ana" } });
    fireEvent.blur(input);
    expect(screen.getByText(/email parece incompleto/i)).toBeInTheDocument();
  });
  it("does not show error after blur when value is empty", () => {
    const { container } = render(<SmartContactInput name="contact" maxLength={180} />);
    fireEvent.blur(screen.getByRole("textbox"));
    expect(container.querySelector(".form-hint")).toBeNull();
  });
});
