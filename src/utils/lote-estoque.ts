import type { MovimentacaoEstoque } from '@/types/entidades/movimentacao-estoque';
import type { SaldoLoteEstoque } from '@/types/entidades/saldo-estoque';

export const LIMITE_MOVIMENTACOES_LOTE = 200;

export function validadeProxima(dataValidade: string): boolean {
  const validade = new Date(`${dataValidade}T00:00:00`);
  const limite = new Date();
  limite.setDate(limite.getDate() + 60);
  return validade <= limite;
}

export function obterRotuloEmbalagem(
  lote: SaldoLoteEstoque,
  embalagemPorProdutoId?: Map<string, string> | Record<string, string>,
): string {
  const fallback =
    embalagemPorProdutoId instanceof Map
      ? embalagemPorProdutoId.get(lote.produtoId)
      : embalagemPorProdutoId?.[lote.produtoId];

  const rotulo =
    lote.unidadeEmbalagemNome?.trim()
    || lote.unidadeEmbalagemSigla?.trim()
    || fallback?.trim()
    || '';

  return rotulo.toLowerCase();
}

function formatarQuantidadeComRotulo(quantidade: number, rotulo: string): string {
  const quantidadeFormatada = quantidade.toLocaleString('pt-BR');

  if (!rotulo) {
    return quantidadeFormatada;
  }

  const rotuloPlural =
    Math.abs(quantidade) === 1 || rotulo.endsWith('s')
      ? rotulo
      : `${rotulo}s`;

  return `${quantidadeFormatada} ${rotuloPlural}`;
}

export function formatarSaldoEmbalagem(
  lote: SaldoLoteEstoque,
  embalagemPorProdutoId?: Map<string, string> | Record<string, string>,
): string {
  if (lote.saldoEmbalagem == null) {
    return '—';
  }

  return formatarQuantidadeComRotulo(
    lote.saldoEmbalagem,
    obterRotuloEmbalagem(lote, embalagemPorProdutoId),
  );
}

export function formatarQuantidadeEmbalagemMovimentacao(
  quantidadeEmbalagem: number | null | undefined,
  lote: SaldoLoteEstoque,
  embalagemPorProdutoId?: Map<string, string> | Record<string, string>,
): string {
  if (quantidadeEmbalagem == null) {
    return '—';
  }

  return formatarQuantidadeComRotulo(
    quantidadeEmbalagem,
    obterRotuloEmbalagem(lote, embalagemPorProdutoId),
  );
}

export function filtrarMovimentacoesDoLote(
  movimentacoes: MovimentacaoEstoque[],
  lote: SaldoLoteEstoque,
): MovimentacaoEstoque[] {
  return movimentacoes.filter((movimentacao) => {
    if (movimentacao.loteProdutoId) {
      return movimentacao.loteProdutoId === lote.loteProdutoId;
    }

    return Boolean(movimentacao.loteCodigo) && movimentacao.loteCodigo === lote.codigo;
  });
}
