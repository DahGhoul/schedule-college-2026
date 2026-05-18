import { apiClient } from '@/lib/api-client';

export interface Usuario {
  id: number;
  email: string;
  rol: string;
  activo: boolean;
  fecha_creacion: string;
  ultimo_acceso: string | null;
  id_docente: number | null;
  docente: {
    id: number;
    nombres: string;
    apellidos: string;
  } | null;
}

export const usuariosService = {
  async listar(): Promise<Usuario[]> {
    const response = await apiClient.get('/usuarios');
    return response.data;
  },

  async obtenerPorId(id: number): Promise<Usuario> {
    const response = await apiClient.get(`/usuarios/${id}`);
    return response.data;
  },

  async crear(datos: {
    email: string;
    rol: string;
    password: string;
    id_docente?: number;
  }): Promise<Usuario> {
    const response = await apiClient.post('/usuarios', datos);
    return response.data;
  },

  async actualizar(
    id: number,
    datos: {
      email?: string;
      rol?: string;
      password?: string;
      id_docente?: number | null;
      activo?: boolean;
    }
  ): Promise<Usuario> {
    const response = await apiClient.put(`/usuarios/${id}`, datos);
    return response.data;
  },

  async eliminar(id: number): Promise<void> {
    await apiClient.delete(`/usuarios/${id}`);
  },

  async reactivar(id: number): Promise<Usuario> {
    const response = await apiClient.put(`/usuarios/${id}/reactivar`);
    return response.data;
  },
};
