<script setup lang="ts">
import { computed } from 'vue';

import type {
  ProcedimentoConclusaoFormulario,
  SaldoProdutoConclusao,
} from '@/components/agendamentos/conclusao-agendamento.types';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import type { Produto } from '@/types/entidades/produto';

const props = defineProps<{
  procedimento: ProcedimentoConclusaoFormulario;
  produtos: Produto[];
  saldosInsumos: Record<string, { saldoAtual: number; unidadeMedidaSigla: string }>;
  disable?: boolean;
}>();

const emit = defineEmits<{
  adicionar: [];
  diminuir: [indice: number];
  aumentar: [indice: number];
}>();

const produtosPorId = computed(
  () => new Map(props.produtos.map((produto) => [produto.id, produto])),
);

function obterNomeProduto(produtoId: string | null): string {
  if (!produtoId) {
    return 'Produto não informado';
  }

  return produtosPorId.value.get(produtoId)?.nome ?? produtoId;
}

function obterSiglaProduto(produtoId: string | null): string {
  if (!produtoId) {
    return '';
  }

  return produtosPorId.value.get(produtoId)?.unidadeMedidaSigla ?? '';
}

const linhasSaldo = computed<SaldoProdutoConclusao[]>(() => {
  const linhas = new Map<string, SaldoProdutoConclusao>();
  const procedimento = props.procedimento;

  if (procedimento.produtoAplicadoId) {
    linhas.set(procedimento.produtoAplicadoId, {
      produtoId: procedimento.produtoAplicadoId,
      produtoNome: procedimento.produtoAplicadoNome ?? 'Medicamento',
      quantidadeNecessaria: Number(procedimento.quantidadeUtilizada ?? 0),
      saldoAtual: procedimento.saldoAtual,
      sigla: procedimento.unidadeMedidaSigla,
    });
  }

  for (const insumo of procedimento.insumosManuais) {
    if (!insumo.produtoId) {
      continue;
    }

    const saldo = props.saldosInsumos[insumo.produtoId];
    linhas.set(insumo.produtoId, {
      produtoId: insumo.produtoId,
      produtoNome: obterNomeProduto(insumo.produtoId),
      quantidadeNecessaria: Number(insumo.quantidade ?? 0),
      saldoAtual: saldo?.saldoAtual ?? null,
      sigla: saldo?.unidadeMedidaSigla ?? obterSiglaProduto(insumo.produtoId),
    });
  }

  return [...linhas.values()];
});
</script>

<template>
  <div class="q-mt-md">
    <div class="row items-center q-mb-sm">
      <div>
        <div class="text-weight-medium">Produtos utilizados</div>
        <div class="text-caption text-grey-7">
          O kit é uma sugestão inicial. Ajuste os produtos e quantidades desta aplicação.
        </div>
      </div>
      <q-space />
      <q-btn
        flat
        dense
        color="primary"
        icon="add"
        label="Adicionar insumo"
        no-caps
        :disable="disable"
        @click="emit('adicionar')"
      />
    </div>

    <q-markup-table
      v-if="procedimento.insumosManuais.length > 0"
      flat
      bordered
      dense
      class="produtos-utilizados__lista"
    >
      <thead>
        <tr>
          <th class="text-left">Produto</th>
          <th class="text-right">Quantidade usada</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(insumo, indice) in procedimento.insumosManuais"
          :key="insumo.produtoId || indice"
        >
          <td class="text-left text-weight-medium">{{ obterNomeProduto(insumo.produtoId) }}</td>
          <td class="text-right">
            <div class="produtos-utilizados__quantidade">
              <q-btn
                round
                flat
                dense
                size="sm"
                color="negative"
                icon="remove"
                aria-label="Diminuir quantidade ou remover insumo"
                :disable="disable"
                @click="emit('diminuir', indice)"
              >
                <q-tooltip>
                  {{ Number(insumo.quantidade ?? 0) <= 1 ? 'Remover insumo' : 'Diminuir quantidade' }}
                </q-tooltip>
              </q-btn>
              <span class="produtos-utilizados__quantidade-valor">
                {{ Number(insumo.quantidade ?? 0).toLocaleString('pt-BR') }}
                {{ obterSiglaProduto(insumo.produtoId) }}
              </span>
              <q-btn
                round
                flat
                dense
                size="sm"
                color="primary"
                icon="add"
                aria-label="Aumentar quantidade do insumo"
                :disable="disable"
                @click="emit('aumentar', indice)"
              >
                <q-tooltip>Aumentar quantidade</q-tooltip>
              </q-btn>
            </div>
          </td>
        </tr>
      </tbody>
    </q-markup-table>

    <div v-else class="text-body2 produtos-utilizados__vazio">
      Nenhum produto adicional. A baixa será apenas do medicamento aplicado.
    </div>
  </div>

  <div v-if="linhasSaldo.length > 0" class="q-mt-md">
    <div class="text-weight-medium q-mb-xs">Saldo na unidade</div>
    <q-markup-table flat bordered dense>
      <thead>
        <tr>
          <th class="text-left">Produto</th>
          <th class="text-right">Necessário</th>
          <th class="text-right">Disponível</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in linhasSaldo" :key="item.produtoId">
          <td>{{ item.produtoNome }}</td>
          <td class="text-right">
            {{ formatarSaldoComUnidade(item.quantidadeNecessaria, item.sigla) }}
          </td>
          <td class="text-right">
            {{
              item.saldoAtual !== null
                ? formatarSaldoComUnidade(item.saldoAtual, item.sigla)
                : '—'
            }}
          </td>
        </tr>
      </tbody>
    </q-markup-table>
  </div>
</template>

<style scoped lang="scss">
.produtos-utilizados {
  &__lista {
    border-radius: var(--ds-radius-md, 12px);
    overflow: hidden;
  }

  &__quantidade {
    align-items: center;
    display: inline-flex;
    gap: var(--ds-space-2, 8px);
    justify-content: flex-end;
  }

  &__quantidade-valor {
    min-width: 90px;
    text-align: center;
  }

  &__vazio {
    background: var(--ds-bg-subtle);
    border-radius: var(--ds-radius-md, 12px);
    color: var(--ds-text-secondary);
    padding: var(--ds-space-3, 12px);
  }
}
</style>
