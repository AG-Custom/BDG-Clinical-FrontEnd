export interface ProcedimentoItem {
  produtoId: string;
  produtoNome?: string;
  quantidade: number;
}

export interface Procedimento {
  id: string;
  nome: string;
  produtoAplicadoId: string | null;
  produtoAplicadoNome?: string | null;
  observacoes: string | null;
  ativo: boolean;
  itens: ProcedimentoItem[];
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface ProcedimentoItemRequest {
  produtoId: string;
  quantidade: number;
}

export interface CriarProcedimentoRequest {
  nome: string;
  produtoAplicadoId?: string | null;
  observacoes?: string | null;
  itens?: ProcedimentoItemRequest[];
}

export interface AtualizarProcedimentoRequest {
  nome: string;
  produtoAplicadoId?: string | null;
  observacoes?: string | null;
  itens?: ProcedimentoItemRequest[];
}

export interface ListarProcedimentosParams {
  includeInactive?: boolean;
  produtoAplicadoId?: string;
  search?: string;
  limit?: number;
}

export interface ItemProcedimentoFormulario {
  produtoId: string | null;
  quantidade: number | null;
}

export function criarItemProcedimentoVazio(): ItemProcedimentoFormulario {
  return {
    produtoId: null,
    quantidade: null,
  };
}
