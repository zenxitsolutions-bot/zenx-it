import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { portalItemsFor } from '@/lib/portalNav';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';

export function PortalHeader({ onOpenMobileNav }) {
  const { user } = useAuth();
  const { timezone } = useViewerTimezone();
  const location = useLocation();
  const current = portalItemsFor(user).find((item) => `/${user.companySlug}${item.to}` === location.pathname);
  const roleLabel = user.isMainAdmin ? 'Main admin' : user.role[0].toUpperCase() + user.role.slice(1);

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-line bg-white/90 px-5 py-3 backdrop-blur min-[1050px]:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="grid size-10 shrink-0 place-items-center rounded-lg text-forest transition-colors hover:bg-cream min-[1050px]:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        {/* Page context, not a page title: the screen below already carries its own <h1>, so this
            stays a quiet breadcrumb rather than competing with it. */}
        <div className="min-w-0">
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
          <p className="break-words text-[11px] text-muted-foreground">Local time: {timezone} · automatic</p>
        </div>
      </div>

        <div className="ml-4 hidden min-w-0 items-center justify-end gap-7 text-forest min-[850px]:flex">
          <p className="font-serif text-sm italic max-[650px]:text-xs">Better food. Brighter tomorrows.</p>
          <span className="hidden h-px w-20 bg-brand-mid/60 xl:block" aria-hidden="true" />
          <p className="hidden text-[9px] tracking-[0.28em] lg:block">NUTRITION　/　PEOPLE　/　PROGRESS</p>
        </div>
    </header>
  );
}
