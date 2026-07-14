<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { fornecedorService } from '@/services/fornecedor.service';
import { pedidoFornecedorService } from '@/services/pedido-fornecedor.service';
import { produtoService } from '@/services/produto.service';
import { unidadeService } from '@/services/unidade.service';
import type { Fornecedor } from '@/types/entidades/fornecedor';
import type {
  AnexoPedidoFornecedor,
  ItemPedidoFormulario,
  PedidoFornecedor,
  StatusPedidoFornecedor,
  TipoPedidoFornecedor,
} from '@/types/entidades/pedido-fornecedor';
import {
  EXTENSOES_ANEXO_PEDIDO,
  STATUS_PEDIDO_EDITAVEL,
  TAMANHO_MAX_ANEXO_PEDIDO,
  TIPOS_PEDIDO_FORNECEDOR,
  calcularValorTotalLinhaItem,
  criarItemPedidoVazio,
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
  formatarMoeda,
  formatarMoedaParaInput,
  formatarTamanhoArquivo,
  montarItemPedidoRequest,
  obterCorStatusPedido,
  parsearMoedaDoInput,
} from '@/types/entidades/pedido-fornecedor';
import type { Produto } from '@/types/entidades/produto';
import type { Unidade } from '@/types/entidades/unidade';

const LIMITE_BUSCA_FORNECEDOR = 20;
const MIN_CARACTERES_BUSCA_FORNECEDOR = 2;

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.pedidosFornecedor.criar);
const podeEditar = usePermissao(permissoes.pedidosFornecedor.editar);
const podeSalvar = computed(() => (isEdicao.value ? podeEditar.value : podeCriar.value));

const carregando = ref(false);
const salvando = ref(false);
const pedidoCarregado = ref<PedidoFornecedor | null>(null);
const fornecedoresDisponiveis = ref<Fornecedor[]>([]);
const fornecedorSelecionado = ref<Fornecedor | null>(null);
const buscandoFornecedor = ref(false);
const unidadesDisponiveis = ref<Unidade[]>([]);
const produtosDisponiveis = ref<Produto[]>([]);
const dadosIniciaisCarregados = ref(false);
const semFornecedores = ref(false);
const anexos = ref<AnexoPedidoFornecedor[]>([]);
const anexosPendentes = ref<File[]>([]);
const arquivosSelecionados = ref<File[] | null>(null);
const enviandoAnexo = ref(false);
const removendoAnexoId = ref<string | null>(null);

let sequenciaBuscaFornecedor = 0;

const isEdicao = computed(() => route.name === 'pedidos-fornecedor-editar');
const pedidoId = computed(() => route.params.id as string | undefined);

const somenteLeitura = computed(() => {
  if (!isEdicao.value || !pedidoCarregado.value) {
    return false;
  }

  return !STATUS_PEDIDO_EDITAVEL.includes(pedidoCarregado.value.status);
});

const form = reactive({
  fornecedorId: null as string | null,
  unidadeId: null as string | null,
  tipoPedido: 'Medicamento' as TipoPedidoFornecedor,
  dataPedido: '',
  status: 'Aberto' as 'Aberto' | 'Pedido',
  observacao: '',
});

const itens = ref<ItemPedidoFormulario[]>([criarItemPedidoVazio()]);

const opcoesTiposPedido = TIPOS_PEDIDO_FORNECEDOR.map((tipo) => ({
  label: tipo,
  value: tipo,
}));

const opcoesStatus = [
  { label: 'Aberto', value: 'Aberto' },
  { label: 'Pedido', value: 'Pedido' },
];

const opcoesFornecedores = computed(() =>
  fornecedoresDisponiveis.value.map((fornecedor) => ({
    label: fornecedor.ativo ? fornecedor.nome : `${fornecedor.nome} (inativo)`,
    value: fornecedor.id,
  })),
);

const opcoesUnidades = computed(() =>
  unidadesDisponiveis.value.map((unidade) => ({
    label: unidade.ativo ? unidade.nome : `${unidade.nome} (inativa)`,
    value: unidade.id,
  })),
);

const opcoesProdutos = computed(() =>
  produtosDisponiveis.value.map((produto) => ({
    label: produto.ativo ? produto.nome : `${produto.nome} (inativo)`,
    value: produto.id,
  })),
);

const produtosPorId = computed(
  () => new Map(produtosDisponiveis.value.map((produto) => [produto.id, produto])),
);

const valorTotalPedido = computed(() =>
  itens.value.reduce((total, item) => total + calcularValorTotalLinhaItem(item), 0),
);

const mostrarAlertaUnidades = computed(
  () =>
    dadosIniciaisCarregados.value &&
    podeSalvar.value &&
    !somenteLeitura.value &&
    opcoesUnidades.value.length === 0,
);

const mostrarAlertaProdutos = computed(
  () =>
    dadosIniciaisCarregados.value &&
    podeSalvar.value &&
    !somenteLeitura.value &&
    opcoesProdutos.value.length === 0,
);

const possuiAnexos = computed(
  () => anexos.value.length > 0 || anexosPendentes.value.length > 0,
);

const podeGerenciarAnexos = computed(() => podeEditar.value);

const mostrarAlertaFornecedores = computed(
  () =>
    dadosIniciaisCarregados.value &&
    podeSalvar.value &&
    !somenteLeitura.value &&
    semFornecedores.value,
);

function validarFornecedor(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o fornecedor';
}

function validarUnidade(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione a unidade';
}

function validarDataPedido(value: string): boolean | string {
  return Boolean(value) || 'Informe a data do pedido';
}

function validarQuantidade(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe a quantidade';
  }

  if (value <= 0) {
    return 'A quantidade deve ser maior que zero';
  }

  return true;
}

function validarProduto(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o produto';
}

function obterSiglaUnidadeMedidaProduto(produtoId: string | null): string {
  if (!produtoId) {
    return '';
  }

  return produtosPorId.value.get(produtoId)?.unidadeMedidaSigla ?? '';
}

function obterValorCadastroProduto(produtoId: string | null): number | null {
  if (!produtoId) {
    return null;
  }

  const valor = produtosPorId.value.get(produtoId)?.valor;

  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return null;
  }

  return valor;
}

function aplicarValorCadastroProduto(item: ItemPedidoFormulario): void {
  item.modoValor = 'unitario';
  item.valorUnitario = obterValorCadastroProduto(item.produtoId);
  item.valorTotal = null;
}

function aoSelecionarProduto(item: ItemPedidoFormulario): void {
  item.alterarValor = false;
  aplicarValorCadastroProduto(item);
}

function aoAlternarAlterarValor(item: ItemPedidoFormulario, alterar: boolean): void {
  item.alterarValor = alterar;

  if (!alterar) {
    aplicarValorCadastroProduto(item);
  }
}

function atualizarValorUnitarioItem(item: ItemPedidoFormulario, texto: string): void {
  item.modoValor = 'unitario';
  item.valorUnitario = parsearMoedaDoInput(texto);
  item.valorTotal = null;
}

function obterTotalLinhaFormatado(item: ItemPedidoFormulario): string {
  const totalLinha = calcularValorTotalLinhaItem(item);

  if (!item.quantidade || item.valorUnitario === null) {
    return '—';
  }

  return formatarMoeda(totalLinha);
}

function validarValoresItens(): boolean | string {
  for (const [indice, item] of itens.value.entries()) {
    if (item.valorUnitario === null || Number.isNaN(item.valorUnitario)) {
      return `Informe o valor do item ${indice + 1}`;
    }

    if (item.valorUnitario < 0) {
      return `O valor do item ${indice + 1} deve ser maior ou igual a zero`;
    }
  }

  return true;
}

function mesclarFornecedorSelecionado(fornecedores: Fornecedor[]): Fornecedor[] {
  const selecionado = fornecedorSelecionado.value;

  if (selecionado && !fornecedores.some((fornecedor) => fornecedor.id === selecionado.id)) {
    return [selecionado, ...fornecedores];
  }

  return fornecedores;
}

async function buscarFornecedores(termo: string): Promise<Fornecedor[]> {
  const termoNormalizado = termo.trim();
  const usarBusca = termoNormalizado.length >= MIN_CARACTERES_BUSCA_FORNECEDOR;

  return fornecedorService.listar({
    search: usarBusca ? termoNormalizado : undefined,
    limit: LIMITE_BUSCA_FORNECEDOR,
  });
}

function filtrarFornecedores(
  val: string,
  update: (callback: () => void) => void,
  abort: () => void,
): void {
  const termo = val.trim();
  const sequencia = ++sequenciaBuscaFornecedor;

  if (termo.length > 0 && termo.length < MIN_CARACTERES_BUSCA_FORNECEDOR) {
    update(() => {});
    return;
  }

  buscandoFornecedor.value = true;

  void buscarFornecedores(termo)
    .then((fornecedores) => {
      if (sequencia !== sequenciaBuscaFornecedor) {
        return;
      }

      update(() => {
        fornecedoresDisponiveis.value = mesclarFornecedorSelecionado(fornecedores);
      });
    })
    .catch((error) => {
      if (sequencia !== sequenciaBuscaFornecedor) {
        return;
      }

      notificacao.erro(obterMensagem(error));
      abort();
    })
    .finally(() => {
      if (sequencia === sequenciaBuscaFornecedor) {
        buscandoFornecedor.value = false;
      }
    });
}

function atualizarFornecedorSelecionado(fornecedorId: string | null): void {
  if (!fornecedorId) {
    fornecedorSelecionado.value = null;
    return;
  }

  const encontrado = fornecedoresDisponiveis.value.find(
    (fornecedor) => fornecedor.id === fornecedorId,
  );

  if (encontrado) {
    fornecedorSelecionado.value = encontrado;
  }
}

function adicionarItem(): void {
  itens.value.push(criarItemPedidoVazio());
}

function removerItem(indice: number): void {
  if (itens.value.length <= 1) {
    return;
  }

  itens.value.splice(indice, 1);
}

function validarItensUnicos(): boolean | string {
  const ids = itens.value
    .map((item) => item.produtoId)
    .filter((id): id is string => Boolean(id));

  const unicos = new Set(ids);

  if (ids.length !== unicos.size) {
    return 'Não é permitido repetir o mesmo produto no pedido';
  }

  return true;
}

function montarPayload() {
  return {
    fornecedorId: form.fornecedorId as string,
    unidadeId: form.unidadeId as string,
    tipoPedido: form.tipoPedido,
    dataPedido: deInputDatetimeLocalParaIso(form.dataPedido),
    status: form.status,
    observacao: form.observacao.trim() || null,
    itens: itens.value.map((item) => montarItemPedidoRequest(item)),
  };
}

async function garantirFornecedorNaLista(fornecedorId: string): Promise<void> {
  if (fornecedoresDisponiveis.value.some((fornecedor) => fornecedor.id === fornecedorId)) {
    return;
  }

  try {
    const fornecedor = await fornecedorService.obter(fornecedorId);
    fornecedorSelecionado.value = fornecedor;
    fornecedoresDisponiveis.value = [fornecedor];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function garantirProdutosDosItens(produtoIds: string[]): Promise<void> {
  const faltantes = produtoIds.filter(
    (id) => !produtosDisponiveis.value.some((produto) => produto.id === id),
  );

  if (faltantes.length === 0) {
    return;
  }

  try {
    const produtos = await Promise.all(faltantes.map((id) => produtoService.obter(id)));
    produtosDisponiveis.value = [...produtos, ...produtosDisponiveis.value];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarDadosIniciais(): Promise<void> {
  try {
    const [unidades, produtos, fornecedores] = await Promise.all([
      unidadeService.listar(false),
      produtoService.listar({ includeInactive: false }),
      fornecedorService.listar({ limit: 1 }),
    ]);

    unidadesDisponiveis.value = unidades;
    produtosDisponiveis.value = produtos;
    semFornecedores.value = fornecedores.length === 0;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function recarregarDependencias(): Promise<void> {
  await carregarDadosIniciais();
}

async function carregarPedido(): Promise<void> {
  if (!isEdicao.value || !pedidoId.value) {
    return;
  }

  carregando.value = true;

  try {
    const pedido = await pedidoFornecedorService.obter(pedidoId.value);
    pedidoCarregado.value = pedido;

    form.fornecedorId = pedido.fornecedorId;
    form.unidadeId = pedido.unidadeId;
    form.tipoPedido = pedido.tipoPedido;
    form.dataPedido = deIsoParaInputDatetimeLocal(pedido.dataPedido);
    form.status = STATUS_PEDIDO_EDITAVEL.includes(pedido.status)
      ? (pedido.status as 'Aberto' | 'Pedido')
      : 'Aberto';
    form.observacao = pedido.observacao ?? '';
    anexos.value = pedido.anexos ?? [];

    itens.value = pedido.itens.map((item) => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      modoValor: 'unitario' as const,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
      alterarValor: false,
    }));

    await Promise.all([
      garantirFornecedorNaLista(pedido.fornecedorId),
      garantirProdutosDosItens(pedido.itens.map((item) => item.produtoId)),
    ]);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'pedidos-fornecedor' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  const validacaoItens = validarItensUnicos();

  if (typeof validacaoItens === 'string') {
    notificacao.erro(validacaoItens);
    return;
  }

  const validacaoValores = validarValoresItens();

  if (typeof validacaoValores === 'string') {
    notificacao.erro(validacaoValores);
    return;
  }

  salvando.value = true;

  try {
    const payload = montarPayload();

    if (isEdicao.value && pedidoId.value) {
      await pedidoFornecedorService.atualizar(pedidoId.value, payload);
      notificacao.sucesso('Pedido atualizado com sucesso.');
      await router.push({ name: 'pedidos-fornecedor' });
      return;
    }

    await pedidoFornecedorService.criar(payload, anexosPendentes.value);
    const quantidadeAnexos = anexosPendentes.value.length;

    notificacao.sucesso(
      quantidadeAnexos > 0
        ? `Pedido cadastrado com ${quantidadeAnexos} anexo(s).`
        : 'Pedido cadastrado com sucesso.',
    );
    await router.push({ name: 'pedidos-fornecedor' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'pedidos-fornecedor' });
}

function definirDataAtual(): void {
  if (!form.dataPedido) {
    form.dataPedido = deIsoParaInputDatetimeLocal(new Date().toISOString());
  }
}

function aoRejeitarAnexo(rejeitados: { failedPropValidation: string }[]): void {
  if (rejeitados.some((item) => item.failedPropValidation === 'max-file-size')) {
    notificacao.erro('Cada arquivo deve ter no máximo 10 MB.');
    return;
  }

  notificacao.erro('Formato de arquivo não suportado.');
}

function removerAnexoPendente(indice: number): void {
  anexosPendentes.value.splice(indice, 1);
}

async function aoSelecionarArquivos(arquivos: File | File[] | null): Promise<void> {
  if (!arquivos || !podeGerenciarAnexos.value) {
    return;
  }

  const lista = Array.isArray(arquivos) ? arquivos : [arquivos];

  if (!isEdicao.value || !pedidoId.value) {
    anexosPendentes.value = [...anexosPendentes.value, ...lista];
    arquivosSelecionados.value = null;
    return;
  }

  enviandoAnexo.value = true;

  try {
    const enviados = await Promise.all(
      lista.map((arquivo) => pedidoFornecedorService.enviarAnexo(pedidoId.value!, arquivo)),
    );

    anexos.value = [...anexos.value, ...enviados];

    notificacao.sucesso(
      enviados.length === 1
        ? 'Anexo enviado com sucesso.'
        : `${enviados.length} anexos enviados com sucesso.`,
    );
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    enviandoAnexo.value = false;
    arquivosSelecionados.value = null;
  }
}

async function removerAnexo(anexo: AnexoPedidoFornecedor): Promise<void> {
  if (!pedidoId.value) {
    return;
  }

  removendoAnexoId.value = anexo.id;

  try {
    await pedidoFornecedorService.removerAnexo(pedidoId.value, anexo.id);
    anexos.value = anexos.value.filter((item) => item.id !== anexo.id);
    notificacao.sucesso('Anexo removido com sucesso.');
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    removendoAnexoId.value = null;
  }
}

onMounted(async () => {
  definirDataAtual();
  await carregarDadosIniciais();
  await carregarPedido();
});
</script>

<template>
  <q-page class="page-content page-content--form-wide q-pa-md">
    <app-page-header
      :titulo="
        isEdicao
          ? somenteLeitura
            ? 'Visualizar pedido'
            : 'Editar pedido'
          : 'Novo pedido'
      "
      :subtitulo="
        isEdicao
          ? somenteLeitura
            ? 'Dados do pedido bloqueados para edição. Anexos podem ser gerenciados abaixo.'
            : 'Atualize os dados do pedido de compra.'
          : 'Registre um pedido de compra ao fornecedor.'
      "
    >
      <q-badge
        v-if="pedidoCarregado"
        :color="obterCorStatusPedido(pedidoCarregado.status as StatusPedidoFornecedor)"
        :label="pedidoCarregado.status"
      />
    </app-page-header>

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <section class="pedido-secao">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Dados do pedido</div>

            <app-form-dependencia-alerta
              v-if="mostrarAlertaFornecedores"
              mensagem="Nenhum fornecedor cadastrado. Cadastre um fornecedor para registrar o pedido."
              rotulo-acao="Cadastrar fornecedor"
              :destino="{ name: 'fornecedores-novo' }"
              @atualizar="recarregarDependencias"
            />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-select
                  v-model="form.fornecedorId"
                  class="form-field--required"
                  :options="opcoesFornecedores"
                  label="Fornecedor"
                  outlined
                  emit-value
                  map-options
                  use-input
                  input-debounce="300"
                  options-dense
                  :loading="buscandoFornecedor"
                  :rules="[validarFornecedor]"
                  :disable="!podeSalvar || somenteLeitura"
                  hint="Abra o select ou digite para buscar (mín. 2 caracteres)"
                  @filter="filtrarFornecedores"
                  @update:model-value="atualizarFornecedorSelecionado"
                >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{
                          buscandoFornecedor
                            ? 'Buscando...'
                            : 'Nenhum fornecedor encontrado. Digite ao menos 2 caracteres.'
                        }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-md-6">
                <q-select
                  v-model="form.unidadeId"
                  class="form-field--required"
                  :options="opcoesUnidades"
                  label="Unidade"
                  outlined
                  emit-value
                  map-options
                  :rules="[validarUnidade]"
                  :disable="!podeSalvar || somenteLeitura || opcoesUnidades.length === 0"
                />
                <app-form-dependencia-alerta
                  v-if="mostrarAlertaUnidades"
                  mensagem="Nenhuma unidade cadastrada. Cadastre uma unidade para registrar o pedido."
                  rotulo-acao="Cadastrar unidade"
                  :destino="{ name: 'unidades-nova' }"
                  @atualizar="recarregarDependencias"
                />
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-select
                  v-model="form.tipoPedido"
                  :options="opcoesTiposPedido"
                  label="Tipo do pedido"
                  outlined
                  emit-value
                  map-options
                  :disable="!podeSalvar || somenteLeitura"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="form.dataPedido"
                  class="form-field--required"
                  label="Data do pedido"
                  outlined
                  type="datetime-local"
                  :readonly="!podeSalvar || somenteLeitura"
                  :rules="[validarDataPedido]"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-select
                  v-model="form.status"
                  :options="opcoesStatus"
                  label="Status"
                  outlined
                  emit-value
                  map-options
                  :disable="!podeSalvar || somenteLeitura"
                />
              </div>
            </div>

            <q-input
              v-model="form.observacao"
              label="Observação"
              outlined
              type="textarea"
              autogrow
              :readonly="!podeSalvar || somenteLeitura"
            />
          </section>

          <q-separator />

          <section class="pedido-secao">
            <div class="pedido-secao__cabecalho">
              <div class="text-subtitle1 text-weight-medium">Itens do pedido</div>
              <q-btn
                v-if="!somenteLeitura"
                flat
                color="primary"
                icon="add"
                label="Adicionar item"
                no-caps
                :disable="!podeSalvar || opcoesProdutos.length === 0"
                @click="adicionarItem"
              />
            </div>

            <app-form-dependencia-alerta
              v-if="mostrarAlertaProdutos"
              mensagem="Nenhum produto cadastrado. Cadastre produtos antes de adicionar itens ao pedido."
              rotulo-acao="Cadastrar produto"
              :destino="{ name: 'produtos-novo' }"
              @atualizar="recarregarDependencias"
            />

            <div
              v-for="(item, indice) in itens"
              :key="indice"
              class="pedido-item"
            >
              <div class="row q-col-gutter-md items-start">
                <div class="col-12 col-md-4">
                  <q-select
                    v-model="item.produtoId"
                    class="form-field--required"
                    :options="opcoesProdutos"
                    label="Produto"
                    outlined
                    dense
                    emit-value
                    map-options
                    options-dense
                    :rules="[validarProduto]"
                    :disable="!podeSalvar || somenteLeitura || opcoesProdutos.length === 0"
                    @update:model-value="aoSelecionarProduto(item)"
                  />
                </div>

                <div class="col-4 col-md-2">
                  <q-input
                    v-model.number="item.quantidade"
                    class="form-field--required"
                    label="Qtd"
                    outlined
                    dense
                    type="number"
                    min="1"
                    step="1"
                    :readonly="!podeSalvar || somenteLeitura"
                    :rules="[validarQuantidade]"
                    :suffix="obterSiglaUnidadeMedidaProduto(item.produtoId)"
                  />
                </div>

                <div class="col-8 col-md-3">
                  <q-input
                    :model-value="formatarMoedaParaInput(item.valorUnitario)"
                    label="Valor un."
                    outlined
                    dense
                    inputmode="numeric"
                    prefix="R$"
                    :disable="somenteLeitura || !podeSalvar || !item.alterarValor"
                    @update:model-value="atualizarValorUnitarioItem(item, String($event ?? ''))"
                  />
                  <q-checkbox
                    v-if="!somenteLeitura"
                    :model-value="item.alterarValor"
                    class="pedido-item__alterar-valor"
                    label="Alterar valor"
                    dense
                    size="xs"
                    :disable="!podeSalvar || !item.produtoId"
                    @update:model-value="aoAlternarAlterarValor(item, Boolean($event))"
                  />
                </div>

                <div class="col-10 col-md-2">
                  <q-input
                    :model-value="obterTotalLinhaFormatado(item)"
                    label="Total"
                    outlined
                    dense
                    readonly
                  />
                </div>

                <div class="col-2 col-md-1 flex items-start justify-end q-pt-sm">
                  <app-table-action-button
                    v-if="!somenteLeitura && itens.length > 1"
                    acao="excluir"
                    rotulo="Remover item"
                    :disable="!podeSalvar"
                    @click="removerItem(indice)"
                  />
                </div>
              </div>
            </div>

            <div class="pedido-total">
              Total: <strong>{{ formatarMoeda(valorTotalPedido) }}</strong>
            </div>
          </section>

          <q-separator />

          <section class="pedido-secao">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Anexos</div>

          <q-list
            v-if="anexos.length > 0"
            bordered
            separator
            class="q-mb-md rounded-borders"
          >
            <q-item v-for="anexo in anexos" :key="anexo.id">
              <q-item-section avatar>
                <q-icon name="attach_file" color="primary" />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ anexo.nomeArquivo }}</q-item-label>
                <q-item-label caption>
                  {{ formatarTamanhoArquivo(anexo.tamanhoBytes) }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <div class="row items-center q-gutter-xs">
                  <q-btn
                    flat
                    color="primary"
                    icon="open_in_new"
                    label="Abrir"
                    no-caps
                    :href="anexo.url"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                  <app-table-action-button
                    v-if="podeGerenciarAnexos"
                    acao="excluir"
                    rotulo="Remover anexo"
                    :disable="removendoAnexoId === anexo.id"
                    :loading="removendoAnexoId === anexo.id"
                    @click="removerAnexo(anexo)"
                  />
                </div>
              </q-item-section>
            </q-item>
          </q-list>

          <q-list
            v-if="anexosPendentes.length > 0"
            bordered
            separator
            class="q-mb-md rounded-borders"
          >
            <q-item
              v-for="(arquivo, indice) in anexosPendentes"
              :key="`${arquivo.name}-${arquivo.size}-${indice}`"
            >
              <q-item-section avatar>
                <q-icon name="schedule" color="primary" />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ arquivo.name }}</q-item-label>
                <q-item-label caption>
                  {{ formatarTamanhoArquivo(arquivo.size) }} · será enviado ao salvar
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <app-table-action-button
                  v-if="podeGerenciarAnexos"
                  acao="excluir"
                  rotulo="Remover da lista"
                  @click="removerAnexoPendente(indice)"
                />
              </q-item-section>
            </q-item>
          </q-list>

          <p v-if="!possuiAnexos" class="pedido-anexos__vazio text-body2 q-mb-md">
            Nenhum anexo vinculado a este pedido.
          </p>

          <div v-if="podeGerenciarAnexos" class="pedido-anexos__upload">
            <q-file
              v-model="arquivosSelecionados"
              label="Selecionar arquivo(s)"
              outlined
              multiple
              clearable
              :accept="EXTENSOES_ANEXO_PEDIDO"
              :max-file-size="TAMANHO_MAX_ANEXO_PEDIDO"
              :disable="enviandoAnexo"
              @update:model-value="aoSelecionarArquivos"
              @rejected="aoRejeitarAnexo"
            >
              <template #prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>

            <p class="pedido-anexos__hint">
              PDF, PNG, JPEG, WebP, DOC, DOCX, XLS ou XLSX. Máximo 10 MB por arquivo.
              {{
                isEdicao
                  ? 'Os arquivos são enviados imediatamente.'
                  : 'Os arquivos serão enviados junto com o pedido ao salvar.'
              }}
            </p>
          </div>
          </section>

          <div class="pedido-acoes">
            <q-btn
              v-if="!somenteLeitura"
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!podeSalvar || opcoesProdutos.length === 0"
            />
            <q-btn flat label="Voltar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped lang="scss">
.pedido-secao {
  display: grid;
  gap: var(--ds-space-3);
}

.pedido-secao__cabecalho {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3);
}

.pedido-item {
  padding-bottom: var(--ds-space-3);
  border-bottom: 1px solid var(--ds-border-default);
}

.pedido-item:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.pedido-item__alterar-valor {
  margin-top: var(--ds-space-1);
}

.pedido-total {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: var(--ds-space-2);
  color: var(--ds-text-secondary);
}

.pedido-total strong {
  color: var(--ds-text-primary);
  font-size: var(--ds-font-size-lg, 1.125rem);
}

.pedido-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}

.pedido-anexos__vazio {
  margin: 0;
  color: var(--ds-text-secondary);
}

.pedido-anexos__hint {
  margin: var(--ds-space-2) 0 0;
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm, 0.8125rem);
}
</style>
