<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { compraPacienteService } from '@/services/compra-paciente.service';
import type { CompraPaciente, SaldoProdutoCompraPaciente } from '@/types/entidades/compra-paciente';
import {
  formatarQuantidadeProduto,
  obterLabelStatusCompra,
} from '@/types/entidades/compra-paciente';

interface ItemSaldoEditavel {
  produtoId: string;
  produtoNome: string;
  unidadeMedida: string;
  quantidadeUtilizada: number | null;
  quantidadeContratada: number | null;
}

const props = defineProps<{
  modelValue: boolean;
  compra: CompraPaciente | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
  salvo: [];
}>();

const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const salvando = ref(false);
const motivo = ref('');
const itens = ref<ItemSaldoEditavel[]>([]);

const aberto = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

function clonarItens(produtos: SaldoProdutoCompraPaciente[] | undefined): ItemSaldoEditavel[] {
  return (produtos ?? []).map((produto) => ({
    produtoId: produto.produtoId,
    produtoNome: produto.produtoNome,
    unidadeMedida: produto.unidadeMedida,
    quantidadeUtilizada: produto.quantidadeUtilizada,
    quantidadeContratada: produto.quantidadeContratada,
  }));
}

function quantidadeRestantePreview(item: ItemSaldoEditavel): number | null {
  if (
    item.quantidadeContratada === null ||
    Number.isNaN(item.quantidadeContratada) ||
    item.quantidadeUtilizada === null ||
    Number.isNaN(item.quantidadeUtilizada)
  ) {
    return null;
  }

  return item.quantidadeContratada - item.quantidadeUtilizada;
}

function validar(): string | null {
  if (!itens.value.length) {
    return 'Informe ao menos um item de saldo para atualizar.';
  }

  for (const item of itens.value) {
    const contratada = item.quantidadeContratada;
    const utilizada = item.quantidadeUtilizada;

    if (contratada === null || Number.isNaN(contratada)) {
      return `Informe a quantidade contratada de ${item.produtoNome}.`;
    }

    if (utilizada === null || Number.isNaN(utilizada)) {
      return `Informe a quantidade utilizada de ${item.produtoNome}.`;
    }

    if (contratada <= 0) {
      return `A quantidade contratada de ${item.produtoNome} deve ser maior que zero.`;
    }

    if (utilizada < 0) {
      return `A quantidade utilizada de ${item.produtoNome} não pode ser negativa.`;
    }

    if (contratada < utilizada) {
      return `A quantidade contratada de ${item.produtoNome} não pode ser menor que a utilizada (${formatarQuantidadeProduto(utilizada, item.unidadeMedida)}).`;
    }
  }

  if (motivo.value.length > 2000) {
    return 'O motivo deve ter no máximo 2000 caracteres.';
  }

  return null;
}

async function salvar(): Promise<void> {
  if (!props.compra) {
    return;
  }

  const erroValidacao = validar();
  if (erroValidacao) {
    notificacao.info(erroValidacao);
    return;
  }

  salvando.value = true;

  try {
    await compraPacienteService.atualizarSaldo(props.compra.id, {
      itens: itens.value.map((item) => ({
        produtoId: item.produtoId,
        quantidadeContratada: Number(item.quantidadeContratada),
        quantidadeUtilizada: Number(item.quantidadeUtilizada),
      })),
      motivo: motivo.value.trim() || null,
    });
    notificacao.sucesso('Saldo da compra ajustado com sucesso.');
    aberto.value = false;
    emit('salvo');
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function fechar(): void {
  if (salvando.value) {
    return;
  }

  aberto.value = false;
}

watch(
  () => [props.modelValue, props.compra] as const,
  ([abertoDialog, compra]) => {
    if (!abertoDialog || !compra) {
      return;
    }

    itens.value = clonarItens(compra.saldo?.produtos);
    motivo.value = '';
  },
);
</script>

<template>
  <q-dialog
    v-model="aberto"
    persistent
    transition-show="none"
    transition-hide="none"
  >
    <q-card style="min-width: 360px; max-width: 560px; width: 100%">
      <q-card-section>
        <div class="text-h6">Ajustar saldo</div>
        <div v-if="compra" class="text-body2 text-secondary q-mt-xs">
          {{ compra.pacoteNome }}
          <template v-if="compra.pacienteNome"> · {{ compra.pacienteNome }}</template>
          · {{ obterLabelStatusCompra(compra.status) }}
        </div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <div class="text-body2 text-secondary">
          Altera a quantidade contratada e a utilizada. O restante é recalculado.
          Só funciona para pacote exclusivo desta compra.
        </div>

        <div v-if="!itens.length" class="text-body2 text-secondary">
          Esta compra não possui produtos de saldo para ajustar.
        </div>

        <div
          v-for="item in itens"
          :key="item.produtoId"
          class="ajustar-saldo__item"
        >
          <div class="text-subtitle2">{{ item.produtoNome }}</div>

          <div class="row q-col-gutter-sm q-mt-xs">
            <div class="col-12 col-sm-4">
              <q-input
                v-model.number="item.quantidadeContratada"
                label="Contratada"
                outlined
                dense
                type="number"
                min="0.0001"
                step="any"
                :suffix="item.unidadeMedida"
              />
            </div>
            <div class="col-6 col-sm-4">
              <q-input
                v-model.number="item.quantidadeUtilizada"
                label="Utilizada"
                outlined
                dense
                type="number"
                min="0"
                step="any"
                :suffix="item.unidadeMedida"
              />
            </div>
            <div class="col-6 col-sm-4">
              <q-input
                :model-value="
                  quantidadeRestantePreview(item) === null
                    ? '—'
                    : formatarQuantidadeProduto(
                        quantidadeRestantePreview(item) as number,
                        item.unidadeMedida,
                      )
                "
                label="Restante (preview)"
                outlined
                dense
                readonly
              />
            </div>
          </div>
        </div>

        <q-input
          v-model="motivo"
          label="Motivo (opcional)"
          placeholder="Ex.: Correção de saldo migrado"
          outlined
          type="textarea"
          autogrow
          maxlength="2000"
          counter
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Voltar" color="primary" no-caps :disable="salvando" @click="fechar" />
        <q-btn
          color="primary"
          label="Salvar"
          unelevated
          no-caps
          :loading="salvando"
          :disable="!itens.length"
          @click="salvar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.ajustar-saldo__item {
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-surface);
}

.text-secondary {
  color: var(--ds-text-secondary);
}
</style>
