<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { agendamentoService } from '@/services/agendamento.service';
import { funcionarioService } from '@/services/funcionario.service';
import { horarioFuncionamentoUnidadeService } from '@/services/horario-funcionamento-unidade.service';
import { unidadeService } from '@/services/unidade.service';
import type { Agendamento } from '@/types/entidades/agendamento';
import type { Funcionario } from '@/types/entidades/funcionario';
import type { ConfigCalendarioHorario } from '@/types/entidades/horario-funcionamento-unidade';
import { obterConfigCalendarioHorarios } from '@/types/entidades/horario-funcionamento-unidade';
import type { Unidade } from '@/types/entidades/unidade';
import { normalizarLista } from '@/utils/normalizar-lista';

import AgendaCalendar from '@/components/agendamentos/AgendaCalendar.vue';

const AgendamentoFormDialog = defineAsyncComponent(
  () => import('@/components/agendamentos/AgendamentoFormDialog.vue'),
);
const AgendamentoDetalheDialog = defineAsyncComponent(
  () => import('@/components/agendamentos/AgendamentoDetalheDialog.vue'),
);

type VisualizacaoAgenda = 'timeGridWeek' | 'timeGridDay' | 'dayGridMonth';

const auth = useAuth();
const { usuario } = auth;
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const calendarRef = ref<InstanceType<typeof AgendaCalendar> | null>(null);
const agendamentos = ref<Agendamento[]>([]);
const carregando = ref(true);
const unidades = ref<Unidade[]>([]);
const funcionarios = ref<Funcionario[]>([]);
const filtroUnidadeId = ref<string | null>(null);
const filtroFuncionarioId = ref<string | null>(null);
const visualizacao = ref<VisualizacaoAgenda>('timeGridWeek');
const tituloPeriodo = ref('');
const periodoAtual = ref<{ inicio: Date; fim: Date } | null>(null);

const dialogForm = ref(false);
const dialogDetalhe = ref(false);
const agendamentoSelecionado = ref<Agendamento | null>(null);
const agendamentoEdicao = ref<Agendamento | null>(null);
const intervaloNovo = ref<{ inicio: Date; fim: Date } | null>(null);
const configHorario = ref<ConfigCalendarioHorario | null>(null);
const carregandoHorario = ref(false);
const horariosResolvidos = ref(false);

const unidadeFiltroNome = computed(() => {
  if (!filtroUnidadeId.value) {
    return null;
  }

  return unidades.value.find((u) => u.id === filtroUnidadeId.value)?.nome ?? null;
});

const possuiHorarioConfigurado = computed(() => configHorario.value?.possuiHorario === true);

const exibirAvisoSemHorario = computed(
  () => horariosResolvidos.value && !carregandoHorario.value && !possuiHorarioConfigurado.value,
);

const agendaPronta = computed(
  () => horariosResolvidos.value && possuiHorarioConfigurado.value,
);

const linkHorarioFuncionamento = computed(() => {
  if (filtroUnidadeId.value) {
    return {
      name: 'unidades-horario-funcionamento' as const,
      params: { id: filtroUnidadeId.value },
    };
  }

  return { name: 'unidades' as const };
});
const saudacao = computed(() => {
  const hora = new Date().getHours();
  const nome = usuario.value?.nome?.split(' ')[0] || 'Olá';

  if (hora < 12) return `Bom dia, ${nome}`;
  if (hora < 18) return `Boa tarde, ${nome}`;

  return `Boa noite, ${nome}`;
});

const opcoesUnidades = computed(() => [
  { label: 'Todas as unidades', value: null },
  ...unidades.value
    .filter((u) => u.ativo)
    .map((u) => ({ label: u.nome, value: u.id })),
]);

const opcoesFuncionarios = computed(() => [
  { label: 'Todos os profissionais', value: null },
  ...funcionarios.value
    .filter((f) => f.ativo)
    .map((f) => ({ label: f.nome, value: f.id })),
]);

const agendamentosHoje = ref(0);

const opcoesVisualizacao = [
  { label: 'Dia', value: 'timeGridDay' as const },
  { label: 'Semana', value: 'timeGridWeek' as const },
  { label: 'Mês', value: 'dayGridMonth' as const },
];

function atualizarTituloPeriodo(): void {
  tituloPeriodo.value = calendarRef.value?.obterTituloPeriodo() ?? '';
}

async function atualizarContagemHoje(): Promise<void> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  if (periodoAtual.value) {
    const inicioPeriodo = periodoAtual.value.inicio.getTime();
    const fimPeriodo = periodoAtual.value.fim.getTime();

    if (hoje.getTime() >= inicioPeriodo && hoje.getTime() < fimPeriodo) {
      agendamentosHoje.value = agendamentos.value.filter((agendamento) => {
        const inicio = new Date(agendamento.dataInicio);
        return inicio >= hoje && inicio < amanha && agendamento.status !== 'Cancelado';
      }).length;
      return;
    }
  }

  try {
    const lista = await agendamentoService.listar({
      unidadeId: filtroUnidadeId.value ?? undefined,
      funcionarioId: filtroFuncionarioId.value ?? undefined,
      dataInicioFrom: hoje.toISOString(),
      dataInicioTo: amanha.toISOString(),
    });

    agendamentosHoje.value = lista.filter((a) => a.status !== 'Cancelado').length;
  } catch {
    agendamentosHoje.value = 0;
  }
}

async function carregarHorarioFuncionamento(): Promise<void> {
  carregandoHorario.value = true;

  try {
    const unidadesAtivas = unidades.value.filter((u) => u.ativo);
    const idsParaCarregar = filtroUnidadeId.value
      ? [filtroUnidadeId.value]
      : unidadesAtivas.map((u) => u.id);

    if (idsParaCarregar.length === 0) {
      configHorario.value = obterConfigCalendarioHorarios([]);
      return;
    }

    const listas = await Promise.all(
      idsParaCarregar.map((id) => horarioFuncionamentoUnidadeService.listar(id)),
    );

    configHorario.value = obterConfigCalendarioHorarios(listas.flat());
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
    configHorario.value = obterConfigCalendarioHorarios([]);
  } finally {
    carregandoHorario.value = false;
    horariosResolvidos.value = true;
  }
}

async function carregarFuncionariosFiltro(): Promise<void> {
  try {
    funcionarios.value = normalizarLista(
      await funcionarioService.listar({
        unidadeId: filtroUnidadeId.value ?? undefined,
      }),
    );
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
    funcionarios.value = [];
  }
}

async function carregarFiltros(): Promise<void> {
  try {
    unidades.value = normalizarLista(await unidadeService.listar());
    await carregarFuncionariosFiltro();
    await carregarHorarioFuncionamento();
    await atualizarContagemHoje();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  }
}

async function carregarAgendamentos(): Promise<void> {
  if (!periodoAtual.value) {
    return;
  }

  carregando.value = true;

  try {
    agendamentos.value = await agendamentoService.listar({
      unidadeId: filtroUnidadeId.value ?? undefined,
      funcionarioId: filtroFuncionarioId.value ?? undefined,
      dataInicioFrom: periodoAtual.value.inicio.toISOString(),
      dataInicioTo: periodoAtual.value.fim.toISOString(),
    });
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
    agendamentos.value = [];
  } finally {
    carregando.value = false;
    atualizarTituloPeriodo();
    void atualizarContagemHoje();
  }
}

function aoAlterarPeriodo(inicio: Date, fim: Date): void {
  const inicioMs = inicio.getTime();
  const fimMs = fim.getTime();

  if (
    periodoAtual.value?.inicio.getTime() === inicioMs &&
    periodoAtual.value?.fim.getTime() === fimMs
  ) {
    return;
  }

  periodoAtual.value = { inicio, fim };
  void carregarAgendamentos();
}

function aoSelecionarIntervalo(inicio: Date, fim: Date): void {
  agendamentoEdicao.value = null;
  intervaloNovo.value = { inicio, fim };
  dialogForm.value = true;
}

function aoClicarEvento(agendamento: Agendamento): void {
  agendamentoSelecionado.value = agendamento;
  dialogDetalhe.value = true;
}

function abrirNovoAgendamento(): void {
  agendamentoEdicao.value = null;
  intervaloNovo.value = null;
  dialogForm.value = true;
}

function aoEditarAgendamento(agendamento: Agendamento): void {
  agendamentoEdicao.value = agendamento;
  intervaloNovo.value = null;
  dialogForm.value = true;
}

async function aoAlterarFiltroUnidade(): Promise<void> {
  filtroFuncionarioId.value = null;
  await carregarFuncionariosFiltro();
  void carregarHorarioFuncionamento();
  void carregarAgendamentos();
}

function aoAlterarFiltroFuncionario(): void {
  void carregarAgendamentos();
}

function aoSalvarAgendamento(): void {
  void carregarAgendamentos();
}

function irParaHoje(): void {
  calendarRef.value?.irParaHoje();
  atualizarTituloPeriodo();
}

function retroceder(): void {
  calendarRef.value?.retroceder();
  atualizarTituloPeriodo();
}

function avancar(): void {
  calendarRef.value?.avancar();
  atualizarTituloPeriodo();
}

function alterarVisualizacao(novaVisualizacao: VisualizacaoAgenda): void {
  visualizacao.value = novaVisualizacao;
  calendarRef.value?.alterarVisualizacao(novaVisualizacao);
  atualizarTituloPeriodo();
}

onMounted(async () => {
  await carregarFiltros();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md agenda-page">
    <app-page-header :titulo="saudacao" subtitulo="Gerencie os agendamentos da clínica">
      <template #contexto>
        <app-empresa-marca variant="contexto" />
      </template>
      <q-btn
        unelevated
        color="primary"
        icon="add"
        label="Novo agendamento"
        no-caps
        :disable="!agendaPronta"
        @click="abrirNovoAgendamento"
      />
    </app-page-header>

    <div class="agenda-page__toolbar q-mb-md">
      <div class="agenda-page__toolbar-nav">
        <q-btn flat round dense icon="chevron_left" aria-label="Período anterior" @click="retroceder" />
        <q-btn flat label="Hoje" no-caps color="primary" @click="irParaHoje" />
        <q-btn flat round dense icon="chevron_right" aria-label="Próximo período" @click="avancar" />
        <span class="agenda-page__periodo-titulo">{{ tituloPeriodo }}</span>
      </div>

      <div class="agenda-page__toolbar-filtros">
        <div class="agenda-page__view-toggle" role="group" aria-label="Visualização da agenda">
          <q-btn
            v-for="opcao in opcoesVisualizacao"
            :key="opcao.value"
            flat
            dense
            no-caps
            :label="opcao.label"
            class="agenda-page__view-toggle-btn"
            :class="{ 'agenda-page__view-toggle-btn--ativo': visualizacao === opcao.value }"
            @click="alterarVisualizacao(opcao.value)"
          />
        </div>

        <q-select
          v-model="filtroUnidadeId"
          :options="opcoesUnidades"
          label="Unidade"
          outlined
          dense
          emit-value
          map-options
          class="agenda-page__filtro"
          @update:model-value="aoAlterarFiltroUnidade"
        />

        <q-select
          v-model="filtroFuncionarioId"
          :options="opcoesFuncionarios"
          label="Profissional"
          outlined
          dense
          emit-value
          map-options
          class="agenda-page__filtro"
          @update:model-value="aoAlterarFiltroFuncionario"
        />
      </div>
    </div>

    <div class="agenda-page__resumo q-mb-md">
      <span class="agenda-page__resumo-chip">
        <q-icon name="today" size="16px" />
        {{ agendamentosHoje }} agendamento{{ agendamentosHoje === 1 ? '' : 's' }} hoje
      </span>
      <span v-if="carregando" class="agenda-page__carregando-texto">Atualizando…</span>
    </div>

    <q-banner
      v-if="exibirAvisoSemHorario"
      class="bg-warning text-dark q-mb-md"
      rounded
    >
      <template #avatar>
        <q-icon name="schedule" color="dark" />
      </template>
      <span v-if="filtroUnidadeId && unidadeFiltroNome">
        A unidade <strong>{{ unidadeFiltroNome }}</strong> ainda não possui horário de
        funcionamento configurado. A agenda ficará indisponível até o cadastro dos horários.
      </span>
      <span v-else>
        Nenhuma unidade possui horário de funcionamento configurado. Configure os horários para
        liberar agendamentos na agenda.
      </span>
      <template #action>
        <q-btn
          flat
          color="dark"
          label="Configurar horários"
          no-caps
          :to="linkHorarioFuncionamento"
        />
      </template>
    </q-banner>

    <q-card flat bordered class="agenda-page__calendario-card">
      <q-card-section v-if="!horariosResolvidos" class="agenda-page__agenda-placeholder">
        <span class="agenda-page__agenda-placeholder-text">Preparando agenda…</span>
      </q-card-section>

      <q-card-section v-else-if="agendaPronta" class="q-pa-sm">
        <agenda-calendar
          ref="calendarRef"
          :agendamentos="agendamentos"
          :carregando="carregando"
          :config-horario="configHorario"
          @periodo-alterado="aoAlterarPeriodo"
          @selecionar-intervalo="aoSelecionarIntervalo"
          @clicar-evento="aoClicarEvento"
        />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="schedule"
          titulo="Horário de funcionamento não configurado"
          texto="Cadastre os dias e horários em que a clínica aceita agendamentos para visualizar a agenda."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Configurar horários"
            icon="schedule"
            unelevated
            no-caps
            :to="linkHorarioFuncionamento"
          />
        </div>
      </q-card-section>
    </q-card>

    <agendamento-form-dialog
      v-model="dialogForm"
      :agendamento="agendamentoEdicao"
      :intervalo-inicial="intervaloNovo"
      @salvo="aoSalvarAgendamento"
    />

    <agendamento-detalhe-dialog
      v-model="dialogDetalhe"
      :agendamento="agendamentoSelecionado"
      @editar="aoEditarAgendamento"
      @atualizado="aoSalvarAgendamento"
    />
  </q-page>
</template>

<style scoped lang="scss">
.agenda-page__toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-3);
  justify-content: space-between;
}

.agenda-page__toolbar-nav {
  align-items: center;
  display: flex;
  gap: var(--ds-space-1);
}

.agenda-page__periodo-titulo {
  color: var(--ds-text-primary);
  font-size: var(--ds-font-size-lg, 1.125rem);
  font-weight: var(--ds-font-weight-semibold);
  margin-left: var(--ds-space-2);
}

.agenda-page__toolbar-filtros {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}

.agenda-page__view-toggle {
  background: var(--ds-bg-page);
  border: 1px solid var(--ds-border-default);
  border-radius: 999px;
  display: inline-flex;
  gap: 2px;
  padding: 3px;
}

.agenda-page__view-toggle-btn {
  border-radius: 999px !important;
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm, 0.875rem);
  min-height: 30px;
  padding: 0 var(--ds-space-3);
  transition: none;

  &::before {
    transition: none;
  }

  &--ativo {
    background: var(--ds-brand-primary) !important;
    color: #fff !important;
    font-weight: var(--ds-font-weight-medium);
  }
}

.agenda-page__filtro {
  min-width: 180px;
}

.agenda-page__resumo {
  align-items: center;
  display: flex;
  gap: var(--ds-space-3);
}

.agenda-page__resumo-chip {
  align-items: center;
  background: var(--ds-bg-subtle);
  border-radius: 999px;
  color: var(--ds-text-primary);
  display: inline-flex;
  font-size: var(--ds-font-size-sm, 0.875rem);
  gap: var(--ds-space-1);
  padding: var(--ds-space-1) var(--ds-space-3);
}

.agenda-page__horario-carregando {
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm, 0.875rem);
  padding: var(--ds-space-4);
}

.agenda-page__agenda-placeholder {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 480px;
}

.agenda-page__agenda-placeholder-text {
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm, 0.875rem);
}

.agenda-page__carregando-texto {
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm, 0.875rem);
}

.agenda-page__calendario-card {
  overflow: hidden;
}
</style>
