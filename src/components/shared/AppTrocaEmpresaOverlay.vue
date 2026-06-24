<script setup lang="ts">
import { storeToRefs } from 'pinia';

import { useEmpresaStore } from '@/stores/empresa.store';

const empresaStore = useEmpresaStore();
const { trocando, empresaDestinoTroca } = storeToRefs(empresaStore);
</script>

<template>
  <teleport to="body">
    <div
      v-if="trocando"
      class="troca-empresa-overlay"
      role="alertdialog"
      aria-live="assertive"
      aria-busy="true"
      :aria-label="`Indo para ${empresaDestinoTroca}`"
    >
      <p class="troca-empresa-overlay__titulo">Trocando de clínica</p>
      <p class="troca-empresa-overlay__mensagem">
        Indo para <strong>{{ empresaDestinoTroca }}</strong>
      </p>
    </div>
  </teleport>
</template>

<style scoped lang="scss">
.troca-empresa-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--ds-z-blocking-overlay);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-3);
  width: 100%;
  height: 100%;
  min-height: 100dvh;
  margin: 0;
  padding: var(--ds-space-6);
  background: var(--ds-bg-surface);
  color: var(--ds-text-primary);
  text-align: center;
  contain: strict;
  pointer-events: all;
  user-select: none;

  &__titulo {
    margin: 0;
    font-size: var(--ds-font-size-xl);
    font-weight: var(--ds-font-weight-semibold);
  }

  &__mensagem {
    margin: 0;
    max-width: 32ch;
    font-size: var(--ds-font-size-base);
    color: var(--ds-text-secondary);
    line-height: var(--ds-line-height-normal);

    strong {
      color: var(--ds-text-primary);
      font-weight: var(--ds-font-weight-semibold);
    }
  }
}
</style>
