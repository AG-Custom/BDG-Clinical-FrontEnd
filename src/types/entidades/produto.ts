export interface Produto {
  id: string;
  tipoProdutoId: string;
  tipoProdutoNome: string;
  tipoProdutoCodigo: string | null;
  unidadeMedidaId: string;
  unidadeMedidaNome: string;
  unidadeMedidaSigla: string;
  unidadeEmbalagemId: string | null;
  unidadeEmbalagemNome: string | null;
  unidadeEmbalagemSigla: string | null;
  conteudoPorEmbalagem: number | null;
  unidadeConteudoId: string | null;
  unidadeConteudoNome: string | null;
  unidadeConteudoSigla: string | null;
  concentracaoPorConteudo: number | null;
  fatorEmbalagemParaEstoque: number | null;
  nome: string;
  sku: string | null;
  codigoInterno: string | null;
  codigoBarras: string | null;
  estoqueMinimo: number;
  valor: number | null;
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
  valor: number;
  sku?: string | null;
  codigoInterno?: string | null;
  codigoBarras?: string | null;
  controlaEstoque?: boolean;
  unidadeEmbalagemId?: string | null;
  conteudoPorEmbalagem?: number | null;
  unidadeConteudoId?: string | null;
  concentracaoPorConteudo?: number | null;
}

export interface AtualizarProdutoRequest {
  tipoProdutoId: string;
  unidadeMedidaId: string;
  nome: string;
  estoqueMinimo: number;
  valor: number;
  sku?: string | null;
  codigoInterno?: string | null;
  codigoBarras?: string | null;
  controlaEstoque?: boolean;
  unidadeEmbalagemId?: string | null;
  conteudoPorEmbalagem?: number | null;
  unidadeConteudoId?: string | null;
  concentracaoPorConteudo?: number | null;
}

export interface ListarProdutosParams {
  tipoProdutoId?: string;
  includeInactive?: boolean;
}
