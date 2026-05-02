import type { FormEvent, ReactNode } from "react";
import { FieldGroup, type FieldGroupItem } from "./FieldGroup";

interface FormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  groups?: FieldGroupItem[];
  defaultGroup?: string;
  actionBar?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Form({ onSubmit, groups, defaultGroup, actionBar, children, className }: FormProps) {
  return (
    <form className={`form-shell${className ? ` ${className}` : ""}`} onSubmit={onSubmit}>
      {groups && groups.length > 0 ? <FieldGroup groups={groups} defaultGroup={defaultGroup} /> : children}
      {actionBar}
    </form>
  );
}

export default Form;
