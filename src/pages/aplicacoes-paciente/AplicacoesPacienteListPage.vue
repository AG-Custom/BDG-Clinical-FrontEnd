<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAplicador } from '@/composables/useAplicador';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { aplicacaoPacienteService } from '@/services/aplicacao-paciente.service';
import { cargoService } from '@/services/cargo.service';
import { funcionarioService } from '@/services/funcionario.service';
import { pacienteService } from '@/services/paciente.service';
import { produtoService } from '@/services/produto.service';
import { procedimentoService } from '@/services/procedimento.service';
import { unidadeService } from '@/services/unidade.service';
import type { AplicacaoPaciente } from '@/types/entidades/aplicacao-paciente';
import {
  formatarDataAplicacao,
  formatarItemAplicado,
  formatarResumoSintomas,
} from '@/types/entidades/aplicacao-paciente';
import { isFuncionarioAplicador } from '@/types/entidades/funcionario';
import type { Funcionario } from '@/types/entidades/funcionario';
import type { Cargo } from '@/types/entidades/cargo';
import {
  deDataParaFimDiaIso,
  deDataParaInicioDiaIso,
} from '@/types/entidades/movimentacao-estoque';
import type { Paciente } from '@/types/entidades/paciente';
import type { Produto } from '@/types/entidades/produto';
import type { Procedimento } from '@/types/entidades/procedimento';
import type { Unidade } from '@/types/entidades/unidade';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { podeGerenciarAplicacoes } = useAplicador();

const aplicacoes = ref<AplicacaoPaciente[]>([]);
const unidades = ref<Unidade[]>([]);
const pacientes = ref<Paciente[]>([]);
const produtos = ref<Produto[]>([]);
const procedimentos = ref<Procedimento[]>([]);
const funcionarios = ref<Funcionario[]>([]);
const cargos = ref<Cargo[]>([]);
const carregando = ref(true);
const filtroUnidadeId = ref<string | null>(null);
const filtroPacienteId = ref<string | null>(null);
const filtroProdutoId = ref<string | null>(null);
const filtroProcedimentoId = ref<string | null>(null);
const filtroAplicadorId = ref<string | null>(null);
const filtroCancelada = ref<boolean | null>(null);
const filtroDataInicio = ref('');
const filtroDataFim = ref('');
const dialogCancelar = ref(false);
const aplicacaoSelecionada = ref<AplicacaoPaciente | null>(null);
const cancelando = ref(false);

const colunas = [
  {
    name: 'dataAplicacao',
    label: 'Data',
    field: 'dataAplicacao',
    align: 'left' as const,
    sortable: true,
  },
  { name: 'paciente', label: 'Paciente', field: 'pacienteNome', align: 'left' as const },
  {
    name: 'itemAplicado',
    label: 'Item aplicado',
    field: 'itemAplicado',
    align: 'left' as const,
  },
  {
    name: 'quantidade',
    label: 'Qtd',
    field: 'quantidadeUtilizada',
    align: 'right' as const,
  },
  { name: 'aplicador', label: 'Aplicador', field: 'aplicadorNome', align: 'left' as const },
  { name: 'unidade', label: 'Unidade', field: 'unidadeNome', align: 'left' as const },
  { name: 'sintomas', label: 'Sintomas', field: 'sintomas', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'cancelada', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

const opcoesStatusFiltro = [
  { label: 'Todos os status', value: null },
  { label: 'Realizadas', value: false },
  { label: 'Canceladas', value: true },
];

const opcoesUnidadesFiltro = computed(() => [
  { label: 'Todas as unidades', value: null },
  ...unidades.value.map((unidade) => ({
    label: unidade.ativo ? unidade.nome : `${unidade.nome} (inativa)`,
    value: unidade.id,
  })),
]);

const opcoesPacientesFiltro = computed(() => [
  { label: 'Todos os pacientes', value: null },
  ...pacientes.value.map((paciente) => ({
    label: paciente.ativo ? paciente.nome : `${paciente.nome} (inativo)`,
    value: paciente.id,
  })),
]);

const opcoesProdutosFiltro = computed(() => [
  { label: 'Todos os produtos', value: null },
  ...produtos.value.map((produto) => ({
    label: produto.ativo ? produto.nome : `${produto.nome} (inativo)`,
    value: produto.id,
  })),
]);

const opcoesProcedimentosFiltro = computed(() => [
  { label: 'Todos os procedimentos', value: null },
  ...procedimentos.value.map((procedimento) => ({
    label: procedimento.ativo ? procedimento.nome : `${procedimento.nome} (inativo)`,
    value: procedimento.id,
  })),
]);

const cargosPorId = computed(
  () => new Map(cargos.value.map((cargo) => [cargo.id, cargo])),
);

const aplicadoresDisponiveis = computed(() =>
  funcionarios.value.filter((funcionario) =>
    isFuncionarioAplicador(funcionario, cargosPorId.value),
  ),
);

const opcoesAplicadoresFiltro = computed(() => [
  { label: 'Todos os aplicadores', value: null },
  ...aplicadoresDisponiveis.value.map((funcionario) => ({
    label: funcionario.ativo ? funcionario.nome : `${funcionario.nome} (inativo)`,
    value: funcionario.id,
  })),
]);

async function carregarPacientesFiltro(): Promise<void> {
  if (!filtroUnidadeId.value) {
    pacientes.value = [];
    return;
  }

  try {
    pacientes.value = await pacienteService.listar({
      unidadeId: filtroUnidadeId.value,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarAplicadoresFiltro(): Promise<void> {
  if (!filtroUnidadeId.value) {
    funcionarios.value = [];
    return;
  }

  try {
    funcionarios.value = await funcionarioService.listar({
      unidadeId: filtroUnidadeId.value,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarFiltros(): Promise<void> {
  try {
    const [listaUnidades, listaProdutos, listaProcedimentos, listaCargos] = await Promise.all([
      unidadeService.listar(true),
      produtoService.listar(),
      procedimentoService.listar({ includeInactive: true }),
      cargoService.listar(true),
    ]);

    unidades.value = listaUnidades;
    produtos.value = listaProdutos;
    procedimentos.value = listaProcedimentos;
    cargos.value = listaCargos;

    await Promise.all([carregarPacientesFiltro(), carregarAplicadoresFiltro()]);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarAplicacoes(): Promise<void> {
  carregando.value = true;

  try {
    aplicacoes.value = await aplicacaoPacienteService.listar({
      unidadeId: filtroUnidadeId.value ?? undefined,
      pacienteId: filtroPacienteId.value ?? undefined,
      produtoId: filtroProdutoId.value ?? undefined,
      procedimentoId: filtroProcedimentoId.value ?? undefined,
      aplicadorId: filtroAplicadorId.value ?? undefined,
      cancelada: filtroCancelada.value ?? undefined,
      dataInicio: filtroDataInicio.value
        ? deDataParaInicioDiaIso(filtroDataInicio.value)
        : undefined,
      dataFim: filtroDataFim.value ? deDataParaFimDiaIso(filtroDataFim.value) : undefined,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

async function onFiltroUnidadeChange(): Promise<void> {
  filtroPacienteId.value = null;
  filtroAplicadorId.value = null;
  await Promise.all([carregarPacientesFiltro(), carregarAplicadoresFiltro()]);
  await carregarAplicacoes();
}

function abrirDialogCancelar(aplicacao: AplicacaoPaciente): void {
  aplicacaoSelecionada.value = aplicacao;
  dialogCancelar.value = true;
}

async function confirmarCancelar(): Promise<void> {
  if (!aplicacaoSelecionada.value) {
    return;
  }

  cancelando.value = true;

  try {
    await aplicacaoPacienteService.cancelar(aplicacaoSelecionada.value.id);
    notificacao.sucesso('Aplicação cancelada com sucesso. Estoque estornado.');
    dialogCancelar.value = false;
    aplicacaoSelecionada.value = null;
    await carregarAplicacoes();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    cancelando.value = false;
  }
}

function editarAplicacao(id: string): void {
  router.push({ name: 'aplicacoes-paciente-editar', params: { id } });
}

onMounted(async () => {
  await carregarFiltros();
  await carregarAplicacoes();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Aplicações em pacientes"
      subtitulo="Registre aplicações realizadas e acompanhe o consumo de estoque."
    >
      <q-btn
        color="primary"
        label="Nova aplicação"
        icon="add"
        unelevated
        no-caps
        :disable="!podeGerenciarAplicacoes"
        :to="podeGerenciarAplicacoes ? { name: 'aplicacoes-paciente-nova' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroUnidadeId"
              :options="opcoesUnidadesFiltro"
              label="Unidade"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="onFiltroUnidadeChange"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroPacienteId"
              :options="opcoesPacientesFiltro"
              label="Paciente"
              outlined
              dense
              emit-value
              map-options
              :disable="!filtroUnidadeId"
              @update:model-value="carregarAplicacoes"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroProdutoId"
              :options="opcoesProdutosFiltro"
              label="Produto"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarAplicacoes"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroProcedimentoId"
              :options="opcoesProcedimentosFiltro"
              label="Procedimento"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarAplicacoes"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroAplicadorId"
              :options="opcoesAplicadoresFiltro"
              label="Aplicador"
              outlined
              dense
              emit-value
              map-options
              :disable="!filtroUnidadeId"
              @update:model-value="carregarAplicacoes"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroCancelada"
              :options="opcoesStatusFiltro"
              label="Status"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarAplicacoes"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="filtroDataInicio"
              label="Data início"
              outlined
              dense
              type="date"
              clearable
              @update:model-value="carregarAplicacoes"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="filtroDataFim"
              label="Data fim"
              outlined
              dense
              type="date"
              clearable
              @update:model-value="carregarAplicacoes"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="aplicacoes.length > 0"
        :rows="aplicacoes"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-dataAplicacao="props">
          <q-td :props="props">
            {{ formatarDataAplicacao(props.row.dataAplicacao) }}
          </q-td>
        </template>

        <template #body-cell-itemAplicado="props">
          <q-td :props="props">
            {{ formatarItemAplicado(props.row) }}
          </q-td>
        </template>

        <template #body-cell-quantidade="props">
          <q-td :props="props">
            {{
              props.row.quantidadeUtilizada !== null && props.row.quantidadeUtilizada !== undefined
                ? props.row.quantidadeUtilizada.toLocaleString('pt-BR')
                : '—'
            }}
          </q-td>
        </template>

        <template #body-cell-sintomas="props">
          <q-td :props="props">
            {{ formatarResumoSintomas(props.row.sintomas) }}
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.cancelada ? 'negative' : 'positive'"
              :label="props.row.cancelada ? 'Cancelada' : 'Realizada'"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <app-table-action-button
              acao="visualizar"
              rotulo="Ver ou editar aplicação"
              @click="editarAplicacao(cell.row.id)"
            />
            <app-table-action-button
              v-if="!cell.row.cancelada"
              acao="cancelar"
              rotulo="Cancelar aplicação"
              :disable="!podeGerenciarAplicacoes"
              @click="abrirDialogCancelar(cell.row)"
            />
          </app-table-actions-cell>
        </template>
      </q-table>

      <q-card-section v-else-if="carregando">
        <app-table-skeleton :columns="colunas.length" />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="vaccines"
          titulo="Nenhuma aplicação registrada"
          texto="Registre aplicações realizadas nos pacientes."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Nova aplicação"
            icon="add"
            unelevated
            no-caps
            :disable="!podeGerenciarAplicacoes"
            :to="podeGerenciarAplicacoes ? { name: 'aplicacoes-paciente-nova' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogCancelar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Cancelar aplicação</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja cancelar a aplicação de
          <strong>{{ aplicacaoSelecionada ? formatarItemAplicado(aplicacaoSelecionada) : '' }}</strong>
          em <strong>{{ aplicacaoSelecionada?.pacienteNome }}</strong>?
          O estoque será estornado.
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
