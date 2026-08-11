import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type { RelatorioOperacional } from '@/types/entidades/relatorio';

export const relatorioService = {
  async obterOperacional(dataInicio: string, dataFim: string): Promise<RelatorioOperacional> {
    const { data } = await api.get<ApiResponse<RelatorioOperacional>>('/api/reports/operational', {
      params: { dataInicio, dataFim },
    });
    return data.data;
  },
};
