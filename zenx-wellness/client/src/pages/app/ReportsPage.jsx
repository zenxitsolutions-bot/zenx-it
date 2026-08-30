import { useAuth } from '@/hooks/useAuth';
import { ReportsScreen } from '@/components/portal/client/ReportsScreen';
import { DietitianReportsScreen } from '@/components/portal/dietitian/DietitianReportsScreen';

export function ReportsPage() {
  const { user } = useAuth();
  return user.role === 'client' ? <ReportsScreen /> : <DietitianReportsScreen />;
}
