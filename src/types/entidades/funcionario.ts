export interface FuncionarioLink {
  id: string;
  empresaId: string | null;
  unidadeId: string | null;
  cargoId: string | null;
  flagAplicador: boolean;
  ativo: boolean;
}

export interface Funcionario {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  emailLogin: string;
  pendentePrimeiroAcesso: boolean;
  ativo: boolean;
  links: FuncionarioLink[];
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface CriarFuncionarioRequest {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  emailLogin: string;
  linkToEmpresa: boolean;
  unidadeIds?: string[] | null;
  cargoId?: string | null;
  flagAplicador: boolean;
}

export interface AtualizarFuncionarioRequest {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  linkToEmpresa: boolean;
  unidadeIds?: string[] | null;
  cargoId?: string | null;
  flagAplicador: boolean;
}

export function obterUnidadeIdsVinculo(funcionario: Funcionario): string[] {
  return extrairDadosVinculo(funcionario).unidadeIds;
}

export function obterNomesUnidadesVinculo(
  funcionario: Funcionario,
  unidadesPorId: Map<string, string>,
): string[] {
  return obterUnidadeIdsVinculo(funcionario)
    .map((id) => unidadesPorId.get(id))
    .filter((nome): nome is string => Boolean(nome));
}

function obterLinksReferencia(funcionario: Funcionario): FuncionarioLink[] {
  const linksAtivos = funcionario.links.filter((link) => link.ativo);

  return linksAtivos.length > 0 ? linksAtivos : funcionario.links;
}

function isVinculoTodaEmpresa(links: FuncionarioLink[]): boolean {
  if (links.length === 0) {
    return false;
  }

  if (links.some((link) => link.empresaId)) {
    return true;
  }

  return links.every((link) => !link.unidadeId);
}

export function obterVinculoLabel(funcionario: Funcionario): string {
  const linksReferencia = obterLinksReferencia(funcionario);

  if (isVinculoTodaEmpresa(linksReferencia)) {
    return 'Toda a empresa';
  }

  const quantidadeUnidades = linksReferencia.filter((link) => link.unidadeId).length;

  if (quantidadeUnidades === 0) {
    return '—';
  }

  if (quantidadeUnidades === 1) {
    return '1 unidade';
  }

  return `${quantidadeUnidades} unidades`;
}

export function extrairDadosVinculo(funcionario: Funcionario): {
  linkToEmpresa: boolean;
  unidadeIds: string[];
  flagAplicador: boolean;
} {
  const linksReferencia = obterLinksReferencia(funcionario);
  const linkToEmpresa = isVinculoTodaEmpresa(linksReferencia);
  const unidadeIds = linksReferencia
    .map((link) => link.unidadeId)
    .filter((id): id is string => Boolean(id));
  const flagAplicador = linksReferencia.some((link) => link.flagAplicador);

  return { linkToEmpresa, unidadeIds, flagAplicador };
}
