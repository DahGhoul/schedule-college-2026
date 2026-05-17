import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

interface Usuario {
  id: number;
  email: string;
  rol: string;
  nombre?: string;
  idDocente?: number;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  usuario: Usuario | null;
  estaCargando: boolean;
  estaAutenticado: boolean;

  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => void;
  cargarSesion: () => Promise<void>;
  cambiarPassword: (contrasenaActual: string, nuevaContrasena: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
  usuario: null,
  estaCargando: false,
  estaAutenticado: false,

  iniciarSesion: async (email, password) => {
    set({ estaCargando: true });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, refreshToken, usuario } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      set({ token, refreshToken, usuario, estaAutenticado: true, estaCargando: false });
    } catch (error: any) {
      set({ estaCargando: false });
      throw new Error(error.response?.data?.error || 'Error al iniciar sesión');
    }
  },

  cerrarSesion: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ token: null, refreshToken: null, usuario: null, estaAutenticado: false });
  },

  cargarSesion: async () => {
    const token = get().token;
    if (!token) {
      set({ estaAutenticado: false, usuario: null });
      return;
    }
    set({ estaCargando: true });
    try {
      const response = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ usuario: response.data, estaAutenticado: true, estaCargando: false });
    } catch (error) {
      // Token inválido o expirado, intentar refresh
      const refresh = get().refreshToken;
      if (refresh) {
        try {
          const res = await apiClient.post('/auth/refresh', { refreshToken: refresh });
          const { token: newToken, refreshToken: newRefresh } = res.data;
          localStorage.setItem('token', newToken);
          localStorage.setItem('refreshToken', newRefresh);
          set({ token: newToken, refreshToken: newRefresh });

          // Reintentar cargar sesión
          const meRes = await apiClient.get('/auth/me', {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          set({ usuario: meRes.data, estaAutenticado: true, estaCargando: false });
        } catch {
          get().cerrarSesion();
        }
      } else {
        get().cerrarSesion();
      }
    }
  },

  cambiarPassword: async (contrasenaActual, nuevaContrasena) => {
    const token = get().token;
    if (!token) throw new Error('No autenticado');
    await apiClient.post(
      '/auth/cambiar-password',
      { contrasenaActual, nuevaContrasena },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },
}));