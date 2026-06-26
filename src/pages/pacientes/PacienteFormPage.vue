<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { pacienteService } from '@/services/paciente.service';
import { unidadeService } from '@/services/unidade.service';
import { normalizarCpf } from '@/types/entidades/paciente';
import type { Unidade } from '@/types/entidades/unidade';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const carregando = ref(false);
const salvando = ref(false);
const unidadesDisponiveis = ref<Unidade[]>([]);

const isEdicao = computed(() => route.name === 'pacientes-editar');
const pacienteId = computed(() => route.params.id as string | undefined);

const form = reactive({
  unidadeId: null as string | null,
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  dataNascimento: '',
  observacao: '',
});

const opcoesUnidades = computed(() =>
  unidadesDisponiveis.value.map((unidade) => ({
    label: unidade.ativo ? unidade.nome : `${unidade.nome} (inativa)`,
    value: unidade.id,
  })),
);

function validarEmail(value: string): boolean | string {
  if (!value) {
    return true;
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return emailValido || 'Informe um e-mail válido';
}

function validarCpf(value: string): boolean | string {
  if (!value) {
    return true;
  }

  const digitos = value.replace(/\D/g, '');

  return digitos.length === 11 || 'Informe um CPF válido com 11 dígitos';
}

function validarUnidade(value: string | null): boolean | string {
  return Boolean(value) || 'Selecione a unidade do paciente';
}

function montarPayload() {
  return {
    unidadeId: form.unidadeId as string,
    nome: form.nome.trim(),
    cpf: normalizarCpf(form.cpf),
    telefone: form.telefone.trim() || null,
    email: form.email.trim() || null,
    dataNascimento: form.dataNascimento || null,
    observacao: form.observacao.trim() || null,
  };
}

async function carregarUnidades(): Promise<void> {
  try {
    unidadesDisponiveis.value = await unidadeService.listar(false);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function garantirUnidadeNaLista(unidadeId: string): Promise<void> {
  if (unidadesDisponiveis.value.some((unidade) => unidade.id === unidadeId)) {
    return;
  }

  try {
    const unidade = await unidadeService.obter(unidadeId);
    unidadesDisponiveis.value = [unidade, ...unidadesDisponiveis.value];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarPaciente(): Promise<void> {
  if (!isEdicao.value || !pacienteId.value) {
    return;
  }

  carregando.value = true;

  try {
    const paciente = await pacienteService.obter(pacienteId.value);

    form.unidadeId = paciente.unidadeId;
    form.nome = paciente.nome;
    form.cpf = paciente.cpf ?? '';
    form.telefone = paciente.telefone ?? '';
    form.email = paciente.email ?? '';
    form.dataNascimento = paciente.dataNascimento ?? '';
    form.observacao = paciente.observacao ?? '';

    await garantirUnidadeNaLista(paciente.unidadeId);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'pacientes' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    const payload = montarPayload();

    if (isEdicao.value && pacienteId.value) {
      await pacienteService.atualizar(pacienteId.value, payload);
      notificacao.sucesso('Paciente atualizado com sucesso.');
    } else {
      await pacienteService.criar(payload);
      notificacao.sucesso('Paciente cadastrado com sucesso.');
    }

    await router.push({ name: 'pacientes' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'pacientes' });
}

onMounted(async () => {
  await carregarUnidades();
  await carregarPaciente();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar paciente' : 'Novo paciente'"
      :subtitulo="
        isEdicao
          ? 'Atualize os dados do paciente.'
          : 'Cadastre um novo paciente vinculado à unidade da clínica.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <q-select
            v-model="form.unidadeId"
            class="form-field--required"
            :options="opcoesUnidades"
            label="Unidade"
            outlined
            emit-value
            map-options
            :rules="[validarUnidade]"
            :disable="!isAdmin || opcoesUnidades.length === 0"
            :hint="
              opcoesUnidades.length === 0
                ? 'Cadastre unidades ativas antes de cadastrar pacientes.'
                : 'Unidade em que o paciente será atendido.'
            "
          />

          <q-input
            v-model="form.nome"
            class="form-field--required"
            label="Nome completo"
            outlined
            :readonly="!isAdmin"
            :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome do paciente']"
          />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.cpf"
                label="CPF"
                outlined
                mask="###.###.###-##"
                unmasked-value
                fill-mask
                :readonly="!isAdmin"
                :rules="[validarCpf]"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.dataNascimento"
                label="Data de nascimento"
                outlined
                type="date"
                :readonly="!isAdmin"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.telefone"
                label="Telefone"
                outlined
                mask="(##) #####-####"
                unmasked-value
                fill-mask
                :readonly="!isAdmin"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.email"
                label="E-mail"
                type="email"
                outlined
                :readonly="!isAdmin"
                :rules="[validarEmail]"
              />
            </div>
          </div>

          <q-input
            v-model="form.observacao"
            label="Observação"
            outlined
            type="textarea"
            autogrow
            :readonly="!isAdmin"
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!isAdmin || opcoesUnidades.length === 0"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
