import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarFornecedorRequest,
  CriarFornecedorRequest,
  Fornecedor,
  ListarFornecedoresParams,
} from '@/types/entidades/fornecedor';

export const fornecedorService = {
  async listar(params: ListarFornecedoresParams = {}): Promise<Fornecedor[]> {
    const query: Record<string, string | boolean | number> = {};

    if (params.search?.trim()) {
      query.search = params.search.trim();
    }

    if (params.limit) {
      query.limit = params.limit;
    }

    if (params.includeInactive) {
      query.includeInactive = true;
    }

    const { data } = await api.get<ApiResponse<Fornecedor[]>>('/api/suppliers', {
      params: Object.keys(query).length > 0 ? query : undefined,
      signal: params.signal,
    });

    return data.data;
  },

  async obter(id: string): Promise<Fornecedor> {
    const { data } = await api.get<ApiResponse<Fornecedor>>(`/api/suppliers/${id}`);

    return data.data;
  },

  async criar(payload: CriarFornecedorRequest): Promise<Fornecedor> {
    const { data } = await api.post<ApiResponse<Fornecedor>>('/api/suppliers', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarFornecedorRequest): Promise<Fornecedor> {
    const { data } = await api.put<ApiResponse<Fornecedor>>(`/api/suppliers/${id}`, payload);

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.delete(`/api/suppliers/${id}`);
  },

  async reativar(id: string): Promise<Fornecedor> {
    const { data } = await api.patch<ApiResponse<Fornecedor>>(`/api/suppliers/${id}/reactivate`);

    return data.data;
  },
};
