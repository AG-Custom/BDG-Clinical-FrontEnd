import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarPacoteRequest,
  CriarPacoteRequest,
  ListarPacotesParams,
  Pacote,
} from '@/types/entidades/pacote';

export const pacoteService = {
  async listar(params: ListarPacotesParams = {}): Promise<Pacote[]> {
    const query: Record<string, string | boolean | number> = {};

    if (params.includeInactive) {
      query.includeInactive = true;
    }

    if (params.search) {
      query.search = params.search;
    }

    if (params.limit) {
      query.limit = params.limit;
    }

    const { data } = await api.get<ApiResponse<Pacote[]>>('/api/packages', {
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    return data.data ?? [];
  },

  async obter(id: string): Promise<Pacote> {
    const { data } = await api.get<ApiResponse<Pacote>>(`/api/packages/${id}`);

    return data.data;
  },

  async criar(payload: CriarPacoteRequest): Promise<Pacote> {
    const { data } = await api.post<ApiResponse<Pacote>>('/api/packages', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarPacoteRequest): Promise<Pacote> {
    const { data } = await api.put<ApiResponse<Pacote>>(`/api/packages/${id}`, payload);

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.patch(`/api/packages/${id}/deactivate`);
  },

  async reativar(id: string): Promise<Pacote> {
    const { data } = await api.patch<ApiResponse<Pacote>>(`/api/packages/${id}/reactivate`);

    return data.data;
  },
};
