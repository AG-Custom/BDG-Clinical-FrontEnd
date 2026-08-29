<script setup lang="ts">
import { computed } from 'vue';

import type { ClinicalEvent } from '@/types/entidades/prontuario';
import { agruparEventosClinicos } from '@/utils/historico-clinico';

const props = withDefaults(
  defineProps<{
    eventos: ClinicalEvent[];
    vazioTitulo?: string;
    vazioTexto?: string;
  }>(),
  {
    vazioTitulo: 'Nenhuma alteração',
    vazioTexto: 'Os registros clínicos aparecem aqui conforme forem criados.',
  },
);

const grupos = computed(() => agruparEventosClinicos(props.eventos));
</script>

<template>
  <app-empty-state
    v-if="grupos.length === 0"
    icon="history"
    :titulo="vazioTitulo"
    :texto="vazioTexto"
  />
  <div v-else class="historico-clinico">
    <section
      v-for="grupo in grupos"
      :key="grupo.data"
      class="historico-clinico__grupo"
    >
      <div class="historico-clinico__dia">{{ grupo.data }}</div>
      <div class="historico-clinico__lista">
        <article
          v-for="evento in grupo.itens"
          :key="evento.id"
          class="historico-clinico__item"
        >
          <div class="historico-clinico__icone">
            <q-icon :name="evento.icone" size="20px" />
          </div>
          <div class="historico-clinico__corpo">
            <span class="historico-clinico__categoria">{{ evento.categoria }}</span>
            <strong>{{ evento.titulo }}</strong>
            <p v-if="evento.resumo">{{ evento.resumo }}</p>
            <span class="historico-clinico__meta">
              {{ evento.hora }} · {{ evento.profissional }}
            </span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.historico-clinico {
  display: grid;
  gap: var(--ds-space-5);
}

.historico-clinico__dia {
  margin-bottom: var(--ds-space-3);
  color: var(--ds-text-primary);
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-semibold);
}

.historico-clinico__lista {
  display: grid;
  gap: var(--ds-space-2);
  padding-left: var(--ds-space-3);
  border-left: 2px solid var(--ds-border-default);
}

.historico-clinico__item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: var(--ds-space-3);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-page);
}

.historico-clinico__icone {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-subtle);
  color: var(--ds-brand-primary);
}

.historico-clinico__corpo {
  display: grid;
  gap: var(--ds-space-1);
  min-width: 0;

  strong {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-sm);
    font-weight: var(--ds-font-weight-semibold);
  }

  p {
    margin: 0;
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
  }
}

.historico-clinico__categoria {
  justify-self: start;
  padding: 0 var(--ds-space-2);
  border-radius: var(--ds-radius-full);
  background: var(--ds-bg-subtle);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-xs);
  font-weight: var(--ds-font-weight-medium);
  letter-spacing: var(--ds-letter-spacing-wide);
}

.historico-clinico__meta {
  color: var(--ds-text-muted);
  font-size: var(--ds-font-size-xs);
}
</style>
