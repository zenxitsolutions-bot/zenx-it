import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-lime/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-lime/5 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src="/logo-icon.png" alt="" className="h-10 w-auto object-contain" />
          <span className="font-display text-2xl tracking-wide text-offwhite">
            ZENX<span className="text-lime">.</span>
          </span>
        </div>
        <div className="rounded-xl2 border border-border bg-panel/80 p-8 shadow-panel backdrop-blur">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-dim">ZenX IT Solutions — Admin Portal</p>
      </div>
    </div>
  );
}
