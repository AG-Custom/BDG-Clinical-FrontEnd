<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { QForm } from 'quasar';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { movimentacaoEstoqueService } from '@/services/movimentacao-estoque.service';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import { unidadeService } from '@/services/unidade.service';
import type { Produto } from '@/types/entidades/produto';
import type { Unidade } from '@/types/entidades/unidade';
import { deInputDatetimeLocalParaIso, deIsoBackendParaInputDatetimeLocal } from '@/utils/data-hora';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const formRef = ref<QForm | null>(null);
const carregando = ref(true);
const salvando = ref(false);
const unidades = ref<Unidade[]>([]);
const produtos = ref<Produto[]>([]);
const saldoDisponivel = ref<number | null>(null);

const form = reactive({
  unidadeOrigemId: null as string | null,
  unidadeDestinoId: null as string | null,
  produtoId: null as string | null,
  quantidade: null as number | null,
  data: deIsoBackendParaInputDatetimeLocal(new Date().toISOString()),
  observacao: '',
});

const opcoesOrigem = computed(() => unidades.value.map((u) => ({ label: u.nome, value: u.id })));
const opcoesDestino = computed(() => unidades.value
  .filter((u) => u.id !== form.unidadeOrigemId)
  .map((u) => ({ label: u.nome, value: u.id })));
const opcoesProdutos = computed(() => produtos.value.map((p) => ({ label: p.nome, value: p.id })));
const produtoSelecionado = computed(() => produtos.value.find((p) => p.id === form.produtoId));
const saldoFormatado = computed(() => {
  if (saldoDisponivel.value === null) return 'Selecione a origem e o produto';
  const sigla = produtoSelecionado.value?.unidadeMedidaSigla ?? '';
  return `Saldo disponível: ${saldoDisponivel.value.toLocaleString('pt-BR')} ${sigla}`.trim();
});

async function carregarSaldo(): Promise<void> {
  saldoDisponivel.value = null;
  if (!form.unidadeOrigemId || !form.produtoId) return;
  try {
    const saldos = await saldoEstoqueService.listar({
      unidadeId: form.unidadeOrigemId,
      produtoId: form.produtoId,
    });
    saldoDisponivel.value = saldos[0]?.saldoAtual ?? 0;
  } catch {
    saldoDisponivel.value = null;
  }
}

function validarQuantidade(value: number | null): boolean | string {
  if (value === null || value <= 0) return 'Informe uma quantidade maior que zero';
  if (saldoDisponivel.value !== null && value > saldoDisponivel.value) {
    return 'A quantidade excede o saldo disponível na origem';
  }
  return true;
}

async function salvar(): Promise<void> {
  const valido = await formRef.value?.validate();
  if (!valido || !form.unidadeOrigemId || !form.unidadeDestinoId || !form.produtoId || !form.quantidade) return;

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
    notificacao.sucesso('Estoque transferido com sucesso.');
    await router.push({ name: 'movimentacoes-estoque', query: { produtoId: form.produtoId } });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

watch(() => [form.unidadeOrigemId, form.produtoId], () => void carregarSaldo());
watch(() => form.unidadeOrigemId, () => {
  if (form.unidadeDestinoId === form.unidadeOrigemId) form.unidadeDestinoId = null;
});

onMounted(async () => {
  try {
    const [listaUnidades, listaProdutos] = await Promise.all([
      unidadeService.listar(false),
      produtoService.listar({ includeInactive: false }),
    ]);
    unidades.value = listaUnidades;
    produtos.value = listaProdutos.filter((produto) => produto.controlaEstoque);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
});
</script>

<template>
  <q-page class="page-content q-pa-md">
    <app-page-header titulo="Transferir estoque" subtitulo="Movimente produtos entre unidades ativas da mesma empresa." />
    <q-card flat bordered class="transfer-card">
      <q-card-section>
        <q-inner-loading :showing="carregando" />
        <q-banner v-if="unidades.length < 2 && !carregando" rounded class="bg-warning text-dark q-mb-md">
          Cadastre pelo menos duas unidades ativas para realizar uma transferência.
        </q-banner>
        <q-form ref="formRef" class="form-stack" greedy @submit.prevent="salvar">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-select v-model="form.unidadeOrigemId" label="Unidade de origem" outlined emit-value map-options
                :options="opcoesOrigem" :rules="[(v) => Boolean(v) || 'Informe a unidade de origem']" />
            </div>
            <div class="col-12 col-md-6">
              <q-select v-model="form.unidadeDestinoId" label="Unidade de destino" outlined emit-value map-options
                :options="opcoesDestino" :disable="!form.unidadeOrigemId"
                :rules="[(v) => Boolean(v) || 'Informe uma unidade de destino diferente']" />
            </div>
          </div>
          <q-select v-model="form.produtoId" label="Produto" outlined emit-value map-options
            :options="opcoesProdutos" :rules="[(v) => Boolean(v) || 'Informe o produto']" />
          <q-input v-model.number="form.quantidade" label="Quantidade" outlined type="number" min="0" step="any"
            :hint="saldoFormatado" :rules="[validarQuantidade]" />
          <q-input v-model="form.data" label="Data da transferência" outlined type="datetime-local"
            :rules="[(v) => Boolean(v) || 'Informe a data da transferência']" />
          <q-input v-model="form.observacao" label="Observação" outlined type="textarea" autogrow maxlength="2000" counter
            hint="Ex.: reposição de estoque da unidade de destino." />
          <div class="row q-gutter-sm q-mt-md">
            <q-btn label="Transferir estoque" color="primary" type="submit" unelevated no-caps
              :loading="salvando" :disable="carregando || unidades.length < 2" />
            <q-btn label="Cancelar" flat color="primary" no-caps @click="router.back()" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.transfer-card { max-width: 760px; }
</style>
