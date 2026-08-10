<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAplicador } from '@/composables/useAplicador';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { permissoes } from '@/constants/permissoes';
import { CODIGOS_TIPO_PRODUTO } from '@/constants/tipos-produto';
import { aplicacaoPacienteService } from '@/services/aplicacao-paciente.service';
import { cargoService } from '@/services/cargo.service';
import { compraPacienteService } from '@/services/compra-paciente.service';
import { funcionarioService } from '@/services/funcionario.service';
import { pacienteService } from '@/services/paciente.service';
import { procedimentoService } from '@/services/procedimento.service';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import { sintomaService } from '@/services/sintoma.service';
import { unidadeService } from '@/services/unidade.service';
import type { AplicacaoPaciente } from '@/types/entidades/aplicacao-paciente';
import {
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
} from '@/types/entidades/aplicacao-paciente';
import type { CompraPaciente } from '@/types/entidades/compra-paciente';
import {
  formatarOpcaoCompraAtiva,
  formatarQuantidadeProduto,
  formatarResumoSaldoProdutos,
} from '@/types/entidades/compra-paciente';
import { isFuncionarioAplicador } from '@/types/entidades/funcionario';
import type { Funcionario } from '@/types/entidades/funcionario';
import type { Cargo } from '@/types/entidades/cargo';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import type { SaldoLoteEstoque } from '@/types/entidades/saldo-estoque';
import type { Paciente } from '@/types/entidades/paciente';
import type { ItemProcedimentoFormulario, Procedimento } from '@/types/entidades/procedimento';
import { criarItemProcedimentoVazio } from '@/types/entidades/procedimento';
import type { Produto } from '@/types/entidades/produto';
import type { Sintoma } from '@/types/entidades/sintoma';
import type { Unidade } from '@/types/entidades/unidade';
import { normalizarLista } from '@/utils/normalizar-lista';

interface SaldoKitItem {
  produtoId: string;
  produtoNome: string;
  quantidadeNecessaria: number;
  saldoAtual: number | null;
  sigla: string;
  controlaEstoque: boolean;
}

interface ProcedimentoNaFormulario {
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
  procedimento: Procedimento | null;
  saldosKit: SaldoKitItem[];
}

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { podeGerenciarAplicacoes } = useAplicador();
const podeCriarAplicacao = usePermissao(permissoes.aplicacoes.criar);
const podeEditarAplicacao = usePermissao(permissoes.aplicacoes.editar);
const podeCancelarAplicacao = usePermissao(permissoes.aplicacoes.cancelar);

const carregando = ref(false);
const salvando = ref(false);
const cancelando = ref(false);
const dialogCancelar = ref(false);
const aplicacaoCarregada = ref<AplicacaoPaciente | null>(null);
const unidadesDisponiveis = ref<Unidade[]>([]);
const pacientesDisponiveis = ref<Paciente[]>([]);
const comprasAtivas = ref<CompraPaciente[]>([]);
const carregandoCompras = ref(false);
const produtosDisponiveis = ref<Produto[]>([]);
const procedimentosDisponiveis = ref<Procedimento[]>([]);
const procedimentosNaFormulario = ref<ProcedimentoNaFormulario[]>([]);
const aplicadoresDisponiveis = ref<Funcionario[]>([]);
const cargosDisponiveis = ref<Cargo[]>([]);
const existemAplicadoresNaEmpresa = ref(false);
const sintomasDisponiveis = ref<Sintoma[]>([]);
const dadosIniciaisCarregados = ref(false);

const isEdicao = computed(() => route.name === 'aplicacoes-paciente-editar');
const aplicacaoId = computed(() => route.params.id as string | undefined);

const somenteLeitura = computed(
  () => isEdicao.value && aplicacaoCarregada.value?.cancelada === true,
);

const camposImutaveis = computed(
  () => isEdicao.value && aplicacaoCarregada.value?.cancelada === false,
);

const form = reactive({
  unidadeId: null as string | null,
  pacienteId: null as string | null,
  compraPacienteId: null as string | null,
  procedimentoIds: [] as string[],
  aplicadorId: null as string | null,
  dataAplicacao: '',
  peso: null as number | null,
  sintomaIds: [] as string[],
  observacao: '',
});

const unidadeIdSelecionada = toRef(form, 'unidadeId');

const opcoesUnidades = computed(() =>
  unidadesDisponiveis.value
    .filter((unidade) => unidade.ativo)
    .map((unidade) => ({
      label: unidade.nome,
      value: unidade.id,
    })),
);

const opcoesPacientes = computed(() =>
  pacientesDisponiveis.value
    .filter((paciente) => paciente.ativo)
    .map((paciente) => ({
      label: paciente.nome,
      value: paciente.id,
    })),
);

const opcoesComprasAtivas = computed(() =>
  comprasAtivas.value.map((compra) => ({
    label: formatarOpcaoCompraAtiva(compra),
    value: compra.id,
  })),
);

const compraSelecionada = computed(
  () => comprasAtivas.value.find((compra) => compra.id === form.compraPacienteId) ?? null,
);

const saldoCompraSelecionada = computed(() => compraSelecionada.value?.saldo ?? null);

const mostrarAlertaCompras = computed(
  () =>
    !isEdicao.value &&
    dadosIniciaisCarregados.value &&
    Boolean(form.pacienteId) &&
    !carregandoCompras.value &&
    comprasAtivas.value.length === 0,
);

const opcoesProcedimentos = computed(() =>
  procedimentosDisponiveis.value
    .filter((procedimento) => procedimento.ativo)
    .map((procedimento) => ({
      label: procedimento.nome,
      value: procedimento.id,
    })),
);

const produtosPorId = computed(
  () => new Map(produtosDisponiveis.value.map((produto) => [produto.id, produto])),
);

const cargosPorId = computed(
  () => new Map(cargosDisponiveis.value.map((cargo) => [cargo.id, cargo])),
);

const opcoesAplicadores = computed(() =>
  aplicadoresDisponiveis.value.map((funcionario) => ({
    label: funcionario.nome,
    value: funcionario.id,
  })),
);

const opcoesSintomas = computed(() =>
  sintomasDisponiveis.value
    .filter((sintoma) => sintoma.ativo)
    .map((sintoma) => ({
      label: sintoma.nome,
      value: sintoma.id,
    })),
);

const podeEditarCampos = computed(
  () =>
    podeGerenciarAplicacoes.value &&
    !somenteLeitura.value &&
    (isEdicao.value ? podeEditarAplicacao.value : podeCriarAplicacao.value),
);

const mostrarAlertaUnidades = computed(
  () => dadosIniciaisCarregados.value && unidadesDisponiveis.value.length === 0,
);

const mostrarAlertaPacientes = computed(
  () =>
    dadosIniciaisCarregados.value &&
    Boolean(unidadeIdSelecionada.value) &&
    pacientesDisponiveis.value.length === 0,
);

const aplicacaoLegadaSemProcedimento = computed(
  () => isEdicao.value && !aplicacaoCarregada.value?.procedimentoId,
);

const mostrarAlertaProcedimentos = computed(
  () =>
    dadosIniciaisCarregados.value &&
    !isEdicao.value &&
    procedimentosDisponiveis.value.length === 0,
);

const exigeQuantidadeEmAlgumProcedimento = computed(
  () => !isEdicao.value && procedimentosNaFormulario.value.some((item) => item.exigeQuantidade),
);


const exigeQuantidade = computed(() => {
  if (isEdicao.value) {
    return aplicacaoCarregada.value?.quantidadeUtilizada !== null;
  }

  return exigeQuantidadeEmAlgumProcedimento.value;
});

const itensConsumidosExibicao = computed(
  () => aplicacaoCarregada.value?.itensConsumidos ?? [],
);

const mostrarAlertaAplicadores = computed(
  () =>
    dadosIniciaisCarregados.value &&
    Boolean(unidadeIdSelecionada.value) &&
    opcoesAplicadores.value.length === 0,
);

const mostrarAlertaSintomas = computed(
  () => dadosIniciaisCarregados.value && sintomasDisponiveis.value.length === 0,
);

const hintAplicador = computed(() => {
  if (mostrarAlertaAplicadores.value) {
    return undefined;
  }

  if (!unidadeIdSelecionada.value) {
    return 'Selecione a unidade para listar os aplicadores disponíveis.';
  }

  return undefined;
});


const temAplicadoresNaEmpresa = computed(() => existemAplicadoresNaEmpresa.value);

const mensagemAlertaAplicador = computed(() =>
  temAplicadoresNaEmpresa.value
    ? 'Nenhum aplicador vinculado a esta unidade. Vincule um colaborador com cargo de aplicador ou cadastre um novo.'
    : 'Nenhum aplicador cadastrado. Crie um cargo com permissão de aplicação e vincule a um colaborador.',
);

const rotuloAlertaAplicador = computed(() =>
  temAplicadoresNaEmpresa.value ? 'Gerenciar colaboradores' : 'Cadastrar cargo',
);

const destinoAlertaAplicador = computed(() =>
  temAplicadoresNaEmpresa.value ? { name: 'funcionarios' } : { name: 'cargos-novo' },
);

function validarUnidade(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione a unidade';
}

function validarPaciente(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o paciente';
}

function validarCompraPaciente(): boolean | string {
  return true;
}

function validarProcedimentos(value: string[]): boolean | string {
  if (isEdicao.value) {
    return true;
  }

  return (Array.isArray(value) && value.length > 0) || 'Selecione ao menos um procedimento';
}

function validarAplicador(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o aplicador';
}

function produtoExigeLote(produtoId: string | null | undefined): boolean {
  if (!produtoId) {
    return false;
  }

  const produto = produtosPorId.value.get(produtoId);
  return Boolean(
    produto?.controlaEstoque && produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.MEDICAMENTO,
  );
}

function formatarOpcaoLote(lote: SaldoLoteEstoque): string {
  const saldo = formatarSaldoComUnidade(lote.saldoAtual, lote.unidadeMedidaSigla);
  return `${lote.codigo} · val. ${lote.dataValidade} · ${saldo}`;
}

function opcoesLotesProcedimento(item: ProcedimentoNaFormulario) {
  return item.lotesDisponiveis
    .filter((lote) => lote.saldoAtual > 0)
    .map((lote) => ({
      label: formatarOpcaoLote(lote),
      value: lote.loteProdutoId,
    }));
}

function validarQuantidadeProcedimento(
  procedimento: ProcedimentoNaFormulario,
): boolean | string {
  if (!procedimento.exigeQuantidade) {
    return true;
  }

  const value = procedimento.quantidadeUtilizada;
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe a quantidade utilizada';
  }

  if (value <= 0) {
    return 'A quantidade deve ser maior que zero';
  }

  return true;
}

/** Lote opcional por enquanto (pós-migração); futuramente voltará a ser obrigatório. */
function validarLoteProcedimento(_procedimento: ProcedimentoNaFormulario): boolean | string {
  return true;
}

function opcoesInsumosManuais(item: ProcedimentoNaFormulario) {
  const produtoAplicadoId = item.procedimento?.produtoAplicadoId ?? null;
  const selecionados = new Set(
    item.insumosManuais
      .map((insumo) => insumo.produtoId)
      .filter((id): id is string => Boolean(id)),
  );

  return produtosDisponiveis.value
    .filter((produto) => {
      if (produto.id === produtoAplicadoId) {
        return false;
      }

      if (selecionados.has(produto.id)) {
        return true;
      }

      return (
        produto.ativo && produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.INSUMO
      );
    })
    .map((produto) => ({
      label: produto.nome,
      value: produto.id,
    }));
}

function obterSiglaUnidadeMedida(produtoId: string | null): string {
  if (!produtoId) {
    return '';
  }

  return produtosPorId.value.get(produtoId)?.unidadeMedidaSigla ?? '';
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

function validarInsumosManuaisProcedimento(
  procedimento: ProcedimentoNaFormulario,
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

function adicionarInsumoManual(item: ProcedimentoNaFormulario): void {
  item.insumosManuais.push(criarItemProcedimentoVazio());
}

function removerInsumoManual(item: ProcedimentoNaFormulario, indice: number): void {
  item.insumosManuais.splice(indice, 1);
  void atualizarSaldosProcedimento(item);
}

function montarInsumosManuaisPayload(item: ProcedimentoNaFormulario) {
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

function validarDataAplicacao(value: string): boolean | string {
  return Boolean(value) || 'Informe a data da aplicação';
}

function validarPeso(value: number | null): boolean | string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return true;
  }

  if (value <= 0) {
    return 'O peso deve ser maior que zero';
  }

  return true;
}

async function carregarPacientesDaUnidade(): Promise<void> {
  if (!form.unidadeId) {
    pacientesDisponiveis.value = [];
    return;
  }

  try {
    pacientesDisponiveis.value = await pacienteService.listar({
      unidadeId: form.unidadeId,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarComprasAtivasDoPaciente(): Promise<void> {
  if (!form.pacienteId || isEdicao.value) {
    comprasAtivas.value = [];
    return;
  }

  carregandoCompras.value = true;

  try {
    comprasAtivas.value = normalizarLista(
      await compraPacienteService.listarAtivasPorPaciente(form.pacienteId),
    );
  } catch (error) {
    comprasAtivas.value = [];
    notificacao.erro(obterMensagem(error));
  } finally {
    carregandoCompras.value = false;
  }
}

async function carregarSaldosKitParaProcedimento(
  procedimento: Procedimento,
  quantidadeUtilizada: number | null,
  consumirInsumosKit: boolean,
  insumosManuais: ItemProcedimentoFormulario[] = [],
): Promise<SaldoKitItem[]> {
  if (!form.unidadeId) {
    return [];
  }

  const produtosKit: { produtoId: string; produtoNome: string; quantidade: number }[] = [];

  if (procedimento.produtoAplicadoId) {
    produtosKit.push({
      produtoId: procedimento.produtoAplicadoId,
      produtoNome: procedimento.produtoAplicadoNome ?? 'Produto aplicado',
      quantidade: quantidadeUtilizada ?? 0,
    });
  }

  if (consumirInsumosKit) {
    for (const item of procedimento.itens) {
      produtosKit.push({
        produtoId: item.produtoId,
        produtoNome: item.produtoNome ?? 'Insumo',
        quantidade: item.quantidade,
      });
    }
  } else {
    for (const item of insumosManuais) {
      if (!item.produtoId || item.quantidade === null || item.quantidade <= 0) {
        continue;
      }

      const produto = produtosPorId.value.get(item.produtoId);
      produtosKit.push({
        produtoId: item.produtoId,
        produtoNome: produto?.nome ?? 'Insumo',
        quantidade: item.quantidade,
      });
    }
  }

  const itensComEstoque = produtosKit.filter((item) => {
    const produto = produtosPorId.value.get(item.produtoId);
    return produto?.controlaEstoque !== false;
  });

  if (itensComEstoque.length === 0) {
    return [];
  }

  try {
    const resultados = await Promise.all(
      itensComEstoque.map(async (item) => {
        const saldos = await saldoEstoqueService.listar({
          unidadeId: form.unidadeId!,
          produtoId: item.produtoId,
        });

        const saldo = saldos[0];
        const produto = produtosPorId.value.get(item.produtoId);

        return {
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          quantidadeNecessaria: item.quantidade,
          saldoAtual: saldo?.saldoAtual ?? 0,
          sigla: saldo?.unidadeMedidaSigla ?? produto?.unidadeMedidaSigla ?? '',
          controlaEstoque: produto?.controlaEstoque !== false,
        };
      }),
    );

    return resultados;
  } catch {
    return [];
  }
}

async function carregarLotesProcedimento(item: ProcedimentoNaFormulario): Promise<void> {
  if (!form.unidadeId || !item.procedimento?.produtoAplicadoId || !item.exigeLote) {
    item.lotesDisponiveis = [];
    item.loteProdutoId = null;
    item.carregandoLotes = false;
    return;
  }

  item.carregandoLotes = true;

  try {
    const lotes = await saldoEstoqueService.listarLotes({
      unidadeId: form.unidadeId,
      produtoId: item.procedimento.produtoAplicadoId,
    });
    item.lotesDisponiveis = lotes.filter((lote) => lote.saldoAtual > 0);

    if (
      item.loteProdutoId &&
      !item.lotesDisponiveis.some((lote) => lote.loteProdutoId === item.loteProdutoId)
    ) {
      item.loteProdutoId = null;
    }
  } catch (error) {
    item.lotesDisponiveis = [];
    item.loteProdutoId = null;
    notificacao.erro(obterMensagem(error));
  } finally {
    item.carregandoLotes = false;
  }
}

async function sincronizarProcedimentosFormulario(): Promise<void> {
  if (isEdicao.value) {
    return;
  }

  const idsAtuais = new Set(form.procedimentoIds);
  const anteriores = new Map(
    procedimentosNaFormulario.value.map((item) => [item.procedimentoId, item]),
  );

  const proximos: ProcedimentoNaFormulario[] = [];

  for (const procedimentoId of form.procedimentoIds) {
    const existente = anteriores.get(procedimentoId);
    if (existente) {
      proximos.push(existente);
      continue;
    }

    try {
      const procedimento = await procedimentoService.obter(procedimentoId);
      const exigeLote = produtoExigeLote(procedimento.produtoAplicadoId);
      const novoItem: ProcedimentoNaFormulario = {
        procedimentoId,
        nome: procedimento.nome,
        exigeQuantidade: Boolean(procedimento.produtoAplicadoId),
        exigeLote,
        quantidadeUtilizada: null,
        loteProdutoId: null,
        consumirInsumosKit: procedimento.itens.length > 0,
        insumosManuais: [],
        lotesDisponiveis: [],
        carregandoLotes: false,
        procedimento,
        saldosKit: [],
      };
      await carregarLotesProcedimento(novoItem);
      novoItem.saldosKit = await carregarSaldosKitParaProcedimento(
        procedimento,
        null,
        novoItem.consumirInsumosKit,
        novoItem.insumosManuais,
      );
      proximos.push(novoItem);
    } catch (error) {
      notificacao.erro(obterMensagem(error));
    }
  }

  procedimentosNaFormulario.value = proximos.filter((item) => idsAtuais.has(item.procedimentoId));
}

async function atualizarSaldosProcedimento(item: ProcedimentoNaFormulario): Promise<void> {
  if (!item.procedimento) {
    return;
  }

  item.saldosKit = await carregarSaldosKitParaProcedimento(
    item.procedimento,
    item.quantidadeUtilizada,
    item.consumirInsumosKit,
    item.insumosManuais,
  );
}

async function carregarAplicadoresDaUnidade(): Promise<void> {
  if (!form.unidadeId) {
    aplicadoresDisponiveis.value = [];
    return;
  }

  try {
    const funcionarios = await funcionarioService.listar({ unidadeId: form.unidadeId });
    aplicadoresDisponiveis.value = normalizarLista(funcionarios).filter((funcionario) =>
      isFuncionarioAplicador(funcionario, cargosPorId.value),
    );
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function onUnidadeChange(): Promise<void> {
  await carregarPacientesDaUnidade();
  await carregarAplicadoresDaUnidade();

  if (!camposImutaveis.value) {
    form.pacienteId = null;
    form.compraPacienteId = null;
    comprasAtivas.value = [];

    if (!aplicadoresDisponiveis.value.some((funcionario) => funcionario.id === form.aplicadorId)) {
      form.aplicadorId = null;
    }
  }

  await carregarSaldosTodosProcedimentos();
}

async function carregarSaldosTodosProcedimentos(): Promise<void> {
  await Promise.all(
    procedimentosNaFormulario.value.map(async (item) => {
      await carregarLotesProcedimento(item);
      await atualizarSaldosProcedimento(item);
    }),
  );
}

async function onPacienteChange(): Promise<void> {
  if (!camposImutaveis.value) {
    form.compraPacienteId = null;
  }

  await carregarComprasAtivasDoPaciente();

  if (
    form.compraPacienteId &&
    !comprasAtivas.value.some((compra) => compra.id === form.compraPacienteId)
  ) {
    form.compraPacienteId = null;
  }
}

async function garantirPacienteNaLista(pacienteId: string): Promise<void> {
  if (pacientesDisponiveis.value.some((p) => p.id === pacienteId)) {
    return;
  }

  const paciente = await pacienteService.obter(pacienteId);
  pacientesDisponiveis.value = [paciente, ...pacientesDisponiveis.value];
}

async function garantirProcedimentoNaLista(procedimentoId: string): Promise<void> {
  if (procedimentosDisponiveis.value.some((p) => p.id === procedimentoId)) {
    return;
  }

  const procedimento = await procedimentoService.obter(procedimentoId);
  procedimentosDisponiveis.value = [procedimento, ...procedimentosDisponiveis.value];
}

async function garantirAplicadorNaLista(aplicadorId: string): Promise<void> {
  if (aplicadoresDisponiveis.value.some((funcionario) => funcionario.id === aplicadorId)) {
    return;
  }

  const funcionario = await funcionarioService.obter(aplicadorId);
  aplicadoresDisponiveis.value = [funcionario, ...aplicadoresDisponiveis.value];
}

async function carregarDadosIniciais(): Promise<void> {
  try {
    const [listaUnidades, listaProdutos, listaProcedimentos, listaFuncionariosEmpresa, listaSintomas, listaCargos] =
      await Promise.all([
        unidadeService.listar(),
        produtoService.listar(),
        procedimentoService.listar(),
        funcionarioService.listar(),
        sintomaService.listar(),
        cargoService.listar(true),
      ]);

    unidadesDisponiveis.value = normalizarLista(listaUnidades);
    produtosDisponiveis.value = normalizarLista(listaProdutos);
    procedimentosDisponiveis.value = normalizarLista(listaProcedimentos);
    sintomasDisponiveis.value = normalizarLista(listaSintomas);
    cargosDisponiveis.value = normalizarLista(listaCargos);
    existemAplicadoresNaEmpresa.value = normalizarLista(listaFuncionariosEmpresa).some(
      (funcionario) => isFuncionarioAplicador(funcionario, cargosPorId.value),
    );
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function carregarProcedimentoEdicao(procedimentoId: string | null): Promise<void> {
  if (!procedimentoId) {
    procedimentosNaFormulario.value = [];
    form.procedimentoIds = [];
    return;
  }

  form.procedimentoIds = [procedimentoId];

  try {
    const procedimento = await procedimentoService.obter(procedimentoId);
    procedimentosNaFormulario.value = [
      {
        procedimentoId,
        nome: procedimento.nome,
        exigeQuantidade: Boolean(procedimento.produtoAplicadoId),
        exigeLote: produtoExigeLote(procedimento.produtoAplicadoId),
        quantidadeUtilizada: aplicacaoCarregada.value?.quantidadeUtilizada ?? null,
        loteProdutoId: null,
        consumirInsumosKit: procedimento.itens.length > 0,
        insumosManuais: [],
        lotesDisponiveis: [],
        carregandoLotes: false,
        procedimento,
        saldosKit: [],
      },
    ];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    procedimentosNaFormulario.value = [];
  }
}

async function recarregarDependencias(): Promise<void> {
  await carregarDadosIniciais();

  if (form.unidadeId) {
    await Promise.all([carregarPacientesDaUnidade(), carregarAplicadoresDaUnidade()]);
  }

  if (isEdicao.value && aplicacaoCarregada.value?.procedimentoId) {
    await carregarProcedimentoEdicao(aplicacaoCarregada.value.procedimentoId);
  } else {
    await sincronizarProcedimentosFormulario();
  }
}

async function carregarAplicacao(): Promise<void> {
  if (!isEdicao.value || !aplicacaoId.value) {
    return;
  }

  carregando.value = true;

  try {
    const aplicacao = await aplicacaoPacienteService.obter(aplicacaoId.value);
    aplicacaoCarregada.value = aplicacao;

    form.unidadeId = aplicacao.unidadeId;
    form.pacienteId = aplicacao.pacienteId;
    form.compraPacienteId = aplicacao.compraPacienteId;
    form.aplicadorId = aplicacao.aplicadorId;
    form.dataAplicacao = deIsoParaInputDatetimeLocal(aplicacao.dataAplicacao);
    form.peso = aplicacao.peso;
    form.sintomaIds = aplicacao.sintomas.map((s) => s.id);
    form.observacao = aplicacao.observacao ?? '';

    const garantias: Promise<void>[] = [
      garantirPacienteNaLista(aplicacao.pacienteId),
      garantirAplicadorNaLista(aplicacao.aplicadorId),
    ];

    if (aplicacao.procedimentoId) {
      garantias.push(garantirProcedimentoNaLista(aplicacao.procedimentoId));
    }

    if (aplicacao.produtoId) {
      garantias.push(
        produtoService.obter(aplicacao.produtoId).then((produto) => {
          if (!produtosDisponiveis.value.some((p) => p.id === produto.id)) {
            produtosDisponiveis.value = [produto, ...produtosDisponiveis.value];
          }
        }),
      );
    }

    await Promise.all(garantias);

    await carregarProcedimentoEdicao(aplicacao.procedimentoId);

    await Promise.all([carregarPacientesDaUnidade(), carregarAplicadoresDaUnidade()]);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'aplicacoes-paciente' });
  } finally {
    carregando.value = false;
  }
}

function camposProcedimentoPayload(item: ProcedimentoNaFormulario) {
  const insumosManuais = montarInsumosManuaisPayload(item);

  return {
    ...(item.exigeQuantidade && item.quantidadeUtilizada !== null
      ? { quantidadeUtilizada: item.quantidadeUtilizada }
      : {}),
    ...(item.exigeLote && item.loteProdutoId ? { loteProdutoId: item.loteProdutoId } : {}),
    consumirInsumosKit: item.consumirInsumosKit,
    ...(insumosManuais ? { insumosManuais } : {}),
  };
}

function montarPayloadCriacao() {
  const base = {
    pacienteId: form.pacienteId!,
    aplicadorId: form.aplicadorId!,
    unidadeId: form.unidadeId!,
    dataAplicacao: deInputDatetimeLocalParaIso(form.dataAplicacao),
    compraPacienteId: form.compraPacienteId,
    peso: form.peso,
    observacao: form.observacao.trim() || null,
    sintomaIds: form.sintomaIds.length > 0 ? form.sintomaIds : null,
  };

  const itens = procedimentosNaFormulario.value;

  if (itens.length === 1) {
    const unico = itens[0];
    return {
      ...base,
      procedimentoId: unico.procedimentoId,
      ...camposProcedimentoPayload(unico),
    };
  }

  return {
    ...base,
    procedimentos: itens.map((item) => ({
      procedimentoId: item.procedimentoId,
      ...camposProcedimentoPayload(item),
    })),
  };
}

function montarPayloadAtualizacao() {
  return {
    dataAplicacao: deInputDatetimeLocalParaIso(form.dataAplicacao),
    peso: form.peso,
    observacao: form.observacao.trim() || null,
    sintomaIds: form.sintomaIds.length > 0 ? form.sintomaIds : null,
  };
}

async function salvar(): Promise<void> {
  if (!isEdicao.value) {
    const procedimentoInvalido = procedimentosNaFormulario.value.find(
      (procedimento) => validarQuantidadeProcedimento(procedimento) !== true,
    );

    if (procedimentoInvalido) {
      notificacao.info(
        'Informe a quantidade do produto para todos os procedimentos com medicamento.',
      );
      return;
    }

    const insumosInvalidos = procedimentosNaFormulario.value.find(
      (procedimento) => validarInsumosManuaisProcedimento(procedimento) !== true,
    );

    if (insumosInvalidos) {
      const mensagem = validarInsumosManuaisProcedimento(insumosInvalidos);
      notificacao.info(typeof mensagem === 'string' ? mensagem : 'Revise os insumos manuais.');
      return;
    }
  }

  salvando.value = true;

  try {
    if (isEdicao.value && aplicacaoId.value) {
      await aplicacaoPacienteService.atualizar(aplicacaoId.value, montarPayloadAtualizacao());
      notificacao.sucesso('Aplicação atualizada com sucesso.');
    } else {
      const resultado = await aplicacaoPacienteService.criar(montarPayloadCriacao());
      const quantidade = resultado.aplicacoes.length;
      notificacao.sucesso(
        quantidade > 1
          ? `${quantidade} aplicações registradas com sucesso.`
          : 'Aplicação registrada com sucesso.',
      );
    }

    await router.push({ name: 'aplicacoes-paciente' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function abrirDialogCancelar(): void {
  dialogCancelar.value = true;
}

async function confirmarCancelar(): Promise<void> {
  if (!aplicacaoId.value) {
    return;
  }

  cancelando.value = true;

  try {
    await aplicacaoPacienteService.cancelar(aplicacaoId.value);
    notificacao.sucesso('Aplicação cancelada com sucesso. Estoque estornado.');
    dialogCancelar.value = false;
    await router.push({ name: 'aplicacoes-paciente' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    cancelando.value = false;
  }
}

function voltar(): void {
  router.push({ name: 'aplicacoes-paciente' });
}

watch(
  () => [...form.procedimentoIds],
  () => {
    void sincronizarProcedimentosFormulario();
  },
);

function aoAlterarQuantidadeProcedimento(item: ProcedimentoNaFormulario): void {
  void atualizarSaldosProcedimento(item);
}

function aoAlterarConsumirInsumosKit(item: ProcedimentoNaFormulario): void {
  if (item.consumirInsumosKit) {
    item.insumosManuais = [];
  }

  void atualizarSaldosProcedimento(item);
}

function aoAlterarInsumoManual(item: ProcedimentoNaFormulario): void {
  void atualizarSaldosProcedimento(item);
}

onMounted(async () => {
  await carregarDadosIniciais();

  if (isEdicao.value) {
    await carregarAplicacao();
  } else {
    form.dataAplicacao = deIsoParaInputDatetimeLocal(new Date().toISOString());
  }
});
</script>

<template>
  <q-page class="page-content page-content--form-wide q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar aplicação' : 'Nova aplicação'"
      :subtitulo="
        somenteLeitura
          ? 'Esta aplicação foi cancelada e não pode ser alterada.'
          : isEdicao
            ? 'Atualize peso, data, sintomas ou observações.'
            : 'Registre uma ou mais aplicações selecionando os procedimentos realizados.'
      "
    >
      <q-badge
        v-if="somenteLeitura"
        color="negative"
        label="Cancelada"
        class="q-ml-sm"
      />
    </app-page-header>

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="form-field-stack">
                <q-select
                  v-model="form.unidadeId"
                  class="form-field--required"
                  :options="opcoesUnidades"
                  label="Unidade"
                  outlined
                  emit-value
                  map-options
                  :rules="[validarUnidade]"
                  :readonly="!podeEditarCampos || camposImutaveis"
                  :disable="!podeEditarCampos || camposImutaveis"
                  @update:model-value="onUnidadeChange"
                />
                <app-form-dependencia-alerta
                  v-if="mostrarAlertaUnidades"
                  inline
                  mensagem="Nenhuma unidade cadastrada. Cadastre uma unidade antes de registrar a aplicação."
                  rotulo-acao="Cadastrar unidade"
                  :destino="{ name: 'unidades-nova' }"
                  @atualizar="recarregarDependencias"
                />
              </div>
            </div>
            <div class="col-12 col-md-6">
              <div class="form-field-stack">
                <q-select
                  v-model="form.pacienteId"
                  class="form-field--required"
                  :options="opcoesPacientes"
                  label="Paciente"
                  outlined
                  emit-value
                  map-options
                  :rules="[validarPaciente]"
                  :readonly="!podeEditarCampos || camposImutaveis"
                  :disable="!podeEditarCampos || camposImutaveis || !form.unidadeId"
                  @update:model-value="onPacienteChange"
                />
                <app-form-dependencia-alerta
                  v-if="mostrarAlertaPacientes"
                  inline
                  mensagem="Nenhum paciente nesta unidade. Cadastre um paciente para continuar."
                  rotulo-acao="Cadastrar paciente"
                  :destino="{ name: 'pacientes-novo' }"
                  @atualizar="recarregarDependencias"
                />
              </div>
            </div>
          </div>

          <div v-if="!isEdicao" class="row q-col-gutter-md">
            <div class="col-12" :class="saldoCompraSelecionada ? 'col-md-6' : 'col-md-12'">
              <div class="form-field-stack">
                <q-select
                  v-model="form.compraPacienteId"
                  :options="opcoesComprasAtivas"
                  label="Compra do pacote (opcional)"
                  outlined
                  emit-value
                  map-options
                  clearable
                  :loading="carregandoCompras"
                  :rules="[validarCompraPaciente]"
                  :readonly="!podeEditarCampos"
                  :disable="
                    !podeEditarCampos || !form.pacienteId || opcoesComprasAtivas.length === 0
                  "
                />
                <app-form-dependencia-alerta
                  v-if="mostrarAlertaCompras"
                  inline
                  mensagem="Nenhuma compra ativa para este paciente. Você pode registrar a aplicação sem pacote ou cadastrar uma compra."
                  rotulo-acao="Registrar compra"
                  :destino="
                    form.pacienteId
                      ? { name: 'pacientes-compras-nova', params: { id: form.pacienteId } }
                      : { name: 'pacientes' }
                  "
                  @atualizar="carregarComprasAtivasDoPaciente"
                />
              </div>
            </div>
            <div v-if="saldoCompraSelecionada" class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">Saldo da compra</div>
                  <div
                    v-if="saldoCompraSelecionada.produtos?.length"
                    class="q-gutter-xs"
                  >
                    <div
                      v-for="produto in saldoCompraSelecionada.produtos"
                      :key="produto.produtoId"
                      class="text-body2"
                    >
                      <strong>{{ produto.produtoNome }}:</strong>
                      {{ formatarQuantidadeProduto(produto.quantidadeRestante, produto.unidadeMedida) }}
                      restantes
                      <span class="text-caption text-grey-7">
                        (de
                        {{
                          formatarQuantidadeProduto(
                            produto.quantidadeContratada,
                            produto.unidadeMedida,
                          )
                        }})
                      </span>
                    </div>
                  </div>
                  <div v-else class="text-caption text-grey-7">
                    {{ formatarResumoSaldoProdutos(saldoCompraSelecionada) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <div v-if="aplicacaoLegadaSemProcedimento" class="q-mb-md">
            <q-input
              :model-value="aplicacaoCarregada?.produtoNome ?? '—'"
              label="Produto (registro legado)"
              outlined
              readonly
              hint="Aplicação registrada antes do fluxo por procedimento."
            />
          </div>

          <div
            v-if="!aplicacaoLegadaSemProcedimento"
            class="row q-col-gutter-md"
          >
            <div class="col-12">
              <div class="form-field-stack">
                <q-select
                  v-if="!isEdicao"
                  v-model="form.procedimentoIds"
                  class="form-field--required"
                  :options="opcoesProcedimentos"
                  label="Procedimentos"
                  outlined
                  multiple
                  use-chips
                  emit-value
                  map-options
                  :rules="[validarProcedimentos]"
                  :readonly="!podeEditarCampos || camposImutaveis"
                  :disable="!podeEditarCampos || camposImutaveis"
                />
                <q-select
                  v-else-if="procedimentosNaFormulario[0]"
                  :model-value="procedimentosNaFormulario[0].procedimentoId"
                  :options="opcoesProcedimentos"
                  label="Procedimento"
                  outlined
                  emit-value
                  map-options
                  readonly
                  disable
                />
                <app-form-dependencia-alerta
                  v-if="mostrarAlertaProcedimentos"
                  inline
                  mensagem="Nenhum procedimento cadastrado. Cadastre um kit antes de registrar a aplicação."
                  rotulo-acao="Cadastrar procedimento"
                  :destino="{ name: 'procedimentos-novo' }"
                  @atualizar="recarregarDependencias"
                />
              </div>
            </div>
          </div>

          <div
            v-if="!isEdicao && procedimentosNaFormulario.length > 0"
            class="q-gutter-md q-mb-md"
          >
            <q-card
              v-for="procedimentoItem in procedimentosNaFormulario"
              :key="procedimentoItem.procedimentoId"
              flat
              bordered
            >
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">{{ procedimentoItem.nome }}</div>

                <q-input
                  v-if="procedimentoItem.exigeQuantidade"
                  v-model.number="procedimentoItem.quantidadeUtilizada"
                  class="form-field--required q-mb-md"
                  label="Quantidade do produto aplicado"
                  outlined
                  type="number"
                  step="any"
                  min="0"
                  :rules="[() => validarQuantidadeProcedimento(procedimentoItem)]"
                  :readonly="!podeEditarCampos || camposImutaveis"
                  @update:model-value="aoAlterarQuantidadeProcedimento(procedimentoItem)"
                />

                <q-select
                  v-if="procedimentoItem.exigeLote"
                  v-model="procedimentoItem.loteProdutoId"
                  class="q-mb-md"
                  :options="opcoesLotesProcedimento(procedimentoItem)"
                  label="Lote do medicamento (opcional)"
                  outlined
                  emit-value
                  map-options
                  clearable
                  :disable="!podeEditarCampos || camposImutaveis || procedimentoItem.carregandoLotes"
                  :hint="
                    procedimentoItem.carregandoLotes
                      ? 'Carregando lotes…'
                      : opcoesLotesProcedimento(procedimentoItem).length === 0
                        ? 'Nenhum lote com saldo nesta unidade. Pode salvar sem lote por enquanto.'
                        : 'Opcional por enquanto — informe se já houver entrada com lote.'
                  "
                  :rules="[() => validarLoteProcedimento(procedimentoItem)]"
                />

                <template v-if="procedimentoItem.procedimento">
                  <div
                    v-if="procedimentoItem.procedimento.produtoAplicadoId"
                    class="q-mb-sm text-body2"
                  >
                    <span class="text-weight-medium">Produto aplicado:</span>
                    {{ procedimentoItem.procedimento.produtoAplicadoNome || '—' }}
                  </div>

                  <q-toggle
                    v-if="procedimentoItem.procedimento.itens.length > 0"
                    v-model="procedimentoItem.consumirInsumosKit"
                    class="q-mb-sm"
                    label="Usar insumos do kit"
                    color="primary"
                    :disable="!podeEditarCampos || camposImutaveis"
                    @update:model-value="aoAlterarConsumirInsumosKit(procedimentoItem)"
                  />

                  <div
                    v-if="
                      procedimentoItem.consumirInsumosKit &&
                      procedimentoItem.procedimento.itens.length > 0
                    "
                    class="q-mb-sm"
                  >
                    <div class="text-weight-medium q-mb-xs">Insumos do kit</div>
                    <q-markup-table flat bordered dense>
                      <thead>
                        <tr>
                          <th class="text-left">Produto</th>
                          <th class="text-right">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="item in procedimentoItem.procedimento.itens"
                          :key="item.produtoId"
                        >
                          <td>{{ item.produtoNome || item.produtoId }}</td>
                          <td class="text-right">{{ item.quantidade }}</td>
                        </tr>
                      </tbody>
                    </q-markup-table>
                  </div>

                  <div v-if="!procedimentoItem.consumirInsumosKit" class="q-mb-sm">
                    <div class="row items-center q-mb-sm">
                      <div class="text-weight-medium">Insumos manuais</div>
                      <q-space />
                      <q-btn
                        flat
                        color="primary"
                        icon="add"
                        label="Adicionar insumo"
                        no-caps
                        dense
                        :disable="!podeEditarCampos || camposImutaveis"
                        @click="adicionarInsumoManual(procedimentoItem)"
                      />
                    </div>

                    <div
                      v-for="(insumo, indice) in procedimentoItem.insumosManuais"
                      :key="indice"
                      class="aplicacao-insumo-manual q-mb-sm q-pa-sm"
                    >
                      <div class="row q-col-gutter-sm items-start">
                        <div class="col-12 col-md-7">
                          <q-select
                            v-model="insumo.produtoId"
                            class="form-field--required"
                            :options="opcoesInsumosManuais(procedimentoItem)"
                            label="Insumo"
                            outlined
                            dense
                            emit-value
                            map-options
                            :disable="!podeEditarCampos || camposImutaveis"
                            @update:model-value="aoAlterarInsumoManual(procedimentoItem)"
                          />
                        </div>
                        <div class="col-8 col-md-3">
                          <q-input
                            v-model.number="insumo.quantidade"
                            class="form-field--required"
                            label="Quantidade"
                            outlined
                            dense
                            type="number"
                            min="0.01"
                            step="any"
                            :readonly="!podeEditarCampos || camposImutaveis"
                            :rules="[validarQuantidadeInsumoManual]"
                            @update:model-value="aoAlterarInsumoManual(procedimentoItem)"
                          >
                            <template v-if="insumo.produtoId" #append>
                              <span class="aplicacao-insumo-manual__sigla">
                                {{ obterSiglaUnidadeMedida(insumo.produtoId) }}
                              </span>
                            </template>
                          </q-input>
                        </div>
                        <div class="col-4 col-md-2 flex flex-center">
                          <app-table-action-button
                            acao="excluir"
                            rotulo="Remover insumo"
                            :disable="!podeEditarCampos || camposImutaveis"
                            @click="removerInsumoManual(procedimentoItem, indice)"
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="procedimentoItem.insumosManuais.length === 0"
                      class="text-body2 aplicacao-insumo-manual__vazio"
                    >
                      Nenhum insumo manual. A baixa será apenas do medicamento.
                    </div>
                  </div>

                  <div v-if="procedimentoItem.saldosKit.length > 0">
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
                        <tr
                          v-for="item in procedimentoItem.saldosKit"
                          :key="item.produtoId"
                        >
                          <td>{{ item.produtoNome }}</td>
                          <td class="text-right">
                            {{ formatarSaldoComUnidade(item.quantidadeNecessaria, item.sigla) }}
                          </td>
                          <td class="text-right">
                            {{
                              item.saldoAtual !== null
                                ? formatarSaldoComUnidade(item.saldoAtual, item.sigla)
                                : '—'
                            }}
                          </td>
                        </tr>
                      </tbody>
                    </q-markup-table>
                  </div>
                </template>
              </q-card-section>
            </q-card>
          </div>

          <div
            v-if="isEdicao && exigeQuantidade && procedimentosNaFormulario[0]"
            class="row q-col-gutter-md q-mb-md"
          >
            <div class="col-12 col-md-6">
              <q-input
                :model-value="procedimentosNaFormulario[0].quantidadeUtilizada ?? undefined"
                label="Quantidade utilizada"
                outlined
                readonly
              />
            </div>
          </div>

          <q-card
            v-if="isEdicao && itensConsumidosExibicao.length > 0"
            flat
            bordered
            class="q-mb-md"
          >
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Itens consumidos</div>
              <q-markup-table flat bordered dense>
                <thead>
                  <tr>
                    <th class="text-left">Produto</th>
                    <th class="text-right">Quantidade</th>
                    <th class="text-center">Controla estoque</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in itensConsumidosExibicao" :key="item.produtoId">
                    <td>{{ item.produtoNome }}</td>
                    <td class="text-right">{{ item.quantidade }}</td>
                    <td class="text-center">
                      <q-badge
                        :color="item.controlaEstoque ? 'positive' : 'grey'"
                        :label="item.controlaEstoque ? 'Sim' : 'Não'"
                      />
                    </td>
                  </tr>
                </tbody>
              </q-markup-table>
            </q-card-section>
          </q-card>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="form-field-stack">
                <q-select
                  v-model="form.aplicadorId"
                  class="form-field--required"
                  :options="opcoesAplicadores"
                  label="Aplicador"
                  outlined
                  emit-value
                  map-options
                  :hint="hintAplicador"
                  :rules="[validarAplicador]"
                  :readonly="!podeEditarCampos || camposImutaveis"
                  :disable="!podeEditarCampos || camposImutaveis || !form.unidadeId"
                />
                <app-form-dependencia-alerta
                  v-if="mostrarAlertaAplicadores"
                  inline
                  :mensagem="mensagemAlertaAplicador"
                  :rotulo-acao="rotuloAlertaAplicador"
                  :destino="destinoAlertaAplicador"
                  @atualizar="recarregarDependencias"
                />
              </div>
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.dataAplicacao"
                class="form-field--required"
                label="Data da aplicação"
                outlined
                type="datetime-local"
                :readonly="!podeEditarCampos"
                :rules="[validarDataAplicacao]"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model.number="form.peso"
                label="Peso (kg)"
                outlined
                type="number"
                step="any"
                min="0"
                :readonly="!podeEditarCampos"
                :rules="[validarPeso]"
              />
            </div>
            <div class="col-12 col-md-6">
              <div class="form-field-stack">
                <q-select
                  v-model="form.sintomaIds"
                  :options="opcoesSintomas"
                  label="Sintomas"
                  outlined
                  multiple
                  use-chips
                  emit-value
                  map-options
                  :readonly="!podeEditarCampos"
                  :disable="!podeEditarCampos"
                />
                <app-form-dependencia-alerta
                  v-if="mostrarAlertaSintomas"
                  inline
                  mensagem="Nenhum sintoma cadastrado. Cadastre sintomas para registrar na aplicação."
                  rotulo-acao="Cadastrar sintoma"
                  :destino="{ name: 'sintomas-novo' }"
                  @atualizar="recarregarDependencias"
                />
              </div>
            </div>
          </div>

          <q-input
            v-model="form.observacao"
            label="Observações"
            outlined
            type="textarea"
            autogrow
            maxlength="2000"
            counter
            :readonly="!podeEditarCampos"
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              v-if="!somenteLeitura"
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!podeEditarCampos"
            />
            <q-btn
              v-if="isEdicao && !somenteLeitura && podeGerenciarAplicacoes && podeCancelarAplicacao"
              flat
              label="Cancelar aplicação"
              color="negative"
              no-caps
              @click="abrirDialogCancelar"
            />
            <q-btn flat label="Voltar" color="primary" no-caps @click="voltar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogCancelar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Cancelar aplicação</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja cancelar esta aplicação? O estoque será estornado.
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Voltar" color="primary" no-caps v-close-popup />
          <q-btn
            flat
            label="Cancelar aplicação"
            color="negative"
            no-caps
            :loading="cancelando"
            @click="confirmarCancelar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
.aplicacao-insumo-manual {
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);

  &__sigla {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-xs, 0.75rem);
  }

  &__vazio {
    color: var(--ds-text-secondary);
  }
}
</style>
