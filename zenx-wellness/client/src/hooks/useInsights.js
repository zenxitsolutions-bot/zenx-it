import { useQuery } from '@tanstack/react-query';
import { getAdminOverviewRequest, getDietitianOverviewRequest } from '../api/insights.api';

export function useAdminOverview() {
  return useQuery({ queryKey: ['insights', 'admin'], queryFn: getAdminOverviewRequest });
}

export function useDietitianOverview() {
  return useQuery({ queryKey: ['insights', 'dietitian'], queryFn: getDietitianOverviewRequest });
}
