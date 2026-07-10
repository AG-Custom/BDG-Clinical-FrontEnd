export interface UnidadePacienteResumo {
  id: string;
  nome: string;
}

export interface EnderecoPaciente {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

export interface Paciente {
  id: string;
  unidadeId: string;
  unidadeIds?: string[];
  unidades?: UnidadePacienteResumo[];
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  dataNascimento: string | null;
  endereco: EnderecoPaciente | null;
  observacao: string | null;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarPacienteRequest {
  unidadeId?: string;
  unidadeIds?: string[];
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  dataNascimento?: string | null;
  endereco?: EnderecoPaciente | null;
  observacao?: string | null;
}

export interface AtualizarPacienteRequest {
  unidadeId?: string;
  unidadeIds?: string[];
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  dataNascimento?: string | null;
  endereco?: EnderecoPaciente | null;
  observacao?: string | null;
}

export const UFS_BRASIL = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

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

export function formatarTelefonePaciente(telefone: string | null): string {
  if (!telefone) {
    return '—';
  }

  const digitos = telefone.replace(/\D/g, '');

  if (digitos.length === 11) {
    return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  if (digitos.length === 10) {
    return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return telefone;
}

export function formatarCep(cep: string | null): string {
  if (!cep) {
    return '—';
  }

  const digitos = cep.replace(/\D/g, '');

  if (digitos.length !== 8) {
    return cep;
  }

  return digitos.replace(/(\d{5})(\d{3})/, '$1-$2');
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

export function textoOuTraco(valor: string | null | undefined): string {
  const texto = valor?.trim();

  return texto ? texto : '—';
}

export function possuiEnderecoPaciente(endereco: EnderecoPaciente | null | undefined): boolean {
  if (!endereco) {
    return false;
  }

  return Object.values(endereco).some((valor) => Boolean(valor?.trim()));
}

export function normalizarCpf(cpf: string): string | null {
  const digitos = cpf.replace(/\D/g, '');

  return digitos.length > 0 ? digitos : null;
}

export function normalizarCep(cep: string): string | null {
  const digitos = cep.replace(/\D/g, '');

  return digitos.length > 0 ? digitos : null;
}

function textoOpcional(valor: string): string | null {
  const texto = valor.trim();

  return texto.length > 0 ? texto : null;
}

export function montarEnderecoPaciente(campos: {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}): EnderecoPaciente | null {
  const endereco: EnderecoPaciente = {
    cep: normalizarCep(campos.cep),
    logradouro: textoOpcional(campos.logradouro),
    numero: textoOpcional(campos.numero),
    complemento: textoOpcional(campos.complemento),
    bairro: textoOpcional(campos.bairro),
    cidade: textoOpcional(campos.cidade),
    uf: textoOpcional(campos.uf)?.toUpperCase() ?? null,
  };

  const possuiAlgumCampo = Object.values(endereco).some((valor) => valor !== null);

  return possuiAlgumCampo ? endereco : null;
}

export function obterUnidadeIdsDoPaciente(paciente: Paciente): string[] {
  if (paciente.unidadeIds && paciente.unidadeIds.length > 0) {
    return paciente.unidadeIds;
  }

  if (paciente.unidadeId) {
    return [paciente.unidadeId];
  }

  return [];
}

export function obterUnidadesDoPaciente(paciente: Paciente): UnidadePacienteResumo[] {
  if (paciente.unidades && paciente.unidades.length > 0) {
    return paciente.unidades;
  }

  return obterUnidadeIdsDoPaciente(paciente).map((id) => ({
    id,
    nome: id,
  }));
}

export function formatarNomesUnidadesPaciente(
  paciente: Paciente,
  nomesPorId?: ReadonlyMap<string, string>,
): string {
  if (paciente.unidades && paciente.unidades.length > 0) {
    return paciente.unidades.map((unidade) => unidade.nome).join(', ');
  }

  const ids = obterUnidadeIdsDoPaciente(paciente);

  if (ids.length === 0) {
    return '—';
  }

  if (nomesPorId) {
    return ids.map((id) => nomesPorId.get(id) ?? '—').join(', ');
  }

  return '—';
}
