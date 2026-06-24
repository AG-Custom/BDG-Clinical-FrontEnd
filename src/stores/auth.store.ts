import { defineStore } from 'pinia';

import { AUTH_TOKEN_KEY, AUTH_USUARIO_KEY } from '@/constants/auth';
import { authService, type LoginRequest, type RegistrarRequest } from '@/services/auth.service';
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
    permissoes: (state) => state.usuario?.permissoes ?? [],
    empresaAtual: (state): EmpresaResumo | null => state.usuario?.empresaAtual ?? null,
  },
  actions: {
    async login(payload: LoginRequest): Promise<void> {
      this.carregando = true;

      try {
        const response = await authService.login(payload);
        this.persistirSessao(response.token, response.usuario);
      } finally {
        this.carregando = false;
      }
    },
    async registrar(payload: RegistrarRequest): Promise<void> {
      this.carregando = true;

      try {
        const response = await authService.registrar(payload);
        this.persistirSessao(response.token, response.usuario);
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
  },
});
