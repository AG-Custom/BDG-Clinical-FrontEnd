<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import AgendamentoProdutosUtilizados from '@/components/agendamentos/AgendamentoProdutosUtilizados.vue';
import type { ProcedimentoConclusaoFormulario } from '@/components/agendamentos/conclusao-agendamento.types';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { CODIGOS_TIPO_PRODUTO } from '@/constants/tipos-produto';
import { agendamentoService } from '@/services/agendamento.service';
import { compraPacienteService } from '@/services/compra-paciente.service';
import { procedimentoService } from '@/services/procedimento.service';
import { produtoService } from '@/services/produto.service';
import { saldoEstoqueService } from '@/services/saldo-estoque.service';
import type { Agendamento, ConcluirAgendamentoRequest } from '@/types/entidades/agendamento';
import {
  formatarDataHoraAgendamento,
  obterProcedimentosDoAgendamento,
} from '@/types/entidades/agendamento';
import type { CompraPaciente } from '@/types/entidades/compra-paciente';
import type { ItemProcedimentoFormulario } from '@/types/entidades/procedimento';
import {
  formatarMensagemEstoqueInsuficiente,
  formatarSaldoComUnidade,
} from '@/types/entidades/saldo-estoque';
import type { SaldoLoteEstoque } from '@/types/entidades/saldo-estoque';
import type { Produto } from '@/types/entidades/produto';
import { normalizarLista } from '@/utils/normalizar-lista';

const props = defineProps<{
  modelValue: boolean;
  agendamento: Agendamento | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
  concluido: [];
}>();

const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const etapa = ref<'confirmacao' | 'formulario'>('confirmacao');
const processando = ref(false);
const carregando = ref(false);
const dialogAdicionarInsumo = ref(false);
const dialogRemoverInsumo = ref(false);
const produtosInsumos = ref<Produto[]>([]);
const compra = ref<CompraPaciente | null>(null);
const procedimentos = ref<ProcedimentoConclusaoFormulario[]>([]);
const procedimentoAdicionar = ref<ProcedimentoConclusaoFormulario | null>(null);
const novoInsumoProdutoId = ref<string | null>(null);
const procedimentoRemover = ref<ProcedimentoConclusaoFormulario | null>(null);
const insumoRemover = ref<ItemProcedimentoFormulario | null>(null);
const opcoesInsumosFiltradas = ref<{ label: string; value: string }[]>([]);
const saldosInsumos = ref<
  Record<string, { saldoAtual: number; unidadeMedidaSigla: string }>
>({});

const isAplicacao = computed(() => props.agendamento?.tipo === 'Aplicacao');
const produtosPorId = computed(
  () => new Map(produtosInsumos.value.map((produto) => [produto.id, produto])),
);
const produtosAplicados = computed(() =>
  procedimentos.value
    .filter((procedimento) => procedimento.exigeQuantidade && procedimento.produtoAplicadoNome)
    .map((procedimento) => procedimento.produtoAplicadoNome as string),
);

function fechar(): void {
  emit('update:modelValue', false);
}

function abrirFormulario(): void {
  etapa.value = 'formulario';
  void carregarFormulario();
}

async function carregarSaldoProduto(
  unidadeId: string,
  produtoId: string,
): Promise<{ saldoAtual: number; unidadeMedidaSigla: string }> {
  try {
    const saldo = (await saldoEstoqueService.listar({ unidadeId, produtoId }))[0];
    return {
      saldoAtual: saldo?.saldoAtual ?? 0,
      unidadeMedidaSigla: saldo?.unidadeMedidaSigla ?? '',
    };
  } catch {
    return { saldoAtual: 0, unidadeMedidaSigla: '' };
  }
}

function formatarOpcaoLote(lote: SaldoLoteEstoque): string {
  const saldo = formatarSaldoComUnidade(lote.saldoAtual, lote.unidadeMedidaSigla);
  return `${lote.codigo} · val. ${lote.dataValidade} · ${saldo}`;
}

function opcoesLotes(item: ProcedimentoConclusaoFormulario) {
  return item.lotesDisponiveis
    .filter((lote) => lote.saldoAtual > 0)
    .map((lote) => ({ label: formatarOpcaoLote(lote), value: lote.loteProdutoId }));
}

function opcoesInsumos(item: ProcedimentoConclusaoFormulario) {
  const selecionados = new Set(
    item.insumosManuais
      .map((insumo) => insumo.produtoId)
      .filter((id): id is string => Boolean(id)),
  );

  return produtosInsumos.value
    .filter(
      (produto) =>
        produto.id !== item.produtoAplicadoId &&
        !selecionados.has(produto.id) &&
        produto.ativo &&
        produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.INSUMO,
    )
    .map((produto) => ({ label: produto.nome, value: produto.id }));
}

function filtrarInsumos(
  valor: string,
  update: (callback: () => void) => void,
  procedimento: ProcedimentoConclusaoFormulario,
): void {
  update(() => {
    const opcoes = opcoesInsumos(procedimento);
    const termo = valor.trim().toLowerCase();
    opcoesInsumosFiltradas.value = termo
      ? opcoes.filter((opcao) => opcao.label.toLowerCase().includes(termo))
      : opcoes;
  });
}

function obterNomeProduto(produtoId: string | null): string {
  if (!produtoId) {
    return 'Produto não informado';
  }

  return produtosPorId.value.get(produtoId)?.nome ?? produtoId;
}

function abrirAdicionarInsumo(item: ProcedimentoConclusaoFormulario): void {
  procedimentoAdicionar.value = item;
  novoInsumoProdutoId.value = null;
  opcoesInsumosFiltradas.value = opcoesInsumos(item);
  dialogAdicionarInsumo.value = true;
}

function fecharAdicionarInsumo(): void {
  dialogAdicionarInsumo.value = false;
  procedimentoAdicionar.value = null;
  novoInsumoProdutoId.value = null;
}

async function confirmarAdicionarInsumo(): Promise<void> {
  const procedimento = procedimentoAdicionar.value;
  const produtoId = novoInsumoProdutoId.value;
  if (!procedimento || !produtoId || !props.agendamento) {
    return;
  }

  procedimento.insumosManuais.push({ produtoId, quantidade: 1 });
  fecharAdicionarInsumo();

  if (!saldosInsumos.value[produtoId]) {
    saldosInsumos.value[produtoId] = await carregarSaldoProduto(
      props.agendamento.unidadeId,
      produtoId,
    );
  }
}

function diminuirInsumo(item: ProcedimentoConclusaoFormulario, indice: number): void {
  const insumo = item.insumosManuais[indice];
  if (!insumo) {
    return;
  }

  const quantidade = Number(insumo.quantidade ?? 0);
  if (!Number.isFinite(quantidade) || quantidade <= 1) {
    procedimentoRemover.value = item;
    insumoRemover.value = insumo;
    dialogRemoverInsumo.value = true;
    return;
  }

  insumo.quantidade = Math.round((quantidade - 1) * 10000) / 10000;
}

function aumentarInsumo(item: ProcedimentoConclusaoFormulario, indice: number): void {
  const insumo = item.insumosManuais[indice];
  if (!insumo) {
    return;
  }

  const quantidade = Number(insumo.quantidade ?? 0);
  insumo.quantidade =
    Math.round(((Number.isFinite(quantidade) ? quantidade : 0) + 1) * 10000) / 10000;
}

function fecharRemoverInsumo(): void {
  dialogRemoverInsumo.value = false;
  procedimentoRemover.value = null;
  insumoRemover.value = null;
}

function confirmarRemoverInsumo(): void {
  if (procedimentoRemover.value && insumoRemover.value) {
    const indice = procedimentoRemover.value.insumosManuais.indexOf(insumoRemover.value);
    if (indice >= 0) {
      procedimentoRemover.value.insumosManuais.splice(indice, 1);
    }
  }
  fecharRemoverInsumo();
}

async function carregarProcedimento(
  resumo: { id: string; nome: string },
  unidadeId: string,
): Promise<ProcedimentoConclusaoFormulario> {
  try {
    const procedimento = await procedimentoService.obter(resumo.id);
    const exigeQuantidade = Boolean(procedimento.produtoAplicadoId);
    let saldoAtual: number | null = null;
    let unidadeMedidaSigla = '';
    let exigeLote = false;
    let lotesDisponiveis: SaldoLoteEstoque[] = [];

    if (exigeQuantidade && procedimento.produtoAplicadoId) {
      const [saldo, produto] = await Promise.all([
        carregarSaldoProduto(unidadeId, procedimento.produtoAplicadoId),
        produtoService.obter(procedimento.produtoAplicadoId),
      ]);
      saldoAtual = saldo.saldoAtual;
      unidadeMedidaSigla = saldo.unidadeMedidaSigla;
      exigeLote =
        produto.controlaEstoque &&
        produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.MEDICAMENTO;

      if (exigeLote) {
        lotesDisponiveis = (
          await saldoEstoqueService.listarLotes({
            unidadeId,
            produtoId: procedimento.produtoAplicadoId,
          })
        ).filter((lote) => lote.saldoAtual > 0);
      }
    }

    return {
      procedimentoId: resumo.id,
      nome: procedimento.nome,
      exigeQuantidade,
      exigeLote,
      quantidadeUtilizada: null,
      loteProdutoId: null,
      consumirInsumosKit: false,
      insumosManuais: procedimento.itens.map((insumo) => ({
        produtoId: insumo.produtoId,
        quantidade: insumo.quantidade,
      })),
      lotesDisponiveis,
      carregandoLotes: false,
      insumos: procedimento.itens,
      produtoAplicadoId: procedimento.produtoAplicadoId,
      produtoAplicadoNome: procedimento.produtoAplicadoNome ?? null,
      saldoAtual,
      unidadeMedidaSigla,
    };
  } catch {
    return {
      procedimentoId: resumo.id,
      nome: resumo.nome,
      exigeQuantidade: false,
      exigeLote: false,
      quantidadeUtilizada: null,
      loteProdutoId: null,
      consumirInsumosKit: false,
      insumosManuais: [],
      lotesDisponiveis: [],
      carregandoLotes: false,
      insumos: [],
      produtoAplicadoId: null,
      produtoAplicadoNome: null,
      saldoAtual: null,
      unidadeMedidaSigla: '',
    };
  }
}

async function carregarFormulario(): Promise<void> {
  const agendamento = props.agendamento;
  if (!agendamento) {
    return;
  }

  carregando.value = true;
  procedimentos.value = [];
  compra.value = null;
  saldosInsumos.value = {};

  try {
    const [produtos, compraCarregada] = await Promise.all([
      produtoService.listar().catch((): Produto[] => []),
      agendamento.compraPacienteId
        ? compraPacienteService.obter(agendamento.compraPacienteId).catch(() => null)
        : Promise.resolve(null),
    ]);
    produtosInsumos.value = normalizarLista(produtos).filter(
      (produto) => produto.tipoProdutoCodigo === CODIGOS_TIPO_PRODUTO.INSUMO,
    );
    compra.value = compraCarregada;

    const resumos = obterProcedimentosDoAgendamento(agendamento);
    procedimentos.value = await Promise.all(
      resumos.map((resumo) => carregarProcedimento(resumo, agendamento.unidadeId)),
    );

    const ids = [
      ...new Set(
        procedimentos.value.flatMap((item) =>
          item.insumosManuais
            .map((insumo) => insumo.produtoId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ];
    const saldos = await Promise.all(
      ids.map(async (produtoId) => ({
        produtoId,
        saldo: await carregarSaldoProduto(agendamento.unidadeId, produtoId),
      })),
    );
    saldosInsumos.value = Object.fromEntries(
      saldos.map(({ produtoId, saldo }) => [produtoId, saldo]),
    );
  } finally {
    carregando.value = false;
  }
}

function validarInsumos(item: ProcedimentoConclusaoFormulario): string | null {
  for (const insumo of item.insumosManuais) {
    if (!insumo.produtoId) return 'Selecione o produto de cada insumo.';
    if (!insumo.quantidade || insumo.quantidade <= 0) return 'Informe uma quantidade válida.';
  }
  const ids = item.insumosManuais.map((insumo) => insumo.produtoId).filter(Boolean);
  return new Set(ids).size === ids.length ? null : 'Não é permitido repetir o mesmo insumo.';
}

function camposProcedimento(item: ProcedimentoConclusaoFormulario) {
  const insumosManuais = item.insumosManuais
    .filter(
      (insumo): insumo is { produtoId: string; quantidade: number } =>
        Boolean(insumo.produtoId) && Boolean(insumo.quantidade && insumo.quantidade > 0),
    )
    .map((insumo) => ({ produtoId: insumo.produtoId, quantidade: insumo.quantidade }));

  return {
    ...(item.exigeQuantidade ? { quantidadeUtilizada: item.quantidadeUtilizada } : {}),
    ...(item.exigeLote && item.loteProdutoId ? { loteProdutoId: item.loteProdutoId } : {}),
    consumirInsumosKit: false,
    ...(insumosManuais.length > 0 ? { insumosManuais } : {}),
  };
}

function montarPayload(): ConcluirAgendamentoRequest {
  if (procedimentos.value.length <= 1) {
    const item = procedimentos.value[0];
    return item ? camposProcedimento(item) : {};
  }

  return {
    procedimentos: procedimentos.value.map((item) => ({
      procedimentoId: item.procedimentoId,
      ...camposProcedimento(item),
    })),
  };
}

function formatarErro(erro: unknown): string {
  const mensagem = obterMensagem(erro);
  const relacionado = procedimentos.value.find(
    (item) => item.produtoAplicadoNome && mensagem.includes(item.produtoAplicadoNome),
  );
  return formatarMensagemEstoqueInsuficiente(mensagem, {
    unidadeNome: props.agendamento?.unidadeNome,
    unidadeMedidaSigla: relacionado?.unidadeMedidaSigla,
  });
}

async function concluir(): Promise<void> {
  if (!props.agendamento) return;

  if (procedimentos.value.some((item) => item.exigeQuantidade && item.quantidadeUtilizada === null)) {
    notificacao.info('Informe a quantidade aplicada em todos os procedimentos com medicamento.');
    return;
  }

  const erroInsumos = procedimentos.value.map(validarInsumos).find(Boolean);
  if (erroInsumos) {
    notificacao.info(erroInsumos);
    return;
  }

  processando.value = true;
  try {
    await agendamentoService.concluir(props.agendamento.id, montarPayload());
    notificacao.sucesso('Agendamento concluído.');
    fechar();
    emit('concluido');
  } catch (erro) {
    notificacao.erro(formatarErro(erro));
  } finally {
    processando.value = false;
  }
}

watch(
  () => props.modelValue,
  (aberto) => {
    if (!aberto) {
      dialogAdicionarInsumo.value = false;
      dialogRemoverInsumo.value = false;
      return;
    }

    etapa.value = isAplicacao.value ? 'confirmacao' : 'formulario';
    if (etapa.value === 'formulario') void carregarFormulario();
  },
);
</script>

<template>
  <q-dialog
    :model-value="modelValue && etapa === 'confirmacao'"
    persistent
    @update:model-value="!$event && fechar()"
  >
    <q-card class="confirmacao-aplicacao">
      <q-card-section class="row items-start no-wrap q-gutter-md">
        <q-avatar color="primary" text-color="white" icon="vaccines" />
        <div>
          <div class="text-h6">Realizar aplicação?</div>
          <div class="text-body2 text-grey-7 q-mt-xs">
            Este é um agendamento de aplicação. Deseja registrar a aplicação agora antes de concluir?
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Não, voltar" color="primary" no-caps @click="fechar" />
        <q-btn
          unelevated
          label="Sim, fazer aplicação"
          color="primary"
          icon-right="arrow_forward"
          no-caps
          @click="abrirFormulario"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog
    :model-value="modelValue && etapa === 'formulario'"
    persistent
    @update:model-value="!$event && fechar()"
  >
    <q-card class="conclusao-agendamento">
      <q-card-section>
        <div class="text-h5 text-weight-medium">
          {{ isAplicacao ? 'Registrar aplicação' : 'Concluir agendamento' }}
        </div>
        <p class="text-body2 text-grey-7 q-mb-none q-mt-sm">
          <template v-if="produtosAplicados.length === 0">
            Confira os dados e os produtos utilizados no atendimento.
          </template>
          <template v-else>
            Serão registradas as aplicações e movimentações de estoque para
            <strong>{{ produtosAplicados.join(', ') }}</strong>.
          </template>
        </p>
      </q-card-section>

      <q-separator />
      <q-card-section class="conclusao-agendamento__conteudo scroll q-gutter-md">
        <div v-if="agendamento" class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input :model-value="agendamento.unidadeNome" label="Unidade" outlined readonly />
          </div>
          <div class="col-12 col-md-6">
            <q-input :model-value="agendamento.pacienteNome" label="Paciente" outlined readonly />
          </div>
          <div class="col-12 col-md-6">
            <q-input :model-value="agendamento.funcionarioNome" label="Aplicador" outlined readonly />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              :model-value="formatarDataHoraAgendamento(agendamento.dataInicio)"
              label="Data da aplicação"
              outlined
              readonly
            />
          </div>
        </div>

        <q-card v-if="compra" flat bordered class="conclusao-agendamento__compra">
          <q-card-section>
            <div class="text-caption text-grey-7">Pacote/compra vinculado ao agendamento</div>
            <div class="text-subtitle1 text-weight-medium">{{ compra.pacoteNome }}</div>
            <div class="row q-col-gutter-md q-mt-sm">
              <div v-for="saldo in compra.saldo.produtos" :key="saldo.produtoId" class="col-12 col-sm-6">
                <strong>{{ saldo.produtoNome }}:</strong>
                {{ formatarSaldoComUnidade(saldo.quantidadeRestante, saldo.unidadeMedida) }} restantes
                <span class="text-grey-7">
                  (de {{ formatarSaldoComUnidade(saldo.quantidadeContratada, saldo.unidadeMedida) }})
                </span>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <div v-if="carregando" class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="42px" />
        </div>

        <div
          v-for="procedimento in procedimentos"
          :key="procedimento.procedimentoId"
          class="conclusao-agendamento__procedimento"
        >
          <div class="text-h6 q-mb-sm">{{ procedimento.nome }}</div>
          <template v-if="procedimento.exigeQuantidade">
            <div v-if="procedimento.produtoAplicadoNome" class="text-body2 q-mb-xs">
              <span class="text-weight-medium">Produto aplicado:</span>
              {{ procedimento.produtoAplicadoNome }}
            </div>
            <q-input
              v-model.number="procedimento.quantidadeUtilizada"
              label="Quantidade do produto utilizada *"
              type="number"
              outlined
              min="0"
              step="0.01"
              :disable="processando"
            />
            <q-select
              v-if="procedimento.exigeLote"
              v-model="procedimento.loteProdutoId"
              class="q-mt-sm"
              :options="opcoesLotes(procedimento)"
              label="Lote do medicamento (opcional)"
              outlined
              emit-value
              map-options
              clearable
              :disable="processando || procedimento.carregandoLotes"
              :hint="
                opcoesLotes(procedimento).length === 0
                  ? 'Nenhum lote com saldo nesta unidade. Pode concluir sem lote por enquanto.'
                  : 'Opcional por enquanto — informe se já houver entrada com lote.'
              "
            />
          </template>

          <agendamento-produtos-utilizados
            :procedimento="procedimento"
            :produtos="produtosInsumos"
            :saldos-insumos="saldosInsumos"
            :disable="processando"
            @adicionar="abrirAdicionarInsumo(procedimento)"
            @diminuir="diminuirInsumo(procedimento, $event)"
            @aumentar="aumentarInsumo(procedimento, $event)"
          />
        </div>
      </q-card-section>

      <q-separator />
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Voltar" color="primary" no-caps :disable="processando" @click="fechar" />
        <q-btn
          unelevated
          :label="isAplicacao ? 'Concluir e registrar aplicação' : 'Concluir'"
          color="positive"
          no-caps
          :loading="processando"
          :disable="carregando"
          @click="concluir"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="dialogAdicionarInsumo" persistent>
    <q-card class="dialog-insumo">
      <q-card-section>
        <div class="text-h6">Adicionar insumo</div>
        <div class="text-body2 text-grey-7 q-mt-xs">Selecione o produto que foi utilizado.</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-select
          v-model="novoInsumoProdutoId"
          :options="opcoesInsumosFiltradas"
          label="Insumo *"
          outlined
          emit-value
          map-options
          use-input
          input-debounce="200"
          autofocus
          @filter="(valor, update) => procedimentoAdicionar && filtrarInsumos(valor, update, procedimentoAdicionar)"
        />
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Cancelar" color="primary" no-caps @click="fecharAdicionarInsumo" />
        <q-btn
          unelevated
          label="Adicionar"
          color="primary"
          no-caps
          :disable="!novoInsumoProdutoId"
          @click="confirmarAdicionarInsumo"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="dialogRemoverInsumo" persistent>
    <q-card class="dialog-insumo">
      <q-card-section>
        <div class="text-h6">Remover insumo?</div>
        <div class="text-body2 text-grey-7 q-mt-xs">
          Deseja remover {{ obterNomeProduto(insumoRemover?.produtoId ?? null) }} dos produtos utilizados?
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Cancelar" color="primary" no-caps @click="fecharRemoverInsumo" />
        <q-btn unelevated label="Remover" color="negative" no-caps @click="confirmarRemoverInsumo" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.confirmacao-aplicacao {
  max-width: 92vw;
  width: 480px;
}

.conclusao-agendamento {
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  max-width: 96vw;
  width: 1120px;

  &__conteudo {
    flex: 1 1 auto;
    min-height: 0;
    padding: var(--ds-space-5, 24px);
  }

  &__compra {
    background: var(--ds-bg-subtle);
  }

  &__procedimento {
    border: 1px solid var(--ds-border-default, #e0e0e0);
    border-radius: var(--ds-radius-lg, 16px);
    display: flex;
    flex-direction: column;
    gap: var(--ds-space-2, 8px);
    padding: var(--ds-space-4, 16px);
  }
}

.dialog-insumo {
  max-width: 92vw;
  width: 460px;
}

@media (max-width: 599px) {
  .conclusao-agendamento {
    max-height: 96vh;
    max-width: 98vw;
    width: 98vw;

    &__conteudo {
      padding: var(--ds-space-3, 12px);
    }
  }
}
</style>
