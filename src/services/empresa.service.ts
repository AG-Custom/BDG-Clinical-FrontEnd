import { api } from '@/boot/axios';
import type { AuthSessionResponse } from '@/services/auth.service';
import type { ApiResponse } from '@/types/api/api';
import type {
  AtualizarEmpresaRequest,
  CriarEmpresaRequest,
  Empresa,
  EmpresaContexto,
} from '@/types/entidades/empresa';

export const empresaService = {
  async listar(): Promise<EmpresaContexto[]> {
    const { data } = await api.get<ApiResponse<EmpresaContexto[]>>('/api/companies');

    return data.data;
  },

  async criar(payload: CriarEmpresaRequest): Promise<AuthSessionResponse> {
    const { data } = await api.post<ApiResponse<AuthSessionResponse>>('/api/companies', payload);

    return data.data;
  },

  async obterAtual(): Promise<Empresa> {
    const { data } = await api.get<ApiResponse<Empresa>>('/api/companies/current');

    return data.data;
  },

  async atualizarAtual(payload: AtualizarEmpresaRequest): Promise<Empresa> {
    const { data } = await api.put<ApiResponse<Empresa>>('/api/companies/current', payload);

    return data.data;
  },

  async enviarLogo(arquivo: File): Promise<Empresa> {
    const formData = new FormData();
    formData.append('file', arquivo);

    const { data } = await api.post<ApiResponse<Empresa>>(
      '/api/companies/current/logo',
      formData,
    );

    return data.data;
  },
};
