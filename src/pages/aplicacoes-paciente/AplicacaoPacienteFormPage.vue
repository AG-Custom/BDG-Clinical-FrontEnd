<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
import { isAplicadorHabilitadoNaUnidade } from '@/types/entidades/funcionario';
import type { Funcionario } from '@/types/entidades/funcionario';
import { formatarSaldoComUnidade } from '@/types/entidades/saldo-estoque';
import type { Paciente } from '@/types/entidades/paciente';
import type { Produto } from '@/types/entidades/produto';
import type { Sintoma } from '@/types/entidades/sintoma';
import type { Unidade } from '@/types/entidades/unidade';

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

const opcoesUnidades = computed(() =>
  unidadesDisponiveis.value.map((unidade) => ({
    label: unidade.ativo ? unidade.nome : `${unidade.nome} (inativa)`,
    value: unidade.id,
  })),
);

const opcoesPacientes = computed(() =>
  pacientesDisponiveis.value.map((paciente) => ({
    label: paciente.ativo ? paciente.nome : `${paciente.nome} (inativo)`,
    value: paciente.id,
  })),
);

const opcoesProdutos = computed(() =>
  produtosDisponiveis.value.map((produto) => ({
    label: produto.ativo ? produto.nome : `${produto.nome} (inativo)`,
    value: produto.id,
  })),
);

const produtosPorId = computed(
  () => new Map(produtosDisponiveis.value.map((produto) => [produto.id, produto])),
);

const aplicadoresFiltrados = computed(() => {
  if (!form.unidadeId) {
    return [];
  }

  return funcionariosDisponiveis.value.filter((funcionario) =>
    isAplicadorHabilitadoNaUnidade(funcionario, form.unidadeId!),
  );
});

const opcoesAplicadores = computed(() =>
  aplicadoresFiltrados.value.map((funcionario) => ({
    label: funcionario.ativo ? funcionario.nome : `${funcionario.nome} (inativo)`,
    value: funcionario.id,
  })),
);

const opcoesSintomas = computed(() =>
  sintomasDisponiveis.value.map((sintoma) => ({
    label: sintoma.ativo ? sintoma.nome : `${sintoma.nome} (inativo)`,
    value: sintoma.id,
  })),
);

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

const podeEditarCampos = computed(
  () => podeGerenciarAplicacoes.value && !somenteLeitura.value,
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

    unidadesDisponiveis.value = listaUnidades;
    produtosDisponiveis.value = listaProdutos;
    funcionariosDisponiveis.value = listaFuncionarios;
    sintomasDisponiveis.value = listaSintomas;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
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
  <q-page class="page-content page-content--fluid q-pa-md">
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
              <q-select
                v-model="form.unidadeId"
                :options="opcoesUnidades"
                label="Unidade"
                outlined
                emit-value
                map-options
                :rules="[validarUnidade]"
                :readonly="!podeEditarCampos || camposImutaveis"
                :disable="!podeEditarCampos || camposImutaveis || opcoesUnidades.length === 0"
                @update:model-value="onUnidadeChange"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.pacienteId"
                :options="opcoesPacientes"
                label="Paciente"
                outlined
                emit-value
                map-options
                :rules="[validarPaciente]"
                :readonly="!podeEditarCampos || camposImutaveis"
                :disable="
                  !podeEditarCampos ||
                  camposImutaveis ||
                  !form.unidadeId ||
                  opcoesPacientes.length === 0
                "
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.produtoId"
                :options="opcoesProdutos"
                label="Produto"
                outlined
                emit-value
                map-options
                :rules="[validarProduto]"
                :readonly="!podeEditarCampos || camposImutaveis"
                :disable="!podeEditarCampos || camposImutaveis || opcoesProdutos.length === 0"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model.number="form.quantidadeUtilizada"
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
              <q-select
                v-model="form.aplicadorId"
                :options="opcoesAplicadores"
                label="Aplicador"
                outlined
                emit-value
                map-options
                :rules="[validarAplicador]"
                :readonly="!podeEditarCampos || camposImutaveis"
                :disable="
                  !podeEditarCampos ||
                  camposImutaveis ||
                  !form.unidadeId ||
                  opcoesAplicadores.length === 0
                "
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.dataAplicacao"
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
                :disable="!podeEditarCampos || opcoesSintomas.length === 0"
              />
            </div>
          </div>

          <q-input
            v-model="form.observacao"
            label="Observações (opcional)"
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
