import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  Agendamento,
  AtualizarAgendamentoRequest,
  CancelarAgendamentoRequest,
  ConcluirAgendamentoRequest,
  CriarAgendamentoRequest,
  ListarAgendamentosParams,
} from '@/types/entidades/agendamento';

export const agendamentoService = {
  async listar(params: ListarAgendamentosParams = {}): Promise<Agendamento[]> {
    const query: Record<string, string> = {};

    if (params.unidadeId) {
      query.unidadeId = params.unidadeId;
    }

    if (params.funcionarioId) {
      query.funcionarioId = params.funcionarioId;
    }

    if (params.pacienteId) {
      query.pacienteId = params.pacienteId;
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.dataInicioFrom) {
      query.dataInicioFrom = params.dataInicioFrom;
    }

    if (params.dataInicioTo) {
      query.dataInicioTo = params.dataInicioTo;
    }

    const { data } = await api.get<ApiResponse<Agendamento[]>>('/api/appointments', {
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    return data.data;
  },

  async obter(id: string): Promise<Agendamento> {
    const { data } = await api.get<ApiResponse<Agendamento>>(`/api/appointments/${id}`);

    return data.data;
  },

  async criar(payload: CriarAgendamentoRequest): Promise<Agendamento> {
    const { data } = await api.post<ApiResponse<Agendamento>>('/api/appointments', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarAgendamentoRequest): Promise<Agendamento> {
    const { data } = await api.put<ApiResponse<Agendamento>>(
      `/api/appointments/${id}`,
      payload,
    );

    return data.data;
  },

  async confirmar(id: string): Promise<Agendamento> {
    const { data } = await api.patch<ApiResponse<Agendamento>>(
      `/api/appointments/${id}/confirm`,
    );

    return data.data;
  },

  async concluir(id: string, payload: ConcluirAgendamentoRequest = {}): Promise<Agendamento> {
    const { data } = await api.patch<ApiResponse<Agendamento>>(
      `/api/appointments/${id}/complete`,
      payload,
    );

    return data.data;
  },

  async cancelar(id: string, payload: CancelarAgendamentoRequest): Promise<Agendamento> {
    const { data } = await api.patch<ApiResponse<Agendamento>>(
      `/api/appointments/${id}/cancel`,
      payload,
    );

    return data.data;
  },

  async marcarFalta(id: string): Promise<Agendamento> {
    const { data } = await api.patch<ApiResponse<Agendamento>>(
      `/api/appointments/${id}/no-show`,
    );

    return data.data;
  },
};
