import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

interface FieldWrapProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
  /** Renders the required marker. Purely visual — validation stays wherever it already lives. */
  required?: boolean;
}

export function FieldWrap({ label, error, hint, children, htmlFor, required }: FieldWrapProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
        {required && (
          <span className="ml-1 text-dangerInk" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {/* Reserving nothing when both are absent keeps rows tight; when an error replaces a hint the
          row grows by one line rather than swapping text at the same height, so the change is
          visible rather than silent. */}
      {error && <span className="text-xs font-medium text-dangerInk">{error}</span>}
      {!error && hint && <span className="text-xs text-dim">{hint}</span>}
    </div>
  );
}

/* Inputs sit on `surface` (the faintly recessed tone) rather than `ink` (the page). On the old dark
   theme those were the same relationship inverted; on the light theme an input filled with the page
   color disappears into the card behind it, so the field needs to read as a well. */
const fieldClasses =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-offwhite placeholder:text-dim outline-none transition " +
  "focus:border-lime/60 focus:bg-panel focus:ring-2 focus:ring-lime/20 disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, "min-h-[110px] resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(fieldClasses, "cursor-pointer appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      {/* The native arrow is suppressed by appearance-none, so it has to be drawn back; without it
          a select is indistinguishable from a text input. */}
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dim"
        aria-hidden="true"
      />
    </div>
  );
}
