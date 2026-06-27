import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AlterarAtivoHorarioFuncionamentoRequest,
  AtualizarHorarioFuncionamentoRequest,
  CriarHorarioFuncionamentoRequest,
  HorarioFuncionamentoUnidade,
} from '@/types/entidades/horario-funcionamento-unidade';

export const horarioFuncionamentoUnidadeService = {
  async listar(
    unidadeId: string,
    includeInactive = false,
  ): Promise<HorarioFuncionamentoUnidade[]> {
    const { data } = await api.get<ApiResponse<HorarioFuncionamentoUnidade[]>>(
      `/api/units/${unidadeId}/operating-hours`,
      {
        params: includeInactive ? { includeInactive: true } : undefined,
      },
    );

    return data.data;
  },

  async criar(
    unidadeId: string,
    payload: CriarHorarioFuncionamentoRequest,
  ): Promise<HorarioFuncionamentoUnidade> {
    const { data } = await api.post<ApiResponse<HorarioFuncionamentoUnidade>>(
      `/api/units/${unidadeId}/operating-hours`,
      payload,
    );

    return data.data;
  },

  async atualizar(
    unidadeId: string,
    id: string,
    payload: AtualizarHorarioFuncionamentoRequest,
  ): Promise<HorarioFuncionamentoUnidade> {
    const { data } = await api.put<ApiResponse<HorarioFuncionamentoUnidade>>(
      `/api/units/${unidadeId}/operating-hours/${id}`,
      payload,
    );

    return data.data;
  },

  async alternarAtivo(
    id: string,
    ativo: boolean,
  ): Promise<HorarioFuncionamentoUnidade> {
    const payload: AlterarAtivoHorarioFuncionamentoRequest = { ativo };
    const { data } = await api.patch<ApiResponse<HorarioFuncionamentoUnidade>>(
      `/api/unit-operating-hours/${id}/active`,
      payload,
    );

    return data.data;
  },

  async criarEmLote(
    unidadeId: string,
    payloads: CriarHorarioFuncionamentoRequest[],
  ): Promise<HorarioFuncionamentoUnidade[]> {
    const resultados = await Promise.all(
      payloads.map((payload) => this.criar(unidadeId, payload)),
    );

    return resultados;
  },
};
