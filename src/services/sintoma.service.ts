import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarSintomaRequest,
  CriarSintomaRequest,
  Sintoma,
} from '@/types/entidades/sintoma';

export const sintomaService = {
  async listar(includeInactive = false): Promise<Sintoma[]> {
    const { data } = await api.get<ApiResponse<Sintoma[]>>('/api/symptoms', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });

    return data.data ?? [];
  },

  async obter(id: string): Promise<Sintoma> {
    const { data } = await api.get<ApiResponse<Sintoma>>(`/api/symptoms/${id}`);

    return data.data;
  },

  async criar(payload: CriarSintomaRequest): Promise<Sintoma> {
    const { data } = await api.post<ApiResponse<Sintoma>>('/api/symptoms', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarSintomaRequest): Promise<Sintoma> {
    const { data } = await api.put<ApiResponse<Sintoma>>(`/api/symptoms/${id}`, payload);

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.delete(`/api/symptoms/${id}`);
  },

  async reativar(id: string): Promise<Sintoma> {
    const { data } = await api.patch<ApiResponse<Sintoma>>(`/api/symptoms/${id}/reactivate`);

    return data.data;
  },
};
