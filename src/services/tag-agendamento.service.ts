import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarTagAgendamentoRequest,
  CriarTagAgendamentoRequest,
  TagAgendamento,
} from '@/types/entidades/tag-agendamento';

export const tagAgendamentoService = {
  async listar(includeInactive = false): Promise<TagAgendamento[]> {
    const { data } = await api.get<ApiResponse<TagAgendamento[]>>('/api/appointment-tags', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });

    return data.data ?? [];
  },

  async obter(id: string): Promise<TagAgendamento> {
    const { data } = await api.get<ApiResponse<TagAgendamento>>(`/api/appointment-tags/${id}`);

    return data.data;
  },

  async criar(payload: CriarTagAgendamentoRequest): Promise<TagAgendamento> {
    const { data } = await api.post<ApiResponse<TagAgendamento>>('/api/appointment-tags', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarTagAgendamentoRequest): Promise<TagAgendamento> {
    const { data } = await api.put<ApiResponse<TagAgendamento>>(
      `/api/appointment-tags/${id}`,
      payload,
    );

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.delete(`/api/appointment-tags/${id}`);
  },

  async reativar(id: string): Promise<TagAgendamento> {
    const { data } = await api.patch<ApiResponse<TagAgendamento>>(
      `/api/appointment-tags/${id}/reactivate`,
    );

    return data.data;
  },
};
