import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NAV_BY_ROLE } from '@/lib/portalNav';

export function PortalHeader({ onOpenMobileNav }) {
  const { user } = useAuth();
  const location = useLocation();
  const current = (NAV_BY_ROLE[user.role] ?? []).find((item) => item.to === location.pathname);
  const roleLabel = user.role[0].toUpperCase() + user.role.slice(1);

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-line bg-white/90 px-5 py-3 backdrop-blur min-[1050px]:px-9">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="grid size-10 place-items-center rounded-lg text-forest transition-colors hover:bg-cream min-[1050px]:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        {/* Page context, not a page title: the screen below already carries its own <h1>, so this
            stays a quiet breadcrumb rather than competing with it. */}
        <p className="font-display text-[17px] text-forest">
          <span className="text-sm font-medium text-muted-foreground">{roleLabel} portal</span>
          {current && (
            <>
              <span aria-hidden="true" className="px-1.5 text-sm text-dim">
                /
              </span>
              <span>{current.label}</span>
            </>
          )}
        </p>
      </div>

        <div className="ml-4 flex min-w-0 items-center justify-end gap-7 text-forest">
          <p className="font-serif text-sm italic max-[650px]:text-xs">Better food. Brighter tomorrows.</p>
          <span className="hidden h-px w-20 bg-brand-mid/60 xl:block" aria-hidden="true" />
          <p className="hidden text-[9px] tracking-[0.28em] lg:block">NUTRITION　/　PEOPLE　/　PROGRESS</p>
        </div>
    </header>
  );
}
