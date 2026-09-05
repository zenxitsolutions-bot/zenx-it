import { useAuth } from '@/hooks/useAuth';
import { CallsScreen } from '@/components/portal/client/CallsScreen';
import { DietitianCallsScreen } from '@/components/portal/dietitian/DietitianCallsScreen';

export function CallsPage() {
  const { user } = useAuth();
  return user.role === 'client' ? <CallsScreen /> : <DietitianCallsScreen />;
}
