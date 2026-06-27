<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { fornecedorService } from '@/services/fornecedor.service';
import { pedidoFornecedorService } from '@/services/pedido-fornecedor.service';
import { produtoService } from '@/services/produto.service';
import { unidadeService } from '@/services/unidade.service';
import type { Fornecedor } from '@/types/entidades/fornecedor';
import type {
  ItemPedidoFormulario,
  PedidoFornecedor,
  StatusPedidoFornecedor,
  TipoPedidoFornecedor,
} from '@/types/entidades/pedido-fornecedor';
import {
  STATUS_PEDIDO_EDITAVEL,
  TIPOS_PEDIDO_FORNECEDOR,
  calcularValorTotalLinhaItem,
  calcularValorUnitarioDerivado,
  criarItemPedidoVazio,
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
  formatarMoeda,
  formatarMoedaParaInput,
  montarItemPedidoRequest,
  obterCorStatusPedido,
  parsearMoedaDoInput,
} from '@/types/entidades/pedido-fornecedor';
import type { Produto } from '@/types/entidades/produto';
import type { Unidade } from '@/types/entidades/unidade';

const LIMITE_BUSCA_FORNECEDOR = 20;
const MIN_CARACTERES_BUSCA_FORNECEDOR = 2;

const opcoesModoValor = [
  { label: 'Valor por unidade', value: 'unitario' as const },
  { label: 'Valor total', value: 'total' as const },
];

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

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
    isAdmin.value &&
    !somenteLeitura.value &&
    opcoesUnidades.value.length === 0,
);

const mostrarAlertaProdutos = computed(
  () =>
    dadosIniciaisCarregados.value &&
    isAdmin.value &&
    !somenteLeitura.value &&
    opcoesProdutos.value.length === 0,
);

const mostrarAlertaFornecedores = computed(
  () =>
    dadosIniciaisCarregados.value &&
    isAdmin.value &&
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

function validarValorUnitario(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe o valor por unidade';
  }

  if (value < 0) {
    return 'O valor por unidade deve ser maior ou igual a zero';
  }

  return true;
}

function validarValorTotal(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe o valor total';
  }

  if (value < 0) {
    return 'O valor total deve ser maior ou igual a zero';
  }

  return true;
}

function validarProduto(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o produto';
}

function obterSiglaUnidadeMedidaProduto(produtoId: string | null): string {
  if (!produtoId) {
    return '—';
  }

  return produtosPorId.value.get(produtoId)?.unidadeMedidaSigla ?? '—';
}

function atualizarValorMoedaItem(
  item: ItemPedidoFormulario,
  campo: 'unitario' | 'total',
  texto: string,
): void {
  const valor = parsearMoedaDoInput(texto);

  if (campo === 'unitario') {
    item.valorUnitario = valor;
    return;
  }

  item.valorTotal = valor;
}

function obterResumoValoresItem(item: ItemPedidoFormulario): string {
  const totalLinha = calcularValorTotalLinhaItem(item);
  const unitario =
    item.modoValor === 'unitario'
      ? item.valorUnitario
      : calcularValorUnitarioDerivado(item);

  const unitarioTexto =
    unitario !== null && unitario !== undefined && !Number.isNaN(unitario)
      ? formatarMoeda(unitario)
      : '—';
  const totalTexto =
    totalLinha > 0 ||
    item.valorTotal !== null ||
    item.valorUnitario !== null
      ? formatarMoeda(totalLinha)
      : '—';

  return `${unitarioTexto}/un · Total ${totalTexto}`;
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

function alternarModoValor(item: ItemPedidoFormulario, modo: 'unitario' | 'total'): void {
  if (item.modoValor === modo) {
    return;
  }

  const quantidade = item.quantidade;

  if (
    modo === 'total' &&
    quantidade &&
    quantidade > 0 &&
    item.valorUnitario !== null &&
    item.valorUnitario !== undefined
  ) {
    item.valorTotal = item.valorUnitario * quantidade;
  } else if (
    modo === 'unitario' &&
    quantidade &&
    quantidade > 0 &&
    item.valorTotal !== null &&
    item.valorTotal !== undefined
  ) {
    item.valorUnitario = item.valorTotal / quantidade;
  } else if (modo === 'total') {
    item.valorUnitario = null;
  } else {
    item.valorTotal = null;
  }

  item.modoValor = modo;
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

    itens.value = pedido.itens.map((item) => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      modoValor: 'unitario' as const,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
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

  salvando.value = true;

  try {
    const payload = montarPayload();

    if (isEdicao.value && pedidoId.value) {
      await pedidoFornecedorService.atualizar(pedidoId.value, payload);
      notificacao.sucesso('Pedido atualizado com sucesso.');
    } else {
      await pedidoFornecedorService.criar(payload);
      notificacao.sucesso('Pedido cadastrado com sucesso.');
    }

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
            ? 'Pedido finalizado — somente visualização.'
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
                :disable="!isAdmin || somenteLeitura"
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
                :disable="!isAdmin || somenteLeitura || opcoesUnidades.length === 0"
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
                :disable="!isAdmin || somenteLeitura"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.dataPedido"
                class="form-field--required"
                label="Data do pedido"
                outlined
                type="datetime-local"
                :readonly="!isAdmin || somenteLeitura"
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
                :disable="!isAdmin || somenteLeitura"
              />
            </div>
          </div>

          <q-input
            v-model="form.observacao"
            label="Observação"
            outlined
            type="textarea"
            autogrow
            :readonly="!isAdmin || somenteLeitura"
          />

          <q-separator class="q-my-md" />

          <app-form-dependencia-alerta
            v-if="mostrarAlertaProdutos"
            mensagem="Nenhum produto cadastrado. Cadastre produtos antes de adicionar itens ao pedido."
            rotulo-acao="Cadastrar produto"
            :destino="{ name: 'produtos-novo' }"
            @atualizar="recarregarDependencias"
          />

          <div class="row items-center q-mb-md">
            <div class="text-subtitle1 text-weight-medium">Itens do pedido</div>
            <q-space />
            <q-btn
              v-if="!somenteLeitura"
              flat
              color="primary"
              icon="add"
              label="Adicionar item"
              no-caps
              :disable="!isAdmin || opcoesProdutos.length === 0"
              @click="adicionarItem"
            />
          </div>

          <div
            v-for="(item, indice) in itens"
            :key="indice"
            class="pedido-item q-mb-md q-pa-md"
          >
            <div class="row q-col-gutter-md items-start">
              <div class="col-12 col-md-5">
                <q-select
                  v-model="item.produtoId"
                  class="form-field--required"
                  :options="opcoesProdutos"
                  label="Produto"
                  outlined
                  dense
                  emit-value
                  map-options
                  :rules="[validarProduto]"
                  :disable="!isAdmin || somenteLeitura || opcoesProdutos.length === 0"
                />
              </div>

              <div class="col-6 col-md-2">
                <q-input
                  v-model.number="item.quantidade"
                  class="form-field--required"
                  label="Quantidade"
                  outlined
                  dense
                  type="number"
                  min="1"
                  step="1"
                  :readonly="!isAdmin || somenteLeitura"
                  :rules="[validarQuantidade]"
                >
                  <template v-if="item.produtoId" #append>
                    <span class="pedido-item__unidade-sigla">
                      {{ obterSiglaUnidadeMedidaProduto(item.produtoId) }}
                    </span>
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-4">
                <template v-if="somenteLeitura">
                  <q-input
                    :model-value="obterResumoValoresItem(item)"
                    label="Valores"
                    outlined
                    dense
                    readonly
                  />
                </template>

                <template v-else>
                  <q-option-group
                    :model-value="item.modoValor"
                    :options="opcoesModoValor"
                    type="radio"
                    dense
                    inline
                    class="pedido-item__modo-opcoes"
                    :disable="!isAdmin"
                    @update:model-value="alternarModoValor(item, $event as 'unitario' | 'total')"
                  />

                  <q-input
                    v-if="item.modoValor === 'unitario'"
                    :model-value="formatarMoedaParaInput(item.valorUnitario)"
                    class="form-field--required q-mt-sm"
                    label="Valor por unidade"
                    outlined
                    dense
                    inputmode="numeric"
                    prefix="R$"
                    :readonly="!isAdmin"
                    :rules="[() => validarValorUnitario(item.valorUnitario)]"
                    @update:model-value="atualizarValorMoedaItem(item, 'unitario', String($event ?? ''))"
                  />
                  <q-input
                    v-else
                    :model-value="formatarMoedaParaInput(item.valorTotal)"
                    class="form-field--required q-mt-sm"
                    label="Valor total"
                    outlined
                    dense
                    inputmode="numeric"
                    prefix="R$"
                    :readonly="!isAdmin"
                    :rules="[() => validarValorTotal(item.valorTotal)]"
                    @update:model-value="atualizarValorMoedaItem(item, 'total', String($event ?? ''))"
                  />

                  <div class="pedido-item__resumo-valores">
                    {{ obterResumoValoresItem(item) }}
                  </div>
                </template>
              </div>

              <div class="col-6 col-md-1 flex items-center justify-end">
                <app-table-action-button
                  v-if="!somenteLeitura && itens.length > 1"
                  acao="excluir"
                  rotulo="Remover item"
                  :disable="!isAdmin"
                  @click="removerItem(indice)"
                />
              </div>
            </div>
          </div>

          <div class="row justify-end q-mb-md">
            <div class="text-h6">
              Total: {{ formatarMoeda(valorTotalPedido) }}
            </div>
          </div>

          <div class="row q-gutter-sm">
            <q-btn
              v-if="!somenteLeitura"
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!isAdmin || opcoesProdutos.length === 0"
            />
            <q-btn flat label="Voltar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped lang="scss">
.pedido-item {
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
}

.pedido-item__modo-opcoes {
  :deep(.q-radio) {
    margin-right: var(--ds-space-3);
  }

  :deep(.q-radio__label) {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-sm, 0.8125rem);
  }
}

.pedido-item__resumo-valores {
  margin-top: var(--ds-space-1);
  padding-left: var(--ds-space-1);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm, 0.8125rem);
}

.pedido-item__unidade-sigla {
  padding-left: var(--ds-space-2);
  border-left: 1px solid var(--ds-border-default);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm, 0.8125rem);
  font-weight: var(--ds-font-weight-semibold);
  line-height: 1;
  user-select: none;
}
</style>
