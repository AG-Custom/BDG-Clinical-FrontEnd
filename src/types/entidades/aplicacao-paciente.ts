import {
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
} from '@/types/entidades/pedido-fornecedor';
import { formatarDataHoraBrasil } from '@/utils/data-hora';

export interface AplicacaoPacienteSintoma {
  id: string;
  nome: string;
}

export interface AplicacaoPacienteItemConsumido {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  controlaEstoque: boolean;
}

export interface AplicacaoPaciente {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  compraPacienteId: string | null;
  produtoId: string | null;
  produtoNome: string | null;
  procedimentoId: string | null;
  procedimentoNome: string | null;
  aplicadorId: string;
  aplicadorNome: string;
  unidadeId: string;
  unidadeNome: string;
  dataAplicacao: string;
  quantidadeUtilizada: number | null;
  peso: number | null;
  observacao: string | null;
  realizado: boolean;
  cancelada: boolean;
  sintomas: AplicacaoPacienteSintoma[];
  itensConsumidos: AplicacaoPacienteItemConsumido[];
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface CriarAplicacaoPacienteRequest {
  pacienteId: string;
  procedimentoId: string;
  aplicadorId: string;
  unidadeId: string;
  dataAplicacao: string;
  compraPacienteId: string;
  quantidadeUtilizada?: number | null;
  peso?: number | null;
  observacao?: string | null;
  sintomaIds?: string[] | null;
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
  procedimentoId?: string;
  aplicadorId?: string;
  cancelada?: boolean;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
}

export function formatarDataAplicacao(data: string): string {
  return formatarDataHoraBrasil(data);
}

export function formatarResumoSintomas(sintomas: AplicacaoPacienteSintoma[]): string {
  if (sintomas.length === 0) {
    return '—';
  }

  return sintomas.map((s) => s.nome).join(', ');
}

export function formatarItemAplicado(aplicacao: AplicacaoPaciente): string {
  if (aplicacao.procedimentoNome) {
    return aplicacao.procedimentoNome;
  }

  if (aplicacao.produtoNome) {
    return aplicacao.produtoNome;
  }

  return '—';
}

export { deInputDatetimeLocalParaIso, deIsoParaInputDatetimeLocal };
