<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { movimentacaoEstoqueService } from '@/services/movimentacao-estoque.service';
import { produtoService } from '@/services/produto.service';
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
  obterCorTipoMovimentacao,
} from '@/types/entidades/movimentacao-estoque';
import type { Produto } from '@/types/entidades/produto';
import type { Unidade } from '@/types/entidades/unidade';

const LIMITE_PADRAO = 50;

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const movimentacoes = ref<MovimentacaoEstoque[]>([]);
const carregando = ref(true);
const filtroUnidadeId = ref<string | null>(null);
const filtroProdutoId = ref<string | null>(null);
const filtroTipo = ref<TipoMovimentacaoEstoque | null>(null);
const filtroDataInicio = ref('');
const filtroDataFim = ref('');
const dialogVisualizar = ref(false);
const movimentacaoSelecionada = ref<MovimentacaoEstoque | null>(null);

const colunas = [
  { name: 'data', label: 'Data', field: 'data', align: 'left' as const, sortable: true },
  { name: 'unidade', label: 'Unidade', field: 'unidadeNome', align: 'left' as const },
  { name: 'produto', label: 'Produto', field: 'produtoNome', align: 'left' as const },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'center' as const },
  { name: 'quantidade', label: 'Quantidade', field: 'quantidade', align: 'right' as const },
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

  filtroUnidadeId.value = typeof unidadeId === 'string' ? unidadeId : null;
  filtroProdutoId.value = typeof produtoId === 'string' ? produtoId : null;
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

async function carregarMovimentacoes(): Promise<void> {
  carregando.value = true;

  try {
    movimentacoes.value = await movimentacaoEstoqueService.listar({
      unidadeId: filtroUnidadeId.value ?? undefined,
      produtoId: filtroProdutoId.value ?? undefined,
      tipo: filtroTipo.value ?? undefined,
      dataInicio: filtroDataInicio.value ? deDataParaInicioDiaIso(filtroDataInicio.value) : undefined,
      dataFim: filtroDataFim.value ? deDataParaFimDiaIso(filtroDataFim.value) : undefined,
      limit: LIMITE_PADRAO,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function limparFiltros(): void {
  filtroUnidadeId.value = null;
  filtroProdutoId.value = null;
  filtroTipo.value = null;
  filtroDataInicio.value = '';
  filtroDataFim.value = '';

  if (route.query.unidadeId || route.query.produtoId) {
    void router.replace({ name: 'movimentacoes-estoque' });
  }

  void carregarMovimentacoes();
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
    void carregarMovimentacoes();
  },
);

onMounted(async () => {
  aplicarFiltrosDaUrl();
  await carregarFiltros();
  await carregarMovimentacoes();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Movimentações de estoque"
      subtitulo="Histórico de entradas, saídas, ajustes e perdas."
    />

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
              @update:model-value="carregarMovimentacoes"
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
              @update:model-value="carregarMovimentacoes"
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
          texto="Ajuste os filtros ou registre entradas e saídas manualmente."
        />
      </q-card-section>
    </q-card>

    <app-entity-details-dialog
      v-model="dialogVisualizar"
      titulo="Detalhar movimentação"
      :registro="movimentacaoSelecionada"
    />
  </q-page>
</template>
