<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAplicador } from '@/composables/useAplicador';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { aplicacaoPacienteService } from '@/services/aplicacao-paciente.service';
import { funcionarioService } from '@/services/funcionario.service';
import { pacienteService } from '@/services/paciente.service';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import { sintomaService } from '@/services/sintoma.service';
import { unidadeService } from '@/services/unidade.service';
import type { AplicacaoPaciente } from '@/types/entidades/aplicacao-paciente';
import {
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
} from '@/types/entidades/aplicacao-paciente';
import { isAplicadorHabilitadoNaUnidade, extrairDadosVinculo } from '@/types/entidades/funcionario';
import type { Funcionario } from '@/types/entidades/funcionario';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import type { Paciente } from '@/types/entidades/paciente';
import type { Produto } from '@/types/entidades/produto';
import type { Sintoma } from '@/types/entidades/sintoma';
import type { Unidade } from '@/types/entidades/unidade';
import { normalizarLista } from '@/utils/normalizar-lista';

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
const funcionariosDisponiveis = ref<Funcionario[]>([]);
const sintomasDisponiveis = ref<Sintoma[]>([]);
const saldoDisponivel = ref<number | null>(null);
const siglaSaldo = ref('');
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
  produtoId: null as string | null,
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

const opcoesProdutos = computed(() =>
  produtosDisponiveis.value
    .filter((produto) => produto.ativo)
    .map((produto) => ({
      label: produto.nome,
      value: produto.id,
    })),
);

const produtosPorId = computed(
  () => new Map(produtosDisponiveis.value.map((produto) => [produto.id, produto])),
);

const aplicadoresFiltrados = computed(() => {
  if (!unidadeIdSelecionada.value) {
    return [];
  }

  return funcionariosDisponiveis.value.filter((funcionario) =>
    isAplicadorHabilitadoNaUnidade(funcionario, unidadeIdSelecionada.value!),
  );
});

const opcoesAplicadores = computed(() =>
  aplicadoresFiltrados.value
    .filter((funcionario) => funcionario.ativo)
    .map((funcionario) => ({
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

const mostrarAlertaProdutos = computed(
  () => dadosIniciaisCarregados.value && produtosDisponiveis.value.length === 0,
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
  if (!form.produtoId) {
    return undefined;
  }

  const sigla = produtosPorId.value.get(form.produtoId)?.unidadeMedidaSigla ?? '';

  return sigla ? `Unidade de medida: ${sigla}` : undefined;
});

const captionSaldo = computed(() => {
  if (saldoDisponivel.value === null || !siglaSaldo.value) {
    return undefined;
  }

  return `Saldo disponível: ${formatarSaldoComUnidade(saldoDisponivel.value, siglaSaldo.value)}`;
});

const temAplicadoresNaEmpresa = computed(() =>
  funcionariosDisponiveis.value.some(
    (funcionario) => funcionario.ativo && extrairDadosVinculo(funcionario).flagAplicador,
  ),
);

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

function validarProduto(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o produto';
}

function validarAplicador(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o aplicador';
}

function validarQuantidade(value: number | null): boolean | string {
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

async function carregarSaldo(): Promise<void> {
  if (!form.unidadeId || !form.produtoId) {
    saldoDisponivel.value = null;
    siglaSaldo.value = '';
    return;
  }

  try {
    const saldos = await saldoEstoqueService.listar({
      unidadeId: form.unidadeId,
      produtoId: form.produtoId,
    });

    const saldo = saldos[0];

    if (saldo) {
      saldoDisponivel.value = saldo.saldoAtual;
      siglaSaldo.value = saldo.unidadeMedidaSigla;
    } else {
      saldoDisponivel.value = 0;
      siglaSaldo.value =
        produtosPorId.value.get(form.produtoId)?.unidadeMedidaSigla ?? '';
    }
  } catch {
    saldoDisponivel.value = null;
    siglaSaldo.value = '';
  }
}

async function onUnidadeChange(): Promise<void> {
  if (!camposImutaveis.value) {
    form.pacienteId = null;

    if (!aplicadoresFiltrados.value.some((f) => f.id === form.aplicadorId)) {
      form.aplicadorId = null;
    }
  }

  await carregarPacientesDaUnidade();
  await carregarSaldo();
}

async function garantirPacienteNaLista(pacienteId: string): Promise<void> {
  if (pacientesDisponiveis.value.some((p) => p.id === pacienteId)) {
    return;
  }

  const paciente = await pacienteService.obter(pacienteId);
  pacientesDisponiveis.value = [paciente, ...pacientesDisponiveis.value];
}

async function garantirProdutoNaLista(produtoId: string): Promise<void> {
  if (produtosDisponiveis.value.some((p) => p.id === produtoId)) {
    return;
  }

  const produto = await produtoService.obter(produtoId);
  produtosDisponiveis.value = [produto, ...produtosDisponiveis.value];
}

async function garantirAplicadorNaLista(aplicadorId: string): Promise<void> {
  if (funcionariosDisponiveis.value.some((f) => f.id === aplicadorId)) {
    return;
  }

  const funcionario = await funcionarioService.obter(aplicadorId);
  funcionariosDisponiveis.value = [funcionario, ...funcionariosDisponiveis.value];
}

async function carregarDadosIniciais(): Promise<void> {
  try {
    const [listaUnidades, listaProdutos, listaFuncionarios, listaSintomas] =
      await Promise.all([
        unidadeService.listar(),
        produtoService.listar(),
        funcionarioService.listar(),
        sintomaService.listar(),
      ]);

    unidadesDisponiveis.value = normalizarLista(listaUnidades);
    produtosDisponiveis.value = normalizarLista(listaProdutos);
    funcionariosDisponiveis.value = normalizarLista(listaFuncionarios);
    sintomasDisponiveis.value = normalizarLista(listaSintomas);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function recarregarDependencias(): Promise<void> {
  await carregarDadosIniciais();

  if (form.unidadeId) {
    await carregarPacientesDaUnidade();
  }

  await carregarSaldo();
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
    form.produtoId = aplicacao.produtoId;
    form.aplicadorId = aplicacao.aplicadorId;
    form.quantidadeUtilizada = aplicacao.quantidadeUtilizada;
    form.dataAplicacao = deIsoParaInputDatetimeLocal(aplicacao.dataAplicacao);
    form.peso = aplicacao.peso;
    form.sintomaIds = aplicacao.sintomas.map((s) => s.id);
    form.observacao = aplicacao.observacao ?? '';

    await Promise.all([
      garantirPacienteNaLista(aplicacao.pacienteId),
      garantirProdutoNaLista(aplicacao.produtoId),
      garantirAplicadorNaLista(aplicacao.aplicadorId),
    ]);

    await carregarPacientesDaUnidade();
    await carregarSaldo();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'aplicacoes-paciente' });
  } finally {
    carregando.value = false;
  }
}

function montarPayloadCriacao() {
  return {
    pacienteId: form.pacienteId!,
    produtoId: form.produtoId!,
    aplicadorId: form.aplicadorId!,
    unidadeId: form.unidadeId!,
    quantidadeUtilizada: form.quantidadeUtilizada!,
    dataAplicacao: deInputDatetimeLocalParaIso(form.dataAplicacao),
    peso: form.peso,
    observacao: form.observacao.trim() || null,
    sintomaIds: form.sintomaIds.length > 0 ? form.sintomaIds : null,
    compraPacienteId: null,
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
  () => form.produtoId,
  () => {
    void carregarSaldo();
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
            : 'Registre uma aplicação realizada em paciente.'
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

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="form-field-stack">
                <q-select
                  v-model="form.produtoId"
                  class="form-field--required"
                  :options="opcoesProdutos"
                  label="Produto"
                  outlined
                  emit-value
                  map-options
                  :rules="[validarProduto]"
                  :readonly="!podeEditarCampos || camposImutaveis"
                  :disable="!podeEditarCampos || camposImutaveis"
                />
                <app-form-dependencia-alerta
                  v-if="mostrarAlertaProdutos"
                  inline
                  mensagem="Nenhum produto cadastrado. Cadastre um produto para registrar a aplicação."
                  rotulo-acao="Cadastrar produto"
                  :destino="{ name: 'produtos-novo' }"
                  @atualizar="recarregarDependencias"
                />
              </div>
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model.number="form.quantidadeUtilizada"
                class="form-field--required"
                label="Quantidade utilizada"
                outlined
                type="number"
                step="any"
                min="0"
                :hint="hintQuantidade"
                :caption="captionSaldo"
                :rules="[validarQuantidade]"
                :readonly="!podeEditarCampos || camposImutaveis"
              />
            </div>
          </div>

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
