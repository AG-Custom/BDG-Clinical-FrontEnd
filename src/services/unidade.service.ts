import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarUnidadeRequest,
  CriarUnidadeRequest,
  Unidade,
} from '@/types/entidades/unidade';

export const unidadeService = {
  async listar(includeInactive = false): Promise<Unidade[]> {
    const { data } = await api.get<ApiResponse<Unidade[]>>('/api/units', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });

    return data.data;
  },

  async obter(id: string): Promise<Unidade> {
    const { data } = await api.get<ApiResponse<Unidade>>(`/api/units/${id}`);

    return data.data;
  },

  async criar(payload: CriarUnidadeRequest): Promise<Unidade> {
    const { data } = await api.post<ApiResponse<Unidade>>('/api/units', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarUnidadeRequest): Promise<Unidade> {
    const { data } = await api.put<ApiResponse<Unidade>>(`/api/units/${id}`, payload);

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.delete(`/api/units/${id}`);
  },

  async reativar(id: string): Promise<Unidade> {
    const { data } = await api.patch<ApiResponse<Unidade>>(`/api/units/${id}/reactivate`);

    return data.data;
  },
};
