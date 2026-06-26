import { defineStore } from 'pinia';

import {
  authService,
  extrairSessaoAuth,
  type LoginRequest,
  type LoginResult,
  type RegistrarRequest,
} from '@/services/auth.service';
import type { EmpresaResumo } from '@/types/entidades/empresa';
import type { UsuarioAutenticado } from '@/types/entidades/usuario';
import {
  lerTokenAuth,
  lerUsuarioAuth,
  limparAuthStorage,
  migrarSessionParaLocalStorage,
  salvarTokenAuth,
  salvarUsuarioAuth,
} from '@/utils/auth-storage';
import { aplicarMarcaDocumento, restaurarMarcaDocumentoPadrao } from '@/utils/whitelabel';

interface AuthState {
  token: string | null;
  usuario: UsuarioAutenticado | null;
  carregando: boolean;
}

migrarSessionParaLocalStorage();

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: lerTokenAuth(),
    usuario: lerUsuarioAuth(),
    carregando: false,
  }),
  getters: {
    isAutenticado: (state) => Boolean(state.token),
    isAdmin: (state) => state.usuario?.isAdmin ?? false,
    isAplicador: (state) => state.usuario?.flagAplicador ?? false,
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
      salvarUsuarioAuth(usuario);
      aplicarMarcaDocumento({
        nome: usuario.empresaAtual?.nome,
        logo: usuario.empresaAtual?.logo,
      });
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
      limparAuthStorage();
      restaurarMarcaDocumentoPadrao();
    },

    possuiPermissao(permissao: string): boolean {
      return this.permissoes.includes(permissao);
    },

    persistirSessao(token: string, usuario: UsuarioAutenticado): void {
      this.token = token;
      this.usuario = usuario;
      salvarTokenAuth(token);
      salvarUsuarioAuth(usuario);
      aplicarMarcaDocumento({
        nome: usuario.empresaAtual?.nome,
        logo: usuario.empresaAtual?.logo,
      });
    },

    atualizarEmpresaResumo(empresa: EmpresaResumo): void {
      if (!this.usuario) {
        return;
      }

      this.usuario = {
        ...this.usuario,
        empresaAtual: empresa,
      };
      salvarUsuarioAuth(this.usuario);
    },
  },
});
