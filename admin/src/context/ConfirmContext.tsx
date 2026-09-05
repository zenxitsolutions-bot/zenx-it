import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl2 border border-border bg-panel p-6 shadow-panel animate-fadeIn">
            <div
              className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full ${
                state.options.danger ? "bg-danger/10 text-danger" : "bg-lime/10 text-lime"
              }`}
            >
              <AlertTriangle size={18} />
            </div>
            <h3 className="font-display text-lg text-offwhite">{state.options.title}</h3>
            {state.options.description && (
              <p className="mt-2 text-sm text-muted">{state.options.description}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => close(false)}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-offwhite hover:border-borderStrong transition"
              >
                {state.options.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={() => close(true)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  state.options.danger
                    ? "bg-danger text-ink hover:brightness-110"
                    : "bg-lime text-ink hover:brightness-110"
                }`}
              >
                {state.options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
