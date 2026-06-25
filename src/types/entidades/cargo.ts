export interface Cargo {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarCargoRequest {
  nome: string;
}

export interface AtualizarCargoRequest {
  nome: string;
}
