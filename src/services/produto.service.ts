import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarProdutoRequest,
  CriarProdutoRequest,
  ListarProdutosParams,
  Produto,
} from '@/types/entidades/produto';

export const produtoService = {
  async listar(params: ListarProdutosParams = {}): Promise<Produto[]> {
    const query: Record<string, string | boolean> = {};

    if (params.tipoProdutoId) {
      query.tipoProdutoId = params.tipoProdutoId;
    }

    if (params.includeInactive) {
      query.includeInactive = true;
    }

    const { data } = await api.get<ApiResponse<Produto[]>>('/api/products', {
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    return data.data;
  },

  async obter(id: string): Promise<Produto> {
    const { data } = await api.get<ApiResponse<Produto>>(`/api/products/${id}`);

    return data.data;
  },

  async criar(payload: CriarProdutoRequest): Promise<Produto> {
    const { data } = await api.post<ApiResponse<Produto>>('/api/products', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarProdutoRequest): Promise<Produto> {
    const { data } = await api.put<ApiResponse<Produto>>(`/api/products/${id}`, payload);

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.delete(`/api/products/${id}`);
  },

  async reativar(id: string): Promise<Produto> {
    const { data } = await api.patch<ApiResponse<Produto>>(`/api/products/${id}/reactivate`);

    return data.data;
  },
};
