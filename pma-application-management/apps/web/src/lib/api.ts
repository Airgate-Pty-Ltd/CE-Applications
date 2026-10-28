import axios from 'axios';
import { useAuth } from './store';

export const api = axios.create({ baseURL: '' });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) useAuth.getState().logout();
    return Promise.reject(err);
  },
);

export async function health(): Promise<{ status: string }> {
  const { data } = await api.get('/health');
  return data;
}
