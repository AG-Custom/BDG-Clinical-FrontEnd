export type AcaoTabelaPreset =
  | 'editar'
  | 'desativar'
  | 'inativar'
  | 'reativar'
  | 'excluir'
  | 'visualizar'
  | 'cancelar'
  | 'receber'
  | 'horario'
  | 'movimentacoes'
  | 'pedido'
  | 'aplicacao';

export interface ConfigAcaoTabela {
  icone: string;
  cor: string;
  rotuloPadrao: string;
}

export const ACOES_TABELA: Record<AcaoTabelaPreset, ConfigAcaoTabela> = {
  editar: { icone: 'edit', cor: 'primary', rotuloPadrao: 'Editar' },
  desativar: { icone: 'block', cor: 'negative', rotuloPadrao: 'Desativar' },
  inativar: { icone: 'block', cor: 'negative', rotuloPadrao: 'Inativar' },
  reativar: { icone: 'restore', cor: 'positive', rotuloPadrao: 'Reativar' },
  excluir: { icone: 'delete', cor: 'negative', rotuloPadrao: 'Excluir' },
  visualizar: { icone: 'visibility', cor: 'primary', rotuloPadrao: 'Visualizar' },
  cancelar: { icone: 'cancel', cor: 'negative', rotuloPadrao: 'Cancelar' },
  receber: { icone: 'inventory', cor: 'positive', rotuloPadrao: 'Receber' },
  horario: { icone: 'schedule', cor: 'primary', rotuloPadrao: 'Horário de funcionamento' },
  movimentacoes: { icone: 'history', cor: 'primary', rotuloPadrao: 'Ver movimentações' },
  pedido: { icone: 'shopping_cart', cor: 'primary', rotuloPadrao: 'Ver pedido' },
  aplicacao: { icone: 'vaccines', cor: 'primary', rotuloPadrao: 'Ver aplicação' },
};

export function obterConfigAcaoTabela(acao: AcaoTabelaPreset): ConfigAcaoTabela {
  return ACOES_TABELA[acao];
}
