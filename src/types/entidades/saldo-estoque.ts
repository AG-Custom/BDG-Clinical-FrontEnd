export interface SaldoEstoque {
  unidadeId: string;
  unidadeNome: string;
  produtoId: string;
  produtoNome: string;
  unidadeMedidaSigla: string;
  estoqueMinimo: number;
  saldoAtual: number;
  valorUnitario: number | null;
  valorEstoque: number;
  abaixoDoMinimo: boolean;
}

export interface ListarSaldosEstoqueParams {
  unidadeId?: string;
  produtoId?: string;
  abaixoDoMinimo?: boolean;
  search?: string;
  limit?: number;
  signal?: AbortSignal;
}

export function formatarSaldoComUnidade(saldo: number, sigla: string): string {
  const siglaFormatada = sigla.trim();

  if (!siglaFormatada) {
    return saldo.toLocaleString('pt-BR');
  }

  return `${saldo.toLocaleString('pt-BR')} ${siglaFormatada}`;
}

function parseNumeroPtBr(valor: string): number {
  const texto = valor.trim();

  if (!texto) {
    return Number.NaN;
  }

  if (texto.includes(',')) {
    return Number(texto.replace(/\./g, '').replace(',', '.'));
  }

  return Number(texto);
}

export function formatarMensagemEstoqueInsuficiente(
  mensagem: string,
  opcoes: { unidadeNome?: string; unidadeMedidaSigla?: string } = {},
): string {
  if (!/estoque insuficiente/i.test(mensagem)) {
    return mensagem;
  }

  let formatada = mensagem;

  if (opcoes.unidadeNome) {
    formatada = formatada.replace(/na unidade selecionada/gi, `na unidade ${opcoes.unidadeNome}`);
  }

  const sigla = opcoes.unidadeMedidaSigla?.trim() ?? '';
  const sufixoUnidade = sigla ? ` ${sigla}` : '';

  formatada = formatada.replace(
    /Saldo:\s*([\d.,]+)\s*\|\s*Necess[aá]rio:\s*([\d.,]+)/i,
    (_match, saldoStr: string, necessarioStr: string) => {
      const saldo = parseNumeroPtBr(saldoStr);
      const necessario = parseNumeroPtBr(necessarioStr);
      const saldoFormatado = Number.isFinite(saldo)
        ? `${saldo.toLocaleString('pt-BR')}${sufixoUnidade}`
        : saldoStr;
      const necessarioFormatado = Number.isFinite(necessario)
        ? `${necessario.toLocaleString('pt-BR')}${sufixoUnidade}`
        : necessarioStr;

      return `Saldo: ${saldoFormatado} | Necessário: ${necessarioFormatado}`;
    },
  );

  return formatada;
}

export function obterChaveSaldoEstoque(saldo: SaldoEstoque): string {
  return `${saldo.unidadeId}-${saldo.produtoId}`;
}
