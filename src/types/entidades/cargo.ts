export interface Cargo {
  id: string;
  nome: string;
  flagAplicador: boolean;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarCargoRequest {
  nome: string;
  flagAplicador?: boolean;
}

export interface AtualizarCargoRequest {
  nome: string;
  flagAplicador?: boolean;
}

export interface CargoPermissoes {
  id: string;
  nome: string;
  permissionKeys: string[];
}

export interface AtualizarCargoPermissoesRequest {
  permissionKeys: string[];
}

export function isCargoAplicador(cargo: Pick<Cargo, 'flagAplicador'> | null | undefined): boolean {
  return cargo?.flagAplicador ?? false;
}
