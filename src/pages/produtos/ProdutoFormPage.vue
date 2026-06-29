<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
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
  controlaEstoque: true,
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

function mesclarUnidadeSelecionada(unidades: UnidadeMedida[]): UnidadeMedida[] {
  const selecionada = unidadeMedidaSelecionada.value;

  if (selecionada && !unidades.some((unidade) => unidade.id === selecionada.id)) {
    return [selecionada, ...unidades];
  }

  return unidades;
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
        unidadesMedidaDisponiveis.value = mesclarUnidadeSelecionada(unidades);
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

  const encontrada = unidadesMedidaDisponiveis.value.find(
    (unidade) => unidade.id === unidadeMedidaId,
  );

  if (encontrada) {
    unidadeMedidaSelecionada.value = encontrada;
  }
}

function montarPayload() {
  const payload = {
    tipoProdutoId: form.tipoProdutoId as string,
    unidadeMedidaId: form.unidadeMedidaId as string,
    nome: form.nome.trim(),
    estoqueMinimo: form.estoqueMinimo as number,
    controlaEstoque: form.controlaEstoque,
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
  if (unidadesMedidaDisponiveis.value.some((unidade) => unidade.id === unidadeMedidaId)) {
    return;
  }

  try {
    const unidade = await unidadeMedidaService.obter(unidadeMedidaId);
    unidadeMedidaSelecionada.value = unidade;
    unidadesMedidaDisponiveis.value = [unidade];
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
    form.controlaEstoque = produto.controlaEstoque ?? true;

    await Promise.all([
      garantirTipoNaLista(produto.tipoProdutoId),
      garantirUnidadeMedidaNaLista(produto.unidadeMedidaId),
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

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.unidadeMedidaId"
                class="form-field--required"
                :options="opcoesUnidadesMedida"
                label="Unidade de medida base"
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
            <div class="col-12 col-md-6">
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
