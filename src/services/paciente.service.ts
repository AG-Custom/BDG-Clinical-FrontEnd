import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarPacienteRequest,
  CriarPacienteRequest,
  ListarPacientesParams,
  Paciente,
} from '@/types/entidades/paciente';

export const pacienteService = {
  async listar(params: ListarPacientesParams = {}): Promise<Paciente[]> {
    const query: Record<string, string | boolean> = {};

    if (params.unidadeId) {
      query.unidadeId = params.unidadeId;
    }

    if (params.includeInactive) {
      query.includeInactive = true;
    }

    const { data } = await api.get<ApiResponse<Paciente[]>>('/api/patients', {
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    return data.data;
  },

  async obter(id: string): Promise<Paciente> {
    const { data } = await api.get<ApiResponse<Paciente>>(`/api/patients/${id}`);

    return data.data;
  },

  async criar(payload: CriarPacienteRequest): Promise<Paciente> {
    const { data } = await api.post<ApiResponse<Paciente>>('/api/patients', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarPacienteRequest): Promise<Paciente> {
    const { data } = await api.put<ApiResponse<Paciente>>(`/api/patients/${id}`, payload);

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.delete(`/api/patients/${id}`);
  },

  async reativar(id: string): Promise<Paciente> {
    const { data } = await api.patch<ApiResponse<Paciente>>(`/api/patients/${id}/reactivate`);

    return data.data;
  },
};
