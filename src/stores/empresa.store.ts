import { defineStore } from 'pinia';

import { authService, extrairSessaoAuth } from '@/services/auth.service';
import { empresaService } from '@/services/empresa.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Empresa, EmpresaContexto, CriarEmpresaRequest } from '@/types/entidades/empresa';
import { contextoParaResumo } from '@/types/entidades/empresa';
import { aplicarCorPrincipal } from '@/utils/whitelabel';

interface EmpresaState {
  empresasDisponiveis: EmpresaContexto[];
  empresaDetalhes: Empresa | null;
  carregandoLista: boolean;
  carregandoDetalhes: boolean;
  trocando: boolean;
  empresaDestinoTroca: string | null;
  criando: boolean;
}

export const useEmpresaStore = defineStore('empresa', {
  state: (): EmpresaState => ({
    empresasDisponiveis: [],
    empresaDetalhes: null,
    carregandoLista: false,
    carregandoDetalhes: false,
    trocando: false,
    empresaDestinoTroca: null,
    criando: false,
  }),
  getters: {
    empresaAtualContexto(): EmpresaContexto | null {
      const atual = this.empresasDisponiveis.find((empresa) => empresa.isCurrent);

      if (atual) {
        return atual;
      }

      const authStore = useAuthStore();
      const empresaAtualId = authStore.empresaAtual?.id;

      if (!empresaAtualId) {
        return null;
      }

      return (
        this.empresasDisponiveis.find((empresa) => empresa.empresaId === empresaAtualId) ?? null
      );
    },

    nomeEmpresaAtual(): string {
      return (
        this.empresaDetalhes?.nome ??
        this.empresaAtualContexto?.nome ??
        useAuthStore().empresaAtual?.nome ??
        'Minha clínica'
      );
    },

    logoEmpresaAtual(): string | null {
      return (
        this.empresaDetalhes?.logo ??
        this.empresaAtualContexto?.logo ??
        useAuthStore().empresaAtual?.logo ??
        null
      );
    },

    possuiMultiplasEmpresas(): boolean {
      return this.empresasDisponiveis.length > 1;
    },
  },
  actions: {
    async carregarEmpresas(): Promise<void> {
      const authStore = useAuthStore();

      if (!authStore.isAutenticado) {
        return;
      }

      this.carregandoLista = true;

      try {
        this.empresasDisponiveis = await empresaService.listar();
      } catch {
        const authStoreAtual = useAuthStore().empresaAtual;

        this.empresasDisponiveis = authStoreAtual
          ? [
              {
                empresaId: authStoreAtual.id,
                usuarioId: authStore.usuario?.id ?? '',
                nome: authStoreAtual.nome,
                cnpj: null,
                telefone: null,
                logo: authStoreAtual.logo ?? null,
                corPrincipal: null,
                ativo: true,
                isCurrent: true,
              },
            ]
          : [];
      } finally {
        this.carregandoLista = false;
      }
    },

    async carregarEmpresaAtual(): Promise<Empresa | null> {
      const authStore = useAuthStore();

      if (!authStore.isAutenticado) {
        return null;
      }

      this.carregandoDetalhes = true;

      try {
        const empresa = await empresaService.obterAtual();
        this.definirEmpresaDetalhes(empresa);
        aplicarCorPrincipal(empresa.corPrincipal);

        return empresa;
      } finally {
        this.carregandoDetalhes = false;
      }
    },

    definirEmpresaDetalhes(empresa: Empresa): void {
      this.empresaDetalhes = empresa;

      const authStore = useAuthStore();
      authStore.atualizarEmpresaResumo({
        id: empresa.id,
        nome: empresa.nome,
        logo: empresa.logo,
      });
    },

    async trocarEmpresa(empresaId: string): Promise<void> {
      const atual = this.empresasDisponiveis.find((empresa) => empresa.isCurrent);

      if (atual?.empresaId === empresaId) {
        return;
      }

      const empresaSelecionada = this.empresasDisponiveis.find(
        (empresa) => empresa.empresaId === empresaId,
      );

      this.empresaDestinoTroca = empresaSelecionada?.nome ?? 'a clínica selecionada';
      this.trocando = true;

      try {
        const authStore = useAuthStore();
        const response = await authService.trocarEmpresa(empresaId);
        const sessao = extrairSessaoAuth(response);

        if (!sessao) {
          throw new Error('Não foi possível trocar de clínica.');
        }

        authStore.persistirSessao(sessao.token, {
          ...sessao.usuario,
          empresaAtual: empresaSelecionada
            ? contextoParaResumo(empresaSelecionada)
            : sessao.usuario.empresaAtual,
        });

        if (empresaSelecionada?.corPrincipal) {
          aplicarCorPrincipal(empresaSelecionada.corPrincipal);
        }

        window.location.reload();
      } catch (error) {
        this.trocando = false;
        this.empresaDestinoTroca = null;
        throw error;
      }
    },

    async criarEmpresa(payload: CriarEmpresaRequest, arquivoLogo?: File | null): Promise<void> {
      this.criando = true;

      try {
        const authStore = useAuthStore();
        const response = await empresaService.criar(payload);
        const sessao = extrairSessaoAuth(response);

        if (!sessao) {
          throw new Error('Não foi possível criar a clínica.');
        }

        authStore.persistirSessao(sessao.token, sessao.usuario);
        await authStore.sincronizarUsuario();

        if (arquivoLogo) {
          await empresaService.enviarLogo(arquivoLogo);
        }

        window.location.reload();
      } finally {
        this.criando = false;
      }
    },
  },
});
