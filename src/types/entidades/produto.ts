export interface Produto {
  id: string;
  tipoProdutoId: string;
  tipoProdutoNome: string;
  unidadeMedidaId: string;
  unidadeMedidaNome: string;
  unidadeMedidaSigla: string;
  nome: string;
  estoqueMinimo: number;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarProdutoRequest {
  tipoProdutoId: string;
  unidadeMedidaId: string;
  nome: string;
  estoqueMinimo: number;
}

export interface AtualizarProdutoRequest {
  tipoProdutoId: string;
  unidadeMedidaId: string;
  nome: string;
  estoqueMinimo: number;
}

export interface ListarProdutosParams {
  tipoProdutoId?: string;
  includeInactive?: boolean;
}
