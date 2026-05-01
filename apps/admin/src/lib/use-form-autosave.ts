import { useEffect } from "react";
import { useWatch, type Control, type UseFormReset } from "react-hook-form";

export function useFormAutosave<T extends Record<string, unknown>>(
  key: string,
  control: Control<T>,
  reset: UseFormReset<T>,
  enabled = true
) {
  const values = useWatch({ control });

  useEffect(() => {
    if (!enabled) return;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        reset(JSON.parse(saved) as T);
      } catch {
        // ignore corrupt JSON
      }
    }
  }, [key, enabled, reset]);

  useEffect(() => {
    if (!enabled) return;
    if (values && Object.keys(values).length > 0) {
      localStorage.setItem(key, JSON.stringify(values));
    }
  }, [key, values, enabled]);
}

export function clearFormAutosave(key: string) {
  localStorage.removeItem(key);
}
