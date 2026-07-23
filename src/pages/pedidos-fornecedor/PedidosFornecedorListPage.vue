<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { CODIGOS_TIPO_PRODUTO } from '@/constants/tipos-produto';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { fornecedorService } from '@/services/fornecedor.service';
import { pedidoFornecedorService } from '@/services/pedido-fornecedor.service';
import { produtoService } from '@/services/produto.service';
import { unidadeService } from '@/services/unidade.service';
import type { Fornecedor } from '@/types/entidades/fornecedor';
import type { PedidoFornecedor, StatusPedidoFornecedor } from '@/types/entidades/pedido-fornecedor';
import {
  STATUS_PEDIDO_EDITAVEL,
  STATUS_PEDIDO_FORNECEDOR,
  formatarDataPedido,
  formatarMoeda,
  obterCorStatusPedido,
  obterResumoItensPedido,
  obterTooltipItensPedido,
  possuiTooltipItensPedido,
} from '@/types/entidades/pedido-fornecedor';
import type { Produto } from '@/types/entidades/produto';
import type { Unidade } from '@/types/entidades/unidade';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.pedidosFornecedor.criar);
const podeEditar = usePermissao(permissoes.pedidosFornecedor.editar);
const podeReceber = usePermissao(permissoes.pedidosFornecedor.receber);

const pedidos = ref<PedidoFornecedor[]>([]);
const fornecedores = ref<Fornecedor[]>([]);
const unidades = ref<Unidade[]>([]);
const produtosPorId = ref(new Map<string, Produto>());
const carregando = ref(true);
const filtroStatus = ref<StatusPedidoFornecedor | null>(null);
const filtroFornecedorId = ref<string | null>(null);
const filtroUnidadeId = ref<string | null>(null);
const dialogVisualizar = ref(false);
const dialogCancelar = ref(false);
const dialogReceber = ref(false);
const pedidoSelecionado = ref<PedidoFornecedor | null>(null);
const cancelando = ref(false);
const recebendo = ref(false);
const lotesRecebimento = ref<
  Record<string, { loteCodigo: string; dataValidade: string; quantidadeEmbalagem: number | null }>
>({});

const itensMedicamentoRecebimento = computed(() => {
  if (!pedidoSelecionado.value) {
    return [];
  }

  return pedidoSelecionado.value.itens.filter((item) => {
    const produto = produtosPorId.value.get(item.produtoId);
    return produto?.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.MEDICAMENTO;
  });
});

const colunas = [
  { name: 'dataPedido', label: 'Data', field: 'dataPedido', align: 'left' as const, sortable: true },
  { name: 'fornecedor', label: 'Fornecedor', field: 'fornecedorNome', align: 'left' as const },
  { name: 'unidade', label: 'Unidade', field: 'unidadeNome', align: 'left' as const },
  { name: 'tipoPedido', label: 'Tipo', field: 'tipoPedido', align: 'left' as const },
  { name: 'itens', label: 'Produtos', field: 'itens', align: 'left' as const },
  { name: 'valorTotal', label: 'Valor total', field: 'valorTotal', align: 'right' as const },
  { name: 'status', label: 'Status', field: 'status', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

const opcoesStatusFiltro = [
  { label: 'Todos os status', value: null },
  ...STATUS_PEDIDO_FORNECEDOR.map((status) => ({ label: status, value: status })),
];

const opcoesFornecedoresFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todos os fornecedores', value: null },
]);

const opcoesUnidadesFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todas as unidades', value: null },
]);

function podeEditarPedido(pedido: PedidoFornecedor): boolean {
  return STATUS_PEDIDO_EDITAVEL.includes(pedido.status);
}

async function carregarFiltros(): Promise<void> {
  try {
    const [listaFornecedores, listaUnidades] = await Promise.all([
      fornecedorService.listar({ limit: 50 }),
      unidadeService.listar(true),
    ]);

    fornecedores.value = listaFornecedores;
    unidades.value = listaUnidades;

    opcoesFornecedoresFiltro.value = [
      { label: 'Todos os fornecedores', value: null },
      ...listaFornecedores.map((fornecedor) => ({
        label: fornecedor.ativo ? fornecedor.nome : `${fornecedor.nome} (inativo)`,
        value: fornecedor.id,
      })),
    ];

    opcoesUnidadesFiltro.value = [
      { label: 'Todas as unidades', value: null },
      ...listaUnidades.map((unidade) => ({
        label: unidade.ativo ? unidade.nome : `${unidade.nome} (inativa)`,
        value: unidade.id,
      })),
    ];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarPedidos(): Promise<void> {
  carregando.value = true;

  try {
    pedidos.value = await pedidoFornecedorService.listar({
      status: filtroStatus.value ?? undefined,
      fornecedorId: filtroFornecedorId.value ?? undefined,
      unidadeId: filtroUnidadeId.value ?? undefined,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogCancelar(pedido: PedidoFornecedor): void {
  pedidoSelecionado.value = pedido;
  dialogCancelar.value = true;
}

async function abrirDialogReceber(pedido: PedidoFornecedor): Promise<void> {
  recebendo.value = false;

  try {
    const detalhe = await pedidoFornecedorService.obter(pedido.id);
    pedidoSelecionado.value = detalhe;

    const produtos = await produtoService.listar({ includeInactive: true });
    produtosPorId.value = new Map(produtos.map((produto) => [produto.id, produto]));

    const lotes: typeof lotesRecebimento.value = {};
    for (const item of detalhe.itens) {
      const produto = produtosPorId.value.get(item.produtoId);
      if (produto?.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.MEDICAMENTO) {
        lotes[item.produtoId] = {
          loteCodigo: '',
          dataValidade: '',
          quantidadeEmbalagem: item.quantidade,
        };
      }
    }

    lotesRecebimento.value = lotes;
    dialogReceber.value = true;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function confirmarReceber(): Promise<void> {
  if (!pedidoSelecionado.value) {
    return;
  }

  for (const item of itensMedicamentoRecebimento.value) {
    const lote = lotesRecebimento.value[item.produtoId];
    if (!lote?.loteCodigo?.trim() || !lote.dataValidade) {
      notificacao.erro(`Informe lote e validade para ${item.produtoNome ?? 'o medicamento'}.`);
      return;
    }
  }

  recebendo.value = true;

  try {
    const itens = Object.entries(lotesRecebimento.value).map(([produtoId, lote]) => ({
      produtoId,
      loteCodigo: lote.loteCodigo.trim(),
      dataValidade: lote.dataValidade,
      quantidadeEmbalagem: lote.quantidadeEmbalagem,
    }));

    await pedidoFornecedorService.receber(
      pedidoSelecionado.value.id,
      itens.length > 0 ? { itens } : undefined,
    );
    notificacao.sucesso('Pedido recebido com sucesso. Estoque atualizado.');
    dialogReceber.value = false;
    pedidoSelecionado.value = null;
    lotesRecebimento.value = {};
    await carregarPedidos();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    recebendo.value = false;
  }
}

function abrirDialogVisualizar(pedido: PedidoFornecedor): void {
  pedidoSelecionado.value = pedido;
  dialogVisualizar.value = true;
}

async function confirmarCancelar(): Promise<void> {
  if (!pedidoSelecionado.value) {
    return;
  }

  cancelando.value = true;

  try {
    await pedidoFornecedorService.cancelar(pedidoSelecionado.value.id);
    notificacao.sucesso('Pedido cancelado com sucesso.');
    dialogCancelar.value = false;
    pedidoSelecionado.value = null;
    await carregarPedidos();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    cancelando.value = false;
  }
}

function editarPedido(id: string): void {
  router.push({ name: 'pedidos-fornecedor-editar', params: { id } });
}

onMounted(async () => {
  await carregarFiltros();
  await carregarPedidos();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Pedidos ao fornecedor"
      subtitulo="Gerencie pedidos de compra e recebimento de estoque."
    >
      <q-btn
        color="primary"
        label="Novo pedido"
        icon="add"
        unelevated
        no-caps
        :disable="!podeCriar"
        :to="podeCriar ? { name: 'pedidos-fornecedor-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroStatus"
              :options="opcoesStatusFiltro"
              label="Status"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarPedidos"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroFornecedorId"
              :options="opcoesFornecedoresFiltro"
              label="Fornecedor"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarPedidos"
            />
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
              @update:model-value="carregarPedidos"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="pedidos.length > 0"
        :rows="pedidos"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-dataPedido="props">
          <q-td :props="props">
            {{ formatarDataPedido(props.row.dataPedido) }}
          </q-td>
        </template>

        <template #body-cell-valorTotal="props">
          <q-td :props="props">
            {{ formatarMoeda(props.row.valorTotal) }}
          </q-td>
        </template>

        <template #body-cell-itens="props">
          <q-td :props="props">
            <span
              v-if="possuiTooltipItensPedido(props.row)"
              class="pedidos-list__itens-tooltip"
            >
              {{ obterResumoItensPedido(props.row) }}
              <q-tooltip anchor="top middle" self="bottom middle">
                <span class="pedidos-list__itens-tooltip-text">
                  {{ obterTooltipItensPedido(props.row) }}
                </span>
              </q-tooltip>
            </span>
            <span v-else>{{ obterResumoItensPedido(props.row) }}</span>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="obterCorStatusPedido(props.row.status)"
              :label="props.row.status"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <app-table-actions-menu
              :mostrar-status="podeEditarPedido(cell.row)"
              :pode-editar="podeEditar"
              :pode-alterar-status="podeEditar"
              desabilitar-label="Cancelar"
              @visualizar="abrirDialogVisualizar(cell.row)"
              @editar="editarPedido(cell.row.id)"
              @desabilitar="abrirDialogCancelar(cell.row)"
            >
              <q-item
                v-if="podeEditarPedido(cell.row)"
                clickable
                v-close-popup
                :disable="!podeReceber"
                @click="abrirDialogReceber(cell.row)"
              >
                <q-item-section avatar>
                  <q-icon name="inventory" color="positive" />
                </q-item-section>
                <q-item-section>Receber</q-item-section>
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
          icon="shopping_cart"
          titulo="Nenhum pedido cadastrado"
          texto="Crie pedidos de compra para seus fornecedores."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo pedido"
            icon="add"
            unelevated
            no-caps
            :disable="!podeCriar"
            :to="podeCriar ? { name: 'pedidos-fornecedor-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <app-entity-details-dialog
      v-model="dialogVisualizar"
      titulo="Detalhar pedido"
      :registro="pedidoSelecionado"
    />

    <q-dialog v-model="dialogCancelar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Cancelar pedido</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja cancelar o pedido de
          <strong>{{ pedidoSelecionado?.fornecedorNome }}</strong>?
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Voltar" color="primary" no-caps v-close-popup />
          <q-btn
            flat
            label="Cancelar pedido"
            color="negative"
            no-caps
            :loading="cancelando"
            @click="confirmarCancelar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogReceber" persistent>
      <q-card style="min-width: 420px; max-width: 560px">
        <q-card-section>
          <div class="text-h6">Receber pedido</div>
        </q-card-section>

        <q-card-section>
          Confirmar recebimento do pedido de
          <strong>{{ pedidoSelecionado?.fornecedorNome }}</strong>?
          Será gerada entrada de estoque para cada item.
        </q-card-section>

        <q-card-section v-if="itensMedicamentoRecebimento.length > 0" class="q-gutter-md">
          <div class="text-subtitle2">Lotes dos medicamentos</div>
          <div
            v-for="item in itensMedicamentoRecebimento"
            :key="item.produtoId"
            class="q-gutter-sm"
          >
            <div class="text-body2">{{ item.produtoNome }}</div>
            <q-input
              v-model="lotesRecebimento[item.produtoId].loteCodigo"
              label="Código do lote"
              outlined
              dense
            />
            <q-input
              v-model="lotesRecebimento[item.produtoId].dataValidade"
              label="Validade"
              outlined
              dense
              type="date"
            />
            <q-input
              v-model.number="lotesRecebimento[item.produtoId].quantidadeEmbalagem"
              label="Quantidade (embalagens)"
              outlined
              dense
              type="number"
              min="0"
              step="any"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Voltar" color="primary" no-caps v-close-popup />
          <q-btn
            flat
            label="Confirmar recebimento"
            color="positive"
            no-caps
            :loading="recebendo"
            @click="confirmarReceber"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
.pedidos-list__itens-tooltip {
  cursor: help;
  border-bottom: 1px dashed var(--ds-border-default);
}

.pedidos-list__itens-tooltip-text {
  white-space: pre-line;
}
</style>
