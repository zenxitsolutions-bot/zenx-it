import { useQuery } from '@tanstack/react-query';
import { getAdminOverviewRequest, getDietitianOverviewRequest } from '../api/insights.api';
import { useAuth } from './useAuth';

export function useAdminOverview() {
  return useQuery({ queryKey: ['insights', 'admin'], queryFn: getAdminOverviewRequest });
}

export function useDietitianOverview() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['insights', 'dietitian'],
    queryFn: getDietitianOverviewRequest,
    enabled: user?.role === 'dietitian',
  });
}
