<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { procedimentoService } from '@/services/procedimento.service';
import { produtoService } from '@/services/produto.service';
import type {
  ItemProcedimentoFormulario,
  ProcedimentoItemRequest,
} from '@/types/entidades/procedimento';
import { criarItemProcedimentoVazio } from '@/types/entidades/procedimento';
import type { Produto } from '@/types/entidades/produto';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const carregando = ref(false);
const salvando = ref(false);
const produtosDisponiveis = ref<Produto[]>([]);
const dadosIniciaisCarregados = ref(false);

const isEdicao = computed(() => route.name === 'procedimentos-editar');
const procedimentoId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
  produtoAplicadoId: null as string | null,
  observacoes: '',
});

const itens = ref<ItemProcedimentoFormulario[]>([]);

const opcoesProdutos = computed(() =>
  produtosDisponiveis.value
    .filter((produto) => produto.ativo)
    .map((produto) => ({
      label: produto.nome,
      value: produto.id,
    })),
);

const opcoesProdutosInsumos = computed(() =>
  opcoesProdutos.value.filter((opcao) => opcao.value !== form.produtoAplicadoId),
);

const mostrarAlertaProdutos = computed(
  () => dadosIniciaisCarregados.value && opcoesProdutos.value.length === 0,
);

const produtosPorId = computed(
  () => new Map(produtosDisponiveis.value.map((produto) => [produto.id, produto])),
);

function validarNome(value: string): boolean | string {
  return Boolean(value?.trim()) || 'Informe o nome do procedimento';
}

function validarProdutoAplicado(value: string | null): boolean | string {
  if (!value) {
    return true;
  }

  const duplicado = itens.value.some((item) => item.produtoId === value);

  if (duplicado) {
    return 'O produto aplicado não pode estar na lista de insumos';
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

function obterSiglaUnidadeMedida(produtoId: string | null): string {
  if (!produtoId) {
    return '';
  }

  return produtosPorId.value.get(produtoId)?.unidadeMedidaSigla ?? '';
}

function adicionarItem(): void {
  itens.value.push(criarItemProcedimentoVazio());
}

function removerItem(indice: number): void {
  itens.value.splice(indice, 1);
}

function validarComposicao(): boolean | string {
  const itensValidos = itens.value.filter(
    (item) => item.produtoId && item.quantidade && item.quantidade > 0,
  );

  if (!form.produtoAplicadoId && itensValidos.length === 0) {
    return 'Informe o produto aplicado ou ao menos um insumo';
  }

  const ids = itensValidos.map((item) => item.produtoId as string);
  const idsUnicos = new Set(ids);

  if (ids.length !== idsUnicos.size) {
    return 'Não é permitido repetir o mesmo produto nos insumos';
  }

  if (form.produtoAplicadoId && ids.includes(form.produtoAplicadoId)) {
    return 'O produto aplicado não pode estar na lista de insumos';
  }

  return true;
}

function montarItensRequest(): ProcedimentoItemRequest[] {
  return itens.value
    .filter((item) => item.produtoId && item.quantidade && item.quantidade > 0)
    .map((item) => ({
      produtoId: item.produtoId as string,
      quantidade: item.quantidade as number,
    }));
}

function montarPayload() {
  const itensRequest = montarItensRequest();

  return {
    nome: form.nome.trim(),
    produtoAplicadoId: form.produtoAplicadoId,
    observacoes: form.observacoes.trim() || null,
    itens: itensRequest.length > 0 ? itensRequest : undefined,
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

async function carregarProcedimento(): Promise<void> {
  if (!isEdicao.value || !procedimentoId.value) {
    return;
  }

  carregando.value = true;

  try {
    const procedimento = await procedimentoService.obter(procedimentoId.value);

    form.nome = procedimento.nome;
    form.produtoAplicadoId = procedimento.produtoAplicadoId;
    form.observacoes = procedimento.observacoes ?? '';

    itens.value =
      procedimento.itens.length > 0
        ? procedimento.itens.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
          }))
        : [];

    const produtoIds = [
      ...(procedimento.produtoAplicadoId ? [procedimento.produtoAplicadoId] : []),
      ...procedimento.itens.map((item) => item.produtoId),
    ];

    await garantirProdutosDosItens(produtoIds);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'procedimentos' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  const validacaoComposicao = validarComposicao();

  if (typeof validacaoComposicao === 'string') {
    notificacao.erro(validacaoComposicao);
    return;
  }

  salvando.value = true;

  try {
    const payload = montarPayload();

    if (isEdicao.value && procedimentoId.value) {
      await procedimentoService.atualizar(procedimentoId.value, payload);
      notificacao.sucesso('Procedimento atualizado com sucesso.');
    } else {
      await procedimentoService.criar(payload);
      notificacao.sucesso('Procedimento cadastrado com sucesso.');
    }

    await router.push({ name: 'procedimentos' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'procedimentos' });
}

onMounted(async () => {
  await carregarProdutos();
  await carregarProcedimento();
});
</script>

<template>
  <q-page class="page-content page-content--form-wide q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar procedimento' : 'Novo procedimento'"
      :subtitulo="
        isEdicao
          ? 'Atualize o kit de insumos e o produto aplicado.'
          : 'Cadastre um kit reutilizável para aplicações em pacientes.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <app-form-dependencia-alerta
            v-if="mostrarAlertaProdutos"
            mensagem="Nenhum produto cadastrado. Cadastre produtos antes de montar o procedimento."
            rotulo-acao="Cadastrar produto"
            :destino="{ name: 'produtos-novo' }"
            @atualizar="recarregarDependencias"
          />

          <q-input
            v-model="form.nome"
            class="form-field--required"
            label="Nome"
            outlined
            :readonly="!isAdmin"
            :rules="[validarNome]"
          />

          <q-select
            v-model="form.produtoAplicadoId"
            :options="opcoesProdutos"
            label="Produto aplicado"
            outlined
            emit-value
            map-options
            clearable
            :readonly="!isAdmin"
            hint="Medicamento ou produto clínico aplicado. Opcional se houver apenas insumos."
            :rules="[validarProdutoAplicado]"
          />

          <q-input
            v-model="form.observacoes"
            label="Observações"
            outlined
            type="textarea"
            autogrow
            :readonly="!isAdmin"
          />

          <q-separator class="q-my-md" />

          <div class="row items-center q-mb-md">
            <div class="text-subtitle1 text-weight-medium">Insumos do kit</div>
            <q-space />
            <q-btn
              flat
              color="primary"
              icon="add"
              label="Adicionar insumo"
              no-caps
              :disable="!isAdmin || opcoesProdutosInsumos.length === 0"
              @click="adicionarItem"
            />
          </div>

          <div
            v-for="(item, indice) in itens"
            :key="indice"
            class="procedimento-item q-mb-md q-pa-md"
          >
            <div class="row q-col-gutter-md items-start">
              <div class="col-12 col-md-7">
                <q-select
                  v-model="item.produtoId"
                  class="form-field--required"
                  :options="opcoesProdutosInsumos"
                  label="Produto"
                  outlined
                  dense
                  emit-value
                  map-options
                  :disable="!isAdmin || opcoesProdutosInsumos.length === 0"
                />
              </div>

              <div class="col-6 col-md-3">
                <q-input
                  v-model.number="item.quantidade"
                  class="form-field--required"
                  label="Quantidade"
                  outlined
                  dense
                  type="number"
                  min="0.01"
                  step="any"
                  :readonly="!isAdmin"
                  :rules="[validarQuantidadeItem]"
                >
                  <template v-if="item.produtoId" #append>
                    <span class="procedimento-item__unidade-sigla">
                      {{ obterSiglaUnidadeMedida(item.produtoId) }}
                    </span>
                  </template>
                </q-input>
              </div>

              <div class="col-6 col-md-2 flex flex-center">
                <app-table-action-button
                  acao="excluir"
                  rotulo="Remover insumo"
                  :disable="!isAdmin"
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
              :disable="!isAdmin"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped lang="scss">
.procedimento-item {
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
}

.procedimento-item__unidade-sigla {
  color: var(--ds-text-secondary);
  font-size: 0.75rem;
}
</style>
