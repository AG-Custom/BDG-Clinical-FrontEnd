import {
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
} from '@/types/entidades/pedido-fornecedor';

export interface AplicacaoPacienteSintoma {
  id: string;
  nome: string;
}

export interface AplicacaoPaciente {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  compraPacienteId: string | null;
  produtoId: string;
  produtoNome: string;
  aplicadorId: string;
  aplicadorNome: string;
  unidadeId: string;
  unidadeNome: string;
  dataAplicacao: string;
  quantidadeUtilizada: number;
  peso: number | null;
  observacao: string | null;
  realizado: boolean;
  cancelada: boolean;
  sintomas: AplicacaoPacienteSintoma[];
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface CriarAplicacaoPacienteRequest {
  pacienteId: string;
  produtoId: string;
  aplicadorId: string;
  unidadeId: string;
  quantidadeUtilizada: number;
  dataAplicacao: string;
  peso?: number | null;
  observacao?: string | null;
  sintomaIds?: string[] | null;
  compraPacienteId?: string | null;
}

export interface AtualizarAplicacaoPacienteRequest {
  dataAplicacao: string;
  peso?: number | null;
  observacao?: string | null;
  sintomaIds?: string[] | null;
}

export interface ListarAplicacoesPacienteParams {
  pacienteId?: string;
  unidadeId?: string;
  produtoId?: string;
  aplicadorId?: string;
  cancelada?: boolean;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
}

export function formatarDataAplicacao(data: string): string {
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

export function formatarResumoSintomas(sintomas: AplicacaoPacienteSintoma[]): string {
  if (sintomas.length === 0) {
    return '—';
  }

  return sintomas.map((s) => s.nome).join(', ');
}

export { deInputDatetimeLocalParaIso, deIsoParaInputDatetimeLocal };
