import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarFuncionarioRequest,
  CriarFuncionarioRequest,
  Funcionario,
} from '@/types/entidades/funcionario';

export const funcionarioService = {
  async listar(includeInactive = false): Promise<Funcionario[]> {
    const { data } = await api.get<ApiResponse<Funcionario[]>>('/api/employees', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });

    return data.data ?? [];
  },

  async obter(id: string): Promise<Funcionario> {
    const { data } = await api.get<ApiResponse<Funcionario>>(`/api/employees/${id}`);

    return data.data;
  },

  async criar(payload: CriarFuncionarioRequest): Promise<Funcionario> {
    const { data } = await api.post<ApiResponse<Funcionario>>('/api/employees', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarFuncionarioRequest): Promise<Funcionario> {
    const { data } = await api.put<ApiResponse<Funcionario>>(`/api/employees/${id}`, payload);

    return data.data;
  },

  async desativar(id: string): Promise<Funcionario> {
    const { data } = await api.delete<ApiResponse<Funcionario>>(`/api/employees/${id}`);

    return data.data;
  },

  async reativar(id: string): Promise<Funcionario> {
    const { data } = await api.patch<ApiResponse<Funcionario>>(`/api/employees/${id}/reactivate`);

    return data.data;
  },
};
