import { Save } from "lucide-react";
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";
import { TEXT_MAX, type VisibleList } from "../utils";

export const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(function Field({ label, error, ...inputProps }, ref) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input ref={ref} {...inputProps} />
      {error && <small className="form-error">{error}</small>}
    </label>
  );
});

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }
>(function TextAreaField({ label, error, ...textareaProps }, ref) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <textarea ref={ref} {...textareaProps} />
      {error && <small className="form-error">{error}</small>}
    </label>
  );
});

export const SelectField = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode; error?: string }
>(function SelectField({ label, children, error, ...selectProps }, ref) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <select ref={ref} {...selectProps}>
        {children}
      </select>
      {error && <small className="form-error">{error}</small>}
    </label>
  );
});

export function FormActions(props: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="form-actions">
      <button className="button primary" disabled={props.saving} type="submit">
        <Save size={18} /> Salvar
      </button>
      <button className="button ghost" onClick={props.onCancel} type="button">
        Limpar
      </button>
    </div>
  );
}

export function ListToolbar(props: {
  search: string;
  searchLabel: string;
  sort: string;
  sortOptions: Array<{ value: string; label: string }>;
  total: number;
  onSearch: (value: string) => void;
  onSort: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="list-toolbar">
      <Field
        label="Buscar"
        type="search"
        value={props.search}
        placeholder={props.searchLabel}
        maxLength={TEXT_MAX}
        onChange={(event) => props.onSearch(event.currentTarget.value)}
      />
      <SelectField
        label="Ordenar"
        value={props.sort}
        onChange={(event) => props.onSort(event.currentTarget.value)}
      >
        {props.sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      {props.children}
      <span>{props.total} itens</span>
    </div>
  );
}

export function Pagination(props: { list: VisibleList<unknown>; onPageChange: (page: number) => void }) {
  if (props.list.pageCount <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <span>
        Pagina {props.list.page} de {props.list.pageCount}
      </span>
      <button
        className="button ghost"
        type="button"
        disabled={props.list.page <= 1}
        onClick={() => props.onPageChange(props.list.page - 1)}
      >
        Anterior
      </button>
      <button
        className="button ghost"
        type="button"
        disabled={props.list.page >= props.list.pageCount}
        onClick={() => props.onPageChange(props.list.page + 1)}
      >
        Proxima
      </button>
    </div>
  );
}

export function CrudPanel<T>(props: {
  title: string;
  items: T[];
  children: ReactNode;
  renderItem: (item: T) => ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyLabel?: string;
}) {
  return (
    <section>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Conteudo</p>
          <h1>{props.title}</h1>
        </div>
      </header>
      <div className="crud-layout">
        <div className="list-panel">
          {props.toolbar}
          {props.items.map(props.renderItem)}
          {props.items.length === 0 && (
            <p className="empty-note">{props.emptyLabel ?? "Nenhum registro encontrado."}</p>
          )}
          {props.footer}
        </div>
        <div className="editor-panel">{props.children}</div>
      </div>
    </section>
  );
}

export function ItemRow(props: { title: string; detail: string; children: ReactNode }) {
  return (
    <article className="item-row">
      <div>
        <strong>{props.title}</strong>
        <span>{props.detail}</span>
      </div>
      <div className="row-actions">{props.children}</div>
    </article>
  );
}
