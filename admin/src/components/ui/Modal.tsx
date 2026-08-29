import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
}

const WIDTHS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, subtitle, children, width = "md" }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm px-4 py-10">
      <div className={`w-full ${WIDTHS[width]} animate-fadeIn rounded-xl2 border border-border bg-panel shadow-panel`}>
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h3 className="font-display text-lg text-offwhite">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-dim hover:text-offwhite transition">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
