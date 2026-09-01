<script setup lang="ts">
import { reactive, ref } from 'vue';

import AppDateInput from '@/components/shared/AppDateInput.vue';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { pacienteService } from '@/services/paciente.service';
import {
  montarEnderecoPaciente,
  normalizarCpf,
  UFS_BRASIL,
  OPCOES_SEXO_PACIENTE,
  type Paciente,
  type SexoPaciente,
} from '@/types/entidades/paciente';

const props = defineProps<{
  unidadeId: string | null;
}>();

const emit = defineEmits<{
  criado: [paciente: Paciente];
  cancelar: [];
}>();

const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const salvando = ref(false);
const opcoesUf = [...UFS_BRASIL];
const opcoesSexo = OPCOES_SEXO_PACIENTE;

const form = reactive({
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  dataNascimento: '',
  sexo: null as SexoPaciente | null,
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: null as string | null,
  observacao: '',
});

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

function validarCep(value: string): boolean | string {
  if (!value) {
    return true;
  }

  const digitos = value.replace(/\D/g, '');

  return digitos.length === 8 || 'Informe um CEP válido com 8 dígitos';
}

function montarPayload() {
  return {
    unidadeIds: [props.unidadeId!],
    nome: form.nome.trim(),
    cpf: normalizarCpf(form.cpf),
    telefone: form.telefone.trim() || null,
    email: form.email.trim() || null,
    dataNascimento: form.dataNascimento || null,
    sexo: form.sexo,
    endereco: montarEnderecoPaciente({
      cep: form.cep,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf ?? '',
    }),
    observacao: form.observacao.trim() || null,
  };
}

function cancelar(): void {
  if (salvando.value) {
    return;
  }

  emit('cancelar');
}

async function salvar(): Promise<void> {
  if (!props.unidadeId) {
    notificacao.info('Selecione uma unidade no agendamento antes de cadastrar o paciente.');
    return;
  }

  if (!form.nome.trim()) {
    notificacao.info('Informe o nome do paciente.');
    return;
  }

  salvando.value = true;

  try {
    const paciente = await pacienteService.criar(montarPayload());
    notificacao.sucesso('Paciente cadastrado com sucesso.');
    emit('criado', paciente);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}
</script>

<template>
  <div class="paciente-form-dialog">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">Novo paciente</div>
      <q-space />
      <q-btn
        flat
        round
        dense
        icon="close"
        aria-label="Voltar"
        :disable="salvando"
        @click="cancelar"
      />
    </q-card-section>

    <q-card-section>
      <q-form class="form-stack" @submit.prevent="salvar">
        <q-input
          v-model="form.nome"
          class="form-field--required"
          label="Nome completo"
          outlined
          :disable="salvando"
          :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome do paciente']"
        />

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.cpf"
              label="CPF"
              outlined
              mask="###.###.###-##"
              unmasked-value
              fill-mask
              :disable="salvando"
              :rules="[validarCpf]"
            />
          </div>
          <div class="col-12 col-sm-6">
            <app-date-input
              v-model="form.dataNascimento"
              label="Data de nascimento"
              outlined
              :disable="salvando"
            />
          </div>
        </div>

        <q-select
          v-model="form.sexo"
          :options="opcoesSexo"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          label="Sexo"
          outlined
          clearable
          :disable="salvando"
        />

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.telefone"
              label="Telefone"
              outlined
              mask="(##) #####-####"
              unmasked-value
              fill-mask
              :disable="salvando"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.email"
              label="E-mail"
              type="email"
              outlined
              :disable="salvando"
              :rules="[validarEmail]"
            />
          </div>
        </div>

        <q-separator class="q-my-sm" />

        <div class="text-subtitle2 text-weight-medium">Endereço</div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-4">
            <q-input
              v-model="form.cep"
              label="CEP"
              outlined
              mask="#####-###"
              unmasked-value
              fill-mask
              :disable="salvando"
              :rules="[validarCep]"
            />
          </div>
          <div class="col-12 col-sm-8">
            <q-input
              v-model="form.logradouro"
              label="Logradouro"
              outlined
              :disable="salvando"
            />
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-3">
            <q-input v-model="form.numero" label="Número" outlined :disable="salvando" />
          </div>
          <div class="col-12 col-sm-5">
            <q-input
              v-model="form.complemento"
              label="Complemento"
              outlined
              :disable="salvando"
            />
          </div>
          <div class="col-12 col-sm-4">
            <q-input v-model="form.bairro" label="Bairro" outlined :disable="salvando" />
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-8">
            <q-input v-model="form.cidade" label="Cidade" outlined :disable="salvando" />
          </div>
          <div class="col-12 col-sm-4">
            <q-select
              v-model="form.uf"
              :options="opcoesUf"
              label="UF"
              outlined
              clearable
              :disable="salvando"
            />
          </div>
        </div>

        <q-input
          v-model="form.observacao"
          label="Observação"
          outlined
          type="textarea"
          autogrow
          :disable="salvando"
        />
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-md">
      <q-btn flat label="Voltar" color="primary" no-caps :disable="salvando" @click="cancelar" />
      <q-btn
        unelevated
        :label="salvando ? 'Salvando' : 'Salvar'"
        color="primary"
        no-caps
        :disable="salvando || !unidadeId"
        @click="salvar"
      />
    </q-card-actions>
  </div>
</template>
