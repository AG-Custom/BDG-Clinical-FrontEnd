import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type { EmpresaResumo } from '@/types/entidades/empresa';
import type { UsuarioAutenticado } from '@/types/entidades/usuario';

export interface SelecionarEmpresaRequest {
  empresaId: string;
}

export interface SelecionarEmpresaResponse {
  token: string;
  usuario: UsuarioAutenticado;
  empresa: EmpresaResumo;
}

export const empresaService = {
  async listar(): Promise<EmpresaResumo[]> {
    const { data } = await api.get<ApiResponse<EmpresaResumo[]>>('/api/empresas');

    return data.data;
  },

  async selecionar(empresaId: string): Promise<SelecionarEmpresaResponse> {
    const { data } = await api.post<ApiResponse<SelecionarEmpresaResponse>>(
      '/api/auth/selecionar-empresa',
      { empresaId },
    );

    return data.data;
  },
};
