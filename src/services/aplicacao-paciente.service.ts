import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AplicacaoPaciente,
  AtualizarAplicacaoPacienteRequest,
  CriarAplicacaoPacienteRequest,
  ListarAplicacoesPacienteParams,
} from '@/types/entidades/aplicacao-paciente';

export const aplicacaoPacienteService = {
  async listar(params: ListarAplicacoesPacienteParams = {}): Promise<AplicacaoPaciente[]> {
    const query: Record<string, string | boolean | number> = {};

    if (params.pacienteId) {
      query.pacienteId = params.pacienteId;
    }

    if (params.unidadeId) {
      query.unidadeId = params.unidadeId;
    }

    if (params.produtoId) {
      query.produtoId = params.produtoId;
    }

    if (params.aplicadorId) {
      query.aplicadorId = params.aplicadorId;
    }

    if (params.cancelada !== undefined) {
      query.cancelada = params.cancelada;
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

    const { data } = await api.get<ApiResponse<AplicacaoPaciente[]>>(
      '/api/patient-applications',
      {
        params: Object.keys(query).length > 0 ? query : undefined,
      },
    );

    return data.data;
  },

  async obter(id: string): Promise<AplicacaoPaciente> {
    const { data } = await api.get<ApiResponse<AplicacaoPaciente>>(
      `/api/patient-applications/${id}`,
    );

    return data.data;
  },

  async criar(payload: CriarAplicacaoPacienteRequest): Promise<AplicacaoPaciente> {
    const { data } = await api.post<ApiResponse<AplicacaoPaciente>>(
      '/api/patient-applications',
      payload,
    );

    return data.data;
  },

  async atualizar(
    id: string,
    payload: AtualizarAplicacaoPacienteRequest,
  ): Promise<AplicacaoPaciente> {
    const { data } = await api.put<ApiResponse<AplicacaoPaciente>>(
      `/api/patient-applications/${id}`,
      payload,
    );

    return data.data;
  },

  async cancelar(id: string): Promise<AplicacaoPaciente> {
    const { data } = await api.post<ApiResponse<AplicacaoPaciente>>(
      `/api/patient-applications/${id}/cancel`,
    );

    return data.data;
  },
};
