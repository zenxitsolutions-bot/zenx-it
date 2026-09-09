import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from '@/components/portal/shared/Sidebar';
import { PortalHeader } from '@/components/portal/shared/PortalHeader';
import { MobileNav } from '@/components/portal/shared/MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { useCallReminders } from '@/hooks/useCallReminders';
import { useInAppNotificationToasts } from '@/hooks/useNotifications';
import { useMessageLive } from '@/hooks/useMessageLive';
import { PresenceProvider } from '@/context/PresenceContext';
import { TimezoneMismatchBanner } from '@/components/shared/TimezoneMismatchBanner';

function PortalLive() {
  const { user } = useAuth();
  const canCareMessage = user.role === 'client' || user.role === 'dietitian';
  const canLiveMessage = canCareMessage || user.role === 'admin';
  // Admin is excluded: their "own calls" query is intentionally unscoped (every call on the
  // platform), which would fire a reminder for every client's call, not just theirs.
  useCallReminders(canCareMessage);
  useInAppNotificationToasts(Boolean(user));
  useMessageLive(canLiveMessage);
  return null;
}

export function PortalLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <PresenceProvider>
      <div className="grid min-h-screen bg-background min-[1050px]:grid-cols-[264px_1fr]">
        <PortalLive />
        {/* sticky + h-screen pins the rail while the page scrolls. Without it the aside is an
            ordinary grid item as tall as the whole page, so the nav scrolled out of view with the
            content and the footer card sat at the very bottom of the document. */}
        <aside className="hidden min-[1050px]:sticky min-[1050px]:top-0 min-[1050px]:block min-[1050px]:h-screen">
          <Sidebar />
        </aside>

        {/* No overflow-* here. An ancestor with overflow other than `visible` becomes the scroll
            container for any sticky descendant, so `overflow-auto` on this column silently broke
            the sticky header below it — the column never scrolls itself (it grows with content
            and the page scrolls), so the header had nothing to stick to. */}
        <div className="flex min-h-screen flex-col">
          <TimezoneMismatchBanner />
          <PortalHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="flex-1">
            <Outlet />
          </main>
          {/* Phone-only tab bar. The hamburger + drawer above it is untouched — it still reaches
              every nav entry, including the ones past the bar's first five. */}
          <MobileNav />
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" showCloseButton={false} className="w-72 border-r border-sidebar-line bg-sidebar-bg p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </PresenceProvider>
  );
}
