<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { isRequisicaoCancelada, useBuscaRemota } from '@/composables/useBuscaRemota';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import { unidadeService } from '@/services/unidade.service';
import type { SaldoEstoque } from '@/types/entidades/saldo-estoque';
import {
  formatarSaldoComUnidade,
  obterChaveSaldoEstoque,
} from '@/types/entidades/saldo-estoque';
import {
  formatarOrigemMovimentacao,
  obterCorOrigemEntrada,
} from '@/types/entidades/movimentacao-estoque';

const LIMITE_BUSCA = 20;
const MIN_CARACTERES_BUSCA = 2;

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const saldos = ref<SaldoEstoque[]>([]);
const carregando = ref(true);
const termoBusca = ref('');
const filtroUnidadeId = ref<string | null>(null);
const filtroProdutoId = ref<string | null>(null);
const apenasAbaixoDoMinimo = ref(false);
const dialogVisualizar = ref(false);
const saldoSelecionado = ref<SaldoEstoque | null>(null);

const colunas = [
  { name: 'unidade', label: 'Unidade', field: 'unidadeNome', align: 'left' as const, sortable: true },
  { name: 'produto', label: 'Produto', field: 'produtoNome', align: 'left' as const, sortable: true },
  { name: 'estoqueMinimo', label: 'Mínimo', field: 'estoqueMinimo', align: 'right' as const },
  { name: 'saldoAtual', label: 'Saldo atual', field: 'saldoAtual', align: 'right' as const, sortable: true },
  { name: 'valorUnitario', label: 'Valor unitário', field: 'valorUnitario', align: 'right' as const },
  { name: 'valorEstoque', label: 'Valor em estoque', field: 'valorEstoque', align: 'right' as const, sortable: true },
  { name: 'origensEntrada', label: 'Origem', field: 'origensEntrada', align: 'left' as const },
  { name: 'status', label: 'Situação', field: 'abaixoDoMinimo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

const opcoesUnidadesFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todas as unidades', value: null },
]);

const opcoesProdutosFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todos os produtos', value: null },
]);

const totalProdutos = computed(() => new Set(saldos.value.map((saldo) => saldo.produtoId)).size);
const totalUnidades = computed(() => new Set(saldos.value.map((saldo) => saldo.unidadeId)).size);
const itensSemPreco = computed(
  () => saldos.value.filter((saldo) => !saldo.valorUnitario || saldo.valorUnitario <= 0).length,
);
const valorTotalEstoque = computed(() =>
  saldos.value.reduce((total, saldo) => total + obterValorEstoque(saldo), 0),
);
const valorTotalEstoqueFormatado = computed(() => formatarMoeda(valorTotalEstoque.value));

const ajudaValorTotalEstoque =
  'Soma do valor em estoque de cada item da listagem (saldo atual × valor unitário). O valor unitário prioriza o último pedido ao fornecedor recebido; se não houver compra, usa o valor cadastrado no produto. Os filtros da tela entram no cálculo.';

async function buscarSaldos(termo: string, signal?: AbortSignal): Promise<void> {
  const termoNormalizado = termo.trim();
  const usarBusca = termoNormalizado.length >= MIN_CARACTERES_BUSCA;

  saldos.value = await saldoEstoqueService.listar({
    unidadeId: filtroUnidadeId.value ?? undefined,
    produtoId: filtroProdutoId.value ?? undefined,
    abaixoDoMinimo: apenasAbaixoDoMinimo.value || undefined,
    search: usarBusca ? termoNormalizado : undefined,
    limit: usarBusca ? LIMITE_BUSCA : undefined,
    signal,
  });
}

async function carregarSaldos(): Promise<void> {
  carregando.value = true;

  try {
    await buscarSaldos(termoBusca.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

useBuscaRemota(
  termoBusca,
  async (termo, signal) => {
    carregando.value = true;

    try {
      await buscarSaldos(termo, signal);
    } catch (error) {
      if (!isRequisicaoCancelada(error)) {
        notificacao.erro(obterMensagem(error));
      }
    } finally {
      carregando.value = false;
    }
  },
  { minCaracteres: MIN_CARACTERES_BUSCA, debounceMs: 300 },
);

async function carregarFiltros(): Promise<void> {
  try {
    const [listaUnidades, listaProdutos] = await Promise.all([
      unidadeService.listar(true),
      produtoService.listar({ includeInactive: true }),
    ]);

    opcoesUnidadesFiltro.value = [
      { label: 'Todas as unidades', value: null },
      ...listaUnidades.map((unidade) => ({
        label: unidade.ativo ? unidade.nome : `${unidade.nome} (inativa)`,
        value: unidade.id,
      })),
    ];

    opcoesProdutosFiltro.value = [
      { label: 'Todos os produtos', value: null },
      ...listaProdutos.map((produto) => ({
        label: produto.ativo ? produto.nome : `${produto.nome} (inativo)`,
        value: produto.id,
      })),
    ];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

function verMovimentacoes(saldo: SaldoEstoque): void {
  router.push({
    name: 'movimentacoes-estoque',
    query: {
      unidadeId: saldo.unidadeId,
      produtoId: saldo.produtoId,
    },
  });
}

function abrirDialogVisualizar(saldo: SaldoEstoque): void {
  saldoSelecionado.value = saldo;
  dialogVisualizar.value = true;
}

function obterValorEstoque(saldo: SaldoEstoque): number {
  if (Number.isFinite(saldo.valorEstoque)) {
    return saldo.valorEstoque;
  }

  return saldo.saldoAtual * (saldo.valorUnitario ?? 0);
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  });
}

onMounted(async () => {
  await carregarFiltros();
  await carregarSaldos();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Saldos de estoque"
      subtitulo="Saldo atual por unidade e produto, calculado a partir das movimentações."
    />

    <section class="estoque-summary q-mb-md">
      <div class="col-summary">
        <app-metric-card
          label="Valor total do estoque"
          icon="payments"
          :valor="valorTotalEstoqueFormatado"
          :hint="ajudaValorTotalEstoque"
        />
      </div>
      <div class="col-summary">
        <app-metric-card
          label="Unidades"
          icon="apartment"
          :valor="totalUnidades.toLocaleString('pt-BR')"
        />
      </div>
      <div class="col-summary">
        <app-metric-card
          label="Itens"
          icon="inventory_2"
          :valor="totalProdutos.toLocaleString('pt-BR')"
        />
      </div>
      <div class="col-summary">
        <app-metric-card
          label="Sem preço"
          icon="money_off"
          :valor="itensSemPreco.toLocaleString('pt-BR')"
        />
      </div>
    </section>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-4">
            <q-input
              v-model="termoBusca"
              label="Buscar por produto"
              outlined
              dense
              clearable
              :loading="carregando"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="filtroUnidadeId"
              :options="opcoesUnidadesFiltro"
              label="Unidade"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarSaldos"
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
              @update:model-value="carregarSaldos"
            />
          </div>
          <div class="col-12 col-md-2">
            <q-toggle
              v-model="apenasAbaixoDoMinimo"
              label="Abaixo do mínimo"
              color="primary"
              @update:model-value="carregarSaldos"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="saldos.length > 0"
        :rows="saldos"
        :columns="colunas"
        :row-key="obterChaveSaldoEstoque"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-estoqueMinimo="props">
          <q-td :props="props">
            {{ formatarSaldoComUnidade(props.row.estoqueMinimo, props.row.unidadeMedidaSigla) }}
          </q-td>
        </template>

        <template #body-cell-saldoAtual="props">
          <q-td :props="props">
            <span
              :class="{
                'text-negative text-weight-medium': props.row.saldoAtual < 0,
                'text-warning text-weight-medium': props.row.abaixoDoMinimo && props.row.saldoAtual >= 0,
              }"
            >
              {{ formatarSaldoComUnidade(props.row.saldoAtual, props.row.unidadeMedidaSigla) }}
            </span>
          </q-td>
        </template>

        <template #body-cell-valorUnitario="props">
          <q-td :props="props">
            {{ formatarMoeda(props.row.valorUnitario ?? 0) }}
          </q-td>
        </template>

        <template #body-cell-valorEstoque="props">
          <q-td :props="props">
            {{ formatarMoeda(obterValorEstoque(props.row)) }}
          </q-td>
        </template>

        <template #body-cell-origensEntrada="props">
          <q-td :props="props">
            <div
              v-if="props.row.origensEntrada?.length"
              class="estoque-origens"
            >
              <q-badge
                v-for="origem in props.row.origensEntrada"
                :key="origem"
                :color="obterCorOrigemEntrada(origem)"
                :label="formatarOrigemMovimentacao(origem)"
              />
            </div>
            <span v-else>—</span>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              v-if="props.row.abaixoDoMinimo"
              color="warning"
              label="Abaixo do mínimo"
            />
            <q-badge
              v-else
              color="positive"
              label="OK"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <app-table-actions-menu
              :mostrar-editar="false"
              :mostrar-status="false"
              @visualizar="abrirDialogVisualizar(cell.row)"
            >
              <q-item clickable v-close-popup @click="verMovimentacoes(cell.row)">
                <q-item-section avatar>
                  <q-icon name="history" color="primary" />
                </q-item-section>
                <q-item-section>Ver movimentações</q-item-section>
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
          icon="inventory"
          titulo="Nenhum saldo encontrado"
          texto="Saldos aparecem após movimentações de estoque na unidade e produto."
        />
      </q-card-section>
    </q-card>

    <app-entity-details-dialog
      v-model="dialogVisualizar"
      titulo="Detalhar saldo"
      :registro="saldoSelecionado"
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

.estoque-origens {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
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

.text-warning {
  color: var(--ds-color-warning-600);
}

.text-negative {
  color: var(--ds-color-error-600);
}
</style>
