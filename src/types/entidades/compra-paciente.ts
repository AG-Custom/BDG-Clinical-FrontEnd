import { formatarDataBrasil, formatarDataHoraBrasil } from '@/utils/data-hora';

export const STATUS_COMPRA_PACIENTE = ['Ativo', 'Concluido', 'Cancelado', 'Vencido'] as const;

export type StatusCompraPaciente = (typeof STATUS_COMPRA_PACIENTE)[number];

const STATUS_COMPRA_POR_NUMERO: Record<number, StatusCompraPaciente> = {
  1: 'Ativo',
  2: 'Concluido',
  3: 'Cancelado',
  4: 'Vencido',
};

export const NIVEIS_SALDO_COMPRA = ['ok', 'baixo', 'sem_saldo'] as const;

export type NivelSaldoCompra = (typeof NIVEIS_SALDO_COMPRA)[number];

export interface SaldoProdutoCompraPaciente {
  produtoId: string;
  produtoNome: string;
  unidadeMedida: string;
  quantidadeContratada: number;
  quantidadeUtilizada: number;
  quantidadeRestante: number;
}

export interface SaldoCompraPaciente {
  compraPacienteId: string;
  produtos: SaldoProdutoCompraPaciente[];
}

export interface CompraPaciente {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacoteId: string;
  pacoteNome: string;
  unidadeId: string;
  unidadeNome: string;
  dataCompra: string;
  status: StatusCompraPaciente;
  observacao: string | null;
  saldo: SaldoCompraPaciente;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface CriarCompraPacienteRequest {
  pacienteId: string;
  pacoteId: string;
  unidadeId: string;
  dataCompra: string;
  observacao?: string | null;
}

export interface CancelarCompraPacienteRequest {
  observacao?: string | null;
}

export interface AtualizarSaldoCompraPacienteItemRequest {
  produtoId: string;
  quantidadeContratada: number;
  quantidadeUtilizada: number;
}

export interface AtualizarSaldoCompraPacienteRequest {
  itens: AtualizarSaldoCompraPacienteItemRequest[];
  motivo?: string | null;
}

export const TIPOS_HISTORICO_COMPRA_PACIENTE = [
  'Compra',
  'Aplicacao',
  'CancelamentoAplicacao',
  'AjusteManual',
  'CancelamentoCompra',
] as const;

export type TipoHistoricoCompraPaciente = (typeof TIPOS_HISTORICO_COMPRA_PACIENTE)[number];

export interface HistoricoCompraPacienteEvento {
  tipo: TipoHistoricoCompraPaciente | string;
  data: string;
  produtoId?: string | null;
  produtoNome?: string | null;
  quantidade?: number | null;
  quantidadeAnterior?: number | null;
  quantidadeNova?: number | null;
  campoAjuste?: 'quantidadeContratada' | 'quantidadeUtilizada' | string | null;
  unidadeMedida?: string | null;
  aplicadorId?: string | null;
  aplicadorNome?: string | null;
  usuarioId?: string | null;
  usuarioNome?: string | null;
  loteProdutoId?: string | null;
  loteCodigo?: string | null;
  aplicacaoId?: string | null;
  motivo?: string | null;
  cancelada?: boolean | null;
}

export interface HistoricoCompraPaciente {
  compraPacienteId: string;
  eventos: HistoricoCompraPacienteEvento[];
}

export interface ListarComprasPacienteParams {
  pacienteId?: string;
  status?: StatusCompraPaciente;
}

export function formatarDataCompra(data: string): string {
  return formatarDataBrasil(data);
}

export function formatarDataHoraCompra(data: string): string {
  return formatarDataHoraBrasil(data);
}

export function normalizarStatusCompra(
  status: StatusCompraPaciente | number | string | null | undefined,
): StatusCompraPaciente {
  if (typeof status === 'number') {
    return STATUS_COMPRA_POR_NUMERO[status] ?? 'Ativo';
  }

  if (typeof status === 'string') {
    const trimmed = status.trim();
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && STATUS_COMPRA_POR_NUMERO[asNumber]) {
      return STATUS_COMPRA_POR_NUMERO[asNumber];
    }

    const match = STATUS_COMPRA_PACIENTE.find(
      (item) => item.toLowerCase() === trimmed.toLowerCase(),
    );
    if (match) {
      return match;
    }
  }

  return 'Ativo';
}

export function isCompraAtiva(
  status: StatusCompraPaciente | number | string | null | undefined,
): boolean {
  return normalizarStatusCompra(status) === 'Ativo';
}

export function isCompraCancelada(
  status: StatusCompraPaciente | number | string | null | undefined,
): boolean {
  return normalizarStatusCompra(status) === 'Cancelado';
}

/** Compra cancelada não pode ter saldo ajustado (regra do PUT /balance). */
export function podeAjustarSaldoCompra(
  status: StatusCompraPaciente | number | string | null | undefined,
): boolean {
  return !isCompraCancelada(status);
}

export function obterLabelStatusCompra(
  status: StatusCompraPaciente | number | string | null | undefined,
): string {
  switch (normalizarStatusCompra(status)) {
    case 'Ativo':
      return 'Ativo';
    case 'Concluido':
      return 'Concluído';
    case 'Cancelado':
      return 'Cancelado';
    case 'Vencido':
      return 'Vencido';
    default:
      return 'Ativo';
  }
}

export function obterCorStatusCompra(
  status: StatusCompraPaciente | number | string | null | undefined,
): string {
  switch (normalizarStatusCompra(status)) {
    case 'Ativo':
      return 'positive';
    case 'Concluido':
      return 'grey';
    case 'Cancelado':
      return 'negative';
    case 'Vencido':
      return 'warning';
    default:
      return 'grey';
  }
}

export function formatarQuantidadeProduto(
  quantidade: number,
  unidadeMedida: string,
): string {
  const formatada = quantidade.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });

  return `${formatada} ${unidadeMedida}`.trim();
}

export function obterNivelSaldoProduto(
  produto: SaldoProdutoCompraPaciente,
): NivelSaldoCompra {
  if (produto.quantidadeRestante <= 0) {
    return 'sem_saldo';
  }

  if (
    produto.quantidadeContratada > 0 &&
    produto.quantidadeRestante / produto.quantidadeContratada < 0.3
  ) {
    return 'baixo';
  }

  return 'ok';
}

export function obterNivelSaldoCompra(
  saldo: SaldoCompraPaciente | null | undefined,
): NivelSaldoCompra {
  if (!saldo?.produtos?.length) {
    return 'sem_saldo';
  }

  const niveis = saldo.produtos.map(obterNivelSaldoProduto);
  if (niveis.every((nivel) => nivel === 'sem_saldo')) {
    return 'sem_saldo';
  }

  if (niveis.some((nivel) => nivel === 'baixo' || nivel === 'sem_saldo')) {
    return 'baixo';
  }

  return 'ok';
}

export function obterLabelNivelSaldo(nivel: NivelSaldoCompra): string {
  switch (nivel) {
    case 'sem_saldo':
      return 'Sem saldo';
    case 'baixo':
      return 'Saldo baixo';
    default:
      return 'Com saldo';
  }
}

export function obterCorNivelSaldo(nivel: NivelSaldoCompra): string {
  switch (nivel) {
    case 'sem_saldo':
      return 'negative';
    case 'baixo':
      return 'warning';
    default:
      return 'positive';
  }
}

export function formatarSaldoProduto(
  produto: SaldoProdutoCompraPaciente,
): string {
  const nivel = obterNivelSaldoProduto(produto);
  const quantidade = formatarQuantidadeProduto(
    produto.quantidadeRestante,
    produto.unidadeMedida,
  );

  if (nivel === 'sem_saldo') {
    return `${produto.produtoNome}: Sem saldo`;
  }

  if (nivel === 'baixo') {
    return `${produto.produtoNome}: Saldo baixo (${quantidade})`;
  }

  return `${produto.produtoNome}: ${quantidade}`;
}

export function formatarDetalheQuantidadesSaldo(
  saldo: SaldoCompraPaciente | null | undefined,
): string {
  if (!saldo?.produtos?.length) {
    return '';
  }

  return saldo.produtos
    .filter((produto) => obterNivelSaldoProduto(produto) !== 'sem_saldo')
    .map(
      (produto) =>
        `${produto.produtoNome}: ${formatarQuantidadeProduto(
          produto.quantidadeRestante,
          produto.unidadeMedida,
        )}`,
    )
    .join(' · ');
}

export function formatarResumoSaldoProdutos(
  saldo: SaldoCompraPaciente | null | undefined,
): string {
  if (!saldo?.produtos?.length) {
    return 'Sem saldo';
  }

  const nivelGeral = obterNivelSaldoCompra(saldo);
  if (nivelGeral === 'sem_saldo') {
    return 'Sem saldo';
  }

  return saldo.produtos.map(formatarSaldoProduto).join(' · ');
}

export function formatarOpcaoCompraAtiva(compra: CompraPaciente): string {
  const saldoResumo = formatarResumoSaldoProdutos(compra.saldo);
  return `${compra.pacoteNome} — ${saldoResumo}`;
}

export function formatarTextoHistoricoCompra(
  evento: HistoricoCompraPacienteEvento,
): string {
  const unidade = evento.unidadeMedida?.trim() || '';
  const produto = evento.produtoNome?.trim() || '';
  const data = formatarDataBrasil(evento.data);

  switch (evento.tipo) {
    case 'Compra': {
      const qtd = formatarQuantidadeProduto(evento.quantidade ?? 0, unidade);
      const por = evento.usuarioNome ? ` · por ${evento.usuarioNome}` : '';
      return produto
        ? `Comprou ${qtd} de ${produto} em ${data}${por}`
        : `Comprou ${qtd} em ${data}${por}`;
    }
    case 'Aplicacao': {
      const qtd = formatarQuantidadeProduto(evento.quantidade ?? 0, unidade);
      const aplicador = evento.aplicadorNome ? ` · aplicado por ${evento.aplicadorNome}` : '';
      const lote = evento.loteCodigo ? ` · lote ${evento.loteCodigo}` : '';
      const cancelada = evento.cancelada ? ' (cancelada)' : '';
      return `Usou ${qtd}${produto ? ` de ${produto}` : ''} em ${data}${aplicador}${lote}${cancelada}`;
    }
    case 'CancelamentoAplicacao': {
      const qtd = formatarQuantidadeProduto(evento.quantidade ?? 0, unidade);
      return `Cancelou uso de ${qtd}${produto ? ` de ${produto}` : ''} em ${data}`;
    }
    case 'AjusteManual': {
      const campo =
        evento.campoAjuste === 'quantidadeContratada' ? 'contratada' : 'utilizada';
      const de = formatarQuantidadeProduto(evento.quantidadeAnterior ?? 0, unidade);
      const para = formatarQuantidadeProduto(evento.quantidadeNova ?? 0, unidade);
      const por = evento.usuarioNome ? ` · manual por ${evento.usuarioNome}` : ' · manual';
      const motivo = evento.motivo ? ` · ${evento.motivo}` : '';
      return `Ajuste de ${campo}: ${de} → ${para}${produto ? ` (${produto})` : ''} em ${data}${por}${motivo}`;
    }
    case 'CancelamentoCompra': {
      const por = evento.usuarioNome ? ` · por ${evento.usuarioNome}` : '';
      const motivo = evento.motivo ? ` · ${evento.motivo}` : '';
      return `Compra cancelada em ${data}${por}${motivo}`;
    }
    default:
      return `${evento.tipo} em ${data}`;
  }
}

export function normalizarCompraPaciente(compra: CompraPaciente): CompraPaciente {
  return {
    ...compra,
    status: normalizarStatusCompra(compra.status),
  };
}
