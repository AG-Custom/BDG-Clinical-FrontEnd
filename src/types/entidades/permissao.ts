export interface NoMapaPermissao {
  key: string;
  description: string;
  category: string;
  moduleCode: string;
  order: number;
  parent: string | null;
  children: NoMapaPermissao[];
}

export interface PermissoesFuncionario {
  employeeId: string;
  usuarioId: string | null;
  cargoId: string | null;
  cargoNome: string | null;
  cargoPermissionKeys: string[];
  allows: string[];
  denies: string[];
  effectivePermissions: string[];
}

export interface AtualizarPermissoesFuncionarioRequest {
  allows: string[];
  denies: string[];
}
