import { apiClient } from '@/lib/api-client';

export const chatService = {
  consultar: (datos: { consulta: string; rol?: string; contexto?: string }) =>
    apiClient.post('/chat/consulta', datos),
};
