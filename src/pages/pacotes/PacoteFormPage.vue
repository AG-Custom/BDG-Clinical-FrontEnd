<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { CODIGOS_TIPO_PRODUTO } from '@/constants/tipos-produto';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { pacoteService } from '@/services/pacote.service';
import { produtoService } from '@/services/produto.service';
import type {
  ItemPacoteFormulario,
  PacoteItemRequest,
} from '@/types/entidades/pacote';
import {
  criarItemPacoteVazio,
  formatarValorPacoteParaInput,
  parsearValorPacoteDoInput,
} from '@/types/entidades/pacote';
import type { Produto } from '@/types/entidades/produto';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.pacotes.criar);
const podeEditar = usePermissao(permissoes.pacotes.editar);
const podeSalvar = computed(() => (isEdicao.value ? podeEditar.value : podeCriar.value));

const carregando = ref(false);
const salvando = ref(false);
const produtosDisponiveis = ref<Produto[]>([]);
const dadosIniciaisCarregados = ref(false);

const isEdicao = computed(() => route.name === 'pacotes-editar');
const pacoteId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
  descricao: '',
  valor: null as number | null,
});

const itens = ref<ItemPacoteFormulario[]>([]);

const opcoesProdutos = computed(() =>
  produtosDisponiveis.value
    .filter((produto) => {
      if (!produto.ativo) {
        return false;
      }

      const isMedicamento =
        produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.MEDICAMENTO;
      const estaSelecionado = itens.value.some((item) => item.produtoId === produto.id);

      return isMedicamento || estaSelecionado;
    })
    .map((produto) => ({
      label: produto.nome,
      value: produto.id,
    })),
);

const mostrarAlertaProdutos = computed(
  () => dadosIniciaisCarregados.value && opcoesProdutos.value.length === 0,
);

const produtosPorId = computed(
  () => new Map(produtosDisponiveis.value.map((produto) => [produto.id, produto])),
);

function validarNome(value: string): boolean | string {
  return Boolean(value?.trim()) || 'Informe o nome do pacote';
}

function validarValor(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe o valor do pacote';
  }

  if (value < 0) {
    return 'O valor deve ser maior ou igual a zero';
  }

  return true;
}

function validarQuantidadeItem(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe a quantidade';
  }

  if (value <= 0) {
    return 'A quantidade deve ser maior que zero';
  }

  return true;
}

function validarUnidadeMedida(value: string): boolean | string {
  return Boolean(value?.trim()) || 'Informe a unidade de medida';
}

function obterSiglaUnidadeMedida(produtoId: string | null): string {
  if (!produtoId) {
    return '';
  }

  return produtosPorId.value.get(produtoId)?.unidadeMedidaSigla ?? '';
}

function obterLabelUnidadeMedida(produtoId: string | null): string {
  if (!produtoId) {
    return '';
  }

  const produto = produtosPorId.value.get(produtoId);

  if (!produto) {
    return '';
  }

  return `${produto.unidadeMedidaNome} (${produto.unidadeMedidaSigla})`;
}

function atualizarValorPacote(texto: string): void {
  form.valor = parsearValorPacoteDoInput(texto);
}

function onProdutoItemChange(item: ItemPacoteFormulario): void {
  item.unidadeMedida = obterSiglaUnidadeMedida(item.produtoId);
}

function adicionarItem(): void {
  itens.value.push(criarItemPacoteVazio());
}

function removerItem(indice: number): void {
  itens.value.splice(indice, 1);
}

function validarItens(): boolean | string {
  const itensValidos = itens.value.filter(
    (item) =>
      item.produtoId &&
      item.quantidadeTotal &&
      item.quantidadeTotal > 0 &&
      item.unidadeMedida.trim(),
  );

  if (itensValidos.length === 0) {
    return 'Adicione ao menos um item ao pacote';
  }

  const ids = itensValidos.map((item) => item.produtoId as string);
  const idsUnicos = new Set(ids);

  if (ids.length !== idsUnicos.size) {
    return 'Não é permitido repetir o mesmo produto nos itens';
  }

  return true;
}

function montarItensRequest(): PacoteItemRequest[] {
  return itens.value
    .filter(
      (item) =>
        item.produtoId &&
        item.quantidadeTotal &&
        item.quantidadeTotal > 0 &&
        item.unidadeMedida.trim(),
    )
    .map((item) => ({
      produtoId: item.produtoId as string,
      quantidadeTotal: item.quantidadeTotal as number,
      unidadeMedida: item.unidadeMedida.trim(),
    }));
}

function montarPayload() {
  return {
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    valor: form.valor as number,
    itens: montarItensRequest(),
  };
}

async function carregarProdutos(): Promise<void> {
  try {
    produtosDisponiveis.value = await produtoService.listar();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    dadosIniciaisCarregados.value = true;
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

async function recarregarDependencias(): Promise<void> {
  dadosIniciaisCarregados.value = false;
  await carregarProdutos();
}

async function carregarPacote(): Promise<void> {
  if (!isEdicao.value || !pacoteId.value) {
    return;
  }

  carregando.value = true;

  try {
    const pacote = await pacoteService.obter(pacoteId.value);

    form.nome = pacote.nome;
    form.descricao = pacote.descricao ?? '';
    form.valor = pacote.valor;

    itens.value =
      pacote.itens.length > 0
        ? pacote.itens.map((item) => ({
            produtoId: item.produtoId,
            quantidadeTotal: item.quantidadeTotal,
            unidadeMedida: item.unidadeMedida,
          }))
        : [];

    await garantirProdutosDosItens(pacote.itens.map((item) => item.produtoId));

    itens.value.forEach((item) => {
      item.unidadeMedida = obterSiglaUnidadeMedida(item.produtoId);
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'pacotes' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  const validacaoItens = validarItens();

  if (typeof validacaoItens === 'string') {
    notificacao.erro(validacaoItens);
    return;
  }

  salvando.value = true;

  try {
    const payload = montarPayload();

    if (isEdicao.value && pacoteId.value) {
      await pacoteService.atualizar(pacoteId.value, payload);
      notificacao.sucesso('Pacote atualizado com sucesso.');
    } else {
      await pacoteService.criar(payload);
      notificacao.sucesso('Pacote cadastrado com sucesso.');
    }

    await router.push({ name: 'pacotes' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'pacotes' });
}

onMounted(async () => {
  await carregarProdutos();
  await carregarPacote();
});
</script>

<template>
  <q-page class="page-content page-content--form-wide q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar pacote' : 'Novo pacote'"
      :subtitulo="
        isEdicao
          ? 'Atualize os dados, aplicações e itens do pacote.'
          : 'Cadastre um pacote com aplicações e produtos inclusos.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <app-form-dependencia-alerta
            v-if="mostrarAlertaProdutos"
            mensagem="Nenhum medicamento cadastrado. Cadastre produtos do tipo medicamento (sistema) antes de montar o pacote."
            rotulo-acao="Cadastrar produto"
            :destino="{ name: 'produtos-novo' }"
            @atualizar="recarregarDependencias"
          />

          <q-input
            v-model="form.nome"
            class="form-field--required"
            label="Nome"
            outlined
            :readonly="!podeSalvar"
            :rules="[validarNome]"
          />

          <q-input
            v-model="form.descricao"
            label="Descrição"
            outlined
            type="textarea"
            autogrow
            :readonly="!podeSalvar"
          />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                :model-value="formatarValorPacoteParaInput(form.valor)"
                class="form-field--required"
                label="Valor"
                outlined
                inputmode="numeric"
                prefix="R$"
                :readonly="!podeSalvar"
                :rules="[() => validarValor(form.valor)]"
                @update:model-value="atualizarValorPacote(String($event ?? ''))"
              />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <div class="row items-center q-mb-md">
            <div class="text-subtitle1 text-weight-medium">Itens do pacote</div>
            <q-space />
            <q-btn
              flat
              color="primary"
              icon="add"
              label="Adicionar item"
              no-caps
              :disable="!podeSalvar || opcoesProdutos.length === 0"
              @click="adicionarItem"
            />
          </div>

          <div
            v-for="(item, indice) in itens"
            :key="indice"
            class="pacote-item q-mb-md q-pa-md"
          >
            <div class="row q-col-gutter-md items-start">
              <div class="col-12 col-md-5">
                <q-select
                  v-model="item.produtoId"
                  class="form-field--required"
                  :options="opcoesProdutos"
                  label="Medicamento"
                  outlined
                  dense
                  emit-value
                  map-options
                  :disable="!podeSalvar || opcoesProdutos.length === 0"
                  hint="Somente produtos do tipo medicamento (sistema)"
                  @update:model-value="onProdutoItemChange(item)"
                />
              </div>

              <div class="col-6 col-md-3">
                <q-input
                  v-model.number="item.quantidadeTotal"
                  class="form-field--required"
                  label="Quantidade total"
                  outlined
                  dense
                  type="number"
                  min="0.01"
                  step="any"
                  :readonly="!podeSalvar"
                  :rules="[validarQuantidadeItem]"
                />
              </div>

              <div class="col-6 col-md-3">
                <q-input
                  :model-value="obterLabelUnidadeMedida(item.produtoId) || item.unidadeMedida"
                  class="form-field--required"
                  label="Unidade de medida"
                  outlined
                  dense
                  readonly
                  :rules="[() => validarUnidadeMedida(item.unidadeMedida)]"
                  hint="Preenchida automaticamente pelo produto"
                />
              </div>

              <div class="col-12 col-md-1 flex flex-center">
                <app-table-action-button
                  acao="excluir"
                  rotulo="Remover item"
                  :disable="!podeSalvar"
                  @click="removerItem(indice)"
                />
              </div>
            </div>
          </div>

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!podeSalvar"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped lang="scss">
.pacote-item {
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
}
</style>
