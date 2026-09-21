import { axiosClient } from './axiosClient';

export const getMyPhotoRequest = ({ signal } = {}) => axiosClient.get('/users/me/photo', { responseType: 'blob', signal })
  .then((response) => response.status === 204 ? null : response.data);

export const getUserPhotoRequest = (userId, { signal } = {}) => axiosClient.get(`/users/${encodeURIComponent(userId)}/photo`, { responseType: 'blob', signal })
  .then((response) => response.status === 204 ? null : response.data);

export const uploadMyPhotoRequest = (file) => {
  const data = new FormData();
  data.append('photo', file);
  return axiosClient.put('/users/me/photo', data).then((response) => response.data);
};

export const removeMyPhotoRequest = () => axiosClient.delete('/users/me/photo');
