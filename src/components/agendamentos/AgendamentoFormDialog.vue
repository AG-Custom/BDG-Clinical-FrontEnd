<script setup lang="ts">
import { computed, reactive, ref, toRef, watch } from 'vue';

import PacienteFormDialog from '@/components/pacientes/PacienteFormDialog.vue';
import { permissoes } from '@/constants/permissoes';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { agendamentoService } from '@/services/agendamento.service';
import { funcionarioService } from '@/services/funcionario.service';
import { pacienteService } from '@/services/paciente.service';
import { procedimentoService } from '@/services/procedimento.service';
import { unidadeService } from '@/services/unidade.service';
import type { Agendamento, TipoAgendamento } from '@/types/entidades/agendamento';
import {
  TIPOS_AGENDAMENTO,
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
  obterLabelTipoAgendamento,
  obterProcedimentosDoAgendamento,
} from '@/types/entidades/agendamento';
import type { Funcionario } from '@/types/entidades/funcionario';
import type { Paciente } from '@/types/entidades/paciente';
import type { Procedimento } from '@/types/entidades/procedimento';
import type { Unidade } from '@/types/entidades/unidade';
import { normalizarLista } from '@/utils/normalizar-lista';

const props = defineProps<{
  modelValue: boolean;
  agendamento?: Agendamento | null;
  intervaloInicial?: { inicio: Date; fim: Date } | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
  salvo: [];
}>();

const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriarPaciente = usePermissao(permissoes.pacientes.criar);

const carregandoDados = ref(false);
const salvando = ref(false);
const dialogPaciente = ref(false);
const unidadesDisponiveis = ref<Unidade[]>([]);
const pacientesDisponiveis = ref<Paciente[]>([]);
const procedimentosDisponiveis = ref<Procedimento[]>([]);
const funcionariosDisponiveis = ref<Funcionario[]>([]);
const dadosIniciaisCarregados = ref(false);

const isEdicao = computed(() => Boolean(props.agendamento?.id));

const form = reactive({
  unidadeId: null as string | null,
  pacienteId: null as string | null,
  funcionarioId: null as string | null,
  tipo: 'Consulta' as TipoAgendamento,
  dataInicio: '',
  dataFim: '',
  procedimentoIds: [] as string[],
  observacao: '',
});

const unidadeIdSelecionada = toRef(form, 'unidadeId');

const opcoesUnidades = computed(() =>
  unidadesDisponiveis.value
    .filter((unidade) => unidade.ativo)
    .map((unidade) => ({ label: unidade.nome, value: unidade.id })),
);

const opcoesPacientes = computed(() =>
  pacientesDisponiveis.value
    .filter((paciente) => paciente.ativo)
    .map((paciente) => ({ label: paciente.nome, value: paciente.id })),
);

const opcoesProcedimentos = computed(() =>
  procedimentosDisponiveis.value
    .filter((procedimento) => procedimento.ativo)
    .map((procedimento) => ({ label: procedimento.nome, value: procedimento.id })),
);

const opcoesFuncionarios = computed(() =>
  funcionariosDisponiveis.value
    .filter((funcionario) => funcionario.ativo)
    .map((funcionario) => ({ label: funcionario.nome, value: funcionario.id })),
);

const opcoesTipos = computed(() =>
  TIPOS_AGENDAMENTO.map((tipo) => ({
    label: obterLabelTipoAgendamento(tipo),
    value: tipo,
  })),
);

const exigeProcedimento = computed(() => form.tipo === 'Aplicacao');

const mostrarAlertaProcedimentos = computed(
  () =>
    exigeProcedimento.value &&
    dadosIniciaisCarregados.value &&
    !carregandoDados.value &&
    opcoesProcedimentos.value.length === 0,
);

const mostrarBoxNovoPaciente = computed(
  () => props.modelValue && Boolean(form.unidadeId) && podeCriarPaciente.value,
);

const tituloDialog = computed(() =>
  isEdicao.value ? 'Editar agendamento' : 'Novo agendamento',
);

function formatarDatetimeLocal(data: Date): string {
  const pad = (valor: number) => String(valor).padStart(2, '0');

  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function preencherFormulario(): void {
  if (props.agendamento) {
    form.unidadeId = props.agendamento.unidadeId;
    form.pacienteId = props.agendamento.pacienteId;
    form.funcionarioId = props.agendamento.funcionarioId;
    form.tipo = props.agendamento.tipo;
    form.dataInicio = deIsoParaInputDatetimeLocal(props.agendamento.dataInicio);
    form.dataFim = deIsoParaInputDatetimeLocal(props.agendamento.dataFim);
    form.procedimentoIds = obterProcedimentosDoAgendamento(props.agendamento).map(
      (procedimento) => procedimento.id,
    );
    form.observacao = props.agendamento.observacao ?? '';
    return;
  }

  form.unidadeId = null;
  form.pacienteId = null;
  form.funcionarioId = null;
  form.tipo = 'Consulta';
  form.procedimentoIds = [];
  form.observacao = '';

  if (props.intervaloInicial) {
    form.dataInicio = formatarDatetimeLocal(props.intervaloInicial.inicio);
    form.dataFim = formatarDatetimeLocal(props.intervaloInicial.fim);
  } else {
    const agora = new Date();
    const fim = new Date(agora.getTime() + 30 * 60 * 1000);
    form.dataInicio = formatarDatetimeLocal(agora);
    form.dataFim = formatarDatetimeLocal(fim);
  }
}

async function carregarPacientesDaUnidade(): Promise<void> {
  if (!form.unidadeId) {
    pacientesDisponiveis.value = [];
    return;
  }

  try {
    pacientesDisponiveis.value = normalizarLista(
      await pacienteService.listar({ unidadeId: form.unidadeId }),
    );
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  }
}

async function garantirPacienteNaLista(pacienteId: string): Promise<void> {
  if (pacientesDisponiveis.value.some((paciente) => paciente.id === pacienteId)) {
    return;
  }

  const paciente = await pacienteService.obter(pacienteId);
  pacientesDisponiveis.value = [paciente, ...pacientesDisponiveis.value];
}

async function carregarFuncionariosDaUnidade(): Promise<void> {
  if (!form.unidadeId) {
    funcionariosDisponiveis.value = [];
    return;
  }

  try {
    funcionariosDisponiveis.value = normalizarLista(
      await funcionarioService.listar({ unidadeId: form.unidadeId }),
    );
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  }
}

async function garantirFuncionarioNaLista(funcionarioId: string): Promise<void> {
  if (funcionariosDisponiveis.value.some((funcionario) => funcionario.id === funcionarioId)) {
    return;
  }

  const funcionario = await funcionarioService.obter(funcionarioId);
  funcionariosDisponiveis.value = [funcionario, ...funcionariosDisponiveis.value];
}

async function carregarDependencias(): Promise<void> {
  carregandoDados.value = true;

  try {
    const [unidades, procedimentos] = await Promise.all([
      unidadeService.listar(),
      procedimentoService.listar(),
    ]);

    unidadesDisponiveis.value = normalizarLista(unidades);
    procedimentosDisponiveis.value = normalizarLista(procedimentos);
    dadosIniciaisCarregados.value = true;

    if (form.unidadeId) {
      await Promise.all([carregarPacientesDaUnidade(), carregarFuncionariosDaUnidade()]);
    }
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    carregandoDados.value = false;
  }
}

async function recarregarProcedimentos(): Promise<void> {
  try {
    procedimentosDisponiveis.value = normalizarLista(await procedimentoService.listar());
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  }
}

function fechar(): void {
  dialogPaciente.value = false;
  emit('update:modelValue', false);
}

function abrirCadastroPaciente(): void {
  if (!form.unidadeId) {
    return;
  }

  dialogPaciente.value = true;
}

function aoPacienteCriado(paciente: Paciente): void {
  if (!pacientesDisponiveis.value.some((item) => item.id === paciente.id)) {
    pacientesDisponiveis.value = [paciente, ...pacientesDisponiveis.value];
  }

  form.pacienteId = paciente.id;
}

function montarPayload() {
  return {
    unidadeId: form.unidadeId!,
    pacienteId: form.pacienteId!,
    funcionarioId: form.funcionarioId!,
    tipo: form.tipo,
    dataInicio: deInputDatetimeLocalParaIso(form.dataInicio),
    dataFim: deInputDatetimeLocalParaIso(form.dataFim),
    procedimentoIds: exigeProcedimento.value ? form.procedimentoIds : null,
    observacao: form.observacao.trim() || null,
  };
}

async function salvar(): Promise<void> {
  if (
    !form.unidadeId ||
    !form.pacienteId ||
    !form.funcionarioId ||
    !form.dataInicio ||
    !form.dataFim
  ) {
    notificacao.info('Preencha todos os campos obrigatórios.');
    return;
  }

  if (exigeProcedimento.value && form.procedimentoIds.length === 0) {
    notificacao.info('Selecione ao menos um procedimento para agendamentos de aplicação.');
    return;
  }

  salvando.value = true;

  try {
    const payload = montarPayload();

    if (isEdicao.value && props.agendamento) {
      await agendamentoService.atualizar(props.agendamento.id, payload);
      notificacao.sucesso('Agendamento atualizado.');
    } else {
      await agendamentoService.criar(payload);
      notificacao.sucesso('Agendamento criado.');
    }

    emit('salvo');
    fechar();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    salvando.value = false;
  }
}

watch(
  () => props.modelValue,
  async (aberto) => {
    if (!aberto) {
      dialogPaciente.value = false;
      return;
    }

    preencherFormulario();

    if (!dadosIniciaisCarregados.value) {
      await carregarDependencias();
    } else if (form.unidadeId) {
      await Promise.all([carregarPacientesDaUnidade(), carregarFuncionariosDaUnidade()]);
    } else {
      pacientesDisponiveis.value = [];
      funcionariosDisponiveis.value = [];
    }

    if (props.agendamento?.pacienteId) {
      await garantirPacienteNaLista(props.agendamento.pacienteId);
    }

    if (props.agendamento?.funcionarioId) {
      await garantirFuncionarioNaLista(props.agendamento.funcionarioId);
    }
  },
);

watch(unidadeIdSelecionada, async (novaUnidade, unidadeAnterior) => {
  if (unidadeAnterior && novaUnidade !== unidadeAnterior) {
    form.funcionarioId = null;
    form.pacienteId = null;
  }

  if (dadosIniciaisCarregados.value) {
    await Promise.all([carregarPacientesDaUnidade(), carregarFuncionariosDaUnidade()]);
  }
});

watch(
  () => form.tipo,
  (novoTipo) => {
    if (novoTipo !== 'Aplicacao') {
      form.procedimentoIds = [];
    }
  },
);
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="agendamento-form-dialog" style="width: 560px; max-width: 95vw">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ tituloDialog }}</div>
        <q-space />
        <q-btn flat round dense icon="close" aria-label="Fechar" @click="fechar" />
      </q-card-section>

      <q-card-section>
        <q-form class="form-stack" @submit.prevent="salvar">
          <q-select
            v-model="form.unidadeId"
            :options="opcoesUnidades"
            label="Unidade *"
            outlined
            emit-value
            map-options
            :loading="carregandoDados"
            :disable="salvando"
            :rules="[(v) => Boolean(v) || 'Obrigatório']"
          />

          <div class="form-field-stack">
            <q-select
              v-model="form.pacienteId"
              :options="opcoesPacientes"
              label="Paciente *"
              outlined
              emit-value
              map-options
              use-input
              input-debounce="200"
              :loading="carregandoDados"
              :disable="salvando || !form.unidadeId"
              :rules="[(v) => Boolean(v) || 'Obrigatório']"
            />

            <div v-if="mostrarBoxNovoPaciente" class="agendamento-form-dialog__box-paciente">
              <p class="agendamento-form-dialog__box-paciente-texto">
                Deseja cadastrar um novo paciente?
              </p>
              <q-btn
                flat
                dense
                no-caps
                color="primary"
                label="Cadastrar paciente"
                icon="person_add"
                :disable="salvando"
                @click="abrirCadastroPaciente"
              />
            </div>
          </div>

          <q-select
            v-model="form.funcionarioId"
            :options="opcoesFuncionarios"
            label="Profissional *"
            outlined
            emit-value
            map-options
            :loading="carregandoDados"
            :disable="salvando || !form.unidadeId"
            :rules="[(v) => Boolean(v) || 'Obrigatório']"
          />

          <q-select
            v-model="form.tipo"
            :options="opcoesTipos"
            label="Tipo *"
            outlined
            emit-value
            map-options
            :disable="salvando"
          />

          <div v-if="exigeProcedimento" class="form-field-stack">
            <q-select
              v-model="form.procedimentoIds"
              :options="opcoesProcedimentos"
              label="Procedimentos *"
              outlined
              multiple
              use-chips
              emit-value
              map-options
              :loading="carregandoDados"
              :disable="salvando || opcoesProcedimentos.length === 0"
              :rules="[(v) => (Array.isArray(v) && v.length > 0) || 'Obrigatório para aplicação']"
            />
            <app-form-dependencia-alerta
              v-if="mostrarAlertaProcedimentos"
              inline
              mensagem="Nenhum procedimento cadastrado. Cadastre um procedimento antes de agendar uma aplicação."
              rotulo-acao="Cadastrar procedimento"
              :destino="{ name: 'procedimentos-novo' }"
              @atualizar="recarregarProcedimentos"
            />
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.dataInicio"
                type="datetime-local"
                label="Início *"
                outlined
                :disable="salvando"
                :rules="[(v) => Boolean(v) || 'Obrigatório']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.dataFim"
                type="datetime-local"
                label="Fim *"
                outlined
                :disable="salvando"
                :rules="[(v) => Boolean(v) || 'Obrigatório']"
              />
            </div>
          </div>

          <q-input
            v-model="form.observacao"
            label="Observação"
            type="textarea"
            outlined
            autogrow
            :disable="salvando"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" color="primary" no-caps :disable="salvando" @click="fechar" />
        <q-btn
          unelevated
          label="Salvar"
          color="primary"
          no-caps
          :loading="salvando"
          :disable="exigeProcedimento && opcoesProcedimentos.length === 0"
          @click="salvar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <paciente-form-dialog
    v-model="dialogPaciente"
    :unidade-id="form.unidadeId"
    @criado="aoPacienteCriado"
  />
</template>

<style scoped lang="scss">
.agendamento-form-dialog {
  max-height: 90vh;
  overflow-y: auto;

  &__box-paciente {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ds-space-2);
    margin-top: var(--ds-space-2);
    padding: var(--ds-space-3);
    border: 1px solid var(--ds-border-default);
    border-radius: var(--ds-radius-md);
    background: var(--ds-bg-subtle);
  }

  &__box-paciente-texto {
    margin: 0;
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
    line-height: var(--ds-line-height-normal);
  }
}
</style>
