<script setup lang="ts">
import { computed } from 'vue';

import { DesignSystemBrand } from '@/constants/design-system';
import { useEmpresaStore } from '@/stores/empresa.store';

export type EmpresaMarcaVariant = 'icon' | 'drawer' | 'contexto';

const props = withDefaults(
  defineProps<{
    variant?: EmpresaMarcaVariant;
    /** @deprecated use variant="icon" */
    compact?: boolean;
    mostrarNome?: boolean;
  }>(),
  {
    variant: undefined,
    compact: false,
    mostrarNome: undefined,
  },
);

const empresaStore = useEmpresaStore();

const variantResolvida = computed<EmpresaMarcaVariant>(() => {
  if (props.variant) {
    return props.variant;
  }

  return props.compact ? 'icon' : 'drawer';
});

const exibirNome = computed(() => {
  if (props.mostrarNome !== undefined) {
    return props.mostrarNome;
  }

  return variantResolvida.value === 'drawer' || variantResolvida.value === 'contexto';
});

const logoUrl = computed(() => empresaStore.logoEmpresaAtual);
const nome = computed(() => empresaStore.nomeEmpresaAtual);

const iconeSize = computed(() => {
  switch (variantResolvida.value) {
    case 'icon':
      return '36px';
    case 'contexto':
      return '40px';
    case 'drawer':
    default:
      return '48px';
  }
});
</script>

<template>
  <div
    class="empresa-marca"
    :class="`empresa-marca--${variantResolvida}`"
  >
    <div v-if="logoUrl" class="empresa-marca__logo">
      <img :src="logoUrl" :alt="`Logo ${nome}`" />
    </div>
    <q-icon
      v-else
      :name="DesignSystemBrand.icone"
      color="primary"
      :size="iconeSize"
      class="empresa-marca__icone"
    />

    <strong v-if="exibirNome" class="empresa-marca__nome">{{ nome }}</strong>
  </div>
</template>

<style scoped lang="scss">
.empresa-marca {
  align-items: center;
  display: flex;
  justify-content: center;
  width: 100%;

  &__logo {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    justify-content: center;

    img {
      display: block;
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }
  }

  &__icone {
    flex-shrink: 0;
    opacity: 0.9;
  }

  &__nome {
    color: var(--ds-text-primary);
    font-weight: var(--ds-font-weight-semibold);
    margin: 0;
  }

  &--icon {
    .empresa-marca__logo {
      height: 72px;
      width: 72px;
    }
  }

  &--drawer {
    flex-direction: column;
    gap: var(--ds-space-2);
    text-align: center;

    .empresa-marca__logo {
      height: 96px;
      width: 96px;
    }

    .empresa-marca__nome {
      display: -webkit-box;
      font-size: var(--ds-font-size-lg, 1.125rem);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-height: var(--ds-line-height-tight, 1.25);
      overflow: hidden;
      width: 100%;
    }
  }

  &--contexto {
    flex-direction: row;
    gap: var(--ds-space-2);
    justify-content: flex-start;
    width: auto;

    .empresa-marca__logo {
      height: 40px;
      width: 40px;
    }

    .empresa-marca__nome {
      font-size: var(--ds-font-size-md, 1rem);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
