<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { useEmpresaStore } from '@/stores/empresa.store';

const empresaStore = useEmpresaStore();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const nomeEmpresa = computed(() => empresaStore.nomeEmpresaAtual);

onMounted(() => {
  void empresaStore.carregarEmpresas();
});

async function aoAbrirMenu(): Promise<void> {
  await empresaStore.carregarEmpresas();
}

async function selecionarEmpresa(empresaId: string): Promise<void> {
  try {
    await empresaStore.selecionarEmpresa(empresaId);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}
</script>

<template>
  <q-btn-dropdown
    flat
    no-caps
    class="empresa-switcher"
    :label="nomeEmpresa"
    icon="business"
    :loading="empresaStore.trocando"
    @before-show="aoAbrirMenu"
  >
    <q-list class="empresa-switcher__list">
      <q-item v-if="empresaStore.carregandoLista">
        <q-item-section>
          <q-item-label caption>Carregando empresas...</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-spinner size="20px" color="primary" />
        </q-item-section>
      </q-item>

      <template v-else-if="empresaStore.empresasDisponiveis.length > 0">
        <q-item
          v-for="empresa in empresaStore.empresasDisponiveis"
          :key="empresa.id"
          clickable
          v-close-popup
          :disable="empresa.id === empresaStore.empresaAtual?.id || empresaStore.trocando"
          @click="selecionarEmpresa(empresa.id)"
        >
          <q-item-section>
            <q-item-label>{{ empresa.nome }}</q-item-label>
          </q-item-section>
          <q-item-section v-if="empresa.id === empresaStore.empresaAtual?.id" side>
            <q-icon name="check" color="primary" />
          </q-item-section>
        </q-item>
      </template>

      <q-item v-else>
        <q-item-section>
          <q-item-label>{{ nomeEmpresa }}</q-item-label>
          <q-item-label caption>Empresa única</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<style scoped lang="scss">
.empresa-switcher {
  color: var(--ds-text-primary);
  max-width: 240px;

  :deep(.q-btn__content) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.empresa-switcher__list {
  min-width: 240px;
}
</style>
