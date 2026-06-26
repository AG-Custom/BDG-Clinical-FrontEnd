import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  ListarMovimentacoesEstoqueParams,
  MovimentacaoEstoque,
  RegistrarMovimentacaoManualRequest,
} from '@/types/entidades/movimentacao-estoque';

export const movimentacaoEstoqueService = {
  async listar(params: ListarMovimentacoesEstoqueParams = {}): Promise<MovimentacaoEstoque[]> {
    const query: Record<string, string | number> = {};

    if (params.unidadeId) {
      query.unidadeId = params.unidadeId;
    }

    if (params.produtoId) {
      query.produtoId = params.produtoId;
    }

    if (params.tipo) {
      query.tipo = params.tipo;
    }

    if (params.dataInicio) {
      query.dataInicio = params.dataInicio;
    }

    if (params.dataFim) {
      query.dataFim = params.dataFim;
    }

    if (params.limit) {
      query.limit = params.limit;
    }

    const { data } = await api.get<ApiResponse<MovimentacaoEstoque[]>>('/api/stock-movements', {
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    return data.data ?? [];
  },

  async registrarEntradaManual(
    payload: RegistrarMovimentacaoManualRequest,
  ): Promise<MovimentacaoEstoque> {
    const { data } = await api.post<ApiResponse<MovimentacaoEstoque>>(
      '/api/stock-movements/adjustment',
      payload,
    );

    return data.data;
  },

  async registrarSaidaManual(
    payload: RegistrarMovimentacaoManualRequest,
  ): Promise<MovimentacaoEstoque> {
    const { data } = await api.post<ApiResponse<MovimentacaoEstoque>>(
      '/api/stock-movements/loss',
      payload,
    );

    return data.data;
  },
};
