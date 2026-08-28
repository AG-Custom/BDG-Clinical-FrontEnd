<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import LoteEstoqueDetalheDialog from '@/components/estoque/LoteEstoqueDetalheDialog.vue';
import { isRequisicaoCancelada } from '@/composables/useBuscaRemota';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import { unidadeService } from '@/services/unidade.service';
import type { SaldoLoteEstoque } from '@/types/entidades/saldo-estoque';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import {
  formatarSaldoEmbalagem,
  validadeProxima,
} from '@/utils/lote-estoque';
import { compararTextoPt, ordenarPorUnidadeNome } from '@/utils/ordenar-listagem';

const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const lotes = ref<SaldoLoteEstoque[]>([]);
const carregando = ref(true);
const termoBusca = ref('');
const filtroUnidadeId = ref<string | null>(null);
const filtroProdutoId = ref<string | null>(null);
const embalagemPorProdutoId = ref(new Map<string, string>());
const dialogDetalhe = ref(false);
const loteSelecionado = ref<SaldoLoteEstoque | null>(null);

let abortController: AbortController | null = null;

const colunas = [
  { name: 'codigo', label: 'Lote', field: 'codigo', align: 'left' as const, sortable: true },
  { name: 'produto', label: 'Produto', field: 'produtoNome', align: 'left' as const, sortable: true },
  { name: 'unidade', label: 'Unidade', field: 'unidadeNome', align: 'left' as const, sortable: true },
  { name: 'dataValidade', label: 'Validade', field: 'dataValidade', align: 'left' as const, sortable: true },
  { name: 'saldoAtual', label: 'Saldo', field: 'saldoAtual', align: 'right' as const, sortable: true },
  { name: 'embalagens', label: 'Embalagens', field: 'saldoEmbalagem', align: 'right' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

const opcoesUnidadesFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todas as unidades', value: null },
]);

const opcoesProdutosFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todos os produtos', value: null },
]);

const lotesFiltrados = computed(() => {
  const termo = termoBusca.value.trim().toLocaleLowerCase('pt-BR');

  if (!termo) {
    return lotes.value;
  }

  return lotes.value.filter((lote) => {
    const codigo = lote.codigo.toLocaleLowerCase('pt-BR');
    const produto = lote.produtoNome.toLocaleLowerCase('pt-BR');
    return codigo.includes(termo) || produto.includes(termo);
  });
});

async function carregarLotes(): Promise<void> {
  abortController?.abort();
  abortController = new AbortController();
  const signal = abortController.signal;

  carregando.value = true;

  try {
    const lista = await saldoEstoqueService.listarLotes({
      unidadeId: filtroUnidadeId.value ?? undefined,
      produtoId: filtroProdutoId.value ?? undefined,
      signal,
    });

    lotes.value = ordenarPorUnidadeNome(lista, (a, b) => {
      const porProduto = compararTextoPt(a.produtoNome, b.produtoNome);
      if (porProduto !== 0) {
        return porProduto;
      }
      return compararTextoPt(a.codigo, b.codigo);
    });
  } catch (error) {
    if (!isRequisicaoCancelada(error)) {
      notificacao.erro(obterMensagem(error));
      lotes.value = [];
    }
  } finally {
    if (!signal.aborted) {
      carregando.value = false;
    }
  }
}

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

    embalagemPorProdutoId.value = new Map(
      listaProdutos
        .filter((produto) => produto.unidadeEmbalagemNome || produto.unidadeEmbalagemSigla)
        .map((produto) => [
          produto.id,
          (produto.unidadeEmbalagemNome ?? produto.unidadeEmbalagemSigla) as string,
        ]),
    );

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

function abrirDetalhe(lote: SaldoLoteEstoque): void {
  loteSelecionado.value = lote;
  dialogDetalhe.value = true;
}

function formatarEmbalagem(lote: SaldoLoteEstoque): string {
  return formatarSaldoEmbalagem(lote, embalagemPorProdutoId.value);
}

watch([filtroUnidadeId, filtroProdutoId], () => {
  void carregarLotes();
});

onMounted(async () => {
  await carregarFiltros();
  await carregarLotes();
});

onUnmounted(() => {
  abortController?.abort();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Lotes"
      subtitulo="Lotes com saldo por produto e unidade, com validade e movimentações."
    />

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-4">
            <q-input
              v-model="termoBusca"
              label="Buscar por lote ou produto"
              outlined
              dense
              clearable
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroUnidadeId"
              :options="opcoesUnidadesFiltro"
              label="Unidade"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroProdutoId"
              :options="opcoesProdutosFiltro"
              label="Produto"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="lotesFiltrados.length > 0"
        :rows="lotesFiltrados"
        :columns="colunas"
        row-key="loteProdutoId"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-dataValidade="props">
          <q-td :props="props">
            {{ props.row.dataValidade }}
            <q-badge
              v-if="validadeProxima(props.row.dataValidade)"
              color="warning"
              label="Próximo"
              class="q-ml-sm"
            />
          </q-td>
        </template>

        <template #body-cell-saldoAtual="props">
          <q-td :props="props">
            {{ formatarSaldoComUnidade(props.row.saldoAtual, props.row.unidadeMedidaSigla) }}
          </q-td>
        </template>

        <template #body-cell-embalagens="props">
          <q-td :props="props">
            {{ formatarEmbalagem(props.row) }}
          </q-td>
        </template>

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <app-table-actions-menu
              :mostrar-editar="false"
              :mostrar-status="false"
              @visualizar="abrirDetalhe(cell.row)"
            />
          </app-table-actions-cell>
        </template>
      </q-table>

      <q-card-section v-else-if="carregando">
        <app-table-skeleton :columns="colunas.length" />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="qr_code_2"
          titulo="Nenhum lote encontrado"
          texto="Lotes com saldo aparecem após entradas de medicamentos com código e validade."
        />
      </q-card-section>
    </q-card>

    <lote-estoque-detalhe-dialog
      v-model="dialogDetalhe"
      :lote-inicial="loteSelecionado"
      apenas-detalhe
      :embalagem-por-produto-id="embalagemPorProdutoId"
    />
  </q-page>
</template>
