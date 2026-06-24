<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { useEmpresaStore } from '@/stores/empresa.store';

const router = useRouter();
const empresaStore = useEmpresaStore();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const nomeEmpresa = computed(() => empresaStore.nomeEmpresaAtual);
const logoAtual = computed(() => empresaStore.logoEmpresaAtual);

onMounted(async () => {
  await Promise.all([
    empresaStore.carregarEmpresaAtual(),
    empresaStore.carregarEmpresas(),
  ]);
});

async function aoAbrirMenu(): Promise<void> {
  await empresaStore.carregarEmpresas();
}

async function trocarEmpresa(empresaId: string): Promise<void> {
  try {
    await empresaStore.trocarEmpresa(empresaId);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

function gerenciarEmpresas(): void {
  router.push({ name: 'empresas' });
}
</script>

<template>
  <q-btn flat no-caps class="empresa-switcher" :disable="empresaStore.trocando">
    <div class="empresa-switcher__atual row items-center no-wrap">
      <q-avatar v-if="logoAtual" size="28px" class="q-mr-sm">
        <img :src="logoAtual" :alt="`Logo ${nomeEmpresa}`" />
      </q-avatar>
      <q-icon v-else name="business" size="20px" class="q-mr-sm" />
      <span class="empresa-switcher__nome text-weight-medium">{{ nomeEmpresa }}</span>
      <q-icon name="arrow_drop_down" size="20px" class="q-ml-xs" />
    </div>

    <q-menu class="empresa-switcher__menu" anchor="bottom right" self="top right" @before-show="aoAbrirMenu">
      <q-list class="empresa-switcher__list">
        <q-item v-if="empresaStore.carregandoLista">
          <q-item-section>
            <q-item-label caption>Carregando clínicas...</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-spinner size="20px" color="primary" />
          </q-item-section>
        </q-item>

        <template v-else>
          <q-item-label header class="text-weight-medium">Trocar clínica</q-item-label>

          <template v-if="empresaStore.empresasDisponiveis.length > 0">
            <q-item
              v-for="empresa in empresaStore.empresasDisponiveis"
              :key="empresa.empresaId"
              clickable
              v-close-popup
              :disable="empresa.isCurrent || !empresa.ativo || empresaStore.trocando"
              @click="trocarEmpresa(empresa.empresaId)"
            >
              <q-item-section avatar>
                <q-avatar v-if="empresa.logo" size="36px">
                  <img :src="empresa.logo" :alt="`Logo ${empresa.nome}`" />
                </q-avatar>
                <q-avatar v-else size="36px" color="primary" text-color="white" icon="business" />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ empresa.nome }}</q-item-label>
                <q-item-label v-if="!empresa.ativo" caption class="text-negative">
                  Inativa
                </q-item-label>
              </q-item-section>

              <q-item-section v-if="empresa.isCurrent" side>
                <q-icon name="check" color="primary" />
              </q-item-section>
            </q-item>
          </template>

          <q-item v-else>
            <q-item-section>
              <q-item-label>{{ nomeEmpresa }}</q-item-label>
              <q-item-label caption>Clínica única</q-item-label>
            </q-item-section>
          </q-item>

          <q-separator />

          <q-item clickable v-close-popup @click="gerenciarEmpresas">
            <q-item-section avatar>
              <q-icon name="business" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-primary text-weight-medium">Gerenciar empresas</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<style scoped lang="scss">
.empresa-switcher {
  color: var(--ds-text-primary);
  max-width: min(100%, 320px);
  padding: var(--ds-space-1) var(--ds-space-2);

  &__atual {
    max-width: 100%;
  }

  &__nome {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.empresa-switcher__list {
  min-width: 280px;
}
</style>
