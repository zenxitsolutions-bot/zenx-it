import { useAuth } from '@/hooks/useAuth';
import { ClientMessagesScreen } from '@/components/portal/client/ClientMessagesScreen';
import { DietitianMessagesScreen } from '@/components/portal/dietitian/DietitianMessagesScreen';

export function MessagesPage() {
  const { user } = useAuth();
  return user.role === 'dietitian' ? <DietitianMessagesScreen /> : <ClientMessagesScreen />;
}
