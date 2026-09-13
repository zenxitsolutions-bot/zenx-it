import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  /** Pinned action row. Keeps Cancel/Save in the same place in every dialog instead of each form
   *  inventing its own footer inside `children`. */
  footer?: ReactNode;
}

const WIDTHS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Modal({ open, onClose, title, subtitle, children, width = "md", footer }: ModalProps) {
  // Escape closes, and the page behind stops scrolling while the dialog is up — without the lock,
  // scrolling over the backdrop moves the page underneath, which makes the dialog feel detached.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-offwhite/40 px-4 py-10 backdrop-blur-sm"
      // Only a click that both starts and ends on the backdrop closes: without the target check, a
      // drag that began on text inside the dialog and released outside would dismiss it mid-edit.
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          "w-full animate-popIn overflow-hidden rounded-xl2 border border-border bg-panel shadow-float",
          WIDTHS[width]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <h3 className="font-display text-lg text-offwhite">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="-mr-1.5 -mt-1 shrink-0 rounded-lg p-1.5 text-dim transition hover:bg-surface hover:text-offwhite"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface/60 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
