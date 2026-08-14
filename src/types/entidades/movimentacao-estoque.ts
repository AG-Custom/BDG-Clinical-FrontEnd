import { formatarDataHoraBrasil } from '@/utils/data-hora';

export const TIPOS_MOVIMENTACAO_ESTOQUE = ['Entrada', 'Saida', 'Ajuste', 'Perda'] as const;

export type TipoMovimentacaoEstoque = (typeof TIPOS_MOVIMENTACAO_ESTOQUE)[number];

export const ORIGENS_MOVIMENTACAO_ESTOQUE = [
  'PEDIDO_FORNECEDOR',
  'APLICACAO_PACIENTE',
  'TRANSFERENCIA_ESTOQUE',
  'MANUAL',
] as const;

export type OrigemMovimentacaoEstoque = (typeof ORIGENS_MOVIMENTACAO_ESTOQUE)[number];

export const MOTIVOS_MOVIMENTACAO_ESTOQUE = [
  'Compra',
  'Devolucao',
  'Ajuste',
  'Aplicacao',
  'Perda',
  'Transferencia',
] as const;

export type MotivoMovimentacaoEstoque = (typeof MOTIVOS_MOVIMENTACAO_ESTOQUE)[number];

export interface MovimentacaoEstoque {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  produtoId: string;
  produtoNome: string;
  loteProdutoId?: string | null;
  loteCodigo?: string | null;
  loteDataValidade?: string | null;
  tipo: TipoMovimentacaoEstoque;
  motivo: MotivoMovimentacaoEstoque | string;
  quantidade: number;
  quantidadeEmbalagem?: number | null;
  valorUnitario?: number;
  valorTotal?: number;
  data: string;
  origem: OrigemMovimentacaoEstoque | string;
  pedidoFornecedorId: string | null;
  aplicacaoPacienteId: string | null;
  transferenciaEstoqueId?: string | null;
  observacao: string | null;
  criadoEm: string;
}

export interface ListarMovimentacoesEstoqueParams {
  unidadeId?: string;
  produtoId?: string;
  loteProdutoId?: string;
  tipo?: TipoMovimentacaoEstoque;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  transferenciaEstoqueId?: string;
}

export function formatarDataMovimentacao(data: string): string {
  return formatarDataHoraBrasil(data);
}

export function obterCorTipoMovimentacao(tipo: TipoMovimentacaoEstoque): string {
  switch (tipo) {
    case 'Entrada':
      return 'positive';
    case 'Saida':
      return 'warning';
    case 'Ajuste':
      return 'primary';
    case 'Perda':
      return 'negative';
    default:
      return 'grey';
  }
}

export function formatarMotivoMovimentacao(motivo: string | null | undefined, origem?: string): string {
  switch (motivo) {
    case 'Compra':
      return 'Compra';
    case 'Devolucao':
      return 'Devolução';
    case 'Ajuste':
      return 'Ajuste';
    case 'Aplicacao':
      return 'Aplicação';
    case 'Perda':
      return 'Perda';
    case 'Transferencia':
      return 'Transferência';
    default:
      return origem ? formatarOrigemMovimentacao(origem) : motivo ?? '—';
  }
}

export function formatarOrigemMovimentacao(origem: string): string {
  switch (origem) {
    case 'PEDIDO_FORNECEDOR':
      return 'Pedido ao fornecedor';
    case 'APLICACAO_PACIENTE':
      return 'Aplicação ao paciente';
    case 'APLICACAO_PACIENTE_CANCELAMENTO':
      return 'Estorno de aplicação';
    case 'AJUSTE_MANUAL':
      return 'Entrada manual';
    case 'CORRECAO_SALDO':
      return 'Correção de saldo';
    case 'PERDA_MANUAL':
      return 'Saída manual';
    case 'TRANSFERENCIA_ESTOQUE':
      return 'Transferência entre unidades';
    case 'MANUAL':
      return 'Manual';
    default:
      return origem;
  }
}

export function obterCorOrigemEntrada(origem: string): string {
  switch (origem) {
    case 'PEDIDO_FORNECEDOR':
      return 'primary';
    case 'AJUSTE_MANUAL':
    case 'CORRECAO_SALDO':
    case 'MANUAL':
      return 'secondary';
    case 'APLICACAO_PACIENTE_CANCELAMENTO':
      return 'warning';
    case 'TRANSFERENCIA_ESTOQUE':
      return 'info';
    default:
      return 'grey';
  }
}

export interface RegistrarMovimentacaoManualRequest {
  unidadeId: string;
  produtoId: string;
  data: string;
  quantidade?: number | null;
  observacao?: string | null;
  quantidadeEmbalagem?: number | null;
  loteCodigo?: string | null;
  dataValidade?: string | null;
  valorUnitario?: number | null;
  lotes?: RegistrarMovimentacaoManualLoteRequest[];
}

export interface RegistrarMovimentacaoManualLoteRequest {
  loteCodigo: string;
  quantidadeEmbalagem: number;
  dataValidade: string;
}

export interface RegistrarTransferenciaEstoqueRequest {
  unidadeOrigemId: string;
  unidadeDestinoId: string;
  produtoId: string;
  quantidade: number;
  data: string;
  observacao?: string | null;
}

export interface TransferenciaEstoque {
  transferenciaId: string;
  unidadeOrigemId: string;
  unidadeOrigemNome: string;
  unidadeDestinoId: string;
  unidadeDestinoNome: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  data: string;
  observacao?: string | null;
  movimentacoes: MovimentacaoEstoque[];
}

export function deDataParaInicioDiaIso(valor: string): string {
  return new Date(`${valor}T00:00:00`).toISOString();
}

export function deDataParaFimDiaIso(valor: string): string {
  return new Date(`${valor}T23:59:59`).toISOString();
}
