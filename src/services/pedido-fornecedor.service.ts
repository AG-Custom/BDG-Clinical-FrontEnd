import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  ListarPedidosFornecedorParams,
  PedidoFornecedor,
  SalvarPedidoFornecedorRequest,
} from '@/types/entidades/pedido-fornecedor';

export const pedidoFornecedorService = {
  async listar(params: ListarPedidosFornecedorParams = {}): Promise<PedidoFornecedor[]> {
    const query: Record<string, string> = {};

    if (params.status) {
      query.status = params.status;
    }

    if (params.fornecedorId) {
      query.fornecedorId = params.fornecedorId;
    }

    if (params.unidadeId) {
      query.unidadeId = params.unidadeId;
    }

    const { data } = await api.get<ApiResponse<PedidoFornecedor[]>>('/api/supplier-orders', {
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    return data.data;
  },

  async obter(id: string): Promise<PedidoFornecedor> {
    const { data } = await api.get<ApiResponse<PedidoFornecedor>>(`/api/supplier-orders/${id}`);

    return data.data;
  },

  async criar(payload: SalvarPedidoFornecedorRequest): Promise<PedidoFornecedor> {
    const { data } = await api.post<ApiResponse<PedidoFornecedor>>(
      '/api/supplier-orders',
      payload,
    );

    return data.data;
  },

  async atualizar(id: string, payload: SalvarPedidoFornecedorRequest): Promise<PedidoFornecedor> {
    const { data } = await api.put<ApiResponse<PedidoFornecedor>>(
      `/api/supplier-orders/${id}`,
      payload,
    );

    return data.data;
  },

  async cancelar(id: string): Promise<PedidoFornecedor> {
    const { data } = await api.patch<ApiResponse<PedidoFornecedor>>(
      `/api/supplier-orders/${id}/cancel`,
    );

    return data.data;
  },

  async receber(id: string): Promise<PedidoFornecedor> {
    const { data } = await api.patch<ApiResponse<PedidoFornecedor>>(
      `/api/supplier-orders/${id}/receive`,
    );

    return data.data;
  },
};
