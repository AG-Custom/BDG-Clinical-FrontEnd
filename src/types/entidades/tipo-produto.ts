export interface TipoProduto {
  id: string;
  nome: string;
  codigo: string | null;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarTipoProdutoRequest {
  nome: string;
}

export interface AtualizarTipoProdutoRequest {
  nome: string;
}
