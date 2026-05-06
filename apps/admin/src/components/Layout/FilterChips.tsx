import type { ReactNode } from "react";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface FilterChipsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<ChipOption<T>>;
  ariaLabel?: string;
}

export default function FilterChips<T extends string>({
  value,
  onChange,
  options,
  ariaLabel
}: FilterChipsProps<T>) {
  return (
    <div className="filter-chips" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`filter-chip${selected ? " selected" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon && <span className="filter-chip-icon">{option.icon}</span>}
            <span>{option.label}</span>
            {typeof option.count === "number" && <span className="filter-chip-count">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
