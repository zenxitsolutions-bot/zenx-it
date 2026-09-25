import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DietitianCallsTab } from './DietitianCallsTab';
import { AvailabilityScreen } from './AvailabilityScreen';
import { GoogleCalendarCard } from '@/components/portal/shared/GoogleCalendarCard';

import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/permissions';

export function DietitianCallsScreen() {
  const { user } = useAuth();
  const canManage = hasPermission(user, 'calls.manage');
  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">Stay close to your clients</p>
        <h1 className="mt-1 text-3xl text-forest">Schedule calls</h1>
        <p className="mt-1 text-muted-foreground">Book, reschedule, or wrap up a client check-in.</p>
      </div>

      {canManage && <div className="mb-6">
        <GoogleCalendarCard />
      </div>}

      <Tabs defaultValue="calls">
        <TabsList>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          {canManage && <TabsTrigger value="availability">Availability</TabsTrigger>}
        </TabsList>
        <TabsContent value="calls">
          <DietitianCallsTab />
        </TabsContent>
        {canManage && <TabsContent value="availability">
          <AvailabilityScreen />
        </TabsContent>}
      </Tabs>
    </div>
  );
}
