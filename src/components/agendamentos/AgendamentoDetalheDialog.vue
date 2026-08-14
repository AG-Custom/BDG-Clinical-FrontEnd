<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import AppEntityAuditSection from '@/components/shared/AppEntityAuditSection.vue';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { permissoes } from '@/constants/permissoes';
import { CODIGOS_TIPO_PRODUTO } from '@/constants/tipos-produto';
import { agendamentoService } from '@/services/agendamento.service';
import { compraPacienteService } from '@/services/compra-paciente.service';
import { procedimentoService } from '@/services/procedimento.service';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import type { Agendamento, ConcluirAgendamentoRequest } from '@/types/entidades/agendamento';
import type { CompraPaciente } from '@/types/entidades/compra-paciente';
import {
  calcularDuracaoAgendamento,
  formatarDataCabecalhoAgendamento,
  formatarDataHoraAgendamento,
  formatarIntervaloHorarioAgendamento,
  formatarNomesProcedimentos,
  isAgendamentoEditavel,
  obterCorEventoAgendamento,
  obterIconeTipoAgendamento,
  obterIniciaisNome,
  obterLabelTipoAgendamento,
  obterProcedimentosDoAgendamento,
  temAplicacoesRegistradas,
} from '@/types/entidades/agendamento';
import {
  formatarMensagemEstoqueInsuficiente,
  formatarSaldoComUnidade,
} from '@/types/entidades/saldo-estoque';
import type { SaldoLoteEstoque } from '@/types/entidades/saldo-estoque';
import type { ItemProcedimentoFormulario, ProcedimentoItem } from '@/types/entidades/procedimento';
import type { Produto } from '@/types/entidades/produto';
import { normalizarLista } from '@/utils/normalizar-lista';

const props = defineProps<{
  modelValue: boolean;
  agendamento: Agendamento | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
  editar: [agendamento: Agendamento];
  atualizado: [];
}>();

const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const temPermissaoEditar = usePermissao(permissoes.agendamento.editar);
const temPermissaoConfirmar = usePermissao(permissoes.agendamento.confirmar);
const temPermissaoConcluir = usePermissao(permissoes.agendamento.concluir);
const temPermissaoCancelar = usePermissao(permissoes.agendamento.cancelar);
const temPermissaoFalta = usePermissao(permissoes.agendamento.registrarFalta);

const processando = ref(false);
const carregandoConclusao = ref(false);
const dialogCancelar = ref(false);
const dialogConfirmarAplicacao = ref(false);
const dialogConcluir = ref(false);
const dialogAdicionarInsumo = ref(false);
const dialogRemoverInsumo = ref(false);
const motivoCancelamento = ref('');
const produtosInsumosDisponiveis = ref<Produto[]>([]);
const compraAgendamento = ref<CompraPaciente | null>(null);
const procedimentoAdicionarInsumo = ref<ProcedimentoConclusaoFormulario | null>(null);
const novoInsumoProdutoId = ref<string | null>(null);
const procedimentoRemoverInsumo = ref<ProcedimentoConclusaoFormulario | null>(null);
const insumoRemover = ref<ItemProcedimentoFormulario | null>(null);
const saldosInsumosConclusao = ref<
  Record<string, { saldoAtual: number; unidadeMedidaSigla: string }>
>({});

interface ProcedimentoConclusaoFormulario {
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

const procedimentosConclusao = ref<ProcedimentoConclusaoFormulario[]>([]);

const produtosInsumosPorId = computed(
  () => new Map(produtosInsumosDisponiveis.value.map((produto) => [produto.id, produto])),
);

const podeEditar = computed(
  () =>
    Boolean(temPermissaoEditar.value) &&
    Boolean(props.agendamento && isAgendamentoEditavel(props.agendamento.status)),
);

const podeConfirmar = computed(
  () => Boolean(temPermissaoConfirmar.value) && props.agendamento?.status === 'Agendado',
);

const podeConcluir = computed(
  () => Boolean(temPermissaoConcluir.value) && props.agendamento?.status === 'Confirmado',
);

const podeCancelar = computed(
  () =>
    Boolean(temPermissaoCancelar.value) &&
    Boolean(
      props.agendamento &&
        (props.agendamento.status === 'Agendado' || props.agendamento.status === 'Confirmado'),
    ),
);

const podeMarcarFalta = computed(
  () =>
    Boolean(temPermissaoFalta.value) &&
    Boolean(
      props.agendamento &&
        (props.agendamento.status === 'Agendado' || props.agendamento.status === 'Confirmado'),
    ),
);

const nomesProcedimentos = computed(() =>
  props.agendamento ? formatarNomesProcedimentos(props.agendamento) : null,
);

const possuiAplicacoes = computed(() =>
  props.agendamento ? temAplicacoesRegistradas(props.agendamento) : false,
);

const quantidadeAplicacoes = computed(() => {
  if (!props.agendamento) {
    return 0;
  }

  if (props.agendamento.aplicacaoPacienteIds && props.agendamento.aplicacaoPacienteIds.length > 0) {
    return props.agendamento.aplicacaoPacienteIds.length;
  }

  return props.agendamento.aplicacaoPacienteId ? 1 : 0;
});

const quantidadeProcedimentos = computed(() =>
  props.agendamento ? obterProcedimentosDoAgendamento(props.agendamento).length : 0,
);

const produtosAplicacaoConclusao = computed(() =>
  procedimentosConclusao.value
    .filter((procedimento) => procedimento.exigeQuantidade && procedimento.produtoAplicadoNome)
    .map((procedimento) => procedimento.produtoAplicadoNome as string),
);

const exibirTextoConclusaoAplicacao = computed(
  () => props.agendamento?.tipo === 'Aplicacao',
);

const corStatus = computed(() =>
  props.agendamento ? obterCorEventoAgendamento(props.agendamento.status) : 'var(--ds-brand-primary)',
);

const dataCabecalho = computed(() =>
  props.agendamento ? formatarDataCabecalhoAgendamento(props.agendamento.dataInicio) : '',
);

const intervaloHorario = computed(() =>
  props.agendamento
    ? formatarIntervaloHorarioAgendamento(
        props.agendamento.dataInicio,
        props.agendamento.dataFim,
      )
    : '',
);

const duracao = computed(() =>
  props.agendamento
    ? calcularDuracaoAgendamento(props.agendamento.dataInicio, props.agendamento.dataFim)
    : '',
);

const iniciaisPaciente = computed(() =>
  props.agendamento ? obterIniciaisNome(props.agendamento.pacienteNome) : '',
);

const iniciaisFuncionario = computed(() =>
  props.agendamento ? obterIniciaisNome(props.agendamento.funcionarioNome) : '',
);

function fechar(): void {
  emit('update:modelValue', false);
}

function formatarErroConclusao(erro: unknown): string {
  const mensagem = obterMensagem(erro);
  const procedimentoRelacionado = procedimentosConclusao.value.find(
    (procedimento) =>
      procedimento.produtoAplicadoNome &&
      mensagem.includes(procedimento.produtoAplicadoNome),
  );

  return formatarMensagemEstoqueInsuficiente(mensagem, {
    unidadeNome: props.agendamento?.unidadeNome,
    unidadeMedidaSigla: procedimentoRelacionado?.unidadeMedidaSigla,
  });
}

async function carregarSaldoProduto(
  unidadeId: string,
  produtoId: string,
): Promise<{ saldoAtual: number; unidadeMedidaSigla: string }> {
  try {
    const saldos = await saldoEstoqueService.listar({ unidadeId, produtoId });
    const saldo = saldos[0];

    return {
      saldoAtual: saldo?.saldoAtual ?? 0,
      unidadeMedidaSigla: saldo?.unidadeMedidaSigla ?? '',
    };
  } catch {
    return {
      saldoAtual: 0,
      unidadeMedidaSigla: '',
    };
  }
}

function formatarOpcaoLote(lote: SaldoLoteEstoque): string {
  const saldo = formatarSaldoComUnidade(lote.saldoAtual, lote.unidadeMedidaSigla);
  return `${lote.codigo} · val. ${lote.dataValidade} · ${saldo}`;
}

function opcoesLotesConclusao(item: ProcedimentoConclusaoFormulario) {
  return item.lotesDisponiveis
    .filter((lote) => lote.saldoAtual > 0)
    .map((lote) => ({
      label: formatarOpcaoLote(lote),
      value: lote.loteProdutoId,
    }));
}

function opcoesInsumosManuaisConclusao(item: ProcedimentoConclusaoFormulario) {
  const selecionados = new Set(
    item.insumosManuais
      .map((insumo) => insumo.produtoId)
      .filter((id): id is string => Boolean(id)),
  );

  return produtosInsumosDisponiveis.value
    .filter((produto) => {
      if (produto.id === item.produtoAplicadoId) {
        return false;
      }

      return (
        !selecionados.has(produto.id) &&
        produto.ativo &&
        produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.INSUMO
      );
    })
    .map((produto) => ({
      label: produto.nome,
      value: produto.id,
    }));
}

const opcoesInsumosManuaisConclusaoFiltradas = ref<{ label: string; value: string }[]>([]);

function filtrarInsumosManuaisConclusao(
  val: string,
  update: (callback: () => void) => void,
  procedimento: ProcedimentoConclusaoFormulario,
): void {
  update(() => {
    const base = opcoesInsumosManuaisConclusao(procedimento);
    const termo = val.trim().toLowerCase();
    if (!termo) {
      opcoesInsumosManuaisConclusaoFiltradas.value = base;
      return;
    }

    opcoesInsumosManuaisConclusaoFiltradas.value = base.filter((opcao) =>
      opcao.label.toLowerCase().includes(termo),
    );
  });
}

function obterSiglaInsumoConclusao(produtoId: string | null): string {
  if (!produtoId) {
    return '';
  }

  return (
    produtosInsumosDisponiveis.value.find((produto) => produto.id === produtoId)
      ?.unidadeMedidaSigla ?? ''
  );
}

function obterNomeInsumoConclusao(produtoId: string | null): string {
  if (!produtoId) {
    return 'Produto não informado';
  }

  return produtosInsumosPorId.value.get(produtoId)?.nome ?? produtoId;
}

function linhasSaldoConclusao(item: ProcedimentoConclusaoFormulario) {
  const linhas = new Map<
    string,
    {
      produtoId: string;
      produtoNome: string;
      quantidadeNecessaria: number;
      saldoAtual: number | null;
      sigla: string;
    }
  >();

  if (item.produtoAplicadoId) {
    linhas.set(item.produtoAplicadoId, {
      produtoId: item.produtoAplicadoId,
      produtoNome: item.produtoAplicadoNome ?? 'Medicamento',
      quantidadeNecessaria: Number(item.quantidadeUtilizada ?? 0),
      saldoAtual: item.saldoAtual,
      sigla: item.unidadeMedidaSigla,
    });
  }

  for (const insumo of item.insumosManuais) {
    if (!insumo.produtoId) {
      continue;
    }

    const saldo = saldosInsumosConclusao.value[insumo.produtoId];
    linhas.set(insumo.produtoId, {
      produtoId: insumo.produtoId,
      produtoNome: obterNomeInsumoConclusao(insumo.produtoId),
      quantidadeNecessaria: Number(insumo.quantidade ?? 0),
      saldoAtual: saldo?.saldoAtual ?? null,
      sigla: saldo?.unidadeMedidaSigla ?? obterSiglaInsumoConclusao(insumo.produtoId),
    });
  }

  return [...linhas.values()];
}

function validarQuantidadeInsumoManual(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe a quantidade';
  }

  if (value <= 0) {
    return 'A quantidade deve ser maior que zero';
  }

  return true;
}

function validarInsumosManuaisConclusao(
  procedimento: ProcedimentoConclusaoFormulario,
): boolean | string {
  if (procedimento.consumirInsumosKit) {
    return true;
  }

  for (const insumo of procedimento.insumosManuais) {
    if (!insumo.produtoId) {
      return 'Selecione o produto de cada insumo manual.';
    }

    const quantidadeOk = validarQuantidadeInsumoManual(insumo.quantidade);
    if (quantidadeOk !== true) {
      return quantidadeOk;
    }
  }

  const ids = procedimento.insumosManuais
    .map((insumo) => insumo.produtoId)
    .filter((id): id is string => Boolean(id));

  if (new Set(ids).size !== ids.length) {
    return 'Não é permitido repetir o mesmo insumo na lista manual.';
  }

  return true;
}

function montarInsumosManuaisConclusao(item: ProcedimentoConclusaoFormulario) {
  if (item.consumirInsumosKit) {
    return null;
  }

  const insumos = item.insumosManuais
    .filter(
      (insumo): insumo is { produtoId: string; quantidade: number } =>
        Boolean(insumo.produtoId) &&
        insumo.quantidade !== null &&
        !Number.isNaN(insumo.quantidade) &&
        insumo.quantidade > 0,
    )
    .map((insumo) => ({
      produtoId: insumo.produtoId,
      quantidade: insumo.quantidade,
    }));

  return insumos.length > 0 ? insumos : null;
}

function camposProcedimentoConclusao(item: ProcedimentoConclusaoFormulario) {
  const insumosManuais = montarInsumosManuaisConclusao(item);

  return {
    ...(item.exigeQuantidade ? { quantidadeUtilizada: item.quantidadeUtilizada } : {}),
    ...(item.exigeLote && item.loteProdutoId ? { loteProdutoId: item.loteProdutoId } : {}),
    consumirInsumosKit: item.consumirInsumosKit,
    ...(insumosManuais ? { insumosManuais } : {}),
  };
}

function abrirAdicionarInsumoConclusao(item: ProcedimentoConclusaoFormulario): void {
  procedimentoAdicionarInsumo.value = item;
  novoInsumoProdutoId.value = null;
  opcoesInsumosManuaisConclusaoFiltradas.value = opcoesInsumosManuaisConclusao(item);
  dialogAdicionarInsumo.value = true;
}

function fecharAdicionarInsumoConclusao(): void {
  dialogAdicionarInsumo.value = false;
  procedimentoAdicionarInsumo.value = null;
  novoInsumoProdutoId.value = null;
}

async function confirmarAdicionarInsumoConclusao(): Promise<void> {
  const procedimento = procedimentoAdicionarInsumo.value;
  const produtoId = novoInsumoProdutoId.value;
  if (!procedimento || !produtoId || !props.agendamento) {
    return;
  }

  procedimento.insumosManuais.push({ produtoId, quantidade: 1 });
  fecharAdicionarInsumoConclusao();

  if (!saldosInsumosConclusao.value[produtoId]) {
    saldosInsumosConclusao.value[produtoId] = await carregarSaldoProduto(
      props.agendamento.unidadeId,
      produtoId,
    );
  }
}

function diminuirQuantidadeInsumoConclusao(
  item: ProcedimentoConclusaoFormulario,
  indice: number,
): void {
  const insumo = item.insumosManuais[indice];
  if (!insumo) {
    return;
  }

  const quantidadeAtual = Number(insumo.quantidade ?? 0);
  if (!Number.isFinite(quantidadeAtual) || quantidadeAtual <= 1) {
    procedimentoRemoverInsumo.value = item;
    insumoRemover.value = insumo;
    dialogRemoverInsumo.value = true;
    return;
  }

  insumo.quantidade = Math.round((quantidadeAtual - 1) * 10000) / 10000;
}

function aumentarQuantidadeInsumoConclusao(
  item: ProcedimentoConclusaoFormulario,
  indice: number,
): void {
  const insumo = item.insumosManuais[indice];
  if (!insumo) {
    return;
  }

  const quantidadeAtual = Number(insumo.quantidade ?? 0);
  insumo.quantidade =
    Math.round(((Number.isFinite(quantidadeAtual) ? quantidadeAtual : 0) + 1) * 10000) / 10000;
}

function fecharRemoverInsumoConclusao(): void {
  dialogRemoverInsumo.value = false;
  procedimentoRemoverInsumo.value = null;
  insumoRemover.value = null;
}

function confirmarRemoverInsumoConclusao(): void {
  const procedimento = procedimentoRemoverInsumo.value;
  const insumo = insumoRemover.value;
  if (procedimento && insumo) {
    const indice = procedimento.insumosManuais.indexOf(insumo);
    if (indice >= 0) {
      procedimento.insumosManuais.splice(indice, 1);
    }
  }

  fecharRemoverInsumoConclusao();
}

async function carregarProcedimentosConclusao(): Promise<void> {
  procedimentosConclusao.value = [];
  compraAgendamento.value = null;
  saldosInsumosConclusao.value = {};

  if (!props.agendamento) {
    return;
  }

  const resumos = obterProcedimentosDoAgendamento(props.agendamento);

  if (resumos.length === 0) {
    return;
  }

  carregandoConclusao.value = true;
  const unidadeId = props.agendamento.unidadeId;

  if (props.agendamento.compraPacienteId) {
    try {
      compraAgendamento.value = await compraPacienteService.obter(
        props.agendamento.compraPacienteId,
      );
    } catch {
      compraAgendamento.value = null;
    }
  }

  try {
    const produtos = await produtoService.listar();
    produtosInsumosDisponiveis.value = normalizarLista(produtos).filter(
      (produto) => produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.INSUMO,
    );
  } catch {
    produtosInsumosDisponiveis.value = [];
  }

  try {
    const detalhes = await Promise.all(
      resumos.map(async (resumo) => {
      try {
        const procedimento = await procedimentoService.obter(resumo.id);
        const exigeQuantidade = Boolean(procedimento.produtoAplicadoId);
        let saldoAtual: number | null = null;
        let unidadeMedidaSigla = '';
        let exigeLote = false;
        let lotesDisponiveis: SaldoLoteEstoque[] = [];

        if (exigeQuantidade && procedimento.produtoAplicadoId) {
          const [saldo, produto] = await Promise.all([
            carregarSaldoProduto(unidadeId, procedimento.produtoAplicadoId),
            produtoService.obter(procedimento.produtoAplicadoId),
          ]);
          saldoAtual = saldo.saldoAtual;
          unidadeMedidaSigla = saldo.unidadeMedidaSigla;
          exigeLote =
            produto.controlaEstoque &&
            produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.MEDICAMENTO;

          if (exigeLote) {
            const lotes = await saldoEstoqueService.listarLotes({
              unidadeId,
              produtoId: procedimento.produtoAplicadoId,
            });
            lotesDisponiveis = lotes.filter((lote) => lote.saldoAtual > 0);
          }
        }

        return {
          procedimentoId: resumo.id,
          nome: procedimento.nome,
          exigeQuantidade,
          exigeLote,
          quantidadeUtilizada: null,
          loteProdutoId: null,
          consumirInsumosKit: false,
          insumosManuais: procedimento.itens.map((insumo) => ({
            produtoId: insumo.produtoId,
            quantidade: insumo.quantidade,
          })),
          lotesDisponiveis,
          carregandoLotes: false,
          insumos: procedimento.itens,
          produtoAplicadoId: procedimento.produtoAplicadoId,
          produtoAplicadoNome: procedimento.produtoAplicadoNome ?? null,
          saldoAtual,
          unidadeMedidaSigla,
        };
      } catch {
        return {
          procedimentoId: resumo.id,
          nome: resumo.nome,
          exigeQuantidade: false,
          exigeLote: false,
          quantidadeUtilizada: null,
          loteProdutoId: null,
          consumirInsumosKit: false,
          insumosManuais: [],
          lotesDisponiveis: [],
          carregandoLotes: false,
          insumos: [],
          produtoAplicadoId: null,
          produtoAplicadoNome: null,
          saldoAtual: null,
          unidadeMedidaSigla: '',
        };
        }
      }),
    );

    procedimentosConclusao.value = detalhes;

    const idsInsumos = [
      ...new Set(
        detalhes.flatMap((item) =>
          item.insumosManuais
            .map((insumo) => insumo.produtoId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ];
    const saldos = await Promise.all(
      idsInsumos.map(async (produtoId) => ({
        produtoId,
        saldo: await carregarSaldoProduto(unidadeId, produtoId),
      })),
    );
    saldosInsumosConclusao.value = Object.fromEntries(
      saldos.map(({ produtoId, saldo }) => [produtoId, saldo]),
    );
  } finally {
    carregandoConclusao.value = false;
  }
}

function montarPayloadConclusao(): ConcluirAgendamentoRequest {
  if (procedimentosConclusao.value.length <= 1) {
    const unico = procedimentosConclusao.value[0];
    return {
      quantidadeUtilizada: unico?.quantidadeUtilizada ?? null,
      ...(unico ? camposProcedimentoConclusao(unico) : {}),
    };
  }

  return {
    procedimentos: procedimentosConclusao.value.map((procedimento) => ({
      procedimentoId: procedimento.procedimentoId,
      ...camposProcedimentoConclusao(procedimento),
    })),
  };
}

async function confirmar(): Promise<void> {
  if (!props.agendamento) {
    return;
  }

  processando.value = true;

  try {
    await agendamentoService.confirmar(props.agendamento.id);
    notificacao.sucesso('Agendamento confirmado.');
    emit('atualizado');
    fechar();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    processando.value = false;
  }
}

async function concluir(): Promise<void> {
  if (!props.agendamento) {
    return;
  }

  if (
    procedimentosConclusao.value.some(
      (procedimento) =>
        procedimento.exigeQuantidade && procedimento.quantidadeUtilizada === null,
    )
  ) {
    notificacao.info('Informe a quantidade do produto utilizada para todos os procedimentos com medicamento.');
    return;
  }

  const insumosInvalidos = procedimentosConclusao.value.find(
    (procedimento) => validarInsumosManuaisConclusao(procedimento) !== true,
  );

  if (insumosInvalidos) {
    const mensagem = validarInsumosManuaisConclusao(insumosInvalidos);
    notificacao.info(typeof mensagem === 'string' ? mensagem : 'Revise os insumos manuais.');
    return;
  }

  processando.value = true;

  try {
    await agendamentoService.concluir(props.agendamento.id, montarPayloadConclusao());
    notificacao.sucesso('Agendamento concluído.');
    dialogConcluir.value = false;
    emit('atualizado');
    fechar();
  } catch (erro) {
    notificacao.erro(formatarErroConclusao(erro));
  } finally {
    processando.value = false;
  }
}

async function cancelar(): Promise<void> {
  if (!props.agendamento || !motivoCancelamento.value.trim()) {
    notificacao.info('Informe o motivo do cancelamento.');
    return;
  }

  processando.value = true;

  try {
    await agendamentoService.cancelar(props.agendamento.id, {
      motivo: motivoCancelamento.value.trim(),
    });
    notificacao.sucesso('Agendamento cancelado.');
    dialogCancelar.value = false;
    motivoCancelamento.value = '';
    emit('atualizado');
    fechar();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    processando.value = false;
  }
}

async function marcarFalta(): Promise<void> {
  if (!props.agendamento) {
    return;
  }

  processando.value = true;

  try {
    await agendamentoService.marcarFalta(props.agendamento.id);
    notificacao.sucesso('Falta registrada.');
    emit('atualizado');
    fechar();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    processando.value = false;
  }
}

function abrirEdicao(): void {
  if (props.agendamento) {
    emit('editar', props.agendamento);
    fechar();
  }
}

function abrirDialogConcluir(): void {
  if (props.agendamento?.tipo === 'Aplicacao') {
    dialogConfirmarAplicacao.value = true;
    return;
  }

  dialogConcluir.value = true;
  void carregarProcedimentosConclusao();
}

function abrirModalAplicacao(): void {
  dialogConfirmarAplicacao.value = false;
  dialogConcluir.value = true;
  void carregarProcedimentosConclusao();
}

watch(
  () => props.modelValue,
  (aberto) => {
    if (!aberto) {
      dialogCancelar.value = false;
      dialogConfirmarAplicacao.value = false;
      dialogConcluir.value = false;
      dialogAdicionarInsumo.value = false;
      dialogRemoverInsumo.value = false;
      motivoCancelamento.value = '';
    }
  },
);
</script>

<template>
  <q-dialog
    :model-value="modelValue && Boolean(agendamento)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card v-if="agendamento" class="agendamento-detalhe">
      <div class="agendamento-detalhe__faixa" :style="{ backgroundColor: corStatus }" />

      <q-card-section class="agendamento-detalhe__cabecalho">
        <div class="agendamento-detalhe__cabecalho-topo">
          <div class="agendamento-detalhe__tipo-chip">
            <q-icon :name="obterIconeTipoAgendamento(agendamento.tipo)" size="16px" />
            <span>{{ obterLabelTipoAgendamento(agendamento.tipo) }}</span>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" aria-label="Fechar" @click="fechar" />
        </div>

        <h2 class="agendamento-detalhe__titulo">{{ agendamento.pacienteNome }}</h2>

        <div class="agendamento-detalhe__horario-bloco">
          <div class="agendamento-detalhe__horario-icone" aria-hidden="true">
            <q-icon name="schedule" size="22px" />
          </div>
          <div>
            <div class="agendamento-detalhe__data">{{ dataCabecalho }}</div>
            <div class="agendamento-detalhe__horario">
              {{ intervaloHorario }}
              <span v-if="duracao" class="agendamento-detalhe__duracao">({{ duracao }})</span>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="agendamento-detalhe__corpo">
        <div class="agendamento-detalhe__secao">
          <div class="agendamento-detalhe__avatar agendamento-detalhe__avatar--paciente">
            {{ iniciaisPaciente }}
          </div>
          <div class="agendamento-detalhe__secao-conteudo">
            <div class="agendamento-detalhe__secao-label">Paciente</div>
            <div class="agendamento-detalhe__secao-valor">{{ agendamento.pacienteNome }}</div>
          </div>
        </div>

        <div class="agendamento-detalhe__secao">
          <div class="agendamento-detalhe__avatar agendamento-detalhe__avatar--funcionario">
            {{ iniciaisFuncionario }}
          </div>
          <div class="agendamento-detalhe__secao-conteudo">
            <div class="agendamento-detalhe__secao-label">Profissional</div>
            <div class="agendamento-detalhe__secao-valor">{{ agendamento.funcionarioNome }}</div>
          </div>
        </div>

        <div class="agendamento-detalhe__secao">
          <q-icon name="apartment" size="20px" class="agendamento-detalhe__icone-secao" />
          <div class="agendamento-detalhe__secao-conteudo">
            <div class="agendamento-detalhe__secao-label">Unidade</div>
            <div class="agendamento-detalhe__secao-valor">{{ agendamento.unidadeNome }}</div>
          </div>
        </div>

        <div v-if="nomesProcedimentos" class="agendamento-detalhe__secao">
          <q-icon name="vaccines" size="20px" class="agendamento-detalhe__icone-secao" />
          <div class="agendamento-detalhe__secao-conteudo">
            <div class="agendamento-detalhe__secao-label">
              {{ quantidadeProcedimentos > 1 ? 'Procedimentos' : 'Procedimento' }}
            </div>
            <div class="agendamento-detalhe__secao-valor">{{ nomesProcedimentos }}</div>
          </div>
        </div>

        <div v-if="agendamento.observacao" class="agendamento-detalhe__observacao">
          <div class="agendamento-detalhe__secao-label">Observações</div>
          <p class="agendamento-detalhe__observacao-texto">{{ agendamento.observacao }}</p>
        </div>

        <div v-if="agendamento.motivoCancelamento" class="agendamento-detalhe__alerta">
          <q-icon name="block" size="18px" />
          <div>
            <div class="agendamento-detalhe__secao-label">Motivo do cancelamento</div>
            <div class="agendamento-detalhe__secao-valor">{{ agendamento.motivoCancelamento }}</div>
          </div>
        </div>

        <div v-if="possuiAplicacoes" class="agendamento-detalhe__info-extra">
          <q-icon name="check_circle" size="16px" color="positive" />
          <span>
            {{
              quantidadeAplicacoes > 1
                ? `${quantidadeAplicacoes} aplicações registradas no prontuário`
                : 'Aplicação registrada no prontuário'
            }}
          </span>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section v-if="agendamento" class="agendamento-detalhe__auditoria">
        <app-entity-audit-section
          :ativo="modelValue"
          :registro-id="agendamento.id"
          entidade-auditoria="Agendamento"
          :criado-em="agendamento.criadoEm"
          :atualizado-em="agendamento.atualizadoEm"
          :id-usuario-criacao-fallback="agendamento.criadoPorId"
          mostrar-titulo-secao
        />
      </q-card-section>

      <q-card-actions v-if="podeEditar" class="agendamento-detalhe__acoes">
        <q-btn
          v-if="podeMarcarFalta"
          flat
          label="Registrar falta"
          icon="person_off"
          color="warning"
          no-caps
          :disable="processando"
          @click="marcarFalta"
        />
        <q-btn
          v-if="podeCancelar"
          flat
          label="Cancelar"
          icon="block"
          color="negative"
          no-caps
          :disable="processando"
          @click="dialogCancelar = true"
        />
        <q-space />
        <q-btn
          flat
          label="Editar"
          icon="edit"
          color="primary"
          no-caps
          :disable="processando"
          @click="abrirEdicao"
        />
        <q-btn
          v-if="podeConfirmar"
          unelevated
          label="Confirmar"
          icon="check"
          color="primary"
          no-caps
          :disable="processando"
          @click="confirmar"
        />
        <q-btn
          v-if="podeConcluir"
          unelevated
          label="Concluir atendimento"
          icon="task_alt"
          color="positive"
          no-caps
          :disable="processando"
          @click="abrirDialogConcluir"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="dialogCancelar" persistent>
    <q-card style="min-width: 320px">
      <q-card-section>
        <div class="text-h6">Cancelar agendamento</div>
        <p class="text-body2 q-mt-sm">Informe o motivo do cancelamento.</p>
      </q-card-section>
      <q-card-section>
        <q-input
          v-model="motivoCancelamento"
          label="Motivo *"
          type="textarea"
          outlined
          autogrow
          :disable="processando"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Voltar" color="primary" no-caps :disable="processando" v-close-popup />
        <q-btn
          unelevated
          label="Confirmar cancelamento"
          color="negative"
          no-caps
          :disable="processando"
          @click="cancelar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="dialogConfirmarAplicacao" persistent>
    <q-card class="agendamento-aplicacao-confirmacao">
      <q-card-section class="row items-start no-wrap q-gutter-md">
        <q-avatar color="primary" text-color="white" icon="vaccines" />
        <div>
          <div class="text-h6">Realizar aplicação?</div>
          <div class="text-body2 text-grey-7 q-mt-xs">
            Este é um agendamento de aplicação. Deseja registrar a aplicação agora antes de concluir?
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Não, voltar" color="primary" no-caps v-close-popup />
        <q-btn
          unelevated
          label="Sim, fazer aplicação"
          color="primary"
          icon-right="arrow_forward"
          no-caps
          @click="abrirModalAplicacao"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="dialogConcluir" persistent>
    <q-card class="agendamento-aplicacao-modal">
      <q-card-section>
        <div class="text-h5 text-weight-medium">
          {{ exibirTextoConclusaoAplicacao ? 'Registrar aplicação' : 'Concluir agendamento' }}
        </div>
        <p v-if="exibirTextoConclusaoAplicacao" class="text-body2 q-mt-sm agendamento-detalhe__texto-conclusao">
          <template v-if="produtosAplicacaoConclusao.length === 0">
            Ao concluir, serão registradas as aplicações e movimentações de estoque.
          </template>
          <template v-else-if="produtosAplicacaoConclusao.length === 1">
            Ao concluir, serão registradas as aplicações e movimentações de estoque para o produto
            <strong class="agendamento-detalhe__produto-nome">{{ produtosAplicacaoConclusao[0] }}</strong>.
          </template>
          <template v-else>
            Ao concluir, serão registradas as aplicações e movimentações de estoque para os produtos
            <template
              v-for="(produto, indice) in produtosAplicacaoConclusao"
              :key="produto"
            >
              <strong class="agendamento-detalhe__produto-nome">{{ produto }}</strong><span v-if="indice < produtosAplicacaoConclusao.length - 1">, </span>
            </template>.
          </template>
        </p>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-gutter-md agendamento-aplicacao-modal__conteudo scroll">
        <div v-if="agendamento" class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input :model-value="agendamento.unidadeNome" label="Unidade" outlined readonly />
          </div>
          <div class="col-12 col-md-6">
            <q-input :model-value="agendamento.pacienteNome" label="Paciente" outlined readonly />
          </div>
          <div class="col-12 col-md-6">
            <q-input :model-value="agendamento.funcionarioNome" label="Aplicador" outlined readonly />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              :model-value="formatarDataHoraAgendamento(agendamento.dataInicio)"
              label="Data da aplicação"
              outlined
              readonly
            />
          </div>
        </div>

        <q-card
          v-if="compraAgendamento"
          flat
          bordered
          class="agendamento-aplicacao-modal__compra"
        >
          <q-card-section>
            <div class="text-caption text-grey-7">Pacote/compra vinculado ao agendamento</div>
            <div class="text-subtitle1 text-weight-medium">{{ compraAgendamento.pacoteNome }}</div>
            <div class="row q-col-gutter-md q-mt-sm">
              <div
                v-for="saldo in compraAgendamento.saldo.produtos"
                :key="saldo.produtoId"
                class="col-12 col-sm-6"
              >
                <strong>{{ saldo.produtoNome }}:</strong>
                {{ formatarSaldoComUnidade(saldo.quantidadeRestante, saldo.unidadeMedida) }} restantes
                <span class="text-grey-7">
                  (de {{ formatarSaldoComUnidade(saldo.quantidadeContratada, saldo.unidadeMedida) }})
                </span>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <div v-if="carregandoConclusao" class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="42px" />
        </div>

        <div
          v-for="procedimento in procedimentosConclusao"
          :key="procedimento.procedimentoId"
          class="agendamento-detalhe__procedimento-conclusao agendamento-aplicacao-modal__procedimento-conclusao"
        >
          <div class="text-h6 q-mb-sm">
            {{ procedimento.nome }}
          </div>

          <template v-if="procedimento.exigeQuantidade">
            <div
              v-if="procedimento.produtoAplicadoNome"
              class="text-body2 q-mb-xs"
            >
              <span class="text-weight-medium">Produto aplicado:</span>
              {{ procedimento.produtoAplicadoNome }}
            </div>
            <q-input
              v-model.number="procedimento.quantidadeUtilizada"
              label="Quantidade do produto utilizada *"
              type="number"
              outlined
              :disable="processando"
              min="0"
              step="0.01"
            />
            <q-select
              v-if="procedimento.exigeLote"
              v-model="procedimento.loteProdutoId"
              class="q-mt-sm"
              :options="opcoesLotesConclusao(procedimento)"
              label="Lote do medicamento (opcional)"
              outlined
              emit-value
              map-options
              clearable
              :disable="processando || procedimento.carregandoLotes"
              :hint="
                opcoesLotesConclusao(procedimento).length === 0
                  ? 'Nenhum lote com saldo nesta unidade. Pode concluir sem lote por enquanto.'
                  : 'Opcional por enquanto — informe se já houver entrada com lote.'
              "
            />
          </template>

          <div class="q-mt-md">
            <div class="row items-center q-mb-sm">
              <div>
                <div class="text-weight-medium">Produtos utilizados</div>
                <div class="text-caption text-grey-7">
                  O kit é uma sugestão inicial. Ajuste os produtos e quantidades desta aplicação.
                </div>
              </div>
              <q-space />
              <q-btn
                flat
                dense
                color="primary"
                icon="add"
                label="Adicionar insumo"
                no-caps
                :disable="processando"
                @click="abrirAdicionarInsumoConclusao(procedimento)"
              />
            </div>

            <q-markup-table
              v-if="procedimento.insumosManuais.length > 0"
              flat
              bordered
              dense
              class="agendamento-aplicacao-modal__insumos"
            >
              <thead>
                <tr>
                  <th class="text-left">Produto</th>
                  <th class="text-right">Quantidade usada</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(insumo, indice) in procedimento.insumosManuais"
                  :key="insumo.produtoId || indice"
                >
                  <td class="text-left text-weight-medium">
                    {{ obterNomeInsumoConclusao(insumo.produtoId) }}
                  </td>
                  <td class="text-right">
                    <div class="agendamento-aplicacao-modal__quantidade-insumo">
                      <q-btn
                        round
                        flat
                        dense
                        size="sm"
                        color="negative"
                        icon="remove"
                        aria-label="Diminuir quantidade ou remover insumo"
                        :disable="processando"
                        @click="diminuirQuantidadeInsumoConclusao(procedimento, indice)"
                      >
                        <q-tooltip>
                          {{ Number(insumo.quantidade ?? 0) <= 1 ? 'Remover insumo' : 'Diminuir quantidade' }}
                        </q-tooltip>
                      </q-btn>
                      <span class="agendamento-aplicacao-modal__quantidade-valor">
                        {{ Number(insumo.quantidade ?? 0).toLocaleString('pt-BR') }}
                        {{ obterSiglaInsumoConclusao(insumo.produtoId) }}
                      </span>
                      <q-btn
                        round
                        flat
                        dense
                        size="sm"
                        color="primary"
                        icon="add"
                        aria-label="Aumentar quantidade do insumo"
                        :disable="processando"
                        @click="aumentarQuantidadeInsumoConclusao(procedimento, indice)"
                      >
                        <q-tooltip>Aumentar quantidade</q-tooltip>
                      </q-btn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </q-markup-table>

            <div
              v-if="procedimento.insumosManuais.length === 0"
              class="text-body2 agendamento-aplicacao-modal__vazio"
            >
              Nenhum produto adicional. A baixa será apenas do medicamento aplicado.
            </div>
          </div>

          <div v-if="linhasSaldoConclusao(procedimento).length > 0" class="q-mt-md">
            <div class="text-weight-medium q-mb-xs">Saldo na unidade</div>
            <q-markup-table flat bordered dense>
              <thead>
                <tr>
                  <th class="text-left">Produto</th>
                  <th class="text-right">Necessário</th>
                  <th class="text-right">Disponível</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="itemSaldo in linhasSaldoConclusao(procedimento)" :key="itemSaldo.produtoId">
                  <td>{{ itemSaldo.produtoNome }}</td>
                  <td class="text-right">
                    {{ formatarSaldoComUnidade(itemSaldo.quantidadeNecessaria, itemSaldo.sigla) }}
                  </td>
                  <td class="text-right">
                    {{
                      itemSaldo.saldoAtual !== null
                        ? formatarSaldoComUnidade(itemSaldo.saldoAtual, itemSaldo.sigla)
                        : '—'
                    }}
                  </td>
                </tr>
              </tbody>
            </q-markup-table>
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Voltar" color="primary" no-caps :disable="processando" v-close-popup />
        <q-btn
          unelevated
          :label="exibirTextoConclusaoAplicacao ? 'Concluir e registrar aplicação' : 'Concluir'"
          color="positive"
          no-caps
          :loading="processando"
          :disable="carregandoConclusao"
          @click="concluir"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="dialogAdicionarInsumo" persistent>
    <q-card style="width: 460px; max-width: 92vw">
      <q-card-section>
        <div class="text-h6">Adicionar insumo</div>
        <div class="text-body2 text-grey-7 q-mt-xs">Selecione o produto que foi utilizado.</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-select
          v-model="novoInsumoProdutoId"
          :options="opcoesInsumosManuaisConclusaoFiltradas"
          label="Insumo *"
          outlined
          emit-value
          map-options
          use-input
          input-debounce="200"
          autofocus
          @filter="(val, update) => procedimentoAdicionarInsumo && filtrarInsumosManuaisConclusao(val, update, procedimentoAdicionarInsumo)"
        >
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey">Nenhum insumo encontrado</q-item-section>
            </q-item>
          </template>
        </q-select>
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Cancelar" color="primary" no-caps @click="fecharAdicionarInsumoConclusao" />
        <q-btn
          unelevated
          label="Adicionar"
          color="primary"
          no-caps
          :disable="!novoInsumoProdutoId"
          @click="confirmarAdicionarInsumoConclusao"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="dialogRemoverInsumo" persistent>
    <q-card style="width: 440px; max-width: 92vw">
      <q-card-section>
        <div class="text-h6">Remover insumo?</div>
        <div class="text-body2 text-grey-7 q-mt-xs">
          Deseja remover {{ obterNomeInsumoConclusao(insumoRemover?.produtoId ?? null) }} dos produtos utilizados?
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Cancelar" color="primary" no-caps @click="fecharRemoverInsumoConclusao" />
        <q-btn
          unelevated
          label="Remover"
          color="negative"
          no-caps
          @click="confirmarRemoverInsumoConclusao"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.agendamento-detalhe {
  max-width: 95vw;
  overflow: hidden;
  width: 560px;

  &__faixa {
    height: 4px;
    width: 100%;
  }

  &__cabecalho {
    padding-bottom: var(--ds-space-3);
    padding-top: var(--ds-space-4);
  }

  &__cabecalho-topo {
    align-items: center;
    display: flex;
    gap: var(--ds-space-2);
    margin-bottom: var(--ds-space-3);
  }

  &__tipo-chip {
    align-items: center;
    background: var(--ds-bg-subtle);
    border-radius: var(--ds-radius-md);
    color: var(--ds-text-secondary);
    display: inline-flex;
    font-size: var(--ds-font-size-xs, 0.75rem);
    font-weight: var(--ds-font-weight-medium);
    gap: var(--ds-space-1);
    padding: var(--ds-space-1) var(--ds-space-2);
  }

  &__titulo {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-xl, 1.25rem);
    font-weight: var(--ds-font-weight-semibold);
    line-height: 1.3;
    margin: 0 0 var(--ds-space-4);
  }

  &__horario-bloco {
    align-items: flex-start;
    display: flex;
    gap: var(--ds-space-3);
  }

  &__horario-icone {
    align-items: center;
    background: var(--ds-bg-subtle);
    border-radius: var(--ds-radius-md);
    color: var(--ds-brand-primary);
    display: flex;
    flex-shrink: 0;
    height: 40px;
    justify-content: center;
    width: 40px;
  }

  &__data {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-sm, 0.875rem);
    font-weight: var(--ds-font-weight-medium);
  }

  &__horario {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm, 0.875rem);
    margin-top: 2px;
  }

  &__duracao {
    color: var(--ds-text-secondary);
  }

  &__corpo {
    display: flex;
    flex-direction: column;
    gap: var(--ds-space-4);
    padding-bottom: var(--ds-space-3);
    padding-top: var(--ds-space-4);
  }

  &__secao {
    align-items: flex-start;
    display: flex;
    gap: var(--ds-space-3);
  }

  &__avatar {
    align-items: center;
    border-radius: 50%;
    display: flex;
    flex-shrink: 0;
    font-size: var(--ds-font-size-xs, 0.75rem);
    font-weight: var(--ds-font-weight-semibold);
    height: 36px;
    justify-content: center;
    width: 36px;

    &--paciente {
      background: var(--ds-color-primary-100);
      color: var(--ds-color-primary-800);
    }

    &--funcionario {
      background: var(--ds-bg-subtle);
      color: var(--ds-text-secondary);
    }
  }

  &__icone-secao {
    color: var(--ds-text-secondary);
    flex-shrink: 0;
    margin-top: 2px;
  }

  &__secao-conteudo {
    min-width: 0;
  }

  &__secao-label {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-xs, 0.75rem);
    font-weight: var(--ds-font-weight-medium);
    margin-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  &__secao-valor {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-sm, 0.875rem);
    font-weight: var(--ds-font-weight-medium);
  }

  &__observacao {
    background: var(--ds-bg-page);
    border-radius: var(--ds-radius-md);
    padding: var(--ds-space-3);
  }

  &__observacao-texto {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-sm, 0.875rem);
    line-height: 1.5;
    margin: var(--ds-space-1) 0 0;
    white-space: pre-wrap;
  }

  &__alerta {
    align-items: flex-start;
    background: var(--ds-color-warning-50);
    border-radius: var(--ds-radius-md);
    color: var(--ds-color-warning-600);
    display: flex;
    gap: var(--ds-space-2);
    padding: var(--ds-space-3);

    .agendamento-detalhe__secao-label {
      color: var(--ds-color-warning-600);
    }

    .agendamento-detalhe__secao-valor {
      color: var(--ds-text-primary);
    }
  }

  &__info-extra {
    align-items: center;
    color: var(--ds-text-secondary);
    display: flex;
    font-size: var(--ds-font-size-sm, 0.875rem);
    gap: var(--ds-space-2);
  }

  &__meta {
    color: var(--ds-text-secondary);
    display: flex;
    flex-wrap: wrap;
    font-size: var(--ds-font-size-xs, 0.75rem);
    gap: var(--ds-space-1);
    padding-bottom: var(--ds-space-2);
    padding-top: var(--ds-space-2);
  }

  &__meta-sep {
    opacity: 0.5;
  }

  &__acoes {
    gap: var(--ds-space-2);
    padding: var(--ds-space-3) var(--ds-space-4);
  }

  &__procedimento-conclusao {
    display: flex;
    flex-direction: column;
    gap: var(--ds-space-2);
  }

  &__texto-conclusao {
    color: var(--ds-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  &__produto-nome {
    color: var(--ds-text-primary);
    font-weight: var(--ds-font-weight-semibold);

    &--destaque {
      font-size: var(--ds-font-size-base, 1rem);
    }
  }

  &__saldo-unidade {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-xs, 0.75rem);
    line-height: 1.4;
    margin: 0;
  }

  &__insumos-kit {
    color: var(--ds-text-secondary);
  }

  &__saldo-valor {
    font-weight: var(--ds-font-weight-semibold);

    &--positivo {
      color: var(--ds-color-success-500);
    }

    &--negativo {
      color: var(--ds-color-error-500);
    }
  }
}

.agendamento-aplicacao-confirmacao {
  max-width: 92vw;
  width: 480px;
}

.agendamento-aplicacao-modal {
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  max-width: 96vw;
  width: 1120px;

  &__conteudo {
    flex: 1 1 auto;
    min-height: 0;
    padding: var(--ds-space-5, 24px);
  }

  &__compra {
    background: var(--ds-bg-subtle);
  }

  &__procedimento-conclusao {
    border: 1px solid var(--ds-border-default, #e0e0e0);
    border-radius: var(--ds-radius-lg, 16px);
    padding: var(--ds-space-4, 16px);
  }

  &__insumos {
    border-radius: var(--ds-radius-md, 12px);
    overflow: hidden;
  }

  &__quantidade-insumo {
    align-items: center;
    display: inline-flex;
    gap: var(--ds-space-2, 8px);
    justify-content: flex-end;
  }

  &__quantidade-valor {
    min-width: 90px;
    text-align: center;
  }

  &__vazio {
    background: var(--ds-bg-subtle);
    border-radius: var(--ds-radius-md, 12px);
    color: var(--ds-text-secondary);
    padding: var(--ds-space-3, 12px);
  }
}

@media (max-width: 599px) {
  .agendamento-aplicacao-modal {
    max-height: 96vh;
    max-width: 98vw;
    width: 98vw;

    &__conteudo {
      padding: var(--ds-space-3, 12px);
    }

    &__quantidade-valor {
      min-width: 72px;
    }
  }
}
</style>
