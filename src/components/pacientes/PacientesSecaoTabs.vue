<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';

const route = useRoute();
const router = useRouter();
const podeVerCompras = usePermissao(permissoes.comprasPaciente.visualizar);

const abaAtiva = computed(() => {
  if (
    route.name === 'compras' ||
    route.name === 'compras-nova' ||
    route.name === 'compras-detalhe' ||
    route.name === 'pacientes-compras' ||
    route.name === 'pacientes-compras-nova'
  ) {
    return 'compras';
  }

  return 'pacientes';
});

function irParaPacientes(): void {
  if (route.name === 'pacientes') {
    return;
  }

  void router.push({ name: 'pacientes' });
}

function irParaCompras(): void {
  if (route.name === 'compras') {
    return;
  }

  void router.push({ name: 'compras' });
}
</script>

<template>
  <div class="pacientes-secao-tabs">
    <q-tabs
      :model-value="abaAtiva"
      dense
      no-caps
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="pacientes-secao-tabs__tabs"
    >
      <q-tab
        name="pacientes"
        label="Pacientes"
        icon="people"
        @click="irParaPacientes"
      />
      <q-tab
        v-if="podeVerCompras"
        name="compras"
        label="Compras Paciente"
        icon="shopping_bag"
        @click="irParaCompras"
      />
    </q-tabs>
  </div>
</template>

<style scoped lang="scss">
.pacientes-secao-tabs {
  margin-bottom: var(--ds-space-3);
  border-bottom: 1px solid var(--ds-border-default);
  background: var(--ds-bg-surface);
}

.pacientes-secao-tabs__tabs {
  min-height: 44px;
}

.pacientes-secao-tabs__tabs :deep(.q-tab) {
  padding: 0 var(--ds-space-4);
  min-height: 44px;
}

.pacientes-secao-tabs__tabs :deep(.q-tab__label) {
  font-weight: var(--ds-font-weight-medium);
}
</style>
