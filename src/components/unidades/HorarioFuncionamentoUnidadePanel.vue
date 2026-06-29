<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import HorarioFuncionamentoFaixaFields from '@/components/unidades/HorarioFuncionamentoFaixaFields.vue';
import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { horarioFuncionamentoUnidadeService } from '@/services/horario-funcionamento-unidade.service';
import type {
  CriarHorarioFuncionamentoRequest,
  DiaSemana,
  HorarioFuncionamentoFaixaRascunho,
  HorarioFuncionamentoUnidade,
} from '@/types/entidades/horario-funcionamento-unidade';
import {
  DIAS_SEMANA,
  deHoraApiParaInput,
  deInputParaHoraApi,
  formatarFaixaHorario,
  formatarResumoDiasSelecionados,
  montarPayloadsHorarioFuncionamento,
  obterLabelDiaSemana,
  validarFaixaHorarioFuncionamento,
} from '@/types/entidades/horario-funcionamento-unidade';

interface FaixaPendente extends HorarioFuncionamentoFaixaRascunho {
  id: string;
}

const props = withDefaults(
  defineProps<{
    unidadeId?: string | null;
    desabilitado?: boolean;
    textoAjuda?: string;
    ocultarCabecalho?: boolean;
  }>(),
  {
    unidadeId: null,
    desabilitado: false,
    textoAjuda: 'Use os atalhos para aplicar o mesmo horário em vários dias de uma vez.',
    ocultarCabecalho: false,
  },
);

const emit = defineEmits<{
  'update:pendentes': [pendentes: CriarHorarioFuncionamentoRequest[]];
}>();

const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeEditar = usePermissao(permissoes.unidades.editar);

const horariosPendentes = ref<FaixaPendente[]>([]);
const carregando = ref(Boolean(props.unidadeId));
const salvando = ref(false);
const incluirInativos = ref(false);
const formularioAberto = ref(false);
const horarioEdicao = ref<HorarioFuncionamentoUnidade | null>(null);
const faixaFieldsRef = ref<InstanceType<typeof HorarioFuncionamentoFaixaFields> | null>(null);
const ativoEdicao = ref(true);
const idAlternando = ref<string | null>(null);

interface LinhaHorarioPendente {
  id: string;
  diaSemana: DiaSemana | null;
  diasResumo: string;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
  pendente: true;
}

const horarios = ref<HorarioFuncionamentoUnidade[]>([]);

const modoPersistido = computed(() => Boolean(props.unidadeId));

const bloqueado = computed(() => props.desabilitado || !podeEditar.value || salvando.value);

const colunas = [
  { name: 'dia', label: 'Dia', field: 'diaSemana', align: 'left' as const },
  { name: 'horario', label: 'Horário', field: 'horaInicio', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: '', field: 'acoes', align: 'right' as const },
];

const tituloFormulario = computed(() =>
  horarioEdicao.value ? 'Editar horário' : 'Novo horário',
);

const linhasTabela = computed(() => {
  if (modoPersistido.value) {
    return [...horarios.value].sort(ordenarHorario);
  }

  return horariosPendentes.value.map(
    (faixa): LinhaHorarioPendente => ({
      id: faixa.id,
      diaSemana: faixa.diasSemana.length === 1 ? faixa.diasSemana[0] : null,
      diasResumo: formatarResumoDiasSelecionados(faixa.diasSemana),
      horaInicio: faixa.horaInicio,
      horaFim: faixa.horaFim,
      ativo: true,
      pendente: true,
    }),
  );
});

const possuiHorarios = computed(() => linhasTabela.value.length > 0);

function gerarIdLocal(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ordenarHorario(a: HorarioFuncionamentoUnidade, b: HorarioFuncionamentoUnidade): number {
  const diffDia = DIAS_SEMANA.indexOf(a.diaSemana) - DIAS_SEMANA.indexOf(b.diaSemana);

  if (diffDia !== 0) {
    return diffDia;
  }

  return a.horaInicio.localeCompare(b.horaInicio);
}

function formatarHorarioLinha(horaInicio: string, horaFim: string): string {
  return formatarFaixaHorario(horaInicio, horaFim);
}

function emitirPendentes(): void {
  emit(
    'update:pendentes',
    horariosPendentes.value.flatMap((faixa) => montarPayloadsHorarioFuncionamento(faixa)),
  );
}

async function carregarHorarios(): Promise<void> {
  if (!props.unidadeId) {
    return;
  }

  carregando.value = true;

  try {
    horarios.value = await horarioFuncionamentoUnidadeService.listar(
      props.unidadeId,
      incluirInativos.value,
    );
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
    horarios.value = [];
  } finally {
    carregando.value = false;
  }
}

async function abrirNovo(): Promise<void> {
  horarioEdicao.value = null;
  ativoEdicao.value = true;
  formularioAberto.value = true;
  await nextTick();
  faixaFieldsRef.value?.reiniciar();
}

async function abrirEdicao(horario: HorarioFuncionamentoUnidade): Promise<void> {
  horarioEdicao.value = horario;
  ativoEdicao.value = horario.ativo;
  formularioAberto.value = true;
  await nextTick();
  faixaFieldsRef.value?.preencher({
    diasSemana: [horario.diaSemana],
    horaInicio: deHoraApiParaInput(horario.horaInicio),
    horaFim: deHoraApiParaInput(horario.horaFim),
  });
}

function fecharFormulario(): void {
  formularioAberto.value = false;
  horarioEdicao.value = null;
}

async function salvarFaixa(): Promise<void> {
  const faixa = faixaFieldsRef.value?.obterFaixa();

  if (!faixa) {
    return;
  }

  const erroValidacao = validarFaixaHorarioFuncionamento(faixa);

  if (erroValidacao) {
    notificacao.info(erroValidacao);
    return;
  }

  if (!modoPersistido.value) {
    horariosPendentes.value.push({
      id: gerarIdLocal(),
      diasSemana: [...faixa.diasSemana],
      horaInicio: faixa.horaInicio,
      horaFim: faixa.horaFim,
    });
    emitirPendentes();
    notificacao.sucesso('Horário adicionado à unidade.');
    fecharFormulario();
    return;
  }

  salvando.value = true;

  try {
    if (horarioEdicao.value && props.unidadeId) {
      await horarioFuncionamentoUnidadeService.atualizar(props.unidadeId, horarioEdicao.value.id, {
        diaSemana: horarioEdicao.value.diaSemana,
        horaInicio: deInputParaHoraApi(faixa.horaInicio),
        horaFim: deInputParaHoraApi(faixa.horaFim),
        ativo: ativoEdicao.value,
      });
      notificacao.sucesso('Horário atualizado.');
    } else if (props.unidadeId) {
      const payloads = montarPayloadsHorarioFuncionamento(faixa);
      await horarioFuncionamentoUnidadeService.criarEmLote(props.unidadeId, payloads);
      notificacao.sucesso(
        payloads.length === 1
          ? 'Horário cadastrado.'
          : `${payloads.length} horários cadastrados.`,
      );
    }

    fecharFormulario();
    await carregarHorarios();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    salvando.value = false;
  }
}

function removerPendente(id: string): void {
  horariosPendentes.value = horariosPendentes.value.filter((faixa) => faixa.id !== id);
  emitirPendentes();
}

async function alternarAtivo(horario: HorarioFuncionamentoUnidade): Promise<void> {
  if (bloqueado.value || idAlternando.value) {
    return;
  }

  const novoAtivo = !horario.ativo;
  idAlternando.value = horario.id;

  try {
    const horarioAtualizado = await horarioFuncionamentoUnidadeService.alternarAtivo(
      horario.id,
      novoAtivo,
    );

    if (!novoAtivo && !incluirInativos.value) {
      horarios.value = horarios.value.filter((item) => item.id !== horario.id);
    } else {
      const indice = horarios.value.findIndex((item) => item.id === horario.id);

      if (indice >= 0) {
        horarios.value[indice] = horarioAtualizado;
      }
    }

    notificacao.sucesso(novoAtivo ? 'Horário ativado.' : 'Horário inativado.');
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    idAlternando.value = null;
  }
}

function obterDiaLabel(row: HorarioFuncionamentoUnidade | LinhaHorarioPendente): string {
  if ('diasResumo' in row && row.diasResumo && !row.diaSemana) {
    return row.diasResumo;
  }

  if (row.diaSemana) {
    return obterLabelDiaSemana(row.diaSemana);
  }

  return '—';
}

watch(
  () => props.unidadeId,
  (unidadeId) => {
    if (unidadeId) {
      void carregarHorarios();
      return;
    }

    horarios.value = [];
  },
  { immediate: true },
);

onMounted(() => {
  emitirPendentes();
});

defineExpose({
  obterPendentes: (): CriarHorarioFuncionamentoRequest[] =>
    horariosPendentes.value.flatMap((faixa) => montarPayloadsHorarioFuncionamento(faixa)),
});
</script>

<template>
  <div class="horario-unidade-panel">
    <div class="horario-unidade-panel__cabecalho" :class="{ 'horario-unidade-panel__cabecalho--compacto': ocultarCabecalho }">
      <div v-if="!ocultarCabecalho">
        <div class="horario-unidade-panel__titulo">Horário de funcionamento</div>
        <p class="horario-unidade-panel__texto">{{ textoAjuda }}</p>
      </div>

      <q-btn
        v-if="!formularioAberto"
        unelevated
        color="primary"
        icon="add"
        label="Novo horário"
        no-caps
        :disable="bloqueado"
        :class="{ 'q-ml-auto': ocultarCabecalho }"
        @click="abrirNovo"
      />
    </div>

    <q-card v-if="modoPersistido" flat bordered class="q-mb-md">
      <q-card-section class="q-py-sm">
        <q-toggle
          v-model="incluirInativos"
          label="Incluir horários inativos"
          color="primary"
          dense
          @update:model-value="carregarHorarios"
        />
      </q-card-section>
    </q-card>

    <q-card v-if="formularioAberto" flat bordered class="horario-unidade-panel__formulario q-mb-md">
      <q-card-section>
        <div class="horario-unidade-panel__formulario-titulo">{{ tituloFormulario }}</div>

        <horario-funcionamento-faixa-fields
          ref="faixaFieldsRef"
          :modo-edicao="Boolean(horarioEdicao)"
          :dia-unico="horarioEdicao?.diaSemana"
          :desabilitado="bloqueado"
        />

        <q-toggle
          v-if="horarioEdicao"
          v-model="ativoEdicao"
          label="Horário ativo"
          color="primary"
          dense
          class="q-mt-md"
          :disable="bloqueado"
        />

        <div class="row q-gutter-sm q-mt-md">
          <q-btn
            unelevated
            color="primary"
            label="Salvar horário"
            no-caps
            :loading="salvando"
            :disable="bloqueado"
            @click="salvarFaixa"
          />
          <q-btn flat color="primary" label="Cancelar" no-caps :disable="salvando" @click="fecharFormulario" />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="possuiHorarios"
        :rows="linhasTabela"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        hide-pagination
        :rows-per-page-options="[0]"
      >
        <template #body-cell-dia="props">
          <q-td :props="props">
            {{ obterDiaLabel(props.row) }}
          </q-td>
        </template>

        <template #body-cell-horario="props">
          <q-td :props="props">
            {{ formatarHorarioLinha(props.row.horaInicio, props.row.horaFim) }}
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              v-if="modoPersistido"
              :color="props.row.ativo ? 'positive' : 'grey'"
              :label="props.row.ativo ? 'Ativo' : 'Inativo'"
            />
            <q-badge v-else color="primary" label="Pendente" />
          </q-td>
        </template>

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <app-table-action-button
              v-if="modoPersistido"
              :acao="cell.row.ativo ? 'inativar' : 'reativar'"
              :rotulo="cell.row.ativo ? 'Inativar horário' : 'Ativar horário'"
              :disable="bloqueado || idAlternando === cell.row.id"
              @click="alternarAtivo(cell.row as HorarioFuncionamentoUnidade)"
            />
            <app-table-action-button
              v-if="modoPersistido"
              acao="editar"
              rotulo="Editar horário"
              :disable="bloqueado || idAlternando === cell.row.id"
              @click="abrirEdicao(cell.row as HorarioFuncionamentoUnidade)"
            />
            <app-table-action-button
              v-else-if="!modoPersistido"
              acao="excluir"
              rotulo="Remover horário"
              :disable="bloqueado"
              @click="removerPendente(cell.row.id)"
            />
          </app-table-actions-cell>
        </template>
      </q-table>

      <q-card-section v-else-if="carregando && modoPersistido">
        <app-table-skeleton :columns="colunas.length" />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="schedule"
          titulo="Nenhum horário configurado"
          texto="Adicione horários de funcionamento para liberar agendamentos nesta unidade."
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped lang="scss">
.horario-unidade-panel {
  &__cabecalho {
    align-items: flex-start;
    display: flex;
    gap: var(--ds-space-3);
    justify-content: space-between;
    margin-bottom: var(--ds-space-3);
  }

  &__titulo {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-lg, 1.125rem);
    font-weight: var(--ds-font-weight-semibold);
    margin-bottom: var(--ds-space-1);
  }

  &__texto {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm, 0.875rem);
    margin: 0;
  }

  &__cabecalho--compacto {
    justify-content: flex-end;
  }

  &__formulario-titulo {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-md, 1rem);
    font-weight: var(--ds-font-weight-semibold);
    margin-bottom: var(--ds-space-3);
  }
}
</style>
