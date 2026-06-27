<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { agendamentoService } from '@/services/agendamento.service';
import { procedimentoService } from '@/services/procedimento.service';
import type { Agendamento } from '@/types/entidades/agendamento';
import {
  calcularDuracaoAgendamento,
  formatarDataCabecalhoAgendamento,
  formatarDataHoraAgendamento,
  formatarIntervaloHorarioAgendamento,
  isAgendamentoEditavel,
  obterCorEventoAgendamento,
  obterCorStatusAgendamento,
  obterIconeTipoAgendamento,
  obterIniciaisNome,
  obterLabelStatusAgendamento,
  obterLabelTipoAgendamento,
} from '@/types/entidades/agendamento';
import type { Procedimento } from '@/types/entidades/procedimento';

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

const processando = ref(false);
const dialogCancelar = ref(false);
const dialogConcluir = ref(false);
const motivoCancelamento = ref('');
const procedimento = ref<Procedimento | null>(null);

const formConclusao = reactive({
  quantidadeUtilizada: null as number | null,
  peso: null as number | null,
});

const podeEditar = computed(
  () => props.agendamento && isAgendamentoEditavel(props.agendamento.status),
);

const podeConfirmar = computed(() => props.agendamento?.status === 'Agendado');

const podeConcluir = computed(() => props.agendamento?.status === 'Confirmado');

const podeCancelar = computed(
  () =>
    props.agendamento &&
    (props.agendamento.status === 'Agendado' || props.agendamento.status === 'Confirmado'),
);

const podeMarcarFalta = computed(
  () =>
    props.agendamento &&
    (props.agendamento.status === 'Agendado' || props.agendamento.status === 'Confirmado'),
);

const exigeQuantidadeConclusao = computed(
  () => Boolean(procedimento.value?.produtoAplicadoId),
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

async function carregarProcedimento(): Promise<void> {
  procedimento.value = null;

  if (!props.agendamento?.procedimentoId) {
    return;
  }

  try {
    procedimento.value = await procedimentoService.obter(props.agendamento.procedimentoId);
  } catch {
    procedimento.value = null;
  }
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

  if (exigeQuantidadeConclusao.value && formConclusao.quantidadeUtilizada === null) {
    notificacao.info('Informe a quantidade utilizada.');
    return;
  }

  processando.value = true;

  try {
    await agendamentoService.concluir(props.agendamento.id, {
      quantidadeUtilizada: formConclusao.quantidadeUtilizada,
      peso: formConclusao.peso,
    });
    notificacao.sucesso('Agendamento concluído.');
    dialogConcluir.value = false;
    emit('atualizado');
    fechar();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
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
  formConclusao.quantidadeUtilizada = null;
  formConclusao.peso = null;
  dialogConcluir.value = true;
  void carregarProcedimento();
}

watch(
  () => props.modelValue,
  (aberto) => {
    if (!aberto) {
      dialogCancelar.value = false;
      dialogConcluir.value = false;
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
          <q-badge
            :color="obterCorStatusAgendamento(agendamento.status)"
            :label="obterLabelStatusAgendamento(agendamento.status)"
          />
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

        <div v-if="agendamento.procedimentoNome" class="agendamento-detalhe__secao">
          <q-icon name="vaccines" size="20px" class="agendamento-detalhe__icone-secao" />
          <div class="agendamento-detalhe__secao-conteudo">
            <div class="agendamento-detalhe__secao-label">Procedimento</div>
            <div class="agendamento-detalhe__secao-valor">{{ agendamento.procedimentoNome }}</div>
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

        <div v-if="agendamento.aplicacaoPacienteId" class="agendamento-detalhe__info-extra">
          <q-icon name="check_circle" size="16px" color="positive" />
          <span>Aplicação registrada no prontuário</span>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="agendamento-detalhe__meta">
        <span>Criado por {{ agendamento.criadoPorNome }}</span>
        <span class="agendamento-detalhe__meta-sep" aria-hidden="true">·</span>
        <span>{{ formatarDataHoraAgendamento(agendamento.criadoEm) }}</span>
        <template v-if="agendamento.atualizadoEm">
          <span class="agendamento-detalhe__meta-sep" aria-hidden="true">·</span>
          <span>Atualizado em {{ formatarDataHoraAgendamento(agendamento.atualizadoEm) }}</span>
        </template>
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

  <q-dialog v-model="dialogConcluir" persistent>
    <q-card style="min-width: 320px">
      <q-card-section>
        <div class="text-h6">Concluir agendamento</div>
        <p v-if="agendamento?.tipo === 'Aplicacao'" class="text-body2 q-mt-sm">
          Ao concluir, será registrada a aplicação e movimentação de estoque.
        </p>
      </q-card-section>
      <q-card-section class="q-gutter-md">
        <q-input
          v-if="exigeQuantidadeConclusao"
          v-model.number="formConclusao.quantidadeUtilizada"
          label="Quantidade utilizada *"
          type="number"
          outlined
          :disable="processando"
          min="0"
          step="0.01"
        />
        <q-input
          v-model.number="formConclusao.peso"
          label="Peso (kg)"
          type="number"
          outlined
          :disable="processando"
          min="0"
          step="0.1"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Voltar" color="primary" no-caps :disable="processando" v-close-popup />
        <q-btn
          unelevated
          label="Concluir"
          color="positive"
          no-caps
          :disable="processando"
          @click="concluir"
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
}
</style>
