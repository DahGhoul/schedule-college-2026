import axios from 'axios';
import { configuracionApp } from '@/config/aplicacion';

const apiClient = axios.create({
  baseURL: configuracionApp.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT (se implementará en la fase de autenticación)
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor de respuesta para renovar token en caso de 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${configuracionApp.apiUrl}/auth/refresh`, { refreshToken });
          const { token, refreshToken: newRefresh } = res.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export { apiClient };