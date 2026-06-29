import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type { EmpresaContexto } from '@/types/entidades/empresa';
import type { UsuarioAutenticado } from '@/types/entidades/usuario';
import { normalizarUsuarioAuth } from '@/utils/normalizar-usuario-auth';

export interface LoginRequest {
  email: string;
  senha: string;
  empresaId?: string | null;
}

export interface RegistrarRequest {
  nomeEmpresa: string;
  nome: string;
  email: string;
  senha: string;
  cnpj?: string;
  telefone?: string;
  corPrincipal?: string;
}

export interface AuthSessionResponse {
  requiresCompanySelection: boolean;
  token: string | null;
  usuario: UsuarioAutenticado | null;
  companies: EmpresaContexto[] | null;
}

export interface LoginResponseLegacy {
  token: string;
  usuario: UsuarioAutenticado;
}

export type LoginResult =
  | { status: 'authenticated' }
  | { status: 'company_selection_required'; companies: EmpresaContexto[] };

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

export function extrairSessaoAuth(
  response: AuthSessionResponse,
): { token: string; usuario: UsuarioAutenticado } | null {
  if (response.requiresCompanySelection || !response.token || !response.usuario) {
    return null;
  }

  return {
    token: response.token,
    usuario: normalizarUsuarioAuth(response.usuario),
  };
}

export const authService = {
  async login(payload: LoginRequest): Promise<AuthSessionResponse> {
    const { data } = await api.post<ApiResponse<AuthSessionResponse>>('/api/auth/login', payload);

    return data.data;
  },

  async trocarEmpresa(empresaId: string): Promise<AuthSessionResponse> {
    const { data } = await api.post<ApiResponse<AuthSessionResponse>>('/api/auth/switch-company', {
      empresaId,
    });

    return data.data;
  },

  async registrar(payload: RegistrarRequest): Promise<LoginResponseLegacy> {
    const { data } = await api.post<ApiResponse<LoginResponseLegacy>>(
      '/api/auth/registrar',
      payload,
    );

    return {
      token: data.data.token,
      usuario: normalizarUsuarioAuth(data.data.usuario),
    };
  },

  async me(): Promise<UsuarioAutenticado> {
    const { data } = await api.get<ApiResponse<UsuarioAutenticado>>('/api/auth/me');

    return normalizarUsuarioAuth(data.data);
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

  async concluirPrimeiroAcesso(
    payload: ConcluirPrimeiroAcessoRequest,
  ): Promise<LoginResponseLegacy> {
    const { data } = await api.post<ApiResponse<LoginResponseLegacy>>(
      '/api/auth/primeiro-acesso/concluir',
      payload,
    );

    return {
      token: data.data.token,
      usuario: normalizarUsuarioAuth(data.data.usuario),
    };
  },
};
