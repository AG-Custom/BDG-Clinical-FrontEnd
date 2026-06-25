export const TIPOS_UNIDADE_MEDIDA = [
  'Massa',
  'Volume',
  'Unidade',
  'Embalagem',
  'Outro',
] as const;

export type TipoUnidadeMedida = (typeof TIPOS_UNIDADE_MEDIDA)[number];

export interface UnidadeMedida {
  id: string;
  nome: string;
  sigla: string;
  tipo: TipoUnidadeMedida;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarUnidadeMedidaRequest {
  nome: string;
  sigla: string;
  tipo: TipoUnidadeMedida;
}

export interface AtualizarUnidadeMedidaRequest {
  nome: string;
  sigla: string;
  tipo: TipoUnidadeMedida;
}

export interface ListarUnidadesMedidaParams {
  includeInactive?: boolean;
  tipo?: TipoUnidadeMedida;
  search?: string;
  limit?: number;
  signal?: AbortSignal;
}

export function formatarUnidadeMedidaLabel(unidade: {
  nome: string;
  sigla: string;
  ativo?: boolean;
}): string {
  const base = `${unidade.nome} (${unidade.sigla})`;

  if (unidade.ativo === false) {
    return `${base} (inativa)`;
  }

  return base;
}
