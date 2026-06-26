export interface Sintoma {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarSintomaRequest {
  nome: string;
}

export interface AtualizarSintomaRequest {
  nome: string;
}
