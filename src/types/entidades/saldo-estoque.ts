export interface SaldoEstoque {
  unidadeId: string;
  unidadeNome: string;
  produtoId: string;
  produtoNome: string;
  unidadeMedidaSigla: string;
  estoqueMinimo: number;
  saldoAtual: number;
  valorUnitario: number | null;
  valorEstoque: number;
  abaixoDoMinimo: boolean;
}

export interface ListarSaldosEstoqueParams {
  unidadeId?: string;
  produtoId?: string;
  abaixoDoMinimo?: boolean;
  search?: string;
  limit?: number;
  signal?: AbortSignal;
}

export function formatarSaldoComUnidade(saldo: number, sigla: string): string {
  return `${saldo.toLocaleString('pt-BR')} ${sigla}`;
}

export function obterChaveSaldoEstoque(saldo: SaldoEstoque): string {
  return `${saldo.unidadeId}-${saldo.produtoId}`;
}
