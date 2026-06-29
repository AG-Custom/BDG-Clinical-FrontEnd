import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarCargoPermissoesRequest,
  AtualizarCargoRequest,
  Cargo,
  CargoPermissoes,
  CriarCargoRequest,
} from '@/types/entidades/cargo';

export const cargoService = {
  async listar(includeInactive = false): Promise<Cargo[]> {
    const { data } = await api.get<ApiResponse<Cargo[]>>('/api/positions', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });

    return data.data;
  },

  async obter(id: string): Promise<Cargo> {
    const { data } = await api.get<ApiResponse<Cargo>>(`/api/positions/${id}`);

    return data.data;
  },

  async criar(payload: CriarCargoRequest): Promise<Cargo> {
    const { data } = await api.post<ApiResponse<Cargo>>('/api/positions', payload);

    return data.data;
  },

  async atualizar(id: string, payload: AtualizarCargoRequest): Promise<Cargo> {
    const { data } = await api.put<ApiResponse<Cargo>>(`/api/positions/${id}`, payload);

    return data.data;
  },

  async desativar(id: string): Promise<void> {
    await api.delete(`/api/positions/${id}`);
  },

  async reativar(id: string): Promise<Cargo> {
    const { data } = await api.patch<ApiResponse<Cargo>>(`/api/positions/${id}/reactivate`);

    return data.data;
  },

  async obterPermissoes(id: string): Promise<CargoPermissoes> {
    const { data } = await api.get<ApiResponse<CargoPermissoes>>(
      `/api/positions/${id}/permissions`,
    );

    return data.data;
  },

  async atualizarPermissoes(
    id: string,
    payload: AtualizarCargoPermissoesRequest,
  ): Promise<CargoPermissoes> {
    const { data } = await api.put<ApiResponse<CargoPermissoes>>(
      `/api/positions/${id}/permissions`,
      payload,
    );

    return data.data;
  },
};
