import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

const OPTIONS: ReadonlyArray<{
  value: ThemeChoice;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon }
];

function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const value = window.localStorage.getItem("theme");
  return value === "light" || value === "dark" ? value : "system";
}

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    window.localStorage.removeItem("theme");
    root.removeAttribute("data-theme");
    return;
  }
  window.localStorage.setItem("theme", choice);
  root.setAttribute("data-theme", choice);
}

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(readStoredTheme);

  function handleSelect(next: ThemeChoice) {
    applyTheme(next);
    setChoice(next);
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Tema da interface">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => handleSelect(option.value)}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
