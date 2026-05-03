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

interface UndoToastOptions {
  message: string;
  onUndo: () => void;
  duration?: number;
  onTimeout?: () => void;
  undoLabel?: string;
}

interface ToastContextValue {
  toast: ((message: string, options?: ToastOptions) => void) & {
    undo: (options: UndoToastOptions) => void;
  };
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4000;
const DEFAULT_UNDO_DURATION = 10000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const baseToast = useCallback((message: string, options?: ToastOptions) => {
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

  const undo = useCallback(
    (options: UndoToastOptions) => {
      let undone = false;
      baseToast(options.message, {
        duration: options.duration ?? DEFAULT_UNDO_DURATION,
        action: {
          label: options.undoLabel ?? "Desfazer",
          onClick: () => {
            undone = true;
            options.onUndo();
          }
        }
      });
      if (options.onTimeout) {
        const total = options.duration ?? DEFAULT_UNDO_DURATION;
        window.setTimeout(() => {
          if (!undone) options.onTimeout?.();
        }, total);
      }
    },
    [baseToast]
  );

  const toast = useMemo<ToastContextValue["toast"]>(() => {
    const fn = ((message: string, options?: ToastOptions) =>
      baseToast(message, options)) as ToastContextValue["toast"];
    // eslint-disable-next-line react-hooks/immutability
    fn.undo = undo;
    return fn;
  }, [baseToast, undo]);

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
    <div className="toast-viewport" role="region" aria-label="Notificacoes" aria-live="polite">
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
