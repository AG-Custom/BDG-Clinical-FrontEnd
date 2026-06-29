import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarFuncionarioRequest,
  CriarFuncionarioRequest,
  Funcionario,
  ListarFuncionariosParams,
} from '@/types/entidades/funcionario';
import type {
  AtualizarPermissoesFuncionarioRequest,
  PermissoesFuncionario,
} from '@/types/entidades/permissao';

export const funcionarioService = {
  async listar(params: ListarFuncionariosParams = {}): Promise<Funcionario[]> {
    const query: Record<string, string | boolean> = {};

    if (params.unidadeId) {
      query.unidadeId = params.unidadeId;
    }

    if (params.includeInactive) {
      query.includeInactive = true;
    }

    const { data } = await api.get<ApiResponse<Funcionario[]>>('/api/employees', {
      params: Object.keys(query).length > 0 ? query : undefined,
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

  async obterPermissoes(id: string): Promise<PermissoesFuncionario> {
    const { data } = await api.get<ApiResponse<PermissoesFuncionario>>(
      `/api/employees/${id}/permissions`,
    );

    return data.data;
  },

  async atualizarPermissoes(
    id: string,
    payload: AtualizarPermissoesFuncionarioRequest,
  ): Promise<PermissoesFuncionario> {
    const { data } = await api.put<ApiResponse<PermissoesFuncionario>>(
      `/api/employees/${id}/permissions`,
      payload,
    );

    return data.data;
  },
};
