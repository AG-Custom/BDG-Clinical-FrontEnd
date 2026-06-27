<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { QForm } from 'quasar';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { movimentacaoEstoqueService } from '@/services/movimentacao-estoque.service';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import { unidadeService } from '@/services/unidade.service';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import type { MovimentacaoEstoque, RegistrarMovimentacaoManualRequest } from '@/types/entidades/movimentacao-estoque';
import {
  formatarDataMovimentacao,
  formatarOrigemMovimentacao,
  obterCorTipoMovimentacao,
} from '@/types/entidades/movimentacao-estoque';
import type { Produto } from '@/types/entidades/produto';
import {
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
} from '@/types/entidades/pedido-fornecedor';
import type { Unidade } from '@/types/entidades/unidade';
import { normalizarLista } from '@/utils/normalizar-lista';

const LIMITE_LISTAGEM = 30;

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const carregando = ref(false);
const salvando = ref(false);
const carregandoLista = ref(true);
const unidadesDisponiveis = ref<Unidade[]>([]);
const produtosDisponiveis = ref<Produto[]>([]);
const movimentacoes = ref<MovimentacaoEstoque[]>([]);
const saldoDisponivel = ref<number | null>(null);
const siglaSaldo = ref('');
const dadosIniciaisCarregados = ref(false);
const formRef = ref<QForm | null>(null);

const isEntrada = computed(() => route.name === 'movimentacoes-estoque-entrada');

const tipoListagem = computed((): 'Entrada' | 'Saida' =>
  isEntrada.value ? 'Entrada' : 'Saida',
);

const titulo = computed(() =>
  isEntrada.value ? 'Registrar entrada de estoque manual' : 'Registrar saída de estoque manual',
);

const subtitulo = computed(() =>
  isEntrada.value
    ? 'Inclua quantidade manualmente no estoque da unidade.'
    : 'Remova quantidade manualmente do estoque da unidade.',
);

const colunasListagem = [
  { name: 'data', label: 'Data', field: 'data', align: 'left' as const, sortable: true },
  { name: 'unidade', label: 'Unidade', field: 'unidadeNome', align: 'left' as const },
  { name: 'produto', label: 'Produto', field: 'produtoNome', align: 'left' as const },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'center' as const },
  { name: 'quantidade', label: 'Quantidade', field: 'quantidade', align: 'right' as const },
  { name: 'origem', label: 'Origem', field: 'origem', align: 'left' as const },
  { name: 'observacao', label: 'Observação', field: 'observacao', align: 'left' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

const form = reactive({
  unidadeId: null as string | null,
  produtoId: null as string | null,
  quantidade: null as number | null,
  data: '',
  observacao: '',
});

const opcoesUnidades = computed(() =>
  unidadesDisponiveis.value
    .filter((unidade) => unidade.ativo)
    .map((unidade) => ({
      label: unidade.nome,
      value: unidade.id,
    })),
);

const opcoesProdutos = computed(() =>
  produtosDisponiveis.value
    .filter((produto) => produto.ativo)
    .map((produto) => ({
      label: produto.nome,
      value: produto.id,
    })),
);

const produtosPorId = computed(
  () => new Map(produtosDisponiveis.value.map((produto) => [produto.id, produto])),
);

const mostrarAlertaUnidades = computed(
  () => dadosIniciaisCarregados.value && opcoesUnidades.value.length === 0,
);

const mostrarAlertaProdutos = computed(
  () => dadosIniciaisCarregados.value && opcoesProdutos.value.length === 0,
);

const captionSaldo = computed(() => {
  if (!isEntrada.value && saldoDisponivel.value !== null && siglaSaldo.value) {
    return `Saldo disponível: ${formatarSaldoComUnidade(saldoDisponivel.value, siglaSaldo.value)}`;
  }

  return undefined;
});

function validarUnidade(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione a unidade';
}

function validarProduto(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o produto';
}

function validarQuantidade(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe a quantidade';
  }

  if (value <= 0) {
    return 'A quantidade deve ser maior que zero';
  }

  if (
    !isEntrada.value &&
    saldoDisponivel.value !== null &&
    value > saldoDisponivel.value
  ) {
    return 'Quantidade maior que o saldo disponível';
  }

  return true;
}

function validarData(value: string): boolean | string {
  return Boolean(value) || 'Informe a data da movimentação';
}

async function carregarSaldo(): Promise<void> {
  if (!form.unidadeId || !form.produtoId) {
    saldoDisponivel.value = null;
    siglaSaldo.value = '';
    return;
  }

  try {
    const saldos = await saldoEstoqueService.listar({
      unidadeId: form.unidadeId,
      produtoId: form.produtoId,
    });

    const saldo = saldos[0];

    if (saldo) {
      saldoDisponivel.value = saldo.saldoAtual;
      siglaSaldo.value = saldo.unidadeMedidaSigla;
    } else {
      saldoDisponivel.value = 0;
      siglaSaldo.value =
        produtosPorId.value.get(form.produtoId)?.unidadeMedidaSigla ?? '';
    }
  } catch {
    saldoDisponivel.value = null;
    siglaSaldo.value = '';
  }
}

async function carregarDadosIniciais(): Promise<void> {
  try {
    const [listaUnidades, listaProdutos] = await Promise.all([
      unidadeService.listar(false),
      produtoService.listar({ includeInactive: false }),
    ]);

    unidadesDisponiveis.value = normalizarLista(listaUnidades);
    produtosDisponiveis.value = normalizarLista(listaProdutos);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function carregarListagem(): Promise<void> {
  carregandoLista.value = true;

  try {
    movimentacoes.value = await movimentacaoEstoqueService.listar({
      tipo: tipoListagem.value,
      limit: LIMITE_LISTAGEM,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregandoLista.value = false;
  }
}

function aplicarQueryInicial(): void {
  const unidadeId = route.query.unidadeId;
  const produtoId = route.query.produtoId;

  if (typeof unidadeId === 'string') {
    form.unidadeId = unidadeId;
  }

  if (typeof produtoId === 'string') {
    form.produtoId = produtoId;
  }
}

function montarPayload(): RegistrarMovimentacaoManualRequest {
  return {
    unidadeId: form.unidadeId!,
    produtoId: form.produtoId!,
    quantidade: form.quantidade!,
    data: deInputDatetimeLocalParaIso(form.data),
    observacao: form.observacao.trim() || null,
  };
}

function limparCamposAposSalvar(): void {
  form.unidadeId = null;
  form.produtoId = null;
  form.quantidade = null;
  form.observacao = '';
  saldoDisponivel.value = null;
  siglaSaldo.value = '';
  formRef.value?.resetValidation();
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    if (isEntrada.value) {
      await movimentacaoEstoqueService.registrarEntradaManual(montarPayload());
      notificacao.sucesso('Entrada de estoque registrada com sucesso.');
    } else {
      await movimentacaoEstoqueService.registrarSaidaManual(montarPayload());
      notificacao.sucesso('Saída de estoque registrada com sucesso.');
    }

    limparCamposAposSalvar();
    await carregarListagem();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'movimentacoes-estoque' });
}

function verPedido(pedidoFornecedorId: string): void {
  router.push({ name: 'pedidos-fornecedor-editar', params: { id: pedidoFornecedorId } });
}

function verAplicacao(aplicacaoPacienteId: string): void {
  router.push({ name: 'aplicacoes-paciente-editar', params: { id: aplicacaoPacienteId } });
}

watch(
  () => [form.unidadeId, form.produtoId],
  () => {
    void carregarSaldo();
  },
);

watch(
  () => route.name,
  () => {
    void carregarListagem();
  },
);

onMounted(async () => {
  carregando.value = true;

  try {
    form.data = deIsoParaInputDatetimeLocal(new Date().toISOString());
    await Promise.all([carregarDadosIniciais(), carregarListagem()]);
    aplicarQueryInicial();
    await carregarSaldo();
  } finally {
    carregando.value = false;
  }
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header :titulo="titulo" :subtitulo="subtitulo" />

    <div class="row q-col-gutter-md movimentacao-estoque-layout">
      <div class="col-12 col-lg-5">
        <q-card flat bordered>
          <q-card-section>
            <q-inner-loading :showing="carregando" />

            <q-form ref="formRef" class="form-stack" @submit.prevent="salvar">
              <div class="row q-col-gutter-md">
                <div class="col-12">
                  <div class="form-field-stack">
                    <q-select
                      v-model="form.unidadeId"
                      class="form-field--required"
                      :options="opcoesUnidades"
                      label="Unidade"
                      outlined
                      emit-value
                      map-options
                      :rules="[validarUnidade]"
                      :readonly="!isAdmin"
                      :disable="!isAdmin"
                    />
                    <app-form-dependencia-alerta
                      v-if="mostrarAlertaUnidades"
                      inline
                      mensagem="Nenhuma unidade cadastrada. Cadastre uma unidade para registrar a movimentação."
                      rotulo-acao="Cadastrar unidade"
                      :destino="{ name: 'unidades-nova' }"
                      @atualizar="carregarDadosIniciais"
                    />
                  </div>
                </div>
                <div class="col-12">
                  <div class="form-field-stack">
                    <q-select
                      v-model="form.produtoId"
                      class="form-field--required"
                      :options="opcoesProdutos"
                      label="Produto"
                      outlined
                      emit-value
                      map-options
                      :rules="[validarProduto]"
                      :readonly="!isAdmin"
                      :disable="!isAdmin"
                    />
                    <app-form-dependencia-alerta
                      v-if="mostrarAlertaProdutos"
                      inline
                      mensagem="Nenhum produto cadastrado. Cadastre um produto para registrar a movimentação."
                      rotulo-acao="Cadastrar produto"
                      :destino="{ name: 'produtos-novo' }"
                      @atualizar="carregarDadosIniciais"
                    />
                  </div>
                </div>
              </div>

              <q-input
                v-model.number="form.quantidade"
                class="form-field--required"
                label="Quantidade"
                outlined
                type="number"
                step="any"
                min="0"
                :caption="captionSaldo"
                :readonly="!isAdmin"
                :rules="[validarQuantidade]"
              />

              <q-input
                v-model="form.data"
                class="form-field--required"
                label="Data da movimentação"
                outlined
                type="datetime-local"
                :readonly="!isAdmin"
                :rules="[validarData]"
              />

              <q-input
                v-model="form.observacao"
                label="Observações"
                outlined
                type="textarea"
                autogrow
                maxlength="2000"
                counter
                :readonly="!isAdmin"
                :hint="
                  isEntrada
                    ? 'Ex.: inventário físico, correção de saldo.'
                    : 'Ex.: produto vencido, quebra ou descarte.'
                "
              />

              <div class="row q-gutter-sm q-mt-md">
                <q-btn
                  color="primary"
                  :label="isEntrada ? 'Registrar entrada' : 'Registrar saída'"
                  type="submit"
                  unelevated
                  no-caps
                  :loading="salvando"
                  :disable="!isAdmin || opcoesUnidades.length === 0 || opcoesProdutos.length === 0"
                />
                <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-7">
        <q-card flat bordered>
          <q-table
            v-if="movimentacoes.length > 0"
            :rows="movimentacoes"
            :columns="colunasListagem"
            row-key="id"
            flat
            :loading="carregandoLista"
            :rows-per-page-options="[10, 25, 50]"
          >
            <template #body-cell-data="props">
              <q-td :props="props">
                {{ formatarDataMovimentacao(props.row.data) }}
              </q-td>
            </template>

            <template #body-cell-tipo="props">
              <q-td :props="props">
                <q-badge
                  :color="obterCorTipoMovimentacao(props.row.tipo)"
                  :label="props.row.tipo"
                />
              </q-td>
            </template>

            <template #body-cell-quantidade="props">
              <q-td :props="props">
                {{ props.row.quantidade.toLocaleString('pt-BR') }}
              </q-td>
            </template>

            <template #body-cell-origem="props">
              <q-td :props="props">
                {{ formatarOrigemMovimentacao(props.row.origem) }}
              </q-td>
            </template>

            <template #body-cell-observacao="props">
              <q-td :props="props">
                {{ props.row.observacao || '—' }}
              </q-td>
            </template>

            <template #body-cell-acoes="cell">
              <app-table-actions-cell :cell="cell">
                <app-table-action-button
                  v-if="cell.row.pedidoFornecedorId"
                  acao="pedido"
                  rotulo="Ver pedido ao fornecedor"
                  @click="verPedido(cell.row.pedidoFornecedorId)"
                />
                <app-table-action-button
                  v-if="cell.row.aplicacaoPacienteId"
                  acao="aplicacao"
                  rotulo="Ver aplicação em paciente"
                  @click="verAplicacao(cell.row.aplicacaoPacienteId)"
                />
              </app-table-actions-cell>
            </template>
          </q-table>

          <q-card-section v-else-if="carregandoLista">
            <app-table-skeleton :columns="colunasListagem.length" />
          </q-card-section>

          <q-card-section v-else>
            <app-empty-state
              :icon="isEntrada ? 'south_west' : 'north_east'"
              :titulo="isEntrada ? 'Nenhuma entrada registrada' : 'Nenhuma saída registrada'"
              texto="As movimentações deste tipo aparecerão aqui após serem registradas."
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped lang="scss">
.movimentacao-estoque-layout {
  align-items: flex-start;
}
</style>
