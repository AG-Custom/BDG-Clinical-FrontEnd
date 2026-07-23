<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { CODIGOS_TIPO_PRODUTO } from '@/constants/tipos-produto';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { produtoService } from '@/services/produto.service';
import { tipoProdutoService } from '@/services/tipo-produto.service';
import type { Produto } from '@/types/entidades/produto';
import type { TipoProduto } from '@/types/entidades/tipo-produto';
import { formatarMoeda } from '@/types/entidades/pedido-fornecedor';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.produtos.criar);
const podeEditar = usePermissao(permissoes.produtos.editar);
const podeDesativar = usePermissao(permissoes.produtos.desativar);

const produtos = ref<Produto[]>([]);
const tiposProduto = ref<TipoProduto[]>([]);
const carregando = ref(true);
const incluirInativos = ref(false);
const filtroTipoProdutoId = ref<string | null>(null);
const dialogVisualizar = ref(false);
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const produtoSelecionado = ref<Produto | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  {
    name: 'tipoProduto',
    label: 'Tipo',
    field: 'tipoProdutoNome',
    align: 'left' as const,
    sortable: true,
  },
  {
    name: 'unidadeMedida',
    label: 'Unidade de medida',
    field: 'unidadeMedidaSigla',
    align: 'left' as const,
  },
  {
    name: 'estoqueMinimo',
    label: 'Estoque mínimo',
    field: 'estoqueMinimo',
    align: 'right' as const,
    sortable: true,
  },
  {
    name: 'valor',
    label: 'Valor',
    field: 'valor',
    align: 'right' as const,
    sortable: true,
  },
  {
    name: 'controlaEstoque',
    label: 'Controla estoque',
    field: 'controlaEstoque',
    align: 'center' as const,
  },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

function descricaoValorProduto(produto: Produto): string {
  if (
    produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.MEDICAMENTO
    && produto.unidadeEmbalagemNome
  ) {
    return `Valor do ${produto.unidadeEmbalagemNome}`;
  }

  if (produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.MEDICAMENTO) {
    return 'Valor da embalagem';
  }

  return produto.unidadeMedidaSigla
    ? `Valor por ${produto.unidadeMedidaSigla}`
    : 'Valor unitário';
}

const opcoesTiposFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todos os tipos', value: null },
]);

async function carregarTiposProduto(): Promise<void> {
  try {
    tiposProduto.value = await tipoProdutoService.listar(true);
    opcoesTiposFiltro.value = [
      { label: 'Todos os tipos', value: null },
      ...tiposProduto.value.map((tipo) => ({
        label: tipo.ativo ? tipo.nome : `${tipo.nome} (inativo)`,
        value: tipo.id,
      })),
    ];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarProdutos(): Promise<void> {
  carregando.value = true;

  try {
    produtos.value = await produtoService.listar({
      tipoProdutoId: filtroTipoProdutoId.value ?? undefined,
      includeInactive: incluirInativos.value,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogVisualizar(produto: Produto): void {
  produtoSelecionado.value = produto;
  dialogVisualizar.value = true;
}

function abrirDialogDesativar(produto: Produto): void {
  produtoSelecionado.value = produto;
  dialogDesativar.value = true;
}

function abrirDialogReativar(produto: Produto): void {
  produtoSelecionado.value = produto;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!produtoSelecionado.value) {
    return;
  }

  desativando.value = true;

  try {
    await produtoService.desativar(produtoSelecionado.value.id);
    notificacao.sucesso('Produto desativado com sucesso.');
    dialogDesativar.value = false;
    produtoSelecionado.value = null;
    await carregarProdutos();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!produtoSelecionado.value) {
    return;
  }

  reativando.value = true;

  try {
    await produtoService.reativar(produtoSelecionado.value.id);
    notificacao.sucesso('Produto reativado com sucesso.');
    dialogReativar.value = false;
    produtoSelecionado.value = null;
    await carregarProdutos();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarProduto(id: string): void {
  router.push({ name: 'produtos-editar', params: { id } });
}

onMounted(async () => {
  await carregarTiposProduto();
  await carregarProdutos();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Produtos"
      subtitulo="Cadastre produtos físicos para controle de estoque."
    >
      <q-btn
        color="primary"
        label="Novo produto"
        icon="add"
        unelevated
        no-caps
        :disable="!podeCriar"
        :to="podeCriar ? { name: 'produtos-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-6">
            <q-select
              v-model="filtroTipoProdutoId"
              :options="opcoesTiposFiltro"
              label="Filtrar por tipo"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarProdutos"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-toggle
              v-model="incluirInativos"
              label="Incluir inativos"
              color="primary"
              @update:model-value="carregarProdutos"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="produtos.length > 0"
        :rows="produtos"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-nome="props">
          <q-td :props="props">
            <div>{{ props.row.nome }}</div>
            <div v-if="props.row.sku" class="text-caption text-grey-7">
              SKU: {{ props.row.sku }}
            </div>
          </q-td>
        </template>

        <template #body-cell-unidadeMedida="props">
          <q-td :props="props">
            {{ props.row.unidadeMedidaNome }} ({{ props.row.unidadeMedidaSigla }})
          </q-td>
        </template>

        <template #body-cell-estoqueMinimo="props">
          <q-td :props="props">
            {{ props.row.estoqueMinimo }} {{ props.row.unidadeMedidaSigla }}
          </q-td>
        </template>

        <template #header-cell-valor="props">
          <q-th :props="props">
            Valor
            <q-tooltip max-width="260px">
              Medicamento: preço da embalagem. Demais: preço da unidade de estoque.
            </q-tooltip>
          </q-th>
        </template>

        <template #body-cell-valor="props">
          <q-td :props="props">
            {{ formatarMoeda(props.row.valor) }}
            <q-tooltip>{{ descricaoValorProduto(props.row) }}</q-tooltip>
          </q-td>
        </template>

        <template #body-cell-controlaEstoque="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.controlaEstoque !== false ? 'positive' : 'grey'"
              :label="props.row.controlaEstoque !== false ? 'Sim' : 'Não'"
            />
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.ativo ? 'positive' : 'grey'"
              :label="props.row.ativo ? 'Ativo' : 'Inativo'"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <app-table-actions-menu
              :ativo="cell.row.ativo"
              :pode-editar="podeEditar"
              :pode-alterar-status="podeDesativar"
              @visualizar="abrirDialogVisualizar(cell.row)"
              @editar="editarProduto(cell.row.id)"
              @desabilitar="abrirDialogDesativar(cell.row)"
              @ativar="abrirDialogReativar(cell.row)"
            />
          </app-table-actions-cell>
        </template>
      </q-table>

      <q-card-section v-else-if="carregando">
        <app-table-skeleton :columns="colunas.length" />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="inventory_2"
          titulo="Nenhum produto cadastrado"
          texto="Cadastre tipos de produto, unidades de medida e depois registre os itens do estoque."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo produto"
            icon="add"
            unelevated
            no-caps
            :disable="!podeCriar"
            :to="podeCriar ? { name: 'produtos-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <app-entity-details-dialog
      v-model="dialogVisualizar"
      titulo="Detalhar produto"
      :registro="produtoSelecionado"
    />

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar produto</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ produtoSelecionado?.nome }}</strong>?
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" no-caps v-close-popup />
          <q-btn
            flat
            label="Desativar"
            color="negative"
            no-caps
            :loading="desativando"
            @click="confirmarDesativar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogReativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Reativar produto</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ produtoSelecionado?.nome }}</strong>?
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" no-caps v-close-popup />
          <q-btn
            flat
            label="Reativar"
            color="positive"
            no-caps
            :loading="reativando"
            @click="confirmarReativar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
