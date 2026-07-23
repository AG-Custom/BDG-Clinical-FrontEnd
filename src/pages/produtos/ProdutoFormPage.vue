<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { CODIGOS_TIPO_PRODUTO } from '@/constants/tipos-produto';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { produtoService } from '@/services/produto.service';
import { tipoProdutoService } from '@/services/tipo-produto.service';
import { unidadeMedidaService } from '@/services/unidade-medida.service';
import type { Produto } from '@/types/entidades/produto';
import type { TipoProduto } from '@/types/entidades/tipo-produto';
import type { UnidadeMedida } from '@/types/entidades/unidade-medida';
import { formatarUnidadeMedidaLabel } from '@/types/entidades/unidade-medida';
import {
  formatarMoedaParaInput,
  parsearMoedaDoInput,
} from '@/types/entidades/pedido-fornecedor';

const LIMITE_BUSCA_UNIDADE = 20;
const MIN_CARACTERES_BUSCA_UNIDADE = 2;

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.produtos.criar);
const podeEditar = usePermissao(permissoes.produtos.editar);
const podeSalvar = computed(() => (isEdicao.value ? podeEditar.value : podeCriar.value));

const carregando = ref(false);
const salvando = ref(false);
const tiposDisponiveis = ref<TipoProduto[]>([]);
const unidadesMedidaDisponiveis = ref<UnidadeMedida[]>([]);
const unidadeMedidaSelecionada = ref<UnidadeMedida | null>(null);
const unidadesMedidaPorId = ref<Record<string, UnidadeMedida>>({});
const buscandoUnidadeMedida = ref(false);
const dadosIniciaisCarregados = ref(false);
const semUnidadesMedida = ref(false);
const produtoOriginal = ref<Produto | null>(null);

let sequenciaBuscaUnidade = 0;

const isEdicao = computed(() => route.name === 'produtos-editar');
const produtoId = computed(() => route.params.id as string | undefined);

const form = reactive({
  tipoProdutoId: null as string | null,
  unidadeMedidaId: null as string | null,
  nome: '',
  estoqueMinimo: null as number | null,
  valor: null as number | null,
  controlaEstoque: true,
  unidadeEmbalagemId: null as string | null,
  conteudoPorEmbalagem: null as number | null,
  unidadeConteudoId: null as string | null,
  concentracaoPorConteudo: null as number | null,
});

const tipoSelecionado = computed(() =>
  tiposDisponiveis.value.find((tipo) => tipo.id === form.tipoProdutoId) ?? null,
);

const isMedicamento = computed(
  () => tipoSelecionado.value?.codigo === CODIGOS_TIPO_PRODUTO.MEDICAMENTO,
);

const fatorConversaoPreview = computed(() => {
  if (
    form.conteudoPorEmbalagem == null ||
    form.concentracaoPorConteudo == null ||
    form.conteudoPorEmbalagem <= 0 ||
    form.concentracaoPorConteudo <= 0
  ) {
    return null;
  }

  return form.conteudoPorEmbalagem * form.concentracaoPorConteudo;
});

function lembrarUnidadeMedida(unidade: UnidadeMedida | null | undefined): void {
  if (!unidade) {
    return;
  }

  unidadesMedidaPorId.value = {
    ...unidadesMedidaPorId.value,
    [unidade.id]: unidade,
  };
}

function resolverUnidadeMedida(unidadeId: string | null): UnidadeMedida | null {
  if (!unidadeId) {
    return null;
  }

  return (
    unidadesMedidaDisponiveis.value.find((item) => item.id === unidadeId) ??
    unidadesMedidaPorId.value[unidadeId] ??
    (unidadeMedidaSelecionada.value?.id === unidadeId ? unidadeMedidaSelecionada.value : null)
  );
}

function obterSiglaUnidade(unidadeId: string | null): string | null {
  return resolverUnidadeMedida(unidadeId)?.sigla ?? null;
}

function obterNomeUnidade(unidadeId: string | null): string | null {
  return resolverUnidadeMedida(unidadeId)?.nome ?? null;
}

const previewConversao = computed(() => {
  if (fatorConversaoPreview.value == null) {
    return null;
  }

  const nomeEmb = obterNomeUnidade(form.unidadeEmbalagemId) ?? 'embalagem';
  const siglaEstoque = obterSiglaUnidade(form.unidadeMedidaId) ?? 'estoque';

  return `1 ${nomeEmb} = ${fatorConversaoPreview.value.toLocaleString('pt-BR')} ${siglaEstoque}`;
});

const hintConteudoPorEmbalagem = computed(() => {
  const nomeEmb = obterNomeUnidade(form.unidadeEmbalagemId) ?? 'embalagem';
  const siglaConteudo = obterSiglaUnidade(form.unidadeConteudoId)
    ?? obterNomeUnidade(form.unidadeConteudoId)
    ?? 'conteúdo';
  const conteudo = form.conteudoPorEmbalagem;

  if (conteudo != null && conteudo > 0) {
    return `${conteudo.toLocaleString('pt-BR')} ${siglaConteudo} por ${nomeEmb}`;
  }

  return `${siglaConteudo} por ${nomeEmb}`;
});

const hintConcentracaoPorConteudo = computed(() => {
  const nomeConteudo = obterNomeUnidade(form.unidadeConteudoId) ?? 'conteúdo';
  const siglaEstoque = obterSiglaUnidade(form.unidadeMedidaId)
    ?? obterNomeUnidade(form.unidadeMedidaId)
    ?? 'estoque';
  const concentracao = form.concentracaoPorConteudo;

  if (concentracao != null && concentracao > 0) {
    return `${concentracao.toLocaleString('pt-BR')} ${siglaEstoque} por ${nomeConteudo}`;
  }

  return `${siglaEstoque} por ${nomeConteudo}`;
});

const opcoesTipos = computed(() =>
  tiposDisponiveis.value.map((tipo) => ({
    label: tipo.ativo ? tipo.nome : `${tipo.nome} (inativo)`,
    value: tipo.id,
  })),
);

const opcoesUnidadesMedida = computed(() =>
  unidadesMedidaDisponiveis.value.map((unidade) => ({
    label: formatarUnidadeMedidaLabel(unidade),
    value: unidade.id,
  })),
);

const mostrarAlertaTipos = computed(
  () => dadosIniciaisCarregados.value && podeSalvar.value && opcoesTipos.value.length === 0,
);

const mostrarAlertaUnidadesMedida = computed(
  () => dadosIniciaisCarregados.value && podeSalvar.value && semUnidadesMedida.value,
);

const ajudaEstoqueMinimo =
  'Valor de referência para o controle de estoque. Quando o saldo do produto ficar abaixo deste mínimo, a clínica receberá um aviso.';

const ajudaValor =
  'Preço de referência do produto na clínica. Usado em estoque e relatórios de valor.';

const ajudaControlaEstoque =
  'Quando ativo, compras, aplicações e ajustes manuais geram movimentação de estoque para este produto. Desative para itens que não precisam de rastreio de saldo.';

function validarTipo(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o tipo do produto';
}

function validarUnidadeMedida(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione a unidade de medida';
}

function validarEstoqueMinimo(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe o estoque mínimo';
  }

  if (value < 0) {
    return 'O estoque mínimo deve ser maior ou igual a zero';
  }

  return true;
}

function validarValor(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe o valor do produto';
  }

  if (value < 0) {
    return 'O valor deve ser maior ou igual a zero';
  }

  return true;
}

function atualizarValor(texto: string): void {
  form.valor = parsearMoedaDoInput(texto);
}

function mesclarUnidadesSelecionadas(unidades: UnidadeMedida[]): UnidadeMedida[] {
  const ids = new Set(unidades.map((unidade) => unidade.id));
  const extras: UnidadeMedida[] = [];

  for (const unidadeId of [form.unidadeMedidaId, form.unidadeEmbalagemId, form.unidadeConteudoId]) {
    if (!unidadeId || ids.has(unidadeId)) {
      continue;
    }

    const unidade = resolverUnidadeMedida(unidadeId);

    if (unidade) {
      extras.push(unidade);
      ids.add(unidadeId);
    }
  }

  return extras.length > 0 ? [...extras, ...unidades] : unidades;
}

async function buscarUnidadesMedida(termo: string): Promise<UnidadeMedida[]> {
  const termoNormalizado = termo.trim();
  const usarBusca = termoNormalizado.length >= MIN_CARACTERES_BUSCA_UNIDADE;

  return unidadeMedidaService.listar({
    search: usarBusca ? termoNormalizado : undefined,
    limit: LIMITE_BUSCA_UNIDADE,
  });
}

function filtrarUnidadesMedida(
  val: string,
  update: (callback: () => void) => void,
  abort: () => void,
): void {
  const termo = val.trim();
  const sequencia = ++sequenciaBuscaUnidade;

  if (termo.length > 0 && termo.length < MIN_CARACTERES_BUSCA_UNIDADE) {
    update(() => {});
    return;
  }

  buscandoUnidadeMedida.value = true;

  void buscarUnidadesMedida(termo)
    .then((unidades) => {
      if (sequencia !== sequenciaBuscaUnidade) {
        return;
      }

      update(() => {
        unidades.forEach(lembrarUnidadeMedida);
        unidadesMedidaDisponiveis.value = mesclarUnidadesSelecionadas(unidades);
      });
    })
    .catch((error) => {
      if (sequencia !== sequenciaBuscaUnidade) {
        return;
      }

      notificacao.erro(obterMensagem(error));
      abort();
    })
    .finally(() => {
      if (sequencia === sequenciaBuscaUnidade) {
        buscandoUnidadeMedida.value = false;
      }
    });
}

function atualizarUnidadeMedidaSelecionada(unidadeMedidaId: string | null): void {
  if (!unidadeMedidaId) {
    unidadeMedidaSelecionada.value = null;
    return;
  }

  const encontrada = resolverUnidadeMedida(unidadeMedidaId);

  if (encontrada) {
    lembrarUnidadeMedida(encontrada);
    unidadeMedidaSelecionada.value = encontrada;
  }
}

function aoSelecionarUnidadeConversao(unidadeId: string | null): void {
  if (!unidadeId) {
    return;
  }

  const encontrada = resolverUnidadeMedida(unidadeId);

  if (encontrada) {
    lembrarUnidadeMedida(encontrada);
  }
}

function montarPayload() {
  const payload = {
    tipoProdutoId: form.tipoProdutoId as string,
    unidadeMedidaId: form.unidadeMedidaId as string,
    nome: form.nome.trim(),
    estoqueMinimo: form.estoqueMinimo as number,
    valor: form.valor as number,
    controlaEstoque: form.controlaEstoque,
    unidadeEmbalagemId: isMedicamento.value ? form.unidadeEmbalagemId : null,
    conteudoPorEmbalagem: isMedicamento.value ? form.conteudoPorEmbalagem : null,
    unidadeConteudoId: isMedicamento.value ? form.unidadeConteudoId : null,
    concentracaoPorConteudo: isMedicamento.value ? form.concentracaoPorConteudo : null,
  };

  if (isEdicao.value && produtoOriginal.value) {
    return {
      ...payload,
      sku: produtoOriginal.value.sku,
      codigoInterno: produtoOriginal.value.codigoInterno,
      codigoBarras: produtoOriginal.value.codigoBarras,
    };
  }

  return payload;
}

async function garantirTipoNaLista(tipoProdutoId: string): Promise<void> {
  if (tiposDisponiveis.value.some((tipo) => tipo.id === tipoProdutoId)) {
    return;
  }

  try {
    const tipo = await tipoProdutoService.obter(tipoProdutoId);
    tiposDisponiveis.value = [tipo, ...tiposDisponiveis.value];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarTipos(): Promise<void> {
  try {
    tiposDisponiveis.value = await tipoProdutoService.listar(false);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function verificarUnidadesMedida(): Promise<void> {
  try {
    const unidades = await unidadeMedidaService.listar({ limit: 1 });
    semUnidadesMedida.value = unidades.length === 0;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarDependenciasIniciais(): Promise<void> {
  try {
    await Promise.all([carregarTipos(), verificarUnidadesMedida()]);
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function recarregarDependencias(): Promise<void> {
  dadosIniciaisCarregados.value = false;

  try {
    await Promise.all([carregarTipos(), verificarUnidadesMedida()]);
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function garantirUnidadeMedidaNaLista(unidadeMedidaId: string): Promise<void> {
  const existente = resolverUnidadeMedida(unidadeMedidaId);

  if (existente) {
    lembrarUnidadeMedida(existente);

    if (unidadeMedidaId === form.unidadeMedidaId) {
      unidadeMedidaSelecionada.value = existente;
    }

    return;
  }

  try {
    const unidade = await unidadeMedidaService.obter(unidadeMedidaId);
    lembrarUnidadeMedida(unidade);

    if (unidadeMedidaId === form.unidadeMedidaId) {
      unidadeMedidaSelecionada.value = unidade;
    }

    if (!unidadesMedidaDisponiveis.value.some((item) => item.id === unidade.id)) {
      unidadesMedidaDisponiveis.value = [...unidadesMedidaDisponiveis.value, unidade];
    }
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarProduto(): Promise<void> {
  if (!isEdicao.value || !produtoId.value) {
    return;
  }

  carregando.value = true;

  try {
    const produto = await produtoService.obter(produtoId.value);
    produtoOriginal.value = produto;

    form.tipoProdutoId = produto.tipoProdutoId;
    form.unidadeMedidaId = produto.unidadeMedidaId;
    form.nome = produto.nome;
    form.estoqueMinimo = produto.estoqueMinimo;
    form.valor = produto.valor;
    form.controlaEstoque = produto.controlaEstoque ?? true;
    form.unidadeEmbalagemId = produto.unidadeEmbalagemId;
    form.conteudoPorEmbalagem = produto.conteudoPorEmbalagem;
    form.unidadeConteudoId = produto.unidadeConteudoId;
    form.concentracaoPorConteudo = produto.concentracaoPorConteudo;

    const unidadesParaGarantir = [
      produto.unidadeMedidaId,
      produto.unidadeEmbalagemId,
      produto.unidadeConteudoId,
    ].filter((id): id is string => Boolean(id));

    await Promise.all([
      garantirTipoNaLista(produto.tipoProdutoId),
      ...unidadesParaGarantir.map((id) => garantirUnidadeMedidaNaLista(id)),
    ]);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'produtos' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    const payload = montarPayload();

    if (isEdicao.value && produtoId.value) {
      await produtoService.atualizar(produtoId.value, payload);
      notificacao.sucesso('Produto atualizado com sucesso.');
    } else {
      await produtoService.criar(payload);
      notificacao.sucesso('Produto cadastrado com sucesso.');
    }

    await router.push({ name: 'produtos' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'produtos' });
}

onMounted(async () => {
  await carregarDependenciasIniciais();
  await carregarProduto();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar produto' : 'Novo produto'"
      :subtitulo="
        isEdicao
          ? 'Atualize os dados do produto.'
          : 'Cadastre um produto físico para controle de estoque.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <app-form-dependencia-alerta
            v-if="mostrarAlertaTipos"
            mensagem="Nenhum tipo de produto cadastrado. Cadastre um tipo antes de registrar o produto."
            rotulo-acao="Cadastrar tipo"
            :destino="{ name: 'tipos-produto-novo' }"
            @atualizar="recarregarDependencias"
          />

          <q-select
            v-model="form.tipoProdutoId"
            class="form-field--required"
            :options="opcoesTipos"
            label="Tipo do produto"
            outlined
            emit-value
            map-options
            :rules="[validarTipo]"
            :disable="!podeSalvar || opcoesTipos.length === 0"
            hint="Classificação do produto no estoque."
          />

          <q-input
            v-model="form.nome"
            class="form-field--required"
            label="Nome"
            outlined
            :readonly="!podeSalvar"
            :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome do produto']"
          />

          <template v-if="isMedicamento">
            <div class="text-subtitle2 q-mt-md">Conversão de embalagem</div>
            <div class="text-body2 q-mb-sm" style="color: var(--ds-text-secondary)">
              Embalagem → conteúdo → estoque. Informe as unidades e, em seguida, os valores da
              conversão.
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-select
                  v-model="form.unidadeEmbalagemId"
                  class="form-field--required"
                  :options="opcoesUnidadesMedida"
                  label="Unidade de embalagem"
                  outlined
                  emit-value
                  map-options
                  use-input
                  fill-input
                  hide-selected
                  input-debounce="300"
                  :loading="buscandoUnidadeMedida"
                  :rules="[(v: string | null) => Boolean(v) || 'Selecione a unidade de embalagem']"
                  :disable="!podeSalvar || semUnidadesMedida"
                  hint="Como o produto é comprado (ex.: frasco)"
                  @filter="filtrarUnidadesMedida"
                  @update:model-value="aoSelecionarUnidadeConversao"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-select
                  v-model="form.unidadeConteudoId"
                  class="form-field--required"
                  :options="opcoesUnidadesMedida"
                  label="Unidade de conteúdo"
                  outlined
                  emit-value
                  map-options
                  use-input
                  fill-input
                  hide-selected
                  input-debounce="300"
                  :loading="buscandoUnidadeMedida"
                  :rules="[(v: string | null) => Boolean(v) || 'Selecione a unidade de conteúdo']"
                  :disable="!podeSalvar || semUnidadesMedida"
                  hint="O que há dentro da embalagem (ex.: ml)"
                  @filter="filtrarUnidadesMedida"
                  @update:model-value="aoSelecionarUnidadeConversao"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-select
                  v-model="form.unidadeMedidaId"
                  class="form-field--required"
                  :options="opcoesUnidadesMedida"
                  label="Unidade de estoque"
                  outlined
                  emit-value
                  map-options
                  use-input
                  fill-input
                  hide-selected
                  input-debounce="300"
                  options-dense
                  :loading="buscandoUnidadeMedida"
                  :rules="[validarUnidadeMedida]"
                  :disable="!podeSalvar || semUnidadesMedida"
                  hint="Como o saldo é controlado (ex.: mg)"
                  @filter="filtrarUnidadesMedida"
                  @update:model-value="atualizarUnidadeMedidaSelecionada"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model.number="form.conteudoPorEmbalagem"
                  class="form-field--required"
                  type="number"
                  min="0"
                  step="any"
                  label="Conteúdo por embalagem"
                  outlined
                  :readonly="!podeSalvar"
                  :rules="[(v: number | null) => (v != null && v > 0) || 'Informe um valor maior que zero']"
                  :hint="hintConteudoPorEmbalagem"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model.number="form.concentracaoPorConteudo"
                  class="form-field--required"
                  type="number"
                  min="0"
                  step="any"
                  label="Concentração"
                  outlined
                  :readonly="!podeSalvar"
                  :rules="[(v: number | null) => (v != null && v > 0) || 'Informe um valor maior que zero']"
                  :hint="hintConcentracaoPorConteudo"
                />
              </div>
            </div>

            <app-form-dependencia-alerta
              v-if="mostrarAlertaUnidadesMedida"
              mensagem="Nenhuma unidade de medida cadastrada. Cadastre unidades como mg, ml ou un."
              rotulo-acao="Cadastrar unidade de medida"
              :destino="{ name: 'unidades-medida-nova' }"
              @atualizar="recarregarDependencias"
            />

            <q-banner v-if="previewConversao" dense rounded class="bg-grey-2 q-mb-md">
              {{ previewConversao }}
            </q-banner>
          </template>

          <div class="row q-col-gutter-md">
            <div v-if="!isMedicamento" class="col-12 col-md-6">
              <q-select
                v-model="form.unidadeMedidaId"
                class="form-field--required"
                :options="opcoesUnidadesMedida"
                label="Unidade de estoque"
                outlined
                emit-value
                map-options
                use-input
                input-debounce="300"
                clearable
                options-dense
                :loading="buscandoUnidadeMedida"
                :rules="[validarUnidadeMedida]"
                :disable="!podeSalvar"
                hint="Abra o select ou digite para buscar (mín. 2 caracteres)"
                @filter="filtrarUnidadesMedida"
                @update:model-value="atualizarUnidadeMedidaSelecionada"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey">
                      {{
                        buscandoUnidadeMedida
                          ? 'Buscando...'
                          : 'Nenhuma unidade encontrada. Digite ao menos 2 caracteres.'
                      }}
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <app-form-dependencia-alerta
                v-if="mostrarAlertaUnidadesMedida"
                mensagem="Nenhuma unidade de medida cadastrada. Cadastre unidades como mg, ml ou un."
                rotulo-acao="Cadastrar unidade de medida"
                :destino="{ name: 'unidades-medida-nova' }"
                @atualizar="recarregarDependencias"
              />
            </div>
            <div class="col-12" :class="isMedicamento ? '' : 'col-md-6'">
              <q-input
                v-model.number="form.estoqueMinimo"
                class="form-field--required"
                label="Estoque mínimo"
                outlined
                type="number"
                min="0"
                step="1"
                :readonly="!podeSalvar"
                :rules="[validarEstoqueMinimo]"
              >
                <template #append>
                  <q-icon name="info_outline" size="20px" class="form-field-input-hint">
                    <q-tooltip
                      anchor="top middle"
                      self="bottom middle"
                      :offset="[0, 8]"
                      max-width="280px"
                    >
                      {{ ajudaEstoqueMinimo }}
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>
            </div>
          </div>

          <q-input
            :model-value="formatarMoedaParaInput(form.valor)"
            class="form-field--required"
            label="Valor"
            outlined
            inputmode="numeric"
            prefix="R$"
            :readonly="!podeSalvar"
            :rules="[() => validarValor(form.valor)]"
            @update:model-value="atualizarValor(String($event ?? ''))"
          >
            <template #append>
              <q-icon name="info_outline" size="20px" class="form-field-input-hint">
                <q-tooltip
                  anchor="top middle"
                  self="bottom middle"
                  :offset="[0, 8]"
                  max-width="280px"
                >
                  {{ ajudaValor }}
                </q-tooltip>
              </q-icon>
            </template>
          </q-input>

          <div class="controla-estoque-field">
            <div class="row items-center no-wrap">
              <q-toggle
                v-model="form.controlaEstoque"
                label="Controla estoque"
                color="primary"
                :disable="!podeSalvar"
              />
              <q-icon name="info_outline" size="20px" class="form-field-input-hint q-ml-xs">
                <q-tooltip
                  anchor="top middle"
                  self="bottom middle"
                  :offset="[0, 8]"
                  max-width="300px"
                >
                  {{ ajudaControlaEstoque }}
                </q-tooltip>
              </q-icon>
            </div>
            <p class="controla-estoque-field__ajuda text-caption q-ma-none">
              {{ ajudaControlaEstoque }}
            </p>
          </div>

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!podeSalvar || opcoesTipos.length === 0"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped lang="scss">
.controla-estoque-field__ajuda {
  color: var(--ds-text-secondary);
  padding-left: 52px;
}
</style>
