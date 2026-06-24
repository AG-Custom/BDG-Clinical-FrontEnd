export interface EmpresaResumo {
  id: string;
  nome: string;
  logo?: string | null;
}

export interface EmpresaContexto {
  empresaId: string;
  usuarioId: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  logo: string | null;
  corPrincipal: string | null;
  ativo: boolean;
  isCurrent: boolean;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  logo: string | null;
  corPrincipal: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface AtualizarEmpresaRequest {
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
  logo?: string | null;
  corPrincipal?: string | null;
  ativo: boolean;
}

export interface CriarEmpresaRequest {
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
  corPrincipal?: string | null;
}

export function contextoParaResumo(contexto: EmpresaContexto): EmpresaResumo {
  return {
    id: contexto.empresaId,
    nome: contexto.nome,
    logo: contexto.logo,
  };
}
