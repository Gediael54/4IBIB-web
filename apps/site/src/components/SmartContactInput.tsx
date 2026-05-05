import { useMemo, useState, type ChangeEvent } from "react";

type Mode = "auto" | "email" | "phone";

const PHONE_FIRST_CHAR = /^[0-9+(]/;
const EMAIL_FIRST_CHAR = /^[a-zA-Z]/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function detectContactMode(value: string): Mode {
  const trimmed = value.trimStart();
  if (!trimmed) return "auto";
  const first = trimmed[0];
  if (PHONE_FIRST_CHAR.test(first)) return "phone";
  if (EMAIL_FIRST_CHAR.test(first)) return "email";
  return "auto";
}

export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function validateContact(mode: Mode, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (mode === "email") {
    return EMAIL_RE.test(trimmed) ? null : "Esse email parece incompleto.";
  }
  if (mode === "phone") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10) return "Faltou o DDD ou alguns digitos.";
    if (digits.length > 11) return "Numero longo demais.";
    return null;
  }
  return "Use email ou WhatsApp com DDD.";
}

interface SmartContactInputProps {
  name: string;
  maxLength: number;
  required?: boolean;
}

export default function SmartContactInput({ name, maxLength, required }: SmartContactInputProps) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const mode = useMemo(() => detectContactMode(value), [value]);
  const error = touched && value.trim() ? validateContact(mode, value) : null;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (detectContactMode(next) === "phone") {
      setValue(maskPhone(next));
      return;
    }
    setValue(next);
  }

  return (
    <>
      <input
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        maxLength={maxLength}
        required={required}
        placeholder="WhatsApp (com DDD) ou email"
        inputMode={mode === "phone" ? "tel" : mode === "email" ? "email" : "text"}
        autoComplete={mode === "email" ? "email" : mode === "phone" ? "tel" : "off"}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <span id={`${name}-error`} className="form-hint danger" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
