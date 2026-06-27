import type { BusinessHoursInput } from '@fullcalendar/core';

export const DIAS_SEMANA = [
  'Domingo',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const DIAS_UTEIS: DiaSemana[] = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'];

export const DIAS_FIM_DE_SEMANA: DiaSemana[] = ['Sabado', 'Domingo'];

export interface HorarioFuncionamentoUnidade {
  id: string;
  unidadeId: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface CriarHorarioFuncionamentoRequest {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
}

export interface HorarioFuncionamentoFaixaRascunho {
  diasSemana: DiaSemana[];
  horaInicio: string;
  horaFim: string;
}

export interface AtualizarHorarioFuncionamentoRequest {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
}

export interface AlterarAtivoHorarioFuncionamentoRequest {
  ativo: boolean;
}

export interface ConfigCalendarioHorario {
  possuiHorario: boolean;
  businessHours: BusinessHoursInput[];
  slotMinTime: string;
  slotMaxTime: string;
  hiddenDays: number[];
}

export function obterLabelDiaSemana(dia: DiaSemana): string {
  switch (dia) {
    case 'Domingo':
      return 'Domingo';
    case 'Segunda':
      return 'Segunda-feira';
    case 'Terca':
      return 'Terça-feira';
    case 'Quarta':
      return 'Quarta-feira';
    case 'Quinta':
      return 'Quinta-feira';
    case 'Sexta':
      return 'Sexta-feira';
    case 'Sabado':
      return 'Sábado';
    default:
      return dia;
  }
}

export function diaSemanaParaIndice(dia: DiaSemana): number {
  return DIAS_SEMANA.indexOf(dia);
}

export function deHoraApiParaInput(hora: string): string {
  return hora.slice(0, 5);
}

export function deInputParaHoraApi(hora: string): string {
  return hora.length === 5 ? `${hora}:00` : hora;
}

export function formatarFaixaHorario(horaInicio: string, horaFim: string): string {
  return `${deHoraApiParaInput(horaInicio)} – ${deHoraApiParaInput(horaFim)}`;
}

export function montarPayloadsHorarioFuncionamento(
  faixa: HorarioFuncionamentoFaixaRascunho,
): CriarHorarioFuncionamentoRequest[] {
  const horaInicio = deInputParaHoraApi(faixa.horaInicio);
  const horaFim = deInputParaHoraApi(faixa.horaFim);

  return faixa.diasSemana.map((diaSemana) => ({
    diaSemana,
    horaInicio,
    horaFim,
  }));
}

export function validarFaixaHorarioFuncionamento(faixa: HorarioFuncionamentoFaixaRascunho): string | null {
  if (faixa.diasSemana.length === 0) {
    return 'Selecione ao menos um dia da semana.';
  }

  if (!faixa.horaInicio || !faixa.horaFim) {
    return 'Informe o horário de início e fim.';
  }

  if (faixa.horaInicio >= faixa.horaFim) {
    return 'O horário de fim deve ser posterior ao início.';
  }

  return null;
}

export function formatarResumoDiasSelecionados(dias: DiaSemana[]): string {
  if (dias.length === DIAS_SEMANA.length) {
    return 'Todos os dias';
  }

  if (
    dias.length === DIAS_UTEIS.length &&
    DIAS_UTEIS.every((dia) => dias.includes(dia))
  ) {
    return 'Segunda a Sexta';
  }

  if (dias.length === 1) {
    return obterLabelDiaSemana(dias[0]);
  }

  return dias.map((dia) => obterLabelDiaSemana(dia)).join(', ');
}

export function converterHorariosParaBusinessHours(
  horarios: HorarioFuncionamentoUnidade[],
): BusinessHoursInput[] {
  return horarios
    .filter((horario) => horario.ativo)
    .map((horario) => ({
      daysOfWeek: [diaSemanaParaIndice(horario.diaSemana)],
      startTime: deHoraApiParaInput(horario.horaInicio),
      endTime: deHoraApiParaInput(horario.horaFim),
    }));
}

export function calcularSlotMinMax(horarios: HorarioFuncionamentoUnidade[]): {
  slotMinTime: string;
  slotMaxTime: string;
} {
  const ativos = horarios.filter((horario) => horario.ativo);

  if (ativos.length === 0) {
    return { slotMinTime: '08:00:00', slotMaxTime: '18:00:00' };
  }

  let minH = '23:59:59';
  let maxH = '00:00:00';

  for (const horario of ativos) {
    if (horario.horaInicio < minH) {
      minH = horario.horaInicio;
    }

    if (horario.horaFim > maxH) {
      maxH = horario.horaFim;
    }
  }

  return { slotMinTime: minH, slotMaxTime: maxH };
}

export function obterDiasOcultos(horarios: HorarioFuncionamentoUnidade[]): number[] {
  const diasComHorario = new Set(
    horarios.filter((horario) => horario.ativo).map((horario) => diaSemanaParaIndice(horario.diaSemana)),
  );

  return [0, 1, 2, 3, 4, 5, 6].filter((dia) => !diasComHorario.has(dia));
}

export function obterConfigCalendarioHorarios(
  horarios: HorarioFuncionamentoUnidade[],
): ConfigCalendarioHorario {
  const ativos = horarios.filter((horario) => horario.ativo);

  if (ativos.length === 0) {
    return {
      possuiHorario: false,
      businessHours: [],
      slotMinTime: '08:00:00',
      slotMaxTime: '18:00:00',
      hiddenDays: [],
    };
  }

  const { slotMinTime, slotMaxTime } = calcularSlotMinMax(ativos);
  const hiddenDays = obterDiasOcultos(ativos);

  return {
    possuiHorario: true,
    businessHours: converterHorariosParaBusinessHours(ativos),
    slotMinTime,
    slotMaxTime,
    hiddenDays,
  };
}

export function consolidarHorariosFuncionamento(
  listas: HorarioFuncionamentoUnidade[][],
): HorarioFuncionamentoUnidade[] {
  return listas.flat().filter((horario) => horario.ativo);
}
