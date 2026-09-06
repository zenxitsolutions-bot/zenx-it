import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessageCount } from '@/hooks/useMessages';
import { NAV_BY_ROLE } from '@/lib/portalNav';

// Bottom tab bar for phones, below the 1050px sidebar breakpoint.
//
// It is a second view of NAV_BY_ROLE, never its own list: the first five entries of whatever the
// signed-in role already sees, in the order that file defines. So it can't offer a screen the
// sidebar doesn't, or survive a nav change the sidebar picked up. Anything past the fifth entry
// stays reachable through the existing hamburger + drawer, which is unchanged.
const MAX_TABS = 5;

export function MobileNav() {
  const { user } = useAuth();
  const items = (NAV_BY_ROLE[user.role] ?? []).slice(0, MAX_TABS);
  const canMessage = user.role === 'client' || user.role === 'dietitian';
  const { data: unread } = useUnreadMessageCount(canMessage);
  const unreadCount = unread?.count ?? 0;

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Primary"
      // pb-[env(safe-area-inset-bottom)] keeps the tabs above the home indicator on iOS rather
      // than under it, where the bottom row of targets is unreachable.
      className="sticky bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur min-[1050px]:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={`/${user.companySlug}${to}`}
              className={({ isActive }) =>
                `flex h-15 flex-col items-center justify-center gap-1 px-1 text-[11px] transition-colors ${
                  isActive ? 'font-semibold text-brand-strong' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative grid h-7 w-12 place-items-center rounded-pill transition-colors ${
                      isActive ? 'bg-sage text-coral' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {to === '/app/messages' && unreadCount > 0 && (
                      <span
                        className="absolute top-0 right-2.5 size-2 rounded-full bg-coral ring-2 ring-white"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  {/* The label is truncated to the tab width rather than wrapped: a two-line tab
                      would make the bar taller than its neighbours on a 360px screen. */}
                  <span className="w-full truncate text-center">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
