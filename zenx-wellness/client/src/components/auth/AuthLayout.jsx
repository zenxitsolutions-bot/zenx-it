import { Link } from 'react-router-dom';
import { Leaf, Sparkles, Sun } from 'lucide-react';

// `company` is the tenant whose slug-scoped login page this is (null/undefined on the bare /login,
// which stays ZenX Dietitian-branded). Only the two wordmarks change — the panel's copy is the product's
// own product voice, not something a customer's branding should be pasted over.
export function AuthLayout({ eyebrow, title, subtitle, company, children }) {
  const brand = company?.name ?? 'ZenX Dietitian';
  return (
    <div className="grid min-h-screen min-[1050px]:grid-cols-2">
      <div className="relative flex flex-col justify-center overflow-hidden bg-mist px-6 py-12 sm:px-12">
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-coral/10 blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-coral/5 blur-[120px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 font-display text-xl tracking-wide text-forest">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt="" className="size-7 shrink-0 rounded-md object-cover" />
            ) : (
              <span aria-hidden="true" className="text-coral">
                ✦
              </span>
            )}
            {company?.name ?? (
              <>
                ZENX<span className="text-coral">.</span>
              </>
            )}
          </Link>

          <div className="rounded-card border border-line bg-white/80 p-8 shadow-panel backdrop-blur">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{eyebrow}</p>
            <h1 className="mt-2 mb-2 font-display text-2xl text-forest">{title}</h1>
            {subtitle && <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>}

            {children}
          </div>
        </div>
      </div>

      <div className="relative hidden min-[1050px]:flex flex-col justify-between overflow-hidden bg-forest-2 px-12 py-12 text-white">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-coral/15"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-brand-2/20"
          aria-hidden="true"
        />

        <span className="relative font-display text-xl tracking-wide">
          ✦ {brand === 'ZenX Dietitian' ? (
            <>
              ZENX<span className="text-brand-2">.</span>
            </>
          ) : (
            brand
          )}
        </span>

        <blockquote className="relative">
          <Sparkles className="mb-4 size-8 text-brand-2" aria-hidden="true" />
          <p className="font-display text-3xl leading-snug text-white">
            “A routine I actually love — more energy for my kids, and for myself.”
          </p>
          <footer className="mt-4 text-sm text-sidebar-text">Priya S., down 8 kg, up in confidence</footer>
        </blockquote>

        <div className="relative flex items-center gap-6 text-sm text-sidebar-text">
          <span className="flex items-center gap-1.5">
            <Leaf className="size-4 text-brand-2" aria-hidden="true" /> 12,000+ lives supported
          </span>
          <span className="flex items-center gap-1.5">
            <Sun className="size-4 text-yellow" aria-hidden="true" /> 4.9★ average rating
          </span>
        </div>
      </div>
    </div>
  );
}
