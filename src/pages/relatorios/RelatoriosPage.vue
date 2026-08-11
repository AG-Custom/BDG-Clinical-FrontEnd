<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import AppMetricCard from '@/components/design-system/AppMetricCard.vue';
import { relatorioService } from '@/services/relatorio.service';
import type { RelatorioOperacional } from '@/types/entidades/relatorio';

const $q = useQuasar();
const carregando = ref(false);
const relatorio = ref<RelatorioOperacional | null>(null);
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

function dataLocal(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}
function semanaAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { inicio: dataLocal(inicio), fim: dataLocal(fim) };
}

const semana = semanaAtual();
const dataInicio = ref(semana.inicio);
const dataFim = ref(semana.fim);
const saldoHint = computed(() => (relatorio.value?.fluxoEstoque.saldo ?? 0) >= 0
  ? 'Entradas menos saídas no período.'
  : 'As saídas superaram as entradas no período.');

async function carregar() {
  if (!dataInicio.value || !dataFim.value || dataFim.value < dataInicio.value) {
    $q.notify({ type: 'negative', message: 'Informe um período válido.' });
    return;
  }
  carregando.value = true;
  try {
    relatorio.value = await relatorioService.obterOperacional(dataInicio.value, dataFim.value);
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível carregar o relatório.' });
  } finally {
    carregando.value = false;
  }
}
function usarSemanaAtual() {
  const periodo = semanaAtual();
  dataInicio.value = periodo.inicio;
  dataFim.value = periodo.fim;
  void carregar();
}
onMounted(carregar);
</script>

<template>
  <q-page padding class="report-page">
    <div class="report-shell">
      <h1 class="text-h4 text-weight-bold q-my-none">Relatórios</h1>
      <p class="text-grey-7 q-mt-sm q-mb-lg">Acompanhe a operação e a movimentação de estoque da clínica.</p>

      <q-card flat bordered class="q-mb-lg"><q-card-section class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-4"><q-input v-model="dataInicio" outlined dense type="date" label="Data inicial" /></div>
        <div class="col-12 col-sm-4"><q-input v-model="dataFim" outlined dense type="date" label="Data final" /></div>
        <div class="col-12 col-sm-auto row q-gutter-sm">
          <q-btn unelevated color="primary" label="Aplicar período" :loading="carregando" @click="carregar" />
          <q-btn flat color="primary" label="Semana atual" @click="usarSemanaAtual" />
        </div>
      </q-card-section></q-card>

      <div class="text-h6 text-weight-bold q-mb-md">Agendamentos</div>
      <div class="row q-col-gutter-md q-mb-xl">
        <div class="col-12 col-sm-6 col-lg-3"><AppMetricCard label="Consultas" icon="medical_services" :valor="relatorio?.agendamentos.consulta ?? 0" /></div>
        <div class="col-12 col-sm-6 col-lg-3"><AppMetricCard label="Aplicações" icon="vaccines" :valor="relatorio?.agendamentos.aplicacao ?? 0" /></div>
        <div class="col-12 col-sm-6 col-lg-3"><AppMetricCard label="Retornos" icon="event_repeat" :valor="relatorio?.agendamentos.retorno ?? 0" /></div>
        <div class="col-12 col-sm-6 col-lg-3"><AppMetricCard label="Total" icon="calendar_month" :valor="relatorio?.agendamentos.total ?? 0" hint="Agendamentos cancelados não são contabilizados." /></div>
      </div>

      <div class="text-h6 text-weight-bold q-mb-md">Fluxo financeiro do estoque</div>
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-4"><AppMetricCard label="Valor que entrou" icon="south_west" :valor="moeda.format(relatorio?.fluxoEstoque.entradas ?? 0)" /></div>
        <div class="col-12 col-md-4"><AppMetricCard label="Valor que saiu" icon="north_east" :valor="moeda.format(relatorio?.fluxoEstoque.saidas ?? 0)" /></div>
        <div class="col-12 col-md-4"><AppMetricCard label="Saldo do período" icon="account_balance_wallet" :valor="moeda.format(relatorio?.fluxoEstoque.saldo ?? 0)" :hint="saldoHint" /></div>
      </div>
      <q-banner rounded class="bg-blue-1 text-blue-10 q-mb-xl">Valores estimados pelo custo unitário do estoque. Transferências internas são desconsideradas para evitar dupla contabilização.</q-banner>

      <q-card flat bordered>
        <q-card-section><div class="text-h6 text-weight-bold">Medicamentos usados</div><div class="text-caption text-grey-7">Consumo registrado em aplicações realizadas no período.</div></q-card-section>
        <q-separator />
        <q-table flat :rows="relatorio?.medicamentosUsados ?? []" :loading="carregando" row-key="produtoId"
          :columns="[{ name: 'produto', label: 'Medicamento', field: 'produtoNome', align: 'left', sortable: true }, { name: 'quantidade', label: 'Quantidade usada', field: 'quantidade', align: 'right', sortable: true }]"
          :pagination="{ rowsPerPage: 10 }" no-data-label="Nenhum medicamento usado neste período.">
          <template #body-cell-quantidade="props"><q-td :props="props"><strong>{{ numero.format(props.row.quantidade) }}</strong> {{ props.row.unidadeMedida }}</q-td></template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<style scoped>
.report-page { background: #fafcfb; }
.report-shell { width: 100%; max-width: 1280px; margin: 0 auto; }
</style>
