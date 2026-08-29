import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

interface FieldWrapProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function FieldWrap({ label, error, hint, children, htmlFor }: FieldWrapProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
      {!error && hint && <span className="text-xs text-dim">{hint}</span>}
    </div>
  );
}

const fieldClasses =
  "w-full rounded-md border border-border bg-ink px-3.5 py-2.5 text-sm text-offwhite placeholder:text-dim outline-none transition focus:border-lime";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, "min-h-[110px] resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClasses, "appearance-none cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}
