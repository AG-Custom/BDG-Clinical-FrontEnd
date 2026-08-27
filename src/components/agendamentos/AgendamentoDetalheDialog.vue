<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import AgendamentoConclusaoDialog from '@/components/agendamentos/AgendamentoConclusaoDialog.vue';
import AppEntityAuditSection from '@/components/shared/AppEntityAuditSection.vue';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { TEXTOS_AGENDAMENTO } from '@/constants/agendamentos';
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
const textos = TEXTOS_AGENDAMENTO.detalhe;
const textoComum = TEXTOS_AGENDAMENTO.comum;
const textosNotificacao = TEXTOS_AGENDAMENTO.notificacoes;

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

const textoAplicacoesRegistradas = computed(() =>
  quantidadeAplicacoes.value > 1
    ? textos.aplicacoesRegistradas(quantidadeAplicacoes.value)
    : textos.aplicacaoRegistrada,
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
    notificacao.sucesso(textosNotificacao.confirmado);
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
    notificacao.info(textosNotificacao.motivoCancelamentoObrigatorio);
    return;
  }

  processando.value = true;

  try {
    await agendamentoService.cancelar(props.agendamento.id, {
      motivo: motivoCancelamento.value.trim(),
    });
    notificacao.sucesso(textosNotificacao.cancelado);
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
    notificacao.sucesso(textosNotificacao.faltaRegistrada);
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

async function abrirDialogConcluir(): Promise<void> {
  const agendamento = props.agendamento;
  if (!agendamento) return;

  if (agendamento.tipo === 'Aplicacao') {
    dialogConcluir.value = true;
    return;
  }

  processando.value = true;
  try {
    await agendamentoService.concluir(agendamento.id);
    notificacao.sucesso(textosNotificacao.concluido);
    emit('atualizado');
    fechar();
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    processando.value = false;
  }
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
          <q-btn
            flat
            round
            dense
            icon="close"
            :aria-label="textoComum.fechar"
            @click="fechar"
          />
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
            <div class="agendamento-detalhe__secao-label">{{ textos.paciente }}</div>
            <div class="agendamento-detalhe__secao-valor">{{ agendamento.pacienteNome }}</div>
          </div>
        </div>

        <div class="agendamento-detalhe__secao">
          <div class="agendamento-detalhe__avatar agendamento-detalhe__avatar--funcionario">
            {{ iniciaisFuncionario }}
          </div>
          <div class="agendamento-detalhe__secao-conteudo">
            <div class="agendamento-detalhe__secao-label">{{ textos.profissional }}</div>
            <div class="agendamento-detalhe__secao-valor">{{ agendamento.funcionarioNome }}</div>
          </div>
        </div>

        <div class="agendamento-detalhe__secao">
          <q-icon name="apartment" size="20px" class="agendamento-detalhe__icone-secao" />
          <div class="agendamento-detalhe__secao-conteudo">
            <div class="agendamento-detalhe__secao-label">{{ textos.unidade }}</div>
            <div class="agendamento-detalhe__secao-valor">{{ agendamento.unidadeNome }}</div>
          </div>
        </div>

        <div v-if="nomesProcedimentos" class="agendamento-detalhe__secao">
          <q-icon name="vaccines" size="20px" class="agendamento-detalhe__icone-secao" />
          <div class="agendamento-detalhe__secao-conteudo">
            <div class="agendamento-detalhe__secao-label">
              {{ quantidadeProcedimentos > 1 ? textos.procedimentos : textos.procedimento }}
            </div>
            <div class="agendamento-detalhe__secao-valor">{{ nomesProcedimentos }}</div>
          </div>
        </div>

        <div v-if="agendamento.observacao" class="agendamento-detalhe__observacao">
          <div class="agendamento-detalhe__secao-label">{{ textos.observacoes }}</div>
          <p class="agendamento-detalhe__observacao-texto">{{ agendamento.observacao }}</p>
        </div>

        <div v-if="agendamento.motivoCancelamento" class="agendamento-detalhe__alerta">
          <q-icon name="block" size="18px" />
          <div>
            <div class="agendamento-detalhe__secao-label">{{ textos.motivoCancelamento }}</div>
            <div class="agendamento-detalhe__secao-valor">{{ agendamento.motivoCancelamento }}</div>
          </div>
        </div>

        <div v-if="possuiAplicacoes" class="agendamento-detalhe__info-extra">
          <q-icon name="check_circle" size="16px" color="positive" />
          <span>
            {{ textoAplicacoesRegistradas }}
          </span>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section v-if="agendamento" class="agendamento-detalhe__auditoria">
        <app-entity-audit-section
          :ativo="modelValue"
          :registro-id="agendamento.id"
          :entidade-auditoria="textos.entidadeAuditoria"
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
          :label="textos.registrarFalta"
          icon="person_off"
          color="warning"
          no-caps
          :disable="processando"
          @click="marcarFalta"
        />
        <q-btn
          v-if="podeCancelar"
          flat
          :label="textos.cancelar"
          icon="block"
          color="negative"
          no-caps
          :disable="processando"
          @click="dialogCancelar = true"
        />
        <q-space />
        <q-btn
          flat
          :label="textos.editar"
          icon="edit"
          color="primary"
          no-caps
          :disable="processando"
          @click="abrirEdicao"
        />
        <q-btn
          v-if="podeConfirmar"
          unelevated
          :label="textos.confirmar"
          icon="check"
          color="primary"
          no-caps
          :disable="processando"
          @click="confirmar"
        />
        <q-btn
          v-if="podeConcluir"
          unelevated
          :label="textos.concluirAtendimento"
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
        <div class="text-h6">{{ textos.cancelarTitulo }}</div>
        <p class="text-body2 q-mt-sm">{{ textos.cancelarInstrucao }}</p>
      </q-card-section>
      <q-card-section>
        <q-input
          v-model="motivoCancelamento"
          :label="textos.motivoObrigatorio"
          type="textarea"
          outlined
          autogrow
          :disable="processando"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          :label="textos.voltar"
          color="primary"
          no-caps
          :disable="processando"
          v-close-popup
        />
        <q-btn
          unelevated
          :label="textos.confirmarCancelamento"
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
