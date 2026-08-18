import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Toast } from "../ds";

/**
 * One place toasts appear, so no view has to own a corner of the screen.
 *
 * Mutations are optimistic with rollback and a toast on success
 * (rules.md → Design Patterns), which means every view needs to raise one —
 * and none of them should be positioning it.
 */

type Tone = "info" | "success" | "warning" | "error";

interface ToastRecord {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastContextValue {
  show: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_AFTER_MS = 4000;

export function ToastHost({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        // Polite, not assertive: a confirmation should not interrupt whatever
        // the student is reading.
        aria-live="polite"
        style={{
          position: "fixed",
          right: "var(--space-xl)",
          bottom: "var(--space-xl)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-sm)",
        }}
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} tone={toast.tone} onDismiss={() => dismiss(toast.id)}>
            {toast.message}
          </Toast>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastHost.");
  return value;
}
