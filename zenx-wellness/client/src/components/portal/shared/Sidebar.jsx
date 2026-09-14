import { SidebarAccountFooter } from './SidebarAccountFooter';
import { Link, NavLink } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessageCount } from '@/hooks/useMessages';
import { useSupportUnreadCount } from '@/hooks/useSupportMessages';
import { useMyCompany } from '@/hooks/useCompany';
import { NAV_BY_ROLE } from '@/lib/portalNav';

// The href always keeps its scheme (admin-server normalises it in on the way through), but showing
// 'https://acme.com/' in a 200px-wide sidebar wastes the space on characters nobody reads — the
// label drops the scheme and any trailing slash, the link itself is untouched.
function formatWebsiteLabel(website) {
  return website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

// Rendered both as the fixed desktop aside and inside the mobile Sheet drawer — onNavigate lets
// the drawer close itself when a link is clicked.
export function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const items = NAV_BY_ROLE[user.role] ?? [];
  const canCareMessage = user.role === 'client' || user.role === 'dietitian';
  const canSupportMessage = user.role === 'dietitian' || user.role === 'admin';
  const { data: unread } = useUnreadMessageCount(canCareMessage);
  const { data: supportUnread } = useSupportUnreadCount(canSupportMessage);
  const unreadCount = unread?.count ?? 0;
  const supportUnreadCount = supportUnread?.count ?? 0;
  // Mirrored from ZenX on SSO handoff (server: models/Company.js). Undefined while loading and
  // null for an account whose company was never mirrored — both fall back to ZenX Dietitian's own
  // branding rather than flashing an empty header.
  const { data: company } = useMyCompany();

  return (
    <div className="wellness-sidebar flex h-full flex-col overflow-hidden border-r border-sidebar-line bg-sidebar-bg p-5 text-sidebar-text">
      <div className="mb-4 flex flex-col items-center text-center">
        <Link to="/" className="flex w-full flex-col items-center font-display tracking-wide text-forest">
          {company?.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company?.name || "Home"}
              className="h-24 w-full max-w-[160px] object-contain"
            />
          ) : (
            <span className="text-base font-semibold leading-snug text-forest">
              ZENX<span className="text-brand-2">.</span>
            </span>
          )}
        </Link>

        {company?.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1.5 flex max-w-full items-center justify-center gap-1 text-xs text-sidebar-text hover:text-forest"
          >
            <span className="truncate">{formatWebsiteLabel(company.website)}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          </a>
        )}
      </div>

      <nav className="grid min-h-0 flex-1 auto-rows-max gap-1 overflow-y-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={`/${user.companySlug}${to}`}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-150 ${
                isActive
                  ? 'bg-sidebar-hover text-forest shadow-none'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-forest'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
                {to === '/app/messages' && (user.role === 'admin' ? supportUnreadCount : unreadCount) > 0 && (
                  <span
                    className={`ml-auto grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-forest/10 text-forest' : 'bg-sage text-sidebar-text'
                    }`}
                  >
                    {(user.role === 'admin' ? supportUnreadCount : unreadCount) > 9
                      ? '9+'
                      : user.role === 'admin'
                        ? supportUnreadCount
                        : unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <SidebarAccountFooter />
    </div>
  );
}
