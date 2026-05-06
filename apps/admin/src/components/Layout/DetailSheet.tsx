import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

interface DetailSheetProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export default function DetailSheet({ open, title, subtitle, onClose, footer, children }: DetailSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="detail-sheet-overlay" onClick={onClose} role="presentation">
      <aside
        className="detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="detail-sheet-header">
          <div>
            <h2 className="detail-sheet-title">{title}</h2>
            {subtitle && <p className="detail-sheet-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="detail-sheet-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="detail-sheet-body">{children}</div>
        {footer && <footer className="detail-sheet-footer">{footer}</footer>}
      </aside>
    </div>
  );
}
