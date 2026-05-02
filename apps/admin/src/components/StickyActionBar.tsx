import { LoaderCircle, Save } from "lucide-react";

interface StickyActionBarProps {
  visible: boolean;
  message?: string;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

export function StickyActionBar({
  visible,
  message = "Voce tem alteracoes nao salvas",
  onCancel,
  onSave,
  saving = false,
  saveLabel = "Salvar",
  cancelLabel = "Cancelar"
}: StickyActionBarProps) {
  if (!visible) return null;
  return (
    <div className="sticky-action-bar" role="region" aria-label="Acoes do formulario">
      <span className="sticky-action-message">{message}</span>
      <div className="sticky-action-buttons">
        <button type="button" className="button ghost" onClick={onCancel} disabled={saving}>
          {cancelLabel}
        </button>
        <button type="button" className="button primary" onClick={onSave} disabled={saving}>
          {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

export default StickyActionBar;
