import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu } from 'lucide-react';
import { toast } from 'sonner';
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

export function PortalHeader({ onOpenMobileNav }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const { data: overview } = useDietitianOverview();
  const attentionItems = user.role === 'dietitian' ? (overview?.attentionItems ?? []) : [];

  const current = (NAV_BY_ROLE[user.role] ?? []).find((item) => item.to === location.pathname);
  const roleLabel = user.role[0].toUpperCase() + user.role.slice(1);

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
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
        <button
          type="button"
          onClick={() => {
            if (user.role === 'dietitian' && attentionItems.length > 0) {
              navigate(`/${user.companySlug}/app/overview`);
              return;
            }
            toast(attentionItems.length ? `${attentionItems.length} swap request${attentionItems.length === 1 ? '' : 's'} waiting.` : 'No new notifications yet.');
          }}
          className="relative grid size-10 place-items-center rounded-full text-forest transition-colors hover:bg-cream"
          aria-label="Notifications"
        >
          <Bell className="size-4.5" aria-hidden="true" />
          {attentionItems.length > 0 && (
            <span
              className="absolute top-2.5 right-2.5 size-2 rounded-full bg-negative ring-2 ring-white"
              aria-hidden="true"
            />
          )}
        </button>

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
