<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  pontos: { rotulo: string; valor: number | null }[];
  titulo: string;
}>();

const serie = computed(() =>
  props.pontos
    .map((ponto, index) => ({ ...ponto, index }))
    .filter((ponto): ponto is { rotulo: string; valor: number; index: number } => ponto.valor !== null),
);

const path = computed(() => {
  if (serie.value.length < 2) {
    return '';
  }

  const valores = serie.value.map((ponto) => ponto.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const amplitude = max - min || 1;

  return serie.value
    .map((ponto, index) => {
      const x = (index / (serie.value.length - 1)) * 100;
      const y = 36 - ((ponto.valor - min) / amplitude) * 28;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
});

const ultimo = computed(() => serie.value.at(-1)?.valor ?? null);
</script>

<template>
  <div class="evolution-chart">
    <div class="evolution-chart__header">
      <span>{{ titulo }}</span>
      <strong v-if="ultimo !== null">{{ ultimo }}</strong>
    </div>
    <svg
      v-if="path"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      class="evolution-chart__svg"
      aria-hidden="true"
    >
      <path :d="path" fill="none" stroke="currentColor" stroke-width="1.6" />
    </svg>
    <div v-else class="evolution-chart__vazio">Sem série ainda</div>
  </div>
</template>

<style scoped lang="scss">
.evolution-chart {
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  padding: var(--ds-space-3);
  background: var(--ds-bg-surface);
  min-height: 96px;
}

.evolution-chart__header {
  display: flex;
  justify-content: space-between;
  color: var(--ds-text-secondary);
  font-size: 0.8125rem;
  margin-bottom: var(--ds-space-2);
}

.evolution-chart__svg {
  width: 100%;
  height: 48px;
  color: var(--ds-brand-primary);
}

.evolution-chart__vazio {
  color: var(--ds-text-secondary);
  font-size: 0.8125rem;
}
</style>
