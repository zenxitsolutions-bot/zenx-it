import { axiosClient } from './axiosClient';

export const getAdminOverviewRequest = () => axiosClient.get('/insights/admin-overview').then((r) => r.data);

export const getDietitianOverviewRequest = () => axiosClient.get('/insights/dietitian-overview').then((r) => r.data);
