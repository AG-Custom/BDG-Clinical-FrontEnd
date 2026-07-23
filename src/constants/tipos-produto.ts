export const CODIGOS_TIPO_PRODUTO = {
  MEDICAMENTO: 'MEDICAMENTO',
  INSUMO: 'INSUMO',
} as const;

export type CodigoTipoProduto =
  (typeof CODIGOS_TIPO_PRODUTO)[keyof typeof CODIGOS_TIPO_PRODUTO];
