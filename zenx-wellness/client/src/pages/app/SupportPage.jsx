import { useAuth } from '@/hooks/useAuth';
import { DietitianSupportScreen } from '@/components/portal/dietitian/DietitianSupportScreen';

export function SupportPage() {
  const { user } = useAuth();
  if (user.role !== 'dietitian') return null;
  return <DietitianSupportScreen />;
}
