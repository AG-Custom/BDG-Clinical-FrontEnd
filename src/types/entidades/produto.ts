export interface Produto {
  id: string;
  tipoProdutoId: string;
  tipoProdutoNome: string;
  unidadeMedidaId: string;
  unidadeMedidaNome: string;
  unidadeMedidaSigla: string;
  nome: string;
  sku: string | null;
  codigoInterno: string | null;
  codigoBarras: string | null;
  estoqueMinimo: number;
  controlaEstoque: boolean;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarProdutoRequest {
  tipoProdutoId: string;
  unidadeMedidaId: string;
  nome: string;
  estoqueMinimo: number;
  sku?: string | null;
  codigoInterno?: string | null;
  codigoBarras?: string | null;
  controlaEstoque?: boolean;
}

export interface AtualizarProdutoRequest {
  tipoProdutoId: string;
  unidadeMedidaId: string;
  nome: string;
  estoqueMinimo: number;
  sku?: string | null;
  codigoInterno?: string | null;
  codigoBarras?: string | null;
  controlaEstoque?: boolean;
}

export interface ListarProdutosParams {
  tipoProdutoId?: string;
  includeInactive?: boolean;
}
