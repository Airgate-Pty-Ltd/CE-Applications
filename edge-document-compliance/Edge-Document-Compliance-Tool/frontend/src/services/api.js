/**
 * API Client
 * Centralized API client for audit module
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me')
};

// Source Documents API
export const sourcesAPI = {
  list: (sourceType) => api.get('/sources', { params: { sourceType } }),
  get: (id) => api.get(`/sources/${id}`),
  upload: (formData) => api.post('/sources/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  extract: (id) => api.post(`/sources/${id}/extract`)
};

// Requirements API
export const requirementsAPI = {
  fromSource: (sourceId) => api.post(`/requirements/from-source/${sourceId}`)
};

// Audits API
export const auditsAPI = {
  list: (filters) => api.get('/audits', { params: filters }),
  get: (id) => api.get(`/audits/${id}`),
  create: (data) => api.post('/audits', data),
  update: (id, data) => api.patch(`/audits/${id}`, data),
  generateChecklist: (id, data) => api.post(`/audits/${id}/generate-checklist`, data),
  assign: (id, data) => api.post(`/audits/${id}/assign`, data),
  submit: (id) => api.post(`/audits/${id}/submit`),
  return: (id, reason) => api.post(`/audits/${id}/return`, { reason }),
  close: (id) => api.post(`/audits/${id}/close`),
  getHistory: (id) => api.get(`/audits/${id}/history`),
  getItems: (id) => api.get(`/audits/${id}/items`),
  submitResponse: (id, itemId, data) => api.post(`/audits/${id}/items/${itemId}/response`, data),
  uploadEvidence: (id, itemId, formData) => api.post(`/audits/${id}/items/${itemId}/evidence/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  export: (id, format = 'json') => api.get(`/audits/${id}/export`, { 
    params: { format },
    responseType: format === 'json' ? 'json' : 'blob'
  })
};

export default api;
