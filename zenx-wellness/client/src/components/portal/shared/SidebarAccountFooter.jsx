import { useState } from 'react';
import { Leaf, Sun, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AccountAvatar } from './AccountAvatar';
import { PreferencesDialog } from './PreferencesDialog';
import { NotificationMenu } from './NotificationMenu';
import { FooterAccountMenu } from './FooterAccountMenu';

export function SidebarAccountFooter() {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="mt-auto shrink-0 pt-3">
      <div className="flex items-center gap-3 px-3 pb-3 text-muted-foreground">
        <Leaf className="size-5 shrink-0 text-brand-mid" strokeWidth={1.4} aria-hidden="true" />
        <p className="font-serif text-sm leading-5 italic">A little care.<br />A lasting difference.</p>
      </div>
      <NotificationMenu sidebar />
      <button type="button" onClick={() => setSettingsOpen(true)} className="mb-2 flex min-h-11 w-full items-center gap-4 rounded-lg px-3 text-sm text-forest transition-colors hover:bg-sidebar-hover">
        <Sun className="size-5" strokeWidth={1.5} aria-hidden="true" />
        Settings
      </button>
      <FooterAccountMenu onSettings={() => setSettingsOpen(true)}>
      <button type="button" aria-label={`Account settings for ${user.name}`} className="flex min-h-16 w-full items-center gap-3 border-t border-sidebar-line py-3 text-left">
        <AccountAvatar className="size-8" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-forest">{user.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{user.role === 'admin' ? 'Administrator' : user.role === 'dietitian' ? 'Dietitian' : 'Wellness member'}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-forest" strokeWidth={1.5} aria-hidden="true" />
      </button>
      </FooterAccountMenu>
      <PreferencesDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
