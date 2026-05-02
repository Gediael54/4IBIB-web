import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

type ToastVariant = "default" | "success" | "warning" | "danger";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const toast = useCallback((message: string, options?: ToastOptions) => {
    idRef.current += 1;
    const entry: ToastEntry = {
      id: idRef.current,
      message,
      variant: options?.variant ?? "default",
      duration: options?.duration ?? DEFAULT_DURATION,
      action: options?.action
    };
    setToasts((current) => {
      const next = [...current, entry];
      if (next.length > MAX_VISIBLE) {
        return next.slice(next.length - MAX_VISIBLE);
      }
      return next;
    });
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de ToastProvider.");
  }
  return ctx;
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastEntry[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-viewport" role="region" aria-label="Notificacoes">
      {toasts.map((entry) => (
        <ToastItem key={entry.id} entry={entry} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(entry.id), entry.duration);
    return () => window.clearTimeout(timer);
  }, [entry.id, entry.duration, onDismiss]);

  return (
    <div
      className={`toast toast-${entry.variant}`}
      role={entry.variant === "danger" ? "alert" : "status"}
      data-testid="toast"
    >
      <span className="toast-message">{entry.message}</span>
      {entry.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            entry.action?.onClick();
            onDismiss(entry.id);
          }}
        >
          {entry.action.label}
        </button>
      )}
      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(entry.id)}
        aria-label="Fechar notificacao"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default ToastProvider;
