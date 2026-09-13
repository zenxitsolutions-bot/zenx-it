import { useAuth } from '@/hooks/useAuth';
import { ClientMessagesScreen } from '@/components/portal/client/ClientMessagesScreen';
import { DietitianMessagesScreen } from '@/components/portal/dietitian/DietitianMessagesScreen';
import { AdminSupportMessagesScreen } from '@/components/portal/admin/AdminSupportMessagesScreen';

export function MessagesPage() {
  const { user } = useAuth();
  if (user.role === 'admin') return <AdminSupportMessagesScreen />;
  return user.role === 'dietitian' ? <DietitianMessagesScreen /> : <ClientMessagesScreen />;
}
