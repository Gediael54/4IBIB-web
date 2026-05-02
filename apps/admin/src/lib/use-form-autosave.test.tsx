import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearFormAutosave, useFormAutosave } from "./use-form-autosave";

type SampleForm = { title: string; body: string } & Record<string, unknown>;

const STORAGE_KEY = "form-autosave-test";

function useFormWithAutosave(initial: SampleForm, enabled = true) {
  const form = useForm<SampleForm>({ defaultValues: initial });
  useFormAutosave<SampleForm>(STORAGE_KEY, form.control, form.reset, enabled);
  return form;
}

describe("useFormAutosave", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists watched values to localStorage", async () => {
    const { result } = renderHook(() => useFormWithAutosave({ title: "", body: "" }));

    act(() => {
      result.current.setValue("title", "Novo titulo");
    });

    await act(async () => {
      await Promise.resolve();
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved as string)).toMatchObject({ title: "Novo titulo" });
  });

  it("restores values from localStorage on mount", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: "Restaurado", body: "Conteudo restaurado" }));

    const { result } = renderHook(() => useFormWithAutosave({ title: "", body: "" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.getValues()).toEqual({
      title: "Restaurado",
      body: "Conteudo restaurado"
    });
  });

  it("ignores corrupt JSON in localStorage", async () => {
    localStorage.setItem(STORAGE_KEY, "{not-json");

    const { result } = renderHook(() => useFormWithAutosave({ title: "Original", body: "Body" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.getValues()).toEqual({ title: "Original", body: "Body" });
  });

  it("does not persist or restore when disabled", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: "Salvo", body: "Body" }));

    const { result } = renderHook(() => useFormWithAutosave({ title: "Original", body: "" }, false));

    act(() => {
      result.current.setValue("title", "Mudou");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.getValues().title).toBe("Mudou");
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ title: "Salvo", body: "Body" }));
  });

  it("clearFormAutosave removes the entry from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: "x", body: "y" }));
    clearFormAutosave(STORAGE_KEY);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
