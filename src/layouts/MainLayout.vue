<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useAuth } from '@/composables/useAuth';
import { DesignSystemLayout } from '@/constants/design-system';
import { useEmpresaStore } from '@/stores/empresa.store';

const ROTAS_SECAO_FUNCIONARIOS = new Set([
  'funcionarios',
  'funcionarios-novo',
  'funcionarios-editar',
  'cargos',
  'cargos-novo',
  'cargos-editar',
]);

const drawer = ref(true);
const funcionariosMenuAberto = ref(false);
const route = useRoute();
const auth = useAuth();
const { usuario, logout } = auth;
const empresaStore = useEmpresaStore();

const isSecaoFuncionarios = computed(() =>
  ROTAS_SECAO_FUNCIONARIOS.has(route.name as string),
);

watch(
  () => route.name,
  () => {
    if (isSecaoFuncionarios.value) {
      funcionariosMenuAberto.value = true;
    }
  },
  { immediate: true },
);

onMounted(() => {
  void empresaStore.carregarEmpresaAtual();
  void empresaStore.carregarEmpresas();
});
</script>

<template>
  <q-layout view="hHh Lpr lFf" class="shell-premium">
    <q-header class="text-dark">
      <q-toolbar :style="{ minHeight: DesignSystemLayout.headerHeight }">
        <q-btn
          flat
          round
          dense
          icon="menu"
          aria-label="Abrir menu"
          @click="drawer = !drawer"
        />

        <q-space />

        <app-empresa-switcher />

        <q-btn flat round icon="account_circle" aria-label="Menu da conta" class="q-ml-sm">
          <q-menu>
            <q-list style="min-width: 240px">
              <q-item>
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ usuario?.nome || 'Usuário' }}
                  </q-item-label>
                  <q-item-label caption>{{ usuario?.email }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="logout">
                <q-item-section avatar>
                  <q-icon name="logout" />
                </q-item-section>
                <q-item-section>Sair</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawer"
      show-if-above
      :width="DesignSystemLayout.drawerWidth"
    >
      <div class="drawer-brand drawer-brand--logo">
        <app-empresa-marca />
      </div>

      <q-list padding>
        <q-item clickable v-ripple to="/" exact>
          <q-item-section avatar>
            <q-icon name="space_dashboard" />
          </q-item-section>
          <q-item-section>Início</q-item-section>
        </q-item>
        <q-item clickable v-ripple :to="{ name: 'unidades' }">
          <q-item-section avatar>
            <q-icon name="apartment" />
          </q-item-section>
          <q-item-section>Unidades</q-item-section>
        </q-item>
        <q-expansion-item
          v-model="funcionariosMenuAberto"
          icon="groups"
          label="Funcionários"
          expand-separator
          :header-class="isSecaoFuncionarios ? 'drawer-menu__section--active' : ''"
        >
          <q-item clickable v-ripple :to="{ name: 'funcionarios' }" :inset-level="1">
            <q-item-section>Colaboradores</q-item-section>
          </q-item>
          <q-item clickable v-ripple :to="{ name: 'cargos' }" :inset-level="1">
            <q-item-section>Cargos</q-item-section>
          </q-item>
        </q-expansion-item>
        <q-item clickable v-ripple :to="{ name: 'empresas' }">
          <q-item-section avatar>
            <q-icon name="business" />
          </q-item-section>
          <q-item-section>Empresas</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <app-troca-empresa-overlay />
  </q-layout>
</template>

<style scoped lang="scss">
.drawer-menu__section--active {
  color: var(--ds-color-primary-700);
  font-weight: var(--ds-font-weight-semibold);
}
</style>
