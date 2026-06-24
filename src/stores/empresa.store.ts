import { defineStore } from 'pinia';

import { empresaService } from '@/services/empresa.service';
import { useAuthStore } from '@/stores/auth.store';
import type { EmpresaResumo } from '@/types/entidades/empresa';

interface EmpresaState {
  empresasDisponiveis: EmpresaResumo[];
  carregandoLista: boolean;
  trocando: boolean;
}

export const useEmpresaStore = defineStore('empresa', {
  state: (): EmpresaState => ({
    empresasDisponiveis: [],
    carregandoLista: false,
    trocando: false,
  }),
  getters: {
    empresaAtual(): EmpresaResumo | null {
      const authStore = useAuthStore();

      return authStore.empresaAtual;
    },
    nomeEmpresaAtual(): string {
      return this.empresaAtual?.nome ?? 'Minha clínica';
    },
    possuiMultiplasEmpresas(): boolean {
      return this.empresasDisponiveis.length > 1;
    },
  },
  actions: {
    async carregarEmpresas(): Promise<void> {
      this.carregandoLista = true;

      try {
        this.empresasDisponiveis = await empresaService.listar();
      } catch {
        const atual = this.empresaAtual;

        this.empresasDisponiveis = atual ? [atual] : [];
      } finally {
        this.carregandoLista = false;
      }
    },

    async selecionarEmpresa(empresaId: string): Promise<void> {
      if (this.empresaAtual?.id === empresaId) {
        return;
      }

      this.trocando = true;

      try {
        const authStore = useAuthStore();
        const response = await empresaService.selecionar(empresaId);

        authStore.persistirSessao(response.token, {
          ...response.usuario,
          empresaAtual: response.empresa,
        });

        window.location.reload();
      } finally {
        this.trocando = false;
      }
    },
  },
});
