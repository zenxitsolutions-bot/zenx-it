import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from '@/components/portal/shared/Sidebar';
import { PortalHeader } from '@/components/portal/shared/PortalHeader';
import { useAuth } from '@/hooks/useAuth';
import { useCallReminders } from '@/hooks/useCallReminders';
import { TimezoneMismatchBanner } from '@/components/shared/TimezoneMismatchBanner';

export function PortalLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();
  // Admin is excluded: their "own calls" query is intentionally unscoped (every call on the
  // platform), which would fire a reminder for every client's call, not just theirs.
  useCallReminders(user.role === 'client' || user.role === 'dietitian');

  return (
    <div className="grid min-h-screen bg-[#f7f8f3] min-[1050px]:grid-cols-[248px_1fr]">
      <aside className="hidden min-[1050px]:block">
        <Sidebar />
      </aside>

      <div className="flex min-h-screen flex-col overflow-auto">
        <TimezoneMismatchBanner />
        <PortalHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 border-none bg-forest p-0 text-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
