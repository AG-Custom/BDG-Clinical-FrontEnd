<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAplicador } from '@/composables/useAplicador';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { aplicacaoPacienteService } from '@/services/aplicacao-paciente.service';
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
import { extrairDadosVinculo } from '@/types/entidades/funcionario';
import type { Funcionario } from '@/types/entidades/funcionario';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import type { Paciente } from '@/types/entidades/paciente';
import type { Procedimento } from '@/types/entidades/procedimento';
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

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { podeGerenciarAplicacoes } = useAplicador();

const carregando = ref(false);
const salvando = ref(false);
const cancelando = ref(false);
const dialogCancelar = ref(false);
const aplicacaoCarregada = ref<AplicacaoPaciente | null>(null);
const unidadesDisponiveis = ref<Unidade[]>([]);
const pacientesDisponiveis = ref<Paciente[]>([]);
const produtosDisponiveis = ref<Produto[]>([]);
const procedimentosDisponiveis = ref<Procedimento[]>([]);
const procedimentoSelecionado = ref<Procedimento | null>(null);
const saldosKit = ref<SaldoKitItem[]>([]);
const aplicadoresDisponiveis = ref<Funcionario[]>([]);
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
  procedimentoId: null as string | null,
  aplicadorId: null as string | null,
  quantidadeUtilizada: null as number | null,
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
  () => podeGerenciarAplicacoes.value && !somenteLeitura.value,
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

const procedimentoTemProdutoAplicado = computed(
  () => Boolean(procedimentoSelecionado.value?.produtoAplicadoId),
);

const exigeQuantidade = computed(() => {
  if (isEdicao.value) {
    return aplicacaoCarregada.value?.quantidadeUtilizada !== null;
  }

  return procedimentoTemProdutoAplicado.value;
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

const hintQuantidade = computed(() => {
  if (!exigeQuantidade.value || !procedimentoSelecionado.value?.produtoAplicadoId) {
    return undefined;
  }

  const sigla =
    produtosPorId.value.get(procedimentoSelecionado.value.produtoAplicadoId)?.unidadeMedidaSigla ??
    '';

  return sigla ? `Unidade de medida: ${sigla}` : undefined;
});

const temAplicadoresNaEmpresa = computed(() => existemAplicadoresNaEmpresa.value);

const mensagemAlertaAplicador = computed(() =>
  temAplicadoresNaEmpresa.value
    ? 'Nenhum aplicador vinculado a esta unidade. Vincule um colaborador existente ou cadastre um novo com permissão de aplicação.'
    : 'Nenhum aplicador cadastrado. Cadastre um colaborador e marque a opção "Pode realizar aplicações".',
);

const rotuloAlertaAplicador = computed(() =>
  temAplicadoresNaEmpresa.value ? 'Gerenciar colaboradores' : 'Cadastrar colaborador',
);

const destinoAlertaAplicador = computed(() =>
  temAplicadoresNaEmpresa.value ? { name: 'funcionarios' } : { name: 'funcionarios-novo' },
);

function validarUnidade(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione a unidade';
}

function validarPaciente(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o paciente';
}

function validarProcedimento(value: string | null): boolean | string {
  if (isEdicao.value) {
    return true;
  }

  return Boolean(value) || 'Selecione o procedimento';
}

function validarAplicador(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o aplicador';
}

function validarQuantidade(value: number | null): boolean | string {
  if (!exigeQuantidade.value) {
    return true;
  }

  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Informe a quantidade utilizada';
  }

  if (value <= 0) {
    return 'A quantidade deve ser maior que zero';
  }

  return true;
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

async function carregarProcedimentoDetalhe(): Promise<void> {
  if (!form.procedimentoId) {
    procedimentoSelecionado.value = null;
    saldosKit.value = [];
    return;
  }

  try {
    const procedimento = await procedimentoService.obter(form.procedimentoId);
    procedimentoSelecionado.value = procedimento;

    if (!procedimento.produtoAplicadoId) {
      form.quantidadeUtilizada = null;
    }

    await carregarSaldosKit();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    procedimentoSelecionado.value = null;
    saldosKit.value = [];
  }
}

async function carregarSaldosKit(): Promise<void> {
  if (!form.unidadeId || !procedimentoSelecionado.value) {
    saldosKit.value = [];
    return;
  }

  const procedimento = procedimentoSelecionado.value;
  const produtosKit: { produtoId: string; produtoNome: string; quantidade: number }[] = [];

  if (procedimento.produtoAplicadoId) {
    produtosKit.push({
      produtoId: procedimento.produtoAplicadoId,
      produtoNome: procedimento.produtoAplicadoNome ?? 'Produto aplicado',
      quantidade: form.quantidadeUtilizada ?? 0,
    });
  }

  for (const item of procedimento.itens) {
    produtosKit.push({
      produtoId: item.produtoId,
      produtoNome: item.produtoNome ?? 'Insumo',
      quantidade: item.quantidade,
    });
  }

  const itensComEstoque = produtosKit.filter((item) => {
    const produto = produtosPorId.value.get(item.produtoId);
    return produto?.controlaEstoque !== false;
  });

  if (itensComEstoque.length === 0) {
    saldosKit.value = [];
    return;
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

    saldosKit.value = resultados;
  } catch {
    saldosKit.value = [];
  }
}

async function carregarAplicadoresDaUnidade(): Promise<void> {
  if (!form.unidadeId) {
    aplicadoresDisponiveis.value = [];
    return;
  }

  try {
    const funcionarios = await funcionarioService.listar({ unidadeId: form.unidadeId });
    aplicadoresDisponiveis.value = normalizarLista(funcionarios).filter(
      (funcionario) => funcionario.ativo && extrairDadosVinculo(funcionario).flagAplicador,
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

    if (!aplicadoresDisponiveis.value.some((funcionario) => funcionario.id === form.aplicadorId)) {
      form.aplicadorId = null;
    }
  }

  await carregarSaldosKit();
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
    const [listaUnidades, listaProdutos, listaProcedimentos, listaFuncionariosEmpresa, listaSintomas] =
      await Promise.all([
        unidadeService.listar(),
        produtoService.listar(),
        procedimentoService.listar(),
        funcionarioService.listar(),
        sintomaService.listar(),
      ]);

    unidadesDisponiveis.value = normalizarLista(listaUnidades);
    produtosDisponiveis.value = normalizarLista(listaProdutos);
    procedimentosDisponiveis.value = normalizarLista(listaProcedimentos);
    sintomasDisponiveis.value = normalizarLista(listaSintomas);
    existemAplicadoresNaEmpresa.value = normalizarLista(listaFuncionariosEmpresa).some(
      (funcionario) => funcionario.ativo && extrairDadosVinculo(funcionario).flagAplicador,
    );
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function recarregarDependencias(): Promise<void> {
  await carregarDadosIniciais();

  if (form.unidadeId) {
    await Promise.all([carregarPacientesDaUnidade(), carregarAplicadoresDaUnidade()]);
  }

  await carregarProcedimentoDetalhe();
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
    form.procedimentoId = aplicacao.procedimentoId;
    form.aplicadorId = aplicacao.aplicadorId;
    form.quantidadeUtilizada = aplicacao.quantidadeUtilizada;
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

    if (aplicacao.procedimentoId) {
      await carregarProcedimentoDetalhe();
    }

    await Promise.all([carregarPacientesDaUnidade(), carregarAplicadoresDaUnidade()]);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'aplicacoes-paciente' });
  } finally {
    carregando.value = false;
  }
}

function montarPayloadCriacao() {
  const base = {
    pacienteId: form.pacienteId!,
    procedimentoId: form.procedimentoId!,
    aplicadorId: form.aplicadorId!,
    unidadeId: form.unidadeId!,
    dataAplicacao: deInputDatetimeLocalParaIso(form.dataAplicacao),
    peso: form.peso,
    observacao: form.observacao.trim() || null,
    sintomaIds: form.sintomaIds.length > 0 ? form.sintomaIds : null,
    compraPacienteId: null,
  };

  if (exigeQuantidade.value && form.quantidadeUtilizada !== null) {
    return {
      ...base,
      quantidadeUtilizada: form.quantidadeUtilizada,
    };
  }

  return base;
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
  salvando.value = true;

  try {
    if (isEdicao.value && aplicacaoId.value) {
      await aplicacaoPacienteService.atualizar(aplicacaoId.value, montarPayloadAtualizacao());
      notificacao.sucesso('Aplicação atualizada com sucesso.');
    } else {
      await aplicacaoPacienteService.criar(montarPayloadCriacao());
      notificacao.sucesso('Aplicação registrada com sucesso.');
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
  () => form.procedimentoId,
  () => {
    void carregarProcedimentoDetalhe();
  },
);

watch(
  () => form.quantidadeUtilizada,
  () => {
    void carregarSaldosKit();
  },
);

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
            : 'Registre uma aplicação selecionando o procedimento realizado.'
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
            <div class="col-12" :class="exigeQuantidade && !isEdicao ? 'col-md-6' : 'col-md-12'">
              <div class="form-field-stack">
                <q-select
                  v-model="form.procedimentoId"
                  class="form-field--required"
                  :options="opcoesProcedimentos"
                  label="Procedimento"
                  outlined
                  emit-value
                  map-options
                  :rules="[validarProcedimento]"
                  :readonly="!podeEditarCampos || camposImutaveis"
                  :disable="!podeEditarCampos || camposImutaveis || isEdicao"
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
            <div v-if="exigeQuantidade && !isEdicao" class="col-12 col-md-6">
              <q-input
                v-model.number="form.quantidadeUtilizada"
                class="form-field--required"
                label="Quantidade do produto aplicado"
                outlined
                type="number"
                step="any"
                min="0"
                :hint="hintQuantidade"
                :rules="[validarQuantidade]"
                :readonly="!podeEditarCampos || camposImutaveis"
              />
            </div>
            <div v-if="isEdicao && exigeQuantidade" class="col-12 col-md-6">
              <q-input
                :model-value="form.quantidadeUtilizada ?? undefined"
                label="Quantidade utilizada"
                outlined
                readonly
              />
            </div>
          </div>

          <q-card
            v-if="!isEdicao && procedimentoSelecionado"
            flat
            bordered
            class="q-mb-md"
          >
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Preview do kit</div>

              <div v-if="procedimentoSelecionado.produtoAplicadoId" class="q-mb-sm">
                <span class="text-weight-medium">Produto aplicado:</span>
                {{ procedimentoSelecionado.produtoAplicadoNome || '—' }}
              </div>

              <div v-if="procedimentoSelecionado.itens.length > 0" class="q-mb-sm">
                <div class="text-weight-medium q-mb-xs">Insumos</div>
                <q-markup-table flat bordered dense>
                  <thead>
                    <tr>
                      <th class="text-left">Produto</th>
                      <th class="text-right">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in procedimentoSelecionado.itens" :key="item.produtoId">
                      <td>{{ item.produtoNome || item.produtoId }}</td>
                      <td class="text-right">{{ item.quantidade }}</td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </div>

              <div v-if="saldosKit.length > 0">
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
                    <tr v-for="item in saldosKit" :key="item.produtoId">
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
            </q-card-section>
          </q-card>

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
              v-if="isEdicao && !somenteLeitura && podeGerenciarAplicacoes"
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
