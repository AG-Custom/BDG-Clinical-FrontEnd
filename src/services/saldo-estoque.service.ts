import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  ListarSaldosEstoqueParams,
  SaldoEstoque,
} from '@/types/entidades/saldo-estoque';

export const saldoEstoqueService = {
  async listar(params: ListarSaldosEstoqueParams = {}): Promise<SaldoEstoque[]> {
    const query: Record<string, string | boolean | number> = {};

    if (params.unidadeId) {
      query.unidadeId = params.unidadeId;
    }

    if (params.produtoId) {
      query.produtoId = params.produtoId;
    }

    if (params.abaixoDoMinimo) {
      query.abaixoDoMinimo = true;
    }

    if (params.search?.trim()) {
      query.search = params.search.trim();
    }

    if (params.limit) {
      query.limit = params.limit;
    }

    const { data } = await api.get<ApiResponse<SaldoEstoque[]>>('/api/stock-balances', {
      params: Object.keys(query).length > 0 ? query : undefined,
      signal: params.signal,
    });

    return data.data;
  },
};
