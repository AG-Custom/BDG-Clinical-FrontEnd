import {
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
} from '@/types/entidades/pedido-fornecedor';

export const TIPOS_AGENDAMENTO = ['Consulta', 'Retorno', 'Aplicacao', 'Avaliacao'] as const;

export type TipoAgendamento = (typeof TIPOS_AGENDAMENTO)[number];

export const STATUS_AGENDAMENTO = [
  'Agendado',
  'Confirmado',
  'Concluido',
  'Cancelado',
  'Faltou',
] as const;

export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number];

export const STATUS_AGENDAMENTO_EDITAVEL: StatusAgendamento[] = ['Agendado', 'Confirmado'];

export interface Agendamento {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  pacienteId: string;
  pacienteNome: string;
  funcionarioId: string;
  funcionarioNome: string;
  compraPacienteId: string | null;
  procedimentoId: string | null;
  procedimentoNome: string | null;
  tipo: TipoAgendamento;
  status: StatusAgendamento;
  dataInicio: string;
  dataFim: string;
  observacao: string | null;
  criadoPorId: string;
  criadoPorNome: string;
  canceladoPorId: string | null;
  motivoCancelamento: string | null;
  aplicacaoPacienteId: string | null;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface CriarAgendamentoRequest {
  unidadeId: string;
  pacienteId: string;
  funcionarioId: string;
  tipo: TipoAgendamento;
  dataInicio: string;
  dataFim: string;
  procedimentoId?: string | null;
  compraPacienteId?: string | null;
  observacao?: string | null;
}

export type AtualizarAgendamentoRequest = CriarAgendamentoRequest;

export interface ConcluirAgendamentoRequest {
  quantidadeUtilizada?: number | null;
  peso?: number | null;
}

export interface CancelarAgendamentoRequest {
  motivo: string;
}

export interface ListarAgendamentosParams {
  unidadeId?: string;
  funcionarioId?: string;
  pacienteId?: string;
  status?: StatusAgendamento;
  dataInicioFrom?: string;
  dataInicioTo?: string;
}

export function formatarDataHoraAgendamento(data: string): string {
  const parsed = new Date(data);

  if (Number.isNaN(parsed.getTime())) {
    return data;
  }

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatarHorarioAgendamento(data: string): string {
  const parsed = new Date(data);

  if (Number.isNaN(parsed.getTime())) {
    return data;
  }

  return parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatarDataCabecalhoAgendamento(dataInicio: string): string {
  const parsed = new Date(dataInicio);

  if (Number.isNaN(parsed.getTime())) {
    return dataInicio;
  }

  const formatado = parsed.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return formatado.charAt(0).toUpperCase() + formatado.slice(1);
}

export function formatarIntervaloHorarioAgendamento(dataInicio: string, dataFim: string): string {
  return `${formatarHorarioAgendamento(dataInicio)} – ${formatarHorarioAgendamento(dataFim)}`;
}

export function calcularDuracaoAgendamento(dataInicio: string, dataFim: string): string {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return '';
  }

  const minutos = Math.round((fim.getTime() - inicio.getTime()) / 60000);

  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  if (mins === 0) {
    return `${horas}h`;
  }

  return `${horas}h ${mins}min`;
}

export function obterIniciaisNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return '?';
  }

  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase();
  }

  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

export function obterIconeTipoAgendamento(tipo: TipoAgendamento): string {
  switch (tipo) {
    case 'Consulta':
      return 'medical_services';
    case 'Retorno':
      return 'replay';
    case 'Aplicacao':
      return 'vaccines';
    case 'Avaliacao':
      return 'assessment';
    default:
      return 'event';
  }
}

export function obterLabelTipoAgendamento(tipo: TipoAgendamento): string {
  switch (tipo) {
    case 'Consulta':
      return 'Consulta';
    case 'Retorno':
      return 'Retorno';
    case 'Aplicacao':
      return 'Aplicação';
    case 'Avaliacao':
      return 'Avaliação';
    default:
      return tipo;
  }
}

export function obterLabelStatusAgendamento(status: StatusAgendamento): string {
  switch (status) {
    case 'Agendado':
      return 'Agendado';
    case 'Confirmado':
      return 'Confirmado';
    case 'Concluido':
      return 'Concluído';
    case 'Cancelado':
      return 'Cancelado';
    case 'Faltou':
      return 'Faltou';
    default:
      return status;
  }
}

export function obterCorStatusAgendamento(status: StatusAgendamento): string {
  switch (status) {
    case 'Agendado':
      return 'primary';
    case 'Confirmado':
      return 'positive';
    case 'Concluido':
      return 'grey';
    case 'Cancelado':
      return 'negative';
    case 'Faltou':
      return 'warning';
    default:
      return 'grey';
  }
}

export function obterCorEventoAgendamento(status: StatusAgendamento): string {
  switch (status) {
    case 'Agendado':
      return 'var(--ds-color-primary-600)';
    case 'Confirmado':
      return 'var(--ds-color-primary-700)';
    case 'Concluido':
      return 'var(--ds-text-secondary)';
    case 'Cancelado':
      return 'var(--ds-color-danger-500, #ef4444)';
    case 'Faltou':
      return 'var(--ds-color-warning-600, #d97706)';
    default:
      return 'var(--ds-color-primary-600)';
  }
}

export function isAgendamentoEditavel(status: StatusAgendamento): boolean {
  return STATUS_AGENDAMENTO_EDITAVEL.includes(status);
}

export { deInputDatetimeLocalParaIso, deIsoParaInputDatetimeLocal };
