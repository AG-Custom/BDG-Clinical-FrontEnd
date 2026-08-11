<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { movimentacaoEstoqueService } from '@/services/movimentacao-estoque.service';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import { unidadeService } from '@/services/unidade.service';
import type {
  MovimentacaoEstoque,
  TipoMovimentacaoEstoque,
} from '@/types/entidades/movimentacao-estoque';
import {
  TIPOS_MOVIMENTACAO_ESTOQUE,
  deDataParaFimDiaIso,
  deDataParaInicioDiaIso,
  formatarDataMovimentacao,
  formatarMotivoMovimentacao,
  formatarOrigemMovimentacao,
  obterCorTipoMovimentacao,
} from '@/types/entidades/movimentacao-estoque';
import type { Produto } from '@/types/entidades/produto';
import type { SaldoEstoque } from '@/types/entidades/saldo-estoque';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import type { Unidade } from '@/types/entidades/unidade';
import { formatarMoeda } from '@/types/entidades/pedido-fornecedor';
import { ordenarPorUnidadeNome } from '@/utils/ordenar-listagem';

const LIMITE_PADRAO = 50;

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const movimentacoes = ref<MovimentacaoEstoque[]>([]);
const saldosContexto = ref<SaldoEstoque[]>([]);
const carregando = ref(true);
const filtroUnidadeId = ref<string | null>(null);
const filtroProdutoId = ref<string | null>(null);
const filtroTipo = ref<TipoMovimentacaoEstoque | null>(null);
const filtroDataInicio = ref('');
const filtroDataFim = ref('');
const filtroTransferenciaEstoqueId = ref<string | null>(null);
const dialogVisualizar = ref(false);
const movimentacaoSelecionada = ref<MovimentacaoEstoque | null>(null);

const registroDetalhe = computed(() => {
  const movimentacao = movimentacaoSelecionada.value;
  if (!movimentacao) {
    return null;
  }

  return {
    ...movimentacao,
    motivo: formatarMotivoMovimentacao(movimentacao.motivo, movimentacao.origem),
    fonte: formatarOrigemMovimentacao(movimentacao.origem),
    transferencia: movimentacao.transferenciaEstoqueId
      ? `Correlação ${movimentacao.transferenciaEstoqueId.slice(0, 8).toUpperCase()}`
      : null,
  };
});

const mostrarInsights = computed(
  () => Boolean(filtroProdutoId.value || filtroUnidadeId.value),
);

const valorTotalEstoque = computed(() =>
  saldosContexto.value.reduce((total, saldo) => total + obterValorEstoque(saldo), 0),
);

const valorTotalEstoqueFormatado = computed(() => formatarMoeda(valorTotalEstoque.value));

const saldoAtualTotal = computed(() =>
  saldosContexto.value.reduce((total, saldo) => total + saldo.saldoAtual, 0),
);

const saldoAtualFormatado = computed(() => {
  const sigla = saldosContexto.value[0]?.unidadeMedidaSigla ?? '';
  return formatarSaldoComUnidade(saldoAtualTotal.value, sigla);
});

const valorUnitarioFormatado = computed(() => {
  if (saldosContexto.value.length === 0) {
    return '—';
  }

  const valores = [
    ...new Set(
      saldosContexto.value.map((saldo) =>
        saldo.valorUnitario != null ? saldo.valorUnitario.toFixed(2) : 'null',
      ),
    ),
  ];

  if (valores.length !== 1 || valores[0] === 'null') {
    return valores.length > 1 ? 'Variado' : '—';
  }

  return formatarMoeda(Number(valores[0]));
});

const totalItensInsight = computed(
  () => new Set(saldosContexto.value.map((saldo) => saldo.produtoId)).size,
);

const itensSemPreco = computed(
  () => saldosContexto.value.filter((saldo) => !saldo.valorUnitario || saldo.valorUnitario <= 0).length,
);

const itensAbaixoDoMinimo = computed(
  () => saldosContexto.value.filter((saldo) => saldo.abaixoDoMinimo).length,
);

const abaixoDoMinimo = computed(() => itensAbaixoDoMinimo.value > 0);

const situacaoEstoque = computed(() => {
  if (saldosContexto.value.length === 0) {
    return 'Sem saldo';
  }

  return abaixoDoMinimo.value ? 'Abaixo do mínimo' : 'OK';
});

const insightComProduto = computed(() => Boolean(filtroProdutoId.value));

const ajudaValorEstoque =
  'Usa o preço da última compra recebida; se ainda não houver compra, usa o valor cadastrado no produto. Em medicamentos, o preço é o da embalagem e o sistema calcula o valor do estoque a partir disso.';

const colunas = [
  { name: 'data', label: 'Data', field: 'data', align: 'left' as const, sortable: true },
  { name: 'unidade', label: 'Unidade', field: 'unidadeNome', align: 'left' as const, sortable: true },
  { name: 'produto', label: 'Produto', field: 'produtoNome', align: 'left' as const },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'center' as const },
  { name: 'quantidade', label: 'Quantidade', field: 'quantidade', align: 'right' as const },
  { name: 'valorTotal', label: 'Valor', field: 'valorTotal', align: 'right' as const },
  { name: 'motivo', label: 'Motivo', field: 'motivo', align: 'left' as const },
  { name: 'observacao', label: 'Observação', field: 'observacao', align: 'left' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

const opcoesTiposFiltro = [
  { label: 'Todos os tipos', value: null },
  ...TIPOS_MOVIMENTACAO_ESTOQUE.map((tipo) => ({ label: tipo, value: tipo })),
];

const opcoesUnidadesFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todas as unidades', value: null },
]);

const opcoesProdutosFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todos os produtos', value: null },
]);

function aplicarFiltrosDaUrl(): void {
  const unidadeId = route.query.unidadeId;
  const produtoId = route.query.produtoId;
  const transferenciaEstoqueId = route.query.transferenciaEstoqueId;

  filtroUnidadeId.value = typeof unidadeId === 'string' ? unidadeId : null;
  filtroProdutoId.value = typeof produtoId === 'string' ? produtoId : null;
  filtroTransferenciaEstoqueId.value =
    typeof transferenciaEstoqueId === 'string' ? transferenciaEstoqueId : null;
}

async function carregarFiltros(): Promise<void> {
  try {
    const [listaUnidades, listaProdutos] = await Promise.all([
      unidadeService.listar(true),
      produtoService.listar({ includeInactive: true }),
    ]);

    opcoesUnidadesFiltro.value = [
      { label: 'Todas as unidades', value: null },
      ...listaUnidades.map((unidade: Unidade) => ({
        label: unidade.ativo ? unidade.nome : `${unidade.nome} (inativa)`,
        value: unidade.id,
      })),
    ];

    opcoesProdutosFiltro.value = [
      { label: 'Todos os produtos', value: null },
      ...listaProdutos.map((produto: Produto) => ({
        label: produto.ativo ? produto.nome : `${produto.nome} (inativo)`,
        value: produto.id,
      })),
    ];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

function obterValorEstoque(saldo: SaldoEstoque): number {
  if (Number.isFinite(saldo.valorEstoque)) {
    return saldo.valorEstoque;
  }

  return saldo.saldoAtual * (saldo.valorUnitario ?? 0);
}

async function carregarInsights(): Promise<void> {
  if (!mostrarInsights.value) {
    saldosContexto.value = [];
    return;
  }

  try {
    saldosContexto.value = await saldoEstoqueService.listar({
      unidadeId: filtroUnidadeId.value ?? undefined,
      produtoId: filtroProdutoId.value ?? undefined,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    saldosContexto.value = [];
  }
}

async function carregarMovimentacoes(): Promise<void> {
  carregando.value = true;

  try {
    movimentacoes.value = ordenarPorUnidadeNome(
      await movimentacaoEstoqueService.listar({
        unidadeId: filtroUnidadeId.value ?? undefined,
        produtoId: filtroProdutoId.value ?? undefined,
        tipo: filtroTipo.value ?? undefined,
        dataInicio: filtroDataInicio.value ? deDataParaInicioDiaIso(filtroDataInicio.value) : undefined,
        dataFim: filtroDataFim.value ? deDataParaFimDiaIso(filtroDataFim.value) : undefined,
        transferenciaEstoqueId: filtroTransferenciaEstoqueId.value ?? undefined,
        limit: LIMITE_PADRAO,
      }),
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    );
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

async function aoAlterarFiltroContexto(): Promise<void> {
  await Promise.all([carregarMovimentacoes(), carregarInsights()]);
}

function limparFiltros(): void {
  filtroUnidadeId.value = null;
  filtroProdutoId.value = null;
  filtroTipo.value = null;
  filtroDataInicio.value = '';
  filtroDataFim.value = '';
  filtroTransferenciaEstoqueId.value = null;
  saldosContexto.value = [];

  if (route.query.unidadeId || route.query.produtoId || route.query.transferenciaEstoqueId) {
    void router.replace({ name: 'movimentacoes-estoque' });
  }

  void carregarMovimentacoes();
}

function verTransferencia(transferenciaEstoqueId: string): void {
  void router.replace({
    name: 'movimentacoes-estoque',
    query: {
      ...route.query,
      transferenciaEstoqueId,
    },
  });
}

function verPedido(pedidoFornecedorId: string): void {
  router.push({ name: 'pedidos-fornecedor-editar', params: { id: pedidoFornecedorId } });
}

function verAplicacao(aplicacaoPacienteId: string): void {
  router.push({ name: 'aplicacoes-paciente-editar', params: { id: aplicacaoPacienteId } });
}

function abrirDialogVisualizar(movimentacao: MovimentacaoEstoque): void {
  movimentacaoSelecionada.value = movimentacao;
  dialogVisualizar.value = true;
}

watch(
  () => route.query,
  () => {
    aplicarFiltrosDaUrl();
    void aoAlterarFiltroContexto();
  },
);

onMounted(async () => {
  aplicarFiltrosDaUrl();
  await carregarFiltros();
  await aoAlterarFiltroContexto();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Movimentações de estoque"
      subtitulo="Histórico de entradas, saídas, ajustes, perdas e transferências."
    />

    <section
      v-if="mostrarInsights"
      class="estoque-summary q-mb-md"
    >
      <div class="col-summary">
        <app-metric-card
          label="Valor em estoque"
          icon="payments"
          :valor="valorTotalEstoqueFormatado"
          :hint="ajudaValorEstoque"
        />
      </div>
      <div
        v-if="insightComProduto"
        class="col-summary"
      >
        <app-metric-card
          label="Saldo atual"
          icon="inventory_2"
          :valor="saldosContexto.length > 0 ? saldoAtualFormatado : '—'"
        />
      </div>
      <div
        v-if="insightComProduto"
        class="col-summary"
      >
        <app-metric-card
          label="Valor unitário"
          icon="sell"
          :valor="valorUnitarioFormatado"
        />
      </div>
      <div
        v-if="insightComProduto"
        class="col-summary"
      >
        <app-metric-card
          label="Situação"
          :icon="abaixoDoMinimo ? 'warning' : 'check_circle'"
          :valor="situacaoEstoque"
        />
      </div>
      <div
        v-if="!insightComProduto"
        class="col-summary"
      >
        <app-metric-card
          label="Itens"
          icon="inventory_2"
          :valor="totalItensInsight.toLocaleString('pt-BR')"
        />
      </div>
      <div
        v-if="!insightComProduto"
        class="col-summary"
      >
        <app-metric-card
          label="Sem preço"
          icon="money_off"
          :valor="itensSemPreco.toLocaleString('pt-BR')"
        />
      </div>
      <div
        v-if="!insightComProduto"
        class="col-summary"
      >
        <app-metric-card
          label="Abaixo do mínimo"
          icon="warning"
          :valor="itensAbaixoDoMinimo.toLocaleString('pt-BR')"
        />
      </div>
    </section>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-3">
            <q-select
              v-model="filtroUnidadeId"
              :options="opcoesUnidadesFiltro"
              label="Unidade"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="aoAlterarFiltroContexto"
            />
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="filtroProdutoId"
              :options="opcoesProdutosFiltro"
              label="Produto"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="aoAlterarFiltroContexto"
            />
          </div>
          <div class="col-12 col-md-2">
            <q-select
              v-model="filtroTipo"
              :options="opcoesTiposFiltro"
              label="Tipo"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarMovimentacoes"
            />
          </div>
          <div class="col-6 col-md-2">
            <q-input
              v-model="filtroDataInicio"
              label="Data início"
              outlined
              dense
              type="date"
              clearable
              @update:model-value="carregarMovimentacoes"
            />
          </div>
          <div class="col-6 col-md-2">
            <q-input
              v-model="filtroDataFim"
              label="Data fim"
              outlined
              dense
              type="date"
              clearable
              @update:model-value="carregarMovimentacoes"
            />
          </div>
        </div>

        <div class="row q-mt-sm">
          <q-btn
            flat
            color="primary"
            label="Limpar filtros"
            no-caps
            @click="limparFiltros"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="movimentacoes.length > 0"
        :rows="movimentacoes"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-data="props">
          <q-td :props="props">
            {{ formatarDataMovimentacao(props.row.data) }}
          </q-td>
        </template>

        <template #body-cell-tipo="props">
          <q-td :props="props">
            <q-badge
              :color="obterCorTipoMovimentacao(props.row.tipo)"
              :label="props.row.tipo"
            />
          </q-td>
        </template>

        <template #body-cell-quantidade="props">
          <q-td :props="props">
            {{ props.row.quantidade.toLocaleString('pt-BR') }}
          </q-td>
        </template>

        <template #body-cell-valorTotal="props">
          <q-td :props="props">
            {{ formatarMoeda(props.row.valorTotal ?? 0) }}
          </q-td>
        </template>

        <template #body-cell-motivo="props">
          <q-td :props="props">
            {{ formatarMotivoMovimentacao(props.row.motivo, props.row.origem) }}
          </q-td>
        </template>

        <template #body-cell-observacao="props">
          <q-td :props="props">
            {{ props.row.observacao || '—' }}
          </q-td>
        </template>

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <app-table-actions-menu
              :mostrar-editar="false"
              :mostrar-status="false"
              @visualizar="abrirDialogVisualizar(cell.row)"
            >
              <q-item
                v-if="cell.row.pedidoFornecedorId"
                clickable
                v-close-popup
                @click="verPedido(cell.row.pedidoFornecedorId)"
              >
                <q-item-section avatar>
                  <q-icon name="shopping_cart" color="primary" />
                </q-item-section>
                <q-item-section>Ver pedido</q-item-section>
              </q-item>
              <q-item
                v-if="cell.row.aplicacaoPacienteId"
                clickable
                v-close-popup
                @click="verAplicacao(cell.row.aplicacaoPacienteId)"
              >
                <q-item-section avatar>
                  <q-icon name="vaccines" color="primary" />
                </q-item-section>
                <q-item-section>Ver aplicação</q-item-section>
              </q-item>
              <q-item
                v-if="cell.row.transferenciaEstoqueId"
                clickable
                v-close-popup
                @click="verTransferencia(cell.row.transferenciaEstoqueId)"
              >
                <q-item-section avatar>
                  <q-icon name="swap_horiz" color="primary" />
                </q-item-section>
                <q-item-section>Ver transferência</q-item-section>
              </q-item>
            </app-table-actions-menu>
          </app-table-actions-cell>
        </template>
      </q-table>

      <q-card-section v-else-if="carregando">
        <app-table-skeleton :columns="colunas.length" />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="swap_horiz"
          titulo="Nenhuma movimentação encontrada"
          texto="Ajuste os filtros ou registre entradas, saídas e transferências."
        />
      </q-card-section>
    </q-card>

    <app-entity-details-dialog
      v-model="dialogVisualizar"
      titulo="Detalhar movimentação"
      entidade-auditoria="MovimentacaoEstoque"
      :registro="registroDetalhe"
    />
  </q-page>
</template>

<style scoped lang="scss">
.estoque-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--ds-space-3);
  align-items: stretch;
}

.col-summary {
  min-width: 0;
}

@media (max-width: 1100px) {
  .estoque-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .estoque-summary {
    grid-template-columns: 1fr;
  }
}
</style>
