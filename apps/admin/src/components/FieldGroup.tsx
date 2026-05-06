import { useId, useState, type ReactNode } from "react";

export interface FieldGroupItem {
  id: string;
  label: string;
  content: ReactNode;
  errorCount?: number;
}

interface FieldGroupProps {
  groups: FieldGroupItem[];
  defaultGroup?: string;
  activeGroup?: string;
  onActiveChange?: (id: string) => void;
}

export function FieldGroup({ groups, defaultGroup, activeGroup, onActiveChange }: FieldGroupProps) {
  const baseId = useId();
  const initial = defaultGroup && groups.some((g) => g.id === defaultGroup) ? defaultGroup : groups[0]?.id;
  const [internalActive, setInternalActive] = useState<string | undefined>(initial);
  const isControlled = activeGroup !== undefined;
  const active = isControlled ? activeGroup : internalActive;

  if (groups.length === 0) return null;

  const resolvedGroup = groups.find((g) => g.id === active) ?? groups[0];

  function selectGroup(id: string) {
    if (!isControlled) setInternalActive(id);
    onActiveChange?.(id);
  }

  return (
    <div className="field-group">
      <div className="field-group-tabs" role="tablist">
        {groups.map((group) => {
          const selected = group.id === resolvedGroup.id;
          const hasErrors = (group.errorCount ?? 0) > 0;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${group.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${group.id}`}
              tabIndex={selected ? 0 : -1}
              className={`field-group-tab${selected ? " active" : ""}${hasErrors ? " has-errors" : ""}`}
              onClick={() => selectGroup(group.id)}
            >
              <span className="field-group-tab-label">{group.label}</span>
              {hasErrors && (
                <span
                  className="field-group-tab-badge"
                  aria-label={`${group.errorCount} erro(s)`}
                  data-testid={`tab-error-badge-${group.id}`}
                >
                  {group.errorCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${resolvedGroup.id}`}
        aria-labelledby={`${baseId}-tab-${resolvedGroup.id}`}
        className="field-group-panel"
      >
        {resolvedGroup.content}
      </div>
    </div>
  );
}

export default FieldGroup;
