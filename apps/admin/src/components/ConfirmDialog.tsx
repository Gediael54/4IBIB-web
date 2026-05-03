import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal } from "./Modal";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  requireText?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [typedText, setTypedText] = useState("");
  const pendingRef = useRef<PendingConfirm | null>(null);

  const finish = useCallback((value: boolean) => {
    const current = pendingRef.current;
    if (current) {
      current.resolve(value);
      pendingRef.current = null;
    }
    setPending(null);
    setTypedText("");
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next: PendingConfirm = { options, resolve };
      pendingRef.current = next;
      setPending(next);
      setTypedText("");
    });
  }, []);

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  const open = pending !== null;
  const opts = pending?.options ?? null;
  const requiresText = opts?.requireText ?? "";
  const matchesRequired = requiresText === "" || typedText.trim() === requiresText;
  const confirmDisabled = !matchesRequired;
  const confirmClassName = opts?.destructive ? "button danger" : "button primary";

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {opts && (
        <Modal
          open={open}
          onClose={() => finish(false)}
          title={opts.title}
          size="sm"
          footer={
            <>
              <button type="button" className="button ghost" onClick={() => finish(false)}>
                {opts.cancelText ?? "Cancelar"}
              </button>
              <button
                type="button"
                className={confirmClassName}
                disabled={confirmDisabled}
                onClick={() => finish(true)}
                data-testid="confirm-dialog-confirm"
              >
                {opts.confirmText ?? "Confirmar"}
              </button>
            </>
          }
        >
          <p className="confirm-dialog-message">{opts.message}</p>
          {requiresText && (
            <label className="confirm-dialog-require">
              <span>
                Pra confirmar, digite <strong>{requiresText}</strong>:
              </span>
              <input
                type="text"
                value={typedText}
                onChange={(event) => setTypedText(event.currentTarget.value)}
                aria-label={`Digite ${requiresText} para confirmar`}
                autoFocus
              />
            </label>
          )}
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmProvider.");
  }
  return ctx.confirm;
}
