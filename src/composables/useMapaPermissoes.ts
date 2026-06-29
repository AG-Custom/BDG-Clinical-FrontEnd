import { onMounted, ref, shallowRef } from 'vue';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { permissaoService } from '@/services/permissao.service';
import { useAuthStore } from '@/stores/auth.store';
import type { NoMapaPermissao } from '@/types/entidades/permissao';

let carregamentoEmAndamento: Promise<NoMapaPermissao[]> | null = null;

export function useMapaPermissoes() {
  const authStore = useAuthStore();
  const notificacao = useNotificacao();
  const { obterMensagem } = useTratarErroFormulario();

  const mapa = shallowRef<NoMapaPermissao[]>([]);
  const carregando = ref(false);
  const carregado = ref(false);

  async function carregarMapa(forcar = false): Promise<void> {
    if (carregado.value && !forcar) {
      return;
    }

    if (carregamentoEmAndamento && !forcar) {
      mapa.value = await carregamentoEmAndamento;
      carregado.value = true;
      return;
    }

    carregando.value = true;

    try {
      carregamentoEmAndamento = permissaoService.obterMapa(authStore.empresaAtual?.id);
      mapa.value = await carregamentoEmAndamento;
      carregado.value = true;
    } catch (error) {
      notificacao.erro(obterMensagem(error));
    } finally {
      carregando.value = false;
      carregamentoEmAndamento = null;
    }
  }

  function invalidarCache(): void {
    permissaoService.invalidarCacheMapa();
    carregado.value = false;
    mapa.value = [];
  }

  onMounted(() => {
    void carregarMapa();
  });

  return {
    mapa,
    carregando,
    carregado,
    carregarMapa,
    invalidarCache,
  };
}

export function coletarChavesFolha(nos: NoMapaPermissao[]): NoMapaPermissao[] {
  const folhas: NoMapaPermissao[] = [];

  function percorrer(no: NoMapaPermissao): void {
    if (no.children.length === 0) {
      folhas.push(no);
      return;
    }

    no.children.forEach(percorrer);
  }

  nos.forEach(percorrer);

  return folhas;
}

export function agruparPorCategoria(nos: NoMapaPermissao[]): Map<string, NoMapaPermissao[]> {
  const grupos = new Map<string, NoMapaPermissao[]>();

  for (const no of nos) {
    const lista = grupos.get(no.category) ?? [];
    lista.push(no);
    grupos.set(no.category, lista);
  }

  return grupos;
}
