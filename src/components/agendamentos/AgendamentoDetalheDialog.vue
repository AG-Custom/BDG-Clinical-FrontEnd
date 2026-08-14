<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import AgendamentoConclusaoDialog from '@/components/agendamentos/AgendamentoConclusaoDialog.vue';
import AppEntityAuditSection from '@/components/shared/AppEntityAuditSection.vue';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { permissoes } from '@/constants/permissoes';
import { agendamentoService } from '@/services/agendamento.service';
import type { Agendamento } from '@/types/entidades/agendamento';
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
const dialogCancelar = ref(false);
const dialogConcluir = ref(false);
const motivoCancelamento = ref('');

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
  dialogConcluir.value = true;
}

function aoConcluirAgendamento(): void {
  emit('atualizado');
  fechar();
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

  <agendamento-conclusao-dialog
    v-model="dialogConcluir"
    :agendamento="agendamento"
    @concluido="aoConcluirAgendamento"
  />
</template>

<style scoped lang="scss" src="./AgendamentoDetalheDialog.scss"></style>
