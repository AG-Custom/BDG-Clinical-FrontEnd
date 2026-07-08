<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { agendamentoService } from '@/services/agendamento.service';
import { procedimentoService } from '@/services/procedimento.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import type { Agendamento, ConcluirAgendamentoRequest } from '@/types/entidades/agendamento';
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

interface ProcedimentoConclusaoFormulario {
  procedimentoId: string;
  nome: string;
  exigeQuantidade: boolean;
  quantidadeUtilizada: number | null;
  produtoAplicadoNome: string | null;
  saldoAtual: number | null;
  unidadeMedidaSigla: string;
}

const procedimentosConclusao = ref<ProcedimentoConclusaoFormulario[]>([]);

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

const exigeQuantidadeConclusao = computed(() =>
  procedimentosConclusao.value.some((procedimento) => procedimento.exigeQuantidade),
);

const conclusaoMultipla = computed(() => procedimentosConclusao.value.length > 1);

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

function obterClasseSaldoProduto(saldoAtual: number | null): string {
  if (saldoAtual === null) {
    return '';
  }

  return saldoAtual > 0
    ? 'agendamento-detalhe__saldo-valor--positivo'
    : 'agendamento-detalhe__saldo-valor--negativo';
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

async function carregarProcedimentosConclusao(): Promise<void> {
  procedimentosConclusao.value = [];

  if (!props.agendamento) {
    return;
  }

  const resumos = obterProcedimentosDoAgendamento(props.agendamento);

  if (resumos.length === 0) {
    return;
  }

  const detalhes = await Promise.all(
    resumos.map(async (resumo) => {
      try {
        const procedimento = await procedimentoService.obter(resumo.id);
        const exigeQuantidade = Boolean(procedimento.produtoAplicadoId);
        let saldoAtual: number | null = null;
        let unidadeMedidaSigla = '';

        if (exigeQuantidade && procedimento.produtoAplicadoId && props.agendamento) {
          const saldo = await carregarSaldoProduto(
            props.agendamento.unidadeId,
            procedimento.produtoAplicadoId,
          );
          saldoAtual = saldo.saldoAtual;
          unidadeMedidaSigla = saldo.unidadeMedidaSigla;
        }

        return {
          procedimentoId: resumo.id,
          nome: procedimento.nome,
          exigeQuantidade,
          quantidadeUtilizada: null,
          produtoAplicadoNome: procedimento.produtoAplicadoNome ?? null,
          saldoAtual,
          unidadeMedidaSigla,
        };
      } catch {
        return {
          procedimentoId: resumo.id,
          nome: resumo.nome,
          exigeQuantidade: false,
          quantidadeUtilizada: null,
          produtoAplicadoNome: null,
          saldoAtual: null,
          unidadeMedidaSigla: '',
        };
      }
    }),
  );

  procedimentosConclusao.value = detalhes;
}

function montarPayloadConclusao(): ConcluirAgendamentoRequest {
  if (procedimentosConclusao.value.length <= 1) {
    return {
      quantidadeUtilizada: procedimentosConclusao.value[0]?.quantidadeUtilizada ?? null,
    };
  }

  return {
    procedimentos: procedimentosConclusao.value.map((procedimento) => ({
      procedimentoId: procedimento.procedimentoId,
      ...(procedimento.exigeQuantidade
        ? { quantidadeUtilizada: procedimento.quantidadeUtilizada }
        : {}),
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
  dialogConcluir.value = true;
  void carregarProcedimentosConclusao();
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
    <q-card style="min-width: 320px; max-width: 95vw">
      <q-card-section>
        <div class="text-h6">Concluir agendamento</div>
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
      <q-card-section class="q-gutter-md">
        <template v-if="conclusaoMultipla">
          <div
            v-for="procedimento in procedimentosConclusao"
            :key="procedimento.procedimentoId"
            class="agendamento-detalhe__procedimento-conclusao"
          >
            <template v-if="procedimento.exigeQuantidade">
              <div
                v-if="procedimento.produtoAplicadoNome"
                class="agendamento-detalhe__produto-nome agendamento-detalhe__produto-nome--destaque"
              >
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
              <p
                v-if="agendamento && procedimento.saldoAtual !== null"
                class="agendamento-detalhe__saldo-unidade"
              >
                Saldo na unidade {{ agendamento.unidadeNome }}:
                <span
                  class="agendamento-detalhe__saldo-valor"
                  :class="obterClasseSaldoProduto(procedimento.saldoAtual)"
                >
                  {{
                    formatarSaldoComUnidade(
                      procedimento.saldoAtual,
                      procedimento.unidadeMedidaSigla,
                    )
                  }}
                </span>
              </p>
            </template>
          </div>
        </template>
        <div
          v-else-if="exigeQuantidadeConclusao && procedimentosConclusao[0]"
          class="agendamento-detalhe__procedimento-conclusao"
        >
          <div
            v-if="procedimentosConclusao[0].produtoAplicadoNome"
            class="agendamento-detalhe__produto-nome agendamento-detalhe__produto-nome--destaque"
          >
            {{ procedimentosConclusao[0].produtoAplicadoNome }}
          </div>
          <q-input
            v-model.number="procedimentosConclusao[0].quantidadeUtilizada"
            label="Quantidade do produto utilizada *"
            type="number"
            outlined
            :disable="processando"
            min="0"
            step="0.01"
          />
          <p
            v-if="agendamento && procedimentosConclusao[0].saldoAtual !== null"
            class="agendamento-detalhe__saldo-unidade"
          >
            Saldo na unidade {{ agendamento.unidadeNome }}:
            <span
              class="agendamento-detalhe__saldo-valor"
              :class="obterClasseSaldoProduto(procedimentosConclusao[0].saldoAtual)"
            >
              {{
                formatarSaldoComUnidade(
                  procedimentosConclusao[0].saldoAtual,
                  procedimentosConclusao[0].unidadeMedidaSigla,
                )
              }}
            </span>
          </p>
        </div>
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
</style>
