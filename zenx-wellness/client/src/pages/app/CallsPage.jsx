import { useAuth } from '@/hooks/useAuth';
import { CallsScreen } from '@/components/portal/client/CallsScreen';
import { DietitianCallsScreen } from '@/components/portal/dietitian/DietitianCallsScreen';
import { AdminCallsScreen } from '@/components/portal/admin/AdminCallsScreen';

export function CallsPage() {
  const { user } = useAuth();
  if (user.role === 'client') return <CallsScreen />;
  if (user.role === 'admin') return <AdminCallsScreen />;
  return <DietitianCallsScreen />;
}
