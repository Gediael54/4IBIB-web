import { useId, useState, type ReactNode } from "react";

export interface FieldGroupItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface FieldGroupProps {
  groups: FieldGroupItem[];
  defaultGroup?: string;
}

export function FieldGroup({ groups, defaultGroup }: FieldGroupProps) {
  const baseId = useId();
  const initial = defaultGroup && groups.some((g) => g.id === defaultGroup) ? defaultGroup : groups[0]?.id;
  const [active, setActive] = useState<string | undefined>(initial);

  if (groups.length === 0) return null;

  const activeGroup = groups.find((g) => g.id === active) ?? groups[0];

  return (
    <div className="field-group">
      <div className="field-group-tabs" role="tablist">
        {groups.map((group) => {
          const selected = group.id === activeGroup.id;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${group.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${group.id}`}
              tabIndex={selected ? 0 : -1}
              className={`field-group-tab${selected ? " active" : ""}`}
              onClick={() => setActive(group.id)}
            >
              {group.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeGroup.id}`}
        aria-labelledby={`${baseId}-tab-${activeGroup.id}`}
        className="field-group-panel"
      >
        {activeGroup.content}
      </div>
    </div>
  );
}

export default FieldGroup;
