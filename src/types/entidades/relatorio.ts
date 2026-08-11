export interface MedicamentoUsadoRelatorio {
  produtoId: string;
  produtoNome: string;
  unidadeMedida: string;
  quantidade: number;
}

export interface RelatorioOperacional {
  dataInicio: string;
  dataFim: string;
  medicamentosUsados: MedicamentoUsadoRelatorio[];
  agendamentos: { consulta: number; aplicacao: number; retorno: number; total: number };
  fluxoEstoque: { entradas: number; saidas: number; saldo: number };
}
