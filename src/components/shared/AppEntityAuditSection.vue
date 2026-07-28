<script setup lang="ts">
import { computed } from 'vue';

import { useAuditoriaUsuariosEntidade } from '@/composables/useAuditoriaUsuariosEntidade';
import { formatarDataHoraBrasil } from '@/utils/data-hora';

const props = withDefaults(
  defineProps<{
    ativo: boolean;
    registroId?: string | null;
    entidadeAuditoria?: string;
    criadoEm?: string | null;
    atualizadoEm?: string | null;
    idUsuarioCriacaoFallback?: string | null;
    mostrarTituloSecao?: boolean;
  }>(),
  {
    registroId: null,
    entidadeAuditoria: undefined,
    criadoEm: null,
    atualizadoEm: null,
    idUsuarioCriacaoFallback: null,
    mostrarTituloSecao: false,
  },
);

const aberto = computed(() => props.ativo);
const registroIdRef = computed(() => props.registroId ?? null);
const entidadeRef = computed(() => props.entidadeAuditoria);
const fallbackRef = computed(() => props.idUsuarioCriacaoFallback ?? null);
const chaveConteudo = computed(
  () => `${props.criadoEm ?? ''}|${props.atualizadoEm ?? ''}`,
);

const {
  idUsuarioCriacao,
  idUsuarioAtualizacao,
  carregandoUsuarios,
  rotuloUsuarioLinha,
} = useAuditoriaUsuariosEntidade(
  aberto,
  registroIdRef,
  entidadeRef,
  fallbackRef,
  chaveConteudo,
);

const linhas = computed(() =>
  [
    {
      label: 'Criado em',
      valor: props.criadoEm,
      classe: 'app-entity-audit__row--created',
      icon: 'schedule',
      usuarioId: idUsuarioCriacao.value,
    },
    {
      label: 'Atualizado em',
      valor: props.atualizadoEm,
      classe: 'app-entity-audit__row--updated',
      icon: 'update',
      usuarioId: idUsuarioAtualizacao.value,
    },
  ].filter((item) => Boolean(item.valor)),
);

function formatarDataHora(valor: unknown): string {
  if (!valor) {
    return '';
  }

  return formatarDataHoraBrasil(String(valor));
}
</script>

<template>
  <div class="app-entity-audit">
    <div v-if="mostrarTituloSecao" class="app-entity-audit__section-title">Auditoria</div>

    <div v-if="linhas.length > 0" class="app-entity-audit__linhas">
      <div
        v-for="item in linhas"
        :key="item.label"
        class="app-entity-audit__row"
        :class="item.classe"
      >
        <strong>{{ item.label }}</strong>
        <span>
          <q-icon :name="item.icon" />
          {{ formatarDataHora(item.valor) }}
          <span v-if="entidadeAuditoria" class="app-entity-audit__usuario">
            {{ rotuloUsuarioLinha(item.usuarioId, entidadeAuditoria) }}
          </span>
        </span>
      </div>
    </div>

    <div v-else class="app-entity-audit__vazio">
      Nenhum log de auditoria disponível para este registro.
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-entity-audit__section-title {
  margin-bottom: var(--ds-space-3);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-semibold);
  letter-spacing: var(--ds-letter-spacing-wide);
  text-transform: uppercase;
}

.app-entity-audit__linhas {
  display: grid;
  gap: var(--ds-space-2);
}

.app-entity-audit__vazio {
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm);
}

.app-entity-audit__row {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: var(--ds-space-3);
  align-items: center;
  padding: var(--ds-space-2) var(--ds-space-3);
  border-radius: var(--ds-radius-md);
}

.app-entity-audit__row strong {
  font-size: var(--ds-font-size-xs);
  font-weight: var(--ds-font-weight-bold);
  text-transform: uppercase;
}

.app-entity-audit__row > span {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2);
  color: var(--ds-text-primary);
  font-size: var(--ds-font-size-sm);
}

.app-entity-audit__usuario {
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm);
}

.app-entity-audit__row--created {
  background: var(--ds-audit-created-bg);

  strong,
  span .q-icon {
    color: var(--ds-audit-created-fg);
  }
}

.app-entity-audit__row--updated {
  background: var(--ds-audit-updated-bg);

  strong,
  span .q-icon {
    color: var(--ds-audit-updated-fg);
  }
}

@media (max-width: 600px) {
  .app-entity-audit__row {
    grid-template-columns: 1fr;
  }
}
</style>
