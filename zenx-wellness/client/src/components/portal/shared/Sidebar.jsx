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
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center gap-2.5 text-lg font-semibold text-forest">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="" className="size-9 shrink-0 rounded-xl object-cover" />
          ) : (
            // The wordmark's own mark: a brand-green rounded tile rather than a bare glyph, so a
            // tenant with no logo still gets the same visual weight in the same slot.
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-coral text-base text-white"
            >
              ✦
            </span>
          )}
          <span className="truncate">{company?.name ?? 'ZenX Dietitian'}</span>
        </Link>

        {company?.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1.5 ml-11.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-coral"
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
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-sage font-semibold text-brand-strong'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-forest'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`size-4.5 shrink-0 ${isActive ? 'text-coral' : 'text-muted-foreground'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{label}</span>
                {to === '/app/messages' && unreadCount > 0 && (
                  <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-coral text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto grid gap-4 pt-4">
        <Link to="/" className="text-xs text-muted-foreground hover:text-coral">
          ← Back to website
        </Link>

        <div className="rounded-card border border-sage bg-cream p-4 text-sm">
          <span className="mb-2.5 grid size-9 place-items-center rounded-full bg-white text-coral shadow-soft">
            <MessageCircle className="size-4.5" aria-hidden="true" />
          </span>
          <p className="font-semibold text-forest">Need a hand?</p>
          <p className="mt-1 text-xs text-muted-foreground">Your care team is here.</p>
          {canMessage ? (
            <Link
              to={`/${user.companySlug}/app/messages`}
              onClick={onNavigate}
              className="mt-3 block w-full rounded-pill bg-coral py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              Message us
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => toast('Messaging is client <-> dietitian only.')}
              className="mt-3 w-full rounded-pill bg-coral py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              Message us
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
