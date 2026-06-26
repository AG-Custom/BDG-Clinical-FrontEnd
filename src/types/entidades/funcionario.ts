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

export function obterNomeCargoVinculo(
  funcionario: Funcionario,
  cargosPorId: Map<string, string>,
): string {
  const cargoId = extrairDadosVinculo(funcionario).cargoId;

  if (!cargoId) {
    return '—';
  }

  return cargosPorId.get(cargoId) ?? '—';
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
  cargoId: string | null;
  flagAplicador: boolean;
} {
  const linksReferencia = obterLinksReferencia(funcionario);
  const linkToEmpresa = isVinculoTodaEmpresa(linksReferencia);
  const unidadeIds = linksReferencia
    .map((link) => link.unidadeId)
    .filter((id): id is string => Boolean(id));
  const cargoId = linksReferencia.find((link) => link.cargoId)?.cargoId ?? null;
  const flagAplicador = linksReferencia.some((link) => link.flagAplicador);

  return { linkToEmpresa, unidadeIds, cargoId, flagAplicador };
}

function obterLinksAtivos(funcionario: Funcionario): FuncionarioLink[] {
  if (!funcionario.ativo) {
    return [];
  }

  const linksAtivos = funcionario.links.filter((link) => link.ativo);

  return linksAtivos.length > 0 ? linksAtivos : funcionario.links;
}

export function isAplicadorHabilitadoNaUnidade(
  funcionario: Funcionario,
  unidadeId: string,
): boolean {
  if (!funcionario.ativo) {
    return false;
  }

  return obterLinksAtivos(funcionario).some(
    (link) => link.flagAplicador && (Boolean(link.empresaId) || link.unidadeId === unidadeId),
  );
}
