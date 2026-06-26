import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarProcedimentoRequest,
  CriarProcedimentoRequest,
  ListarProcedimentosParams,
  Procedimento,
} from '@/types/entidades/procedimento';

export const procedimentoService = {
  async listar(params: ListarProcedimentosParams = {}): Promise<Procedimento[]> {
    const query: Record<string, string | boolean | number> = {};

    if (params.includeInactive) {
      query.includeInactive = true;
    }

    if (params.produtoAplicadoId) {
      query.produtoAplicadoId = params.produtoAplicadoId;
    }

    if (params.search) {
      query.search = params.search;
    }

    if (params.limit) {
      query.limit = params.limit;
    }

    const { data } = await api.get<ApiResponse<Procedimento[]>>('/api/procedures', {
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    return data.data ?? [];
  },

  async obter(id: string): Promise<Procedimento> {
    const { data } = await api.get<ApiResponse<Procedimento>>(`/api/procedures/${id}`);

    return data.data;
  },

  async criar(payload: CriarProcedimentoRequest): Promise<Procedimento> {
    const { data } = await api.post<ApiResponse<Procedimento>>('/api/procedures', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarProcedimentoRequest): Promise<Procedimento> {
    const { data } = await api.put<ApiResponse<Procedimento>>(`/api/procedures/${id}`, payload);

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.patch(`/api/procedures/${id}/deactivate`);
  },

  async reativar(id: string): Promise<Procedimento> {
    const { data } = await api.patch<ApiResponse<Procedimento>>(
      `/api/procedures/${id}/reactivate`,
    );

    return data.data;
  },
};
