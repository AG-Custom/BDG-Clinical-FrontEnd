export const TIPOS_PEDIDO_FORNECEDOR = [
  'Medicamento',
  'Insumo',
  'Material descartável',
  'Implante',
  'Equipamento',
  'Alimentação',
  'Brinde',
  'Outro',
] as const;

export type TipoPedidoFornecedor = (typeof TIPOS_PEDIDO_FORNECEDOR)[number];

export const STATUS_PEDIDO_FORNECEDOR = [
  'Pendente',
  'Enviado para Fornecedor',
  'Recebido pela Unidade',
  'Cancelado',
  'Recusado'
] as const;

export type StatusPedidoFornecedor = (typeof STATUS_PEDIDO_FORNECEDOR)[number];

export const STATUS_PEDIDO_EDITAVEL: StatusPedidoFornecedor[] = ['Pendente', 'Enviado para Fornecedor'];

export type ModoValorPedidoItem = 'unitario' | 'total';

export interface PedidoFornecedorItem {
  id?: string;
  produtoId: string;
  produtoNome?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface AnexoPedidoFornecedor {
  id: string;
  nomeArquivo: string;
  contentType: string;
  url: string;
  tamanhoBytes: number;
  criadoEm: string;
}

export const TAMANHO_MAX_ANEXO_PEDIDO = 10 * 1024 * 1024;

export const EXTENSOES_ANEXO_PEDIDO =
  '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface PedidoFornecedor {
  id: string;
  fornecedorId: string;
  fornecedorNome?: string;
  unidadeId: string;
  unidadeNome?: string;
  tipoPedido: TipoPedidoFornecedor;
  dataPedido: string;
  status: StatusPedidoFornecedor;
  observacao: string | null;
  valorTotal: number;
  itens: PedidoFornecedorItem[];
  anexos: AnexoPedidoFornecedor[];
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface PedidoFornecedorItemRequest {
  produtoId: string;
  quantidade: number;
  valorUnitario?: number;
  valorTotal?: number;
}

export interface ItemPedidoFormulario {
  produtoId: string | null;
  quantidade: number | null;
  modoValor: ModoValorPedidoItem;
  valorUnitario: number | null;
  valorTotal: number | null;
}

export function criarItemPedidoVazio(): ItemPedidoFormulario {
  return {
    produtoId: null,
    quantidade: null,
    modoValor: 'unitario',
    valorUnitario: null,
    valorTotal: null,
  };
}

export function calcularValorTotalLinhaItem(item: ItemPedidoFormulario): number {
  if (item.modoValor === 'total') {
    return item.valorTotal ?? 0;
  }

  return (item.quantidade ?? 0) * (item.valorUnitario ?? 0);
}

export function calcularValorUnitarioDerivado(item: ItemPedidoFormulario): number | null {
  const quantidade = item.quantidade;

  if (!quantidade || quantidade <= 0 || item.valorTotal === null || item.valorTotal === undefined) {
    return null;
  }

  return item.valorTotal / quantidade;
}

export function montarItemPedidoRequest(item: ItemPedidoFormulario): PedidoFornecedorItemRequest {
  const base = {
    produtoId: item.produtoId as string,
    quantidade: item.quantidade as number,
  };

  if (item.modoValor === 'total') {
    return {
      ...base,
      valorTotal: item.valorTotal as number,
    };
  }

  return {
    ...base,
    valorUnitario: item.valorUnitario as number,
  };
}

export interface SalvarPedidoFornecedorRequest {
  fornecedorId: string;
  unidadeId: string;
  tipoPedido: TipoPedidoFornecedor;
  dataPedido: string;
  status: 'Aberto' | 'Pedido';
  observacao?: string | null;
  itens: PedidoFornecedorItemRequest[];
}

export interface ListarPedidosFornecedorParams {
  status?: StatusPedidoFornecedor;
  fornecedorId?: string;
  unidadeId?: string;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarMoedaParaInput(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return '';
  }

  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parsearMoedaDoInput(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '');

  if (!digitos) {
    return null;
  }

  return Number(digitos) / 100;
}

export function formatarDataPedido(data: string): string {
  return formatarDataHoraBrasil(data);
}

export function deIsoParaInputDatetimeLocal(iso: string): string {
  return deIsoBackendParaInputDatetimeLocal(iso);
}

export function obterCorStatusPedido(status: StatusPedidoFornecedor): string {
  switch (status) {
    case 'Pendente':
      return 'primary';
    case 'Enviado para Fornecedor':
      return 'warning';
    case 'Recebido pela Unidade':
      return 'positive';
    case 'Cancelado':
      return 'grey';
    case 'Recusado':
      return 'negative';
    default:
      return 'grey';
  }
}

export function formatarLinhaItemPedido(item: PedidoFornecedorItem): string {
  const nome = item.produtoNome ?? 'Produto';
  const quantidade = item.quantidade.toLocaleString('pt-BR');

  return `${nome} — ${quantidade} un · ${formatarMoeda(item.valorTotal)}`;
}

export function obterTooltipItensPedido(pedido: PedidoFornecedor): string | null {
  if (!pedido.itens?.length) {
    return null;
  }

  return pedido.itens.map(formatarLinhaItemPedido).join('\n');
}

export function obterResumoItensPedido(pedido: PedidoFornecedor): string {
  const itens = pedido.itens ?? [];

  if (itens.length === 0) {
    return '—';
  }

  if (itens.length === 1) {
    const item = itens[0];
    const nome = item.produtoNome ?? '1 produto';

    return `${nome} (${item.quantidade.toLocaleString('pt-BR')} un)`;
  }

  const quantidadeTotal = itens.reduce((total, item) => total + item.quantidade, 0);

  return `${itens.length} produtos (${quantidadeTotal.toLocaleString('pt-BR')} un)`;
}

export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function possuiTooltipItensPedido(pedido: PedidoFornecedor): boolean {
  return obterTooltipItensPedido(pedido) !== null;
}
import {
  deInputDatetimeLocalParaIso,
  deIsoBackendParaInputDatetimeLocal,
  formatarDataHoraBrasil,
} from '@/utils/data-hora';

export { deInputDatetimeLocalParaIso };
