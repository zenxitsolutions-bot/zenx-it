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

export function PortalHeader({ onOpenMobileNav }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const current = (NAV_BY_ROLE[user.role] ?? []).find((item) => item.to === location.pathname);
  const roleLabel = user.role[0].toUpperCase() + user.role.slice(1);

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="flex h-18 items-center justify-between border-b border-line bg-white/85 px-5 min-[1050px]:px-9">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="grid size-9 place-items-center rounded-lg text-forest hover:bg-sage/40 min-[1050px]:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <span className="text-sm text-muted-foreground">
          {roleLabel} portal{current ? ` / ${current.label}` : ''}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => toast('No new notifications yet.')}
          className="relative grid size-9 place-items-center rounded-full text-forest hover:bg-sage/40"
          aria-label="Notifications"
        >
          <Bell className="size-4.5" aria-hidden="true" />
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-coral" aria-hidden="true" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm hover:bg-sage/40">
            <span className="grid size-8 place-items-center rounded-full bg-coral font-semibold text-white">
              {user.name[0]}
            </span>
            <span className="hidden text-forest sm:inline">{user.name}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
