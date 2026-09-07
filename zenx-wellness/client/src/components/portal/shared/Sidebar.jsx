import { Link, NavLink } from 'react-router-dom';
import { ExternalLink, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessageCount } from '@/hooks/useMessages';
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
  // Admin isn't a party to any conversation (spec §1.5) — messaging is client <-> dietitian only.
  const canMessage = user.role === 'client' || user.role === 'dietitian';
  const { data: unread } = useUnreadMessageCount(canMessage);
  const unreadCount = unread?.count ?? 0;
  // Mirrored from ZenX on SSO handoff (server: models/Company.js). Undefined while loading and
  // null for an account whose company was never mirrored — both fall back to ZenX Dietitian's own
  // branding rather than flashing an empty header.
  const { data: company } = useMyCompany();

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-sidebar-line bg-sidebar-bg p-5 text-sidebar-text">
      <div className="mb-8 flex flex-col items-center text-center">
        <Link to="/" className="flex w-full flex-col items-center font-display tracking-wide text-white">
          {company?.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company?.name || "Home"}
              className="h-40 w-full max-w-[200px] object-contain"
            />
          ) : (
            <span className="text-base font-semibold leading-snug text-white">
              ZENX<span className="text-brand-2">.</span>
            </span>
          )}
        </Link>

        {company?.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1.5 flex max-w-full items-center justify-center gap-1 text-xs text-sidebar-text/75 hover:text-white"
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
                  ? 'bg-coral text-white shadow-sm'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
                {to === '/app/messages' && unreadCount > 0 && (
                  <span
                    className={`ml-auto grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-white/10 text-sidebar-text'
                    }`}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto grid gap-4 pt-4">
        <Link to="/" className="text-xs text-sidebar-text/75 hover:text-white">
          ← Back to website
        </Link>

        <div className="rounded-lg border border-sidebar-line bg-sidebar-hover p-4 text-sm">
          <span className="mb-2.5 grid size-9 place-items-center rounded-full bg-sidebar-bg text-brand-2">
            <MessageCircle className="size-4.5" aria-hidden="true" />
          </span>
          <p className="font-semibold text-white">Need a hand?</p>
          <p className="mt-1 text-xs text-sidebar-text/75">Your care team is here.</p>
          {canMessage ? (
            <Link
              to={`/${user.companySlug}/app/messages`}
              onClick={onNavigate}
              className="mt-3 block w-full rounded-lg bg-coral py-2 text-center text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-strong"
            >
              Message us
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => toast('Messaging is client <-> dietitian only.')}
              className="mt-3 w-full rounded-lg bg-coral py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-strong"
            >
              Message us
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
