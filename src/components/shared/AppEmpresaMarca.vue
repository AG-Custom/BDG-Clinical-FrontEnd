<script setup lang="ts">
import { computed } from 'vue';

import { DesignSystemBrand } from '@/constants/design-system';
import { useEmpresaStore } from '@/stores/empresa.store';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);

const empresaStore = useEmpresaStore();

const logoUrl = computed(() => empresaStore.logoEmpresaAtual);
const nome = computed(() => empresaStore.nomeEmpresaAtual);
const iconeSize = computed(() => (props.compact ? '36px' : '48px'));
</script>

<template>
  <div class="empresa-marca" :class="{ 'empresa-marca--compact': compact }">
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
  </div>
</template>

<style scoped lang="scss">
.empresa-marca {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;

  &__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 140px;
    height: 140px;

    img {
      display: block;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  &__icone {
    opacity: 0.9;
  }

  &--compact {
    .empresa-marca__logo {
      width: 72px;
      height: 72px;
    }
  }
}
</style>
