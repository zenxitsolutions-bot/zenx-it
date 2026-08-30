import { useAuth } from '@/hooks/useAuth';
import { ClientOverviewScreen } from '@/components/portal/client/ClientOverviewScreen';
import { AdminOverviewScreen } from '@/components/portal/admin/AdminOverviewScreen';
import { DietitianOverviewScreen } from '@/components/portal/dietitian/DietitianOverviewScreen';

export function OverviewPage() {
  const { user } = useAuth();

  if (user.role === 'client') return <ClientOverviewScreen />;
  if (user.role === 'admin') return <AdminOverviewScreen />;
  return <DietitianOverviewScreen />;
}
