import type { ItemProcedimentoFormulario, ProcedimentoItem } from '@/types/entidades/procedimento';
import type { SaldoLoteEstoque } from '@/types/entidades/saldo-estoque';

export interface SaldoProdutoConclusao {
  produtoId: string;
  produtoNome: string;
  quantidadeNecessaria: number;
  saldoAtual: number | null;
  sigla: string;
}

export interface ProcedimentoConclusaoFormulario {
  procedimentoId: string;
  nome: string;
  exigeQuantidade: boolean;
  exigeLote: boolean;
  quantidadeUtilizada: number | null;
  loteProdutoId: string | null;
  consumirInsumosKit: boolean;
  insumosManuais: ItemProcedimentoFormulario[];
  lotesDisponiveis: SaldoLoteEstoque[];
  carregandoLotes: boolean;
  insumos: ProcedimentoItem[];
  produtoAplicadoId: string | null;
  produtoAplicadoNome: string | null;
  saldoAtual: number | null;
  unidadeMedidaSigla: string;
}
