import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarTipoProdutoRequest,
  CriarTipoProdutoRequest,
  TipoProduto,
} from '@/types/entidades/tipo-produto';

export const tipoProdutoService = {
  async listar(includeInactive = false): Promise<TipoProduto[]> {
    const { data } = await api.get<ApiResponse<TipoProduto[]>>('/api/product-types', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });

    return data.data;
  },

  async obter(id: string): Promise<TipoProduto> {
    const { data } = await api.get<ApiResponse<TipoProduto>>(`/api/product-types/${id}`);

    return data.data;
  },

  async criar(payload: CriarTipoProdutoRequest): Promise<TipoProduto> {
    const { data } = await api.post<ApiResponse<TipoProduto>>('/api/product-types', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarTipoProdutoRequest): Promise<TipoProduto> {
    const { data } = await api.put<ApiResponse<TipoProduto>>(
      `/api/product-types/${id}`,
      payload,
    );

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.delete(`/api/product-types/${id}`);
  },

  async reativar(id: string): Promise<TipoProduto> {
    const { data } = await api.patch<ApiResponse<TipoProduto>>(
      `/api/product-types/${id}/reactivate`,
    );

    return data.data;
  },
};
