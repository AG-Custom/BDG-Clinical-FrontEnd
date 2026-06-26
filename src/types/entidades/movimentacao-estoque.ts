export const TIPOS_MOVIMENTACAO_ESTOQUE = ['Entrada', 'Saida', 'Ajuste', 'Perda'] as const;

export type TipoMovimentacaoEstoque = (typeof TIPOS_MOVIMENTACAO_ESTOQUE)[number];

export const ORIGENS_MOVIMENTACAO_ESTOQUE = [
  'PEDIDO_FORNECEDOR',
  'APLICACAO_PACIENTE',
  'MANUAL',
] as const;

export type OrigemMovimentacaoEstoque = (typeof ORIGENS_MOVIMENTACAO_ESTOQUE)[number];

export interface MovimentacaoEstoque {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  produtoId: string;
  produtoNome: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  data: string;
  origem: OrigemMovimentacaoEstoque | string;
  pedidoFornecedorId: string | null;
  aplicacaoPacienteId: string | null;
  observacao: string | null;
  criadoEm: string;
}

export interface ListarMovimentacoesEstoqueParams {
  unidadeId?: string;
  produtoId?: string;
  tipo?: TipoMovimentacaoEstoque;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
}

export function formatarDataMovimentacao(data: string): string {
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

export function formatarOrigemMovimentacao(origem: string): string {
  switch (origem) {
    case 'PEDIDO_FORNECEDOR':
      return 'Pedido ao fornecedor';
    case 'APLICACAO_PACIENTE':
      return 'Aplicação ao paciente';
    case 'APLICACAO_PACIENTE_CANCELAMENTO':
      return 'Estorno de aplicação';
    case 'MANUAL':
      return 'Manual';
    default:
      return origem;
  }
}

export function deDataParaInicioDiaIso(valor: string): string {
  return new Date(`${valor}T00:00:00`).toISOString();
}

export function deDataParaFimDiaIso(valor: string): string {
  return new Date(`${valor}T23:59:59`).toISOString();
}
