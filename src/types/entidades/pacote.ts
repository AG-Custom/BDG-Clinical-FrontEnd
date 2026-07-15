export interface PacoteItem {
  id: string;
  produtoId: string;
  produtoNome: string;
  quantidadeTotal: number;
  unidadeMedida: string;
}

export interface Pacote {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  ativo: boolean;
  itens: PacoteItem[];
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface PacoteItemRequest {
  produtoId: string;
  quantidadeTotal: number;
  unidadeMedida: string;
}

export interface CriarPacoteRequest {
  nome: string;
  descricao?: string | null;
  valor: number;
  itens: PacoteItemRequest[];
}

export type AtualizarPacoteRequest = CriarPacoteRequest;

export interface ListarPacotesParams {
  includeInactive?: boolean;
  search?: string;
  limit?: number;
}

export interface ItemPacoteFormulario {
  produtoId: string | null;
  quantidadeTotal: number | null;
  unidadeMedida: string;
}

export function criarItemPacoteVazio(): ItemPacoteFormulario {
  return {
    produtoId: null,
    quantidadeTotal: null,
    unidadeMedida: '',
  };
}

export function formatarValorPacote(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
