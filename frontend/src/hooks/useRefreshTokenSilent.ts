'use client';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';

/**
 * Hook que refresca el token silenciosamente en background sin bloquear el render.
 * Solo intenta refresh una vez por sesión.
 */
export function useRefreshTokenSilent() {
  const { token, refreshToken, estaAutenticado } = useAuthStore();
  const hasTriedRefresh = useRef(false);

  useEffect(() => {
    if (!estaAutenticado || hasTriedRefresh.current) {
      return;
    }

    hasTriedRefresh.current = true;

    // Ejecutar refresh de forma asincrónica sin await
    if (token && refreshToken) {
      apiClient
        .post('/auth/refresh', { refreshToken })
        .then((res) => {
          const { token: newToken, refreshToken: newRefresh } = res.data;
          localStorage.setItem('token', newToken);
          localStorage.setItem('refreshToken', newRefresh);
          useAuthStore.setState({ token: newToken, refreshToken: newRefresh });
        })
        .catch(() => {
          // Silent fail - token sigue siendo válido por ahora
        });
    }
  }, [token, refreshToken, estaAutenticado]);
}
