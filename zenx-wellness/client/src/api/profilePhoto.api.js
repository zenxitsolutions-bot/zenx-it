import { axiosClient } from './axiosClient';

export const getMyPhotoRequest = () => axiosClient.get('/users/me/photo', { responseType: 'blob' })
  .then((response) => response.status === 204 ? null : response.data);

export const uploadMyPhotoRequest = (file) => {
  const data = new FormData();
  data.append('photo', file);
  return axiosClient.put('/users/me/photo', data).then((response) => response.data);
};

export const removeMyPhotoRequest = () => axiosClient.delete('/users/me/photo');
