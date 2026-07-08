<script setup lang="ts">
import type {
  CalendarApi,
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/vue3';
import { computed, ref, shallowRef, watch } from 'vue';

import type { Agendamento } from '@/types/entidades/agendamento';
import {
  obterCorEventoAgendamento,
  obterLabelTipoAgendamento,
  formatarNomesProcedimentos,
} from '@/types/entidades/agendamento';
import type { ConfigCalendarioHorario } from '@/types/entidades/horario-funcionamento-unidade';
import { parsearDataBackend } from '@/utils/data-hora';

const CALENDAR_PLUGINS = [dayGridPlugin, timeGridPlugin, interactionPlugin];

const props = withDefaults(
  defineProps<{
    agendamentos: Agendamento[];
    carregando?: boolean;
    configHorario?: ConfigCalendarioHorario | null;
  }>(),
  {
    configHorario: null,
  },
);

const emit = defineEmits<{
  periodoAlterado: [inicio: Date, fim: Date];
  selecionarIntervalo: [inicio: Date, fim: Date];
  clicarEvento: [agendamento: Agendamento];
}>();

const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null);
const visualizacaoAtual = ref<'timeGridWeek' | 'timeGridDay' | 'dayGridMonth'>('timeGridWeek');
const calendarioPronto = ref(false);
let configHorarioAplicada: string | null = null;
let eventosAplicados: string | null = null;
let ultimoPeriodoEmitido: string | null = null;

const horarioAtivo = computed(() => props.configHorario?.possuiHorario === true);

const eventos = computed<EventInput[]>(() =>
  props.agendamentos.map((agendamento) => ({
    id: agendamento.id,
    title: agendamento.pacienteNome,
    start: parsearDataBackend(agendamento.dataInicio),
    end: parsearDataBackend(agendamento.dataFim),
    backgroundColor: obterCorEventoAgendamento(agendamento.status),
    borderColor: obterCorEventoAgendamento(agendamento.status),
    extendedProps: { agendamento },
    classNames:
      agendamento.status === 'Cancelado' || agendamento.status === 'Faltou'
        ? ['agenda-calendar__evento--inativo']
        : [],
  })),
);

function escaparHtml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderizarConteudoEvento(arg: EventContentArg) {
  const agendamento = arg.event.extendedProps.agendamento as Agendamento | undefined;

  if (!agendamento) {
    return { html: '' };
  }

  const ehMes = arg.view.type === 'dayGridMonth';
  const hora = arg.timeText
    ? `<div class="agenda-evento-card__hora">${escaparHtml(arg.timeText)}</div>`
    : '';
  const nomePaciente = escaparHtml(agendamento.pacienteNome);
  const tipo = escaparHtml(obterLabelTipoAgendamento(agendamento.tipo));
  const funcionario = escaparHtml(agendamento.funcionarioNome);
  const procedimentos = formatarNomesProcedimentos(agendamento);
  const procedimentosHtml = procedimentos
    ? `<span class="agenda-evento-card__separador" aria-hidden="true">·</span><span class="agenda-evento-card__procedimentos">${escaparHtml(procedimentos)}</span>`
    : '';
  const classeMes = ehMes ? ' agenda-evento-card--mes' : '';

  return {
    html: `<div class="agenda-evento-card${classeMes}">${hora}<div class="agenda-evento-card__titulo">${nomePaciente}</div><div class="agenda-evento-card__meta"><span class="agenda-evento-card__tipo">${tipo}</span><span class="agenda-evento-card__separador" aria-hidden="true">·</span><span class="agenda-evento-card__funcionario">${funcionario}</span>${procedimentosHtml}</div></div>`,
  };
}

const opcoesCalendario = shallowRef({
  plugins: CALENDAR_PLUGINS,
  locale: ptBrLocale,
  initialView: 'timeGridWeek' as const,
  headerToolbar: false as const,
  height: 680,
  expandRows: true,
  slotMinTime: '08:00:00',
  slotMaxTime: '18:00:00',
  slotDuration: '00:30:00',
  allDaySlot: false,
  nowIndicator: true,
  selectable: true,
  selectMirror: false,
  unselectAuto: true,
  dayMaxEvents: 3,
  weekends: true,
  businessHours: false as const,
  events: [] as EventInput[],
  eventContent: renderizarConteudoEvento,
  datesSet: aoAlterarPeriodo,
  select: aoSelecionarIntervalo,
  eventClick: aoClicarEvento,
});

function obterApi(): CalendarApi | undefined {
  return calendarRef.value?.getApi();
}

function serializarConfigHorario(config: ConfigCalendarioHorario): string {
  return JSON.stringify({
    slotMinTime: config.slotMinTime,
    slotMaxTime: config.slotMaxTime,
    hiddenDays: config.hiddenDays,
    possuiHorario: config.possuiHorario,
    businessHours: config.businessHours,
  });
}

function serializarEventos(lista: Agendamento[]): string {
  return lista
    .map(
      (agendamento) =>
        `${agendamento.id}:${agendamento.dataInicio}:${agendamento.dataFim}:${agendamento.status}`,
    )
    .join('|');
}

function aplicarConfigHorario(): void {
  const api = obterApi();
  const config = props.configHorario;

  if (!api || !config) {
    return;
  }

  const chave = serializarConfigHorario(config);

  if (chave === configHorarioAplicada) {
    return;
  }

  configHorarioAplicada = chave;

  api.setOption('slotMinTime', config.slotMinTime);
  api.setOption('slotMaxTime', config.slotMaxTime);
  api.setOption('businessHours', config.possuiHorario ? config.businessHours : false);
  api.setOption('hiddenDays', config.hiddenDays.length > 0 ? config.hiddenDays : []);
  api.setOption('selectable', config.possuiHorario);
  api.setOption('selectConstraint', config.possuiHorario ? 'businessHours' : undefined);
}

function sincronizarEventos(): void {
  const api = obterApi();

  if (!api) {
    return;
  }

  const chave = serializarEventos(props.agendamentos);

  if (chave === eventosAplicados) {
    return;
  }

  eventosAplicados = chave;
  api.setOption('events', eventos.value);
}

function aoAlterarPeriodo(info: DatesSetArg): void {
  calendarioPronto.value = true;

  const chavePeriodo = `${info.start.getTime()}:${info.end.getTime()}`;

  if (chavePeriodo === ultimoPeriodoEmitido) {
    return;
  }

  ultimoPeriodoEmitido = chavePeriodo;
  emit('periodoAlterado', info.start, info.end);
}

function aoSelecionarIntervalo(info: DateSelectArg): void {
  if (!horarioAtivo.value) {
    info.view.calendar.unselect();
    return;
  }

  emit('selecionarIntervalo', info.start, info.end);
  info.view.calendar.unselect();
}

function aoClicarEvento(info: EventClickArg): void {
  const agendamento = info.event.extendedProps.agendamento as Agendamento | undefined;

  if (agendamento) {
    emit('clicarEvento', agendamento);
  }
}

function irParaHoje(): void {
  obterApi()?.today();
}

function avancar(): void {
  obterApi()?.next();
}

function retroceder(): void {
  obterApi()?.prev();
}

function alterarVisualizacao(
  visualizacao: 'timeGridWeek' | 'timeGridDay' | 'dayGridMonth',
): void {
  visualizacaoAtual.value = visualizacao;
  obterApi()?.changeView(visualizacao);
}

function obterTituloPeriodo(): string {
  return obterApi()?.view.title ?? '';
}

defineExpose({
  irParaHoje,
  avancar,
  retroceder,
  alterarVisualizacao,
  obterTituloPeriodo,
  visualizacaoAtual,
});

watch(calendarioPronto, (pronto) => {
  if (!pronto) {
    return;
  }

  aplicarConfigHorario();
  sincronizarEventos();
});

watch(eventos, () => {
  if (!calendarioPronto.value) {
    return;
  }

  sincronizarEventos();
});

watch(
  () => props.configHorario,
  () => {
    if (!calendarioPronto.value) {
      return;
    }

    aplicarConfigHorario();
  },
);
</script>

<template>
  <div class="agenda-calendar" :class="{ 'agenda-calendar--atualizando': carregando }">
    <full-calendar ref="calendarRef" :options="opcoesCalendario" />
  </div>
</template>

<style scoped lang="scss">
.agenda-calendar {
  --fc-border-color: var(--ds-border-default);
  --fc-page-bg-color: var(--ds-bg-surface);
  --fc-neutral-bg-color: var(--ds-bg-page);
  --fc-today-bg-color: var(--ds-bg-subtle);
  --fc-event-text-color: #fff;
  --fc-now-indicator-color: var(--ds-brand-primary);
  --fc-non-business-color: var(--ds-bg-page);

  contain: layout style;
  min-height: 480px;

  :deep(.fc) {
    font-family: inherit;
    font-size: var(--ds-font-size-sm, 0.875rem);
  }

  :deep(.fc-col-header-cell-cushion),
  :deep(.fc-timegrid-slot-label-cushion),
  :deep(.fc-daygrid-day-number) {
    color: var(--ds-text-secondary);
    font-weight: var(--ds-font-weight-medium);
    text-decoration: none;
  }

  :deep(.fc-timegrid-slot) {
    height: 2.5rem;
  }

  :deep(.fc-non-business) {
    background: var(--ds-bg-page);
  }

  :deep(.fc-event) {
    border-radius: var(--ds-radius-sm, 4px);
    border-width: 0;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
    transition: none;
  }

  :deep(.fc-event-main) {
    padding: 2px 4px;
  }

  :deep(.fc-daygrid-event) {
    white-space: normal;
  }

  :deep(.agenda-calendar__evento--inativo) {
    opacity: 0.65;

    .agenda-evento-card__titulo,
    .agenda-evento-card__funcionario {
      text-decoration: line-through;
    }
  }

  :deep(.fc-timegrid-now-indicator-line) {
    border-width: 2px;
  }

  :deep(.fc-highlight) {
    transition: none;
  }

  &--atualizando {
    :deep(.fc-view-harness) {
      opacity: 0.85;
    }
  }
}

:deep(.agenda-evento-card) {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.25;
  min-width: 0;
  overflow: hidden;
  width: 100%;

  .agenda-evento-card__hora {
    font-size: 0.65rem;
    font-weight: var(--ds-font-weight-semibold);
    opacity: 0.9;
  }

  .agenda-evento-card__titulo {
    font-size: 0.7rem;
    font-weight: var(--ds-font-weight-semibold);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .agenda-evento-card__meta {
    align-items: center;
    display: flex;
    font-size: 0.625rem;
    gap: 3px;
    min-width: 0;
    opacity: 0.92;
  }

  .agenda-evento-card__tipo {
    flex-shrink: 0;
    font-weight: var(--ds-font-weight-medium);
  }

  .agenda-evento-card__separador {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .agenda-evento-card__funcionario {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .agenda-evento-card__procedimentos {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.agenda-evento-card--mes {
    .agenda-evento-card__titulo {
      font-size: 0.65rem;
    }

    .agenda-evento-card__meta {
      font-size: 0.58rem;
    }
  }
}
</style>
