<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { movimentacaoEstoqueService } from '@/services/movimentacao-estoque.service';
import type { MovimentacaoEstoque } from '@/types/entidades/movimentacao-estoque';
import {
  formatarDataMovimentacao,
  formatarMotivoMovimentacao,
  obterCorTipoMovimentacao,
} from '@/types/entidades/movimentacao-estoque';
import type { SaldoLoteEstoque } from '@/types/entidades/saldo-estoque';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import {
  LIMITE_MOVIMENTACOES_LOTE,
  filtrarMovimentacoesDoLote,
  formatarQuantidadeEmbalagemMovimentacao,
  formatarSaldoEmbalagem,
  validadeProxima,
} from '@/utils/lote-estoque';

type VisaoLotes = 'lista' | 'detalhe';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    lotes?: SaldoLoteEstoque[];
    carregandoLotes?: boolean;
    tituloLista?: string;
    subtituloLista?: string;
    loteInicial?: SaldoLoteEstoque | null;
    apenasDetalhe?: boolean;
    embalagemPorProdutoId?: Map<string, string> | Record<string, string>;
  }>(),
  {
    lotes: () => [],
    carregandoLotes: false,
    tituloLista: 'Lotes',
    subtituloLista: '',
    loteInicial: null,
    apenasDetalhe: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const visaoLotes = ref<VisaoLotes>('lista');
const loteSelecionado = ref<SaldoLoteEstoque | null>(null);
const movimentacoesLote = ref<MovimentacaoEstoque[]>([]);
const carregandoMovimentacoesLote = ref(false);

const aberto = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const estiloCard = computed(() =>
  visaoLotes.value === 'detalhe' || props.apenasDetalhe
    ? 'min-width: 640px; max-width: 900px; width: 90vw'
    : 'min-width: 480px; max-width: 720px',
);

const loteExibido = computed(
  () => loteSelecionado.value ?? (props.apenasDetalhe ? props.loteInicial : null),
);

watch(
  () => props.modelValue,
  (abertoAgora) => {
    if (!abertoAgora) {
      return;
    }

    if (props.apenasDetalhe || props.loteInicial) {
      if (props.loteInicial) {
        void abrirLoteCompleto(props.loteInicial);
      }
      return;
    }

    resetarParaLista();
  },
);

function resetarParaLista(): void {
  visaoLotes.value = 'lista';
  loteSelecionado.value = null;
  movimentacoesLote.value = [];
  carregandoMovimentacoesLote.value = false;
}

function aoFechar(): void {
  resetarParaLista();
}

async function abrirLoteCompleto(lote: SaldoLoteEstoque): Promise<void> {
  loteSelecionado.value = lote;
  visaoLotes.value = 'detalhe';
  carregandoMovimentacoesLote.value = true;
  movimentacoesLote.value = [];

  try {
    const movimentacoes = await movimentacaoEstoqueService.listar({
      unidadeId: lote.unidadeId,
      produtoId: lote.produtoId,
      loteProdutoId: lote.loteProdutoId,
      limit: LIMITE_MOVIMENTACOES_LOTE,
    });

    movimentacoesLote.value = filtrarMovimentacoesDoLote(movimentacoes, lote);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    movimentacoesLote.value = [];
  } finally {
    carregandoMovimentacoesLote.value = false;
  }
}

function voltarListaLotes(): void {
  if (props.apenasDetalhe) {
    aberto.value = false;
    return;
  }

  resetarParaLista();
}

function formatarEmbalagem(lote: SaldoLoteEstoque): string {
  return formatarSaldoEmbalagem(lote, props.embalagemPorProdutoId);
}

function formatarEmbalagemMovimentacao(movimentacao: MovimentacaoEstoque): string {
  if (!loteExibido.value) {
    return '—';
  }

  return formatarQuantidadeEmbalagemMovimentacao(
    movimentacao.quantidadeEmbalagem,
    loteExibido.value,
    props.embalagemPorProdutoId,
  );
}
</script>

<template>
  <q-dialog
    v-model="aberto"
    transition-show="none"
    transition-hide="none"
    @hide="aoFechar"
  >
    <q-card :style="estiloCard">
      <template v-if="visaoLotes === 'lista' && !apenasDetalhe">
        <q-card-section>
          <div class="text-h6">{{ tituloLista }}</div>
          <div
            v-if="subtituloLista"
            class="text-caption"
            style="color: var(--ds-text-secondary)"
          >
            {{ subtituloLista }}
          </div>
        </q-card-section>

        <q-card-section v-if="carregandoLotes">
          Carregando lotes...
        </q-card-section>

        <q-card-section v-else-if="lotes.length === 0">
          Nenhum lote com saldo para este produto na unidade.
        </q-card-section>

        <q-markup-table v-else flat bordered>
          <thead>
            <tr>
              <th class="text-left">Lote</th>
              <th class="text-left">Validade</th>
              <th class="text-right">Saldo</th>
              <th class="text-right">Embalagens</th>
              <th class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lote in lotes"
              :key="lote.loteProdutoId"
            >
              <td>{{ lote.codigo }}</td>
              <td>
                {{ lote.dataValidade }}
                <q-badge
                  v-if="validadeProxima(lote.dataValidade)"
                  color="warning"
                  label="Próximo"
                  class="q-ml-sm"
                />
              </td>
              <td class="text-right">
                {{ formatarSaldoComUnidade(lote.saldoAtual, lote.unidadeMedidaSigla) }}
              </td>
              <td class="text-right">
                {{ formatarEmbalagem(lote) }}
              </td>
              <td class="text-right">
                <q-btn
                  flat
                  dense
                  color="primary"
                  label="Visualizar lote completo"
                  no-caps
                  @click="abrirLoteCompleto(lote)"
                />
              </td>
            </tr>
          </tbody>
        </q-markup-table>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Fechar"
            color="primary"
            no-caps
            v-close-popup
          />
        </q-card-actions>
      </template>

      <template v-else-if="loteExibido">
        <q-card-section>
          <div class="text-h6">Lote {{ loteExibido.codigo }}</div>
          <div class="text-caption" style="color: var(--ds-text-secondary)">
            {{ loteExibido.produtoNome }} — {{ loteExibido.unidadeNome }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-4">
              <div class="text-caption" style="color: var(--ds-text-secondary)">Validade</div>
              <div>
                {{ loteExibido.dataValidade }}
                <q-badge
                  v-if="validadeProxima(loteExibido.dataValidade)"
                  color="warning"
                  label="Próximo"
                  class="q-ml-sm"
                />
              </div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="text-caption" style="color: var(--ds-text-secondary)">Saldo</div>
              <div>
                {{
                  formatarSaldoComUnidade(
                    loteExibido.saldoAtual,
                    loteExibido.unidadeMedidaSigla,
                  )
                }}
              </div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="text-caption" style="color: var(--ds-text-secondary)">Embalagens</div>
              <div>{{ formatarEmbalagem(loteExibido) }}</div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Movimentações vinculadas</div>

          <div v-if="carregandoMovimentacoesLote">
            Carregando movimentações...
          </div>

          <div v-else-if="movimentacoesLote.length === 0">
            Nenhuma movimentação vinculada a este lote.
          </div>

          <q-markup-table
            v-else
            flat
            bordered
          >
            <thead>
              <tr>
                <th class="text-left">Data</th>
                <th class="text-left">Tipo</th>
                <th class="text-left">Motivo</th>
                <th class="text-right">Quantidade</th>
                <th class="text-right">Embalagens</th>
                <th class="text-left">Observação</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="movimentacao in movimentacoesLote"
                :key="movimentacao.id"
              >
                <td>{{ formatarDataMovimentacao(movimentacao.data) }}</td>
                <td>
                  <q-badge
                    :color="obterCorTipoMovimentacao(movimentacao.tipo)"
                    :label="movimentacao.tipo"
                  />
                </td>
                <td>
                  {{ formatarMotivoMovimentacao(movimentacao.motivo, movimentacao.origem) }}
                </td>
                <td class="text-right">
                  {{
                    formatarSaldoComUnidade(
                      movimentacao.quantidade,
                      loteExibido.unidadeMedidaSigla,
                    )
                  }}
                </td>
                <td class="text-right">
                  {{ formatarEmbalagemMovimentacao(movimentacao) }}
                </td>
                <td>{{ movimentacao.observacao || '—' }}</td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-if="!apenasDetalhe"
            flat
            label="Voltar"
            color="primary"
            no-caps
            @click="voltarListaLotes"
          />
          <q-btn
            flat
            label="Fechar"
            color="primary"
            no-caps
            v-close-popup
          />
        </q-card-actions>
      </template>
    </q-card>
  </q-dialog>
</template>
