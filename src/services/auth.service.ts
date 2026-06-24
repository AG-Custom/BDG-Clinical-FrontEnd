import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type { UsuarioAutenticado } from '@/types/entidades/usuario';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface RegistrarRequest {
  nomeEmpresa: string;
  nome: string;
  email: string;
  senha: string;
  cnpj?: string;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioAutenticado;
}

export interface ValidarEmailPrimeiroAcessoRequest {
  token: string;
  email: string;
}

export interface ValidarEmailPrimeiroAcessoResponse {
  nome: string;
  email: string;
}

export interface ConcluirPrimeiroAcessoRequest {
  token: string;
  email: string;
  senha: string;
}

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/api/auth/login', payload);

    return data.data;
  },
  async registrar(payload: RegistrarRequest): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/api/auth/registrar', payload);

    return data.data;
  },
  async me(): Promise<UsuarioAutenticado> {
    const { data } = await api.get<ApiResponse<UsuarioAutenticado>>('/api/auth/me');

    return data.data;
  },
  async validarEmailPrimeiroAcesso(
    payload: ValidarEmailPrimeiroAcessoRequest,
  ): Promise<ValidarEmailPrimeiroAcessoResponse> {
    const { data } = await api.post<ApiResponse<ValidarEmailPrimeiroAcessoResponse>>(
      '/api/auth/primeiro-acesso/validar-email',
      payload,
    );

    return data.data;
  },
  async concluirPrimeiroAcesso(payload: ConcluirPrimeiroAcessoRequest): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>(
      '/api/auth/primeiro-acesso/concluir',
      payload,
    );

    return data.data;
  },
};
