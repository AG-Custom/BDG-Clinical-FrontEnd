import { defineStore } from 'pinia';

import { AUTH_TOKEN_KEY, AUTH_USUARIO_KEY } from '@/constants/auth';
import {
  authService,
  extrairSessaoAuth,
  type LoginRequest,
  type LoginResult,
  type RegistrarRequest,
} from '@/services/auth.service';
import type { EmpresaResumo } from '@/types/entidades/empresa';
import type { UsuarioAutenticado } from '@/types/entidades/usuario';

interface AuthState {
  token: string | null;
  usuario: UsuarioAutenticado | null;
  carregando: boolean;
}

function lerTokenSalvo(): string | null {
  return sessionStorage.getItem(AUTH_TOKEN_KEY) ?? localStorage.getItem(AUTH_TOKEN_KEY);
}

function lerUsuarioSalvo(): UsuarioAutenticado | null {
  const usuarioJson =
    sessionStorage.getItem(AUTH_USUARIO_KEY) ?? localStorage.getItem(AUTH_USUARIO_KEY);

  return usuarioJson ? (JSON.parse(usuarioJson) as UsuarioAutenticado) : null;
}

function migrarLocalParaSession(): void {
  const tokenLocal = localStorage.getItem(AUTH_TOKEN_KEY);
  const usuarioLocal = localStorage.getItem(AUTH_USUARIO_KEY);

  if (tokenLocal && !sessionStorage.getItem(AUTH_TOKEN_KEY)) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, tokenLocal);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  if (usuarioLocal && !sessionStorage.getItem(AUTH_USUARIO_KEY)) {
    sessionStorage.setItem(AUTH_USUARIO_KEY, usuarioLocal);
    localStorage.removeItem(AUTH_USUARIO_KEY);
  }
}

migrarLocalParaSession();

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: lerTokenSalvo(),
    usuario: lerUsuarioSalvo(),
    carregando: false,
  }),
  getters: {
    isAutenticado: (state) => Boolean(state.token),
    isAdmin: (state) => state.usuario?.isAdmin ?? false,
    permissoes: (state) => state.usuario?.permissoes ?? [],
    empresaAtual: (state): EmpresaResumo | null => state.usuario?.empresaAtual ?? null,
  },
  actions: {
    async inicializar(): Promise<void> {
      if (!this.isAutenticado) {
        return;
      }

      try {
        await this.sincronizarUsuario();
      } catch {
        this.logout();
      }
    },

    async sincronizarUsuario(): Promise<void> {
      if (!this.token) {
        return;
      }

      const usuario = await authService.me();
      this.usuario = usuario;
      sessionStorage.setItem(AUTH_USUARIO_KEY, JSON.stringify(usuario));
    },

    async login(payload: LoginRequest): Promise<LoginResult> {
      this.carregando = true;

      try {
        const response = await authService.login(payload);

        if (response.requiresCompanySelection) {
          return {
            status: 'company_selection_required',
            companies: response.companies ?? [],
          };
        }

        const sessao = extrairSessaoAuth(response);

        if (!sessao) {
          throw new Error('Resposta de login inválida.');
        }

        this.persistirSessao(sessao.token, sessao.usuario);
        await this.sincronizarUsuario();

        return { status: 'authenticated' };
      } finally {
        this.carregando = false;
      }
    },

    async registrar(payload: RegistrarRequest): Promise<void> {
      this.carregando = true;

      try {
        const response = await authService.registrar(payload);
        this.persistirSessao(response.token, response.usuario);
        await this.sincronizarUsuario();
      } finally {
        this.carregando = false;
      }
    },

    logout(): void {
      this.token = null;
      this.usuario = null;

      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USUARIO_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USUARIO_KEY);
    },

    possuiPermissao(permissao: string): boolean {
      return this.permissoes.includes(permissao);
    },

    persistirSessao(token: string, usuario: UsuarioAutenticado): void {
      this.token = token;
      this.usuario = usuario;

      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.setItem(AUTH_USUARIO_KEY, JSON.stringify(usuario));
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USUARIO_KEY);
    },

    atualizarEmpresaResumo(empresa: EmpresaResumo): void {
      if (!this.usuario) {
        return;
      }

      this.usuario = {
        ...this.usuario,
        empresaAtual: empresa,
      };
      sessionStorage.setItem(AUTH_USUARIO_KEY, JSON.stringify(this.usuario));
    },
  },
});
