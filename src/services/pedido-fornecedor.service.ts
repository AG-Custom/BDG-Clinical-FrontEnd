import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AnexoPedidoFornecedor,
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

  async criar(
    payload: SalvarPedidoFornecedorRequest,
    arquivos: File[] = [],
  ): Promise<PedidoFornecedor> {
    if (arquivos.length === 0) {
      const { data } = await api.post<ApiResponse<PedidoFornecedor>>('/api/supplier-orders', payload);

      return data.data;
    }

    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));

    for (const arquivo of arquivos) {
      formData.append('files', arquivo);
    }

    const { data } = await api.post<ApiResponse<PedidoFornecedor>>(
      '/api/supplier-orders',
      formData,
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

  async receber(
    id: string,
    payload?: {
      itens?: Array<{
        produtoId: string;
        loteCodigo?: string | null;
        dataValidade?: string | null;
        quantidadeEmbalagem?: number | null;
      }>;
    },
  ): Promise<PedidoFornecedor> {
    const { data } = await api.patch<ApiResponse<PedidoFornecedor>>(
      `/api/supplier-orders/${id}/receive`,
      payload ?? {},
    );

    return data.data;
  },

  async listarAnexos(id: string): Promise<AnexoPedidoFornecedor[]> {
    const { data } = await api.get<ApiResponse<AnexoPedidoFornecedor[]>>(
      `/api/supplier-orders/${id}/attachments`,
    );

    return data.data;
  },

  async enviarAnexo(id: string, arquivo: File): Promise<AnexoPedidoFornecedor> {
    const formData = new FormData();
    formData.append('file', arquivo);

    const { data } = await api.post<ApiResponse<AnexoPedidoFornecedor>>(
      `/api/supplier-orders/${id}/attachments`,
      formData,
    );

    return data.data;
  },

  async removerAnexo(id: string, attachmentId: string): Promise<void> {
    await api.delete(`/api/supplier-orders/${id}/attachments/${attachmentId}`);
  },
};
