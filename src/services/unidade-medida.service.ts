import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarUnidadeMedidaRequest,
  CriarUnidadeMedidaRequest,
  ListarUnidadesMedidaParams,
  UnidadeMedida,
} from '@/types/entidades/unidade-medida';

export const unidadeMedidaService = {
  async listar(params: ListarUnidadesMedidaParams = {}): Promise<UnidadeMedida[]> {
    const query: Record<string, string | boolean | number> = {};

    if (params.tipo) {
      query.tipo = params.tipo;
    }

    if (params.search?.trim()) {
      query.search = params.search.trim();
    }

    if (params.limit) {
      query.limit = params.limit;
    }

    if (params.includeInactive) {
      query.includeInactive = true;
    }

    const { data } = await api.get<ApiResponse<UnidadeMedida[]>>('/api/measurement-units', {
      params: Object.keys(query).length > 0 ? query : undefined,
      signal: params.signal,
    });

    return data.data;
  },

  async obter(id: string): Promise<UnidadeMedida> {
    const { data } = await api.get<ApiResponse<UnidadeMedida>>(
      `/api/measurement-units/${id}`,
    );

    return data.data;
  },

  async criar(payload: CriarUnidadeMedidaRequest): Promise<UnidadeMedida> {
    const { data } = await api.post<ApiResponse<UnidadeMedida>>(
      '/api/measurement-units',
      payload,
    );

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarUnidadeMedidaRequest): Promise<UnidadeMedida> {
    const { data } = await api.put<ApiResponse<UnidadeMedida>>(
      `/api/measurement-units/${id}`,
      payload,
    );

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.delete(`/api/measurement-units/${id}`);
  },

  async reativar(id: string): Promise<UnidadeMedida> {
    const { data } = await api.patch<ApiResponse<UnidadeMedida>>(
      `/api/measurement-units/${id}/reactivate`,
    );

    return data.data;
  },
};
