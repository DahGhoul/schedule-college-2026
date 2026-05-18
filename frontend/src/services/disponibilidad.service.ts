import { apiClient } from '@/lib/api-client';

export interface Disponibilidad {
  id: number;
  id_docente: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

export const disponibilidadService = {
  async obtenerPorDocente(idDocente: number): Promise<Disponibilidad[]> {
    const response = await apiClient.get(`/disponibilidad/docente/${idDocente}`);
    return response.data;
  },

  async actualizarBatch(idDocente: number, disponibilidades: { id: number; disponible: boolean }[]): Promise<Disponibilidad[]> {
    const response = await apiClient.put(`/disponibilidad/docente/${idDocente}`, { disponibilidades });
    return response.data;
  },
};
