<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { QForm } from 'quasar';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { movimentacaoEstoqueService } from '@/services/movimentacao-estoque.service';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import { unidadeService } from '@/services/unidade.service';
import type { Produto } from '@/types/entidades/produto';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import type { Unidade } from '@/types/entidades/unidade';
import { deInputDatetimeLocalParaIso, deIsoBackendParaInputDatetimeLocal } from '@/utils/data-hora';
import { normalizarLista } from '@/utils/normalizar-lista';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeMovimentar = usePermissao(permissoes.estoque.movimentar);

const formRef = ref<QForm | null>(null);
const carregando = ref(true);
const salvando = ref(false);
const dadosIniciaisCarregados = ref(false);
const unidades = ref<Unidade[]>([]);
const produtos = ref<Produto[]>([]);
const saldoDisponivel = ref<number | null>(null);
const siglaSaldo = ref('');

const form = reactive({
  unidadeOrigemId: null as string | null,
  unidadeDestinoId: null as string | null,
  produtoId: null as string | null,
  quantidade: null as number | null,
  data: deIsoBackendParaInputDatetimeLocal(new Date().toISOString()),
  observacao: '',
});

const opcoesOrigem = computed(() =>
  unidades.value
    .filter((unidade) => unidade.ativo)
    .map((unidade) => ({ label: unidade.nome, value: unidade.id })),
);

const opcoesDestino = computed(() =>
  unidades.value
    .filter((unidade) => unidade.ativo && unidade.id !== form.unidadeOrigemId)
    .map((unidade) => ({ label: unidade.nome, value: unidade.id })),
);

const opcoesProdutos = computed(() =>
  produtos.value
    .filter((produto) => produto.ativo && produto.controlaEstoque)
    .map((produto) => ({ label: produto.nome, value: produto.id })),
);

const produtoSelecionado = computed(() =>
  produtos.value.find((produto) => produto.id === form.produtoId) ?? null,
);

const mostrarAlertaUnidades = computed(
  () => dadosIniciaisCarregados.value && opcoesOrigem.value.length < 2,
);

const mostrarAlertaProdutos = computed(
  () => dadosIniciaisCarregados.value && opcoesProdutos.value.length === 0,
);

const formDesabilitado = computed(
  () =>
    !podeMovimentar.value ||
    carregando.value ||
    mostrarAlertaUnidades.value ||
    mostrarAlertaProdutos.value,
);

const saldoFormatado = computed(() => {
  if (saldoDisponivel.value === null) {
    return 'Selecione a origem e o produto';
  }

  return `Saldo disponível: ${formatarSaldoComUnidade(saldoDisponivel.value, siglaSaldo.value)}`;
});

function obterQueryId(chave: string): string | null {
  const valor = route.query[chave];
  return typeof valor === 'string' && valor.trim() ? valor : null;
}

function aplicarPrefillDaUrl(): void {
  const unidadeOrigemId = obterQueryId('unidadeOrigemId') ?? obterQueryId('unidadeId');
  const produtoId = obterQueryId('produtoId');

  if (unidadeOrigemId) {
    form.unidadeOrigemId = unidadeOrigemId;
  }

  if (produtoId) {
    form.produtoId = produtoId;
  }
}

async function carregarDadosIniciais(): Promise<void> {
  carregando.value = true;

  try {
    const [listaUnidades, listaProdutos] = await Promise.all([
      unidadeService.listar(false),
      produtoService.listar({ includeInactive: false }),
    ]);

    unidades.value = normalizarLista(listaUnidades);
    produtos.value = normalizarLista(listaProdutos).filter((produto) => produto.controlaEstoque);
    dadosIniciaisCarregados.value = true;
    aplicarPrefillDaUrl();
    await carregarSaldo();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

async function carregarSaldo(): Promise<void> {
  saldoDisponivel.value = null;
  siglaSaldo.value = '';

  if (!form.unidadeOrigemId || !form.produtoId) {
    return;
  }

  try {
    const saldos = await saldoEstoqueService.listar({
      unidadeId: form.unidadeOrigemId,
      produtoId: form.produtoId,
    });
    const saldo = saldos[0];
    saldoDisponivel.value = saldo?.saldoAtual ?? 0;
    siglaSaldo.value =
      saldo?.unidadeMedidaSigla ?? produtoSelecionado.value?.unidadeMedidaSigla ?? '';
  } catch {
    saldoDisponivel.value = null;
    siglaSaldo.value = '';
  }
}

function validarQuantidade(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe a quantidade a transferir (maior que zero)';
  }

  if (value <= 0) {
    return 'A quantidade a transferir deve ser maior que zero';
  }

  if (saldoDisponivel.value !== null && value > saldoDisponivel.value) {
    return `A quantidade excede o saldo disponível na origem (${formatarSaldoComUnidade(saldoDisponivel.value, siglaSaldo.value)})`;
  }

  return true;
}

async function salvar(): Promise<void> {
  if (formDesabilitado.value) {
    return;
  }

  const valido = await formRef.value?.validate();
  if (
    !valido ||
    !form.unidadeOrigemId ||
    !form.unidadeDestinoId ||
    !form.produtoId ||
    form.quantidade === null ||
    Number.isNaN(form.quantidade)
  ) {
    return;
  }

  salvando.value = true;

  try {
    await movimentacaoEstoqueService.transferir({
      unidadeOrigemId: form.unidadeOrigemId,
      unidadeDestinoId: form.unidadeDestinoId,
      produtoId: form.produtoId,
      quantidade: form.quantidade,
      data: deInputDatetimeLocalParaIso(form.data),
      observacao: form.observacao.trim() || null,
    });
    notificacao.sucesso('Transferência concluída. O estoque foi movimentado entre as unidades.');
    await router.push({
      name: 'movimentacoes-estoque',
      query: { produtoId: form.produtoId },
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  void router.push({ name: 'movimentacoes-estoque' });
}

watch(
  () => [form.unidadeOrigemId, form.produtoId],
  () => {
    void carregarSaldo();
  },
);

watch(
  () => form.unidadeOrigemId,
  () => {
    if (form.unidadeDestinoId === form.unidadeOrigemId) {
      form.unidadeDestinoId = null;
    }
  },
);

onMounted(() => {
  void carregarDadosIniciais();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      titulo="Transferir estoque"
      subtitulo="Movimente produtos entre unidades ativas da mesma empresa. Medicamentos usam FEFO automático nos lotes ativos e não vencidos."
    />

    <q-card flat bordered>
      <q-card-section>
        <p
          v-if="carregando"
          class="text-body2 text-grey-7 q-mb-md"
        >
          Carregando unidades e produtos…
        </p>

        <q-form
          ref="formRef"
          class="form-stack"
          greedy
          lazy-rules
          @submit.prevent="salvar"
        >
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="form-field-stack">
                <q-select
                  v-model="form.unidadeOrigemId"
                  class="form-field--required"
                  label="Unidade de origem"
                  outlined
                  emit-value
                  map-options
                  :options="opcoesOrigem"
                  :readonly="formDesabilitado"
                  :disable="formDesabilitado"
                  :rules="[(v) => Boolean(v) || 'Selecione a unidade de origem que enviará o estoque']"
                />
                <app-form-dependencia-alerta
                  v-if="mostrarAlertaUnidades"
                  inline
                  mensagem="É necessário ter pelo menos duas unidades ativas para transferir estoque entre elas."
                  rotulo-acao="Cadastrar unidade"
                  :destino="{ name: 'unidades-nova' }"
                  @atualizar="carregarDadosIniciais"
                />
              </div>
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.unidadeDestinoId"
                class="form-field--required"
                label="Unidade de destino"
                outlined
                emit-value
                map-options
                :options="opcoesDestino"
                :readonly="formDesabilitado || !form.unidadeOrigemId"
                :disable="formDesabilitado || !form.unidadeOrigemId"
                :rules="[(v) => Boolean(v) || 'Selecione uma unidade de destino diferente da origem']"
              />
            </div>
          </div>

          <div class="form-field-stack">
            <q-select
              v-model="form.produtoId"
              class="form-field--required"
              label="Produto"
              outlined
              emit-value
              map-options
              :options="opcoesProdutos"
              :readonly="formDesabilitado"
              :disable="formDesabilitado"
              :rules="[(v) => Boolean(v) || 'Selecione o produto que será transferido']"
            />
            <app-form-dependencia-alerta
              v-if="mostrarAlertaProdutos"
              inline
              mensagem="Nenhum produto com controle de estoque está disponível para transferência."
              rotulo-acao="Cadastrar produto"
              :destino="{ name: 'produtos-novo' }"
              @atualizar="carregarDadosIniciais"
            />
          </div>

          <q-input
            v-model.number="form.quantidade"
            class="form-field--required"
            label="Quantidade"
            outlined
            type="number"
            min="0"
            step="any"
            :hint="saldoFormatado"
            :readonly="formDesabilitado"
            :disable="formDesabilitado"
            :rules="[validarQuantidade]"
          />

          <q-input
            v-model="form.data"
            class="form-field--required"
            label="Data da transferência"
            outlined
            type="datetime-local"
            :readonly="formDesabilitado"
            :disable="formDesabilitado"
            :rules="[(v) => Boolean(v) || 'Informe a data e hora da transferência']"
          />

          <q-input
            v-model="form.observacao"
            label="Observação"
            outlined
            type="textarea"
            autogrow
            maxlength="2000"
            counter
            hint="Ex.: reposição de estoque da unidade de destino."
            :readonly="formDesabilitado"
            :disable="formDesabilitado"
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              label="Transferir estoque"
              color="primary"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="formDesabilitado"
            />
            <q-btn
              label="Cancelar"
              flat
              color="primary"
              no-caps
              @click="cancelar"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
