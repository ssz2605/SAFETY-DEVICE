import axios from 'axios';

const BASE_URL = "http://localhost:5000/api";

const api = axios.create({ baseURL: BASE_URL });

export const alertsAPI = {
  getAll:   (params) => api.get('/alerts', { params }),
  getQueue: ()       => api.get('/alerts/queue'),
  getById:  (id)     => api.get(`/alerts/${id}`),
  resolve:  (id, resolvedBy) => api.post(`/alerts/${id}/resolve`, { resolvedBy }),
};

export const devicesAPI = {
  getAll:        ()       => api.get('/devices'),
  getById:       (id)     => api.get(`/devices/${id}`),
  register:      (data)   => api.post('/devices/register', data),
  addContact:    (id, c)  => api.post(`/devices/${id}/contacts`, c),
  updateThresh:  (id, t)  => api.patch(`/devices/${id}/thresholds`, t),
};

export const statsAPI = {
  get: () => api.get('/stats'),
};

export default api;