<script setup lang="ts">
import { computed, reactive, ref, toRef, watch } from 'vue';

import TagAgendamentoFormDialog from '@/components/agendamentos/TagAgendamentoFormDialog.vue';
import PacienteFormDialog from '@/components/pacientes/PacienteFormDialog.vue';
import AppDateInput from '@/components/shared/AppDateInput.vue';
import { permissoes } from '@/constants/permissoes';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { agendamentoService } from '@/services/agendamento.service';
import { funcionarioService } from '@/services/funcionario.service';
import { pacienteService } from '@/services/paciente.service';
import { tagAgendamentoService } from '@/services/tag-agendamento.service';
import { unidadeService } from '@/services/unidade.service';
import type { Agendamento, TipoAgendamento } from '@/types/entidades/agendamento';
import {
  TIPOS_AGENDAMENTO,
  deInputDatetimeLocalParaIso,
  deIsoParaInputDatetimeLocal,
  obterLabelTipoAgendamento,
} from '@/types/entidades/agendamento';
import type { Funcionario } from '@/types/entidades/funcionario';
import type { Paciente } from '@/types/entidades/paciente';
import type { TagAgendamento } from '@/types/entidades/tag-agendamento';
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
const podeCriarTag = usePermissao(permissoes.tagsAgendamento.criar);
const podeEditarTag = usePermissao(permissoes.tagsAgendamento.editar);

const salvando = ref(false);
const painel = ref<'agendamento' | 'tag' | 'paciente'>('agendamento');
const tagEmEdicao = ref<TagAgendamento | null>(null);
const selectTags = ref<{ hidePopup?: () => void } | null>(null);
const unidadesDisponiveis = ref<Unidade[]>([]);
const pacientesDisponiveis = ref<Paciente[]>([]);
const funcionariosDisponiveis = ref<Funcionario[]>([]);
const tagsDisponiveis = ref<TagAgendamento[]>([]);
const dadosIniciaisCarregados = ref(false);
const unidadeListasId = ref<string | null>(null);

let ignorarMudancaUnidade = false;

const isEdicao = computed(() => Boolean(props.agendamento?.id));

const form = reactive({
  unidadeId: null as string | null,
  pacienteId: null as string | null,
  funcionarioId: null as string | null,
  tipo: 'Consulta' as TipoAgendamento,
  data: '',
  horaInicio: '',
  horaFim: '',
  observacao: '',
  tagIds: [] as string[],
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

const opcoesPacientesFiltradas = ref<{ label: string; value: string }[]>([]);

watch(
  opcoesPacientes,
  (lista) => {
    opcoesPacientesFiltradas.value = lista;
  },
  { immediate: true },
);

const opcoesFuncionarios = computed(() =>
  funcionariosDisponiveis.value
    .filter((funcionario) => funcionario.ativo)
    .map((funcionario) => ({ label: funcionario.nome, value: funcionario.id })),
);

const opcoesFuncionariosFiltradas = ref<{ label: string; value: string }[]>([]);

watch(
  opcoesFuncionarios,
  (lista) => {
    opcoesFuncionariosFiltradas.value = lista;
  },
  { immediate: true },
);

function filtrarPacientes(val: string, update: (callback: () => void) => void): void {
  update(() => {
    const termo = val.trim().toLowerCase();
    if (!termo) {
      opcoesPacientesFiltradas.value = opcoesPacientes.value;
      return;
    }

    opcoesPacientesFiltradas.value = opcoesPacientes.value.filter((opcao) =>
      opcao.label.toLowerCase().includes(termo),
    );
  });
}

function filtrarFuncionarios(val: string, update: (callback: () => void) => void): void {
  update(() => {
    const termo = val.trim().toLowerCase();
    if (!termo) {
      opcoesFuncionariosFiltradas.value = opcoesFuncionarios.value;
      return;
    }

    opcoesFuncionariosFiltradas.value = opcoesFuncionarios.value.filter((opcao) =>
      opcao.label.toLowerCase().includes(termo),
    );
  });
}

const opcoesTipos = computed(() =>
  TIPOS_AGENDAMENTO.map((tipo) => ({
    label: obterLabelTipoAgendamento(tipo),
    value: tipo,
  })),
);

const opcoesTags = computed(() =>
  tagsDisponiveis.value.map((tag) => ({
    label: tag.nome,
    value: tag.id,
    cor: tag.cor,
  })),
);

const opcoesTagsFiltradas = ref<{ label: string; value: string; cor: string }[]>([]);

watch(
  opcoesTags,
  (lista) => {
    opcoesTagsFiltradas.value = lista;
  },
  { immediate: true },
);

function filtrarTags(val: string, update: (callback: () => void) => void): void {
  update(() => {
    const termo = val.trim().toLowerCase();
    if (!termo) {
      opcoesTagsFiltradas.value = opcoesTags.value;
      return;
    }

    opcoesTagsFiltradas.value = opcoesTags.value.filter((opcao) =>
      opcao.label.toLowerCase().includes(termo),
    );
  });
}

const mostrarBoxNovaTag = computed(
  () => props.modelValue && dadosIniciaisCarregados.value && podeCriarTag.value,
);

const mostrarBoxNovoPaciente = computed(
  () => props.modelValue && Boolean(form.unidadeId) && podeCriarPaciente.value,
);

const tituloDialog = computed(() =>
  isEdicao.value ? 'Editar agendamento' : 'Novo agendamento',
);

function pad2(valor: number): string {
  return String(valor).padStart(2, '0');
}

function formatarParteData(data: Date): string {
  return `${data.getFullYear()}-${pad2(data.getMonth() + 1)}-${pad2(data.getDate())}`;
}

function formatarParteHora(data: Date): string {
  return `${pad2(data.getHours())}:${pad2(data.getMinutes())}`;
}

function extrairDataHoraDeDatetimeLocal(valor: string): { data: string; hora: string } {
  const [data = '', horaCompleta = ''] = valor.split('T');
  return { data, hora: horaCompleta.slice(0, 5) };
}

function somarMinutosHora(hora: string, minutos: number): string {
  const [horas = 0, mins = 0] = hora.split(':').map(Number);
  const total = horas * 60 + mins + minutos;
  const horaNormalizada = ((Math.floor(total / 60) % 24) + 24) % 24;
  const minutoNormalizado = ((total % 60) + 60) % 60;

  return `${pad2(horaNormalizada)}:${pad2(minutoNormalizado)}`;
}

function aplicarIntervaloNoFormulario(inicio: Date, fim: Date): void {
  form.data = formatarParteData(inicio);
  form.horaInicio = formatarParteHora(inicio);
  form.horaFim = formatarParteHora(fim);
}

function aoAlterarHoraInicio(): void {
  if (!form.horaInicio) {
    return;
  }

  if (!form.horaFim || form.horaFim <= form.horaInicio) {
    form.horaFim = somarMinutosHora(form.horaInicio, 30);
  }
}

function preencherFormulario(): void {
  ignorarMudancaUnidade = true;

  if (props.agendamento) {
    form.unidadeId = props.agendamento.unidadeId;
    form.pacienteId = props.agendamento.pacienteId;
    form.funcionarioId = props.agendamento.funcionarioId;
    form.tipo = props.agendamento.tipo;

    const inicio = extrairDataHoraDeDatetimeLocal(
      deIsoParaInputDatetimeLocal(props.agendamento.dataInicio),
    );
    const fim = extrairDataHoraDeDatetimeLocal(
      deIsoParaInputDatetimeLocal(props.agendamento.dataFim),
    );
    form.data = inicio.data;
    form.horaInicio = inicio.hora;
    form.horaFim = fim.hora;

    form.observacao = props.agendamento.observacao ?? '';
    form.tagIds = props.agendamento.tags?.map((tag) => tag.id) ?? [];
    ignorarMudancaUnidade = false;
    return;
  }

  form.unidadeId = null;
  form.pacienteId = null;
  form.funcionarioId = null;
  form.tipo = 'Consulta';
  form.observacao = '';
  form.tagIds = [];

  if (props.intervaloInicial) {
    aplicarIntervaloNoFormulario(props.intervaloInicial.inicio, props.intervaloInicial.fim);
  } else {
    const agora = new Date();
    const fim = new Date(agora.getTime() + 30 * 60 * 1000);
    aplicarIntervaloNoFormulario(agora, fim);
  }

  ignorarMudancaUnidade = false;
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

function garantirTagsDoAgendamento(): void {
  const extras = props.agendamento?.tags ?? [];
  if (extras.length === 0) {
    return;
  }

  const porId = new Map(tagsDisponiveis.value.map((tag) => [tag.id, tag]));
  let mudou = false;

  for (const tag of extras) {
    if (!porId.has(tag.id)) {
      porId.set(tag.id, {
        id: tag.id,
        nome: tag.nome,
        cor: tag.cor,
        ativo: false,
      });
      mudou = true;
    }
  }

  if (mudou) {
    tagsDisponiveis.value = [...porId.values()];
  }
}

async function carregarTags(): Promise<void> {
  try {
    tagsDisponiveis.value = normalizarLista(await tagAgendamentoService.listar());
    garantirTagsDoAgendamento();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  }
}

async function carregarListasDaUnidade(): Promise<void> {
  if (!form.unidadeId) {
    pacientesDisponiveis.value = [];
    funcionariosDisponiveis.value = [];
    unidadeListasId.value = null;
    return;
  }

  if (form.unidadeId === unidadeListasId.value) {
    return;
  }

  await Promise.all([carregarPacientesDaUnidade(), carregarFuncionariosDaUnidade()]);
  unidadeListasId.value = form.unidadeId;
}

async function carregarDependencias(): Promise<void> {
  try {
    const [unidades] = await Promise.all([unidadeService.listar(), carregarTags()]);
    unidadesDisponiveis.value = normalizarLista(unidades);
    dadosIniciaisCarregados.value = true;
    await carregarListasDaUnidade();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  }
}

function voltarPainelAgendamento(): void {
  painel.value = 'agendamento';
  tagEmEdicao.value = null;
}

function fechar(): void {
  voltarPainelAgendamento();
  emit('update:modelValue', false);
}

function abrirCadastroPaciente(): void {
  if (!form.unidadeId) {
    return;
  }

  painel.value = 'paciente';
}

function aoPacienteCriado(paciente: Paciente): void {
  if (!pacientesDisponiveis.value.some((item) => item.id === paciente.id)) {
    pacientesDisponiveis.value = [paciente, ...pacientesDisponiveis.value];
  }

  form.pacienteId = paciente.id;
  voltarPainelAgendamento();
}

function abrirCadastroTag(): void {
  selectTags.value?.hidePopup?.();
  tagEmEdicao.value = null;
  painel.value = 'tag';
}

function abrirEdicaoTag(tagId: string): void {
  const tag = tagsDisponiveis.value.find((item) => item.id === tagId);
  if (!tag) {
    return;
  }

  selectTags.value?.hidePopup?.();
  tagEmEdicao.value = tag;
  painel.value = 'tag';
}

function aoTagSalva(tag: TagAgendamento): void {
  const jaExiste = tagsDisponiveis.value.some((item) => item.id === tag.id);

  if (jaExiste) {
    tagsDisponiveis.value = tagsDisponiveis.value.map((item) =>
      item.id === tag.id ? tag : item,
    );
    voltarPainelAgendamento();
    return;
  }

  tagsDisponiveis.value = [tag, ...tagsDisponiveis.value];

  if (!form.tagIds.includes(tag.id)) {
    form.tagIds = [...form.tagIds, tag.id];
  }

  voltarPainelAgendamento();
}

function montarPayload() {
  return {
    unidadeId: form.unidadeId!,
    pacienteId: form.pacienteId!,
    funcionarioId: form.funcionarioId!,
    tipo: form.tipo,
    dataInicio: deInputDatetimeLocalParaIso(`${form.data}T${form.horaInicio}`),
    dataFim: deInputDatetimeLocalParaIso(`${form.data}T${form.horaFim}`),
    observacao: form.observacao.trim() || null,
    tagIds: form.tagIds,
  };
}

async function salvar(): Promise<void> {
  if (
    !form.unidadeId ||
    !form.pacienteId ||
    !form.funcionarioId ||
    !form.data ||
    !form.horaInicio ||
    !form.horaFim
  ) {
    notificacao.info('Preencha todos os campos obrigatórios.');
    return;
  }

  if (form.horaFim <= form.horaInicio) {
    notificacao.info('O horário de fim deve ser após o horário de início.');
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
      voltarPainelAgendamento();
      return;
    }

    preencherFormulario();

    if (!dadosIniciaisCarregados.value) {
      await carregarDependencias();
    } else {
      garantirTagsDoAgendamento();
      await carregarListasDaUnidade();
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
  if (ignorarMudancaUnidade) {
    return;
  }

  if (unidadeAnterior && novaUnidade !== unidadeAnterior) {
    form.funcionarioId = null;
    form.pacienteId = null;
  }

  if (dadosIniciaisCarregados.value) {
    await carregarListasDaUnidade();
  }
});
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    transition-show="none"
    transition-hide="none"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="agendamento-form-dialog" style="width: 560px; max-width: 95vw">
      <template v-if="painel === 'agendamento'">
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
              :disable="salvando"
              :rules="[(v) => Boolean(v) || 'Obrigatório']"
            />

            <div class="form-field-stack">
              <q-select
                v-model="form.pacienteId"
                :options="opcoesPacientesFiltradas"
                label="Paciente *"
                outlined
                emit-value
                map-options
                use-input
                input-debounce="200"
                :disable="salvando || !form.unidadeId"
                :rules="[(v) => Boolean(v) || 'Obrigatório']"
                @filter="filtrarPacientes"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey">Nenhum paciente encontrado</q-item-section>
                  </q-item>
                </template>
              </q-select>

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
              :options="opcoesFuncionariosFiltradas"
              label="Profissional *"
              outlined
              emit-value
              map-options
              use-input
              input-debounce="200"
              :disable="salvando || !form.unidadeId"
              :rules="[(v) => Boolean(v) || 'Obrigatório']"
              @filter="filtrarFuncionarios"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">Nenhum profissional encontrado</q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-select
              v-model="form.tipo"
              :options="opcoesTipos"
              label="Tipo *"
              outlined
              emit-value
              map-options
              :disable="salvando"
            />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <app-date-input
                  v-model="form.data"
                  label="Data *"
                  outlined
                  :disable="salvando"
                  :rules="[(v) => Boolean(v) || 'Obrigatório']"
                />
              </div>
              <div class="col-6 col-sm-4">
                <q-input
                  v-model="form.horaInicio"
                  type="time"
                  label="Início *"
                  outlined
                  :disable="salvando"
                  :rules="[(v) => Boolean(v) || 'Obrigatório']"
                  @update:model-value="aoAlterarHoraInicio"
                />
              </div>
              <div class="col-6 col-sm-4">
                <q-input
                  v-model="form.horaFim"
                  type="time"
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

            <div class="form-field-stack">
              <q-select
                ref="selectTags"
                v-model="form.tagIds"
                :options="opcoesTagsFiltradas"
                label="Tags"
                outlined
                multiple
                use-chips
                use-input
                input-debounce="200"
                emit-value
                map-options
                :disable="salvando"
                @filter="filtrarTags"
              >
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section side>
                      <span
                        class="agendamento-form-dialog__tag-swatch"
                        :style="{ backgroundColor: scope.opt.cor }"
                      />
                    </q-item-section>
                    <q-item-section>{{ scope.opt.label }}</q-item-section>
                    <q-item-section v-if="podeEditarTag" side>
                      <q-btn
                        flat
                        dense
                        round
                        icon="edit"
                        size="sm"
                        aria-label="Editar tag"
                        :disable="salvando"
                        @click.stop.prevent="abrirEdicaoTag(scope.opt.value)"
                      />
                    </q-item-section>
                  </q-item>
                </template>
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey">Nenhuma tag encontrada</q-item-section>
                  </q-item>
                </template>
              </q-select>
              <div v-if="mostrarBoxNovaTag" class="agendamento-form-dialog__box-tag">
                <p class="agendamento-form-dialog__box-tag-texto">
                  {{
                    tagsDisponiveis.length === 0
                      ? 'Nenhuma tag cadastrada. Cadastre tags para colorir os agendamentos na agenda.'
                      : 'Deseja cadastrar uma nova tag?'
                  }}
                </p>
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  :label="tagsDisponiveis.length === 0 ? 'Cadastrar tag' : 'Nova tag'"
                  icon="label"
                  :disable="salvando"
                  @click="abrirCadastroTag"
                />
              </div>
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="primary" no-caps :disable="salvando" @click="fechar" />
          <q-btn
            unelevated
            :label="salvando ? 'Salvando' : 'Salvar'"
            color="primary"
            no-caps
            :disable="salvando"
            @click="salvar"
          />
        </q-card-actions>
      </template>

      <tag-agendamento-form-dialog
        v-else-if="painel === 'tag'"
        :tag="tagEmEdicao"
        @salvo="aoTagSalva"
        @cancelar="voltarPainelAgendamento"
      />

      <paciente-form-dialog
        v-else
        :unidade-id="form.unidadeId"
        @criado="aoPacienteCriado"
        @cancelar="voltarPainelAgendamento"
      />
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.agendamento-form-dialog {
  max-height: 90vh;
  overflow-y: auto;

  &__box-paciente,
  &__box-tag {
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

  &__box-paciente-texto,
  &__box-tag-texto {
    margin: 0;
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
    line-height: var(--ds-line-height-normal);
  }

  &__tag-swatch {
    border: 1px solid var(--ds-border-default);
    border-radius: var(--ds-radius-md);
    display: inline-block;
    height: 16px;
    width: 16px;
  }
}
</style>
