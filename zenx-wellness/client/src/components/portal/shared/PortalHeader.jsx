import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { NAV_BY_ROLE } from '@/lib/portalNav';
import { PreferencesDialog } from './PreferencesDialog';
import { useDietitianOverview } from '@/hooks/useInsights';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications';

export function PortalHeader({ onOpenMobileNav }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const { data: overview } = useDietitianOverview();
  const { data: inbox = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const attentionItems = user.role === 'dietitian' ? (overview?.attentionItems ?? []) : [];
  const unreadInbox = inbox.filter((item) => !item.readAt);
  const hasUnread = unreadInbox.length > 0 || attentionItems.length > 0;

  const current = (NAV_BY_ROLE[user.role] ?? []).find((item) => item.to === location.pathname);
  const roleLabel = user.role[0].toUpperCase() + user.role.slice(1);

  async function handleLogout() {
    const loginPath = user.companySlug ? `/${user.companySlug}/login` : '/login';
    await logout();
    navigate(loginPath, { replace: true, state: null });
  }

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

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative grid size-10 place-items-center rounded-full text-forest transition-colors hover:bg-cream"
            aria-label="Notifications"
          >
            <Bell className="size-4.5" aria-hidden="true" />
            {hasUnread && (
              <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-negative ring-2 ring-white" aria-hidden="true" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between font-normal">
              <span className="text-sm font-semibold text-forest">Notifications</span>
              {unreadInbox.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-coral hover:underline"
                  onClick={() => markAllRead.mutate()}
                >
                  Mark all read
                </button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {attentionItems.map((item) => (
              <DropdownMenuItem
                key={`attention-${item.planId ?? item.clientId}-${item.day}-${item.time}`}
                onSelect={() => navigate(`/${user.companySlug}/app/overview`)}
              >
                <div className="grid gap-0.5">
                  <p className="text-sm font-semibold text-forest">Meal swap requested</p>
                  <p className="text-xs text-muted-foreground">
                    {item.clientName ?? 'A client'} · {item.mealTitle ?? item.mealType ?? 'meal'}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
            {inbox.slice(0, 12).map((item) => (
              <DropdownMenuItem
                key={item._id}
                onSelect={() => {
                  if (!item.readAt) markRead.mutate(item._id);
                  if (item.url) navigate(`/${user.companySlug}${item.url}`);
                }}
              >
                <div className="grid gap-0.5">
                  <p className={`text-sm ${item.readAt ? 'text-muted-foreground' : 'font-semibold text-forest'}`}>{item.title}</p>
                  {item.body ? <p className="text-xs text-muted-foreground">{item.body}</p> : null}
                </div>
              </DropdownMenuItem>
            ))}
            {inbox.length === 0 && attentionItems.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No new notifications yet.</p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-transparent py-1 pr-2.5 pl-1 text-sm transition-colors hover:border-line hover:bg-cream">
            <span className="grid size-9 place-items-center rounded-full bg-tint-blue text-sm font-semibold text-brand-strong">
              {user.name[0]}
            </span>
            <span className="hidden font-medium text-forest sm:inline">{user.name}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-semibold text-forest">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setPreferencesOpen(true)}>My account</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </header>
  );
}
