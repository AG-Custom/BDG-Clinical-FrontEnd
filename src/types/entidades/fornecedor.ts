export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarFornecedorRequest {
  nome: string;
  cnpj: string;
  telefone?: string | null;
  email?: string | null;
}

export interface AtualizarFornecedorRequest {
  nome: string;
  cnpj: string;
  telefone?: string | null;
  email?: string | null;
}

export interface ListarFornecedoresParams {
  includeInactive?: boolean;
  search?: string;
  limit?: number;
  signal?: AbortSignal;
}

export function normalizarCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function formatarCnpj(cnpj: string | null): string {
  if (!cnpj) {
    return '—';
  }

  const digitos = cnpj.replace(/\D/g, '');

  if (digitos.length !== 14) {
    return cnpj;
  }

  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
