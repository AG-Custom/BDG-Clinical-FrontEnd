export interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  ativo: boolean;
}

export interface CriarUnidadeRequest {
  nome: string;
  endereco: string;
}

export interface AtualizarUnidadeRequest {
  nome: string;
  endereco: string;
}
