export interface Paciente {
  id: string;
  unidadeId: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  dataNascimento: string | null;
  observacao: string | null;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarPacienteRequest {
  unidadeId: string;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  dataNascimento?: string | null;
  observacao?: string | null;
}

export interface AtualizarPacienteRequest {
  unidadeId: string;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  dataNascimento?: string | null;
  observacao?: string | null;
}

export interface ListarPacientesParams {
  unidadeId?: string;
  includeInactive?: boolean;
}

export function formatarCpf(cpf: string | null): string {
  if (!cpf) {
    return '—';
  }

  const digitos = cpf.replace(/\D/g, '');

  if (digitos.length !== 11) {
    return cpf;
  }

  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatarDataNascimento(data: string | null): string {
  if (!data) {
    return '—';
  }

  const [ano, mes, dia] = data.split('-');

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

export function normalizarCpf(cpf: string): string | null {
  const digitos = cpf.replace(/\D/g, '');

  return digitos.length > 0 ? digitos : null;
}
