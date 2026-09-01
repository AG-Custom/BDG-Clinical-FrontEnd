export interface TagAgendamento {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface CriarTagAgendamentoRequest {
  nome: string;
  cor: string;
}

export interface AtualizarTagAgendamentoRequest {
  nome: string;
  cor: string;
}

export const CORES_PALETA_TAG_AGENDAMENTO = [
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#16A34A',
  '#0D9488',
  '#0891B2',
  '#4F46E5',
  '#64748B',
] as const;

export const COR_PADRAO_TAG_AGENDAMENTO = CORES_PALETA_TAG_AGENDAMENTO[0];
