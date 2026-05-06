import type { AuditLogEntry } from "@4ibib/core";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { formatDateTime } from "@4ibib/core";
import { formatRelativeTime } from "../../lib/relative-time";
import { entryPhrase, entryTitle, tableLabel } from "./audit-phrases";

interface AuditTimelineItemProps {
  entry: AuditLogEntry;
  onRevert: (entry: AuditLogEntry) => void;
  reverting: boolean;
}

const ACTION_ICONS: Record<AuditLogEntry["action"], ReactNode> = {
  INSERT: <Plus aria-hidden="true" />,
  UPDATE: <Pencil aria-hidden="true" />,
  DELETE: <Trash2 aria-hidden="true" />
};

const ACTION_DOT_CLASS: Record<AuditLogEntry["action"], string> = {
  INSERT: "action-insert",
  UPDATE: "action-update",
  DELETE: "action-delete"
};

export function AuditTimelineItem({ entry, onRevert, reverting }: AuditTimelineItemProps) {
  const title = entryTitle(entry);
  const phrase = entryPhrase(entry);

  return (
    <li className="audit-timeline-item">
      <span className={`audit-timeline-dot ${ACTION_DOT_CLASS[entry.action]}`} aria-hidden="true">
        {ACTION_ICONS[entry.action]}
      </span>
      <div className="audit-timeline-card">
        <p className="audit-timeline-time" title={formatDateTime(entry.changedAt)}>
          {formatRelativeTime(entry.changedAt)}
        </p>
        <h3 className="audit-timeline-title">
          <span>{phrase}</span>
          {title && <span className="audit-timeline-quote">"{title}"</span>}
        </h3>
        <p className="audit-timeline-meta">
          <span>
            <strong>Por:</strong> {entry.changedBy ?? "sistema"}
          </span>
          <span>
            <strong>Tabela:</strong> {tableLabel(entry.tableName)}
          </span>
          <span>
            <strong>Registro:</strong> {entry.rowId}
          </span>
        </p>
        <details className="audit-timeline-details">
          <summary>Ver mudancas</summary>
          <div className="audit-timeline-diff">
            {entry.oldRow && (
              <div className="audit-timeline-diff-block">
                <p className="audit-timeline-diff-label">Antes</p>
                <pre>{JSON.stringify(entry.oldRow, null, 2)}</pre>
              </div>
            )}
            {entry.newRow && (
              <div className="audit-timeline-diff-block">
                <p className="audit-timeline-diff-label">Depois</p>
                <pre>{JSON.stringify(entry.newRow, null, 2)}</pre>
              </div>
            )}
          </div>
        </details>
        <div className="audit-timeline-actions">
          <button className="button ghost" type="button" disabled={reverting} onClick={() => onRevert(entry)}>
            Reverter
          </button>
        </div>
      </div>
    </li>
  );
}

export default AuditTimelineItem;
