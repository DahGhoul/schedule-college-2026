'use client';
import { useAuthStore } from '@/stores/auth.store';
import { useEffect } from 'react';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    if (!store.estaAutenticado && store.token) {
      store.cargarSesion();
    }
  }, []);

  return store;
}