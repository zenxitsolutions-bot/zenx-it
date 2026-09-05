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
  // null for an account whose company was never mirrored — both fall back to Nourishly's own
  // branding rather than flashing an empty header.
  const { data: company } = useMyCompany();

  return (
    <div className="flex h-full flex-col border-r border-line bg-white p-5 text-slate-600">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-xl font-semibold text-forest">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="" className="size-7 shrink-0 rounded-md object-cover" />
          ) : (
            <span aria-hidden="true" className="text-coral">
              ✦
            </span>
          )}
          <span className="truncate">{company?.name ?? 'nourishly'}</span>
        </Link>

        {company?.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-coral"
          >
            <span className="truncate">{formatWebsiteLabel(company.website)}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          </a>
        )}
      </div>

      <nav className="grid gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={`/${user.companySlug}${to}`}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm ${
                isActive
                  ? 'bg-sage font-semibold text-sage-deep'
                  : 'text-slate-600 hover:bg-cream hover:text-forest'
              }`
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
            {to === '/app/messages' && unreadCount > 0 && (
              <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-coral text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto grid gap-4">
        <Link to="/" className="text-xs text-muted-foreground hover:text-coral">
          ← Back to website
        </Link>

        <div className="rounded-xl bg-cream p-4 text-sm">
          <MessageCircle className="mb-2 size-5 text-coral" aria-hidden="true" />
          <p className="font-semibold text-forest">Need a hand?</p>
          <p className="mt-1 text-xs text-muted-foreground">Your care team is here.</p>
          {canMessage ? (
            <Link
              to={`/${user.companySlug}/app/messages`}
              onClick={onNavigate}
              className="mt-3 block w-full rounded-full bg-coral py-1.5 text-center text-xs font-semibold text-white hover:bg-sage-deep"
            >
              Message us
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => toast('Messaging is client <-> dietitian only.')}
              className="mt-3 w-full rounded-full bg-coral py-1.5 text-xs font-semibold text-white hover:bg-sage-deep"
            >
              Message us
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
