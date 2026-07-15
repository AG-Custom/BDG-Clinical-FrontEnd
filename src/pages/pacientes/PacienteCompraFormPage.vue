<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { compraPacienteService } from '@/services/compra-paciente.service';
import { pacienteService } from '@/services/paciente.service';
import { pacoteService } from '@/services/pacote.service';
import { unidadeService } from '@/services/unidade.service';
import type { Paciente } from '@/types/entidades/paciente';
import { obterUnidadeIdsDoPaciente } from '@/types/entidades/paciente';
import type { Pacote } from '@/types/entidades/pacote';
import { formatarValorPacote } from '@/types/entidades/pacote';
import type { Unidade } from '@/types/entidades/unidade';
import {
  deInputDatetimeLocalParaIso,
  deIsoBackendParaInputDatetimeLocal,
} from '@/utils/data-hora';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.comprasPaciente.criar);

const pacienteFixoNaRota = computed(() => route.name === 'pacientes-compras-nova');
const pacienteIdDaRota = computed(() =>
  pacienteFixoNaRota.value ? (route.params.id as string | undefined) : undefined,
);

const pacientesDisponiveis = ref<Paciente[]>([]);
const pacienteNome = ref('');
const unidadesDoPaciente = ref<string[]>([]);
const pacotesDisponiveis = ref<Pacote[]>([]);
const unidadesDisponiveis = ref<Unidade[]>([]);
const dadosIniciaisCarregados = ref(false);
const salvando = ref(false);

const form = reactive({
  pacienteId: null as string | null,
  pacoteId: null as string | null,
  unidadeId: null as string | null,
  dataCompra: '',
  observacao: '',
});

const opcoesPacientes = computed(() => {
  const ativos = pacientesDisponiveis.value.filter((paciente) => paciente.ativo);
  const selecionado = form.pacienteId
    ? pacientesDisponiveis.value.find((paciente) => paciente.id === form.pacienteId)
    : null;

  const lista =
    selecionado && !ativos.some((paciente) => paciente.id === selecionado.id)
      ? [selecionado, ...ativos]
      : ativos;

  return lista.map((paciente) => ({
    label: paciente.nome,
    value: paciente.id,
  }));
});

const opcoesPacotes = computed(() =>
  pacotesDisponiveis.value
    .filter((pacote) => pacote.ativo)
    .map((pacote) => ({
      label: `${pacote.nome} — ${formatarValorPacote(pacote.valor)}`,
      value: pacote.id,
    })),
);

const opcoesUnidades = computed(() =>
  unidadesDisponiveis.value
    .filter(
      (unidade) =>
        unidade.ativo &&
        (unidadesDoPaciente.value.length === 0 ||
          unidadesDoPaciente.value.includes(unidade.id)),
    )
    .map((unidade) => ({
      label: unidade.nome,
      value: unidade.id,
    })),
);

const pacoteSelecionado = computed(
  () => pacotesDisponiveis.value.find((pacote) => pacote.id === form.pacoteId) ?? null,
);

const mostrarAlertaPacientes = computed(
  () =>
    !pacienteFixoNaRota.value &&
    dadosIniciaisCarregados.value &&
    opcoesPacientes.value.length === 0,
);

const mostrarAlertaPacotes = computed(
  () => dadosIniciaisCarregados.value && opcoesPacotes.value.length === 0,
);

const mostrarAlertaUnidades = computed(
  () =>
    dadosIniciaisCarregados.value &&
    Boolean(form.pacienteId) &&
    opcoesUnidades.value.length === 0,
);

const rotaRetorno = computed(() => {
  if (pacienteFixoNaRota.value) {
    const id = form.pacienteId ?? pacienteIdDaRota.value;
    if (id) {
      return { name: 'pacientes-compras' as const, params: { id } };
    }
  }

  return { name: 'compras' as const };
});

function validarPaciente(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o paciente';
}

function validarPacote(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione o pacote';
}

function validarUnidade(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione a unidade';
}

function validarDataCompra(value: string): boolean | string {
  return Boolean(value) || 'Informe a data da compra';
}

function aplicarPaciente(paciente: Paciente): void {
  form.pacienteId = paciente.id;
  pacienteNome.value = paciente.nome;
  unidadesDoPaciente.value = obterUnidadeIdsDoPaciente(paciente);
  form.unidadeId = null;

  if (!pacientesDisponiveis.value.some((item) => item.id === paciente.id)) {
    pacientesDisponiveis.value = [paciente, ...pacientesDisponiveis.value];
  }

  if (opcoesUnidades.value.length === 1) {
    form.unidadeId = opcoesUnidades.value[0].value;
  }
}

async function onPacienteChange(pacienteId: string | null): Promise<void> {
  if (!pacienteId) {
    form.pacienteId = null;
    pacienteNome.value = '';
    unidadesDoPaciente.value = [];
    form.unidadeId = null;
    return;
  }

  const pacienteLista = pacientesDisponiveis.value.find((paciente) => paciente.id === pacienteId);

  if (pacienteLista) {
    aplicarPaciente(pacienteLista);
    return;
  }

  try {
    const paciente = await pacienteService.obter(pacienteId);
    aplicarPaciente(paciente);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarDados(): Promise<void> {
  try {
    const pacienteQuery =
      typeof route.query.pacienteId === 'string' && route.query.pacienteId.trim()
        ? route.query.pacienteId
        : null;
    const pacienteInicialId = pacienteIdDaRota.value ?? pacienteQuery;

    if (pacienteFixoNaRota.value && pacienteInicialId) {
      const [paciente, pacotes, unidades] = await Promise.all([
        pacienteService.obter(pacienteInicialId),
        pacoteService.listar(),
        unidadeService.listar(),
      ]);

      pacotesDisponiveis.value = pacotes;
      unidadesDisponiveis.value = unidades;
      aplicarPaciente(paciente);
      return;
    }

    const [pacientes, pacotes, unidades] = await Promise.all([
      pacienteService.listar(),
      pacoteService.listar(),
      unidadeService.listar(),
    ]);

    pacientesDisponiveis.value = pacientes;
    pacotesDisponiveis.value = pacotes;
    unidadesDisponiveis.value = unidades;

    if (pacienteInicialId) {
      const paciente =
        pacientes.find((item) => item.id === pacienteInicialId) ??
        (await pacienteService.obter(pacienteInicialId));
      aplicarPaciente(paciente);
    }
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push(rotaRetorno.value);
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function recarregarDependencias(): Promise<void> {
  dadosIniciaisCarregados.value = false;
  await carregarDados();
}

async function salvar(): Promise<void> {
  if (!form.pacienteId || !form.pacoteId || !form.unidadeId || !form.dataCompra) {
    return;
  }

  salvando.value = true;

  try {
    await compraPacienteService.criar(form.pacienteId, {
      pacienteId: form.pacienteId,
      pacoteId: form.pacoteId,
      unidadeId: form.unidadeId,
      dataCompra: deInputDatetimeLocalParaIso(form.dataCompra),
      observacao: form.observacao.trim() || null,
    });

    notificacao.sucesso('Compra registrada com sucesso.');
    await router.push(rotaRetorno.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  void router.push(rotaRetorno.value);
}

onMounted(async () => {
  form.dataCompra = deIsoBackendParaInputDatetimeLocal(new Date().toISOString());
  await carregarDados();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      titulo="Nova compra"
      :subtitulo="
        pacienteFixoNaRota && pacienteNome
          ? `Registrar compra de pacote para ${pacienteNome}.`
          : 'Registre a compra de um pacote informando o paciente.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <q-form class="form-stack" @submit.prevent="salvar">
          <div class="form-field-stack">
            <q-select
              v-model="form.pacienteId"
              class="form-field--required"
              :options="opcoesPacientes"
              label="Paciente"
              outlined
              emit-value
              map-options
              :rules="[validarPaciente]"
              :readonly="pacienteFixoNaRota || !podeCriar"
              :disable="
                !podeCriar ||
                (!pacienteFixoNaRota && opcoesPacientes.length === 0)
              "
              @update:model-value="onPacienteChange"
            />
            <app-form-dependencia-alerta
              v-if="mostrarAlertaPacientes"
              inline
              mensagem="Nenhum paciente cadastrado. Cadastre um paciente antes de registrar a compra."
              rotulo-acao="Cadastrar paciente"
              :destino="{ name: 'pacientes-novo' }"
              @atualizar="recarregarDependencias"
            />
          </div>

          <div class="form-field-stack">
            <q-select
              v-model="form.pacoteId"
              class="form-field--required"
              :options="opcoesPacotes"
              label="Pacote"
              outlined
              emit-value
              map-options
              :rules="[validarPacote]"
              :disable="!podeCriar || opcoesPacotes.length === 0"
            />
            <app-form-dependencia-alerta
              v-if="mostrarAlertaPacotes"
              inline
              mensagem="Nenhum pacote ativo cadastrado. Cadastre um pacote antes de registrar a compra."
              rotulo-acao="Cadastrar pacote"
              :destino="{ name: 'pacotes-novo' }"
              @atualizar="recarregarDependencias"
            />
          </div>

          <q-card v-if="pacoteSelecionado" flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Resumo do pacote</div>
              <div>
                <strong>Valor:</strong> {{ formatarValorPacote(pacoteSelecionado.valor) }}
              </div>
              <div v-if="pacoteSelecionado.descricao" class="q-mt-xs">
                {{ pacoteSelecionado.descricao }}
              </div>
              <div
                v-if="pacoteSelecionado.itens?.length"
                class="q-mt-sm"
              >
                <div class="text-caption text-grey-7 q-mb-xs">Itens incluídos</div>
                <div
                  v-for="item in pacoteSelecionado.itens"
                  :key="item.id"
                  class="text-body2"
                >
                  {{ item.produtoNome }} — {{ item.quantidadeTotal }} {{ item.unidadeMedida }}
                </div>
              </div>
            </q-card-section>
          </q-card>

          <div class="form-field-stack">
            <q-select
              v-model="form.unidadeId"
              class="form-field--required"
              :options="opcoesUnidades"
              label="Unidade"
              outlined
              emit-value
              map-options
              :rules="[validarUnidade]"
              :disable="!podeCriar || !form.pacienteId || opcoesUnidades.length === 0"
            />
            <app-form-dependencia-alerta
              v-if="mostrarAlertaUnidades"
              inline
              mensagem="Nenhuma unidade disponível para este paciente."
              rotulo-acao="Editar paciente"
              :destino="{ name: 'pacientes-editar', params: { id: form.pacienteId } }"
              @atualizar="recarregarDependencias"
            />
          </div>

          <q-input
            v-model="form.dataCompra"
            class="form-field--required"
            label="Data da compra"
            outlined
            type="datetime-local"
            :readonly="!podeCriar"
            :rules="[validarDataCompra]"
          />

          <q-input
            v-model="form.observacao"
            label="Observação"
            outlined
            type="textarea"
            autogrow
            :readonly="!podeCriar"
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="
                !podeCriar ||
                !form.pacienteId ||
                opcoesPacotes.length === 0 ||
                opcoesUnidades.length === 0
              "
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
