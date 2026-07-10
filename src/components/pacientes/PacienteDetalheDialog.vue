<script setup lang="ts">
import { computed } from 'vue';

import type { Paciente } from '@/types/entidades/paciente';
import {
  formatarCep,
  formatarCpf,
  formatarDataNascimento,
  formatarNomesUnidadesPaciente,
  formatarTelefonePaciente,
  possuiEnderecoPaciente,
  textoOuTraco,
} from '@/types/entidades/paciente';
import { formatarDataHoraBrasil } from '@/utils/data-hora';

const props = defineProps<{
  modelValue: boolean;
  paciente: Paciente | null;
  nomesUnidadesPorId?: ReadonlyMap<string, string>;
}>();

const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
}>();

const aberto = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const paciente = computed(() => props.paciente);

const unidadesTexto = computed(() => {
  if (!paciente.value) {
    return '—';
  }

  return formatarNomesUnidadesPaciente(paciente.value, props.nomesUnidadesPorId);
});

const temEndereco = computed(() => possuiEnderecoPaciente(paciente.value?.endereco));

function fechar(): void {
  emit('update:modelValue', false);
}

function formatarAuditoria(valor: string | null | undefined): string {
  if (!valor) {
    return '—';
  }

  return formatarDataHoraBrasil(valor);
}
</script>

<template>
  <q-dialog
    v-model="aberto"
    transition-show="none"
    transition-hide="none"
  >
    <q-card v-if="paciente" class="paciente-detalhe">
      <q-card-section class="paciente-detalhe__header">
        <div class="paciente-detalhe__titulo-wrap">
          <div class="paciente-detalhe__titulo">{{ paciente.nome }}</div>
          <q-badge
            :color="paciente.ativo ? 'positive' : 'grey'"
            :label="paciente.ativo ? 'Ativo' : 'Inativo'"
          />
        </div>
        <q-btn flat round dense icon="close" aria-label="Fechar" @click="fechar" />
      </q-card-section>

      <q-card-section class="paciente-detalhe__body">
        <section class="paciente-detalhe__secao">
          <div class="paciente-detalhe__secao-titulo">Dados pessoais</div>
          <div class="paciente-detalhe__grid">
            <div class="paciente-detalhe__campo">
              <span>CPF</span>
              <strong>{{ formatarCpf(paciente.cpf) }}</strong>
            </div>
            <div class="paciente-detalhe__campo">
              <span>Data de nascimento</span>
              <strong>{{ formatarDataNascimento(paciente.dataNascimento) }}</strong>
            </div>
            <div class="paciente-detalhe__campo paciente-detalhe__campo--full">
              <span>Unidades</span>
              <strong>{{ unidadesTexto }}</strong>
            </div>
          </div>
        </section>

        <section class="paciente-detalhe__secao">
          <div class="paciente-detalhe__secao-titulo">Contato</div>
          <div class="paciente-detalhe__grid">
            <div class="paciente-detalhe__campo">
              <span>Telefone</span>
              <strong>{{ formatarTelefonePaciente(paciente.telefone) }}</strong>
            </div>
            <div class="paciente-detalhe__campo">
              <span>E-mail</span>
              <strong>{{ textoOuTraco(paciente.email) }}</strong>
            </div>
          </div>
        </section>

        <section class="paciente-detalhe__secao">
          <div class="paciente-detalhe__secao-titulo">Endereço</div>
          <div v-if="temEndereco" class="paciente-detalhe__grid">
            <div class="paciente-detalhe__campo">
              <span>CEP</span>
              <strong>{{ formatarCep(paciente.endereco?.cep ?? null) }}</strong>
            </div>
            <div class="paciente-detalhe__campo">
              <span>Logradouro</span>
              <strong>{{ textoOuTraco(paciente.endereco?.logradouro) }}</strong>
            </div>
            <div class="paciente-detalhe__campo">
              <span>Número</span>
              <strong>{{ textoOuTraco(paciente.endereco?.numero) }}</strong>
            </div>
            <div class="paciente-detalhe__campo">
              <span>Complemento</span>
              <strong>{{ textoOuTraco(paciente.endereco?.complemento) }}</strong>
            </div>
            <div class="paciente-detalhe__campo">
              <span>Bairro</span>
              <strong>{{ textoOuTraco(paciente.endereco?.bairro) }}</strong>
            </div>
            <div class="paciente-detalhe__campo">
              <span>Cidade</span>
              <strong>{{ textoOuTraco(paciente.endereco?.cidade) }}</strong>
            </div>
            <div class="paciente-detalhe__campo">
              <span>UF</span>
              <strong>{{ textoOuTraco(paciente.endereco?.uf) }}</strong>
            </div>
          </div>
          <p v-else class="paciente-detalhe__vazio">Endereço não informado.</p>
        </section>

        <section class="paciente-detalhe__secao">
          <div class="paciente-detalhe__secao-titulo">Observação</div>
          <p class="paciente-detalhe__observacao">
            {{ textoOuTraco(paciente.observacao) }}
          </p>
        </section>

        <section class="paciente-detalhe__secao">
          <div class="paciente-detalhe__secao-titulo">Auditoria</div>
          <div class="paciente-detalhe__auditoria">
            <div class="paciente-detalhe__auditoria-linha paciente-detalhe__auditoria-linha--criado">
              <strong>Criado em</strong>
              <span>
                <q-icon name="schedule" />
                {{ formatarAuditoria(paciente.criadoEm) }}
              </span>
            </div>
            <div
              v-if="paciente.atualizadoEm"
              class="paciente-detalhe__auditoria-linha paciente-detalhe__auditoria-linha--atualizado"
            >
              <strong>Atualizado em</strong>
              <span>
                <q-icon name="update" />
                {{ formatarAuditoria(paciente.atualizadoEm) }}
              </span>
            </div>
          </div>
        </section>
      </q-card-section>

      <q-card-actions align="right" class="paciente-detalhe__acoes">
        <q-btn flat color="primary" label="Fechar" no-caps @click="fechar" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.paciente-detalhe {
  width: min(640px, calc(100vw - 32px));
  max-height: 90vh;
  overflow-y: auto;
  contain: layout style;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--ds-space-3);
    padding: var(--ds-space-4) var(--ds-space-5);
    border-bottom: 1px solid var(--ds-border-default);
    background: var(--ds-bg-surface);
  }

  &__titulo-wrap {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ds-space-2);
    min-width: 0;
  }

  &__titulo {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-lg);
    font-weight: var(--ds-font-weight-semibold);
    line-height: var(--ds-line-height-normal);
    overflow-wrap: anywhere;
  }

  &__body {
    display: grid;
    gap: var(--ds-space-3);
    padding: var(--ds-space-4) var(--ds-space-5);
    background: var(--ds-bg-page);
  }

  &__secao {
    padding: var(--ds-space-4);
    border: 1px solid var(--ds-border-default);
    border-radius: var(--ds-radius-md);
    background: var(--ds-bg-surface);
  }

  &__secao-titulo {
    margin-bottom: var(--ds-space-3);
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
    font-weight: var(--ds-font-weight-semibold);
    letter-spacing: var(--ds-letter-spacing-wide);
    text-transform: uppercase;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--ds-space-3) var(--ds-space-4);
  }

  &__campo {
    display: grid;
    gap: var(--ds-space-1);
    min-width: 0;

    &--full {
      grid-column: 1 / -1;
    }

    span {
      color: var(--ds-text-secondary);
      font-size: var(--ds-font-size-sm);
      font-weight: var(--ds-font-weight-medium);
    }

    strong {
      color: var(--ds-text-primary);
      font-size: 0.95rem;
      font-weight: var(--ds-font-weight-medium);
      overflow-wrap: anywhere;
    }
  }

  &__auditoria {
    display: grid;
    gap: var(--ds-space-2);
  }

  &__auditoria-linha {
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: var(--ds-space-3);
    align-items: center;
    padding: var(--ds-space-2) var(--ds-space-3);
    border-radius: var(--ds-radius-md);

    strong {
      font-size: var(--ds-font-size-xs);
      font-weight: var(--ds-font-weight-bold);
      text-transform: uppercase;
    }

    span {
      display: inline-flex;
      align-items: center;
      gap: var(--ds-space-2);
      color: var(--ds-text-primary);
      font-size: var(--ds-font-size-sm);
    }
  }

  &__auditoria-linha--criado {
    background: var(--ds-audit-created-bg);

    strong,
    span .q-icon {
      color: var(--ds-audit-created-fg);
    }
  }

  &__auditoria-linha--atualizado {
    background: var(--ds-audit-updated-bg);

    strong,
    span .q-icon {
      color: var(--ds-audit-updated-fg);
    }
  }

  &__vazio,
  &__observacao {
    margin: 0;
    color: var(--ds-text-primary);
    font-size: 0.95rem;
    line-height: var(--ds-line-height-normal);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  &__vazio {
    color: var(--ds-text-secondary);
  }

  &__acoes {
    padding: var(--ds-space-3) var(--ds-space-5);
    border-top: 1px solid var(--ds-border-default);
    background: var(--ds-bg-surface);
  }
}

@media (max-width: 600px) {
  .paciente-detalhe__grid {
    grid-template-columns: 1fr;
  }
}
</style>
